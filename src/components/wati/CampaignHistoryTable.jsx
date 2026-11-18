"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import WatiStatusBadge from "@/components/wati/WatiStatusBadge";
import { formatWatiDateTime } from "@/lib/watiFormatters";

export default function CampaignHistoryTable({
  results = [],
  loading,
  error,
  page = 1,
  count = 0,
  pageSize = 50,
  onPageChange,
  onLeadClick,
}) {
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize) || 1);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Campaign event feed from local message maps (status + reply flags).
      </p>
      <div className="w-full min-w-0 overflow-x-auto rounded-md border border-border/60">
        <Table className="min-w-[720px] text-xs">
          <TableHeader>
            <TableRow className="border-b bg-muted/30 hover:bg-transparent">
              <TableHead>Event at</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Replied</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Lead</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No history events yet.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              results.map((row, idx) => (
                <TableRow key={`${row.wati_message_id || row.phone}-${row.event_at}-${idx}`}>
                  <TableCell>{formatWatiDateTime(row.event_at)}</TableCell>
                  <TableCell>
                    <WatiStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>{row.replied ? "Yes" : "No"}</TableCell>
                  <TableCell>{row.phone || "—"}</TableCell>
                  <TableCell>
                    {row.lead_name || row.lead_id ? (
                      <button
                        type="button"
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={() => onLeadClick?.(row)}
                      >
                        {row.lead_name || `Lead #${row.lead_id}`}
                      </button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => onPageChange?.(page - 1)}
        >
          Prev
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
