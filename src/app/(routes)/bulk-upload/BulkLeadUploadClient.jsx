"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import * as XLSX from "xlsx";
import Select from "react-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formSelectStyles, formSelectMenuPortalTarget } from "@/lib/reactSelectStyles";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Upload,
} from "lucide-react";
import {
  bulkCreateLeads,
  MAX_BULK_LEAD_IMPORT,
  selectLeadsBulkCreateLoading,
} from "@/redux/features/leads/leadsSlice";
import { INQUIRY_SOURCE_OPTIONS, getInquirySourceLabel } from "@/constants/leadInquirySource";
import { LEAD_RELATED_VALUES, getLeadRelatedLabel } from "@/constants/leadCourse";
import { parseLeadsWorkbook, prepareBulkLeadImportRows } from "@/utils/parseLeadsExcel";
import { formatApiError } from "@/utils/formatApiError";

const SOURCE_OPTIONS = INQUIRY_SOURCE_OPTIONS.filter((o) => o.value);
const RELATED_OPTIONS = LEAD_RELATED_VALUES;

const initialDefaults = {
  source: "",
  relatedType: "none",
};

function formatFailedErrors(errors) {
  if (!errors || typeof errors !== "object") return "Could not import";
  return Object.entries(errors)
    .flatMap(([field, msgs]) => {
      const list = Array.isArray(msgs) ? msgs : [msgs];
      return list.map((msg) => `${field}: ${msg}`);
    })
    .join("; ");
}

export default function BulkLeadUploadClient() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userAuth?.user);
  const bulkCreateLoading = useSelector(selectLeadsBulkCreateLoading);
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [defaults, setDefaults] = useState(initialDefaults);
  const [importResult, setImportResult] = useState(null);

  const importOptions = useMemo(
    () => ({ selectedSource: defaults.source, relatedType: defaults.relatedType }),
    [defaults.source, defaults.relatedType]
  );

  const previewRows = useMemo(
    () => prepareBulkLeadImportRows(parsedRows, user?.id, importOptions),
    [parsedRows, user?.id, importOptions]
  );

  const validCount = previewRows.filter((row) => row.payload).length;
  const rowDataIssuesCount = previewRows.filter((row) => !row.validation.isValid).length;

  const handleUploadClick = () => {
    if (!defaults.source) {
      toast.warn("Select an inquiry source from the dropdown before uploading Excel.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!defaults.source) {
      toast.warn("Select an inquiry source from the dropdown before uploading Excel.");
      e.target.value = "";
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      toast.warn("Only .xlsx and .xls files are allowed.");
      e.target.value = "";
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const rows = parseLeadsWorkbook(workbook);
      if (rows.length === 0) {
        toast.warn("No data rows found. Ensure the sheet has Name and Phone columns.");
        setParsedRows([]);
        setFileName("");
        setImportResult(null);
        return;
      }
      setParsedRows(rows);
      setFileName(file.name);
      setImportResult(null);
      toast.success(`Loaded ${rows.length} row${rows.length === 1 ? "" : "s"} from Excel.`);
    } catch {
      toast.error("Could not read the Excel file.");
      setParsedRows([]);
      setFileName("");
    } finally {
      e.target.value = "";
    }
  };

  const handleImport = useCallback(async () => {
    if (!user?.id) {
      toast.error("You must be logged in to import leads.");
      return;
    }
    if (!defaults.source) {
      toast.warn("Select an inquiry source before importing.");
      return;
    }
    if (parsedRows.length === 0) {
      toast.warn("Upload an Excel file first.");
      return;
    }

    const leads = previewRows
      .filter((row) => row.payload)
      .map((row) => ({
        ...row.payload,
        source: defaults.source,
        is_related: defaults.relatedType || "none",
      }));
    if (leads.length === 0) {
      toast.warn("No valid rows to import. Fix missing data shown in the preview.");
      return;
    }
    if (leads.length > MAX_BULK_LEAD_IMPORT) {
      toast.error(
        `You have ${leads.length} valid rows. Maximum ${MAX_BULK_LEAD_IMPORT} leads per import.`
      );
      return;
    }

    try {
      const result = await dispatch(bulkCreateLeads({ leads })).unwrap();
      setImportResult(result);
      const message = result.detail || "Import completed.";
      if (result.created_count > 0) {
        toast[result.failed_count > 0 ? "warn" : "success"](message);
      } else {
        toast.warn(message);
      }
    } catch (err) {
      setImportResult(err?.detail || err?.failed ? err : null);
      toast.error(formatApiError(err, "Bulk import failed."));
    }
  }, [defaults.source, defaults.relatedType, dispatch, parsedRows.length, previewRows, user?.id]);

  const failedFromApi = importResult?.failed || [];

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/leads"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leads
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Bulk lead upload</CardTitle>
          <CardDescription>
            Choose inquiry source first, then upload Excel. Source is never read from the sheet — it
            always comes from the dropdown below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Inquiry source *</Label>
              <Select
                options={SOURCE_OPTIONS}
                value={SOURCE_OPTIONS.find((o) => o.value === defaults.source) || null}
                onChange={(opt) => {
                  setDefaults((prev) => ({ ...prev, source: opt?.value || "" }));
                  setImportResult(null);
                }}
                styles={formSelectStyles}
                menuPortalTarget={formSelectMenuPortalTarget}
                placeholder="Select source..."
                isClearable
              />
              <p className="text-xs text-muted-foreground">
                Applied to every lead in this import. All imported leads use status &quot;New&quot;.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Related type</Label>
              <Select
                options={RELATED_OPTIONS}
                value={RELATED_OPTIONS.find((o) => o.value === defaults.relatedType) || RELATED_OPTIONS[0]}
                onChange={(opt) =>
                  setDefaults((prev) => ({ ...prev, relatedType: opt?.value || "none" }))
                }
                styles={formSelectStyles}
                menuPortalTarget={formSelectMenuPortalTarget}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={bulkCreateLoading || !defaults.source}
              onClick={handleUploadClick}
            >
              {bulkCreateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {fileName ? "Change Excel file" : "Upload Excel (.xlsx, .xls)"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="sr-only"
              disabled={bulkCreateLoading || !defaults.source}
              onChange={handleFileChange}
            />
            {fileName ? (
              <span className="text-sm text-muted-foreground">{fileName}</span>
            ) : null}
            {!defaults.source ? (
              <span className="text-xs text-amber-700">Select source before uploading</span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Expected Excel columns: Name, Phone, Email (optional), Added Time (optional). Max{" "}
            {MAX_BULK_LEAD_IMPORT} leads per import.
          </p>
        </CardContent>
      </Card>

      {parsedRows.length > 0 ? (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  Source:{" "}
                  <span className="font-medium text-foreground">
                    {getInquirySourceLabel(defaults.source) || "—"}
                  </span>
                  {" · "}
                  Related:{" "}
                  <span className="font-medium text-foreground">
                    {getLeadRelatedLabel(defaults.relatedType)}
                  </span>
                  {" · "}
                  {previewRows.length} row{previewRows.length === 1 ? "" : "s"} — {validCount} ready,{" "}
                  {rowDataIssuesCount} with missing data
                </CardDescription>
              </div>
              <Button
                onClick={handleImport}
                disabled={bulkCreateLoading || validCount === 0 || !defaults.source}
              >
                {bulkCreateLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  `Import ${validCount} lead${validCount === 1 ? "" : "s"}`
                )}
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Related</TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Missing / issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={cn(!row.validation.isValid && "bg-red-50/60")}
                    >
                      <TableCell className="text-xs text-muted-foreground">{row.rowNumber}</TableCell>
                      <TableCell className="text-sm">{row.validation.name}</TableCell>
                      <TableCell className="text-sm">{row.validation.mobile}</TableCell>
                      <TableCell className="text-sm">{row.validation.email}</TableCell>
                      <TableCell className="text-sm">
                        {getInquirySourceLabel(defaults.source) || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getLeadRelatedLabel(defaults.relatedType)}
                      </TableCell>
                      <TableCell>
                        {row.validation.isValid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Missing data
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-red-700">
                        {row.validation.missing.length
                          ? row.validation.missing.join(", ")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      {importResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import result</CardTitle>
            <CardDescription>{importResult.detail}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-emerald-700">
                Created: {importResult.created_count ?? 0}
              </span>
              <span className="text-red-700">Failed: {importResult.failed_count ?? 0}</span>
              {rowDataIssuesCount > 0 ? (
                <span className="text-amber-700">
                  Skipped (missing data): {rowDataIssuesCount}
                </span>
              ) : null}
            </div>
            {failedFromApi.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedFromApi.map((item) => {
                      const preview = previewRows[item.index];
                      return (
                        <TableRow key={`failed-${item.index}`}>
                          <TableCell className="text-sm">
                            {(preview?.rowNumber ?? item.index + 1)}
                            {preview?.validation?.name ? ` — ${preview.validation.name}` : ""}
                          </TableCell>
                          <TableCell className="text-xs text-red-700">
                            {formatFailedErrors(item.errors)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
