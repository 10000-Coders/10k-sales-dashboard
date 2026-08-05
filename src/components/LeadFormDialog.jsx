"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog } from "@headlessui/react";
import Select from "react-select";
import axios from "@/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formSelectStyles, formSelectMenuPortalTarget } from "@/lib/reactSelectStyles";
import { Loader2, User, Phone, Mail, Share2, Calendar, Activity, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { inquirySourceOptionsForValue } from "@/constants/leadInquirySource";
import { LEAD_COURSE_VALUES, LEAD_RELATED_VALUES, normalizeLeadRelatedValue } from "@/constants/leadCourse";
import { LEAD_STATUS_FORM_OPTIONS, statusRequiresFollowUp } from "@/constants/leadStatus";
import { getAllStudents, getAllBatchNames } from "@/utils/referrialApis";

const STATUS_OPTIONS = LEAD_STATUS_FORM_OPTIONS;

function normalizeMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  source: "",
  referrer: "",
  referred_by_name: "",
  referred_by_batch: "",
  status: "",
  course: "",
  is_related: "none",
  next_follow_up_at: "",
};

export function LeadFormDialog({ open, onClose, lead = null, currentUserId, onSuccess }) {
  const isEdit = !!lead;
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [batchOptions, setBatchOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const studentSearchDebounceRef = useRef(null);
  const isFriendSource = (form.source || "").trim().toLowerCase() === "friend";

  const batchSelectOptions = useMemo(
    () => batchOptions.map((name) => ({ value: name, label: name })),
    [batchOptions]
  );

  const selectedBatchOption = useMemo(
    () => batchSelectOptions.find((o) => o.value === form.referred_by_batch) || null,
    [batchSelectOptions, form.referred_by_batch]
  );

  const studentSelectOptions = useMemo(
    () =>
      studentOptions.map((student) => ({
        value: String(student.id),
        label: `${student.student_name}${student.batch_name ? ` - ${student.batch_name}` : ""}`,
      })),
    [studentOptions]
  );

  const selectedStudentOption = useMemo(
    () => studentSelectOptions.find((o) => o.value === String(form.referrer)) || null,
    [studentSelectOptions, form.referrer]
  );

  useEffect(() => {
    if (open) {
      if (lead) {
        setForm({
          name: lead.name ?? "",
          mobile: lead.mobile ?? "",
          email: lead.email ?? "",
          source: lead.source ?? "",
          referrer: lead.referrer ?? "",
          referred_by_name: lead.referred_by_name ?? "",
          referred_by_batch: lead.referred_by_batch ?? "",
          status: lead.status ?? "new",
          course: lead.course ?? "",
          is_related: normalizeLeadRelatedValue(lead.is_related),
          next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : "",
        });
      } else {
        setForm(initialForm);
      }
      setErrors({});
      setStudentSearch("");
    }
  }, [open, lead]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const batches = await getAllBatchNames();
        if (!cancelled) setBatchOptions(batches);
      } catch {
        if (!cancelled) setBatchOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isFriendSource) return;
    const selectedBatch = (form.referred_by_batch || "").trim();
    if (!selectedBatch) {
      setStudentOptions([]);
      setStudentSearch("");
      return;
    }

    if (studentSearchDebounceRef.current) {
      clearTimeout(studentSearchDebounceRef.current);
    }

    let cancelled = false;
    studentSearchDebounceRef.current = setTimeout(() => {
      setStudentsLoading(true);
      (async () => {
        try {
          const response = await getAllStudents({
            page: 1,
            page_size: 100,
            mode: "All",
            batches: [selectedBatch],
            search: studentSearch.trim(),
            sort_by: "student_name",
            sort_order: "asc",
          });
          const payload = response || {};
          const rows = Array.isArray(payload?.data?.results) ? payload.data.results : [];
          const mapped = rows.map((student) => ({
            id: student.id,
            student_name: student.student_name || "",
            batch_name: student.batch_name || selectedBatch,
          }));
          if (!cancelled) {
            if (
              isEdit &&
              lead?.referrer &&
              lead?.referred_by_name &&
              !mapped.some((s) => String(s.id) === String(lead.referrer))
            ) {
              mapped.unshift({
                id: lead.referrer,
                student_name: lead.referred_by_name,
                batch_name: lead.referred_by_batch || selectedBatch,
              });
            }
            setStudentOptions(mapped);
          }
        } catch {
          if (!cancelled) setStudentOptions([]);
        } finally {
          if (!cancelled) setStudentsLoading(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      if (studentSearchDebounceRef.current) {
        clearTimeout(studentSearchDebounceRef.current);
      }
    };
  }, [open, isFriendSource, form.referred_by_batch, studentSearch, isEdit, lead]);

  const handleChange = (field, value) => {
    if (field === "source" && String(value || "").trim().toLowerCase() !== "friend") {
      setStudentSearch("");
      setForm((prev) => ({
        ...prev,
        source: value,
        referrer: "",
        referred_by_name: "",
        referred_by_batch: "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
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
  if (isFriendSource && !email) nextErrors.email = "Email is required for Friend source.";
  if (!(form.source || "").trim()) nextErrors.source = "Source is required.";
  if (isFriendSource) {
    if (!(form.referred_by_batch || "").trim()) nextErrors.referred_by_batch = "Batch is required.";
    if (!form.referrer) nextErrors.referrer = "Student name is required.";
  }
  if (!(form.status || "").trim()) nextErrors.status = "Status is required.";
   if (form.next_follow_up_at) {
     const dt = new Date(form.next_follow_up_at);
     if (isNaN(dt.getTime())) nextErrors.next_follow_up_at = "Enter a valid date/time.";
     else if (dt.getTime() <= Date.now()) nextErrors.next_follow_up_at = "Next follow-up must be in the future.";
   } else if (statusRequiresFollowUp(form.status)) {
     nextErrors.next_follow_up_at = "Next follow-up date is required for this status.";
   }
  setErrors(nextErrors);
  return Object.keys(nextErrors).length === 0;
};

  const getPayload = () => {
    const payload = {
      name: (form.name || "").trim(),
      mobile: normalizeMobile(form.mobile),
      email: (form.email || "").trim(),
      // Source dropdown is disabled on edit; still send existing value so PUT keeps it.
      source: (form.source || "").trim(),
      course: (form.course || "").trim(),
      is_related: normalizeLeadRelatedValue(form.is_related),
    };
    if (isFriendSource) {
      payload.referrer = form.referrer ? Number(form.referrer) : null;
      payload.referred_by_name = (form.referred_by_name || "").trim();
      payload.referred_by_batch = (form.referred_by_batch || "").trim();
    } else {
      payload.referred_by_name = "";
      payload.referred_by_batch = "";
    }
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
                  <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <select
                    id="source"
                    value={form.source}
                    onChange={(e) => handleChange("source", e.target.value)}
                    disabled={isEdit}
                    title={isEdit ? "Inquiry source cannot be changed after the lead is created" : undefined}
                    className={cn(
                      "flex h-11 w-full rounded-md border bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isEdit && "cursor-not-allowed opacity-70",
                      errors.source ? "border-destructive" : "border-input"
                    )}
                  >
                    {inquirySourceOptionsForValue(form.source).map((opt) => (
                      <option key={opt.value || "empty"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isEdit ? (
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Source cannot be changed when updating a lead</p>
                ) : errors.source ? (
                  <p className="text-[10px] font-bold text-destructive uppercase">{errors.source}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="course" className="text-xs font-semibold text-gray-700 uppercase">Interested Course</Label>
                <select
                  id="course"
                  value={form.course}
                  onChange={(e) => handleChange("course", e.target.value)}
                  className={cn(
                    "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    errors.course ? "border-destructive" : "border-input"
                  )}
                >
                  <option value="">Select course (optional)</option>
                  {LEAD_COURSE_VALUES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.course && <p className="text-[10px] font-bold text-destructive uppercase">{errors.course}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="is_related" className="text-xs font-semibold text-gray-700 uppercase">Related type</Label>
                <select
                  id="is_related"
                  value={form.is_related || "none"}
                  onChange={(e) => handleChange("is_related", e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {LEAD_RELATED_VALUES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {isFriendSource && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="referred_by_batch" className="text-xs font-semibold text-gray-700 uppercase">Referred By Batch *</Label>
                    <Select
                      inputId="referred_by_batch"
                      options={batchSelectOptions}
                      value={selectedBatchOption}
                      onChange={(option) => {
                        const value = option?.value || "";
                        setForm((prev) => ({
                          ...prev,
                          referred_by_batch: value,
                          referrer: "",
                          referred_by_name: "",
                        }));
                        setStudentSearch("");
                        setErrors((prev) => ({
                          ...prev,
                          referred_by_batch: undefined,
                          referrer: undefined,
                        }));
                      }}
                      styles={formSelectStyles}
                      error={!!errors.referred_by_batch}
                      isSearchable
                      isClearable
                      openMenuOnFocus
                      placeholder="select batch"
                      menuPortalTarget={formSelectMenuPortalTarget}
                      menuPosition="fixed"
                      noOptionsMessage={() => "No batch found"}
                    />
                    {errors.referred_by_batch && <p className="text-[10px] font-bold text-destructive uppercase">{errors.referred_by_batch}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referrer" className="text-xs font-semibold text-gray-700 uppercase">Referred By Name *</Label>
                    <Select
                      inputId="referrer"
                      options={studentSelectOptions}
                      value={selectedStudentOption}
                      onChange={(option) => {
                        const value = option?.value || "";
                        const selected = studentOptions.find((s) => String(s.id) === String(value));
                        setForm((prev) => ({
                          ...prev,
                          referrer: value,
                          referred_by_name: selected?.student_name || "",
                          referred_by_batch: selected?.batch_name || prev.referred_by_batch,
                        }));
                        setStudentSearch("");
                        setErrors((prev) => ({ ...prev, referrer: undefined }));
                      }}
                      onInputChange={(inputValue, { action }) => {
                        if (action === "input-change") {
                          setStudentSearch(inputValue);
                        } else if (action === "menu-close" || action === "set-value") {
                          setStudentSearch("");
                        }
                        return inputValue;
                      }}
                      filterOption={() => true}
                      styles={formSelectStyles}
                      error={!!errors.referrer}
                      isSearchable
                      isClearable
                      isDisabled={!form.referred_by_batch}
                      isLoading={studentsLoading}
                      openMenuOnFocus
                      placeholder={
                        !form.referred_by_batch
                          ? "Select a batch first"
                          : "select student"
                      }
                      menuPortalTarget={formSelectMenuPortalTarget}
                      menuPosition="fixed"
                      noOptionsMessage={() =>
                        studentsLoading ? "Loading..." : "No students in this batch"
                      }
                    />
                    {errors.referrer && <p className="text-[10px] font-bold text-destructive uppercase">{errors.referrer}</p>}
                  </div>
                </>
              )}

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
                <Label htmlFor="next_follow_up_at" className="text-xs font-semibold text-gray-700 uppercase">
                  Next Engagement Schedule
                  {statusRequiresFollowUp(form.status) && <span className="ml-1 text-destructive">*</span>}
                </Label>
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
