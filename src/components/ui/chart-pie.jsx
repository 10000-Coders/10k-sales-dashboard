"use client";

import { useMemo } from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export const STUDENT_CHART_COLORS = [
  "#FCA47C",
  "#23CED9",
  "#097C87",
  "#F9D779",
  "#A1CCAA",
];

/**
 * @param {{ key: string, label: string, value: number }[]} items
 */
export function buildChartSeries(items) {
  const chartConfig = { value: { label: "Students" } };
  const chartData = (items || []).map((item, index) => {
    const color = STUDENT_CHART_COLORS[index % STUDENT_CHART_COLORS.length];
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
