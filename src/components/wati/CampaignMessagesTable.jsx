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
import { formatWatiDateTime, truncateId } from "@/lib/watiFormatters";

export default function CampaignMessagesTable({
  results = [],
  loading,
  error,
  page = 1,
  count = 0,
  pageSize = 50,
  onPageChange,
  onRowClick,
}) {
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize) || 1);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Mapped outbound messages for this campaign (metadata only — open a row for conversation).
      </p>
      <div className="w-full min-w-0 overflow-x-auto rounded-md border border-border/60">
        <Table className="min-w-[880px] text-xs">
          <TableHeader>
            <TableRow className="border-b bg-muted/30 hover:bg-transparent">
              <TableHead>Message ID</TableHead>
              <TableHead>WhatsApp ID</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Replied</TableHead>
              <TableHead>Last event</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No messages mapped for this campaign yet.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              results.map((row) => (
                <TableRow
                  key={row.wati_message_id || row.whatsapp_message_id || `${row.phone}-${row.last_event_at}`}
                  className="cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {truncateId(row.wati_message_id, 12)}
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {truncateId(row.whatsapp_message_id, 12)}
                    </code>
                  </TableCell>
                  <TableCell>{row.phone || "—"}</TableCell>
                  <TableCell className="text-primary">
                    {row.lead_id ? `Lead #${row.lead_id}` : "—"}
                  </TableCell>
                  <TableCell>
                    <WatiStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>{row.replied ? "Yes" : "No"}</TableCell>
                  <TableCell>{formatWatiDateTime(row.last_event_at)}</TableCell>
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
