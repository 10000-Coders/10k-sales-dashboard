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

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-md border">
      <Table>
        <caption className="sr-only">Team performance for selected period</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Activities</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">WhatsApp</TableHead>
            <TableHead className="text-right">Verified (₹)</TableHead>
            <TableHead className="text-right">Pending (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamStats.by_person.map((p) => (
            <TableRow key={p.sales_person_id}>
              <TableCell className="font-medium">{p.sales_person_name}</TableCell>
              <TableCell className="capitalize">{p.role}</TableCell>
              <TableCell className="text-right">{p.leadsTotal}</TableCell>
              <TableCell className="text-right">{p.activitiesTotal}</TableCell>
              <TableCell className="text-right">{p.calls}</TableCell>
              <TableCell className="text-right">{p.whatsapp}</TableCell>
              <TableCell className="text-right">
                {Number(p.verifiedPaymentAmount).toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-right">
                {Number(p.pendingPaymentAmount).toLocaleString("en-IN")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
