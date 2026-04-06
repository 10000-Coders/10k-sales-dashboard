"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { PRESETS } from "@/lib/dashboardConstants";

export function PeriodPresets({ preset, fromDate, toDate, onPresetChange, onFromChange, onToChange }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Date range preset"
      >
        <span className="text-sm font-medium">Period:</span>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={preset === p.value}
            onClick={() => onPresetChange(p.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              preset === p.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-muted"
            )}
            aria-pressed={preset === p.value}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="dashboard-date-from" className="sr-only">
          Start date
        </label>
        <Input
          id="dashboard-date-from"
          type="date"
          value={fromDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="h-9 w-auto"
          aria-label="Start date"
        />
        <span className="text-muted-foreground">to</span>
        <label htmlFor="dashboard-date-to" className="sr-only">
          End date
        </label>
        <Input
          id="dashboard-date-to"
          type="date"
          value={toDate}
          onChange={(e) => onToChange(e.target.value)}
          className="h-9 w-auto"
          aria-label="End date"
        />
      </div>
    </div>
  );
}
