"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import Select from "react-select";
import * as XLSX from "xlsx";
import withPrivateAuth from "@/components/withPrivateAuth";
import axios from "@/axios";
import { useSalesBatchDropdown, useSalesPersons } from "@/hooks/useSalesData";
import { getRangeForPreset } from "@/lib/dateUtils";
import {
  BATCH_MULTI_SELECT_COMPONENTS,
  BATCH_MULTI_SELECT_STYLES,
  FILTER_SELECT_STYLES,
} from "@/lib/filterSelectStyles";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download, ArrowLeft } from "lucide-react";

function formatINR(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-IN");
}

const PAYMENT_MODE_LABELS = {
  upi: "UPI",
  bank: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

const PAYMENT_MODE_OPTIONS = Object.entries(PAYMENT_MODE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function paymentModeLabel(value) {
  return PAYMENT_MODE_LABELS[value] || value || "—";
}

/** Parse YYYY-MM-DD as local calendar date (avoids UTC shift). */
function parseLocalDate(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function addOneMonth(date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setMonth(next.getMonth() + 1);
  return next;
}

/** True when To is more than one calendar month after From. */
function isDateRangeOverOneMonth(fromStr, toStr) {
  const from = parseLocalDate(fromStr);
  const to = parseLocalDate(toStr);
  if (!from || !to) return false;
  return to > addOneMonth(from);
}

function parseIdList(raw) {
  return String(raw || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function DateAccountDetailPage() {
  const searchParams = useSearchParams();
  const user = useSelector((state) => state.userAuth?.user);
  const userRole = (user?.role || "").toLowerCase();
  const canView = !!user;
  const canFilterBySalesPerson = userRole === "manager" || userRole === "super_admin";

  const { persons } = useSalesPersons({ enabled: canFilterBySalesPerson });
  const { salesBatchDropdown } = useSalesBatchDropdown();

  const [receivers, setReceivers] = useState([]);
  const [receiverLoading, setReceiverLoading] = useState(false);

  const initialRange = useMemo(() => getRangeForPreset("this_month"), []);
  const [dateFrom, setDateFrom] = useState(
    () => searchParams.get("date_from") || initialRange.from
  );
  const [dateTo, setDateTo] = useState(
    () => searchParams.get("date_to") || initialRange.to
  );
  const [status, setStatus] = useState(() => {
    const raw = searchParams.get("status");
    return raw == null ? "verified" : raw;
  });
  const [salesBatchIds, setSalesBatchIds] = useState(() =>
    parseIdList(searchParams.get("sales_batch"))
  );
  const [salesPersonId, setSalesPersonId] = useState(
    () => searchParams.get("sales_person") || ""
  );
  const [receiverId, setReceiverId] = useState(
    () => searchParams.get("receiver") || ""
  );
  const [paymentMode, setPaymentMode] = useState(
    () => searchParams.get("payment_mode") || ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalAmount, setTotalAmount] = useState("0.00");

  const fetchReceivers = useCallback(async () => {
    if (!canView) return;
    try {
      setReceiverLoading(true);
      const { data } = await axios.get("/payment-receivers/");
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setReceivers(list);
    } catch {
      setReceivers([]);
    } finally {
      setReceiverLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchReceivers();
  }, [fetchReceivers]);

  const fetchDetail = useCallback(async () => {
    if (!canView) return;
    if (dateFrom && dateTo) {
      const from = parseLocalDate(dateFrom);
      const to = parseLocalDate(dateTo);
      if (from && to && to < from) {
        setRows([]);
        setTotalAmount("0.00");
        setError("From date cannot be after To date.");
        return;
      }
      if (isDateRangeOverOneMonth(dateFrom, dateTo)) {
        setRows([]);
        setTotalAmount("0.00");
        setError("Date range cannot exceed one month.");
        return;
      }
    }
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (status) params.set("status", status);
      if (salesBatchIds.length) params.set("sales_batch", salesBatchIds.join(","));
      if (salesPersonId) params.set("sales_person", salesPersonId);
      if (receiverId) params.set("receiver", receiverId);
      if (paymentMode) params.set("payment_mode", paymentMode);

      const url = `/payments/date-account-detail/${params.toString() ? `?${params.toString()}` : ""}`;
      const { data } = await axios.get(url);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotalAmount(data?.total_amount != null ? String(data.total_amount) : "0.00");
    } catch (err) {
      setRows([]);
      setTotalAmount("0.00");
      setError(
        err.response?.data?.payment_mode?.[0] ||
          err.response?.data?.detail ||
          "Failed to load report."
      );
    } finally {
      setLoading(false);
    }
  }, [canView, dateFrom, dateTo, status, salesBatchIds, salesPersonId, receiverId, paymentMode]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const clearFilters = useCallback(() => {
    const range = getRangeForPreset("this_month");
    setDateFrom(range.from);
    setDateTo(range.to);
    setStatus("verified");
    setPaymentMode("");
    setSalesBatchIds([]);
    setSalesPersonId("");
    setReceiverId("");
    setError(null);
  }, []);

  const salesBatchSelectOptions = useMemo(
    () =>
      (salesBatchDropdown || []).map((b) => ({
        value: String(b.id),
        label: b.name || `Batch ${b.id}`,
      })),
    [salesBatchDropdown]
  );
  const selectedSalesBatchOptions = useMemo(
    () => salesBatchSelectOptions.filter((o) => salesBatchIds.includes(o.value)),
    [salesBatchSelectOptions, salesBatchIds]
  );

  const salesPersonSelectOptions = useMemo(
    () => [
      { value: "", label: "All" },
      ...(persons || []).map((p) => ({
        value: String(p.id),
        label: p.name || `User ${p.id}`,
      })),
    ],
    [persons]
  );
  const selectedSalesPersonOption =
    salesPersonSelectOptions.find((o) => o.value === String(salesPersonId || "")) ||
    salesPersonSelectOptions[0];

  const receiverSelectOptions = useMemo(
    () => [
      { value: "", label: "All" },
      ...(receivers || []).map((r) => ({
        value: String(r.id),
        label: r.bank_name || r.upi_id
          ? `${r.receiver_name} – ${r.bank_name || r.upi_id}`
          : r.receiver_name,
      })),
    ],
    [receivers]
  );
  const selectedReceiverOption =
    receiverSelectOptions.find((o) => o.value === String(receiverId || "")) ||
    receiverSelectOptions[0];

  const exportExcel = useCallback(() => {
    const sheetRows = rows.map((row) => ({
      Date: row.date || "",
      "Sales person": row.sales_person_name || "",
      Batch: row.batch_name || "",
      "Payment mode": paymentModeLabel(row.payment_mode),
      "Account name": row.account_name || "",
      "Amount deposited": Number(row.amount_deposited || 0),
    }));
    sheetRows.push({
      Date: "",
      "Sales person": "",
      Batch: "",
      "Payment mode": "",
      "Account name": "Total",
      "Amount deposited": Number(totalAmount || 0),
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 24 },
      { wch: 14 },
      { wch: 28 },
      { wch: 18 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Deposit Report");
    XLSX.writeFile(
      workbook,
      `account-deposit-report_${dateFrom || "from"}_${dateTo || "to"}.xlsx`
    );
  }, [rows, totalAmount, dateFrom, dateTo]);

  const summaryHref = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (status) params.set("status", status);
    if (salesBatchIds.length) params.set("sales_batch", salesBatchIds.join(","));
    if (salesPersonId) params.set("sales_person", salesPersonId);
    if (receiverId) params.set("receiver", receiverId);
    const qs = params.toString();
    return `/reports/date-account-summary${qs ? `?${qs}` : ""}`;
  }, [dateFrom, dateTo, status, salesBatchIds, salesPersonId, receiverId]);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href={summaryHref}
                className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Account Summary
              </Link>
              <CardTitle className="text-2xl">Account Deposit Report</CardTitle>
              <CardDescription>
                Detailed deposit breakdown by date, salesperson, batch, payment mode, and account.
                Default shows verified payments.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportExcel} disabled={loading || rows.length === 0}>
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Status"
            >
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Payment mode"
            >
              <option value="">All payment modes</option>
              {PAYMENT_MODE_OPTIONS.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <div className="min-w-[220px]">
              <Select
                options={salesBatchSelectOptions}
                value={selectedSalesBatchOptions}
                onChange={(opts) => setSalesBatchIds((opts || []).map((o) => o.value))}
                isMulti
                isSearchable
                isClearable
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                placeholder="Search sales batch..."
                components={BATCH_MULTI_SELECT_COMPONENTS}
                styles={BATCH_MULTI_SELECT_STYLES}
                aria-label="Sales batch"
              />
            </div>
            <div className="min-w-[220px]">
              <Select
                options={salesPersonSelectOptions}
                value={selectedSalesPersonOption}
                onChange={(option) => setSalesPersonId(option?.value || "")}
                isSearchable
                isClearable
                isDisabled={!canFilterBySalesPerson}
                placeholder="Search sales person..."
                styles={FILTER_SELECT_STYLES}
                aria-label="Sales person"
              />
            </div>
            <div className="min-w-[240px]">
              <Select
                options={receiverSelectOptions}
                value={selectedReceiverOption}
                onChange={(option) => setReceiverId(option?.value || "")}
                isSearchable
                isClearable
                isDisabled={receiverLoading}
                placeholder="Search receiver..."
                styles={FILTER_SELECT_STYLES}
                aria-label="Receiver"
              />
            </div>
            <Button onClick={fetchDetail} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </Button>
            <Button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              className="h-9 bg-[#FF8000] text-white hover:bg-[#e67300] focus-visible:ring-[#FF8000]/40"
            >
              Clear Filter
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between text-sm">
            <p className="m-0 text-muted-foreground">
              {rows.length} row{rows.length === 1 ? "" : "s"}
            </p>
            <p className="m-0 font-semibold">
              Total deposited: ₹ {formatINR(totalAmount)}
            </p>
          </div>

          {loading && rows.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for the selected filters.</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sales person</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Payment mode</TableHead>
                    <TableHead>Account name</TableHead>
                    <TableHead className="text-right">Amount deposited</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={`${row.date}-${row.sales_person_id}-${row.sales_batch_id}-${row.payment_mode}-${row.receiver_id}-${index}`}
                    >
                      <TableCell className="whitespace-nowrap font-medium">{row.date || "—"}</TableCell>
                      <TableCell>{row.sales_person_name || "—"}</TableCell>
                      <TableCell>{row.batch_name || "—"}</TableCell>
                      <TableCell>{paymentModeLabel(row.payment_mode)}</TableCell>
                      <TableCell>{row.account_name || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹ {formatINR(row.amount_deposited)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPrivateAuth(function DateAccountDetailPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center gap-2 p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      }
    >
      <DateAccountDetailPage />
    </Suspense>
  );
});
