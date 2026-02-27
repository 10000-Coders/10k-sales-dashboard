"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const ACTIVITY_COLORS = {
  calls: "hsl(24, 95%, 53%)",
  whatsapp: "#25D366",
};

/** Single person: activities by type (bar or pie) — Call & WhatsApp only */
export function ActivityTypeChart({ data }) {
  const chartData = [
    { name: "Calls", value: data?.calls ?? 0, fill: ACTIVITY_COLORS.calls },
    { name: "WhatsApp", value: data?.whatsapp ?? 0, fill: ACTIVITY_COLORS.whatsapp },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No activity breakdown for this period.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Team: one bar per person (activities total or leads created) */
export function TeamComparisonChart({ byPerson, metric = "activities_total", title }) {
  const chartData = (byPerson || []).map((p) => ({
    name: p.sales_person_name?.split(" ")[0] || "—",
    fullName: p.sales_person_name,
    role: p.role,
    value: p[metric] ?? 0,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={72} />
        <Tooltip
          formatter={(value) => [value, title || metric]}
          labelFormatter={(_, payload) => payload[0]?.payload?.fullName}
        />
        <Bar dataKey="value" name={title || "Count"} fill="hsl(24, 95%, 53%)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single person: pie of activity types — Call & WhatsApp only */
export function ActivityTypePie({ data }) {
  const chartData = [
    { name: "Calls", value: data?.calls ?? 0, fill: ACTIVITY_COLORS.calls },
    { name: "WhatsApp", value: data?.whatsapp ?? 0, fill: ACTIVITY_COLORS.whatsapp },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No activity for this period.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [value, "Count"]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
