"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, ExternalLink, Calendar, RefreshCw } from "lucide-react";
import axios from "@/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchLeadWatiActivity } from "@/redux/features/wati/watiSlice";
import { formatWatiDate, formatWatiDateTime } from "@/lib/watiFormatters";
import { cn } from "@/lib/utils";

const ALL = "all";

function isProxiedMediaUrl(url) {
  return typeof url === "string" && url.startsWith("/wati/");
}

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

function toDayKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatClock(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatShortDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function outcomeCardTone(outcome) {
  switch (String(outcome || "").toLowerCase()) {
    case "interested":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "callback":
      return "border-primary/25 bg-primary/10 text-primary";
    case "not_interested":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "no_reply":
      return "border-dashed border-border bg-muted/30 text-muted-foreground";
    case "failed":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted/40 text-foreground";
  }
}

function OutcomeBadge({ outcome, label, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        outcomeCardTone(outcome),
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label || "—"}
    </span>
  );
}

function HeaderMedia({ url, missing }) {
  const { resolved, loading, failed } = useResolvedMediaUrl(url || "");
  if (!url && missing) {
    return (
      <div className="rounded-md border border-dashed border-black/15 bg-orange-50 px-3 py-6 text-center text-[11px] text-muted-foreground">
        Template image unavailable from WATI
      </div>
    );
  }
  if (!url) return null;
  if (loading) {
    return (
      <div className="flex h-28 items-center justify-center rounded-md border border-black/10 bg-black/[0.03]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (failed || !resolved) {
    return (
      <div className="rounded-md border border-dashed border-black/15 bg-orange-50 px-3 py-6 text-center text-[11px] text-muted-foreground">
        Template image unavailable from WATI
      </div>
    );
  }
  return (
    <a href={resolved} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt="Campaign header"
        className="max-h-52 w-full rounded-md object-cover"
      />
    </a>
  );
}

function buildSummary(campaigns) {
  const total = campaigns.length;
  const read = campaigns.filter(
    (c) => c.read_at || c.replied || String(c.status || "").toLowerCase() === "read"
  ).length;
  const replied = campaigns.filter((c) => c.replied).length;
  const button = campaigns.filter((c) => c.replied && c.reply_type === "button").length;
  const typed = campaigns.filter((c) => c.replied && c.reply_type === "typed").length;
  const deliveredOnly = campaigns.filter(
    (c) =>
      c.delivered_at &&
      !c.read_at &&
      !c.replied &&
      String(c.status || "").toLowerCase() !== "read"
  ).length;
  const latest = campaigns[0] || null;
  const dates = campaigns.map((c) => c.event_at || c.sent_at).filter(Boolean);
  return {
    campaigns_received: total,
    read,
    read_of: total,
    replied,
    replied_of: total,
    replied_button: button,
    replied_typed: typed,
    delivered_not_opened: deliveredOnly,
    latest_response: latest?.outcome_label,
    latest_response_outcome: latest?.outcome,
    latest_campaign_name: latest?.campaign_name,
    date_from: dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null,
    date_to: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null,
  };
}

function buildOutcomeCards(campaigns) {
  const buckets = new Map();
  for (const c of campaigns) {
    const key = c.outcome || "no_reply";
    const label = c.outcome_label || "No reply";
    const date = c.event_at || c.replied_at || c.sent_at;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { outcome: key, label, count: 1, latestDate: date || null });
    } else {
      existing.count += 1;
      if (date && (!existing.latestDate || date > existing.latestDate)) {
        existing.latestDate = date;
      }
    }
  }
  const order = ["interested", "callback", "not_interested", "no_reply", "failed", "replied", "button"];
  return [...buckets.values()].sort((a, b) => {
    const ai = order.indexOf(a.outcome);
    const bi = order.indexOf(b.outcome);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return b.count - a.count;
  });
}

function AllCampaignsView({ campaigns, summary, onSelectCampaign }) {
  const cards = buildOutcomeCards(campaigns);
  const dateSpan =
    summary.date_from || summary.date_to
      ? `${formatWatiDate(summary.date_from)} – ${formatWatiDate(summary.date_to)}`
      : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground">Campaigns received</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {summary.campaigns_received}
          </p>
          {dateSpan ? <p className="mt-2 text-[11px] text-muted-foreground">{dateSpan}</p> : null}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground">Read</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {summary.read}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              of {summary.read_of}
            </span>
          </p>
          {summary.delivered_not_opened > 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {summary.delivered_not_opened} delivered, not opened
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">Opened on WhatsApp</p>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground">Replied</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {summary.replied}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              of {summary.replied_of}
            </span>
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {summary.replied_button || 0} button taps, {summary.replied_typed || 0} typed
          </p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
          <p className="text-[11px] font-medium text-primary">Latest response</p>
          <div className="mt-3">
            <OutcomeBadge
              outcome={summary.latest_response_outcome}
              label={summary.latest_response || "—"}
            />
          </div>
          {summary.latest_campaign_name ? (
            <p className="mt-3 truncate text-[11px] text-muted-foreground">
              {formatWatiDate(summary.date_to)} – {summary.latest_campaign_name}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Responses across all campaigns
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <button
              key={card.outcome}
              type="button"
              onClick={() => {
                const match = campaigns.find((c) => c.outcome === card.outcome);
                if (match) onSelectCampaign?.(match.broadcast_id);
              }}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left shadow-sm transition-colors hover:opacity-95",
                outcomeCardTone(card.outcome)
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{card.label}</span>
                <span className="text-2xl font-semibold tabular-nums">{card.count}</span>
              </div>
              <p className="mt-3 text-[11px] opacity-80">{formatWatiDate(card.latestDate)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliveryStep({ label, at, done }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px]",
          done
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-border bg-muted text-transparent"
        )}
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-medium", done ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground">{at ? formatClock(at) : "—"}</p>
      </div>
    </div>
  );
}

function SingleCampaignView({ camp, leadName }) {
  const buttons = Array.isArray(camp.buttons) ? camp.buttons : [];
  const replyText = camp.reply_text || camp.reply_choice || "";
  const sentAt = camp.sent_at || camp.event_at;
  const dateChip = formatWatiDate(sentAt || camp.replied_at);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground">Sent</p>
          <p className="mt-1.5 text-sm font-semibold">{formatShortDateTime(sentAt)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground">Delivered</p>
          <p
            className={cn(
              "mt-1.5 text-sm font-semibold",
              camp.delivered_at || camp.read_at || camp.replied ? "text-emerald-700" : "text-foreground"
            )}
          >
            {camp.delivered_at || camp.read_at || camp.replied ? "Yes" : "—"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Reached the lead&apos;s WhatsApp</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground">Read</p>
          <p className="mt-1.5 text-sm font-semibold">
            {camp.read_at || camp.replied ? formatClock(camp.read_at || camp.replied_at) : "—"}
          </p>
          {(camp.read_at || camp.replied) && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Opened on {formatWatiDate(camp.read_at || camp.replied_at)}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 shadow-sm">
          <p className="text-[11px] font-medium text-primary">Response</p>
          <div className="mt-2">
            <OutcomeBadge outcome={camp.outcome} label={camp.outcome_label || "No reply"} />
          </div>
          {camp.replied ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {camp.reply_type === "button" ? "Button tap" : "Typed reply"}
              {camp.replied_at ? ` · ${formatClock(camp.replied_at)}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">No reply yet</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-border/50 bg-[#efeae2] p-4 shadow-sm">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Conversation in this campaign
          </p>
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-black/10 px-3 py-1 text-[11px] font-medium text-zinc-700">
              {dateChip}
            </span>
          </div>

          <div className="mb-3 flex justify-end">
            <div className="max-w-[92%] rounded-2xl rounded-tr-md bg-[#dcf8c6] px-3 py-2.5 text-zinc-900 shadow-sm">
              <p className="mb-1.5 text-[10px] font-semibold text-emerald-900/70">
                Template{camp.template_name ? ` · ${camp.template_name}` : ""}
              </p>
              <HeaderMedia url={camp.header_media_url} missing={camp.header_media_missing} />
              {camp.body ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-snug">
                  {camp.body}
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-zinc-500">Message body unavailable.</p>
              )}
              {camp.footer ? (
                <p className="mt-1 text-[11px] text-zinc-600">{camp.footer}</p>
              ) : null}
              {buttons.length > 0 ? (
                <div className="mt-2 space-y-1 border-t border-black/5 pt-2">
                  {buttons.map((label) => (
                    <div
                      key={label}
                      className="rounded-md border border-emerald-700/20 bg-white/80 px-2 py-1.5 text-center text-[11px] font-medium text-emerald-900"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="mt-1.5 text-right text-[10px] text-zinc-600">
                {formatClock(sentAt)}
                {(camp.delivered_at || camp.read_at || camp.replied) && (
                  <span className="ml-1 text-sky-700">✓✓</span>
                )}
              </p>
            </div>
          </div>

          {(camp.read_at || camp.replied) && (
            <div className="mb-3 flex justify-center">
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-zinc-700 shadow-sm">
                Read by lead · {formatClock(camp.read_at || camp.replied_at)}
              </span>
            </div>
          )}

          {camp.replied && replyText ? (
            <div className="mb-3 flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-black/5 bg-white px-3 py-2.5 shadow-sm">
                <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                  {leadName || "Lead"}
                </p>
                <p className="whitespace-pre-wrap break-words text-[13px] text-zinc-900">
                  {replyText}
                </p>
                <p className="mt-1.5 text-[10px] text-zinc-500">{formatClock(camp.replied_at)}</p>
              </div>
            </div>
          ) : null}

          {camp.replied && camp.outcome_label ? (
            <div className="flex justify-center">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                Marked as {camp.outcome_label}
                {camp.replied_at ? ` · ${formatClock(camp.replied_at)}` : ""}
              </span>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Campaign details
            </p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Campaign</dt>
                <dd className="max-w-[60%] text-right font-medium">
                  {camp.campaign_name || camp.broadcast_id}
                </dd>
              </div>
              {camp.template_name ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Template</dt>
                  <dd className="max-w-[60%] text-right font-medium">{camp.template_name}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">{camp.campaign_type || "Marketing"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Sent on</dt>
                <dd className="text-right font-medium">{formatWatiDateTime(sentAt)}</dd>
              </div>
            </dl>
            <Link
              href={`/wati/campaigns/${encodeURIComponent(camp.broadcast_id)}`}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline"
            >
              Open campaign <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Delivery
            </p>
            <div className="space-y-3">
              <DeliveryStep label="Sent" at={sentAt} done={Boolean(sentAt)} />
              <DeliveryStep
                label="Delivered"
                at={camp.delivered_at}
                done={Boolean(camp.delivered_at || camp.read_at || camp.replied)}
              />
              <DeliveryStep
                label="Read"
                at={camp.read_at}
                done={Boolean(camp.read_at || camp.replied)}
              />
              <DeliveryStep
                label="Replied"
                at={camp.replied_at}
                done={Boolean(camp.replied)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
              What the dashboard did
            </p>
            <p className="text-sm text-foreground">
              {camp.replied
                ? `Marked as ${camp.outcome_label || "Replied"} from the reply.`
                : camp.outcome === "failed"
                  ? "Delivery failed for this campaign."
                  : "No reply recorded yet — no dashboard outcome applied."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadWatiActivityCard({ leadId }) {
  const dispatch = useDispatch();
  const { loading, error, data } = useSelector((state) => state.wati.leadActivity);
  const [selectedId, setSelectedId] = useState(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [allTime, setAllTime] = useState(true);

  useEffect(() => {
    if (leadId) dispatch(fetchLeadWatiActivity({ leadId }));
  }, [dispatch, leadId]);

  useEffect(() => {
    setSelectedId(ALL);
    setAllTime(true);
    setDateFrom("");
    setDateTo("");
  }, [leadId, data?.lead_id]);

  const campaigns = data?.campaigns || [];

  const dateFiltered = useMemo(() => {
    if (allTime || (!dateFrom && !dateTo)) return campaigns;
    return campaigns.filter((c) => {
      const key = toDayKey(c.event_at || c.sent_at);
      if (!key) return true;
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
      return true;
    });
  }, [campaigns, allTime, dateFrom, dateTo]);

  const summary = useMemo(() => buildSummary(dateFiltered), [dateFiltered]);

  const selectedCampaign = useMemo(() => {
    if (selectedId === ALL) return null;
    return dateFiltered.find((c) => c.broadcast_id === selectedId) || null;
  }, [dateFiltered, selectedId]);

  useEffect(() => {
    if (selectedId === ALL) return;
    if (!dateFiltered.some((c) => c.broadcast_id === selectedId)) {
      setSelectedId(ALL);
    }
  }, [dateFiltered, selectedId]);

  // Lazy-enrich template/conversation body only when a campaign is opened.
  useEffect(() => {
    if (!leadId || selectedId === ALL || loading || data?.enriched) return;
    dispatch(fetchLeadWatiActivity({ leadId, refresh: true }));
  }, [dispatch, leadId, selectedId, loading, data?.enriched]);

  const isAll = selectedId === ALL;
  const showBlockingLoader = loading && campaigns.length === 0;
  const enriching = loading && campaigns.length > 0;
  const headerSubtitle = isAll
    ? "Totals across every WATI campaign this lead received. Pick a campaign in the dropdown to see its messages."
    : [
        selectedCampaign?.campaign_name,
        selectedCampaign?.campaign_type,
        selectedCampaign?.template_name ? `Template · ${selectedCampaign.template_name}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Campaign conversation for this lead.";

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl">WATI campaigns</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">{headerSubtitle}</CardDescription>
            {enriching ? (
              <p className="mt-1 text-[11px] text-muted-foreground">Loading message details…</p>
            ) : null}
          </div>
          <div className="flex w-full max-w-sm items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label
                htmlFor="lead-wati-campaign-select"
                className="text-[11px] font-medium text-muted-foreground"
              >
                Campaign
              </label>
              <select
                id="lead-wati-campaign-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loading || campaigns.length === 0}
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value={ALL}>All campaigns ({dateFiltered.length})</option>
                {dateFiltered.map((camp) => (
                  <option key={camp.broadcast_id} value={camp.broadcast_id}>
                    {formatWatiDate(camp.event_at || camp.sent_at)} –{" "}
                    {camp.campaign_name || camp.broadcast_id}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              title="Refresh from WATI"
              disabled={!leadId || loading}
              onClick={() => leadId && dispatch(fetchLeadWatiActivity({ leadId, refresh: true }))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", (loading || enriching) && "animate-spin")} />
            </button>
          </div>
        </div>

        {isAll && campaigns.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor="wati-from">
                From
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="wati-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setAllTime(false);
                  }}
                  className="h-9 rounded-lg border border-border/60 bg-background pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor="wati-to">
                To
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="wati-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setAllTime(false);
                  }}
                  className="h-9 rounded-lg border border-border/60 bg-background pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAllTime(true);
                setDateFrom("");
                setDateTo("");
              }}
              className={cn(
                "h-9 rounded-lg border px-3 text-xs font-medium",
                allTime
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              All time
            </button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {showBlockingLoader && (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!showBlockingLoader && error && <p className="text-sm text-destructive">{error}</p>}

        {!showBlockingLoader && !error && campaigns.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No WATI campaign activity for this lead yet.
          </p>
        )}

        {!showBlockingLoader && !error && campaigns.length > 0 && dateFiltered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No campaigns in the selected date range.
          </p>
        )}

        {!showBlockingLoader && !error && dateFiltered.length > 0 && isAll && (
          <AllCampaignsView
            campaigns={dateFiltered}
            summary={summary}
            onSelectCampaign={setSelectedId}
          />
        )}

        {!showBlockingLoader && !error && selectedCampaign && (
          <SingleCampaignView camp={selectedCampaign} leadName={data?.lead_name} />
        )}

        {!showBlockingLoader && data?.conversation_error ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Conversation enrich note: {data.conversation_error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
