"use client";

import { useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/** Bright Google/Material-style palette — one distinct color per category. */
export const STUDENT_CHART_COLORS = [
  "#4285F4", // Google Blue
  "#EA4335", // Google Red
  "#FBBC04", // Google Yellow
  "#34A853", // Google Green
  "#FF6D01", // Orange
  "#46BDC6", // Teal
  "#7BAAF7", // Light Blue
  "#F07B72", // Coral
  "#FCD04F", // Amber
  "#71C287", // Light Green
  "#A142F4", // Purple
  "#FF8A80", // Soft Red
  "#00ACC1", // Cyan
  "#F4B400", // Gold
  "#0F9D58", // Deep Green
  "#DB4437", // Brick
  "#AB47BC", // Violet
  "#5C6BC0", // Indigo
  "#26A69A", // Seafoam
  "#EF6C00", // Deep Orange
  "#EC407A", // Pink
  "#29B6F6", // Sky
  "#9CCC65", // Lime
  "#8D6E63", // Brown
  "#78909C", // Blue Grey
  "#C0CA33", // Chartreuse
  "#FF7043", // Deep Coral
  "#26C6DA", // Bright Cyan
  "#7E57C2", // Deep Purple
  "#66BB6A", // Mid Green
];

/**
 * Pick a unique color for each index. Uses the fixed palette first, then
 * evenly spaced HSL hues so two categories never share the same color.
 */
export function colorForIndex(index, total = 0) {
  if (index < STUDENT_CHART_COLORS.length) {
    return STUDENT_CHART_COLORS[index];
  }
  const n = Math.max(total, index + 1);
  const hue = Math.round((360 * index) / n);
  return `hsl(${hue} 72% 48%)`;
}

/**
 * @param {{ key: string, label: string, value: number }[]} items
 */
export function buildChartSeries(items) {
  const list = items || [];
  const chartConfig = { value: { label: "Students" } };
  const chartData = list.map((item, index) => {
    const color = colorForIndex(index, list.length);
    chartConfig[item.key] = {
      label: item.label,
      color,
    };
    return {
      key: item.key,
      label: item.label,
      value: Number(item.value) || 0,
      fill: `var(--color-${item.key})`,
      color,
    };
  });
  return { chartData, chartConfig };
}

export function ChartPie({
  data = [],
  config = {},
  totalLabel = "Total Students",
  className,
  innerRadius = 65,
  outerRadius = 95,
}) {
  const total = useMemo(
    () => data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0),
    [data]
  );

  if (!data.length) {
    return (
      <div
        className={cn(
          "flex aspect-square max-h-[260px] min-h-[220px] w-full items-center justify-center text-sm text-muted-foreground",
          className
        )}
      >
        No data
      </div>
    );
  }

  return (
    <ChartContainer
      config={config}
      className={cn(
        "mx-auto aspect-square max-h-[260px] min-h-[220px] w-full",
        className
      )}
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              nameKey="key"
              className="min-w-[10rem] gap-2 [&_div.flex-1]:items-center [&_div.flex-1]:gap-4 [&>div]:gap-2"
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          strokeWidth={2}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
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
                      {total.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-muted-foreground text-xs"
                    >
                      {totalLabel}
                    </tspan>
                  </text>
                );
              }
              return null;
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function ChartPieLegend({ data = [], total }) {
  const sum =
    total ?? data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

  if (!data.length) return null;

  return (
    <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
      {data.map((item) => {
        const value = Number(item.value) || 0;
        const pct = sum > 0 ? Math.round((value / sum) * 100) : 0;
        return (
          <li
            key={item.key}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              <span className="truncate text-foreground/90">{item.label}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="font-semibold tabular-nums text-foreground">
                {value.toLocaleString()}
              </span>
              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default ChartPie;
