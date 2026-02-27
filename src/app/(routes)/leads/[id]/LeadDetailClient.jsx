"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Phone, Mail, User, Calendar, Activity, MessageCircle, Circle, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FollowUpTimer } from "@/components/FollowUpTimer";
import { useFollowUp } from "@/context/FollowUpProvider";

function getActivityIcon(type) {
  switch (type) {
    case "call": return Phone;
    case "whatsapp": return MessageCircle;
    default: return Circle;
  }
}

function formatActivityDate(d) {
  const dt = d ? new Date(d) : new Date();
  const safeDate = isNaN(dt.getTime()) ? new Date() : dt;
  const now = new Date();
  const isToday = safeDate.toDateString() === now.toDateString();
  if (isToday) return safeDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return safeDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Enrolled is not in dropdown – use "Enroll student" button to enroll; status is set when student is created
const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "callback", label: "Callback" },
  { value: "wrong_number", label: "Wrong Number" },
];

const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
];

const OUTCOMES = [
  { value: "not_answered", label: "Not Answered" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "callback", label: "Callback" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "enrolled", label: "Enrolled" },
  { value: "other", label: "Other" },
];

function formatDateTime(d) {
  const dt = d ? new Date(d) : new Date();
  const safeDate = isNaN(dt.getTime()) ? new Date() : dt;
  return safeDate.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isManagerOrAdmin(role) {
  return role === "manager" || role === "super_admin";
}

export default function LeadDetailClient() {
  const params = useParams();
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const { fetchMyLeads } = useFollowUp() || {};
  const id = params?.id;
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activity_type: "call",
    outcome: "",
    notes: "",
    next_follow_up_at: "",
  });
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityError, setActivityError] = useState(null);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/leads/${id}/`);
      setLead(data);
    } catch (err) {
      setLead(null);
      setError(err.response?.data?.detail || "Lead not found.");
    }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/leads/${id}/activities/`);
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setActivities([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchLead(), fetchActivities()]).finally(() => setLoading(false));
  }, [id, fetchLead, fetchActivities]);

  useEffect(() => {
    if (loading || !lead || !user) return;
    if (!isManagerOrAdmin(user.role) && lead.sales_person !== user.id) {
      router.replace("/leads");
    }
  }, [loading, lead, user, router]);

  const handleStatusChange = async (newStatus) => {
    if (!lead) return;
    if (lead.status === "enrolled") return;
    setStatusSaving(true);
    try {
      await axios.patch(`/leads/${lead.id}/`, { status: newStatus });
      setLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!id) return;
    const trimmedNotes = (activityForm.notes || "").trim();
    if (trimmedNotes.length > 200) {
      setActivityError("Notes must be 200 characters or less.");
      return;
    }
    if (!activityForm.outcome) {
      setActivityError("Select an outcome before logging the activity.");
      return;
    }
    setActivitySubmitting(true);
    setActivityError(null);
    try {
      const payload = {
        activity_type: activityForm.activity_type,
        outcome: activityForm.outcome,
        notes: trimmedNotes,
      };
      if (activityForm.next_follow_up_at) {
        payload.next_follow_up_at = activityForm.next_follow_up_at;
      }
      await axios.post(`/leads/${id}/activities/`, payload);
      // If user didn't set a new follow-up, clear the lead's next_follow_up_at
      if (!activityForm.next_follow_up_at) {
        try {
          await axios.patch(`/leads/${id}/`, { next_follow_up_at: null });
        } catch (err) {
          console.error("Failed to clear next follow-up on lead:", err);
        }
      }
      setActivityForm({ activity_type: "call", outcome: "", notes: "", next_follow_up_at: "" });
      fetchLead();
      fetchActivities();
      if (fetchMyLeads) fetchMyLeads(); // refresh global follow-up list so badges/timers update immediately
    } catch (err) {
      setActivityError(err.response?.data?.detail || "Failed to log activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Button variant="ghost" onClick={() => router.push("/leads")}>
          <ArrowLeft className="h-4 w-4" /> Back to leads
        </Button>
        <p className="text-destructive">{error || "Lead not found."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <Button variant="ghost" className="w-fit" onClick={() => router.push("/leads")}>
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <User className="h-6 w-6" />
                {lead.name}
              </CardTitle>
              <CardDescription>Assigned to {lead.sales_person_name ?? "—"}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="lead-status" className="text-sm text-muted-foreground">Status</Label>
                {lead.status === "enrolled" ? (
                  <span
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium",
                      "bg-green-100 text-green-800 border-green-200"
                    )}
                  >
                    Enrolled
                  </span>
                ) : (
                  <select
                    id="lead-status"
                    value={lead.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={statusSaving}
                    className={cn(
                      "rounded-md border border-input bg-background px-3 py-2 text-sm font-medium",
                      lead.status === "interested" && "bg-blue-100 text-blue-800 border-blue-200",
                      (lead.status === "not_interested" || lead.status === "wrong_number") && "bg-gray-100 text-gray-700 border-gray-200",
                      lead.status === "new" && "bg-amber-100 text-amber-800 border-amber-200",
                      lead.status === "callback" && "bg-purple-100 text-purple-800 border-purple-200",
                      lead.status === "contacted" && "bg-sky-100 text-sky-800 border-sky-200"
                    )}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
                {statusSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {lead.status !== "enrolled" && (
                <Button
                  onClick={() => router.push(`/students/new?lead=${lead.id}`)}
                >
                  <UserPlus className="h-4 w-4" />
                  Enroll student
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{lead.mobile || "—"}</span>
            </div>
            {lead.email ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{lead.email}</span>
              </div>
            ) : null}
            {lead.source ? (
              <span className="text-sm text-muted-foreground">Source: {lead.source}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="flex items-center gap-2">
              Next follow-up: <FollowUpTimer followUpAt={lead.next_follow_up_at} />
            </span>
            <span className="ml-2">Last activity: {formatDateTime(lead.last_activity_at)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log activity
          </CardTitle>
          <CardDescription>Record a call or WhatsApp and set outcome.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogActivity} className="space-y-4">
            {activityError && <p className="text-sm text-destructive">{activityError}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <select
                  value={activityForm.activity_type}
                  onChange={(e) => setActivityForm((p) => ({ ...p, activity_type: e.target.value }))}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Outcome</Label>
                <select
                  value={activityForm.outcome}
                  onChange={(e) => setActivityForm((p) => ({ ...p, outcome: e.target.value }))}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                >
                  <option value="" disabled>Select outcome</option>
                  {OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Next follow-up (optional)</Label>
                <Input
                  type="datetime-local"
                  value={activityForm.next_follow_up_at}
                  onChange={(e) => setActivityForm((p) => ({ ...p, next_follow_up_at: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <textarea
                value={activityForm.notes}
                onChange={(e) => setActivityForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes (max 200 chars)"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={200}
              />
            </div>
            <Button type="submit" disabled={activitySubmitting}>
              {activitySubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Log activity
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity history
          </CardTitle>
          <CardDescription>All contacts and follow-ups for this lead, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 text-center">
              <Activity className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-foreground">No activities yet</p>
              <p className="text-xs text-muted-foreground">Log a call or message above to start the timeline.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-2 bottom-2 w-px bg-border" aria-hidden />
              <ul className="space-y-0">
                {activities.map((a) => {
                  const Icon = getActivityIcon(a.activity_type);
                  return (
                    <li key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-primary shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                            {a.activity_type?.replace(/_/g, " ") ?? "—"}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {a.outcome?.replace(/_/g, " ") ?? "—"}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatActivityDate(a.activity_at)}
                          </span>
                          {a.sales_person_name && (
                            <span className="text-xs text-muted-foreground">· {a.sales_person_name}</span>
                          )}
                        </div>
                        {a.notes ? (
                          <div className="mt-2 max-h-32 overflow-y-auto rounded-md bg-muted/20 px-3 py-2 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                            {a.notes}
                          </div>
                        ) : null}
                        {a.next_follow_up_at ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            Next follow-up: {formatDateTime(a.next_follow_up_at)}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
