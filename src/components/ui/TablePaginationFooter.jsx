"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Table footer matching the Leads page: "Showing 1–100 of 319 · Page 1 of 4" + Previous / Next.
 * Renders nothing when there are no rows; buttons only when there is more than one page.
 */
export default function TablePaginationFooter({
  page = 1,
  pageSize = 50,
  count = 0,
  onPageChange,
  loading = false,
  itemLabel = "",
}) {
  const totalCount = Math.max(0, Number(count) || 0);
  if (!totalCount) return null;
  const size = Math.max(1, Number(pageSize) || 1);
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const rangeFrom = (currentPage - 1) * size + 1;
  const rangeTo = Math.min(currentPage * size, totalCount);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {rangeFrom}–{rangeTo} of {totalCount}
        {itemLabel ? ` ${itemLabel}` : ""}
        {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || currentPage <= 1}
            onClick={() => onPageChange?.(currentPage - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || currentPage >= totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
