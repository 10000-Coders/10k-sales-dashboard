"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Loader2, UserPlus, Pencil, Phone, Mail, Search, ChevronDown, ChevronLeft, ChevronRight, Upload, ArrowRightLeft, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";
import { parseLeadsWorkbook, mapLeadsExcelToBulkPayload } from "@/utils/parseLeadsExcel";
import { formatApiError } from "@/utils/formatApiError";
import { LEAD_STATUS_FILTER_OPTIONS, LEAD_STATUS_STYLES } from "@/constants/leadStatus";
import { LEAD_SOURCE_FILTER_OPTIONS } from "@/constants/leadInquirySource";
import {
  bulkCreateLeads,
  MAX_BULK_LEAD_IMPORT,
  selectLeadsBulkCreateLoading,
} from "@/redux/features/leads/leadsSlice";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FollowUpTimer } from "@/components/FollowUpTimer";
import { useFollowUp } from "@/context/FollowUpProvider";

/** Only Manager sees all leads; Admin and Counselor see only their own. */
import withPrivateAuth from "@/components/withPrivateAuth";

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
const SOURCE_OPTIONS = LEAD_SOURCE_FILTER_OPTIONS;

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

const LEAD_TABLE_HEAD = "whitespace-nowrap align-middle py-1.5 text-[11px] font-medium text-muted-foreground";
const LEAD_TABLE_CELL = "align-middle py-1.5 text-[11px]";

function LeadsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.userAuth?.user);
  const bulkCreateLoading = useSelector(selectLeadsBulkCreateLoading);
  const isManagerRole = isManager(user?.role);
  const { persons, refetch: refetchPersons } = useSalesPersons({ enabled: isManagerRole });
  const { setUpcomingFollowUpsFromLeads } = useFollowUp();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [counselorDropdownOpen, setCounselorDropdownOpen] = useState(false);
  const [counselorSearch, setCounselorSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    page_size: LEADS_PAGE_SIZE,
    total_pages: 0,
  });
  const counselorDropdownRef = useRef(null);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchLeads = useCallback(async (forceRefresh = false, pageOverride) => {
    const effectivePage = pageOverride ?? page;
    const cacheKey = `${filterStatus}|${filterSource}|${filterPerson}|${filterDateFrom}|${filterDateTo}|${searchDebounce}|${effectivePage}|${user?.id}`;

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
        if (filterSource) params.set("source", filterSource);
        if (filterDateFrom) params.set("created_after", filterDateFrom);
        if (filterDateTo) params.set("created_before", filterDateTo);
        if (searchDebounce.trim()) params.set("search", searchDebounce.trim());
        if (isManagerRole && filterPerson) {
          params.set("sales_person", filterPerson);
        } else if (!isManagerRole && user?.id) {
          params.set("sales_person", user.id);
        }
        const headers = {};
        if (user?.id != null) headers["X-Sales-Person-Id"] = String(user.id);
        if (user?.role) headers["X-Sales-Person-Role"] = user.role;
        const { data } = await axios.get(`/leads/?${params.toString()}`, { headers });
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
  }, [filterStatus, filterSource, filterPerson, filterDateFrom, filterDateTo, searchDebounce, page, isManagerRole, user?.id, setUpcomingFollowUpsFromLeads]);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 3000);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterSource, filterPerson, filterDateFrom, filterDateTo, searchDebounce]);

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

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      toast.warn("Only .xlsx and .xls files are allowed.");
      e.target.value = "";
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to import leads.");
      e.target.value = "";
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const parsedRows = parseLeadsWorkbook(workbook);
      const leads = mapLeadsExcelToBulkPayload(parsedRows, user.id);

      if (leads.length === 0) {
        toast.warn("No valid rows found. Each row needs Name and Phone.");
        return;
      }

      const result = await dispatch(bulkCreateLeads({ leads })).unwrap();
      const { created_count = 0, failed_count = 0 } = result;
      const message = result.detail || "Import completed.";

      if (created_count > 0) {
        if (failed_count > 0) {
          toast.warn(message);
        } else {
          toast.success(message);
        }
        setPage(1);
        fetchLeads(true, 1);
      } else {
        toast.warn(message);
      }
    } catch (err) {
      toast.error(formatApiError(err, "Failed to import leads from Excel."));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{isManagerRole ? "All leads" : "My leads"}</CardTitle>
              <CardDescription>
                {isManagerRole
                  ? "View all leads, filter by counselor, status, source and date. See who owns each lead and track activity."
                  : "Track your own leads. Filter by status, source and date."}
              </CardDescription>
            </div>
            <Button onClick={openAdd}>
              <UserPlus className="h-4 w-4" />
              Add lead
            </Button>
            
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <label
              className={cn(
                "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
                bulkCreateLoading ? "pointer-events-none opacity-60" : "cursor-pointer hover:bg-muted/50"
              )}
            >
              {bulkCreateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{bulkCreateLoading ? "Importing…" : "Upload Excel (.xlsx, .xls)"}</span>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                disabled={bulkCreateLoading}
                onChange={handleExcelUpload}
              />
            </label>
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
              className={cn(
                "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all-status"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className={cn(
                "h-9 min-w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              aria-label="Filter by inquiry source"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value || "all-source"} value={o.value}>{o.label}</option>
              ))}
            </select>
            {isManagerRole && (
              <div className="relative" ref={counselorDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCounselorDropdownOpen((o) => !o)}
                  className={cn(
                    "flex h-9 min-w-[180px] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <Table className="min-w-[820px] text-[11px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>Name</TableHead>
                    <TableHead className={cn("min-w-[180px]", LEAD_TABLE_HEAD)}>Phone / Email</TableHead>
                    {isManagerRole && (
                      <TableHead className={cn("min-w-[100px]", LEAD_TABLE_HEAD)}>Counselor</TableHead>
                    )}
                    <TableHead className={cn("min-w-[90px]", LEAD_TABLE_HEAD)}>Status</TableHead>
                    <TableHead className={cn("min-w-[120px]", LEAD_TABLE_HEAD)}>Next follow-up</TableHead>
                    <TableHead className={cn("min-w-[130px]", LEAD_TABLE_HEAD)}>Last activity / Count</TableHead>
                    <TableHead className={cn("w-[56px] text-right", LEAD_TABLE_HEAD)}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => goToDetail(lead)}
                    >
                      <TableCell className={cn("font-medium", LEAD_TABLE_CELL)}>
                        <span className="block max-w-[160px] truncate" title={lead.name}>
                          {lead.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className={cn("text-muted-foreground", LEAD_TABLE_CELL)}>
                        <div className="flex max-w-[220px] flex-col gap-0.5">
                          {lead.mobile ? (
                            <span className="inline-flex items-center gap-1 truncate" title={lead.mobile}>
                              <Phone className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                              <span className="truncate">{lead.mobile}</span>
                            </span>
                          ) : null}
                          {lead.email ? (
                            <span className="inline-flex items-center gap-1 truncate" title={lead.email}>
                              <Mail className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                              <span className="truncate">{lead.email}</span>
                            </span>
                          ) : null}
                          {!lead.mobile && !lead.email ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : null}
                        </div>
                      </TableCell>
                      {isManagerRole && (
                        <TableCell className={LEAD_TABLE_CELL}>
                          <span
                            className="block max-w-[120px] truncate text-muted-foreground"
                            title={getSalesPersonName(lead)}
                          >
                            {getSalesPersonName(lead)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className={LEAD_TABLE_CELL}>
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            LEAD_STATUS_STYLES[lead.status] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {lead.status?.replace(/_/g, " ") ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className={LEAD_TABLE_CELL}>
                        {lead.next_follow_up_at ? (
                          <FollowUpTimer followUpAt={lead.next_follow_up_at} className="text-[11px]" />
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-muted-foreground", LEAD_TABLE_CELL)}>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="whitespace-nowrap">
                            {formatDateTime(lead.last_activity_at)}
                          </span>
                          <span
                            className="text-[10px] text-muted-foreground/80"
                            title="Logged calls and WhatsApp contacts"
                          >
                            {(lead.activities_count ?? 0) === 1
                              ? "1 activity"
                              : `${lead.activities_count ?? 0} activities`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn("text-right", LEAD_TABLE_CELL)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(lead)}
                          aria-label={`Edit ${lead.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
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

export default withPrivateAuth(LeadsPage);
