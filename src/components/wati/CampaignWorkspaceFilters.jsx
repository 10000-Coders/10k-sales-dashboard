"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Select from "react-select";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  formSelectMenuPortalTarget,
  formSelectStyles,
} from "@/lib/reactSelectStyles";
import { LEAD_SOURCE_FILTER_OPTIONS } from "@/constants/leadInquirySource";
export const WATI_DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
];

export const ALL_CAMPAIGN_OPTION = { value: "all", label: "All campaigns" };

/** All Campaigns — short message_status (inclusive match). */
export const ALL_CAMPAIGNS_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All message statuses" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "failed", label: "Failed" },
];

/** Selected campaign — exclusive WA delivery labels (same as table cell). */
export const WA_DELIVERY_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All WA delivery statuses" },
  { value: "sent", label: "Sent, not delivered" },
  { value: "delivered", label: "Delivered, not read" },
  { value: "read", label: "Read, not replied" },
  { value: "replied", label: "Replied" },
  { value: "failed", label: "Failed · not on WhatsApp" },
];

export const MESSAGE_STATUS_FILTER_OPTIONS = WA_DELIVERY_STATUS_FILTER_OPTIONS;

const compactSelectStyles = {
  ...formSelectStyles,
  control: (base, state) => ({
    ...(typeof formSelectStyles.control === "function"
      ? formSelectStyles.control(base, state)
      : base),
    minHeight: 36,
    height: 36,
  }),
};

function FilterSelect({ inputId, label, options, value, onChange, placeholder }) {
  const selected =
    options.find((o) => o.value === (value ?? "")) || options[0] || null;
  return (
    <div className="min-w-[160px] flex-1 space-y-1.5 sm:max-w-[220px]">
      <Label htmlFor={inputId} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        inputId={inputId}
        options={options}
        value={selected}
        onChange={(opt) => onChange?.(opt?.value ?? "")}
        styles={compactSelectStyles}
        menuPortalTarget={formSelectMenuPortalTarget}
        isSearchable={options.length > 8}
        placeholder={placeholder}
        classNamePrefix={inputId}
      />
    </div>
  );
}

const SOURCE_FILTER_OPTIONS = LEAD_SOURCE_FILTER_OPTIONS.filter((o) => o.value);

function SourceMultiSelect({ selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const displayLabel = useMemo(() => {
    if (!selected.length) return "All sources";
    if (selected.length === 1) {
      return SOURCE_FILTER_OPTIONS.find((o) => o.value === selected[0])?.label ?? selected[0];
    }
    return `${selected.length} selected`;
  }, [selected]);

  const toggle = (value) => {
    onChange?.(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <div className="min-w-[160px] flex-1 space-y-1.5 sm:max-w-[220px]">
      <Label htmlFor="wati-source-filter" className="text-xs text-muted-foreground">
        Source
      </Label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          id="wati-source-filter"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm",
            "hover:bg-muted/40"
          )}
          aria-expanded={open}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground", open && "rotate-180")}
          />
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-md border border-input bg-card shadow-md">
            <ul className="max-h-[240px] overflow-auto py-1">
              <li>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-muted",
                    selected.length === 0 && "bg-muted font-medium"
                  )}
                  onClick={() => onChange?.([])}
                >
                  All sources
                </button>
              </li>
              {SOURCE_FILTER_OPTIONS.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-muted",
                      selected.includes(o.value) && "bg-muted font-medium"
                    )}
                    onClick={() => toggle(o.value)}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CampaignWorkspaceFilters({
  campaignOptions = [],
  selectedCampaign,
  onCampaignChange,
  preset,
  onPresetChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  search,
  onSearchChange,
  onSearchSubmit,
  messageStatus = "",
  onMessageStatusChange,
  filterSources = [],
  onFilterSourcesChange,
}) {
  const selectOptions = [ALL_CAMPAIGN_OPTION, ...campaignOptions];
  const value =
    selectOptions.find((o) => o.value === (selectedCampaign || "all")) ||
    ALL_CAMPAIGN_OPTION;
  const isAllCampaigns = !selectedCampaign || selectedCampaign === "all";
  const statusOptions = isAllCampaigns
    ? ALL_CAMPAIGNS_STATUS_FILTER_OPTIONS
    : WA_DELIVERY_STATUS_FILTER_OPTIONS;

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Campaign</Label>
          <Select
            inputId="wati-campaign-select"
            options={selectOptions}
            value={value}
            onChange={(opt) => onCampaignChange?.(opt?.value || "all")}
            styles={formSelectStyles}
            menuPortalTarget={formSelectMenuPortalTarget}
            isSearchable
            placeholder="Select campaign…"
            classNamePrefix="wati-campaign"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Search student or contact
          </Label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit?.();
            }}
          >
            <Input
              type="search"
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="max-w-md"
            />
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          inputId="wati-status-filter"
          label={isAllCampaigns ? "Message status" : "WA delivery"}
          options={statusOptions}
          value={messageStatus}
          onChange={onMessageStatusChange}
          placeholder={
            isAllCampaigns ? "All message statuses" : "All WA delivery statuses"
          }
        />
        <SourceMultiSelect
          selected={filterSources}
          onChange={onFilterSourcesChange}
        />
      </div>

      {isAllCampaigns ? (
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Date range preset"
          >
            <span className="text-sm font-medium">Period:</span>
            {WATI_DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={preset === p.value}
                onClick={() => onPresetChange?.(p.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  preset === p.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange?.(e.target.value)}
              className="h-9 w-auto"
              aria-label="Start date"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange?.(e.target.value)}
              className="h-9 w-auto"
              aria-label="End date"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
