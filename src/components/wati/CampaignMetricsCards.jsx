import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWatiNumber } from "@/lib/watiFormatters";

const DEFAULT_METRICS = [
  { key: "recipients", label: "Recipients" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "read", label: "Read" },
  { key: "failed", label: "Failed" },
  { key: "replied", label: "Replied" },
  { key: "no_response", label: "No response" },
];

export default function CampaignMetricsCards({
  metrics,
  loading,
  includeReplyCount = false,
  className = "",
}) {
  const items = includeReplyCount
    ? [
        ...DEFAULT_METRICS.slice(0, 6),
        { key: "reply_count", label: "Reply count" },
        DEFAULT_METRICS[6],
      ]
    : DEFAULT_METRICS;

  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 ${className}`}>
      {items.map(({ key, label }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wide">
              {label}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums tracking-tight">
              {loading ? "…" : formatWatiNumber(metrics?.[key])}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
