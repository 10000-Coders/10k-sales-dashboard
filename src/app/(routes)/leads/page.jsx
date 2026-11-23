"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import { useSalesPersons } from "@/hooks/useSalesData";
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
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { Loader2, UserPlus, Pencil, Phone, Search, ChevronDown, ChevronLeft, ChevronRight, Upload, ArrowRightLeft, BarChart3 } from "lucide-react";
import { LEAD_STATUS_FILTER_OPTIONS, LEAD_STATUS_STYLES } from "@/constants/leadStatus";
import { getInquirySourceLabel, LEAD_SOURCE_FILTER_OPTIONS } from "@/constants/leadInquirySource";
import {
  LEAD_COURSE_FILTER_OPTIONS,
  LEAD_IS_RELATED_FILTER_OPTIONS,
  LEAD_IS_AGENT_FILTER_OPTIONS,
  LEAD_IS_INTERESTED_FILTER_OPTIONS,
  getLeadCourseLabel,
  getLeadRelatedLabel,
  LEAD_RELATED_BADGE_STYLES,
  normalizeLeadRelatedValue,
} from "@/constants/leadCourse";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FollowUpTimer } from "@/components/FollowUpTimer";
import { useFollowUp } from "@/context/FollowUpProvider";
import { saveLeadsFiltersQuery } from "@/lib/leadsFiltersUrl";
import * as XLSX from "xlsx";
import useToast from "@/hooks/useToast";

/** Only Manager sees all leads; Admin and Counselor see only their own. */
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

/** Only Manager sees all leads; Admin, Counselor and Super Admin see only their own. */
function isManager(role) {
  return role === "manager";
}

/** Module-level dedup: prevent double leads fetch when React Strict Mode remounts */
let leadsCache = { key: null, data: null, pagination: null, at: 0 };
let leadsFetchPromise = null;
let leadsFetchCacheKey = null;
const LEADS_CACHE_MS = 5000;
const LEADS_PAGE_SIZE = 100;

const STATUS_OPTIONS = LEAD_STATUS_FILTER_OPTIONS;
const SOURCE_OPTIONS = LEAD_SOURCE_FILTER_OPTIONS.filter((o) => o.value);
const COURSE_OPTIONS = LEAD_COURSE_FILTER_OPTIONS.filter((o) => o.value);
const IS_RELATED_OPTIONS = LEAD_IS_RELATED_FILTER_OPTIONS;
const IS_AGENT_OPTIONS = LEAD_IS_AGENT_FILTER_OPTIONS;
const IS_INTERESTED_OPTIONS = LEAD_IS_INTERESTED_FILTER_OPTIONS;

function formatDate(d) {
  const dt = d ? new Date(d) : new Date();
  const safeDate = isNaN(dt.getTime()) ? new Date() : dt;
  return safeDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const FILTER_SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function LeadMultiSelectFilter({
  id,
  label,
  options,
  selected,
  onChange,
  open,
  onOpenChange,
  dropdownRef,
  allLabel,
  minWidth = "min-w-[150px]",
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

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSelector((state) => state.userAuth?.user);
  const isManagerRole = isManager(user?.role);
  const { persons, refetch: refetchPersons } = useSalesPersons({ enabled: isManagerRole });
  const { setUpcomingFollowUpsFromLeads } = useFollowUp();
  const { showSuccessToast, showErrorToast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") || "");
  const [filterSources, setFilterSources] = useState(() => parseCsvParam(searchParams.get("source")));
  const [filterCourses, setFilterCourses] = useState(() => parseCsvParam(searchParams.get("course")));
  const [filterIsRelated, setFilterIsRelated] = useState(() => searchParams.get("is_related") || "");
  const [filterIsAgent, setFilterIsAgent] = useState(() => searchParams.get("is_agent") || "");
  const [filterIsInterested, setFilterIsInterested] = useState(
    () => searchParams.get("is_interested") || "",
  );
  const [filterPerson, setFilterPerson] = useState(() => searchParams.get("person") || "");
  const [filterDateFrom, setFilterDateFrom] = useState(() => searchParams.get("date_from") || "");
  const [filterDateTo, setFilterDateTo] = useState(() => searchParams.get("date_to") || "");
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [searchDebounce, setSearchDebounce] = useState(() => searchParams.get("q") || "");
  const [counselorDropdownOpen, setCounselorDropdownOpen] = useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [counselorSearch, setCounselorSearch] = useState("");
  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    page_size: LEADS_PAGE_SIZE,
    total_pages: 0,
  });
  const counselorDropdownRef = useRef(null);
  const sourceDropdownRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const skipPageResetRef = useRef(true);
  const skipUrlSyncRef = useRef(true);

  const selectedPerson = persons.find((p) => String(p.id) === filterPerson);

  const getSalesPersonName = useCallback(
    (lead) => {
      if (lead.sales_person_name) return lead.sales_person_name;
      const person = persons.find((p) => String(p.id) === String(lead.sales_person));
      return person?.name ?? "—";
    },
    [persons]
  );
  const filteredPersons = counselorSearch.trim()
    ? persons.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(counselorSearch.toLowerCase()) ||
          (p.email || "").toLowerCase().includes(counselorSearch.toLowerCase())
      )
    : persons;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (counselorDropdownRef.current && !counselorDropdownRef.current.contains(e.target)) {
        setCounselorDropdownOpen(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target)) {
        setSourceDropdownOpen(false);
      }
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target)) {
        setCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLeads = useCallback(async (forceRefresh = false, pageOverride) => {
    const effectivePage = pageOverride ?? page;
    const cacheKey = `${filterStatus}|${filterSources.join(",")}|${filterCourses.join(",")}|${filterIsRelated}|${filterIsAgent}|${filterIsInterested}|${filterPerson}|${filterDateFrom}|${filterDateTo}|${searchDebounce}|${effectivePage}|${user?.id}`;

    if (forceRefresh) {
      leadsCache = { key: null, data: null, pagination: null, at: 0 };
      leadsFetchPromise = null;
      leadsFetchCacheKey = null;
    }

    if (!forceRefresh && leadsCache.key === cacheKey && Date.now() - leadsCache.at < LEADS_CACHE_MS) {
      setLeads(leadsCache.data);
      setPagination(leadsCache.pagination);
      const myLeadsForNotification = leadsCache.data.filter((l) => String(l.sales_person) === String(user?.id));
      setUpcomingFollowUpsFromLeads(myLeadsForNotification);
      setLoading(false);
      return;
    }

    if (!forceRefresh && leadsFetchPromise && leadsFetchCacheKey === cacheKey) {
      setLoading(true);
      try {
        await leadsFetchPromise;
        if (leadsCache.key === cacheKey) {
          setLeads(leadsCache.data);
          setPagination(leadsCache.pagination);
          const myLeadsForNotification = leadsCache.data.filter((l) => String(l.sales_person) === String(user?.id));
          setUpcomingFollowUpsFromLeads(myLeadsForNotification);
        }
      } catch {
        /* first fetch will handle error state */
      } finally {
        setLoading(false);
      }
      return;
    }

    leadsFetchCacheKey = cacheKey;
    leadsFetchPromise = (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", String(effectivePage));
        params.set("page_size", String(LEADS_PAGE_SIZE));
        if (filterStatus) params.set("status", filterStatus);
        if (filterSources.length) params.set("source", filterSources.join(","));
        if (filterCourses.length) params.set("course", filterCourses.join(","));
        if (filterIsRelated) params.set("is_related", filterIsRelated);
        if (isManagerRole && filterIsAgent) params.set("is_agent", filterIsAgent);
        if (isManagerRole && filterIsInterested) params.set("is_interested", filterIsInterested);
        if (filterDateFrom) params.set("created_after", filterDateFrom);
        if (filterDateTo) params.set("created_before", filterDateTo);
        if (searchDebounce.trim()) params.set("search", searchDebounce.trim());
        if (isManagerRole && filterPerson) {
          params.set("sales_person", filterPerson);
        }
        const { data } = await axios.get(`/leads/?${params.toString()}`);
        const list = data?.results ?? (Array.isArray(data) ? data : []);
        const meta = {
          count: data?.count ?? list.length,
          page: data?.page ?? effectivePage,
          page_size: data?.page_size ?? LEADS_PAGE_SIZE,
          total_pages: data?.total_pages ?? (list.length ? 1 : 0),
        };
        leadsCache = { key: cacheKey, data: list, pagination: meta, at: Date.now() };
        setLeads(list);
        setPagination(meta);
        const myLeadsForNotification = list.filter((l) => String(l.sales_person) === String(user?.id));
        setUpcomingFollowUpsFromLeads(myLeadsForNotification);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load leads.");
        setLeads([]);
        setPagination({ count: 0, page: 1, page_size: LEADS_PAGE_SIZE, total_pages: 0 });
      } finally {
        setLoading(false);
        leadsFetchPromise = null;
        leadsFetchCacheKey = null;
      }
    })();
    await leadsFetchPromise;
  }, [filterStatus, filterSources, filterCourses, filterIsRelated, filterIsAgent, filterIsInterested, filterPerson, filterDateFrom, filterDateTo, searchDebounce, page, isManagerRole, user?.id, setUpcomingFollowUpsFromLeads]);

  const clearFilters = useCallback(() => {
    setFilterStatus("");
    setFilterSources([]);
    setFilterCourses([]);
    setFilterIsRelated("");
    setFilterIsAgent("");
    setFilterIsInterested("");
    setFilterPerson("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchQuery("");
    setSearchDebounce("");
    setCounselorSearch("");
    setCounselorDropdownOpen(false);
    setSourceDropdownOpen(false);
    setCourseDropdownOpen(false);
    setPage(1);
    setError(null);
  }, []);

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
  }, [filterStatus, filterSources, filterCourses, filterIsRelated, filterIsAgent, filterIsInterested, filterPerson, filterDateFrom, filterDateTo, searchDebounce]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterSources.length) params.set("source", filterSources.join(","));
    if (filterCourses.length) params.set("course", filterCourses.join(","));
    if (filterIsRelated) params.set("is_related", filterIsRelated);
    if (isManagerRole && filterIsAgent) params.set("is_agent", filterIsAgent);
    if (isManagerRole && filterIsInterested) params.set("is_interested", filterIsInterested);
    if (isManagerRole && filterPerson) params.set("person", filterPerson);
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);
    if (searchDebounce.trim()) params.set("q", searchDebounce.trim());
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();

    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      // Keep sidebar restore working when landing via Back (URL already has filters).
      if (qs) saveLeadsFiltersQuery(qs);
      return;
    }
    saveLeadsFiltersQuery(qs);
    router.replace(qs ? `/leads?${qs}` : "/leads", { scroll: false });
  }, [
    filterStatus,
    filterSources,
    filterCourses,
    filterIsRelated,
    filterIsAgent,
    filterIsInterested,
    filterPerson,
    filterDateFrom,
    filterDateTo,
    searchDebounce,
    page,
    isManagerRole,
    router,
  ]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const totalPages = Math.max(1, pagination.total_pages || 1);
  const totalCount = pagination.count ?? 0;
  const currentPage = pagination.page ?? page;
  const rangeFrom = totalCount === 0 ? 0 : (currentPage - 1) * LEADS_PAGE_SIZE + 1;
  const rangeTo = Math.min(currentPage * LEADS_PAGE_SIZE, totalCount);

  const openAdd = () => {
    setEditingLead(null);
    setDialogOpen(true);
  };

  const openEdit = (lead) => {
    setEditingLead(lead);
    setDialogOpen(true);
  };

  const goToDetail = (lead) => {
    router.push(`/leads/${lead.id}`);
  };
  const headerRow = [
    "Name",
    "Phone",
    "Email",
    "Source",
    "Course",
    "Status",
    "Sales Person",
    "Activity Count",
  ];
  const isExcelDateRangeValid = useMemo(() => {
    if (!filterDateFrom || !filterDateTo) return false;
    const start = new Date(`${filterDateFrom}T00:00:00`);
    const end = new Date(`${filterDateTo}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    if (start > end) return false;
    const dayMs = 24 * 60 * 60 * 1000;
    const inclusiveDays = Math.floor((end - start) / dayMs) + 1;
    return inclusiveDays <= 31;
  }, [filterDateFrom, filterDateTo]);

  const canDownloadExcel = isExcelDateRangeValid;
  const excelDownloadDisabledReason = !filterDateFrom || !filterDateTo
    ? "Select Created from and Created to dates to enable Excel download"
    : !isExcelDateRangeValid
      ? "Date range cannot exceed one month (max 31 days)"
      : "";

  const handleExcelsheetDownload = async () => {
    if (downloadLoading || !canDownloadExcel) return;
    setDownloadLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSources.length) params.set("source", filterSources.join(","));
      if (filterCourses.length) params.set("course", filterCourses.join(","));
      if (filterIsRelated) params.set("is_related", filterIsRelated);
      if (isManagerRole && filterIsAgent) params.set("is_agent", filterIsAgent);
      if (isManagerRole && filterIsInterested) params.set("is_interested", filterIsInterested);
      params.set("created_after", filterDateFrom);
      params.set("created_before", filterDateTo);
      if (searchDebounce.trim()) params.set("search", searchDebounce.trim());
      if (isManagerRole && filterPerson) {
        params.set("sales_person", filterPerson);
      }

      const { data } = await axios.get(`/leads/excel-sheet-download/?${params.toString()}`);
      const rows = Array.isArray(data) ? data : data?.results ?? [];
      const sheetRows = rows.map((lead) => ({
        Name: lead.name || "",
        Phone: lead.mobile || "",
        Email: lead.email || "",
        Source: getInquirySourceLabel(lead.source) || lead.source || "",
        Course: getLeadCourseLabel(lead.course) || lead.course || "",
        Status: lead.status || "",
        "Sales Person": lead.sales_person_name || "",
        "Activity Count": lead.activities_count ?? 0,
      }));
      const excelSheetData = XLSX.utils.json_to_sheet(sheetRows, { header: headerRow });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, excelSheetData, "Leads");
      XLSX.writeFile(workbook, "leads.xlsx");
      showSuccessToast("Excel sheet downloaded successfully", "top-right", "light");
    } catch (error) {
      showErrorToast(error.response?.data?.detail || "Failed to download excel sheet", "top-right", "light");
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-full flex-1 flex-col">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/bulk-upload"
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50"
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                Bulk upload
              </Link>
              {isManagerRole && (
                <Link
                  href="/leaddemo/reassign"
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  Transfer leads
                </Link>
              )}
              <Link
                href="/leaddemo/analytics"
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50"
              >
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Source analytics
              </Link>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleExcelsheetDownload}
                disabled={downloadLoading || !canDownloadExcel}
                title={
                  canDownloadExcel
                    ? "Download leads for the selected date range (max 1 month)"
                    : excelDownloadDisabledReason
                }
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-50"
              >
                {downloadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                excel sheet download
              </button>
              <Button onClick={openAdd}>
                <UserPlus className="h-4 w-4" />
                Add lead
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cn(FILTER_SELECT_CLASS, "min-w-[130px]")}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all-status"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <LeadMultiSelectFilter
              id="filter-source"
              label="Filter by inquiry source"
              options={SOURCE_OPTIONS}
              selected={filterSources}
              onChange={setFilterSources}
              open={sourceDropdownOpen}
              onOpenChange={(open) => {
                setSourceDropdownOpen(open);
                if (open) {
                  setCourseDropdownOpen(false);
                  setCounselorDropdownOpen(false);
                }
              }}
              dropdownRef={sourceDropdownRef}
              allLabel="All sources"
              minWidth="min-w-[160px]"
            />
            <LeadMultiSelectFilter
              id="filter-course"
              label="Filter by course"
              options={COURSE_OPTIONS}
              selected={filterCourses}
              onChange={setFilterCourses}
              open={courseDropdownOpen}
              onOpenChange={(open) => {
                setCourseDropdownOpen(open);
                if (open) {
                  setSourceDropdownOpen(false);
                  setCounselorDropdownOpen(false);
                }
              }}
              dropdownRef={courseDropdownRef}
              allLabel="All courses"
              minWidth="min-w-[150px]"
            />
            <select
              value={filterIsRelated}
              onChange={(e) => setFilterIsRelated(e.target.value)}
              className={cn(FILTER_SELECT_CLASS, "min-w-[140px]")}
              aria-label="Filter by related status"
            >
              {IS_RELATED_OPTIONS.map((o) => (
                <option key={o.value || "all-related"} value={o.value}>{o.label}</option>
              ))}
            </select>
            {isManagerRole && (
              <select
                value={filterIsAgent}
                onChange={(e) => setFilterIsAgent(e.target.value)}
                className={cn(FILTER_SELECT_CLASS, "min-w-[130px]")}
                aria-label="Filter by agent"
              >
                {IS_AGENT_OPTIONS.map((o) => (
                  <option key={o.value || "all-agent"} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
            {isManagerRole && (
              <select
                value={filterIsInterested}
                onChange={(e) => setFilterIsInterested(e.target.value)}
                className={cn(FILTER_SELECT_CLASS, "min-w-[150px]")}
                aria-label="Filter by interested"
              >
                {IS_INTERESTED_OPTIONS.map((o) => (
                  <option key={o.value || "all-interested"} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
            {isManagerRole && (
              <div className="relative" ref={counselorDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCounselorDropdownOpen((o) => !o)}
                  className={cn(
                    "flex h-9 min-w-[180px] items-center justify-between gap-2",
                    FILTER_SELECT_CLASS
                  )}
                >
                  <span className="truncate text-left">
                    {selectedPerson ? selectedPerson.name : "All counselors"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground", counselorDropdownOpen && "rotate-180")} />
                </button>
                {counselorDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-md border border-input bg-white shadow-md dark:bg-slate-900">
                    <div className="p-2 border-b border-input">
                      <Input
                        type="search"
                        placeholder="Search counselor..."
                        value={counselorSearch}
                        onChange={(e) => setCounselorSearch(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <ul className="max-h-[240px] overflow-auto py-1">
                      <li>
                        <button
                          type="button"
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                            !filterPerson && "bg-slate-100 dark:bg-slate-800 font-medium"
                          )}
                          onClick={() => {
                            setFilterPerson("");
                            setCounselorDropdownOpen(false);
                            setCounselorSearch("");
                          }}
                        >
                          All counselors
                        </button>
                      </li>
                      {filteredPersons.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                              filterPerson === String(p.id) && "bg-slate-100 dark:bg-slate-800 font-medium"
                            )}
                            onClick={() => {
                              setFilterPerson(String(p.id));
                              setCounselorDropdownOpen(false);
                              setCounselorSearch("");
                            }}
                          >
                            {p.name}
                          </button>
                        </li>
                      ))}
                      {filteredPersons.length === 0 && (
                        <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                          No match
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className={FILTER_SELECT_CLASS}
              title="Created from date"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className={FILTER_SELECT_CLASS}
              title="Created to date"
            />
            <Button
              type="button"
              onClick={clearFilters}
              disabled={loading}
              className="h-9 bg-[#FF8000] text-white hover:bg-[#e67300] focus-visible:ring-[#FF8000]/40"
            >
              Clear Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-destructive">{error}</p>
          ) : leads.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No leads yet. Add one to get started.</p>
          ) : (
            <div className="w-full min-w-0 overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 min-w-[140px] w-[140px] bg-card">
                      Name
                    </TableHead>
                    <TableHead className="sticky left-[140px] z-20 min-w-[140px] w-[140px] bg-card">
                      Mobile
                    </TableHead>
                    {isManagerRole && (
                      <TableHead className="min-w-[100px]">Counselor</TableHead>
                    )}
                    <TableHead className="min-w-[130px]">Status / Related</TableHead>
                    {isManagerRole && (
                      <TableHead className="min-w-[120px]">At least once interested</TableHead>
                    )}
                    <TableHead className="min-w-[140px]">Course / Source</TableHead>
                    <TableHead className="min-w-[90px] text-center">Transfers</TableHead>
                    <TableHead className="min-w-[130px]">Next follow-up</TableHead>
                    <TableHead className="min-w-[140px]">Last activity</TableHead>
                    <TableHead className="w-12 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const transferCount =
                      lead.transfer_count > 0 ? lead.transfer_count : lead.is_transferred ? 1 : 0;
                    const courseValue = lead.enrolled_student_course || lead.course;
                    const courseLabel = courseValue ? getLeadCourseLabel(courseValue) : null;
                    const sourceLabel = lead.source ? getInquirySourceLabel(lead.source) : null;
                    return (
                    <TableRow
                      key={lead.id}
                      className="group cursor-pointer hover:bg-muted/50"
                      onClick={() => goToDetail(lead)}
                    >
                      <TableCell className="sticky left-0 z-10 min-w-[140px] w-[140px] bg-card font-medium group-hover:bg-muted">
                        <span className="block truncate" title={lead.name}>
                          {lead.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="sticky left-[140px] z-10 min-w-[140px] w-[140px] bg-card text-sm text-muted-foreground group-hover:bg-muted">

                        {lead.mobile ? (
                          <span className="flex items-center gap-1" title={lead.mobile}>
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.mobile}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {isManagerRole && (
                        <TableCell className="text-sm text-muted-foreground">
                          <span
                            className="block max-w-[120px] truncate"
                            title={getSalesPersonName(lead)}
                          >
                            {getSalesPersonName(lead)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                              LEAD_STATUS_STYLES[lead.status] ?? "bg-muted text-muted-foreground"
                            )}
                          >
                            {lead.status?.replace(/_/g, " ") ?? "—"}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              LEAD_RELATED_BADGE_STYLES[normalizeLeadRelatedValue(lead.is_related)]
                            )}
                          >
                            {getLeadRelatedLabel(lead.is_related)}
                          </span>
                        </div>
                      </TableCell>
                      {isManagerRole && (
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              lead.is_interested
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {lead.is_interested ? "Yes" : "No"}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground">
                        {!courseLabel && !sourceLabel ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className={cn("whitespace-nowrap", courseLabel && "font-medium text-foreground")}>
                              {courseLabel ?? "—"}
                            </span>
                            {sourceLabel ? (
                              <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                {sourceLabel}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {transferCount > 0 ? (
                          <span
                            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-medium tabular-nums text-amber-800"
                            title="Times transferred"
                          >
                            {transferCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.next_follow_up_at ? (
                          <FollowUpTimer followUpAt={lead.next_follow_up_at} className="text-[11px]" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          <span className="whitespace-nowrap">
                            {formatDateTime(lead.last_activity_at)}
                          </span>
                          <span className="text-xs" title="Logged calls and WhatsApp contacts">
                            {(lead.activities_count ?? 0) === 1
                              ? "1 activity"
                              : `${lead.activities_count ?? 0} activities`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(lead)}
                          aria-label={`Edit ${lead.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !error && totalCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
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

      <LeadFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        lead={editingLead}
        currentUserId={user?.id}
        onSuccess={() => { fetchLeads(true); if (isManagerRole) refetchPersons(); }}
      />
    </div>
  );
}

function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LeadsPageInner />
    </Suspense>
  );
}

export default withPrivateAuth(LeadsPage);
