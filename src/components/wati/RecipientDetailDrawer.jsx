"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import axios from "@/axios";
import { buttonVariants } from "@/components/ui/button";
import WatiStatusBadge from "@/components/wati/WatiStatusBadge";
import { formatWatiDateTime } from "@/lib/watiFormatters";
import { cn } from "@/lib/utils";

const COLLAPSE_CHAR_LIMIT = 220;

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

function ExpandableText({ text, className }) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = text.length > COLLAPSE_CHAR_LIMIT;
  const visible =
    !needsCollapse || expanded ? text : `${text.slice(0, COLLAPSE_CHAR_LIMIT).trimEnd()}…`;

  return (
    <div className={className}>
      <p className="whitespace-pre-wrap break-words">{visible}</p>
      {needsCollapse ? (
        <button
          type="button"
          className="mt-1 text-[11px] font-semibold text-emerald-800 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

function MessageBubbleContent({ msg }) {
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
  const body =
    hasMedia && /^\[(Image|Video|Audio|Voice note|Document|Sticker|GIF|Attachment)\]$/i.test(bodyRaw)
      ? ""
      : bodyRaw;
  const showPlaceholder = !body && !hasMedia && !isTemplate && !headerMissing;

  return (
    <>
      {isTemplate && msg.template_name ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
          Template · {msg.template_name}
        </p>
      ) : null}
      {mt && mt !== "text" && !isTemplate ? (
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {mt.replace(/_/g, " ")}
        </p>
      ) : null}
      {headerMissing && !hasMedia ? (
        <div className="mb-1.5 rounded-md border border-dashed border-black/10 bg-black/[0.03] px-2.5 py-2 text-[11px] text-muted-foreground">
          Header image unavailable from WATI
        </div>
      ) : null}
      {hasMedia ? (
        <div className="mb-1.5">
          {mediaLoading ? (
            <div className="flex h-20 items-center justify-center rounded-md border border-black/10 bg-black/[0.03] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : mediaFailed || !resolved ? (
            isTemplate || headerMissing ? (
              <div className="rounded-md border border-dashed border-black/10 bg-black/[0.03] px-2.5 py-2 text-[11px] text-muted-foreground">
                Header image unavailable from WATI
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Media unavailable</p>
            )
          ) : mediaIsImage ? (
            <a href={resolved} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolved}
                alt={msg.media_caption || msg.template_name || "Attachment"}
                className="max-h-56 w-auto max-w-full rounded-md border border-black/10 object-contain bg-black/[0.03]"
              />
            </a>
          ) : mediaIsAudio ? (
            <audio controls preload="none" className="h-9 w-full max-w-[240px]">
              <source src={resolved} />
            </audio>
          ) : mediaIsVideo ? (
            <video
              controls
              preload="metadata"
              className="max-h-56 w-auto max-w-full rounded-md border border-black/10"
            >
              <source src={resolved} />
            </video>
          ) : (
            <a
              href={resolved}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-black/[0.06]"
            >
              Open attachment
            </a>
          )}
        </div>
      ) : null}
      {body ? <ExpandableText text={body} /> : null}
      {showPlaceholder ? (
        <p className="whitespace-pre-wrap break-words text-muted-foreground">—</p>
      ) : null}
      {buttons.length > 0 ? (
        <div className="mt-1.5 space-y-1 border-t border-black/5 pt-1.5">
          {buttons.map((label) => (
            <div
              key={label}
              className="rounded-md border border-emerald-700/20 bg-white/70 px-2 py-1 text-center text-[11px] font-medium text-emerald-900"
            >
              {label}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
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

  const activity = data?.activity;
  const history = data?.history;
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

        {!matchedLead ? (
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
            {events.length > 0 && (
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
              className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
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
                messages.map((msg) => {
                  const outbound = msg.direction === "outbound";
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex w-full", outbound ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-lg px-2.5 py-1.5 text-[13.5px] leading-snug shadow-sm",
                          outbound
                            ? "rounded-tr-none bg-[#d9fdd3] text-foreground"
                            : "rounded-tl-none bg-white text-foreground"
                        )}
                      >
                        <MessageBubbleContent msg={msg} />
                        <p className="mt-1 text-right text-[10px] text-muted-foreground">
                          {formatWatiDateTime(msg.created_at)}
                          {msg.status ? ` · ${msg.status}` : ""}
                        </p>
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
