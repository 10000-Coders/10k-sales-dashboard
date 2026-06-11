"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import { useSalesPersons, useSalesBatchDropdown } from "@/hooks/useSalesData";
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
import { ChevronLeft, ChevronRight, Loader2, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FollowUpTimer } from "@/components/FollowUpTimer";

/** Manager and Super Admin see all students; Admin/Counselor see only their own. */
import withPrivateAuth from "@/components/withPrivateAuth";

/** Module-level dedup: prevent double students fetch when React Strict Mode remounts */
let studentsCache = { key: null, data: null, pagination: null, at: 0 };
let studentsFetchPromise = null;
let studentsFetchCacheKey = null;
const STUDENTS_CACHE_MS = 5000;
const STUDENTS_PAGE_SIZE = 50;

/** Manager and Super Admin see all students and can filter by person; Admin/Counselor see only their own. */
function canSeeAllStudents(role) {
  return role === "manager" || role === "super_admin";
}

const COURSE_LABELS = {
  python_fullstack: "Python Fullstack",
  java_fullstack: "Java Fullstack",
  mern: "MERN",
  data_science: "Data Science",
  devops: "DevOps",
};

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCourseLabel(course) {
  if (!course) return "—";
  if (COURSE_LABELS[course]) return COURSE_LABELS[course];
  return String(course)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Badge colors for display_status from API (paid, verification_pending, due, draft, rejected). */
function getDisplayStatusBadgeClass(displayStatus) {
  const m = {
    paid: "bg-green-100 text-green-800",
    verification_pending: "bg-amber-100 text-amber-800",
    due: "bg-orange-100 text-orange-800",
    draft: "bg-gray-100 text-gray-700",
    rejected: "bg-red-100 text-red-800",
  };
  return m[displayStatus] || "bg-muted text-muted-foreground";
}

function getStatusLabel(displayStatus, displayStatusLabel) {
  const byKey = {
    paid: "Paid",
    verification_pending: "Verification Pending",
    due: "Due",
    draft: "Draft",
    rejected: "Rejected",
  };
  if (displayStatus && byKey[displayStatus]) return byKey[displayStatus];
  if (!displayStatusLabel) return "—";
  return String(displayStatusLabel).split("·")[0].trim();
}

function StudentsPage() {
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const canSeeAll = canSeeAllStudents(user?.role);
  const { persons } = useSalesPersons({ enabled: canSeeAll });
  const { salesBatchDropdown, loading: salesBatchesLoading } = useSalesBatchDropdown();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSalesBatch, setFilterSalesBatch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    page_size: STUDENTS_PAGE_SIZE,
    total_pages: 0,
  });

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchStudents = useCallback(async (forceRefresh = false, pageOverride) => {
    const effectivePage = pageOverride ?? page;
    const cacheKey = `${searchDebounce}|${filterPerson}|${filterDateFrom}|${filterDateTo}|${filterSalesBatch}|${effectivePage}|${user?.id}`;

    if (!forceRefresh && studentsCache.key === cacheKey && Date.now() - studentsCache.at < STUDENTS_CACHE_MS) {
      setStudents(studentsCache.data);
      setPagination(studentsCache.pagination);
      setLoading(false);
      return;
    }

    if (!forceRefresh && studentsFetchPromise && studentsFetchCacheKey === cacheKey) {
      setLoading(true);
      try {
        await studentsFetchPromise;
        if (studentsCache.key === cacheKey) {
          setStudents(studentsCache.data);
          setPagination(studentsCache.pagination);
        }
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (forceRefresh) {
      studentsCache = { key: null, data: null, pagination: null, at: 0 };
      studentsFetchPromise = null;
      studentsFetchCacheKey = null;
    }

    studentsFetchCacheKey = cacheKey;
    studentsFetchPromise = (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(effectivePage));
        params.set("page_size", String(STUDENTS_PAGE_SIZE));
        if (searchDebounce.trim()) params.set("search", searchDebounce.trim());
        if (canSeeAll && filterPerson) params.set("sales_person", filterPerson);
        if (filterDateFrom) params.set("created_after", filterDateFrom);
        if (filterDateTo) params.set("created_before", filterDateTo);
        if (filterSalesBatch) params.set("sales_batch", filterSalesBatch);
        const { data } = await axios.get(`/students/?${params.toString()}`, { headers: getHeaders() });
        const list = data?.results ?? (Array.isArray(data) ? data : []);
        const meta = {
          count: data?.count ?? list.length,
          page: data?.page ?? effectivePage,
          page_size: data?.page_size ?? STUDENTS_PAGE_SIZE,
          total_pages: data?.total_pages ?? (list.length ? 1 : 0),
        };
        studentsCache = { key: cacheKey, data: list, pagination: meta, at: Date.now() };
        setStudents(list);
        setPagination(meta);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load students.");
        setStudents([]);
        setPagination({ count: 0, page: 1, page_size: STUDENTS_PAGE_SIZE, total_pages: 0 });
      } finally {
        setLoading(false);
        studentsFetchPromise = null;
        studentsFetchCacheKey = null;
      }
    })();
    await studentsFetchPromise;
  }, [getHeaders, searchDebounce, canSeeAll, filterPerson, filterDateFrom, filterDateTo, filterSalesBatch, page, user?.id]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 3000);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounce, filterPerson, filterDateFrom, filterDateTo, filterSalesBatch]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const totalPages = Math.max(1, pagination.total_pages || 1);
  const totalCount = pagination.count ?? 0;
  const currentPage = pagination.page ?? page;
  const rangeFrom = totalCount === 0 ? 0 : (currentPage - 1) * STUDENTS_PAGE_SIZE + 1;
  const rangeTo = Math.min(currentPage * STUDENTS_PAGE_SIZE, totalCount);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-2xl">{canSeeAll ? "All students" : "My students"}</CardTitle>
            <CardDescription>
              {canSeeAll
                ? "Enrolled students. Choose whose students to show (by sales person), then filter by name, mobile, email, sales batch, or date range."
                : "Enrolled students from your leads. Filter by name, mobile, email or date."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile, or email..."
                className="h-9 pl-9"
              />
            </div>
            {canSeeAll && (
              <select
                value={filterPerson}
                onChange={(e) => setFilterPerson(e.target.value)}
                className="h-9 min-w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Show students added by this sales person"
              >
                <option value="">All students</option>
                {persons.map((p) => (
                  <option key={p.id} value={String(p.id)}>Students of {p.name}</option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="From"
              title="Created from date"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="To"
              title="Created to date"
            />
            <select
              value={filterSalesBatch}
              onChange={(e) => setFilterSalesBatch(e.target.value)}
              className="h-9 min-w-[190px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={salesBatchesLoading}
            >
              <option value="">{salesBatchesLoading ? "Loading sales batches..." : "All Sales Batches"}</option>
              {salesBatchDropdown.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-destructive">{error}</p>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No students yet. Add one from a lead or as walk-in.</p>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="min-w-[140px]">Course & Batch</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[120px]">College</TableHead>
                    <TableHead className="min-w-[120px]">Mobile</TableHead>
                    {canSeeAll && (
                      <TableHead className="hidden lg:table-cell min-w-[100px]">Student of</TableHead>
                    )}
                    <TableHead className="min-w-[130px]">Next payment follow-up</TableHead>
                    <TableHead className="min-w-[120px]">Activities</TableHead>
                    <TableHead className="min-w-[140px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/students/${s.id}`)}
                    >
                      <TableCell className="font-medium">{s.student_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span className="whitespace-nowrap">{formatCourseLabel(s.course)}</span>
                          {s.sales_batch_name && (
                            <span className="w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100">
                              {s.sales_batch_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {s.college_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {s.student_mobile}</span>
                      </TableCell>
                      {canSeeAll && (
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          <div className="flex flex-col gap-0.5">
                            <span>{s.sales_person_name || "—"}</span>
                            <span className="text-xs">{formatDate(s.created_at)}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">
                        {s.next_payment_follow_up_at ? (
                          <FollowUpTimer followUpAt={s.next_payment_follow_up_at} className="text-[11px]" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          <span>Lead: {s.lead_activities_count ?? 0}</span>
                          <span>Student: {s.student_activities_count ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getDisplayStatusBadgeClass(s.display_status))}>
                              {getStatusLabel(s.display_status, s.display_status_label)}
                            </span>
                            {s.is_moved_to_batch && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                Moved
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !error && totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {rangeFrom}–{rangeTo} of {totalCount}
                {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ""}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPrivateAuth(StudentsPage);
