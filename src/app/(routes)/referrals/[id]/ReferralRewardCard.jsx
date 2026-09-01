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
import { ImageDropzone } from "@/components/ImageDropzone";
import { Loader2, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const REWARD_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "cash", label: "Cash" },
  { value: "voucher", label: "Voucher" },
  { value: "gadget", label: "Gadget" },
  { value: "merchandise", label: "Merchandise" },
  { value: "other", label: "Other" },
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

function hasRewardData(reward) {
  return Boolean(
    reward &&
      ((reward.reward_status && reward.reward_status !== "pending") ||
        (reward.reward_type && String(reward.reward_type).trim()) ||
        (reward.reward_value != null && reward.reward_value !== "") ||
        (reward.reward_label && String(reward.reward_label).trim()) ||
        (reward.reward_notes && String(reward.reward_notes).trim()))
  );
}

export default function ReferralRewardCard({
  referralId,
  reward,
  isManagerRole,
  onRewardChange,
  onError,
}) {
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    reward_status: "",
    reward_type: "",
    reward_label: "",
    reward_value: "",
    reward_notes: "",
  });
  const [rewardProofFile, setRewardProofFile] = useState(null);
  const [rewardErrors, setRewardErrors] = useState({});
  const [rewardEditOpen, setRewardEditOpen] = useState(false);

  useEffect(() => {
    setRewardForm({
      reward_status: reward?.reward_status ?? "",
      reward_type: reward?.reward_type ?? "",
      reward_label: reward?.reward_label ?? "",
      reward_value: reward?.reward_value != null ? String(reward.reward_value) : "",
      reward_notes: reward?.reward_notes ?? "",
    });
    setRewardProofFile(null);
    setRewardErrors({});
    setRewardEditOpen(false);
  }, [
    reward?.reward_status,
    reward?.reward_type,
    reward?.reward_label,
    reward?.reward_value,
    reward?.reward_notes,
    reward?.reward_proof,
  ]);

  const rewardGiven = reward?.reward_status === "processed";
  const showCard = useMemo(() => reward != null && (isManagerRole || rewardGiven), [reward, isManagerRole, rewardGiven]);

  const validateRewardForm = () => {
    const nextErrors = {};
    if (!rewardForm.reward_status) nextErrors.reward_status = "Reward status is required.";
    if (!rewardForm.reward_type) nextErrors.reward_type = "Reward type is required.";
    if (!(rewardForm.reward_label || "").trim()) nextErrors.reward_label = "Reward label is required.";
    if (
      rewardForm.reward_value === "" ||
      Number.isNaN(Number(rewardForm.reward_value)) ||
      Number(rewardForm.reward_value) < 0
    ) {
      nextErrors.reward_value = "Reward value is required.";
    }
    if (!rewardProofFile && !reward?.reward_proof) {
      nextErrors.reward_proof = "Reward proof is required.";
    }
    setRewardErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveReward = async () => {
    if (!referralId || !validateRewardForm()) return;

    const payload = new FormData();
    payload.append("reward_status", rewardForm.reward_status);
    payload.append("reward_type", rewardForm.reward_type);
    payload.append("reward_label", rewardForm.reward_label.trim());
    payload.append("reward_value", String(Number(rewardForm.reward_value)));
    if (rewardForm.reward_notes) payload.append("reward_notes", rewardForm.reward_notes);
    if (rewardProofFile) payload.append("reward_proof", rewardProofFile);

    try {
      setRewardSaving(true);
      onError(null);
      const { data } = await axios.patch(`/referrals/${referralId}/reward/`, payload);
      onRewardChange(data);
      setRewardErrors({});
      setRewardProofFile(null);
      setRewardEditOpen(false);
    } catch (err) {
      const apiData = err.response?.data;
      if (apiData && typeof apiData === "object" && !Array.isArray(apiData)) {
        const apiErrors = {};
        for (const [key, value] of Object.entries(apiData)) {
          const message = Array.isArray(value) ? value[0] : value;
          if (typeof message === "string") apiErrors[key] = message;
        }
        if (Object.keys(apiErrors).length > 0) setRewardErrors(apiErrors);
      }
      onError(err.response?.data?.detail || "Failed to update reward.");
    } finally {
      setRewardSaving(false);
    }
  };

  if (!showCard) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Reward
            </CardTitle>
            <CardDescription>
              {rewardGiven ? "Reward details for this referral." : "Add reward details and upload proof."}
            </CardDescription>
          </div>
          {isManagerRole && rewardGiven ? (
            <Button
              type="button"
              variant={rewardEditOpen ? "outline" : "default"}
              onClick={() => setRewardEditOpen((prev) => !prev)}
            >
              {rewardEditOpen ? "Cancel edit" : "Edit reward"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rewardGiven ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Reward status</Label>
              <p>{reward?.reward_status ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p>{reward?.reward_type ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Label</Label>
              <p>{reward?.reward_label ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Value (₹)</Label>
              <p>{reward?.reward_value != null ? `₹${reward.reward_value}` : "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Processed at</Label>
              <p>{formatDateTime(reward?.reward_processed_at)}</p>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-muted-foreground">Proof</Label>
              {reward?.reward_proof ? (
                <div className="mt-2 space-y-3">
                  <a
                    href={reward.reward_proof}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    View uploaded proof
                  </a>
                  <img
                    src={reward.reward_proof}
                    alt="Reward proof"
                    className="max-h-56 w-full max-w-md rounded-lg border object-contain"
                  />
                </div>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
        ) : null}

        {isManagerRole && (!rewardGiven || rewardEditOpen) ? (
          <div className={cn("space-y-4", rewardGiven && "border-t pt-4")}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Reward status</Label>
                <select
                  value={rewardForm.reward_status}
                  onChange={(e) => {
                    setRewardForm((prev) => ({ ...prev, reward_status: e.target.value }));
                    setRewardErrors((prev) => ({ ...prev, reward_status: undefined }));
                  }}
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                    rewardErrors.reward_status && "border-destructive"
                  )}
                >
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                </select>
                {rewardErrors.reward_status ? (
                  <p className="text-xs text-destructive">{rewardErrors.reward_status}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  value={rewardForm.reward_type}
                  onChange={(e) => {
                    setRewardForm((prev) => ({ ...prev, reward_type: e.target.value }));
                    setRewardErrors((prev) => ({ ...prev, reward_type: undefined }));
                  }}
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                    rewardErrors.reward_type && "border-destructive"
                  )}
                >
                  {REWARD_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {rewardErrors.reward_type ? (
                  <p className="text-xs text-destructive">{rewardErrors.reward_type}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Label</Label>
                <input
                  type="text"
                  value={rewardForm.reward_label}
                  onChange={(e) => {
                    setRewardForm((prev) => ({ ...prev, reward_label: e.target.value }));
                    setRewardErrors((prev) => ({ ...prev, reward_label: undefined }));
                  }}
                  placeholder="e.g. Amazon Voucher"
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                    rewardErrors.reward_label && "border-destructive"
                  )}
                />
                {rewardErrors.reward_label ? (
                  <p className="text-xs text-destructive">{rewardErrors.reward_label}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Value (₹)</Label>
                <input
                  type="number"
                  min={0}
                  value={rewardForm.reward_value}
                  onChange={(e) => {
                    setRewardForm((prev) => ({ ...prev, reward_value: e.target.value }));
                    setRewardErrors((prev) => ({ ...prev, reward_value: undefined }));
                  }}
                  placeholder="0"
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                    rewardErrors.reward_value && "border-destructive"
                  )}
                />
                {rewardErrors.reward_value ? (
                  <p className="text-xs text-destructive">{rewardErrors.reward_value}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  value={rewardForm.reward_notes}
                  onChange={(e) => setRewardForm((prev) => ({ ...prev, reward_notes: e.target.value }))}
                  placeholder="Optional notes"
                  rows={4}
                  className={cn(
                    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y ring-offset-background",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                />
              </div>

              <div className="min-w-0">
                <ImageDropzone
                  value={rewardProofFile}
                  onChange={(file) => {
                    setRewardProofFile(file);
                    setRewardErrors((prev) => ({ ...prev, reward_proof: undefined }));
                  }}
                  label="Reward proof"
                  placeholder="Upload screenshot or image proof"
                />
                {reward?.reward_proof && !rewardProofFile ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Existing proof is already attached. Upload a new image to replace it.
                  </p>
                ) : null}
                {rewardErrors.reward_proof ? (
                  <p className="mt-2 text-xs text-destructive">{rewardErrors.reward_proof}</p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="w-full md:w-auto" onClick={handleSaveReward} disabled={rewardSaving}>
                {rewardSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {rewardSaving ? "Saving…" : "Save reward"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
