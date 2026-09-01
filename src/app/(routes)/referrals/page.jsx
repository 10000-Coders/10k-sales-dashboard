"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import { useSalesPersons } from "@/hooks/useSalesData";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Share2, UserPlus, BarChart3, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import withPrivateAuth from "@/components/withPrivateAuth";

function isManager(role) {
  return role === "manager";
}

function isManagerOrSuperAdmin(role) {
  return role === "manager" || role === "super_admin";
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "enrolled", label: "Enrolled" },
  { value: "full_payment_done", label: "Full payment done" },
  { value: "reward_processed", label: "Reward processed" },
];

function formatDate(d) {
  const dt = d ? new Date(d) : new Date();
  const safeDate = isNaN(dt.getTime()) ? new Date() : dt;
  return safeDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDateGroupLabel(createdAt) {
  const d = createdAt ? new Date(createdAt) : new Date();
  if (isNaN(d.getTime())) return "Other";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDate.getTime() === today.getTime()) return "Today";
  if (dDate.getTime() === yesterday.getTime()) return "Yesterday";
  return formatDate(createdAt);
}

/** Returns groups in order: Today, Yesterday, then others by date desc. */
function ReferrerCell({ name, batchName }) {
  const n = typeof name === "string" ? name.trim() : "";
  const b = typeof batchName === "string" ? batchName.trim() : "";
  if (!n) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 max-w-[min(100%,14rem)] flex-col gap-1.5">
      <span className="truncate font-medium leading-snug text-foreground">{n}</span>
      {b ? (
        <span
          className="inline-flex w-fit max-w-full items-center gap-1 rounded-md border border-orange-200/80 bg-orange-50/90 px-2 py-1 text-[11px] font-medium leading-none text-orange-900/90"
          title={`Batch: ${b}`}
        >
          <Layers className="h-3 w-3 shrink-0 text-orange-600/80" aria-hidden />
          <span className="truncate tabular-nums">{b}</span>
        </span>
      ) : null}
    </div>
  );
}

function groupReferralsByDate(referrals) {
  const map = new Map();
  for (const r of referrals) {
    const label = getDateGroupLabel(r.created_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(r);
  }
  const today = map.get("Today") || [];
  const yesterday = map.get("Yesterday") || [];
  const others = [];
  for (const [label, items] of map) {
    if (label !== "Today" && label !== "Yesterday") others.push({ label, items });
  }
  others.sort((a, b) => {
    const da = a.items[0]?.created_at ? new Date(a.items[0].created_at).getTime() : 0;
    const db = b.items[0]?.created_at ? new Date(b.items[0].created_at).getTime() : 0;
    return db - da;
  });
  const result = [];
  if (today.length) result.push({ label: "Today", count: today.length, items: today });
  if (yesterday.length) result.push({ label: "Yesterday", count: yesterday.length, items: yesterday });
  others.forEach(({ label, items }) => result.push({ label, count: items.length, items }));
  return result;
}

function ReferralsPage() {
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const isManagerRole = isManager(user?.role);
  const isManagerOrSuper = isManagerOrSuperAdmin(user?.role);
  const { persons } = useSalesPersons({ enabled: isManagerRole });
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectTopN, setSelectTopN] = useState(10);
  const [assignToId, setAssignToId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("this_week");
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterDateFrom) params.set("created_after", filterDateFrom);
      if (filterDateTo) params.set("created_before", filterDateTo);
      if (searchDebounce.trim()) params.set("search", searchDebounce.trim());
      if (isManagerRole && filterAssignedTo) params.set("assigned_to", filterAssignedTo);
      const { data } = await axios.get(`/referrals/?${params.toString()}`);
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setReferrals(list);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load referrals.");
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDateFrom, filterDateTo, searchDebounce, filterAssignedTo, isManagerRole]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 3000);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const goToDetail = (referral) => {
    router.push(`/referrals/${referral.id}`);
  };

  const toggleSelect = useCallback((id, e) => {
    e?.stopPropagation?.();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const unassignedReferrals = referrals.filter((r) => r.assigned_to == null || r.assigned_to === "");
  const unassignedCount = unassignedReferrals.length;

  const selectAllInList = useCallback(() => {
    setSelectedIds(new Set(unassignedReferrals.map((r) => r.id)));
  }, [unassignedReferrals]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectTopNReferrals = useCallback(() => {
    const n = Math.max(1, Math.min(selectTopN, unassignedCount));
    setSelectedIds(new Set(unassignedReferrals.slice(0, n).map((r) => r.id)));
  }, [unassignedReferrals, selectTopN, unassignedCount]);

  const handleBulkAssign = useCallback(async () => {
    const idToAssign = assignToId ? Number(assignToId) : null;
    if (!idToAssign || selectedIds.size === 0) return;
    setBulkAssigning(true);
    setError(null);
    try {
      await axios.post("/referrals/bulk_assign/", {
        referral_ids: Array.from(selectedIds),
        assigned_to: idToAssign,
      });
      setSelectedIds(new Set());
      setAssignToId("");
      await fetchReferrals();
    } catch (err) {
      setError(err.response?.data?.detail || "Bulk assign failed.");
    } finally {
      setBulkAssigning(false);
    }
  }, [selectedIds, assignToId, fetchReferrals]);

  const fetchDistributionStats = useCallback(async () => {
    if (!isManagerOrSuper) return;
    setStatsLoading(true);
    setStatsData(null);
    try {
      const { data } = await axios.get(`/referrals/distribution_stats/?period=${statsPeriod}`);
      setStatsData(data);
    } catch (err) {
      setStatsData({ error: err.response?.data?.detail || "Failed to load stats." });
    } finally {
      setStatsLoading(false);
    }
  }, [isManagerOrSuper, statsPeriod]);

  useEffect(() => {
    if (statsModalOpen && isManagerOrSuper && statsPeriod) {
      fetchDistributionStats();
    }
  }, [statsModalOpen, isManagerOrSuper, statsPeriod, fetchDistributionStats]);

  const dateGroups = groupReferralsByDate(referrals);
  const selectInputMin = 1;
  const selectInputMax = Math.max(unassignedCount, 1);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Share2 className="h-6 w-6" />
                {isManagerOrSuper ? "All referrals" : "Your referral leads"}
              </CardTitle>
              <CardDescription>
                {isManagerOrSuper
                  ? "View all referrals, filter by date and assign to counselors. Use date counts to distribute; select referrals and assign in bulk."
                  : "Referral leads assigned to you. Follow up and enroll from here. Filter by status and date."}
              </CardDescription>
            </div>
            {isManagerOrSuper && (
              <Button variant="outline" onClick={() => setStatsModalOpen(true)} className="shrink-0">
                <BarChart3 className="h-4 w-4 mr-2" />
                Distribution stats
              </Button>

            )}
            {isManagerOrSuper && (
              <Link href="/referrals/addreferial">
                <Button variant="outline" className="shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add referral
                </Button>
              </Link>
            )}
          </div>

          {isManagerRole && referrals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="text-sm font-medium text-muted-foreground mr-1">By date:</span>
              {dateGroups.map((g) => (
                <span
                  key={g.label}
                  className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {g.label} ({g.count})
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or mobile..."
                className="h-9 pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cn(
                "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {isManagerRole && (
              <select
                value={filterAssignedTo}
                onChange={(e) => setFilterAssignedTo(e.target.value)}
                className={cn(
                  "h-9 min-w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <option value="">All counselors</option>
                {persons.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="From"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="To"
            />
          </div>

          {isManagerRole && referrals.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Select:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={selectInputMin}
                  max={selectInputMax}
                  value={selectTopN}
                  onChange={(e) => setSelectTopN(Math.min(selectInputMax, Math.max(selectInputMin, Number(e.target.value) || 1)))}
                  className="h-9 w-14 rounded-md border border-input bg-background px-2 py-1 text-center text-sm"
                  aria-label="Number of referrals to select"
                />
                <Button type="button" variant="outline" size="sm" onClick={selectTopNReferrals} className="h-9" disabled={unassignedCount === 0}>
                  Select top {Math.min(selectTopN, unassignedCount)}
                </Button>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={selectAllInList} className="h-9 text-muted-foreground" disabled={unassignedCount === 0}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="h-9 text-muted-foreground">
                Clear selection
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={assignToId}
                      onChange={(e) => setAssignToId(e.target.value)}
                      className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm"
                      aria-label="Assign selected to counselor"
                    >
                      <option value="">Assign to…</option>
                      {persons.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-9"
                      disabled={!assignToId || bulkAssigning}
                      onClick={handleBulkAssign}
                    >
                      {bulkAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      {bulkAssigning ? "Assigning…" : "Assign"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-destructive">{error}</p>
          ) : referrals.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              {isManagerOrSuper ? "No referrals yet." : "No referral leads assigned to you yet."}
            </p>
          ) : (
            <div className="space-y-6">
              {dateGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    {group.label} ({group.count})
                  </h3>
                  <div className="w-full min-w-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isManagerRole && (
                            <TableHead className="w-10">
                              {group.items.some((r) => r.assigned_to == null || r.assigned_to === "") ? (
                                <input
                                  type="checkbox"
                                  checked={
                                    group.items
                                      .filter((r) => r.assigned_to == null || r.assigned_to === "")
                                      .every((r) => selectedIds.has(r.id))
                                  }
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const unassignedInGroup = group.items.filter(
                                      (r) => r.assigned_to == null || r.assigned_to === ""
                                    );
                                    if (e.target.checked) {
                                      setSelectedIds((prev) => {
                                        const next = new Set(prev);
                                        unassignedInGroup.forEach((r) => next.add(r.id));
                                        return next;
                                      });
                                    } else {
                                      setSelectedIds((prev) => {
                                        const next = new Set(prev);
                                        unassignedInGroup.forEach((r) => next.delete(r.id));
                                        return next;
                                      });
                                    }
                                  }}
                                  aria-label={`Select all unassigned in ${group.label}`}
                                  className="h-4 w-4"
                                />
                              ) : null}
                            </TableHead>
                          )}
                          <TableHead>Referred name</TableHead>
                          <TableHead>Email / Mobile</TableHead>
                          <TableHead>Referrer</TableHead>
                          <TableHead>Status</TableHead>
                          {isManagerRole && <TableHead>Assigned to</TableHead>}
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((r) => (
                          <TableRow
                            key={r.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/50",
                              selectedIds.has(r.id) && "bg-muted/50"
                            )}
                            onClick={() => goToDetail(r)}
                          >
                            {isManagerRole && (
                              <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
                                {(r.assigned_to == null || r.assigned_to === "") ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(r.id)}
                                    onChange={(e) => toggleSelect(r.id, e)}
                                    aria-label={`Select ${r.referred_name}`}
                                    className="h-4 w-4"
                                  />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="font-medium">{r.referred_name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              <span className="block">{r.referred_email ?? "—"}</span>
                              {r.referred_mobile ? <span className="block text-xs">{r.referred_mobile}</span> : null}
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <ReferrerCell name={r.referrer_name} batchName={r.referrer_batch_name} />
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  r.status === "reward_processed" && "bg-green-100 text-green-800",
                                  r.status === "full_payment_done" && "bg-emerald-100 text-emerald-800",
                                  r.status === "enrolled" && "bg-blue-100 text-blue-800",
                                  r.status === "contacted" && "bg-sky-100 text-sky-800",
                                  r.status === "pending" && "bg-amber-100 text-amber-800"
                                )}
                              >
                                {r.status?.replace(/_/g, " ") ?? "—"}
                              </span>
                            </TableCell>
                            {isManagerRole && <TableCell className="text-sm">{r.assigned_to_name ?? "Unassigned"}</TableCell>}
                            <TableCell className="text-muted-foreground text-sm">{formatDate(r.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {statsModalOpen && isManagerOrSuper && (
        <div
          className="fixed inset-0 z-50 flex min-w-0 items-center justify-center overflow-x-hidden bg-black/60 p-4"
          onClick={() => setStatsModalOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribution stats
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setStatsModalOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4 overflow-auto">
              <div className="flex items-center gap-2">
                <label htmlFor="stats-period" className="text-sm font-medium shrink-0">Period</label>
                <select
                  id="stats-period"
                  value={statsPeriod}
                  onChange={(e) => setStatsPeriod(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This week</option>
                  <option value="this_month">This month</option>
                </select>
              </div>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : statsData?.error ? (
                <p className="text-destructive text-sm">{statsData.error}</p>
              ) : statsData ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border bg-muted/40 p-3 text-center">
                      <p className="text-2xl font-semibold">{statsData.total ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3 text-center">
                      <p className="text-2xl font-semibold">{statsData.distributed ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Distributed</p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3 text-center">
                      <p className="text-2xl font-semibold">{statsData.unassigned ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Unassigned</p>
                    </div>
                  </div>
                  {statsData.date_start && (
                    <p className="text-xs text-muted-foreground">
                      {statsData.date_start} – {statsData.date_end}
                    </p>
                  )}
                  {Array.isArray(statsData.by_person) && statsData.by_person.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium mb-2">By counselor</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Counselor</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statsData.by_person.map((row) => (
                            <TableRow key={row.assigned_to_id ?? row.assigned_to_name}>
                              <TableCell className="font-medium">{row.assigned_to_name ?? "—"}</TableCell>
                              <TableCell className="text-right">{row.count ?? 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No distribution by counselor in this period.</p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withPrivateAuth(ReferralsPage);
