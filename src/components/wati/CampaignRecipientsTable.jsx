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
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInquirySourceLabel } from "@/constants/leadInquirySource";

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
    { key: "replied", label: "Replied" },
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

function isButtonLikeLabel(text) {
  const t = String(text || "").trim();
  if (!t || t.includes("\n") || t.length > 40) return false;
  if (/https?:\/\//i.test(t) || /www\./i.test(t)) return false;
  return true;
}

function resolveWaResponse(row) {
  const key = String(row.wa_response || "").toLowerCase();
  const kind = String(row.reply_kind || "").toLowerCase();
  const raw = String(
    row.wa_response_label || row.sales_outcome_label || row.sales_outcome || ""
  ).trim();
  const outcome = String(row.sales_outcome || "").trim();

  // WA response: template button, Replied (free text), Failed, or Didn't Reply.
  // Never show raw chat like "hello" in this column.
  if (key === "failed" || /^failed$/i.test(raw)) {
    return { key: "failed", label: "Failed" };
  }

  if (key === "interested") {
    return { key: "interested", label: "Interested" };
  }
  if (key === "not_interested") {
    return { key: "not_interested", label: "Not interested" };
  }

  if (key === "replied" || key === "typed" || kind === "typed" || /^replied$|^texted$/i.test(raw)) {
    return { key: "replied", label: "Replied" };
  }

  if (key === "button") {
    // Backend only emits button for template/CTA matches — show that label.
    const label = (outcome && isButtonLikeLabel(outcome) ? outcome : "") || raw;
    if (label && isButtonLikeLabel(label) && !/^texted$|^replied$|^didn't reply$/i.test(label)) {
      return { key: "button", label };
    }
  }
  // Stale kind=button with free-text leftover → Replied
  if (kind === "button" && (outcome || raw)) {
    return { key: "replied", label: "Replied" };
  }

  return { key: "no_reply", label: "Didn't Reply" };
}

function WaResponseCell({ row }) {
  const resolved = resolveWaResponse(row);
  const { key, label } = resolved;
  const title = resolved.title || label;

  return (
    <span
      className={cn(
        "inline-flex max-w-[180px] items-center truncate rounded-md border px-2 py-0.5 text-[11px] font-medium",
        key === "interested" && "border-primary/25 bg-primary/10 text-primary",
        key === "not_interested" && "border-destructive/25 bg-destructive/10 text-destructive",
        key === "failed" && "border-destructive/25 bg-destructive/10 text-destructive",
        key === "no_reply" && "border-border bg-muted/60 text-muted-foreground",
        key === "replied" && "border-border bg-background text-foreground",
        key === "button" && "border-primary/20 bg-primary/5 text-foreground"
      )}
      title={title}
    >
      {label}
    </span>
  );
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

function CompactRecipientRow({ row, showOutreach, showCampaign, onRowClick }) {
  const rawName = row.display_name || row.lead_name || "";
  const name = isPhoneLikeDisplayName(rawName, row.phone)
    ? row.phone
      ? `Contact ${String(row.phone).slice(-4)}`
      : "Unmatched contact"
    : rawName;
  const n = Number(row.campaigns_count) || 0;
  const delivery = deliveryCountsFromRow(row);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => onRowClick?.(row)}>
      {showCampaign ? (
        <TableCell className="max-w-[160px] truncate font-medium">
          {row.campaign_name || row.broadcast_id || "—"}
        </TableCell>
      ) : null}
      <TableCell>
        <p className="font-medium text-foreground">{name}</p>
        {!row.lead_id ? (
          <span className="mt-0.5 block text-[10px] text-muted-foreground">Not in CRM</span>
        ) : null}
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{row.phone || "—"}</TableCell>
      <TableCell className="max-w-[140px] truncate text-muted-foreground" title={getInquirySourceLabel(row.source) || row.source || undefined}>
        {getInquirySourceLabel(row.source) || row.source || "—"}
      </TableCell>
      {showOutreach ? (
        <TableCell>
          <span className="text-xs font-medium text-foreground">
            {n} campaign{n === 1 ? "" : "s"}
          </span>
        </TableCell>
      ) : null}
      <TableCell>
        <DeliveryBar {...delivery} />
      </TableCell>
      <TableCell>
        <WaResponseCell row={row} />
      </TableCell>
    </TableRow>
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
}) {
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize) || 1);
  const showOutreach = Boolean(studentFocused);
  const colSpan = (showCampaign ? 1 : 0) + (showOutreach ? 6 : 5);

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
      <DeliveryLegend />
      <div className="w-full min-w-0 overflow-x-auto rounded-md border border-border/60">
        <Table className={showOutreach ? "min-w-[1040px] text-xs" : "min-w-[900px] text-xs"}>
          <TableHeader>
            <TableRow className="border-b bg-muted/30 hover:bg-transparent">
              {showCampaign ? <TableHead>Campaign</TableHead> : null}
              <TableHead className={showOutreach ? "w-[16%]" : "w-[18%]"}>Name</TableHead>
              <TableHead className={showOutreach ? "w-[12%]" : "w-[14%]"}>Contact</TableHead>
              <TableHead className={showOutreach ? "w-[12%]" : "w-[14%]"}>Source</TableHead>
              {showOutreach ? (
                <TableHead className="w-[10%]">WA outreach</TableHead>
              ) : null}
              <TableHead className={showOutreach ? "w-[32%]" : "w-[36%]"}>WA delivery</TableHead>
              <TableHead className={showOutreach ? "w-[18%]" : "w-[18%]"}>WA response</TableHead>
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
                />
              ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {count
            ? `${count} ${studentFocused ? "unique contact" : "contact"}${count === 1 ? "" : "s"}`
            : null}
        </span>
        <div className="flex items-center gap-2">
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
    </div>
  );
}
