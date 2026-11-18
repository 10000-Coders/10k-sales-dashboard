"use client";

import { Check, CheckCheck, Eye, MessageCircleReply, Send, XCircle, RefreshCw, Layers } from "lucide-react";
import { formatWatiNumber } from "@/lib/watiFormatters";

const TILES = [
  { key: "sent", label: "Sent", Icon: Check },
  { key: "delivered", label: "Delivered", Icon: CheckCheck },
  { key: "read", label: "Read", Icon: Eye },
  { key: "replied", label: "Replied", Icon: MessageCircleReply },
  { key: "sending", label: "Sending", Icon: Send },
  { key: "failed", label: "Failed", Icon: XCircle },
  { key: "processing", label: "Processing", Icon: RefreshCw },
  { key: "queued", label: "Queued", Icon: Layers },
];

export default function CampaignOverviewMetricTiles({ metrics, loading, className = "" }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {TILES.map(({ key, label, Icon }) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm"
        >
          <div className="min-w-0">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? "…" : formatWatiNumber(metrics?.[key])}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
      ))}
    </div>
  );
}
