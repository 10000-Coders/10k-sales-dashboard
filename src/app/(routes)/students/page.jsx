"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import Select from "react-select";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLeadCourseLabel } from "@/constants/leadCourse";
import {
  getInquirySourceLabel,
  LEAD_SOURCE_FILTER_OPTIONS,
} from "@/constants/leadInquirySource";
import { FollowUpTimer } from "@/components/FollowUpTimer";
import { useFollowUp } from "@/context/FollowUpProvider";
import StudentEnrollmentAnalytics from "@/components/StudentEnrollmentAnalytics";
import { saveStudentsFiltersQuery } from "@/lib/studentsFiltersUrl";

/** Manager and Super Admin see all students; Admin/Counselor see only their own. */
import withPrivateAuth from "@/components/withPrivateAuth";

function parseCsvParam(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parsePageParam(value) {
  const n = Number.parseInt(String(value || "1"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const SOURCE_OPTIONS = LEAD_SOURCE_FILTER_OPTIONS.filter((o) => o.value);

const FILTER_SELECT_CLASS =
  "rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function StudentSourceMultiSelect({
  id,
  label,
  options,
  selected,
  onChange,
  open,
  onOpenChange,
  dropdownRef,
  allLabel,
  minWidth = "min-w-[160px]",
}) {
  const displayLabel = useMemo(() => {
    if (!selected.length) return allLabel;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label ?? selected[0];
    }
    return `${selected.length} selected`;
  }, [selected, options, allLabel]);

  const toggle = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <div className={cn("relative", minWidth)} ref={dropdownRef}>
      <button
        type="button"
        id={id}
        onClick={() => onOpenChange(!open)}
        className={cn("flex h-9 w-full items-center justify-between gap-2", FILTER_SELECT_CLASS)}
        aria-label={label}
        aria-expanded={open}
      >
        <span className="truncate text-left">{displayLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-md border border-input bg-white shadow-md dark:bg-slate-900">
          <ul className="max-h-[240px] overflow-auto py-1">
            <li>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                  selected.length === 0 && "bg-slate-100 dark:bg-slate-800 font-medium"
                )}
                onClick={() => onChange([])}
              >
                {allLabel}
              </button>
            </li>
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                    selected.includes(o.value) && "bg-slate-100 dark:bg-slate-800 font-medium"
                  )}
                  onClick={() => toggle(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Module-level dedup: prevent double students fetch when React Strict Mode remounts */
let studentsCache = { key: null, data: null, pagination: null, at: 0 };
let studentsFetchPromise = null;
let studentsFetchCacheKey = null;
const STUDENTS_CACHE_MS = 5000;
const STUDENTS_PAGE_SIZE = 50;

/** Manager sees all students and can filter by person; Super Admin/Admin/Counselor see only their own. */
function canSeeAllStudents(role) {
  return role === "manager";
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCourseLabel(course) {
  if (!course) return "—";
  return getLeadCourseLabel(course) || String(course)
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

function StudentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSelector((state) => state.userAuth?.user);
  const { setUpcomingFollowUpsFromStudents } = useFollowUp();
  const canSeeAll = canSeeAllStudents(user?.role);
  const { persons } = useSalesPersons({ enabled: canSeeAll });
  const { salesBatchDropdown, loading: salesBatchesLoading } = useSalesBatchDropdown();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Restore from URL like leads so sidebar / back keeps the same filters.
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [searchDebounce, setSearchDebounce] = useState(() => searchParams.get("q") || "");
  const [filterPerson, setFilterPerson] = useState(() => searchParams.get("person") || "");
  const [filterDateFrom, setFilterDateFrom] = useState(() => searchParams.get("date_from") || "");
  const [filterDateTo, setFilterDateTo] = useState(() => searchParams.get("date_to") || "");
  const [filterSalesBatch, setFilterSalesBatch] = useState(
    () => searchParams.get("sales_batch") || "",
  );
  const [filterSources, setFilterSources] = useState(() =>
    parseCsvParam(searchParams.get("source")),
  );
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef(null);
  const skipPageResetRef = useRef(true);
  const skipUrlSyncRef = useRef(true);
  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    page_size: STUDENTS_PAGE_SIZE,
    total_pages: 0,
  });

  useEffect(() => {
    if (!sourceDropdownOpen) return;
    const onDocClick = (e) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [sourceDropdownOpen]);

  const fetchStudents = useCallback(async (forceRefresh = false, pageOverride) => {
    const effectivePage = pageOverride ?? page;
    const sourcesKey = filterSources.join(",");
    const cacheKey = `${searchDebounce}|${filterPerson}|${filterDateFrom}|${filterDateTo}|${filterSalesBatch}|${sourcesKey}|${effectivePage}|${user?.id}`;

    if (!forceRefresh && studentsCache.key === cacheKey && Date.now() - studentsCache.at < STUDENTS_CACHE_MS) {
      setStudents(studentsCache.data);
      setPagination(studentsCache.pagination);
      setUpcomingFollowUpsFromStudents(studentsCache.data);
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
          setUpcomingFollowUpsFromStudents(studentsCache.data);
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
        if (filterSources.length) params.set("lead_source", filterSources.join(","));
        const { data } = await axios.get(`/students/?${params.toString()}`);
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
        setUpcomingFollowUpsFromStudents(list);
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
  }, [searchDebounce, canSeeAll, filterPerson, filterDateFrom, filterDateTo, filterSalesBatch, filterSources, page, user?.id, setUpcomingFollowUpsFromStudents]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 3000);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (skipPageResetRef.current) {
      skipPageResetRef.current = false;
      return;
    }
    setPage(1);
  }, [searchDebounce, filterPerson, filterDateFrom, filterDateTo, filterSalesBatch, filterSources]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterPerson) params.set("person", filterPerson);
    if (filterSources.length) params.set("source", filterSources.join(","));
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);
    if (filterSalesBatch) params.set("sales_batch", filterSalesBatch);
    if (searchDebounce.trim()) params.set("q", searchDebounce.trim());
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();

    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      // Keep sidebar restore working when landing via Back (URL already has filters).
      if (qs) saveStudentsFiltersQuery(qs);
      return;
    }
    saveStudentsFiltersQuery(qs);
    router.replace(qs ? `/students?${qs}` : "/students", { scroll: false });
  }, [
    filterPerson,
    filterSources,
    filterDateFrom,
    filterDateTo,
    filterSalesBatch,
    searchDebounce,
    page,
    router,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const totalPages = Math.max(1, pagination.total_pages || 1);
  const totalCount = pagination.count ?? 0;
  const currentPage = pagination.page ?? page;
  const rangeFrom = totalCount === 0 ? 0 : (currentPage - 1) * STUDENTS_PAGE_SIZE + 1;
  const rangeTo = Math.min(currentPage * STUDENTS_PAGE_SIZE, totalCount);

  const salesPersonOptions = useMemo(
    () => [
      { value: "", label: "All students" },
      ...persons.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [persons]
  );
  const selectedSalesPersonOption =
    salesPersonOptions.find((o) => o.value === filterPerson) || salesPersonOptions[0];

  const salesBatchOptions = useMemo(
    () => [
      {
        value: "",
        label: salesBatchesLoading ? "Loading sales batches..." : "All Sales Batches",
      },
      ...salesBatchDropdown.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [salesBatchDropdown, salesBatchesLoading]
  );
  const selectedSalesBatchOption =
    salesBatchOptions.find((o) => o.value === filterSalesBatch) || salesBatchOptions[0];

  const filterSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 36,
      height: 36,
      fontSize: 14,
      backgroundColor: "hsl(var(--background))",
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
      boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.2)" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
      },
    }),
    singleValue: (base) => ({ ...base, color: "hsl(var(--foreground))" }),
    input: (base) => ({ ...base, color: "hsl(var(--foreground))", margin: 0, padding: 0 }),
    placeholder: (base) => ({ ...base, color: "hsl(var(--muted-foreground))" }),
    valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0 }),
    indicatorsContainer: (base) => ({ ...base, height: 36 }),
    clearIndicator: (base) => ({ ...base, color: "hsl(var(--muted-foreground))", padding: 4 }),
    dropdownIndicator: (base) => ({ ...base, color: "hsl(var(--muted-foreground))", padding: 4 }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: "hsl(var(--input))" }),
    menu: (base) => ({
      ...base,
      backgroundColor: "hsl(var(--background))",
      border: "1px solid hsl(var(--input))",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused || state.isSelected
        ? "hsl(var(--muted))"
        : "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      fontWeight: state.isSelected ? 500 : 400,
    }),
  };

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <StudentEnrollmentAnalytics
        salesPersonId={canSeeAll ? filterPerson : ""}
        salesBatchId={filterSalesBatch}
        leadSources={filterSources}
        dateFrom={filterDateFrom}
        dateTo={filterDateTo}
        search={searchDebounce}
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-2xl">{canSeeAll ? "All students" : "My students"}</CardTitle>
            <CardDescription>
              {canSeeAll
                ? "Enrolled students. Filter by sales person, lead source, sales batch, or date range."
                : "Enrolled students from your leads. Filter by name, lead source, or date."}
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
              <div className="min-w-[200px]">
                <Select
                  options={salesPersonOptions}
                  value={selectedSalesPersonOption}
                  onChange={(option) => setFilterPerson(option?.value || "")}
                  isSearchable
                  isClearable
                  placeholder="Search sales person..."
                  styles={filterSelectStyles}
                  aria-label="Filter by sales person"
                />
              </div>
            )}
            <StudentSourceMultiSelect
              id="filter-student-source"
              label="Filter by lead source"
              options={SOURCE_OPTIONS}
              selected={filterSources}
              onChange={setFilterSources}
              open={sourceDropdownOpen}
              onOpenChange={setSourceDropdownOpen}
              dropdownRef={sourceDropdownRef}
              allLabel="All sources"
            />
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
            <div className="min-w-[220px]">
              <Select
                options={salesBatchOptions}
                value={selectedSalesBatchOption}
                onChange={(option) => setFilterSalesBatch(option?.value || "")}
                isSearchable
                isClearable
                isDisabled={salesBatchesLoading}
                placeholder="Search sales batch..."
                styles={filterSelectStyles}
                aria-label="Filter by sales batch"
              />
            </div>
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
                    <TableHead className="min-w-[110px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Source</TableHead>
                    <TableHead className="min-w-[110px]">Lead date</TableHead>
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
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {getInquirySourceLabel(s.lead_source) || s.lead_source || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(s.lead_created_at)}
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

function StudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <StudentsPageInner />
    </Suspense>
  );
}

export default withPrivateAuth(StudentsPage);
