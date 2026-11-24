"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Select, { components as selectComponents } from "react-select";
import { ChevronDown, Info, Search } from "lucide-react";
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

/**
 * Message status (inclusive match): Sent = every recipient the message was sent to
 * successfully (incl. later delivered/read), Delivered = every delivered one, etc.
 * Responded / Not responded live in the WA response filter.
 */
export const MESSAGE_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All message statuses" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "failed", label: "Failed" },
];

/** WA response buckets (one per recipient) — match the Response donut + table badge. */
export const WA_RESPONSE_FILTER_OPTIONS = [
  { value: "", label: "All responses" },
  { value: "responded", label: "Responded" },
  { value: "not_responded", label: "Not responded" },
];

// WA status filter value for "typed a message" (backend TEXT_REPLY_OPTION).
export const TEXT_REPLY_OPTION = "__text__";

export const ALL_CAMPAIGNS_STATUS_FILTER_OPTIONS = MESSAGE_STATUS_FILTER_OPTIONS;

/** Same control look as the Leads page filters (src/app/(routes)/leads/page.jsx). */
const FILTER_SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const OPTION_CLASS =
  "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800";
const OPTION_SELECTED_CLASS = "bg-slate-100 font-medium dark:bg-slate-800";

function FilterChevron({ open }) {
  return (
    <ChevronDown
      className={cn(
        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
        open && "rotate-180"
      )}
      aria-hidden
    />
  );
}

/** Campaign picker stays searchable (react-select) but matches the h-9 filter controls. */
const campaignSelectStyles = {
  ...formSelectStyles,
  control: (base, state) => ({
    ...(typeof formSelectStyles.control === "function"
      ? formSelectStyles.control(base, state)
      : base),
    minHeight: 36,
    height: 36,
    borderRadius: "calc(var(--radius) - 2px)",
    backgroundColor: "hsl(var(--background))",
    cursor: "pointer",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 12px 0 4px" }),
  menu: (base) => ({ ...base, marginTop: 4 }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.875rem",
    cursor: "pointer",
    color: "hsl(var(--foreground))",
    fontWeight: state.isSelected ? 500 : 400,
    backgroundColor: state.isSelected || state.isFocused ? "rgb(241 245 249)" : "transparent",
  }),
};

function CampaignDropdownIndicator(props) {
  return (
    <selectComponents.DropdownIndicator {...props}>
      <FilterChevron open={props.selectProps.menuIsOpen} />
    </selectComponents.DropdownIndicator>
  );
}

const CAMPAIGN_SELECT_COMPONENTS = {
  IndicatorSeparator: null,
  DropdownIndicator: CampaignDropdownIndicator,
};

/**
 * Shared dropdown shell: bordered h-9 trigger + rotating chevron + panel that fades/scales in.
 * Closes on outside click and Escape.
 */
function FilterDropdown({ id, label, displayLabel, className, children }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          id={id}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-2 hover:bg-muted/40",
            FILTER_SELECT_CLASS
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <FilterChevron open={open} />
        </button>
        {open ? (
          <div
            className={cn(
              "absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] origin-top rounded-md border border-input bg-white shadow-md transition duration-150 ease-out dark:bg-slate-900",
              shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}
          >
            <ul className="max-h-[240px] overflow-auto py-1" role="listbox">
              {children({ close: () => setOpen(false) })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterSingleSelect({ id, label, options, value, onChange, className }) {
  const current = options.find((o) => o.value === (value ?? "")) || options[0];
  return (
    <FilterDropdown id={id} label={label} displayLabel={current?.label} className={className}>
      {({ close }) =>
        options.map((o) => (
          <li key={o.value || "all"}>
            <button
              type="button"
              role="option"
              aria-selected={o.value === current?.value}
              className={cn(OPTION_CLASS, o.value === current?.value && OPTION_SELECTED_CLASS)}
              onClick={() => {
                onChange?.(o.value);
                close();
              }}
            >
              {o.label}
            </button>
          </li>
        ))
      }
    </FilterDropdown>
  );
}

const SOURCE_FILTER_OPTIONS = LEAD_SOURCE_FILTER_OPTIONS.filter((o) => o.value);

function SourceMultiSelect({ selected = [], onChange, className }) {
  const displayLabel = useMemo(() => {
    if (!selected.length) return "All sources";
    if (selected.length === 1) {
      return SOURCE_FILTER_OPTIONS.find((o) => o.value === selected[0])?.label ?? selected[0];
    }
    return `${selected.length} selected`;
  }, [selected]);

  const toggle = (value) => {
    onChange?.(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  };

  return (
    <FilterDropdown
      id="wati-source-filter"
      label="Source"
      displayLabel={displayLabel}
      className={className}
    >
      {() => (
        <>
          <li>
            <button
              type="button"
              className={cn(OPTION_CLASS, selected.length === 0 && OPTION_SELECTED_CLASS)}
              onClick={() => onChange?.([])}
            >
              All sources
            </button>
          </li>
          {SOURCE_FILTER_OPTIONS.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className={cn(OPTION_CLASS, selected.includes(o.value) && OPTION_SELECTED_CLASS)}
                onClick={() => toggle(o.value)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </>
      )}
    </FilterDropdown>
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
  waResponse = "",
  onWaResponseChange,
  // WA status (what a Responded recipient answered) — only when WA response = Responded.
  waReply = "",
  onWaReplyChange,
  waReplyOptions = [],
  filterSources = [],
  onFilterSourcesChange,
}) {
  const selectOptions = [ALL_CAMPAIGN_OPTION, ...campaignOptions];
  const value =
    selectOptions.find((o) => o.value === (selectedCampaign || "all")) ||
    ALL_CAMPAIGN_OPTION;
  const isAllCampaigns = !selectedCampaign || selectedCampaign === "all";
  const showReplyFilter = waResponse === "responded";
  const replySelectOptions = useMemo(() => {
    const opts = [
      { value: "", label: "All replies" },
      ...(waReplyOptions || []).map((o) => ({
        value: o.value,
        label: o.count != null ? `${o.label} (${o.count})` : o.label,
      })),
    ];
    // Keep the picked reply visible while its options reload.
    if (waReply && !opts.some((o) => o.value === waReply)) {
      opts.push({ value: waReply, label: waReply === TEXT_REPLY_OPTION ? "Text reply" : waReply });
    }
    return opts;
  }, [waReplyOptions, waReply]);

  const campaignPicker = (
    <div className="w-full space-y-1.5 sm:w-[220px]">
      <Label htmlFor="wati-campaign-select" className="text-xs text-muted-foreground">
        Campaign
      </Label>
      <Select
        inputId="wati-campaign-select"
        options={selectOptions}
        value={value}
        onChange={(opt) => onCampaignChange?.(opt?.value || "all")}
        styles={campaignSelectStyles}
        components={CAMPAIGN_SELECT_COMPONENTS}
        menuPortalTarget={formSelectMenuPortalTarget}
        isSearchable
        placeholder="Select campaign…"
        classNamePrefix="wati-campaign"
      />
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      {isAllCampaigns ? (
        <div className="flex flex-wrap items-end gap-3">
          {campaignPicker}
          <div className="space-y-1.5">
            <span className="block text-xs text-muted-foreground">Period</span>
            <div
              className="flex flex-wrap items-center gap-2"
              role="tablist"
              aria-label="Date range preset"
            >
              {WATI_DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="tab"
                  aria-selected={preset === p.value}
                  onClick={() => onPresetChange?.(p.value)}
                  className={cn(
                    "h-9 rounded-md border px-3 text-sm font-medium transition-colors",
                    preset === p.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="block text-xs text-muted-foreground">Custom range</span>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className="h-9 w-auto"
                aria-label="Start date"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange?.(e.target.value)}
                className="h-9 w-auto"
                aria-label="End date"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          {campaignPicker}
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="wati-recipient-search" className="text-xs text-muted-foreground">
              Search student or contact
            </Label>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit?.();
              }}
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="wati-recipient-search"
                type="search"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-9 pl-9"
              />
            </form>
          </div>
          <FilterSingleSelect
            id="wati-status-filter"
            label="Message status"
            options={MESSAGE_STATUS_FILTER_OPTIONS}
            value={messageStatus}
            onChange={onMessageStatusChange}
            className="w-[calc(50%-6px)] sm:w-[170px]"
          />
          <FilterSingleSelect
            id="wati-response-filter"
            label="WA response"
            options={WA_RESPONSE_FILTER_OPTIONS}
            value={waResponse}
            onChange={onWaResponseChange}
            className="w-[calc(50%-6px)] sm:w-[170px]"
          />
          {showReplyFilter ? (
            <FilterSingleSelect
              id="wati-reply-filter"
              label="WA status"
              options={replySelectOptions}
              value={waReply}
              onChange={onWaReplyChange}
              className="w-[calc(50%-6px)] sm:w-[190px]"
            />
          ) : null}
          <SourceMultiSelect
            selected={filterSources}
            onChange={onFilterSourcesChange}
            className="w-full sm:w-[170px]"
          />
        </div>
      )}

      {isAllCampaigns ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Student search, message status, WA response and source filters apply when a single
          campaign is open.
        </p>
      ) : null}
    </div>
  );
}
