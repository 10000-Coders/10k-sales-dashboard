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
import { formatWatiDate, formatWatiNumber } from "@/lib/watiFormatters";

export default function CampaignsTable({
  results = [],
  loading,
  error,
  page = 1,
  total = 0,
  pageSize = 20,
  onPageChange,
  onRowClick,
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  return (
    <div className="space-y-3">
      <div className="w-full min-w-0 overflow-x-auto rounded-md border border-border/60">
        <Table className="min-w-[960px] text-xs">
          <TableHeader>
            <TableRow className="border-b bg-muted/30 hover:bg-transparent">
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Recipients</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Read</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead className="text-right">Replied</TableHead>
              <TableHead className="text-right">No response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  No campaigns in this range.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              results.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  <TableCell className="font-medium text-primary underline-offset-2 hover:underline">
                    {row.name || row.id}
                  </TableCell>
                  <TableCell>
                    <WatiStatusBadge status={row.raw_status || "—"} />
                  </TableCell>
                  <TableCell>{formatWatiDate(row.created_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWatiNumber(row.recipients)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWatiNumber(row.sent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWatiNumber(row.delivered)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWatiNumber(row.read)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWatiNumber(row.failed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWatiNumber(row.replied)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatWatiNumber(row.no_response)}
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
