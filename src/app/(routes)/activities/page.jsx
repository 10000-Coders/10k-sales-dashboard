"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import withPrivateAuth from "@/components/withPrivateAuth";
import { useSalesPersons } from "@/hooks/useSalesData";
import axios from "@/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ActivityCharts, TeamComparisonChart, ActivityTypeChart } from "@/components/ActivityCharts";
import { Loader2, BarChart3, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRangeForPreset, todayStr } from "@/lib/dateUtils";

function isManagerOrAdmin(role) {
  // Only Manager is treated as management for Activities (team view).
  // Super Admin behaves like Admin/Counselor here: own stats only.
  return role === "manager";
}

/** Only Manager can list sales persons and pick another person's activities. */
function isManagerOnly(role) {
  return role === "manager";
}

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last7", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

const defaultRange = getRangeForPreset("this_month");

/** Module-level dedup: prevent double stats/range fetch when React Strict Mode remounts */
let statsRangeCache = { key: null, data: null, at: 0 };
let statsRangeFetchPromise = null;
let statsRangeFetchKey = null;
const STATS_CACHE_MS = 5000;

function ActivitiesPage() {
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const isManager = isManagerOrAdmin(user?.role);
  const canFetchPersons = isManagerOnly(user?.role); // Only manager can list sales persons (API restricted)
  const { persons } = useSalesPersons({ enabled: canFetchPersons });
  const [preset, setPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [personId, setPersonId] = useState("");
  const [rangeStats, setRangeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyPreset = useCallback((p) => {
    setPreset(p);
    const { from, to } = getRangeForPreset(p);
    setFromDate(from);
    setToDate(to);
  }, []);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchRangeStats = useCallback(async () => {
    const from = fromDate || todayStr();
    const to = toDate || todayStr();
    const cacheKey = `${from}|${to}|${personId}|${user?.id}`;

    if (statsRangeCache.key === cacheKey && Date.now() - statsRangeCache.at < STATS_CACHE_MS) {
      setRangeStats(statsRangeCache.data);
      return;
    }

    if (statsRangeFetchPromise && statsRangeFetchKey === cacheKey) {
      setLoading(true);
      try {
        await statsRangeFetchPromise;
        if (statsRangeCache.key === cacheKey) setRangeStats(statsRangeCache.data);
      } catch {
        setRangeStats(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    statsRangeFetchKey = cacheKey;
    statsRangeFetchPromise = (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ from, to });
        if (canFetchPersons && personId) {
          params.set("sales_person", personId);
        } else if (!isManager && user?.id) {
          params.set("sales_person", user.id);
        }
        const { data } = await axios.get(`/stats/range/?${params.toString()}`, { headers: getHeaders() });
        statsRangeCache = { key: cacheKey, data, at: Date.now() };
        setRangeStats(data);
      } catch {
        setRangeStats(null);
      } finally {
        setLoading(false);
        statsRangeFetchPromise = null;
        statsRangeFetchKey = null;
      }
    })();
    await statsRangeFetchPromise;
  }, [fromDate, toDate, personId, canFetchPersons, isManager, user?.id, getHeaders]);

  useEffect(() => {
    if (fromDate && toDate) fetchRangeStats();
  }, [fromDate, toDate, personId, isManager, user?.id, fetchRangeStats]);

  const list = rangeStats?.by_person
    ? rangeStats.by_person
    : rangeStats && rangeStats.sales_person_id
    ? [rangeStats]
    : [];

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Activities & productivity</CardTitle>
          </div>
          <CardDescription>
            Track leads created and activities (calls, WhatsApp) by date range. Managers can view any counselor or the whole team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Quick range:</span>
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => applyPreset(p.value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    preset === p.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Custom:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPreset(""); }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPreset(""); }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            {canFetchPersons && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Person:</span>
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
                >
                  <option value="">All (team)</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {rangeStats && (rangeStats.from_date || rangeStats.to_date) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {rangeStats.from_date} → {rangeStats.to_date}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No data for this period.</p>
          ) : (
            <>
              <div className="w-full min-w-0 overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Leads created</TableHead>
                      <TableHead className="text-right">Activities</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">WhatsApp</TableHead>
                      <TableHead className="text-right">Verified (₹)</TableHead>
                      <TableHead className="text-right">Pending (₹)</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((row) => (
                      <TableRow key={row.sales_person_id}>
                        <TableCell className="font-medium">{row.sales_person_name}</TableCell>
                        <TableCell className="capitalize">{row.role}</TableCell>
                        <TableCell className="text-right">{row.leads_created}</TableCell>
                        <TableCell className="text-right font-medium">{row.activities_total}</TableCell>
                        <TableCell className="text-right">{row.calls}</TableCell>
                        <TableCell className="text-right">{row.whatsapp}</TableCell>
                        <TableCell className="text-right">{(row.verified_payment_amount ?? 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right">{(row.pending_payment_amount ?? 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/activities/${row.sales_person_id}?from=${fromDate}&to=${toDate}`)}
                          >
                            <TrendingUp className="h-3.5 w-3 mr-1" />
                            Analytics
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Visual: charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-6 border-t">
                {list.length === 1 ? (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base">Activity breakdown — {list[0].sales_person_name}</CardTitle>
                      <CardDescription>Calls and WhatsApp for selected period</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ActivityTypeChart data={list[0]} />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Leads created (period)</CardTitle>
                        <CardDescription>By person for selected date range</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TeamComparisonChart byPerson={list} metric="leads_created" title="Leads" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Activities (period)</CardTitle>
                        <CardDescription>By person for selected date range</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <TeamComparisonChart byPerson={list} metric="activities_total" title="Activities" />
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default withPrivateAuth(ActivitiesPage);
