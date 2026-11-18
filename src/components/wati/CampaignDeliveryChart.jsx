import { ratePercent } from "@/lib/watiFormatters";

const BARS = [
  { key: "sent", label: "Sent", className: "bg-primary" },
  { key: "delivered", label: "Delivered", className: "bg-primary/90" },
  { key: "read", label: "Read", className: "bg-primary/80" },
  { key: "failed", label: "Failed", className: "bg-destructive" },
  { key: "replied", label: "Replied", className: "bg-emerald-600" },
];

export default function CampaignDeliveryChart({ metrics }) {
  const base = Math.max(Number(metrics?.recipients) || 0, Number(metrics?.sent) || 1, 1);

  return (
    <div className="flex h-40 items-end gap-4 rounded-xl border border-border/60 bg-muted/20 px-6 py-4">
      {BARS.map(({ key, label, className }) => {
        const value = Number(metrics?.[key]) || 0;
        const pct = Math.max(4, ratePercent(value, base));
        return (
          <div key={key} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={`w-full max-w-[48px] rounded-t-md ${className}`}
              style={{ height: `${pct}%`, minHeight: value ? 8 : 4 }}
              title={`${label}: ${value}`}
            />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
