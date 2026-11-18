"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWatiNumber } from "@/lib/watiFormatters";

const DELIVERY_COLORS = {
  Sent: "hsl(24, 95%, 50%)",
  Delivered: "hsl(24, 95%, 60%)",
  Read: "hsl(24, 80%, 70%)",
  Failed: "hsl(0, 84%, 60%)",
};

const RESPONSE_COLORS = {
  Replied: "#16a34a",
  "No response": "#ca8a04",
  Pending: "#94a3b8",
};

function buildDeliveryData(metrics) {
  return [
    { name: "Sent", value: Number(metrics?.sent) || 0, fill: DELIVERY_COLORS.Sent },
    {
      name: "Delivered",
      value: Number(metrics?.delivered) || 0,
      fill: DELIVERY_COLORS.Delivered,
    },
    { name: "Read", value: Number(metrics?.read) || 0, fill: DELIVERY_COLORS.Read },
    { name: "Failed", value: Number(metrics?.failed) || 0, fill: DELIVERY_COLORS.Failed },
  ];
}

function buildResponseData(metrics) {
  const recipients = Number(metrics?.recipients) || 0;
  const replied = Number(metrics?.replied) || 0;
  const noResponse = Number(metrics?.no_response) || 0;
  const pending = Math.max(0, recipients - replied - noResponse);
  return [
    { name: "Replied", value: replied, fill: RESPONSE_COLORS.Replied },
    { name: "No response", value: noResponse, fill: RESPONSE_COLORS["No response"] },
    { name: "Pending", value: pending, fill: RESPONSE_COLORS.Pending },
  ].filter((d) => d.value > 0);
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold">{item.name || item.payload?.name}</p>
      <p className="text-muted-foreground tabular-nums">{formatWatiNumber(item.value)}</p>
    </div>
  );
}

export default function CampaignAnalyticsCharts({ metrics, loading }) {
  const delivery = buildDeliveryData(metrics);
  const response = buildResponseData(metrics);
  const hasDelivery = delivery.some((d) => d.value > 0);
  const hasResponse = response.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivery funnel</CardTitle>
          <CardDescription>How messages progressed for this selection</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading charts…</p>
          ) : !hasDelivery ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No delivery data for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={delivery} margin={{ top: 12, right: 12, left: 4, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                  {delivery.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Response mix</CardTitle>
          <CardDescription>Replies vs no response vs still pending</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading charts…</p>
          ) : !hasResponse ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No response data for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={response}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name} ${Math.round((percent || 0) * 100)}%`
                  }
                >
                  {response.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
