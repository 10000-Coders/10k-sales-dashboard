"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useSalesPersons } from "@/hooks/useSalesData";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FollowUpTimer } from "@/components/FollowUpTimer";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import {
  bulkReassignLeads,
  clearReassignState,
  fetchLeadsForReassign,
  REASSIGN_PAGE_SIZE,
  selectBulkReassignLoading,
  selectReassignLeads,
  selectReassignLeadsError,
  selectReassignLeadsLoading,
  selectReassignPagination,
} from "@/redux/features/leads/leadsSlice";
import { LEAD_STATUS_STYLES } from "@/constants/leadStatus";

const LEAD_TABLE_HEAD = "whitespace-nowrap align-middle py-1.5 text-[11px] font-medium text-muted-foreground";
const LEAD_TABLE_CELL = "align-middle py-1.5 text-[11px]";

function formatDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadReassignClient() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userAuth?.user);
  const userRole = (user?.role || "").toLowerCase();
  const isManager = userRole === "manager";
  const { persons } = useSalesPersons({ enabled: isManager });

  const fromPersonOptions = useMemo(
    () =>
      persons.filter((p) => {
        const role = (p.role || "").toLowerCase();
        return role === "counselor" || role === "admin" || role === "manager";
      }),
    [persons]
  );

  const reassignLeads = useSelector(selectReassignLeads);
  const leadsLoading = useSelector(selectReassignLeadsLoading);
  const leadsError = useSelector(selectReassignLeadsError);
  const transferLoading = useSelector(selectBulkReassignLoading);
  const pagination = useSelector(selectReassignPagination);

  const [fromPersonId, setFromPersonId] = useState("");
  const [toPersonId, setToPersonId] = useState("");
  const [transferCountInput, setTransferCountInput] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);

  const targetPersons = useMemo(
    () => persons.filter((p) => String(p.id) !== fromPersonId),
    [persons, fromPersonId]
  );

  const fromPersonName =
    fromPersonOptions.find((p) => String(p.id) === fromPersonId)?.name ??
    persons.find((p) => String(p.id) === fromPersonId)?.name ??
    "";
  const toPersonName = persons.find((p) => String(p.id) === toPersonId)?.name ?? "";

  const getSalesPersonName = useCallback(
    (lead) => lead.sales_person_name || fromPersonName || "—",
    [fromPersonName]
  );

  useEffect(() => {
    return () => {
      dispatch(clearReassignState());
    };
  }, [dispatch]);

  useEffect(() => {
    setPage(1);
    setTransferCountInput("");
    setSelectedIds(new Set());
    setToPersonId("");
  }, [fromPersonId]);

  const loadLeads = useCallback(() => {
    if (!fromPersonId) {
      toast.warn("Select a counselor to load leads from.");
      return;
    }
    dispatch(fetchLeadsForReassign({ salesPersonId: fromPersonId, page }));
  }, [dispatch, fromPersonId, page]);

  useEffect(() => {
    if (!fromPersonId || !isManager) return;
    dispatch(fetchLeadsForReassign({ salesPersonId: fromPersonId, page }));
  }, [dispatch, fromPersonId, isManager, page]);

  const transferCount = useMemo(() => {
    const parsed = Number.parseInt(transferCountInput, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, reassignLeads.length);
  }, [transferCountInput, reassignLeads.length]);

  const toggleLead = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      reassignLeads.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const clearSelectionOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      reassignLeads.forEach((l) => next.delete(l.id));
      return next;
    });
  };

  const isAllOnPageSelected =
    reassignLeads.length > 0 && reassignLeads.every((l) => selectedIds.has(l.id));

  useEffect(() => {
    if (!transferCountInput) return;
    if (transferCount <= 0) return;
    setSelectedIds(new Set(reassignLeads.slice(0, transferCount).map((l) => l.id)));
  }, [transferCountInput, transferCount, reassignLeads]);

  const handleTransfer = async () => {
    if (!fromPersonId || !toPersonId) {
      toast.warn("Select both source and target counselors.");
      return;
    }
    if (selectedIds.size === 0) {
      toast.warn("Select at least one lead to transfer.");
      return;
    }

    try {
      const result = await dispatch(
        bulkReassignLeads({
          fromSalesPerson: fromPersonId,
          toSalesPerson: toPersonId,
          leadIds: Array.from(selectedIds),
        })
      ).unwrap();

      const { updated_count = 0, skipped_count = 0 } = result;
      if (updated_count > 0) {
        toast.success(
          `Transferred ${updated_count} lead${updated_count === 1 ? "" : "s"} to ${result.to_sales_person_name || toPersonName}` +
            (skipped_count ? ` (${skipped_count} skipped — duplicate mobile at target)` : "")
        );
      } else if (skipped_count > 0) {
        toast.warn(`No leads transferred. ${skipped_count} skipped (duplicate mobile at target).`);
      } else {
        toast.info("No leads were transferred.");
      }

      setTransferCountInput("");
      setSelectedIds(new Set());
      dispatch(fetchLeadsForReassign({ salesPersonId: fromPersonId, page }));
    } catch (err) {
      const detail =
        err?.detail ||
        (typeof err === "string" ? err : null) ||
        "Failed to transfer leads.";
      toast.error(detail);
    }
  };

  if (!isManager) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <p className="text-muted-foreground">Only managers can transfer leads between counselors.</p>
        <Link href="/leads">
          <Button variant="outline" type="button">
            <ArrowLeft className="h-4 w-4" />
            Back to leads
          </Button>
        </Link>
      </div>
    );
  }

  const leadsErrorText =
    leadsError?.detail ||
    (typeof leadsError === "string" ? leadsError : null);

  const totalPages = Math.max(1, pagination.total_pages || 1);
  const totalCount = pagination.count ?? 0;
  const currentPage = pagination.page ?? page;
  const rangeFrom = totalCount === 0 ? 0 : (currentPage - 1) * REASSIGN_PAGE_SIZE + 1;
  const rangeTo = Math.min(currentPage * REASSIGN_PAGE_SIZE, totalCount);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ArrowRightLeft className="h-6 w-6" />
                Transfer leads
              </CardTitle>
              <CardDescription>
                Load leads from one counselor and transfer by manual selection or count input.
              </CardDescription>
            </div>
            <Link href="/leads" className="shrink-0">
              <Button variant="outline" type="button">
                <ArrowLeft className="h-4 w-4" />
                Back to leads
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="flex min-w-[200px] flex-col gap-1">
              <label htmlFor="from-person" className="text-xs font-medium text-muted-foreground">
                From counselor
              </label>
              <select
                id="from-person"
                value={fromPersonId}
                onChange={(e) => setFromPersonId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select counselor…</option>
                {fromPersonOptions.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                    {(p.role || "").toLowerCase() !== "counselor"
                      ? ` (${(p.role || "").replace(/_/g, " ")})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              disabled={!fromPersonId || leadsLoading}
              onClick={loadLeads}
            >
              {leadsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {leadsLoading ? "Loading…" : "Reload leads"}
            </Button>
          </div>

          {totalCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <div className="flex min-w-[200px] flex-col gap-1">
                <label htmlFor="transfer-count" className="text-xs font-medium text-muted-foreground">
                  Select first N on this page
                </label>
                <input
                  id="transfer-count"
                  type="number"
                  min="1"
                  max={reassignLeads.length}
                  value={transferCountInput}
                  onChange={(e) => setTransferCountInput(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  placeholder={`Max ${reassignLeads.length}`}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={selectAllOnPage}>
                Select page
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-9" onClick={clearSelection}>
                Clear selection
              </Button>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <div className="flex min-w-[200px] flex-col gap-1">
                <label htmlFor="to-person" className="text-xs font-medium text-muted-foreground">
                  Transfer to
                </label>
                <select
                  id="to-person"
                  value={toPersonId}
                  onChange={(e) => setToPersonId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select counselor…</option>
                  {targetPersons.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                className="h-9"
                disabled={!toPersonId || transferLoading || selectedIds.size === 0}
                onClick={handleTransfer}
              >
                {transferLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4" />
                )}
                {transferLoading ? "Transferring…" : "Transfer now"}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {leadsErrorText ? (
            <p className="py-6 text-center text-destructive">{leadsErrorText}</p>
          ) : leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !fromPersonId ? (
            <p className="py-6 text-center text-muted-foreground">
              Select the counselor who currently owns the leads (usually a counselor, not your manager login).
            </p>
          ) : totalCount === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <p>No leads assigned to {fromPersonName || "this counselor"}.</p>
              <p className="mt-2 text-xs">
                On the main Leads page, filter by counselor to confirm who owns leads, then select that person here.
              </p>
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <p className="mb-3 text-sm text-muted-foreground">
                {totalCount} lead{totalCount === 1 ? "" : "s"} for{" "}
                <span className="font-medium text-foreground">{fromPersonName}</span>
                {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
              </p>
              <Table className="min-w-[900px] text-[11px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn("w-10", LEAD_TABLE_HEAD)}>
                      <input
                        type="checkbox"
                        checked={isAllOnPageSelected}
                        onChange={(e) => (e.target.checked ? selectAllOnPage() : clearSelectionOnPage())}
                        aria-label="Select all leads on this page"
                      />
                    </TableHead>
                    <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>Name</TableHead>
                    <TableHead className={cn("min-w-[180px]", LEAD_TABLE_HEAD)}>Phone / Email</TableHead>
                    <TableHead className={cn("min-w-[100px]", LEAD_TABLE_HEAD)}>Counselor</TableHead>
                    <TableHead className={cn("min-w-[90px]", LEAD_TABLE_HEAD)}>Status</TableHead>
                    <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>Next follow-up</TableHead>
                    <TableHead className={cn("min-w-[130px]", LEAD_TABLE_HEAD)}>Last activity / Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reassignLeads.map((lead, index) => (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "hover:bg-muted/50",
                        selectedIds.has(lead.id) && "bg-muted/30"
                      )}
                    >
                      <TableCell className={LEAD_TABLE_CELL} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                          aria-label={`Select ${lead.name}`}
                        />
                      </TableCell>
                      <TableCell className={cn("font-medium", LEAD_TABLE_CELL)}>
                        <span className="block max-w-[160px] truncate" title={lead.name}>
                          {lead.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-muted-foreground", LEAD_TABLE_CELL)}>
                        <div className="flex max-w-[220px] flex-col gap-0.5">
                          {lead.mobile ? (
                            <span className="inline-flex items-center gap-1 truncate" title={lead.mobile}>
                              <Phone className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                              <span className="truncate">{lead.mobile}</span>
                            </span>
                          ) : null}
                          {lead.email ? (
                            <span className="inline-flex items-center gap-1 truncate" title={lead.email}>
                              <Mail className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                              <span className="truncate">{lead.email}</span>
                            </span>
                          ) : null}
                          {!lead.mobile && !lead.email ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className={LEAD_TABLE_CELL}>
                        <span
                          className="block max-w-[120px] truncate text-muted-foreground"
                          title={getSalesPersonName(lead)}
                        >
                          {getSalesPersonName(lead)}
                        </span>
                      </TableCell>
                      <TableCell className={LEAD_TABLE_CELL}>
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            LEAD_STATUS_STYLES[lead.status] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {lead.status?.replace(/_/g, " ") ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className={LEAD_TABLE_CELL}>
                        {lead.next_follow_up_at ? (
                          <FollowUpTimer followUpAt={lead.next_follow_up_at} className="text-[11px]" />
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-muted-foreground", LEAD_TABLE_CELL)}>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="whitespace-nowrap">
                            {formatDateTime(lead.last_activity_at)}
                          </span>
                          <span
                            className="text-[10px] text-muted-foreground/80"
                            title="Logged calls and WhatsApp contacts"
                          >
                            {(lead.activities_count ?? 0) === 1
                              ? "1 activity"
                              : `${lead.activities_count ?? 0} activities`}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {rangeFrom}–{rangeTo} of {totalCount}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || leadsLoading}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages || leadsLoading}
                        onClick={() => setPage((p) => p + 1)}
                        className="gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
