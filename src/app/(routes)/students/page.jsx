"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
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
import { Input } from "@/components/ui/input";
import { Loader2, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Manager and Super Admin see all students; Admin/Counselor see only their own. */
import withPrivateAuth from "@/components/withPrivateAuth";

/** Manager and Super Admin see all students; Admin/Counselor see only their own. */
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
  const isManagerRole = user?.role === "manager";

  const [students, setStudents] = useState([]);
  const [persons, setPersons] = useState([]);
  const [salesBatches, setSalesBatches] = useState([]);
  const [salesBatchesLoading, setSalesBatchesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSalesBatch, setFilterSalesBatch] = useState("");

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchDebounce.trim()) params.set("search", searchDebounce.trim());
      if (canSeeAll && filterPerson) params.set("sales_person", filterPerson);
      if (filterDateFrom) params.set("created_after", filterDateFrom);
      if (filterDateTo) params.set("created_before", filterDateTo);
      if (filterSalesBatch) params.set("sales_batch", filterSalesBatch);
      const { data } = await axios.get(`/students/${params.toString() ? `?${params.toString()}` : ""}`, { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setStudents(list);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load students.");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, searchDebounce, canSeeAll, filterPerson, filterDateFrom, filterDateTo, filterSalesBatch]);

  const fetchPersons = useCallback(async () => {
    if (!canSeeAll) return;
    try {
      const { data } = await axios.get("/persons/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setPersons(list);
    } catch {
      setPersons([]);
    }
  }, [canSeeAll, getHeaders]);

  const fetchSalesBatches = useCallback(async () => {
    try {
      setSalesBatchesLoading(true);
      const { data } = await axios.get("/sales-batches/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setSalesBatches(list);
    } catch {
      setSalesBatches([]);
    } finally {
      setSalesBatchesLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  useEffect(() => {
    fetchSalesBatches();
  }, [fetchSalesBatches]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-2xl">{canSeeAll ? "All students" : "My students"}</CardTitle>
            <CardDescription>
              {canSeeAll
                ? "Enrolled students. Filter by name, mobile, email, added by, or date range."
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
                className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All (added by)</option>
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
              {salesBatches.map((b) => (
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Course & Batch</TableHead>
                  <TableHead>College / TPo</TableHead>
                  <TableHead>Mobile / Email</TableHead>
                  {(canSeeAll || user?.role === "super_admin") && <TableHead>Uploaded by</TableHead>}
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span>{formatCourseLabel(s.course)}</span>
                        {s.sales_batch_name && (
                          <span className="w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-100">
                            {s.sales_batch_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.college_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.student_mobile}</span>
                    </TableCell>
                    {(canSeeAll || user?.role === "super_admin") && (
                      <TableCell className="text-sm text-muted-foreground">
                        {s.sales_person_name || s.uploaded_by_name || "—"}
                      </TableCell>
                    )}

                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", getDisplayStatusBadgeClass(s.display_status))}>
                          {getStatusLabel(s.display_status, s.display_status_label)}
                        </span>
                        {s.is_moved_to_batch ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Moved to batch
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(s.created_at)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {(isManagerRole || user?.role === "super_admin") ? (
                        !s.is_moved_to_batch ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/students/${s.id}`)}
                          >
                            Change Sales Batch/Course
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Locked (moved to mentor batch)</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withPrivateAuth(StudentsPage);
