"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["New", "Enrolled", "Active", "Not Interested"];

const FILTER_CONTROL_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function validateDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  if (toDate < fromDate) {
    return "To date cannot be earlier than from date.";
  }
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  const maxTo = new Date(from);
  maxTo.setMonth(maxTo.getMonth() + 1);
  if (to > maxTo) {
    return "Date range cannot be greater than one month.";
  }
  return null;
}

export default function DemoStudentsFilters({
  filters,
  onChange,
  onApply,
  onReset,
  showSalesPersonFilter,
  persons = [],
  trainers = [],
  trainersLoading = false,
}) {
  const [dateError, setDateError] = useState("");
  const set = (key, value) => {
    setDateError("");
    onChange({ ...filters, [key]: value });
  };

  const handleApply = () => {
    const error = validateDateRange(filters.fromDate, filters.toDate);
    if (error) {
      setDateError(error);
      return;
    }
    setDateError("");
    onApply();
  };

  const handleReset = () => {
    setDateError("");
    onReset();
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="relative col-span-2 sm:col-span-1 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            className="h-9 pl-9"
            placeholder="Search by name, email, or phone..."
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            autoComplete="off"
            name="demo-student-search"
          />
        </div>

        <select
          value={filters.paymentStatus}
          onChange={(e) => set("paymentStatus", e.target.value)}
          className={FILTER_CONTROL_CLASS}
          aria-label="Filter by payment"
        >
          <option value="">All payment</option>
          <option value="true">Paid</option>
          <option value="false">Unpaid</option>
        </select>

        <select
          value={filters.studentStatus}
          onChange={(e) => set("studentStatus", e.target.value)}
          className={FILTER_CONTROL_CLASS}
          aria-label="Filter by status"
        >
          <option value="">All status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filters.demoTrainer || ""}
          onChange={(e) => set("demoTrainer", e.target.value)}
          className={FILTER_CONTROL_CLASS}
          aria-label="Filter by trainer"
          disabled={trainersLoading}
        >
          <option value="">{trainersLoading ? "Loading trainers…" : "All trainers"}</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {showSalesPersonFilter ? (
          <select
            value={filters.salesPerson}
            onChange={(e) => set("salesPerson", e.target.value)}
            className={FILTER_CONTROL_CLASS}
            aria-label="Filter by sales person"
          >
            <option value="">All sales persons</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="hidden lg:block" aria-hidden="true" />
        )}

        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) => set("fromDate", e.target.value)}
          className={cn(FILTER_CONTROL_CLASS, dateError && "border-destructive")}
          title="From date"
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.toDate}
          onChange={(e) => set("toDate", e.target.value)}
          className={cn(FILTER_CONTROL_CLASS, dateError && "border-destructive")}
          title="To date"
          aria-label="To date"
        />

        <Button type="button" variant="outline" className="h-9 w-full" onClick={handleReset}>
          Reset
        </Button>
        <Button type="button" className="h-9 w-full" onClick={handleApply}>
          Apply
        </Button>
      </div>
      {dateError ? <p className="text-sm text-destructive">{dateError}</p> : null}
    </div>
  );
}
