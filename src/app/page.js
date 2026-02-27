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
  Target,
  Calendar,
  TrendingUp,
} from "lucide-react";
import axios from "@/axios";

import withPrivateAuth from "@/components/withPrivateAuth";

function isManagerOrAdmin(role) {
  return role === "manager" || role === "admin";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function HomePage() {
  const user = useSelector((state) => state.userAuth?.user);
  const isManager = isManagerOrAdmin(user?.role);
  const [statsDate, setStatsDate] = useState(todayISO());
  const [myStats, setMyStats] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMyStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await axios.get(`/stats/?date=${statsDate}&sales_person=${user.id}`);
      setMyStats(data);
    } catch {
      setMyStats(null);
    }
  }, [user?.id, statsDate]);

  const fetchTeamStats = useCallback(async () => {
    if (!isManager) return;
    try {
      const { data } = await axios.get(`/stats/?date=${statsDate}`);
      setTeamStats(data);
    } catch {
      setTeamStats(null);
    }
  }, [isManager, statsDate]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMyStats(), fetchTeamStats()]).finally(() => setLoading(false));
  }, [fetchMyStats, fetchTeamStats]);

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
              <CardDescription>Welcome to the 10k Coders sales dashboard. Track leads and daily activity here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4" />
                  How it works
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Leads:</strong> Counselors add leads (no manual assign). Each lead is yours; you see only &quot;My leads&quot;. Managers see all leads and who owns each.</li>
                  <li><strong>Activity:</strong> On a lead&apos;s page, log every call or WhatsApp (type + outcome + notes). That updates the lead&apos;s status and last activity.</li>
                  <li><strong>Per day:</strong> Every logged activity is stored with the date. Below you see how many activities each person did on the selected day (calls, WhatsApp, etc.) and total lead count.</li>
                  <li><strong>Managers:</strong> Use &quot;Team performance&quot; to see everyone&apos;s leads and activities for the day. Use Leads → filter by &quot;All counselors&quot; and date to drill down.</li>
                </ul>
              </div>

              {user && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm font-medium">Date for stats:</label>
                    <input
                      type="date"
                      value={statsDate}
                      onChange={(e) => setStatsDate(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
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
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground">Total leads</p>
                          <p className="text-xl font-semibold">{myStats.leads_total}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">Activities on day</p>
                          <p className="text-xl font-semibold">{myStats.activities_today}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Calls</p>
                          <p className="text-xl font-semibold">{myStats.calls_today}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</p>
                          <p className="text-xl font-semibold">{myStats.whatsapp_today}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Could not load your stats.</p>
                    )}
                  </div>

                  {isManager && (
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
                                <TableHead className="text-right">Total leads</TableHead>
                                <TableHead className="text-right">Activities (day)</TableHead>
                                <TableHead className="text-right">Calls</TableHead>
                                <TableHead className="text-right">WhatsApp</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teamStats.by_person.map((p) => (
                                <TableRow key={p.sales_person_id}>
                                  <TableCell className="font-medium">{p.sales_person_name}</TableCell>
                                  <TableCell className="capitalize">{p.role}</TableCell>
                                  <TableCell className="text-right">{p.leads_total}</TableCell>
                                  <TableCell className="text-right">{p.activities_today}</TableCell>
                                  <TableCell className="text-right">{p.calls_today}</TableCell>
                                  <TableCell className="text-right">{p.whatsapp_today}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No team data for this date.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {!user && (
                <p className="text-muted-foreground">Sign in to see your performance and activity stats.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default withPrivateAuth(HomePage);
