"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const th = "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
const td = "px-2 py-1.5 text-xs tabular-nums";

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "counselor", label: "Counselor" },
  { value: "manager", label: "Manager" },
  { value: "super_admin", label: "Super admin" },
];

export function TeamStatsTable({
  teamStats,
  loading,
  error,
  onRetry,
  periodLabel,
  fromDate,
  toDate,
}) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [nameQuery, setNameQuery] = useState("");

  const rows = teamStats?.by_person ?? [];

  const filteredRows = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return rows.filter((p) => {
      const role = (p.role || "").toLowerCase();
      if (roleFilter !== "all" && role !== roleFilter) return false;
      if (q && !(p.sales_person_name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, roleFilter, nameQuery]);

  const displayPeriod =
    periodLabel ||
    teamStats?.periodLabel ||
    (fromDate && toDate ? (fromDate === toDate ? fromDate : `${fromDate} – ${toDate}`) : "");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading team stats{displayPeriod ? ` for ${displayPeriod}` : ""}…
      </div>
    );
  }

  if (error && onRetry) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load team stats.{" "}
        <button type="button" onClick={onRetry} className="underline hover:no-underline">
          Try again
        </button>
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">Could not load team stats.</p>;
  }

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No team data{displayPeriod ? ` for ${displayPeriod}` : " for this period"}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {displayPeriod ? (
          <p className="text-xs text-muted-foreground">Period: {displayPeriod}</p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="team-stats-role-filter" className="sr-only">
            Filter by role
          </label>
          <select
            id="team-stats-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Filter by role"
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Search by name"
              className="h-9 pl-8 text-sm"
              aria-label="Search team member by name"
            />
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members match the selected filters.</p>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto rounded-md border">
          <Table className="text-xs">
            <caption className="sr-only">
              Team performance{displayPeriod ? ` for ${displayPeriod}` : ""}
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(th, "text-left")}>Name</TableHead>
                <TableHead className={cn(th, "text-left")}>Role</TableHead>
                <TableHead className={cn(th, "text-right")}>Leads</TableHead>
                <TableHead className={cn(th, "text-right")} title="Interested leads">
                  Interested
                </TableHead>
                <TableHead className={cn(th, "text-right")}>Overdue</TableHead>
                <TableHead className={cn(th, "text-right")}>Calls</TableHead>
                <TableHead className={cn(th, "text-right")} title="WhatsApp">
                  WA
                </TableHead>
                <TableHead className={cn(th, "text-right")}>Verified ₹</TableHead>
                <TableHead className={cn(th, "text-right")}>Pending ₹</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((p) => (
                <TableRow key={p.sales_person_id}>
                  <TableCell className={cn(td, "max-w-[120px] truncate font-medium")}>
                    {p.sales_person_name}
                  </TableCell>
                  <TableCell className={cn(td, "capitalize")}>{p.role}</TableCell>
                  <TableCell className={cn(td, "text-right")}>{p.leadsTotal}</TableCell>
                  <TableCell className={cn(td, "text-right")}>{p.interestedLeadsCount ?? 0}</TableCell>
                  <TableCell className={cn(td, "text-right font-medium text-red-600")}>
                    {p.overdueLeads ?? 0}
                  </TableCell>
                  <TableCell className={cn(td, "text-right")}>{p.calls}</TableCell>
                  <TableCell className={cn(td, "text-right")}>{p.whatsapp}</TableCell>
                  <TableCell className={cn(td, "text-right")}>
                    {Number(p.verifiedPaymentAmount).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className={cn(td, "text-right")}>
                    {Number(p.pendingPaymentAmount).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(roleFilter !== "all" || nameQuery.trim()) && filteredRows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredRows.length} of {rows.length} team members
        </p>
      )}
    </div>
  );
}
