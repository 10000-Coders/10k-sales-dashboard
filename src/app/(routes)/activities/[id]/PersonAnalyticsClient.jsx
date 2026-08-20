"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityTypeChart, ActivityTypePie } from "@/components/ActivityCharts";
import { DownloadProductivityPdfButton } from "@/features/activities/DownloadProductivityPdfButton";
import { Loader2, ArrowLeft, BarChart3, Calendar, Target, Phone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getRangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let from = new Date(today);
  switch (preset) {
    case "today":
      return { from: todayStr(), to: todayStr() };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const ys = y.toISOString().slice(0, 10);
      return { from: ys, to: ys };
    }
    case "last7":
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString().slice(0, 10), to: todayStr() };
    case "this_month":
      from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: todayStr() };
    case "last_month":
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      const toLast = new Date(from.getFullYear(), from.getMonth() + 1, 0);
      return { from: from.toISOString().slice(0, 10), to: toLast.toISOString().slice(0, 10) };
    default:
      return { from: todayStr(), to: todayStr() };
  }
}

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export default function PersonAnalyticsClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id;
  const fromQuery = searchParams?.get("from") || "";
  const toQuery = searchParams?.get("to") || "";
  const [preset, setPreset] = useState("");
  const [fromDate, setFromDate] = useState(fromQuery || getRangeForPreset("this_month").from);
  const [toDate, setToDate] = useState(toQuery || getRangeForPreset("this_month").to);
  const [person, setPerson] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyPreset = useCallback((p) => {
    setPreset(p);
    const { from, to } = getRangeForPreset(p);
    setFromDate(from);
    setToDate(to);
  }, []);

  useEffect(() => {
    if (fromQuery && toQuery) {
      setFromDate(fromQuery);
      setToDate(toQuery);
    }
  }, [fromQuery, toQuery]);


  const user = useSelector((state) => state.userAuth?.user);

  useEffect(() => {
    if (!user || !id) return;
    const isManagement = user.role === "manager" || user.role === "super_admin";
    if (!isManagement && String(id) !== String(user.id)) {
      router.replace("/activities");
    }
  }, [user, id, router]);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchPerson = useCallback(async () => {
    if (!id || !user) return;
    const isManagement = user.role === "manager" || user.role === "super_admin";
    // GET /persons/:id/ is manager/super_admin JWT only. Counselors use the session user.
    if (!isManagement) {
      if (String(id) === String(user.id)) setPerson(user);
      return;
    }
    try {
      const { data } = await axios.get(`/persons/${id}/`);
      setPerson(data);
    } catch {
      setPerson(null);
    }
  }, [id, user]);

  const fetchStats = useCallback(async () => {
    if (!id || !fromDate || !toDate) return;
    try {
      setLoading(true);
      const { data } = await axios.get(
        `/stats/range/?from=${fromDate}&to=${toDate}&sales_person=${id}`,
        { headers: getHeaders() }
      );
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [id, fromDate, toDate, getHeaders]);

  useEffect(() => {
    fetchPerson();
  }, [fetchPerson]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!id) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Button variant="ghost" onClick={() => router.push("/activities")}>
          <ArrowLeft className="h-4 w-4" /> Back to Activities
        </Button>
        <p className="text-destructive">Invalid person.</p>
      </div>
    );
  }

  const name = person?.name || stats?.sales_person_name || "—";
  const role = person?.role || stats?.role || "—";

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" className="w-fit" onClick={() => router.push("/activities")}>
        <ArrowLeft className="h-4 w-4" /> Back to Activities
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-primary" />
                Analytics — {name}
              </CardTitle>
              <CardDescription className="capitalize">{role} · Date range below</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-sm font-medium">Range:</span>
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
            <span className="text-sm text-muted-foreground">or</span>
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
            <DownloadProductivityPdfButton
              from={fromDate}
              to={toDate}
              salesPersonId={id}
              headers={getHeaders()}
              disabled={loading || !stats}
            />
          </div>
          {stats && (stats.from_date || stats.to_date) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {stats.from_date} → {stats.to_date}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !stats ? (
            <p className="py-8 text-center text-muted-foreground">Could not load analytics.</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span className="text-xs font-medium">Leads created</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.leads_created ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <span className="text-xs font-medium text-muted-foreground">Total activities</span>
                    <p className="text-2xl font-bold mt-1">{stats.activities_total ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="text-xs font-medium">Calls</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.calls ?? 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">WhatsApp</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.whatsapp ?? 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity by type (bar)</CardTitle>
                    <CardDescription>Calls and WhatsApp in this period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ActivityTypeChart data={stats} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity breakdown (pie)</CardTitle>
                    <CardDescription>Share of each activity type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ActivityTypePie data={stats} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
