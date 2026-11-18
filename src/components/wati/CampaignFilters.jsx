"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CampaignFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  loading,
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="wati-date-from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input
          id="wati-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="w-[160px]"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wati-date-to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input
          id="wati-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-[160px]"
        />
      </div>
      <Button type="button" onClick={onApply} disabled={loading}>
        Apply
      </Button>
    </div>
  );
}
