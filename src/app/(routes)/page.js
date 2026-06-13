"use client";

import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, RefreshCw, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRangeForPreset, todayStr } from "@/lib/dateUtils";
import { formatStatsPeriodLabel } from "@/lib/dashboardStats";
import withPrivateAuth from "@/components/withPrivateAuth";
import { isManager } from "@/lib/dashboardConstants";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { PeriodPresets } from "@/components/dashboard/PeriodPresets";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TeamStatsTable } from "@/components/dashboard/TeamStatsTable";
import { RoleResponsibilities } from "@/components/dashboard/RoleResponsibilities";

function HomePage() {
  const user = useSelector((state) => state.userAuth?.user);
  const isManagerRole = isManager(user?.role);
  const [preset, setPreset] = useState("today");
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());

  const {
    myStats,
    teamStats,
    loadingMy,
    loadingTeam,
    refreshing,
    errorMy,
    errorTeam,
    refreshStats,
  } = useDashboardStats({
    fromDate,
    toDate,
    userId: user?.id,
    userRole: user?.role,
    isManager: isManagerRole,
  });

  const applyPreset = useCallback((p) => {
    setPreset(p);
    const { from, to } = getRangeForPreset(p);
    setFromDate(from);
    setToDate(to);
  }, []);

  const handleFromChange = useCallback((value) => {
    setFromDate(value);
    setPreset("");
  }, []);

  const handleToChange = useCallback((value) => {
    setToDate(value);
    setPreset("");
  }, []);

  const teamPeriodLabel = formatStatsPeriodLabel(fromDate, toDate);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-black/[0.04]">
        <CardHeader className="space-y-1 border-b border-border/60 bg-gradient-to-r from-card via-card to-primary/[0.04] pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <LayoutDashboard className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">Dashboard</CardTitle>
                <CardDescription className="mt-1 max-w-xl text-base leading-relaxed">
                  Leads, activities, and payments for the period you select—compare presets or pick exact dates.
                </CardDescription>
              </div>
            </div>
            {user && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={refreshStats}
                disabled={refreshing || loadingMy || loadingTeam}
                className="h-12 shrink-0 gap-2.5 self-start px-6 text-base font-semibold sm:self-center"
                aria-label="Refresh latest stats"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
                Refresh latest data
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          {user && (
            <>
              <section className="rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-5">
                <PeriodPresets
                  preset={preset}
                  fromDate={fromDate}
                  toDate={toDate}
                  onPresetChange={applyPreset}
                  onFromChange={handleFromChange}
                  onToChange={handleToChange}
                />
              </section>

              <section aria-busy={loadingMy}>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" aria-hidden />
                  </span>
                  My performance
                </h3>
                <StatsCards stats={myStats} loading={loadingMy} error={errorMy} />
              </section>

              {isManagerRole && (
                <section aria-busy={loadingTeam}>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                      <Users className="h-4 w-4" aria-hidden />
                    </span>
                    Team performance
                  </h3>
                  <TeamStatsTable
                    key={`team-${fromDate}-${toDate}-${preset}`}
                    teamStats={teamStats}
                    loading={loadingTeam}
                    error={errorTeam}
                    onRetry={refreshStats}
                    periodLabel={teamPeriodLabel}
                    fromDate={fromDate}
                    toDate={toDate}
                  />
                </section>
              )}

              <RoleResponsibilities role={user?.role} />
            </>
          )}

          {!user && (
            <p className="text-center text-muted-foreground">Sign in to see your performance and payment stats.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPrivateAuth(HomePage);
