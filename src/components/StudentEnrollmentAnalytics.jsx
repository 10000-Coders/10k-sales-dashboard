"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import axios from "@/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartPie,
  ChartPieLegend,
  buildChartSeries,
} from "@/components/ui/chart-pie";
import { getInquirySourceLabel } from "@/constants/leadInquirySource";

function slugKey(value, fallback = "unknown") {
  const raw = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return raw || fallback;
}

function mapSourceRows(groups = []) {
  return groups.map((row, index) => {
    const source = row.lead__source;
    const label = source ? getInquirySourceLabel(source) || source : "Unknown";
    return {
      key: `${slugKey(source || "unknown")}_${index}`,
      label,
      value: Number(row.count) || 0,
    };
  });
}

function mapSalesPersonRows(groups = []) {
  return groups.map((row, index) => {
    const name = row.sales_person__name || "Unassigned";
    const id = row.sales_person_id ?? row.sales_person ?? "none";
    return {
      key: `sp_${id}_${index}`,
      label: name,
      value: Number(row.count) || 0,
    };
  });
}

function AnalyticsDonutCard({ title, items, total, loading }) {
  const { chartData, chartConfig } = useMemo(
    () => buildChartSeries(items),
    [items]
  );
  const displayTotal =
    total ?? chartData.reduce((acc, row) => acc + row.value, 0);

  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold sm:text-lg">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
        {loading ? (
          <div className="flex min-h-[220px] w-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mx-auto w-full shrink-0 sm:mx-0 sm:w-[44%] sm:max-w-[220px]">
              <ChartPie
                data={chartData}
                config={chartConfig}
                totalLabel="Total Students"
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <ChartPieLegend data={chartData} total={displayTotal} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Enrollment analytics for the Students page.
 * Uses the same filter params as GET /students/ so charts match the table.
 */
export default function StudentEnrollmentAnalytics({
  salesPersonId = "",
  salesBatchId = "",
  leadSources = [],
  dateFrom = "",
  dateTo = "",
  search = "",
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [sourceItems, setSourceItems] = useState([]);
  const [salesItems, setSalesItems] = useState([]);

  const sourcesKey = Array.isArray(leadSources) ? leadSources.join(",") : "";

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (salesPersonId) params.set("sales_person", salesPersonId);
      if (salesBatchId) params.set("sales_batch", salesBatchId);
      if (sourcesKey) params.set("lead_source", sourcesKey);
      if (dateFrom) params.set("created_after", dateFrom);
      if (dateTo) params.set("created_before", dateTo);
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : "";

      const [sourceRes, salesRes] = await Promise.all([
        axios.get(`/students/group-by-lead-source/${suffix}`),
        axios.get(`/students/group-by-sales-person/${suffix}`),
      ]);

      const sourceData = sourceRes.data || {};
      const salesData = salesRes.data || {};

      setSourceTotal(Number(sourceData.total_students) || 0);
      setSalesTotal(Number(salesData.total_students) || 0);
      setSourceItems(mapSourceRows(sourceData.groups || []));
      setSalesItems(mapSalesPersonRows(salesData.groups || []));
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to load student analytics."
      );
      setSourceItems([]);
      setSalesItems([]);
      setSourceTotal(0);
      setSalesTotal(0);
    } finally {
      setLoading(false);
    }
  }, [salesPersonId, salesBatchId, sourcesKey, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <AnalyticsDonutCard
          title="By Inquiry Source"
          items={sourceItems}
          total={sourceTotal}
          loading={loading}
        />
        <AnalyticsDonutCard
          title="By Sales Person"
          items={salesItems}
          total={salesTotal}
          loading={loading}
        />
      </div>
    </div>
  );
}
