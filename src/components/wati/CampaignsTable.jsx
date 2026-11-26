"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import WatiStatusBadge from "@/components/wati/WatiStatusBadge";
import { formatWatiDate, formatWatiDateTime, formatWatiNumber } from "@/lib/watiFormatters";
import { cn } from "@/lib/utils";
import { MAX_SELECTED_CAMPAIGNS } from "@/components/wati/CampaignWorkspaceFilters";

/** Columns after Created. `pct` = show "(x% of delivered)" hint. */
const METRIC_COLUMNS = [
  { key: "recipients", label: "Total" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "failed", label: "Failed", danger: true },
  { key: "read", label: "Read" },
  { key: "replied", label: "Responded", sortable: true, pct: true },
  { key: "not_responded", label: "Not responded", sortable: true, pct: true },
];
const SUM_KEYS = ["recipients", "sent", "delivered", "failed", "read", "replied"];
const colByKey = (key) => METRIC_COLUMNS.find((c) => c.key === key);
const RESPONDED_COL = colByKey("replied");
const NOT_RESPONDED_COL = colByKey("not_responded");
const COLUMN_COUNT = 3 + METRIC_COLUMNS.length;
const SKELETON_ROWS = 5;

const num = (v) => Number(v || 0);

/** Not responded = delivered − responded (never below 0). */
function metricOf(row, key) {
  if (key === "not_responded") return Math.max(num(row?.delivered) - num(row?.replied), 0);
  return num(row?.[key]);
}

/** "31%" of delivered, or null when nothing was delivered. */
function pctOfDelivered(value, delivered) {
  if (!delivered) return null;
  return `${Math.round((value / delivered) * 100)}%`;
}

function isCompletedStatus(status) {
  const s = String(status || "").toLowerCase();
  return !s || s.includes("complete") || s.includes("success") || s === "sent";
}

/** Sum delivery counters over campaign rows (not_responded derives from the sums). */
export function sumCampaignRows(rows = []) {
  const totals = {};
  SUM_KEYS.forEach((k) => {
    totals[k] = 0;
  });
  rows.forEach((row) => {
    SUM_KEYS.forEach((k) => {
      totals[k] += num(row[k]);
    });
  });
  return totals;
}

const SORTERS = {
  created: (r) => new Date(r.created_at || 0).getTime() || 0,
  replied: (r) => metricOf(r, "replied"),
  not_responded: (r) => metricOf(r, "not_responded"),
};

function MetricValue({ row, column }) {
  const value = metricOf(row, column.key);
  if (column.danger) {
    const total = num(row?.recipients);
    const high = total > 0 && value / total > 0.1;
    return <span className={cn(high && "text-red-600 dark:text-red-400")}>{formatWatiNumber(value)}</span>;
  }
  if (!column.pct) return formatWatiNumber(value);
  const pct = pctOfDelivered(value, num(row?.delivered));
  return (
    <span className={cn(column.key === "replied" && value > 0 && "text-emerald-600 dark:text-emerald-400")}>
      {formatWatiNumber(value)}{" "}
      <span className="font-normal text-muted-foreground">({pct ?? "—"})</span>
    </span>
  );
}

function RowCheckbox({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate && !checked);
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      role="checkbox"
      aria-label={label}
      className="h-4 w-4 cursor-pointer accent-primary"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function SortHeader({ label, sortKey, sort, onSort, className }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground"
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", !active && "opacity-40")} aria-hidden />
      </button>
    </TableHead>
  );
}

function CampaignName({ row }) {
  const errorTitle = row.sync_error
    ? `${row.sync_error}${
        row.synced_at ? ` Last good sync: ${formatWatiDateTime(row.synced_at)}.` : ""
      }`
    : "";
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="truncate font-medium text-primary underline-offset-2 hover:underline">
        {row.name || row.id}
      </span>
      {!isCompletedStatus(row.raw_status) ? <WatiStatusBadge status={row.raw_status} /> : null}
      {row.syncing ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
          syncing
        </span>
      ) : null}
      {row.sync_error ? (
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 text-amber-500"
          aria-label={errorTitle}
        >
          <title>{errorTitle}</title>
        </AlertTriangle>
      ) : null}
    </span>
  );
}

export default function CampaignsTable({
  results = [],
  loading,
  error,
  onRowClick,
  /** { [id]: row } — kept by the parent so selection survives reloads. */
  selected = {},
  onSelectedChange,
  /** Opens the ticked campaigns together (combined contact list + follow-up). */
  onOpenSelected,
}) {
  const [sort, setSort] = useState({ key: "created", dir: "desc" });

  const sortedRows = useMemo(() => {
    const getter = SORTERS[sort.key] || SORTERS.created;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...results].sort((a, b) => (getter(a) - getter(b)) * factor);
  }, [results, sort]);

  const selectedRows = Object.values(selected);
  const selectedCount = selectedRows.length;
  const footerRows = selectedCount ? selectedRows : results;
  const footer = sumCampaignRows(footerRows);

  const pageIds = results.map((r) => String(r.id));
  const pageSelectedCount = pageIds.filter((id) => selected[id]).length;
  const allPageSelected = pageIds.length > 0 && pageSelectedCount === pageIds.length;

  const handleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const toggleRow = (row) => {
    const id = String(row.id);
    const next = { ...selected };
    if (next[id]) delete next[id];
    else next[id] = row;
    onSelectedChange?.(next);
  };

  const togglePage = () => {
    const next = { ...selected };
    if (allPageSelected) pageIds.forEach((id) => delete next[id]);
    else results.forEach((r) => (next[String(r.id)] = r));
    onSelectedChange?.(next);
  };

  const footerLabel = selectedCount ? (
    <span className="inline-flex items-center gap-2">
      Σ {selectedCount} selected
      {onOpenSelected ? (
        <button
          type="button"
          className="text-xs font-medium text-[#FF8000] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
          disabled={selectedCount > MAX_SELECTED_CAMPAIGNS}
          title={
            selectedCount > MAX_SELECTED_CAMPAIGNS
              ? `Up to ${MAX_SELECTED_CAMPAIGNS} campaigns can be opened together`
              : undefined
          }
          onClick={() => onOpenSelected(Object.keys(selected))}
        >
          Open selected ({selectedCount})
        </button>
      ) : null}
      <button
        type="button"
        className="text-xs font-normal text-primary underline-offset-2 hover:underline"
        onClick={() => onSelectedChange?.({})}
      >
        Clear
      </button>
    </span>
  ) : (
    <span>All campaigns ({results.length})</span>
  );
  const showRows = !loading && !error && results.length > 0;
  // Sticky cells must be opaque so scrolled columns never show through.
  const stickyLeft = "sticky z-10 bg-card group-data-[state=selected]:bg-muted";
  const stickyHover =
    "group-hover:bg-[color-mix(in_srgb,hsl(var(--muted))_50%,hsl(var(--card)))]";
  const frozenEdge = "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]";

  return (
    <div className="space-y-3">
      {/* Desktop / tablet table */}
      <div className="hidden w-full min-w-0 rounded-md border border-border/60 sm:block">
        <Table className="min-w-[950px] text-xs" containerClassName="max-h-[70vh]">
          <TableHeader className="sticky top-0 z-20 bg-muted">
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className={cn(stickyLeft, "left-0 w-10 bg-muted")}>
                <RowCheckbox
                  label="Select all campaigns"
                  checked={allPageSelected}
                  indeterminate={pageSelectedCount > 0}
                  onChange={togglePage}
                />
              </TableHead>
              <TableHead className={cn(stickyLeft, frozenEdge, "left-10 min-w-[220px] bg-muted")}>
                Campaign
              </TableHead>
              <SortHeader label="Created" sortKey="created" sort={sort} onSort={handleSort} />
              {METRIC_COLUMNS.map((c) =>
                c.sortable ? (
                  <SortHeader
                    key={c.key}
                    label={c.label}
                    sortKey={c.key}
                    sort={sort}
                    onSort={handleSort}
                    className="whitespace-nowrap text-right"
                  />
                ) : (
                  <TableHead key={c.key} className="whitespace-nowrap text-right">
                    {c.label}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                  {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-3 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
                  No campaigns in this date range. Try widening the period.
                </TableCell>
              </TableRow>
            )}
            {showRows &&
              sortedRows.map((row) => {
                const id = String(row.id);
                return (
                  <TableRow
                    key={id}
                    className="group cursor-pointer"
                    data-state={selected[id] ? "selected" : undefined}
                    onClick={() => onRowClick?.(row)}
                  >
                    <TableCell className={cn(stickyLeft, stickyHover, "left-0 w-10")}>
                      <RowCheckbox
                        label={`Select ${row.name || id}`}
                        checked={Boolean(selected[id])}
                        onChange={() => toggleRow(row)}
                      />
                    </TableCell>
                    <TableCell className={cn(stickyLeft, stickyHover, frozenEdge, "left-10 max-w-[280px]")}>
                      <CampaignName row={row} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatWatiDate(row.created_at)}</TableCell>
                    {METRIC_COLUMNS.map((c) => (
                      <TableCell key={c.key} className="whitespace-nowrap text-right tabular-nums">
                        <MetricValue row={row} column={c} />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
          </TableBody>
          {showRows || selectedCount ? (
            <tfoot className="sticky bottom-0 z-20 border-t bg-muted font-medium">
              <tr>
                {/* Mirrors the body: checkbox + campaign are sticky, Created scrolls. */}
                <td className="sticky left-0 z-10 w-10 bg-muted" />
                <td className={cn("sticky left-10 z-10 bg-muted px-4 py-2 align-top", frozenEdge)}>
                  <div className="whitespace-nowrap">{footerLabel}</div>
                  <p className="mt-0.5 whitespace-nowrap text-[11px] font-normal text-muted-foreground">
                    Sum of campaigns (may double-count contacts)
                  </p>
                </td>
                <td className="bg-muted" />
                {METRIC_COLUMNS.map((c) => (
                  <td key={c.key} className="whitespace-nowrap px-4 py-2 text-right align-top tabular-nums">
                    <MetricValue row={footer} column={c} />
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border/60 bg-muted/40" />
          ))}
        {!loading && error ? <p className="py-6 text-center text-sm text-destructive">{error}</p> : null}
        {!loading && !error && results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No campaigns in this date range. Try widening the period.
          </p>
        ) : null}
        {showRows &&
          sortedRows.map((row) => {
            const id = String(row.id);
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => e.key === "Enter" && onRowClick?.(row)}
                className={cn(
                  "space-y-1.5 rounded-lg border border-border/60 bg-card p-3 text-xs",
                  selected[id] && "border-primary/60 bg-muted"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <RowCheckbox
                      label={`Select ${row.name || id}`}
                      checked={Boolean(selected[id])}
                      onChange={() => toggleRow(row)}
                    />
                    <CampaignName row={row} />
                  </div>
                  <span className="shrink-0 text-muted-foreground">{formatWatiDate(row.created_at)}</span>
                </div>
                <p className="tabular-nums text-muted-foreground">
                  Total {formatWatiNumber(row.recipients)} · Sent {formatWatiNumber(row.sent)} · Deliv{" "}
                  {formatWatiNumber(row.delivered)} · Failed <MetricValue row={row} column={colByKey("failed")} /> ·
                  Read {formatWatiNumber(row.read)}
                </p>
                <p className="tabular-nums">
                  Responded <MetricValue row={row} column={RESPONDED_COL} /> · Not responded{" "}
                  <MetricValue row={row} column={NOT_RESPONDED_COL} />
                </p>
              </div>
            );
          })}
        {showRows || selectedCount ? (
          <div className="sticky bottom-0 z-20 rounded-lg border bg-muted/95 p-3 text-xs font-medium backdrop-blur">
            {footerLabel}
            <p className="mt-1 tabular-nums">
              Responded <MetricValue row={footer} column={RESPONDED_COL} /> · Not responded{" "}
              <MetricValue row={footer} column={NOT_RESPONDED_COL} />
            </p>
            <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
              Sum of campaigns (may double-count contacts)
            </p>
          </div>
        ) : null}
      </div>

    </div>
  );
}
