"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const th = "px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
const td = "px-2 py-1.5 text-xs tabular-nums";

export function TeamStatsTable({ teamStats, loading, error, onRetry }) {
  if (loading && !teamStats?.by_person?.length) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
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
  if (!teamStats?.by_person?.length) {
    return <p className="text-sm text-muted-foreground">No team data for this period.</p>;
  }

  const periodNote = teamStats.periodLabel ? (
    <p className="mb-2 text-xs text-muted-foreground">Period: {teamStats.periodLabel}</p>
  ) : null;

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-md border">
      {periodNote}
      <Table className="text-xs">
        <caption className="sr-only">Team performance for selected period</caption>
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
          {teamStats.by_person.map((p) => (
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
  );
}
