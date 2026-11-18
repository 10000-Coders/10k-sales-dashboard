"use client";

import { useMemo } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { STUDENT_CHART_COLORS } from "@/components/ui/chart-pie";
import { formatWatiNumber } from "@/lib/watiFormatters";

/** Same palette order as Students enrollment donuts. */
const ENGAGEMENT_SLICES = [
  { key: "sent", label: "Sent", color: STUDENT_CHART_COLORS[0] },
  { key: "delivered", label: "Delivered", color: STUDENT_CHART_COLORS[1] },
  { key: "read", label: "Read", color: STUDENT_CHART_COLORS[2] },
  { key: "replied", label: "Replied", color: STUDENT_CHART_COLORS[3] },
  { key: "failed", label: "Failed", color: STUDENT_CHART_COLORS[4] },
];

const OUTCOME_SLICES = [
  { key: "interested", label: "Interested", color: STUDENT_CHART_COLORS[0] },
  { key: "not_interested", label: "Not Interested", color: STUDENT_CHART_COLORS[1] },
  { key: "booked_demo", label: "Book a demo", color: STUDENT_CHART_COLORS[2] },
  { key: "other", label: "Other", color: STUDENT_CHART_COLORS[3] },
];

function pct(part, total) {
  if (!total) return 0;
  return Math.round((Number(part) / Number(total)) * 1000) / 10;
}

function buildSeries(defs, values) {
  return defs.map((d) => ({
    ...d,
    name: d.label,
    value: Number(values?.[d.key]) || 0,
    fill: `var(--color-${d.key})`,
  }));
}

function buildChartConfig(defs) {
  const config = { value: { label: "Count" } };
  for (const d of defs) {
    config[d.key] = { label: d.label, color: d.color };
  }
  return config;
}

function RightLegend({ series, total }) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
      {series.map((seg) => (
        <li key={seg.key} className="flex items-baseline gap-2 text-sm">
          <span
            className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: seg.color }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-foreground">{seg.label}</span>
          <span className="shrink-0 font-semibold tabular-nums text-foreground">
            {formatWatiNumber(seg.value)}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            ({pct(seg.value, total)}%)
          </span>
        </li>
      ))}
    </ul>
  );
}

function DonutCard({
  title,
  description,
  series,
  chartConfig,
  centerTotal,
  centerLabel,
  loading,
  emptyMessage,
}) {
  const sliceSum = series.reduce((sum, s) => sum + s.value, 0);
  const pctBase = Number(centerTotal) > 0 ? Number(centerTotal) : sliceSum;
  const hasData = series.some((s) => s.value > 0);
  const chartData = series.filter((s) => s.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading chart…</p>
        ) : !hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {emptyMessage || "No data for this campaign."}
          </p>
        ) : (
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[180px] w-[180px] shrink-0 sm:mx-0"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="key"
                      className="min-w-[10rem] gap-2"
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={1.5}
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                        return null;
                      }
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold tabular-nums"
                          >
                            {formatWatiNumber(centerTotal)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            {centerLabel}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <RightLegend series={series} total={pctBase || 1} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_CENTER = {
  sent: { key: "sent", label: "Sent" },
  delivered: { key: "delivered", label: "Delivered" },
  read: { key: "read", label: "Read" },
  replied: { key: "replied", label: "Replied" },
  failed: { key: "failed", label: "Failed" },
};

function engagementCenter(metrics, messageStatus) {
  const statusKey = String(messageStatus || "").toLowerCase();
  const centerDef = STATUS_CENTER[statusKey] || STATUS_CENTER.sent;
  let centerTotal = Number(metrics?.[centerDef.key]) || 0;
  if (statusKey && centerTotal <= 0) {
    centerTotal = Number(metrics?.recipients) || 0;
  }
  return { centerTotal, centerLabel: centerDef.label };
}

export default function CampaignReachSummary({
  metrics,
  loading,
  messageStatus = "",
  className = "",
}) {
  const engagementConfig = useMemo(() => buildChartConfig(ENGAGEMENT_SLICES), []);
  const outcomeConfig = useMemo(() => buildChartConfig(OUTCOME_SLICES), []);

  const engagement = buildSeries(ENGAGEMENT_SLICES, metrics);
  const { centerTotal: engagementTotal, centerLabel: engagementLabel } = engagementCenter(
    metrics,
    messageStatus
  );

  const outcomeSource = metrics?.outcome_metrics || {};
  const outcomes = buildSeries(OUTCOME_SLICES, outcomeSource);
  const replied =
    Number(metrics?.replied) ||
    outcomes.reduce((sum, s) => sum + s.value, 0) ||
    0;

  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${className}`.trim()}>
      <DonutCard
        title="Engagement"
        description="Message delivery funnel"
        series={engagement}
        chartConfig={engagementConfig}
        centerTotal={engagementTotal}
        centerLabel={engagementLabel}
        loading={loading}
        emptyMessage="No engagement data for this campaign."
      />
      <DonutCard
        title="Outcomes"
        description="Agent response outcomes"
        series={outcomes}
        chartConfig={outcomeConfig}
        centerTotal={replied}
        centerLabel="Replied"
        loading={loading}
        emptyMessage="No reply outcomes yet."
      />
    </div>
  );
}
