"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoStudentsStatsCards({ stats, loading, error }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{loading ? "…" : stats?.total ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl">{loading ? "…" : stats?.payment?.paid ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid</CardDescription>
            <CardTitle className="text-2xl">{loading ? "…" : stats?.payment?.unpaid ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New / Active</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? "…" : `${stats?.by_status?.New ?? 0} / ${stats?.by_status?.Active ?? 0}`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrolled</CardDescription>
            <CardTitle className="text-2xl">
              {loading ? "…" : stats?.by_status?.Enrolled ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}
