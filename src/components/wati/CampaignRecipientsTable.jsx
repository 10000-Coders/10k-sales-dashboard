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
import { Input } from "@/components/ui/input";
import TablePaginationFooter from "@/components/ui/TablePaginationFooter";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInquirySourceLabel } from "@/constants/leadInquirySource";
import { formatWatiDateTime } from "@/lib/watiFormatters";

/** WA delivery funnel colors from product mock (Sent / Delivered / Read / Replied / Failed). */
const WA_DELIVERY = {
  sent: { fill: "#4A5568", soft: "#E2E8F0", text: "#4A5568" },
  delivered: { fill: "#005A92", soft: "#D6E8F3", text: "#005A92" },
  read: { fill: "#483D8B", soft: "#E4E0F2", text: "#483D8B" },
  replied: { fill: "#1B7A3D", soft: "#D9F0E2", text: "#1B7A3D" },
  failed: { fill: "#B22222", soft: "#F7D6D6", text: "#B22222" },
};

function DeliverySegment({ value, max, fill, soft }) {
  const pct = max > 0 ? Math.min(100, Math.round((Number(value) / max) * 100)) : 0;
  return (
    <div
      className="h-2 flex-1 overflow-hidden rounded-sm"
      style={{ backgroundColor: soft }}
      title={`${value}`}
    >
      <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: fill }} />
    </div>
  );
}

function DeliveryBar({
  sent = 0,
  delivered = 0,
  read = 0,
  replied = 0,
  failed = 0,
}) {
  const s = Number(sent) || 0;
  const d = Number(delivered) || 0;
  const r = Number(read) || 0;
  const rep = Number(replied) || 0;
  const f = Number(failed) || 0;
  const empty = s === 0 && d === 0 && r === 0 && rep === 0 && f === 0;
  const max = Math.max(s, d, r, rep, f, 1);

  return (
    <div className="min-w-[200px] space-y-1">
      <p className={cn("text-xs font-semibold tabular-nums", empty && "text-muted-foreground")}>
        <span style={{ color: empty ? undefined : WA_DELIVERY.sent.text }}>{s}</span>
        <span className="mx-1 text-muted-foreground/40">·</span>
        <span style={{ color: empty ? undefined : WA_DELIVERY.delivered.text }}>{d}</span>
        <span className="mx-1 text-muted-foreground/40">·</span>
        <span style={{ color: empty ? undefined : WA_DELIVERY.read.text }}>{r}</span>
        <span className="mx-1 text-muted-foreground/40">·</span>
        <span style={{ color: empty ? undefined : WA_DELIVERY.replied.text }}>{rep}</span>
        <span className="mx-1 text-muted-foreground/40">·</span>
        <span style={{ color: empty ? undefined : WA_DELIVERY.failed.text }}>{f}</span>
      </p>
      <div className="flex w-[140px] shrink-0 gap-1">
        <DeliverySegment value={s} max={max} {...WA_DELIVERY.sent} />
        <DeliverySegment value={d} max={max} {...WA_DELIVERY.delivered} />
        <DeliverySegment value={r} max={max} {...WA_DELIVERY.read} />
        <DeliverySegment value={rep} max={max} {...WA_DELIVERY.replied} />
        <DeliverySegment value={f} max={max} {...WA_DELIVERY.failed} />
      </div>
    </div>
  );
}

function DeliveryLegend() {
  const items = [
    { key: "sent", label: "Sent" },
    { key: "delivered", label: "Delivered" },
    { key: "read", label: "Read" },
    { key: "replied", label: "Responded" },
    { key: "failed", label: "Failed" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-[2px]"
            style={{ backgroundColor: WA_DELIVERY[item.key].fill }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

const STEPS = [
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "read", label: "Read" },
  { key: "replied", label: "Responded" },
];
const STAGE_INDEX = { sent: 0, delivered: 1, read: 2, replied: 3 };

/** Single recipient: Sent → Delivered → Read → Replied stepper, or a Failed chip. */
function DeliveryStatus({ row }) {
  const status = String(row.message_status || "").toLowerCase();
  if (status === "failed") {
    const reason = String(row.failed_reason || "").trim();
    return (
      <span
        className="inline-flex max-w-[260px] items-center gap-1.5 truncate rounded-md border px-2 py-0.5 text-[11px] font-medium"
        style={{
          color: WA_DELIVERY.failed.text,
          backgroundColor: WA_DELIVERY.failed.soft,
          borderColor: WA_DELIVERY.failed.soft,
        }}
        title={reason || "Message failed (e.g. number not on WhatsApp)"}
      >
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">Failed{reason ? ` · ${reason}` : ""}</span>
      </span>
    );
  }
  const current = STAGE_INDEX[status] ?? 0;
  const currentStep = STEPS[current];
  const color = WA_DELIVERY[currentStep.key];
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" aria-hidden>
        {STEPS.map((step, i) => {
          const done = i <= current;
          return (
            <span key={step.key} className="flex items-center">
              {i > 0 ? (
                <span
                  className="h-0.5 w-3"
                  style={{ backgroundColor: done ? color.fill : WA_DELIVERY.sent.soft }}
                />
              ) : null}
              <span
                title={step.label}
                className="h-2.5 w-2.5 rounded-full border"
                style={{
                  backgroundColor: done ? color.fill : "transparent",
                  borderColor: done ? color.fill : WA_DELIVERY.sent.soft,
                }}
              />
            </span>
          );
        })}
      </div>
      <span className="text-xs font-medium" style={{ color: color.text }}>
        {currentStep.label}
      </span>
      <span className="sr-only">WA delivery: {currentStep.label}</span>
    </div>
  );
}

const RESPONSE_BADGES = {
  responded: { label: "Responded", className: "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" },
  not_responded: { label: "Not responded", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  failed: { label: "Failed", className: "border-destructive/25 bg-destructive/10 text-destructive" },
  not_delivered: { label: "Not delivered", className: "border-border bg-muted/60 text-muted-foreground" },
};

/**
 * One bucket per recipient (same rules as the backend `response_bucket` and the Response donut):
 * responded → failed → not_responded (delivered/read) → not_delivered.
 */
function responseBucket(row) {
  if (RESPONSE_BADGES[row.response_bucket]) return row.response_bucket;
  const status = String(row.message_status || "").toLowerCase();
  const wr = String(row.wa_response || "").toLowerCase();
  const n = (k) => Number(row[k]) || 0;
  if (row.replied || status === "replied" || n("replied_count") > 0) return "responded";
  if (["replied", "button", "interested", "not_interested"].includes(wr)) return "responded";
  if (status === "failed" || wr === "failed" || (n("failed") > 0 && n("delivered") <= 0)) return "failed";
  if (status === "delivered" || status === "read" || n("delivered") > 0 || n("read") > 0) {
    return "not_responded";
  }
  return "not_delivered";
}

function WaResponseCell({ row }) {
  const bucket = responseBucket(row);
  const badge = RESPONSE_BADGES[bucket];
  // Keep the tapped button / reply text as a hover hint on Responded.
  const detail =
    bucket === "responded"
      ? String(row.sales_outcome_label || row.wa_response_label || "").trim()
      : "";
  const title = detail && detail !== "Replied" ? `Responded · ${detail}` : badge.label;
  return (
    <span
      className={cn(
        "inline-flex max-w-[180px] items-center truncate rounded-md border px-2 py-0.5 text-[11px] font-medium",
        badge.className
      )}
      title={title}
    >
      {badge.label}
    </span>
  );
}

const REPLY_CHIP_BASE =
  "inline-flex max-w-[160px] shrink-0 items-center truncate rounded-md border px-2 py-0.5 text-[11px] font-medium";

function replyButtonChipClass(label) {
  const l = String(label || "").toLowerCase();
  if (/not\s*interest|no\s*interest/.test(l)) return RESPONSE_BADGES.failed.className;
  if (l.includes("interest")) return RESPONSE_BADGES.responded.className;
  return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400";
}

/** WA status (Responded only): the button the person tapped, or "Text reply" + their message. */
function WaReplyCell({ row }) {
  const kind =
    row.reply_option ||
    (String(row.reply_kind || "").toLowerCase() === "button" && row.sales_outcome
      ? "button"
      : responseBucket(row) === "responded"
        ? "text"
        : null);
  if (kind === "button") {
    const label = String(row.sales_outcome || row.wa_response_label || "").trim();
    return (
      <span className={cn(REPLY_CHIP_BASE, replyButtonChipClass(label))} title={`Tapped: ${label}`}>
        {label}
      </span>
    );
  }
  if (kind === "text") {
    const text = String(row.reply_text || "").trim();
    return (
      <span className="flex min-w-0 items-center gap-1.5" title={text || "Typed a reply"}>
        <span className={cn(REPLY_CHIP_BASE, "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400")}>
          Text reply
        </span>
        {text ? (
          <span className="min-w-0 truncate text-muted-foreground">“{text}”</span>
        ) : null}
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

/** Map a single-campaign recipient row into funnel counts when API fields are absent. */
function deliveryCountsFromRow(row) {
  const status = String(row.message_status || "").toLowerCase();
  if (
    row.sent != null ||
    row.delivered != null ||
    row.read != null ||
    row.replied_count != null ||
    row.failed != null
  ) {
    return {
      sent: Number(row.sent) || 0,
      delivered: Number(row.delivered) || 0,
      read: Number(row.read) || 0,
      replied: Number(row.replied_count ?? (row.replied ? 1 : 0)) || 0,
      failed: Number(row.failed) || 0,
      status,
    };
  }

  const replied = Boolean(row.replied) || status === "replied";
  if (status === "failed" && !replied) {
    return { sent: 0, delivered: 0, read: 0, replied: 0, failed: 1, status };
  }
  if (replied) return { sent: 1, delivered: 1, read: 1, replied: 1, failed: 0, status };
  if (status === "read") return { sent: 1, delivered: 1, read: 1, replied: 0, failed: 0, status };
  if (status === "delivered") {
    return { sent: 1, delivered: 1, read: 0, replied: 0, failed: 0, status };
  }
  if (status === "sent") return { sent: 1, delivered: 0, read: 0, replied: 0, failed: 0, status };
  return { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, status };
}

function isPhoneLikeDisplayName(name, phone) {
  const t = String(name || "").trim();
  if (!t) return true;
  const digits = t.replace(/\D/g, "");
  if (digits.length < 10) return false;
  const nonPhone = t.replace(/[\d+\s\-()]/g, "");
  if (!nonPhone) return true;
  const phoneDigits = String(phone || "").replace(/\D/g, "");
  if (phoneDigits && (digits.endsWith(phoneDigits.slice(-10)) || phoneDigits.endsWith(digits.slice(-10)))) {
    return true;
  }
  return false;
}

function CompactRecipientRow({
  row,
  showOutreach,
  showCampaign,
  onRowClick,
  selectable = false,
  selected = false,
  onToggleSelect,
  showReplyColumn = false,
}) {
  const rawName = row.display_name || row.lead_name || "";
  const name = isPhoneLikeDisplayName(rawName, row.phone)
    ? row.phone
      ? `Contact ${String(row.phone).slice(-4)}`
      : "Unmatched contact"
    : rawName;
  const n = Number(row.campaigns_count) || 0;
  const delivery = deliveryCountsFromRow(row);
  const sourceLabel = getInquirySourceLabel(row.source) || row.source || "";

  return (
    <TableRow
      className={cn("cursor-pointer hover:bg-muted/40", selectable && selected && "bg-orange-50/60")}
      onClick={() => onRowClick?.(row)}
    >
      {selectable ? (
        <TableCell className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-[#FF8000]"
            checked={selected}
            disabled={!row.phone}
            onChange={() => onToggleSelect?.(row)}
            aria-label={`Select ${name}`}
          />
        </TableCell>
      ) : null}
      {showCampaign ? (
        <TableCell className="max-w-[160px] truncate font-medium">
          {row.campaign_name || row.broadcast_id || "—"}
        </TableCell>
      ) : null}
      <TableCell className="max-w-[200px]">
        <p className="truncate font-medium text-foreground" title={name}>
          {name}
        </p>
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
        {row.phone || "—"}
      </TableCell>
      <TableCell
        className="max-w-[140px] truncate text-muted-foreground"
        title={sourceLabel || undefined}
      >
        {sourceLabel ? (
          sourceLabel
        ) : !row.lead_id ? (
          <span className="text-[11px] italic">Not in CRM</span>
        ) : (
          "—"
        )}
      </TableCell>
      {showOutreach ? (
        <TableCell>
          <span className="text-xs font-medium text-foreground">
            {n} campaign{n === 1 ? "" : "s"}
          </span>
        </TableCell>
      ) : null}
      <TableCell>
        {showOutreach ? <DeliveryBar {...delivery} /> : <DeliveryStatus row={row} />}
      </TableCell>
      <TableCell>
        <WaResponseCell row={row} />
      </TableCell>
      {showReplyColumn ? (
        <TableCell className="max-w-[240px]">
          <WaReplyCell row={row} />
        </TableCell>
      ) : null}
      {showOutreach ? null : (
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {row.last_activity_at ? formatWatiDateTime(row.last_activity_at) : "—"}
        </TableCell>
      )}
    </TableRow>
  );
}

/** Same look as the All campaigns table's sort headers. Click: newest first ⇄ oldest first. */
function LastActivitySortButton({ ordering, disabled, onChange }) {
  const active = ordering === "-last_activity" || ordering === "last_activity";
  const Icon = !active ? ArrowUpDown : ordering === "last_activity" ? ArrowUp : ArrowDown;
  const next = ordering === "-last_activity" ? "last_activity" : "-last_activity";
  const label = !active
    ? "Sort by last activity"
    : ordering === "-last_activity"
      ? "Sorted newest first — click for oldest first"
      : "Sorted oldest first — click for newest first";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(next)}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground disabled:cursor-not-allowed",
        active && "text-foreground"
      )}
    >
      Last activity
      <Icon className={cn("h-3 w-3", !active && "opacity-40")} aria-hidden />
    </button>
  );
}

export default function CampaignRecipientsTable({
  results = [],
  loading,
  error,
  search,
  onSearchChange,
  onSearchSubmit,
  page = 1,
  count = 0,
  pageSize = 50,
  onPageChange,
  onRowClick,
  showSearch = true,
  showCampaign = false,
  studentFocused = false,
  emptyMessage = "No students or contacts found for the current filters.",
  // Optional row selection (campaign page → follow-up campaign audience).
  selectable = false,
  isRowSelected,
  onToggleRow,
  onTogglePage,
  // Server-side Last activity sort: "" | "-last_activity" (newest) | "last_activity" (oldest).
  ordering = "",
  onOrderingChange,
  // WA response = Responded: extra "WA status" column (button tapped / text reply).
  showReplyColumn = false,
}) {
  const showOutreach = Boolean(studentFocused);
  // Aggregated: Name, Contact, Source, Outreach, Delivery, Response.
  // Single campaign: Name, Contact, Source, Delivery, Response, Last activity.
  const colSpan = (showCampaign ? 1 : 0) + (selectable ? 1 : 0) + (showReplyColumn ? 1 : 0) + 6;
  const selectableRows = selectable ? results.filter((r) => r.phone) : [];
  const pageSelectedCount = selectableRows.filter((r) => isRowSelected?.(r)).length;
  const pageAllSelected =
    selectableRows.length > 0 && pageSelectedCount === selectableRows.length;

  return (
    <div className="space-y-3">
      {showSearch ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.();
          }}
        >
          <Input
            type="search"
            placeholder="Search student or contact name…"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" disabled={loading}>
            Search
          </Button>
        </form>
      ) : null}
      {showOutreach ? <DeliveryLegend /> : null}
      <div className="w-full min-w-0 rounded-md border border-border/60">
        <Table
          className={showOutreach ? "min-w-[1040px] text-xs" : "min-w-[980px] text-xs"}
          containerClassName="max-h-[70vh]"
        >
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow className="border-b hover:bg-transparent">
              {selectable ? (
                <TableHead className="w-10 pr-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[#FF8000]"
                    checked={pageAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = pageSelectedCount > 0 && !pageAllSelected;
                    }}
                    disabled={loading || selectableRows.length === 0}
                    onChange={() => onTogglePage?.(selectableRows, !pageAllSelected)}
                    aria-label="Select all rows on this page"
                  />
                </TableHead>
              ) : null}
              {showCampaign ? <TableHead>Campaign</TableHead> : null}
              <TableHead className={showOutreach ? "w-[16%]" : "w-[18%]"}>Name</TableHead>
              <TableHead className={showOutreach ? "w-[12%]" : "w-[13%]"}>Contact</TableHead>
              <TableHead className={showOutreach ? "w-[12%]" : "w-[12%]"}>Source</TableHead>
              {showOutreach ? (
                <TableHead className="w-[10%]">WA outreach</TableHead>
              ) : null}
              <TableHead className={showOutreach ? "w-[32%]" : "w-[25%]"}>WA delivery</TableHead>
              <TableHead className="w-[16%]">WA response</TableHead>
              {showReplyColumn ? <TableHead className="w-[18%]">WA status</TableHead> : null}
              {showOutreach ? null : (
                <TableHead className="w-[16%]">
                  {onOrderingChange ? (
                    <LastActivitySortButton
                      ordering={ordering}
                      disabled={loading}
                      onChange={onOrderingChange}
                    />
                  ) : (
                    "Last activity"
                  )}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-8 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && results.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              results.map((row) => (
                <CompactRecipientRow
                  key={
                    showOutreach
                      ? `unique-${row.phone}-${row.lead_id || "x"}`
                      : `${row.broadcast_id || "camp"}-${row.phone}-${row.lead_id || "x"}`
                  }
                  row={row}
                  showOutreach={showOutreach}
                  showCampaign={showCampaign}
                  onRowClick={onRowClick}
                  selectable={selectable}
                  selected={selectable ? Boolean(isRowSelected?.(row)) : false}
                  onToggleSelect={onToggleRow}
                  showReplyColumn={showReplyColumn}
                />
              ))}
          </TableBody>
        </Table>
      </div>
      <TablePaginationFooter
        page={page}
        pageSize={pageSize}
        count={count}
        onPageChange={onPageChange}
        loading={loading}
        itemLabel={studentFocused ? "unique contacts" : "contacts"}
      />
    </div>
  );
}
