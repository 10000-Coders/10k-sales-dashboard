"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { Loader2, UserPlus, Pencil, Phone, Calendar, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FollowUpTimer } from "@/components/FollowUpTimer";

/** Only Manager sees all leads; Admin and Counselor see only their own. */
import withPrivateAuth from "@/components/withPrivateAuth";

/** Only Manager sees all leads; Admin and Counselor see only their own. */
function isManager(role) {
  return role === "manager" || role === "super_admin";
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "callback", label: "Callback" },
  { value: "enrolled", label: "Enrolled" },
  { value: "wrong_number", label: "Wrong Number" },
];

function formatDate(d) {
  const dt = d ? new Date(d) : new Date();
  const safeDate = isNaN(dt.getTime()) ? new Date() : dt;
  return safeDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  const dt = d ? new Date(d) : new Date();
  const safeDate = isNaN(dt.getTime()) ? new Date() : dt;
  return safeDate.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function LeadsPage() {
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const isManagerRole = isManager(user?.role);
  const [leads, setLeads] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [counselorDropdownOpen, setCounselorDropdownOpen] = useState(false);
  const [counselorSearch, setCounselorSearch] = useState("");
  const counselorDropdownRef = useRef(null);

  const selectedPerson = persons.find((p) => String(p.id) === filterPerson);
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

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
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
      setLeads(list);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load leads.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPerson, filterDateFrom, filterDateTo, searchDebounce, isManagerRole, user?.id]);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchPersons = useCallback(async () => {
    if (!isManagerRole) return;
    try {
      const { data } = await axios.get("/persons/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setPersons(list);
    } catch {
      setPersons([]);
    }
  }, [isManagerRole, getHeaders]);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{isManagerRole ? "All leads" : "My leads"}</CardTitle>
              <CardDescription>
                {isManagerRole
                  ? "View all leads, filter by counselor, status and date. See who owns each lead and track activity."
                  : "Track your own leads. Filter by status and date."}
              </CardDescription>
            </div>
            <Button onClick={openAdd}>
              <UserPlus className="h-4 w-4" />
              Add lead
            </Button>
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
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
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
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile / Email</TableHead>
                    <TableHead>Status</TableHead>
                    {isManagerRole && <TableHead>Owner</TableHead>}
                  <TableHead>Next follow-up</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
                  <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => goToDetail(lead)}
                  >
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.mobile}</span>
                      {lead.email ? <span className="block text-xs">{lead.email}</span> : null}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        lead.status === "enrolled" && "bg-green-100 text-green-800",
                        lead.status === "interested" && "bg-blue-100 text-blue-800",
                        lead.status === "not_interested" || lead.status === "wrong_number" ? "bg-gray-100 text-gray-700" : "",
                        lead.status === "new" && "bg-amber-100 text-amber-800",
                        lead.status === "callback" && "bg-purple-100 text-purple-800",
                        lead.status === "contacted" && "bg-sky-100 text-sky-800"
                      )}>
                        {lead.status?.replace(/_/g, " ") ?? "—"}
                      </span>
                    </TableCell>
                    {isManagerRole && <TableCell>{lead.sales_person_name ?? "—"}</TableCell>}
                    <TableCell>
                      <FollowUpTimer followUpAt={lead.next_follow_up_at} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(lead.last_activity_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(lead)} aria-label={`Edit ${lead.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LeadFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        lead={editingLead}
        currentUserId={user?.id}
        onSuccess={() => { fetchLeads(); if (isManagerRole) fetchPersons(); }}
      />
    </div>
  );
}

export default withPrivateAuth(LeadsPage);
