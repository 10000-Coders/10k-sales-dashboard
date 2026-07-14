"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import withPrivateAuth from "@/components/withPrivateAuth";
import axios from "@/axios";
import { useSalesBatchDropdown, useSalesPersons } from "@/hooks/useSalesData";
import { getRangeForPreset } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

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
import { Loader2, Download, ChevronDown } from "lucide-react";

function downloadTextFile(filename, text, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatINR(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("en-IN");
}

/** Backend date-account-summary uses receiver_id -1 for cash payments without a receiver. */
const CASH_BUCKET_ID = -1;

const FILTER_SELECT_CLASS =
  "rounded-md border border-input bg-background px-3 text-sm";

function SalesBatchMultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayLabel = useMemo(() => {
    if (!selected.length) return "All";
    if (selected.length === 1) {
      return options.find((o) => o.id === selected[0])?.name ?? selected[0];
    }
    return `${selected.length} batches selected`;
  }, [selected, options]);

  const toggle = (id) => {
    onChange(
      selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]
    );
  };

  return (
    <div className="relative min-w-[220px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2",
          FILTER_SELECT_CLASS
        )}
        aria-label="Sales batch"
        aria-expanded={open}
      >
        <span className="truncate text-left">{displayLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[240px] rounded-md border border-input bg-white shadow-md dark:bg-slate-900">
          <ul className="max-h-[240px] overflow-auto py-1">
            <li>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                  selected.length === 0 && "bg-slate-100 font-medium dark:bg-slate-800"
                )}
                onClick={() => onChange([])}
              >
                All
              </button>
            </li>
            {options.map((b) => {
              const checked = selected.includes(b.id);
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                      checked && "bg-slate-100 font-medium dark:bg-slate-800"
                    )}
                    onClick={() => toggle(b.id)}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      )}
                      aria-hidden
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function accountKey(id) {
  if (id === null || id === undefined) return "__unassigned__";
  if (id === CASH_BUCKET_ID) return "__cash__";
  return `__recv_${id}`;
}

function labelForAccountId(id, accountMap) {
  if (id === null || id === undefined) return "Unassigned";
  if (id === CASH_BUCKET_ID) return accountMap.get(CASH_BUCKET_ID) || "Cash";
  return accountMap.get(id) || `Receiver ${id}`;
}

function DateAccountSummaryPage() {
  const user = useSelector((state) => state.userAuth?.user);
  const userRole = (user?.role || "").toLowerCase();
  const canView = !!user;
  const canFilterBySalesPerson = userRole === "manager" || userRole === "super_admin";

  const { persons } = useSalesPersons({ enabled: canFilterBySalesPerson });
  const { salesBatchDropdown } = useSalesBatchDropdown();

  const [receivers, setReceivers] = useState([]);
  const [receiverLoading, setReceiverLoading] = useState(false);

  const initialRange = useMemo(() => getRangeForPreset("this_month"), []);
  const [preset, setPreset] = useState("this_month");
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [status, setStatus] = useState("verified");
  const [salesBatchIds, setSalesBatchIds] = useState([]);
  const [salesPersonId, setSalesPersonId] = useState("");
  const [receiverId, setReceiverId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({ accounts: [], rows: [] });

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchReceivers = useCallback(async () => {
    if (!canView) return;
    try {
      setReceiverLoading(true);
      const { data } = await axios.get("/payment-receivers/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setReceivers(list);
    } catch {
      setReceivers([]);
    } finally {
      setReceiverLoading(false);
    }
  }, [canView, getHeaders]);

  useEffect(() => {
    fetchReceivers();
  }, [fetchReceivers]);

  const fetchSummary = useCallback(async (rangeOverride) => {
    if (!canView) return;
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      const from = rangeOverride?.from ?? dateFrom;
      const to = rangeOverride?.to ?? dateTo;
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      if (status) params.set("status", status);
      if (salesBatchIds.length) params.set("sales_batch", salesBatchIds.join(","));
      if (salesPersonId) params.set("sales_person", salesPersonId);
      if (receiverId) params.set("receiver", receiverId);

      const url = `/payments/date-account-summary/${params.toString() ? `?${params.toString()}` : ""}`;
      const { data } = await axios.get(url, { headers: getHeaders() });
      setSummary({
        accounts: Array.isArray(data?.accounts) ? data.accounts : [],
        rows: Array.isArray(data?.rows) ? data.rows : [],
      });
    } catch (err) {
      setSummary({ accounts: [], rows: [] });
      setError(err.response?.data?.detail || "Failed to load summary.");
    } finally {
      setLoading(false);
    }
  }, [canView, dateFrom, dateTo, status, salesBatchIds, salesPersonId, receiverId, getHeaders]);

  const grid = useMemo(() => {
    const accounts = summary.accounts || [];
    const rows = summary.rows || [];
    // date -> Map(accountKey -> amount); keys must not conflate -1 (Cash) with null (Unassigned)
    const byDate = new Map();
    const dateSet = new Set();
    const accIdSet = new Set();
    for (const a of accounts) {
      if (a && Object.prototype.hasOwnProperty.call(a, "id")) accIdSet.add(a.id);
    }

    for (const r of rows) {
      if (!r?.date) continue;
      const d = String(r.date);
      dateSet.add(d);
      // Preserve -1 for Cash; only null/undefined -> unassigned key
      const rid = r.receiver_id === null || r.receiver_id === undefined ? null : r.receiver_id;
      accIdSet.add(rid);
      const amount = Number(r.amount || 0) || 0;
      if (!byDate.has(d)) byDate.set(d, new Map());
      const m = byDate.get(d);
      const key = accountKey(rid);
      m.set(key, (m.get(key) || 0) + amount);
    }

    const dateList = Array.from(dateSet).sort();

    const accountMap = new Map();
    for (const a of accounts) {
      if (!a || !Object.prototype.hasOwnProperty.call(a, "id")) continue;
      const id = a.id;
      accountMap.set(id === null || id === undefined ? null : id, a.label || (id === CASH_BUCKET_ID ? "Cash" : "Unassigned"));
    }

    const accIds = Array.from(accIdSet);
    const normalizedAccounts = accIds.map((id) => ({
      id,
      key: accountKey(id),
      label: labelForAccountId(id, accountMap),
    }));

    // Sort: named receivers by label, then Cash (-1), then Unassigned (null)
    normalizedAccounts.sort((a, b) => {
      const aNull = a.id === null || a.id === undefined;
      const bNull = b.id === null || b.id === undefined;
      const aCash = a.id === CASH_BUCKET_ID;
      const bCash = b.id === CASH_BUCKET_ID;
      if (aNull && !bNull) return 1;
      if (!aNull && bNull) return -1;
      if (aCash && !bCash && !bNull) return 1;
      if (!aCash && bCash && !aNull) return -1;
      return String(a.label).localeCompare(String(b.label));
    });

    const colTotals = new Map(normalizedAccounts.map((a) => [a.key, 0]));
    const rowTotals = new Map();
    let grandTotal = 0;

    for (const d of dateList) {
      const m = byDate.get(d) || new Map();
      let rt = 0;
      for (const a of normalizedAccounts) {
        const v = m.get(a.key) || 0;
        rt += v;
        colTotals.set(a.key, (colTotals.get(a.key) || 0) + v);
      }
      rowTotals.set(d, rt);
      grandTotal += rt;
    }

    return { dates: dateList, accounts: normalizedAccounts, byDate, rowTotals, colTotals, grandTotal };
  }, [summary]);

  const exportCsv = useCallback(() => {
    const { dates, accounts, byDate, rowTotals, colTotals, grandTotal } = grid;
    const header = ["Date", ...accounts.map((a) => a.label), "Total"];
    const lines = [header.join(",")];

    for (const d of dates) {
      const m = byDate.get(d) || new Map();
      const row = [d];
      for (const a of accounts) {
        row.push(String(m.get(a.key) || 0));
      }
      row.push(String(rowTotals.get(d) || 0));
      lines.push(row.join(","));
    }
    const totalRow = ["Total"];
    for (const a of accounts) totalRow.push(String(colTotals.get(a.key) || 0));
    totalRow.push(String(grandTotal || 0));
    lines.push(totalRow.join(","));

    const filename = `date-account-summary_${dateFrom || "from"}_${dateTo || "to"}.csv`;
    downloadTextFile(filename, lines.join("\n"));
  }, [grid, dateFrom, dateTo]);

  const salesBatchOptions = useMemo(
    () =>
      (salesBatchDropdown || []).map((b) => ({
        id: String(b.id),
        name: b.name || `Batch ${b.id}`,
      })),
    [salesBatchDropdown]
  );

  const salesPersonOptions = useMemo(
    () =>
      (persons || []).map((p) => ({
        id: String(p.id),
        name: p.name || `User ${p.id}`,
      })),
    [persons]
  );

  const handlePreset = useCallback(
    (preset) => {
      setPreset(preset);
      const { from, to } = getRangeForPreset(preset);
      setDateFrom(from);
      setDateTo(to);
      // Fetch immediately with the computed range (state will update shortly after)
      fetchSummary({ from, to });
    },
    [fetchSummary]
  );

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Date-wise Account Summary</CardTitle>
              <CardDescription>
                Excel-style report (Date × Receiver Account). Cash without a receiver appears in the{" "}
                <span className="font-medium">Cash</span> column. Unassigned = other payments with no receiver.
                Default shows verified payments.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportCsv} disabled={loading || grid.dates.length === 0}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Quick range:</span>
            <Button
              variant={preset === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset("today")}
              disabled={loading}
            >
              Today
            </Button>
            <Button
              variant={preset === "yesterday" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset("yesterday")}
              disabled={loading}
            >
              Yesterday
            </Button>
            <Button
              variant={preset === "this_week" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset("this_week")}
              disabled={loading}
            >
              This week
            </Button>
            <Button
              variant={preset === "this_month" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset("this_month")}
              disabled={loading}
            >
              This month
            </Button>
            <Button
              variant={preset === "last_month" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePreset("last_month")}
              disabled={loading}
            >
              Last month
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="">All</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Sales batch</label>
              <SalesBatchMultiSelect
                options={salesBatchOptions}
                selected={salesBatchIds}
                onChange={setSalesBatchIds}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sales person</label>
              <select
                value={salesPersonId}
                onChange={(e) => setSalesPersonId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[220px]"
                disabled={!canFilterBySalesPerson}
                title={!canFilterBySalesPerson ? "Manager/Super Admin only" : ""}
              >
                <option value="">All</option>
                {salesPersonOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Receiver</label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[240px]"
                disabled={receiverLoading}
              >
                <option value="">All</option>
                {receivers.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.receiver_name}{r.bank_name || r.upi_id ? ` – ${r.bank_name || r.upi_id}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={fetchSummary} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {loading && grid.dates.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : grid.accounts.length === 0 || grid.dates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for the selected filters.</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Date</TableHead>
                    {grid.accounts.map((a) => (
                      <TableHead key={a.key} className="text-right whitespace-nowrap">
                        {a.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grid.dates.map((d) => {
                    const m = grid.byDate.get(d) || new Map();
                    return (
                      <TableRow key={d}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium whitespace-nowrap">
                          {d}
                        </TableCell>
                        {grid.accounts.map((a) => (
                          <TableCell key={`${d}-${a.key}`} className="text-right">
                            {formatINR(m.get(a.key) || 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-semibold">
                          {formatINR(grid.rowTotals.get(d) || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background z-10 font-semibold">Total</TableCell>
                    {grid.accounts.map((a) => (
                      <TableCell key={`total-${a.key}`} className="text-right font-semibold">
                        {formatINR(grid.colTotals.get(a.key) || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">{formatINR(grid.grandTotal || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPrivateAuth(DateAccountSummaryPage);
