"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import SideBar from "@/components/SideBar";
import TopNavbar from "@/components/TopNavbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  Loader2,
  Phone,
  MessageCircle,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  Info,
} from "lucide-react";
import axios from "@/axios";
import { cn } from "@/lib/utils";
import { getRangeForPreset, todayStr } from "@/lib/dateUtils";
import withPrivateAuth from "@/components/withPrivateAuth";

/** True only for Manager (team table + all stats). Super Admin sees own stats only. */
function isManager(role) {
  return role === "manager";
}

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

const SINGLE_DAY_PRESETS = new Set(["today", "yesterday"]);

/** Module-level cache + in-flight dedup for stats API (prevents 4x calls from Strict Mode + manager dual-fetch) */
const STATS_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours
const statsCache = new Map(); // key -> { data, at }
const statsFetchPromises = new Map(); // key -> Promise

async function fetchStatsCached({ singleDay, date, fromDate, toDate, salesPersonId, getHeaders }) {
  const cacheKey = singleDay
    ? `stats:${date}:${salesPersonId ?? "team"}`
    : `stats:range:${fromDate}:${toDate}:${salesPersonId ?? "team"}`;

  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.at < STATS_CACHE_MS) {
    return cached.data;
  }

  const inFlight = statsFetchPromises.get(cacheKey);
  if (inFlight) return inFlight;

  const doFetch = async () => {
    try {
      const headers = getHeaders();
      let data;
      if (singleDay) {
        const url = salesPersonId
          ? `/stats/?date=${date}&sales_person=${salesPersonId}`
          : `/stats/?date=${date}`;
        const res = await axios.get(url, { headers });
        data = res.data;
      } else {
        const url = salesPersonId
          ? `/stats/range/?from=${fromDate}&to=${toDate}&sales_person=${salesPersonId}`
          : `/stats/range/?from=${fromDate}&to=${toDate}`;
        const res = await axios.get(url, { headers });
        data = res.data;
      }
      statsCache.set(cacheKey, { data, at: Date.now() });
      return data;
    } finally {
      statsFetchPromises.delete(cacheKey);
    }
  };

  const promise = doFetch();
  statsFetchPromises.set(cacheKey, promise);
  return promise;
}

/** Step-by-step responsibilities by role (lead tracking, follow-up, enrollment, payments). */
const ROLE_RESPONSIBILITIES = {
  counselor: [
    "Add and track your leads; update lead status as you engage (Leads).",
    "Log every call and WhatsApp on the lead page with outcome and notes.",
    "Set and update the next follow-up date so you don’t miss follow-ups; use the navbar reminder.",
    "When a lead is ready, enroll them as a student (Enroll from lead) and add initial payment with proof.",
    "Keep track of your activities and payment stats here; ensure pending payments are followed up.",
  ],
  admin: [
    "Track your leads; log calls and WhatsApp and set next follow-up on each lead page.",
    "Enroll qualified leads as students and add the first payment with proof (Manager will verify).",
    "Add any follow-up payments for your students; upload proof so Manager can verify.",
    "Monitor your lead pipeline and activity so no follow-up is missed.",
  ],
  manager: [
    "Monitor team performance: leads, activities, and payments; support counselors as needed.",
    "Verify or reject student payments submitted by counselors (Payments).",
    "Manage sales persons and their roles; manage batches and payment receiver accounts.",
    "Oversee the lead pipeline; filter by counselor and date to follow up with the team.",
    "Review Activities by period and by person to keep the team on track.",
  ],
  super_admin: [
    "View your own leads, students, activities, and payment stats (same scope as counselor/admin).",
    "Use Dashboard and Activities to track your productivity; use Payments to view your students’ payments.",
    "Enroll students from your own leads only; Sales persons and Batches are managed by Manager.",
  ],
};

function HomePage() {
  const user = useSelector((state) => state.userAuth?.user);
  const isManagerRole = isManager(user?.role);
  const [preset, setPreset] = useState("today");
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [myStats, setMyStats] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
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

  const fetchMyStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const singleDay = SINGLE_DAY_PRESETS.has(preset);
      const date = singleDay ? (preset === "today" ? todayStr() : getRangeForPreset("yesterday").from) : null;
      const data = await fetchStatsCached({
        singleDay,
        date: date ?? fromDate,
        fromDate,
        toDate,
        salesPersonId: user.id,
        getHeaders,
      });
      setMyStats(data);
    } catch {
      setMyStats(null);
    }
  }, [user?.id, preset, fromDate, toDate, getHeaders]);

  const fetchTeamStats = useCallback(async () => {
    if (!isManagerRole) return;
    try {
      const singleDay = SINGLE_DAY_PRESETS.has(preset);
      const date = singleDay ? (preset === "today" ? todayStr() : getRangeForPreset("yesterday").from) : null;
      const data = await fetchStatsCached({
        singleDay,
        date: date ?? fromDate,
        fromDate,
        toDate,
        salesPersonId: null,
        getHeaders,
      });
      setTeamStats(data);
    } catch {
      setTeamStats(null);
    }
  }, [isManagerRole, preset, fromDate, toDate, getHeaders]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMyStats(), fetchTeamStats()]).finally(() => setLoading(false));
  }, [fetchMyStats, fetchTeamStats]);

  const isSingleDay = SINGLE_DAY_PRESETS.has(preset);
  const myLeads = myStats?.leads_total ?? myStats?.leads_created ?? 0;
  const myActivities = myStats?.activities_today ?? myStats?.activities_total ?? 0;
  const myCalls = myStats?.calls_today ?? myStats?.calls ?? 0;
  const myWhatsapp = myStats?.whatsapp_today ?? myStats?.whatsapp ?? 0;

  return (
    <main className="flex min-h-screen w-full">
      <SideBar />
      <div className="ml-[250px] flex flex-1 flex-col min-w-0">
        <TopNavbar />
        <div className="flex flex-1 flex-col gap-6 p-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl">Dashboard</CardTitle>
              </div>
              <CardDescription>Track leads, activities, and payments by date range.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {user && (
                <>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">Period:</span>
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
                  </div>

                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4" />
                      My performance
                    </h3>
                    {loading && !myStats ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : myStats ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8">
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Leads</p>
                          <p className="text-xl font-semibold">{myLeads}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">Activities</p>
                          <p className="text-xl font-semibold">{myActivities}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Calls</p>
                          <p className="text-xl font-semibold">{myCalls}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</p>
                          <p className="text-xl font-semibold">{myWhatsapp}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified payments</p>
                          <p className="text-xl font-semibold">{myStats.verified_payment_count ?? 0}</p>
                          <p className="text-xs text-muted-foreground">₹ {(myStats.verified_payment_amount ?? 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Pending payments</p>
                          <p className="text-xl font-semibold">{myStats.pending_payment_count ?? 0}</p>
                          <p className="text-xs text-muted-foreground">₹ {(myStats.pending_payment_amount ?? 0).toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Could not load your stats.</p>
                    )}
                  </div>

                  {isManagerRole && (
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4" />
                        Team performance
                      </h3>
                      {loading && !teamStats ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                        </div>
                      ) : teamStats?.by_person?.length ? (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Leads</TableHead>
                                <TableHead className="text-right">Activities</TableHead>
                                <TableHead className="text-right">Calls</TableHead>
                                <TableHead className="text-right">WhatsApp</TableHead>
                                <TableHead className="text-right">Verified (₹)</TableHead>
                                <TableHead className="text-right">Pending (₹)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teamStats.by_person.map((p) => (
                                <TableRow key={p.sales_person_id}>
                                  <TableCell className="font-medium">{p.sales_person_name}</TableCell>
                                  <TableCell className="capitalize">{p.role}</TableCell>
                                  <TableCell className="text-right">{p.leads_total ?? p.leads_created ?? 0}</TableCell>
                                  <TableCell className="text-right">{p.activities_today ?? p.activities_total ?? 0}</TableCell>
                                  <TableCell className="text-right">{p.calls_today ?? p.calls ?? 0}</TableCell>
                                  <TableCell className="text-right">{p.whatsapp_today ?? p.whatsapp ?? 0}</TableCell>
                                  <TableCell className="text-right">{(p.verified_payment_amount ?? 0).toLocaleString("en-IN")}</TableCell>
                                  <TableCell className="text-right">{(p.pending_payment_amount ?? 0).toLocaleString("en-IN")}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No team data for this period.</p>
                      )}
                    </div>
                  )}

                  {user?.role && ROLE_RESPONSIBILITIES[user.role] && (
                    <div className="rounded-lg border bg-muted/30 p-4 pt-3">
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        Your responsibilities — {user.role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </h3>
                      <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                        {ROLE_RESPONSIBILITIES[user.role].map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )}

              {!user && (
                <p className="text-muted-foreground">Sign in to see your performance and payment stats.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default withPrivateAuth(HomePage);
