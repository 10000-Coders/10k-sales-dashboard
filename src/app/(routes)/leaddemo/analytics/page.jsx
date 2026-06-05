"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, ArrowLeft } from "lucide-react";
import withPrivateAuth from "@/components/withPrivateAuth";
import { useSalesPersons } from "@/hooks/useSalesData";
import {
  fetchLeadSourceAnalytics,
  selectLeadSourceAnalytics,
  selectLeadSourceAnalyticsError,
  selectLeadSourceAnalyticsLoading,
} from "@/redux/features/leads/leadsSlice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEAD_STATUS_PREFERRED_ORDER } from "@/constants/leadStatus";

function formatStatusLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function todayDateString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function LeadSourceAnalyticsPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userAuth?.user);
  const isManager = user?.role === "manager";
  const { persons } = useSalesPersons({ enabled: isManager });
  const analytics = useSelector(selectLeadSourceAnalytics);
  const loading = useSelector(selectLeadSourceAnalyticsLoading);
  const error = useSelector(selectLeadSourceAnalyticsError);

  const [fromDate, setFromDate] = useState(todayDateString());
  const [toDate, setToDate] = useState(todayDateString());
  const [salesPerson, setSalesPerson] = useState("");

  const resolvedSalesPerson = useMemo(() => {
    if (isManager) return salesPerson || "";
    return user?.id ? String(user.id) : "";
  }, [isManager, salesPerson, user?.id]);

  const selectedSalesPersonName = useMemo(() => {
    if (!resolvedSalesPerson) return "All counselors";
    if (!isManager && user?.name) return user.name;
    const found = persons.find((p) => String(p.id) === String(resolvedSalesPerson));
    return found?.name || `Sales Person #${resolvedSalesPerson}`;
  }, [resolvedSalesPerson, isManager, user?.name, persons]);

  const statusColumns = useMemo(() => {
    const preferredOrder = LEAD_STATUS_PREFERRED_ORDER;

    const statusSet = new Set();
    (analytics?.source_wise || []).forEach((item) => {
      Object.keys(item?.status_wise || {}).forEach((status) => statusSet.add(status));
    });

    const orderedPreferred = preferredOrder.filter((status) => statusSet.has(status));
    const remaining = Array.from(statusSet).filter((status) => !preferredOrder.includes(status));

    return [...orderedPreferred, ...remaining];
  }, [analytics?.source_wise]);

  const loadAnalytics = () => {
    dispatch(
      fetchLeadSourceAnalytics({
        fromDate,
        toDate,
        salesPersonId: resolvedSalesPerson || undefined,
      })
    );
  };

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Lead Source Analytics</CardTitle>
              <CardDescription>
                Source-wise lead count with status breakdown in table format.
              </CardDescription>
            </div>
            <Link href="/leads">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Leads
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground">Sales Person</label>
              <select
                value={isManager ? salesPerson : resolvedSalesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                disabled={!isManager}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm disabled:opacity-70"
              >
                <option value="">{isManager ? "All counselors" : selectedSalesPersonName}</option>
                {isManager &&
                  persons.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <Button
              onClick={loadAnalytics}
              disabled={loading || !fromDate || !toDate}
              className="h-9"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Filters
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error?.detail || "Failed to load analytics."}
            </p>
          ) : (
            <>
              <Card className="border-dashed">
                <CardContent className="py-5">
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-semibold">{analytics?.total_leads ?? 0}</p>
                </CardContent>
              </Card>

              {Array.isArray(analytics?.source_wise) && analytics.source_wise.length > 0 ? (
                <div className="w-full overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Source</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        {statusColumns.map((status) => (
                          <TableHead key={status} className="text-right whitespace-nowrap">
                            {formatStatusLabel(status)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.source_wise.map((item) => (
                        <TableRow key={item.source}>
                          <TableCell className="font-medium capitalize">{item.source || "unknown"}</TableCell>
                          <TableCell className="text-right">{item.total ?? 0}</TableCell>
                          {statusColumns.map((status) => (
                            <TableCell key={`${item.source}-${status}`} className="text-right">
                              {item?.status_wise?.[status] ?? 0}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No source data found for selected filters.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPrivateAuth(LeadSourceAnalyticsPage);
