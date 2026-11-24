"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, CheckCheck, ChevronDown, Clock3, FileText, Loader2, X } from "lucide-react";
import axios from "@/axios";
import { buttonVariants } from "@/components/ui/button";
import WatiStatusBadge from "@/components/wati/WatiStatusBadge";
import { TemplateButtons, WhatsAppBody } from "@/components/wati/whatsappBubbleParts";
import { formatWatiDate, formatWatiDateTime } from "@/lib/watiFormatters";
import { cn } from "@/lib/utils";

function resolveTitle({ activity, history, previewName, phone }) {
  const fromApi = activity?.lead_name || history?.lead_name;
  if (fromApi) return fromApi;
  if (previewName && previewName.toLowerCase() !== "unknown") return previewName;
  if (phone && phone !== "—") return `Contact · ${phone}`;
  return "Unmatched contact";
}

function isProxiedMediaUrl(url) {
  return typeof url === "string" && url.startsWith("/wati/");
}

function isImageLike(messageType, mediaUrl) {
  const mt = String(messageType || "").toLowerCase();
  if (["image", "sticker", "gif", "media_placeholder"].includes(mt)) return true;
  if (!mediaUrl) return false;
  return /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(mediaUrl);
}

function messageTimeValue(msg) {
  const raw = msg?.created_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Fetch WATI media through our JWT proxy when the URL is relative. */
function useResolvedMediaUrl(mediaUrl) {
  const [resolved, setResolved] = useState(() =>
    mediaUrl && !isProxiedMediaUrl(mediaUrl) ? mediaUrl : ""
  );
  const [loading, setLoading] = useState(() => Boolean(mediaUrl && isProxiedMediaUrl(mediaUrl)));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    if (!mediaUrl) {
      setResolved("");
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    if (!isProxiedMediaUrl(mediaUrl)) {
      setResolved(mediaUrl);
      setLoading(false);
      setFailed(false);
      return undefined;
    }

    setLoading(true);
    setFailed(false);
    setResolved("");

    (async () => {
      try {
        const response = await axios.get(mediaUrl, {
          responseType: "blob",
          validateStatus: (status) => (status >= 200 && status < 300) || status === 204,
        });
        if (cancelled) return;
        const data = response.data;
        if (!data || data.size === 0 || response.status === 204) {
          setFailed(true);
          setResolved("");
          return;
        }
        objectUrl = URL.createObjectURL(data);
        setResolved(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setResolved("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaUrl]);

  return { resolved, loading, failed };
}


function formatBubbleTime(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
}

function dayKey(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toDateString();
}

function formatDayChip(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dt.toDateString() === today.toDateString()) return "Today";
  if (dt.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function StatusTicks({ status }) {
  const s = String(status || "").toLowerCase();
  if (!s) return null;
  if (s.includes("fail") || s.includes("error")) {
    return <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label={status} />;
  }
  if (s.includes("read") || s.includes("replied")) {
    return <CheckCheck className="h-4 w-4 text-[#53bdeb]" aria-label={status} />;
  }
  if (s.includes("deliver")) {
    return <CheckCheck className="h-4 w-4 text-[#8696a0]" aria-label={status} />;
  }
  if (s.includes("sent")) {
    return <Check className="h-4 w-4 text-[#8696a0]" aria-label={status} />;
  }
  return <Clock3 className="h-3 w-3 text-[#8696a0]" aria-label={status} />;
}

function BubbleMeta({ msg, outbound }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] leading-none text-[#667781]">
      {formatBubbleTime(msg.created_at)}
      {outbound ? <StatusTicks status={msg.status} /> : null}
    </span>
  );
}


/** Split the backend-appended footer off the body so it renders like WhatsApp's grey footer line. */
function splitFooter(body, footer) {
  const f = String(footer || "").trim();
  if (!f || !body) return { body, footer: f };
  if (body === f) return { body: "", footer: f };
  if (body.endsWith(`\n${f}`)) return { body: body.slice(0, -f.length).trimEnd(), footer: f };
  return { body, footer: f };
}

function MessageBubble({ msg, outbound, showTail }) {
  const mt = String(msg.message_type || "").toLowerCase();
  const mediaUrl = String(msg.media_url || "").trim();
  const { resolved, loading: mediaLoading, failed: mediaFailed } = useResolvedMediaUrl(mediaUrl);
  const hasMedia = Boolean(mediaUrl);
  const isTemplate = mt === "template" || Boolean(msg.template_name);
  const headerMissing = Boolean(msg.header_media_missing);
  const mediaIsAudio = hasMedia && (mt === "audio" || mt === "voice");
  const mediaIsVideo = hasMedia && mt === "video";
  const mediaIsDocument = hasMedia && (mt === "document" || /\.pdf(\?|$)/i.test(mediaUrl));
  const mediaIsImage =
    hasMedia &&
    !mediaIsAudio &&
    !mediaIsVideo &&
    !mediaIsDocument &&
    (isImageLike(mt, mediaUrl) || isTemplate || mt === "" || mt === "text");
  const buttons = Array.isArray(msg.template_buttons) ? msg.template_buttons : [];
  const bodyRaw = (msg.text || msg.media_caption || "").trim();
  const bodyNoMediaTag =
    hasMedia && /^\[(Image|Video|Audio|Voice note|Document|Sticker|GIF|Attachment)\]$/i.test(bodyRaw)
      ? ""
      : bodyRaw;
  const { body, footer } = isTemplate
    ? splitFooter(bodyNoMediaTag, msg.template_footer)
    : { body: bodyNoMediaTag, footer: "" };
  const showPlaceholder = !body && !footer && !hasMedia && !isTemplate && !headerMissing;
  const hasHeaderBlock = hasMedia || headerMissing;
  const imageOnly =
    !body && !footer && hasMedia && mediaIsImage && Boolean(resolved) && !mediaLoading && !mediaFailed;
  // Template / media bubbles take a fixed width like on the phone; plain text hugs content.
  const wide = isTemplate || hasHeaderBlock || buttons.length > 0;
  const bubbleBg = outbound ? "bg-[#d9fdd3]" : "bg-white";

  const mediaFallback = (
    <div className="flex aspect-[1.91/1] w-full items-center justify-center rounded-[6px] bg-black/[0.05] px-3 text-center text-[12px] text-[#667781]">
      {isTemplate || headerMissing ? "Header image unavailable from WATI" : "Media unavailable"}
    </div>
  );

  return (
    <div className={cn("flex flex-col", wide ? "w-[85%]" : "max-w-[85%]")}>
      {isTemplate && msg.template_name ? (
        <p
          className={cn(
            "mb-0.5 px-1 text-[10px] font-medium uppercase tracking-wide text-[#667781]",
            outbound ? "text-right" : "text-left"
          )}
        >
          Template · {msg.template_name}
        </p>
      ) : null}
      <div
        className={cn(
          "relative rounded-lg text-[14.2px] leading-[19px] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]",
          bubbleBg,
          showTail && (outbound ? "rounded-tr-none" : "rounded-tl-none")
        )}
      >
        <div className={cn("relative", hasHeaderBlock ? "p-[3px]" : "px-[7px] pb-[6px] pt-[6px]")}>
        {showTail ? (
          <svg
            viewBox="0 0 8 13"
            className={cn(
              "absolute top-0 h-[13px] w-[8px]",
              outbound ? "-right-[8px] text-[#d9fdd3]" : "-left-[8px] -scale-x-100 text-white"
            )}
            aria-hidden="true"
          >
            <path fill="currentColor" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
          </svg>
        ) : null}

        {mt && mt !== "text" && !isTemplate && !hasMedia ? (
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#667781]">
            {mt.replace(/_/g, " ")}
          </p>
        ) : null}

        {hasHeaderBlock ? (
          <div className="overflow-hidden rounded-[6px]">
            {!hasMedia ? (
              mediaFallback
            ) : mediaLoading ? (
              <div className="flex aspect-[1.91/1] w-full items-center justify-center rounded-[6px] bg-black/[0.05] text-[#667781]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : mediaFailed || !resolved ? (
              mediaFallback
            ) : mediaIsImage ? (
              <a href={resolved} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolved}
                  alt={msg.media_caption || msg.template_name || "Attachment"}
                  className="block max-h-[340px] w-full rounded-[6px] object-cover"
                />
              </a>
            ) : mediaIsAudio ? (
              <audio controls preload="none" className="h-10 w-full">
                <source src={resolved} />
              </audio>
            ) : mediaIsVideo ? (
              <video controls preload="metadata" className="block max-h-[340px] w-full rounded-[6px] bg-black">
                <source src={resolved} />
              </video>
            ) : (
              <a
                href={resolved}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-[6px] bg-black/[0.05] px-3 py-3 text-[13px] font-medium text-[#111b21] hover:bg-black/[0.08]"
              >
                <FileText className="h-6 w-6 shrink-0 text-[#e9573f]" />
                Open attachment
              </a>
            )}
          </div>
        ) : null}

        <div className={cn(hasHeaderBlock && "px-[4px] pb-[3px] pt-[6px]")}>
          {body ? (
            <div>
              <WhatsAppBody text={body} />
              {/* Spacer reserves room so the timestamp sits on the last line, like WhatsApp. */}
              {!footer ? <span className="inline-block w-[68px]" aria-hidden="true" /> : null}
            </div>
          ) : null}
          {footer ? (
            <p className="mt-[3px] text-[13px] leading-[17px] text-[#667781]">
              {footer}
              <span className="inline-block w-[68px]" aria-hidden="true" />
            </p>
          ) : null}
          {showPlaceholder ? (
            <span className="text-[#667781]">
              —<span className="inline-block w-[68px]" aria-hidden="true" />
            </span>
          ) : null}
          {!body && !footer && !showPlaceholder && !imageOnly ? <div className="h-[14px]" /> : null}
        </div>

        <div
          className={cn(
            "absolute",
            imageOnly ? "bottom-[9px] right-[9px]" : "bottom-[5px]",
            !imageOnly && (hasHeaderBlock ? "right-[8px]" : "right-[7px]"),
            imageOnly ? "rounded-full bg-black/35 px-1.5 py-0.5 [&_*]:!text-white" : ""
          )}
        >
          <BubbleMeta msg={msg} outbound={outbound} />
        </div>
        </div>

        {/* On the phone, quick-reply / CTA buttons live inside the same bubble, split by hairlines. */}
        {buttons.length > 0 ? <TemplateButtons buttons={buttons} /> : null}
      </div>
    </div>
  );
}

function campaignResponseChip(c) {
  const outcome = String(c?.outcome || "").toLowerCase();
  const status = String(c?.status || "").toLowerCase();
  if (c?.replied) {
    const choice = String(c.reply_choice || c.reply_text || "").trim();
    return {
      label: choice ? `Responded · ${choice}` : "Responded",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }
  if (status === "failed" || outcome === "failed") {
    return { label: "Failed", className: "border-red-200 bg-red-50 text-red-700" };
  }
  return { label: "Not responded", className: "border-amber-200 bg-amber-50 text-amber-800" };
}

function sortCampaignsNewestFirst(campaigns) {
  return [...campaigns].sort(
    (a, b) =>
      new Date(b.sent_at || b.event_at || 0).getTime() -
      new Date(a.sent_at || a.event_at || 0).getTime()
  );
}

function CampaignResponseChip({ campaign }) {
  const chip = campaignResponseChip(campaign);
  return (
    <span
      className={cn(
        "max-w-[110px] shrink-0 truncate rounded-full border px-1.5 py-px text-[10px] font-medium",
        chip.className
      )}
      title={chip.label}
    >
      {chip.label}
    </span>
  );
}

/**
 * Leads popup: the lead's WATI campaigns as a dropdown under the chat header.
 * Collapsed it shows the count + latest campaign; open it lists every campaign (newest
 * first). Picking one scrolls the chat to that campaign's message.
 */
function LeadCampaignDropdown({ campaigns, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const rows = useMemo(() => sortCampaignsNewestFirst(campaigns), [campaigns]);
  const latest = rows[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!rows.length) {
    return (
      <div className="shrink-0 border-b border-black/5 bg-white/90 px-3 py-2 text-[11px] text-[#667781]">
        No campaigns recorded for this lead.
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative z-20 shrink-0 border-b border-black/5 bg-white/95"
      onKeyDown={(e) => {
        // Esc closes the dropdown first (not the whole popup).
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-black/[0.03]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-[#667781]">
            <span className="font-semibold uppercase tracking-wide">
              {rows.length} campaign{rows.length === 1 ? "" : "s"}
            </span>
            {" · Latest: "}
            <span className="font-medium text-[#111b21]">
              {latest.campaign_name || latest.broadcast_id}
            </span>
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px]">
            <span className="tabular-nums text-[#667781]">
              {formatWatiDate(latest.sent_at || latest.event_at)}
            </span>
            <CampaignResponseChip campaign={latest} />
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[#54656f] transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Campaigns sent to this lead"
          className="absolute left-0 right-0 top-full max-h-64 overflow-y-auto border-b border-black/10 bg-white py-1 shadow-[0_8px_20px_rgba(11,20,26,0.18)]"
        >
          {rows.map((c) => (
            <li key={c.broadcast_id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setOpen(false);
                  onSelect?.(c);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] hover:bg-[#f0f2f5]"
                title={`Show ${c.campaign_name || c.broadcast_id} in the chat`}
              >
                <span className="min-w-0 flex-1 truncate font-medium text-[#111b21]">
                  {c.campaign_name || c.broadcast_id}
                </span>
                <span className="shrink-0 tabular-nums text-[#667781]">
                  {formatWatiDate(c.sent_at || c.event_at)}
                </span>
                <CampaignResponseChip campaign={c} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The chat bubble for a campaign: nearest outbound template send to its sent time (±36h). */
function findCampaignMessage(messages, campaign) {
  const target = new Date(campaign?.sent_at || campaign?.event_at || 0).getTime();
  if (!target) return null;
  const wantTemplate = String(campaign?.template_name || "").trim().toLowerCase();
  let best = null;
  let bestGap = Infinity;
  for (const msg of messages) {
    if (msg.direction !== "outbound") continue;
    const isCampaign =
      msg.template_name ||
      String(msg.message_type || "").toLowerCase() === "template" ||
      String(msg.event_type || "").toLowerCase().includes("broadcast");
    if (!isCampaign) continue;
    const t = messageTimeValue(msg);
    if (!t) continue;
    let gap = Math.abs(t - target);
    // Same template name is a strong hint when the clock stamps drift.
    if (wantTemplate && String(msg.template_name || "").toLowerCase() === wantTemplate) gap /= 4;
    if (gap < bestGap) {
      best = msg;
      bestGap = gap;
    }
  }
  return bestGap <= 36 * 60 * 60 * 1000 ? best : null;
}

export default function RecipientDetailDrawer({
  open,
  loading,
  error,
  data,
  previewName,
  previewPhone,
  onClose,
}) {
  const chatScrollRef = useRef(null);
  // Message briefly highlighted after picking a campaign in the dropdown.
  const [highlightId, setHighlightId] = useState(null);

  const activity = data?.activity;
  const history = data?.history;
  // Leads table popup: every campaign sent to this lead (null on the campaign page).
  const campaigns = Array.isArray(data?.campaigns) ? data.campaigns : null;
  const events = activity?.events || history?.local_events || [];
  const conversationError = history?.conversation_error;
  const leadId = activity?.lead_id ?? history?.lead_id;
  const phone = activity?.phone || history?.phone || previewPhone || "—";
  const outcome =
    activity?.sales_outcome_label || history?.sales_outcome_label || "—";
  const matchedLead = Boolean(leadId || history?.matched_lead || activity?.lead_id);
  const leadName = resolveTitle({ activity, history, previewName, phone });

  // WhatsApp order: oldest → newest (newest at bottom).
  const messages = useMemo(() => {
    const rows = history?.conversation_messages || [];
    return [...rows].sort((a, b) => messageTimeValue(a) - messageTimeValue(b));
  }, [history?.conversation_messages]);

  useEffect(() => {
    if (!open || loading || !messages.length) return;
    const el = chatScrollRef.current;
    if (!el) return;
    // Scroll to latest message after layout.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [open, loading, messages]);

  useEffect(() => {
    if (!highlightId) return undefined;
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  const jumpToCampaign = (campaign) => {
    const msg = findCampaignMessage(messages, campaign);
    const root = chatScrollRef.current;
    if (!msg || !root) return;
    const el = root.querySelector(`[data-msg-id="${CSS.escape(String(msg.id))}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(String(msg.id));
  };

  // Esc closes the popup, like clicking the dark backdrop.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
    >
      {/* Phone-frame WhatsApp preview */}
      <div
        className="relative flex h-[min(820px,94vh)] w-full max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-zinc-800/80 bg-[#efeae2] shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-4 ring-zinc-900/90"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="WhatsApp conversation"
      >
        <div className="flex h-7 shrink-0 items-end justify-center bg-[#075e54] pb-1">
          <div className="h-1.5 w-20 rounded-full bg-black/35" />
        </div>

        <div className="flex items-center gap-2 bg-[#075e54] px-3 pb-3 pt-1 text-white">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
            {(leadName || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold leading-tight">{leadName}</h2>
            <p className="truncate text-[11px] text-white/80">
              {phone}
              {outcome && outcome !== "—" ? ` · ${outcome}` : ""}
            </p>
          </div>
          {matchedLead && leadId ? (
            <Link
              href={`/leads/${leadId}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-7 bg-white/15 px-2 text-[10px] text-white hover:bg-white/25"
              )}
            >
              CRM
            </Link>
          ) : null}
        </div>

        {!loading && !matchedLead ? (
          <div className="bg-amber-50 px-3 py-1.5 text-center text-[11px] font-medium text-amber-900">
            Not in CRM — add a lead with this mobile to match
          </div>
        ) : null}

        {loading && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!loading && error && <p className="p-4 text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {campaigns ? (
              <LeadCampaignDropdown campaigns={campaigns} onSelect={jumpToCampaign} />
            ) : null}
            {!campaigns && events.length > 0 && (
              <div className="max-h-20 shrink-0 overflow-y-auto border-b border-black/5 bg-white/85 px-3 py-1.5">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Campaign events
                </p>
                {events.slice(0, 4).map((ev, idx) => (
                  <div
                    key={`${ev.wati_message_id || idx}-${ev.event_at}`}
                    className="flex flex-wrap items-center gap-1.5 py-0.5 text-[11px]"
                  >
                    <WatiStatusBadge status={ev.status} />
                    {ev.replied ? <span className="text-emerald-700">replied</span> : null}
                    <span className="text-muted-foreground">{formatWatiDateTime(ev.event_at)}</span>
                  </div>
                ))}
              </div>
            )}

            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto px-[18px] py-3"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc7' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              }}
            >
              {messages.length === 0 ? (
                <div className="mx-auto mt-10 max-w-[280px] rounded-lg bg-white/95 px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
                  {conversationError ||
                    "No WhatsApp messages loaded for this contact. Check WATI conversation history."}
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const outbound = msg.direction === "outbound";
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const newDay = !prev || dayKey(prev.created_at) !== dayKey(msg.created_at);
                  // Like WhatsApp: only the first bubble of a same-sender run gets a tail.
                  const showTail = newDay || !prev || prev.direction !== msg.direction;
                  return (
                    <div key={msg.id} data-msg-id={String(msg.id)}>
                      {newDay && msg.created_at ? (
                        <div className="my-3 flex justify-center">
                          <span className="rounded-lg bg-white/95 px-3 py-1 text-[12px] font-medium uppercase text-[#54656f] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                            {formatDayChip(msg.created_at)}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "flex w-full",
                          outbound ? "justify-end" : "justify-start",
                          showTail ? "mt-3" : "mt-[3px]",
                          // Flash the campaign picked in the dropdown.
                          highlightId === String(msg.id) &&
                            "rounded-xl bg-[#ffd27a]/40 transition-colors duration-700"
                        )}
                      >
                        <MessageBubble msg={msg} outbound={outbound} showTail={showTail} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-black/5 bg-[#f0f2f5] px-3 py-2.5">
              <div className="flex-1 rounded-full bg-white px-4 py-2 text-sm text-muted-foreground shadow-sm">
                View only — reply in WATI
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
