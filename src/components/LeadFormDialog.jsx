"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import axios from "@/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, User, Phone, Mail, Share2, Calendar, Activity, X, AlertCircle, CheckCircle2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Select status" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "callback", label: "Callback" },
  { value: "wrong_number", label: "Wrong Number" },
];

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  source: "",
  status: "",
  next_follow_up_at: "",
};

export function LeadFormDialog({ open, onClose, lead = null, currentUserId, onSuccess }) {
  const isEdit = !!lead;
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (lead) {
        setForm({
          name: lead.name ?? "",
          mobile: lead.mobile ?? "",
          email: lead.email ?? "",
          source: lead.source ?? "",
          status: lead.status ?? "new",
          next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : "",
        });
      } else {
        setForm(initialForm);
      }
      setErrors({});
    }
  }, [open, lead]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

const validateForm = () => {
  const nextErrors = {};
  if (!(form.name || "").trim()) nextErrors.name = "Name is required.";
  const mobileDigits = normalizeMobile(form.mobile);
  if (!mobileDigits) nextErrors.mobile = "Mobile is required.";
  else if (mobileDigits.length !== 10) nextErrors.mobile = "Mobile must be exactly 10 digits.";
  const email = (form.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email.";
  if (!(form.source || "").trim()) nextErrors.source = "Source is required.";
  if (!(form.status || "").trim()) nextErrors.status = "Status is required.";
   if (form.next_follow_up_at) {
     const dt = new Date(form.next_follow_up_at);
     if (isNaN(dt.getTime())) nextErrors.next_follow_up_at = "Enter a valid date/time.";
     else if (dt.getTime() <= Date.now()) nextErrors.next_follow_up_at = "Next follow-up must be in the future.";
   }
  setErrors(nextErrors);
  return Object.keys(nextErrors).length === 0;
};

  const getPayload = () => {
    const payload = {
      name: (form.name || "").trim(),
      mobile: normalizeMobile(form.mobile),
      email: (form.email || "").trim(),
      source: (form.source || "").trim(),
    };
    if (!(isEdit && lead?.status === "enrolled")) {
      payload.status = form.status;
    }
    if (isEdit) {
      payload.sales_person = lead.sales_person;
    } else {
      payload.sales_person = currentUserId;
    }
    if (form.next_follow_up_at) payload.next_follow_up_at = form.next_follow_up_at;
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const payload = getPayload();
      if (isEdit) {
        await axios.put(`/leads/${lead.id}/`, payload);
      } else {
        await axios.post("/leads/", payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object" && !data.detail) {
        const normalized = {};
        for (const [k, v] of Object.entries(data)) {
          normalized[k] = Array.isArray(v) ? v[0] : v;
        }
        setErrors(normalized);
      } else {
        setErrors({ submit: data?.detail || "Something went wrong." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex min-w-0 items-center justify-center overflow-x-hidden p-4">
        <Dialog.Panel className="mx-auto w-full max-w-xl rounded-2xl border bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Decorative Header */}
          <div className="bg-primary/5 px-6 py-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  {isEdit ? "Refine Lead" : "Add New Lead"}
                </Dialog.Title>
                <p className="text-sm text-muted-foreground">
                  {isEdit ? "Update prospect details and status." : "Capture new interested student details."}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
            {errors.submit && (
              <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{errors.submit}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="name" className="text-xs font-semibold text-gray-700 uppercase">Lead Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Full name of student"
                    className={cn("pl-10 h-11", errors.name && "border-destructive ring-destructive")}
                  />
                </div>
                {errors.name && <p className="text-[10px] font-bold text-destructive uppercase">{errors.name}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mobile" className="text-xs font-semibold text-gray-700 uppercase">Mobile Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="mobile"
                    value={form.mobile}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) => handleChange("mobile", normalizeMobile(e.target.value))}
                    placeholder="10-digit number"
                    className={cn("pl-10 h-11", errors.mobile && "border-destructive ring-destructive")}
                  />
                </div>
                {errors.mobile && <p className="text-[10px] font-bold text-destructive uppercase">{errors.mobile}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700 uppercase">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="student@example.com"
                    className={cn("pl-10 h-11", errors.email && "border-destructive ring-destructive")}
                  />
                </div>
                {errors.email && <p className="text-[10px] font-bold text-destructive uppercase">{errors.email}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="source" className="text-xs font-semibold text-gray-700 uppercase">Inquiry Source *</Label>
                <div className="relative">
                  <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="source"
                    value={form.source}
                    onChange={(e) => handleChange("source", e.target.value)}
                    placeholder="Website, Referral, etc."
                    className={cn("pl-10 h-11", errors.source && "border-destructive ring-destructive")}
                  />
                </div>
                {errors.source && <p className="text-[10px] font-bold text-destructive uppercase">{errors.source}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status" className="text-xs font-semibold text-gray-700 uppercase">Relationship Status *</Label>
                {isEdit && lead?.status === "enrolled" ? (
                  <div className="relative">
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    <Input value="Enrolled" disabled className="pl-10 h-11 bg-green-50 text-green-700 border-green-100 font-bold" />
                  </div>
                ) : (
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className={cn(
                      "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      errors.status ? "border-destructive" : "border-input"
                    )}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                )}
                {errors.status && <p className="text-[10px] font-bold text-destructive uppercase">{errors.status}</p>}
              </div>

              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="next_follow_up_at" className="text-xs font-semibold text-gray-700 uppercase">Next Engagement Schedule</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="next_follow_up_at"
                    type="datetime-local"
                    value={form.next_follow_up_at}
                    onChange={(e) => handleChange("next_follow_up_at", e.target.value)}
                    className={cn("pl-10 h-11", errors.next_follow_up_at && "border-destructive ring-destructive")}
                  />
                </div>
                {errors.next_follow_up_at && <p className="text-[10px] font-bold text-destructive uppercase">{errors.next_follow_up_at}</p>}
              </div>
            </div>

            {!isEdit && (
              <div className="mt-6 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Note: This lead will be automatically assigned to you. You can track progress in your personal dashboard.
                </p>
              </div>
            )}

            <div className="mt-10 flex items-center justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="px-6 h-11 font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="px-10 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : isEdit ? "Update Lead" : "Capture Lead"}
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
