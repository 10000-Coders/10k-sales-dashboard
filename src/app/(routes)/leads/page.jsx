"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
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
import { Loader2, UserPlus, Pencil, Phone, Mail, Search, ChevronDown, ChevronLeft, ChevronRight, Upload, ArrowRightLeft, BarChart3, Megaphone } from "lucide-react";
import CreateCampaignDrawer from "@/components/wati/CreateCampaignDrawer";
import RecipientDetailDrawer from "@/components/wati/RecipientDetailDrawer";
import {
  closeRecipientDrawer,
  fetchLeadChat,
  openRecipientDrawer,
  WATI_CAMPAIGNS_PAGE_SIZE,
} from "@/redux/features/wati/watiSlice";
import { getRangeForPreset } from "@/lib/dateUtils";

// Leads page background WATI sync: poll every 5s, give up after 3 minutes.
const WATI_AUTO_SYNC_POLL_MS = 5000;
const WATI_AUTO_SYNC_MAX_MS = 180000;
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

function canCreateWatiCampaign(role) {
  return role === "manager" || role === "super_admin";
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

const WATI_SENT_OPTIONS = [
  { value: "", label: "All (WATI)" },
  { value: "sent", label: "WATI sent" },
  { value: "not_sent", label: "WATI not sent" },
];
// Based on the lead's latest campaign — same as the WATI Response column.
const WATI_RESPONSE_OPTIONS = [
  { value: "", label: "All responses" },
  { value: "responded", label: "Responded" },
  { value: "not_responded", label: "Not responded" },
  { value: "failed", label: "Failed" },
];
const WATI_RESPONSE_LABELS = {
  responded: "Responded",
  not_responded: "Not responded",
  failed: "Failed",
};
const WATI_RESPONSE_BADGE = {
  responded: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  not_responded: "bg-slate-100 text-slate-600",
};
const WATI_RESPONSE_BADGE_HOVER = {
  responded: "hover:bg-emerald-200 focus-visible:ring-emerald-500",
  failed: "hover:bg-red-200 focus-visible:ring-red-500",
  not_responded: "hover:bg-slate-200 focus-visible:ring-slate-400",
};

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

const LEAD_TABLE_HEAD =
  "h-11 whitespace-nowrap px-3 py-2.5 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground";
const LEAD_TABLE_CELL = "px-3 py-3 align-middle text-sm leading-snug";
const LEAD_CHECKBOX_HEAD =
  "sticky left-0 z-20 w-12 min-w-12 max-w-12 bg-muted/95 px-0 text-center shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]";
const LEAD_CHECKBOX_CELL =
  "sticky left-0 z-10 w-12 min-w-12 max-w-12 bg-background px-0 text-center shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]";
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
  const dispatch = useDispatch();
  const chatDrawer = useSelector((state) => state.wati.drawer);
  const isManagerRole = isManager(user?.role);
  const canCampaign = canCreateWatiCampaign(user?.role);
  // Managers / super admins: WATI badges open the lead's WhatsApp chat in a phone popup.
  const canViewWatiChat = canCampaign;

  const openLeadChat = useCallback(
    (event, lead) => {
      event.stopPropagation(); // the row itself still opens the lead profile
      dispatch(
        openRecipientDrawer({
          phone: lead.mobile,
          leadOrPhone: String(lead.id),
          previewName: lead.name || null,
        })
      );
      dispatch(fetchLeadChat({ leadId: lead.id, phone: lead.mobile }));
    },
    [dispatch]
  );

  // The popup lives in shared Redux state: close it when leaving the Leads page.
  useEffect(() => () => dispatch(closeRecipientDrawer()), [dispatch]);
  const { persons, refetch: refetchPersons } = useSalesPersons({ enabled: isManagerRole });
  const { setUpcomingFollowUpsFromLeads } = useFollowUp();
  const { showSuccessToast, showErrorToast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedLeadsMap, setSelectedLeadsMap] = useState(() => new Map());
  const [campaignSelectMode, setCampaignSelectMode] = useState(false);
  const [campaignDrawerOpen, setCampaignDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") || "");
  const [filterSources, setFilterSources] = useState(() => parseCsvParam(searchParams.get("source")));
  const [filterCourses, setFilterCourses] = useState(() => parseCsvParam(searchParams.get("course")));
  const [filterIsRelated, setFilterIsRelated] = useState(() => searchParams.get("is_related") || "");
  const [filterIsAgent, setFilterIsAgent] = useState(() => searchParams.get("is_agent") || "");
  const [filterIsInterested, setFilterIsInterested] = useState(
    () => searchParams.get("is_interested") || "",
  );
  const [filterWati, setFilterWati] = useState(() => searchParams.get("wati") || "");
  const [filterWatiResponse, setFilterWatiResponse] = useState(
    () => searchParams.get("wati_response") || "",
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

  // `silent`: background reload (after the WATI auto-sync) — keep the table on screen.
  const fetchLeads = useCallback(async (forceRefresh = false, pageOverride, { silent = false } = {}) => {
    const effectivePage = pageOverride ?? page;
    const cacheKey = `${filterStatus}|${filterSources.join(",")}|${filterCourses.join(",")}|${filterIsRelated}|${filterIsAgent}|${filterIsInterested}|${filterWati}|${filterWatiResponse}|${filterPerson}|${filterDateFrom}|${filterDateTo}|${searchDebounce}|${effectivePage}|${user?.id}`;

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
        if (!silent) {
          setLoading(true);
          setError(null);
        }
        const params = new URLSearchParams();
        params.set("page", String(effectivePage));
        params.set("page_size", String(LEADS_PAGE_SIZE));
        if (filterStatus) params.set("status", filterStatus);
        if (filterSources.length) params.set("source", filterSources.join(","));
        if (filterCourses.length) params.set("course", filterCourses.join(","));
        if (filterIsRelated) params.set("is_related", filterIsRelated);
        if (isManagerRole && filterIsAgent) params.set("is_agent", filterIsAgent);
        if (isManagerRole && filterIsInterested) params.set("is_interested", filterIsInterested);
        if (filterWati) params.set("wati", filterWati);
        if (filterWati === "sent" && filterWatiResponse) params.set("wati_response", filterWatiResponse);
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
        if (!silent) {
          setError(err.response?.data?.detail || "Failed to load leads.");
          setLeads([]);
          setPagination({ count: 0, page: 1, page_size: LEADS_PAGE_SIZE, total_pages: 0 });
        }
      } finally {
        if (!silent) setLoading(false);
        leadsFetchPromise = null;
        leadsFetchCacheKey = null;
      }
    })();
    await leadsFetchPromise;
  }, [filterStatus, filterSources, filterCourses, filterIsRelated, filterIsAgent, filterIsInterested, filterWati, filterWatiResponse, filterPerson, filterDateFrom, filterDateTo, searchDebounce, page, isManagerRole, user?.id, setUpcomingFollowUpsFromLeads]);

  const clearFilters = useCallback(() => {
    setFilterStatus("");
    setFilterSources([]);
    setFilterCourses([]);
    setFilterIsRelated("");
    setFilterIsAgent("");
    setFilterIsInterested("");
    setFilterWati("");
    setFilterWatiResponse("");
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
  }, [filterStatus, filterSources, filterCourses, filterIsRelated, filterIsAgent, filterIsInterested, filterWati, filterWatiResponse, filterPerson, filterDateFrom, filterDateTo, searchDebounce]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterSources.length) params.set("source", filterSources.join(","));
    if (filterCourses.length) params.set("course", filterCourses.join(","));
    if (filterIsRelated) params.set("is_related", filterIsRelated);
    if (isManagerRole && filterIsAgent) params.set("is_agent", filterIsAgent);
    if (isManagerRole && filterIsInterested) params.set("is_interested", filterIsInterested);
    if (filterWati) params.set("wati", filterWati);
    if (filterWati === "sent" && filterWatiResponse) params.set("wati_response", filterWatiResponse);
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
    filterWati,
    filterWatiResponse,
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

  const fetchLeadsRef = useRef(fetchLeads);
  fetchLeadsRef.current = fetchLeads;

  // Managers: every time the Leads page opens / reloads, sync recent WATI campaigns in the
  // background (same as Refresh on the campaigns page), then quietly reload the rows so the
  // WATI Campaigns / Response columns show the latest data. Server skips campaigns that are
  // already syncing or synced in the last minute, so reloads don't pile up work.
  useEffect(() => {
    if (!canViewWatiChat) return undefined;
    let cancelled = false;
    const range = getRangeForPreset("last30");
    const overviewUrl = (refresh) => {
      const params = new URLSearchParams({
        page: "1",
        page_size: String(WATI_CAMPAIGNS_PAGE_SIZE),
        date_from: range.from,
        date_to: range.to,
      });
      if (refresh) params.set("refresh", "1");
      return `/wati/campaigns/overview/?${params}`;
    };
    (async () => {
      try {
        let { data } = await axios.get(overviewUrl(true));
        const startedAt = Date.now();
        while (!cancelled && data?.syncing && Date.now() - startedAt < WATI_AUTO_SYNC_MAX_MS) {
          await new Promise((resolve) => setTimeout(resolve, WATI_AUTO_SYNC_POLL_MS));
          if (cancelled) return;
          ({ data } = await axios.get(overviewUrl(false)));
        }
        if (!cancelled) await fetchLeadsRef.current(true, undefined, { silent: true });
      } catch {
        /* background freshness only — the page already shows the last known data */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewWatiChat]);

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

  const toggleLeadSelected = (lead, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(lead.id);
      else next.delete(lead.id);
      return next;
    });
    setSelectedLeadsMap((prev) => {
      const next = new Map(prev);
      if (checked) next.set(lead.id, lead);
      else next.delete(lead.id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      leads.forEach((l) => next.add(l.id));
      return next;
    });
    setSelectedLeadsMap((prev) => {
      const next = new Map(prev);
      leads.forEach((l) => next.set(l.id, l));
      return next;
    });
  };

  const clearSelectionOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      leads.forEach((l) => next.delete(l.id));
      return next;
    });
    setSelectedLeadsMap((prev) => {
      const next = new Map(prev);
      leads.forEach((l) => next.delete(l.id));
      return next;
    });
  };

  const clearAllSelection = () => {
    setSelectedIds(new Set());
    setSelectedLeadsMap(new Map());
  };

  const enterCampaignSelectMode = () => {
    setCampaignSelectMode(true);
  };

  const exitCampaignSelectMode = () => {
    setCampaignSelectMode(false);
    clearAllSelection();
    setCampaignDrawerOpen(false);
  };

  const showCampaignCheckboxes = canCampaign && campaignSelectMode;

  const allOnPageSelected =
    leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const selectedOnPageCount = leads.filter((l) => selectedIds.has(l.id)).length;

  const selectedLeads = useMemo(
    () => Array.from(selectedLeadsMap.values()),
    [selectedLeadsMap]
  );
  const headerRow = [
    "Name",
    "Phone",
    "Email",
    "Source",
    "Course",
    "Status",
    "Sales Person",
    "Activity Count",
    "WATI Campaign Count",
    "WATI Latest Response",
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
      if (filterWati) params.set("wati", filterWati);
      if (filterWati === "sent" && filterWatiResponse) params.set("wati_response", filterWatiResponse);
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
        "WATI Campaign Count": lead.wati_campaigns_count ?? 0,
        "WATI Latest Response": WATI_RESPONSE_LABELS[lead.wati_last_response] || "",
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
              {canCampaign ? (
                !campaignSelectMode ? (
                  <Button type="button" className="gap-2" onClick={enterCampaignSelectMode}>
                    <Megaphone className="h-4 w-4" />
                    Select for campaign
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={exitCampaignSelectMode}>
                    Exit selection
                  </Button>
                )
              ) : null}
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
          {showCampaignCheckboxes ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
                {leads.length > 0 ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    ({selectedOnPageCount} on this page)
                  </span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={leads.length === 0}
                onClick={() => (allOnPageSelected ? clearSelectionOnPage() : selectAllOnPage())}
              >
                {allOnPageSelected ? "Deselect this page" : "Select this page"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={clearAllSelection}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={selectedIds.size === 0}
                onClick={() => setCampaignDrawerOpen(true)}
              >
                <Megaphone className="h-4 w-4" />
                Create campaign
              </Button>
            </div>
          ) : null}
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
            <select
              value={filterWati}
              onChange={(e) => {
                setFilterWati(e.target.value);
                if (e.target.value !== "sent") setFilterWatiResponse("");
              }}
              className={cn(FILTER_SELECT_CLASS, "min-w-[140px]")}
              aria-label="Filter by WATI campaign sent"
            >
              {WATI_SENT_OPTIONS.map((o) => (
                <option key={o.value || "all-wati"} value={o.value}>{o.label}</option>
              ))}
            </select>
            {filterWati === "sent" && (
              <select
                value={filterWatiResponse}
                onChange={(e) => setFilterWatiResponse(e.target.value)}
                className={cn(FILTER_SELECT_CLASS, "min-w-[150px]")}
                aria-label="Filter by WATI response (latest campaign)"
                title="Response to the lead's latest WATI campaign"
              >
                {WATI_RESPONSE_OPTIONS.map((o) => (
                  <option key={o.value || "all-wati-response"} value={o.value}>{o.label}</option>
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
            <div className="w-full min-w-0 rounded-md border border-border/60">
              <Table
                className="min-w-[960px] text-sm leading-snug"
                containerClassName="max-h-[calc(100vh-280px)]"
              >
                <TableHeader className="sticky top-0 z-30">
                  <TableRow className="hover:bg-transparent border-b bg-muted/95">
                    {showCampaignCheckboxes ? (
                      <TableHead
                        className={cn(LEAD_TABLE_HEAD, LEAD_CHECKBOX_HEAD)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-[#FF8000]"
                          checked={allOnPageSelected}
                          onChange={(e) =>
                            e.target.checked ? selectAllOnPage() : clearSelectionOnPage()
                          }
                          aria-label="Select all leads on page"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead
                      className={cn(
                        "min-w-[120px]",
                        LEAD_TABLE_HEAD,
                        showCampaignCheckboxes && "pl-4"
                      )}
                    >
                      Name
                    </TableHead>
                    <TableHead className={cn("min-w-[168px]", LEAD_TABLE_HEAD)}>Phone / Email</TableHead>
                    {isManagerRole && (
                      <TableHead className={cn("min-w-[100px]", LEAD_TABLE_HEAD)}>Counselor</TableHead>
                    )}
                    <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>Status / Related</TableHead>
                    {isManagerRole && (
                      <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>
                        At least once interested
                      </TableHead>
                    )}
                    <TableHead className={cn("min-w-[128px]", LEAD_TABLE_HEAD)}>Course / Source</TableHead>
                    <TableHead className={cn("min-w-[72px] text-center", LEAD_TABLE_HEAD)}>Transfers</TableHead>
                    <TableHead className={cn("min-w-[112px]", LEAD_TABLE_HEAD)}>Next follow-up</TableHead>
                    <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>Last activity</TableHead>
                    <TableHead className={cn("min-w-[110px] text-center", LEAD_TABLE_HEAD)}>WATI Campaigns</TableHead>
                    <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>WATI Response</TableHead>
                    <TableHead className={cn("w-12 text-right", LEAD_TABLE_HEAD)} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const transferCount =
                      lead.transfer_count > 0 ? lead.transfer_count : lead.is_transferred ? 1 : 0;
                    const isSelected = selectedIds.has(lead.id);
                    return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 border-b border-border/50 last:border-0",
                        isSelected && "bg-muted/30"
                      )}
                      onClick={() => goToDetail(lead)}
                    >
                      {showCampaignCheckboxes ? (
                        <TableCell
                          className={cn(
                            LEAD_TABLE_CELL,
                            LEAD_CHECKBOX_CELL,
                            isSelected && "bg-muted/40"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-[#FF8000]"
                            checked={isSelected}
                            onChange={(e) => toggleLeadSelected(lead, e.target.checked)}
                            aria-label={`Select ${lead.name || lead.id}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell
                        className={cn(
                          "font-medium",
                          LEAD_TABLE_CELL,
                          showCampaignCheckboxes && "pl-4"
                        )}
                      >
                        <span className="block max-w-[140px] truncate" title={lead.name}>
                          {lead.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-muted-foreground", LEAD_TABLE_CELL)}>
                        <div className="flex max-w-[200px] flex-col gap-1 py-0.5">
                          {lead.mobile ? (
                            <span className="inline-flex items-center gap-1 truncate" title={lead.mobile}>
                              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                              <span className="truncate">{lead.mobile}</span>
                            </span>
                          ) : null}
                          {lead.email ? (
                            <span className="inline-flex items-center gap-1 truncate" title={lead.email}>
                              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                              <span className="truncate">{lead.email}</span>
                            </span>
                          ) : null}
                          {!lead.mobile && !lead.email ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : null}
                        </div>
                      </TableCell>
                      {isManagerRole && (
                        <TableCell className={cn("text-sm text-muted-foreground", LEAD_TABLE_CELL)}>
                          <span
                            className="block max-w-[120px] truncate"
                            title={getSalesPersonName(lead)}
                          >
                            {getSalesPersonName(lead)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className={LEAD_TABLE_CELL}>
                        <div className="flex max-w-[140px] flex-wrap items-center gap-1.5 py-0.5">
                          <span
                            className={cn(
                              "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                              LEAD_STATUS_STYLES[lead.status] ?? "bg-muted text-muted-foreground"
                            )}
                          >
                            {lead.status?.replace(/_/g, " ") ?? "—"}
                          </span>
                          <span
                            className={cn(
                              "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                              LEAD_RELATED_BADGE_STYLES[normalizeLeadRelatedValue(lead.is_related)]
                            )}
                          >
                            {getLeadRelatedLabel(lead.is_related)}
                          </span>
                        </div>
                      </TableCell>
                      {isManagerRole && (
                        <TableCell className={LEAD_TABLE_CELL}>
                          <span
                            className={cn(
                              "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                              lead.is_interested
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {lead.is_interested ? "Yes" : "No"}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className={LEAD_TABLE_CELL}>
                        {(() => {
                          const courseValue = lead.enrolled_student_course || lead.course;
                          const courseLabel = courseValue ? getLeadCourseLabel(courseValue) : null;
                          const sourceLabel = lead.source ? getInquirySourceLabel(lead.source) : null;
                          if (!courseLabel && !sourceLabel) {
                            return <span className="text-muted-foreground/60">—</span>;
                          }
                          return (
                            <div className="flex max-w-[140px] flex-col gap-0.5 py-0.5">
                              <span
                                className={cn(
                                  "truncate",
                                  courseLabel ? "font-medium text-foreground" : "text-muted-foreground/60"
                                )}
                                title={courseLabel ?? undefined}
                              >
                                {courseLabel ?? "—"}
                              </span>
                              <span
                                className="truncate text-xs text-muted-foreground"
                                title={sourceLabel ?? undefined}
                              >
                                {sourceLabel ?? "—"}
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className={cn(LEAD_TABLE_CELL, "text-center")}>
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
                      <TableCell className={LEAD_TABLE_CELL}>
                        {lead.next_follow_up_at ? (
                          <FollowUpTimer followUpAt={lead.next_follow_up_at} className="gap-1 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={cn("text-muted-foreground", LEAD_TABLE_CELL)}>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="whitespace-nowrap text-sm">
                            {formatDateTime(lead.last_activity_at)}
                          </span>
                          <span
                            className="text-xs text-muted-foreground/80"
                            title="Logged calls and WhatsApp contacts"
                          >
                            {(lead.activities_count ?? 0) === 1
                              ? "1 activity"
                              : `${lead.activities_count ?? 0} activities`}
                          </span>
                        </div>
                      </TableCell>
                      {(() => {
                        const campaignName = (lead.wati_last_campaign_name || "").trim();
                        const campaignCount = lead.wati_campaigns_count ?? 0;
                        const response = lead.wati_last_response;
                        const deliveryStatus = (lead.wati_last_status || "").trim();
                        const latestHint = [
                          campaignName ? `Latest campaign: ${campaignName}` : "",
                          deliveryStatus ? `Delivery: ${deliveryStatus}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <>
                            <TableCell className={cn(LEAD_TABLE_CELL, "text-center")}>
                              {campaignCount > 0 && canViewWatiChat ? (
                                <button
                                  type="button"
                                  onClick={(e) => openLeadChat(e, lead)}
                                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 px-2 text-xs font-medium tabular-nums text-sky-800 underline-offset-2 transition-colors hover:bg-sky-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                                  title={`View WhatsApp chat · ${campaignCount} WATI campaign${campaignCount === 1 ? "" : "s"}${
                                    campaignName ? ` · latest: ${campaignName}` : ""
                                  }`}
                                  aria-label={`View WhatsApp chat for ${lead.name || "lead"}`}
                                >
                                  {campaignCount}
                                </button>
                              ) : campaignCount > 0 ? (
                                <span
                                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 px-2 text-xs font-medium tabular-nums text-sky-800"
                                  title={`${campaignCount} WATI campaign${campaignCount === 1 ? "" : "s"}${
                                    campaignName ? ` · latest: ${campaignName}` : ""
                                  }`}
                                >
                                  {campaignCount}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className={LEAD_TABLE_CELL}>
                              {response && canViewWatiChat ? (
                                <button
                                  type="button"
                                  onClick={(e) => openLeadChat(e, lead)}
                                  className={cn(
                                    "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2",
                                    WATI_RESPONSE_BADGE[response] || WATI_RESPONSE_BADGE.not_responded,
                                    WATI_RESPONSE_BADGE_HOVER[response] || WATI_RESPONSE_BADGE_HOVER.not_responded
                                  )}
                                  title={["View WhatsApp chat", latestHint].filter(Boolean).join(" · ")}
                                >
                                  {WATI_RESPONSE_LABELS[response] || "Not responded"}
                                </button>
                              ) : response ? (
                                <span
                                  className={cn(
                                    "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                                    WATI_RESPONSE_BADGE[response] || WATI_RESPONSE_BADGE.not_responded
                                  )}
                                  title={latestHint || undefined}
                                >
                                  {WATI_RESPONSE_LABELS[response] || "Not responded"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </>
                        );
                      })()}
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

      {canCampaign ? (
        <>
          {campaignSelectMode && selectedIds.size > 0 && !campaignDrawerOpen ? (
            <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button type="button" variant="outline" size="sm" onClick={clearAllSelection}>
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                onClick={() => setCampaignDrawerOpen(true)}
              >
                <Megaphone className="h-4 w-4" />
                Create campaign
              </Button>
            </div>
          ) : null}
          <CreateCampaignDrawer
            open={campaignDrawerOpen}
            onClose={() => setCampaignDrawerOpen(false)}
            selectedLeads={selectedLeads}
          />
          <RecipientDetailDrawer
            open={chatDrawer.open}
            loading={chatDrawer.loading}
            error={chatDrawer.error}
            data={chatDrawer.data}
            previewName={chatDrawer.previewName}
            previewPhone={chatDrawer.phone}
            onClose={() => dispatch(closeRecipientDrawer())}
          />
        </>
      ) : null}
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
