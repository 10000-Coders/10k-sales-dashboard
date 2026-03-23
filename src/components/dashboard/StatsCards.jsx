"use client";

import { Loader2, Phone, MessageCircle, CheckCircle2, Clock, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const statItem = {
  leads: { icon: Users, accent: "bg-sky-500/10 text-sky-600 ring-sky-500/20" },
  activities: { icon: TrendingUp, accent: "bg-violet-500/10 text-violet-600 ring-violet-500/20" },
  calls: { icon: Phone, accent: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" },
  whatsapp: { icon: MessageCircle, accent: "bg-sky-500/10 text-sky-600 ring-sky-500/20" },
  verified: { icon: CheckCircle2, accent: "bg-green-500/10 text-green-600 ring-green-500/20" },
  pending: { icon: Clock, accent: "bg-amber-500/10 text-amber-600 ring-amber-500/20" },
};

function StatBox({ label, value, sub, icon: Icon, accentKey }) {
  const a = statItem[accentKey] || statItem.leads;
  return (
    <div
      className={cn(
        "group rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        "ring-1 ring-black/[0.02]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
          {sub != null && sub !== "" && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">₹ {sub}</p>
          )}
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
            a.accent
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

export function StatsCards({ stats, loading, error, onRetry }) {
  if (loading && !stats) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error && onRetry) {
    return (
      <p className="text-sm text-muted-foreground">
        Could not load your stats.{" "}
        <button type="button" onClick={onRetry} className="font-medium text-primary underline underline-offset-2 hover:no-underline">
          Try again
        </button>
      </p>
    );
  }
  if (error) {
    return <p className="text-sm text-muted-foreground">Could not load your stats.</p>;
  }
  if (!stats) {
    return <p className="text-sm text-muted-foreground">Could not load your stats.</p>;
  }

  const {
    leadsTotal,
    activitiesTotal,
    calls,
    whatsapp,
    verifiedPaymentCount,
    verifiedPaymentAmount,
    pendingPaymentCount,
    pendingPaymentAmount,
  } = stats;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatBox label="Leads" value={leadsTotal} icon={statItem.leads.icon} accentKey="leads" />
      <StatBox label="Activities" value={activitiesTotal} icon={statItem.activities.icon} accentKey="activities" />
      <StatBox label="Calls" value={calls} icon={statItem.calls.icon} accentKey="calls" />
      <StatBox label="WhatsApp" value={whatsapp} icon={statItem.whatsapp.icon} accentKey="whatsapp" />
      <StatBox
        label="Verified pay"
        value={verifiedPaymentCount}
        sub={Number(verifiedPaymentAmount).toLocaleString("en-IN")}
        icon={statItem.verified.icon}
        accentKey="verified"
      />
      <StatBox
        label="Pending pay"
        value={pendingPaymentCount}
        sub={Number(pendingPaymentAmount).toLocaleString("en-IN")}
        icon={statItem.pending.icon}
        accentKey="pending"
      />
    </div>
  );
}
