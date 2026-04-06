"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Layers, User } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "enrolled", label: "Enrolled" },
  { value: "full_payment_done", label: "Full payment done" },
  { value: "reward_processed", label: "Reward processed" },
];

function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  return Number.isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export default function ReferralAssignmentCard({
  referral,
  persons,
  isManagerRole,
  isManagerOrSuper,
  headers,
  onReferralChange,
  onError,
}) {
  const [assignSaving, setAssignSaving] = useState(false);
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    setEditAssignedTo(referral?.assigned_to != null ? String(referral.assigned_to) : "");
    setEditStatus(referral?.status ?? "");
  }, [referral?.assigned_to, referral?.status]);

  const statusLocked = Boolean(referral?.referred_sales_student);
  const assignDirty = useMemo(
    () =>
      String(editAssignedTo) !== String(referral?.assigned_to ?? "") ||
      (!statusLocked && editStatus !== (referral?.status ?? "")),
    [editAssignedTo, editStatus, referral?.assigned_to, referral?.status, statusLocked]
  );

  const handleSaveAssign = async () => {
    if (!referral?.id) return;
    const payload = {};
    if (String(editAssignedTo) !== String(referral.assigned_to ?? "")) {
      payload.assigned_to = editAssignedTo ? Number(editAssignedTo) : null;
    }
    if (!statusLocked && editStatus !== referral.status) {
      payload.status = editStatus;
    }
    if (Object.keys(payload).length === 0) return;

    try {
      setAssignSaving(true);
      const { data } = await axios.patch(`/referrals/${referral.id}/`, payload, { headers });
      onError(null);
      onReferralChange(data);
    } catch (err) {
      onError(err.response?.data?.detail || "Failed to update.");
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Referrer & assignment
        </CardTitle>
        <CardDescription>
          {isManagerOrSuper
            ? "Referrer (student who shared the link). Assign to a counselor below."
            : "Referrer (student who shared the link)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label className="text-muted-foreground">Referrer</Label>
            <div className="rounded-lg border bg-muted/30 p-3">
              {referral?.referrer_name?.trim() ? (
                <>
                  <p className="font-semibold leading-snug">{referral.referrer_name.trim()}</p>
                  {referral.referrer_batch_name?.trim() ? (
                    <p className="mt-2">
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-orange-200/90 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-950">
                        <Layers className="h-3.5 w-3.5 shrink-0 text-orange-700/90" aria-hidden />
                        <span className="min-w-0 truncate tabular-nums">{referral.referrer_batch_name.trim()}</span>
                      </span>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            {referral?.referrer_email ? (
              <p className="text-sm text-muted-foreground">{referral.referrer_email}</p>
            ) : null}
          </div>
          <div>
            <Label className="text-muted-foreground">Created</Label>
            <p>{formatDateTime(referral?.created_at)}</p>
          </div>
        </div>

        {isManagerRole ? (
          <div className="grid gap-4 border-t pt-4 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] md:items-start">
            <div className="space-y-2">
              <Label>Assigned to</Label>
              <select
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <option value="">Unassigned</option>
                {persons.map((person) => (
                  <option key={person.id} value={String(person.id)}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                disabled={statusLocked}
                className={cn(
                  "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  statusLocked && "cursor-not-allowed opacity-60"
                )}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {statusLocked ? (
                <p className="text-xs text-muted-foreground">
                  Status is locked after student enrollment.
                </p>
              ) : null}
            </div>

            <div className="flex items-end md:justify-end">
              <Button
                className="w-full md:w-auto"
                onClick={handleSaveAssign}
                disabled={!assignDirty || assignSaving}
              >
                {assignSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {assignSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Assigned to</Label>
              <p>{referral?.assigned_to_name ?? "Unassigned"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <p className="capitalize">{(referral?.status ?? "").replace(/_/g, " ")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
