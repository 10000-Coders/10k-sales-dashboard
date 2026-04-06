"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import axios from "@/axios";
import baseAxios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, User, Mail, Phone, Shield, Lock, Share2, X, CheckCircle2, AlertCircle } from "lucide-react";

// Hierarchy: Manager > Super Admin > Admin > Counselor
const ROLES = [
  { value: "manager", label: "Manager" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "counselor", label: "Counselor" },
];

const STATUSES = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Blocked", label: "Blocked" },
];

const ROLE_VALUES = new Set(ROLES.map((r) => r.value));
const STATUS_VALUES = new Set(STATUSES.map((s) => s.value));

function normalizeMobile(val) {
  if (!val) return "";
  return String(val).replace(/\D/g, "");
}

function validateSalesPersonForm(form, isEdit) {
  const err = {};
  const name = (form.name || "").trim();
  if (!name) err.name = "Name is required.";
  else if (name.length < 2) err.name = "Name must be at least 2 characters.";

  const email = (form.email || "").trim().toLowerCase();
  if (!email) err.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = "Enter a valid email address.";

  const personalDigits = normalizeMobile(form.personal_mobile);
  if (!personalDigits) err.personal_mobile = "Personal mobile is required.";
  else if (personalDigits.length !== 10) err.personal_mobile = "Personal mobile must be 10 digits.";

  const companyDigits = normalizeMobile(form.company_mobile);
  if (!companyDigits) err.company_mobile = "Company mobile is required.";
  else if (companyDigits.length !== 10) err.company_mobile = "Company mobile must be 10 digits.";

  if (!isEdit) {
    const pwd = (form.password || "").trim();
    if (!pwd) err.password = "Password is required.";
    else if (pwd.length < 6) err.password = "Password must be at least 6 characters.";
  } else if ((form.password || "").trim() && (form.password || "").trim().length < 6) {
    err.password = "Password must be at least 6 characters.";
  }

  if (!form.role || !ROLE_VALUES.has(form.role)) err.role = "Role is required.";
  if (!form.status || !STATUS_VALUES.has(form.status)) err.status = "Status is required.";

  return err;
}

const initialForm = {
  name: "",
  email: "",
  personal_mobile: "",
  company_mobile: "",
  password: "",
  role: "counselor",
  status: "Active",
  referred_by_name: "",
};

export function SalesPersonFormDialog({
  open,
  onClose,
  person = null,
  persons = [],
  onSuccess,
  getHeaders,
}) {
  const isEdit = !!person;
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [mobileSent, setMobileSent] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [mobileCooldown, setMobileCooldown] = useState(0);
  const [otpError, setOtpError] = useState({});
  const [sending, setSending] = useState({ email: false, mobile: false });
  const [verifying, setVerifying] = useState({ email: false, mobile: false });
  const [originalEmail, setOriginalEmail] = useState("");
  const [originalMobile, setOriginalMobile] = useState("");

  useEffect(() => {
    if (open) {
      if (person) {
        setForm({
          name: person.name ?? "",
          email: person.email ?? "",
          personal_mobile: person.personal_mobile ?? "",
          company_mobile: person.company_mobile ?? "",
          password: "",
          role: person.role ?? "counselor",
          status: person.status ?? "Active",
          referred_by_name: person.referral_source ?? "",
        });
      } else {
        setForm(initialForm);
      }
      setErrors({});
      setEmailOtp("");
      setMobileOtp("");
      setEmailSent(false);
      setMobileSent(false);
      setOtpError({});
      setEmailCooldown(0);
      setMobileCooldown(0);
      const emailVal = person?.email ?? "";
      const mobileVal = person?.personal_mobile ?? "";
      setOriginalEmail(emailVal);
      setOriginalMobile(mobileVal);
      setEmailVerified(!!person); // assume existing records are already verified
      setMobileVerified(!!person);
    }
  }, [open, person]);

  // cooldown timers
  useEffect(() => {
    if (!emailCooldown) return;
    const t = setInterval(() => setEmailCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (!mobileCooldown) return;
    const t = setInterval(() => setMobileCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [mobileCooldown]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "email") {
      setEmailVerified(false);
      setEmailOtp("");
      setEmailSent(false);
    }
    if (field === "personal_mobile") {
      setMobileVerified(false);
      setMobileOtp("");
      setMobileSent(false);
    }
  };

  const sendOtp = async (channel) => {
    setOtpError((p) => ({ ...p, [channel]: null }));
    const headers = typeof getHeaders === "function" ? getHeaders() : {};
    const mentorUrl = (path) => {
      const base = (process.env.NEXT_PUBLIC_baseUrl || "").replace(/\/+$/, "");
      const cleanPath = path.replace(/^\/+/, ""); // e.g. api/mentor/otp/send/
      // If base already ends with /api and path begins with api/, avoid double api
      if (base.endsWith("/api") && cleanPath.startsWith("api/")) {
        return `${base}/${cleanPath.replace(/^api\//, "")}`; // drop one api
      }
      return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
    };
    if (channel === "email") {
      const email = (form.email || "").trim().toLowerCase();
      if (!email) {
        setErrors((prev) => ({ ...prev, email: "Email is required." }));
        setOtpError((p) => ({ ...p, email: "Enter email first." }));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setErrors((prev) => ({ ...prev, email: "Enter a valid email address." }));
        setOtpError((p) => ({ ...p, email: "Provide a valid email before sending." }));
        return;
      }
      setSending((p) => ({ ...p, email: true }));
      try {
        await baseAxios.post(mentorUrl("/api/mentor/otp/send/"), { channel: "email", email }, { headers });
        setEmailCooldown(30);
        setEmailSent(true);
      } catch (err) {
        const data = err.response?.data;
        setOtpError((p) => ({ ...p, email: data?.error || "Failed to send email OTP." }));
      } finally {
        setSending((p) => ({ ...p, email: false }));
      }
    } else if (channel === "mobile") {
      const mobile = normalizeMobile(form.personal_mobile);
      if (mobile.length !== 10) {
        setOtpError((p) => ({ ...p, mobile: "Enter 10-digit personal mobile first." }));
        return;
      }
      setSending((p) => ({ ...p, mobile: true }));
      try {
        await baseAxios.post(mentorUrl("/api/mentor/otp/send/"), { channel: "mobile", mobile }, { headers });
        setMobileCooldown(30);
        setMobileSent(true);
      } catch (err) {
        const data = err.response?.data;
        setOtpError((p) => ({ ...p, mobile: data?.error || "Failed to send mobile OTP." }));
      } finally {
        setSending((p) => ({ ...p, mobile: false }));
      }
    }
  };

  const verifyOtp = async (channel) => {
    setOtpError((p) => ({ ...p, [channel]: null }));
    const headers = typeof getHeaders === "function" ? getHeaders() : {};
    const mentorUrl = (path) => {
      const base = (process.env.NEXT_PUBLIC_baseUrl || "").replace(/\/+$/, "");
      const cleanPath = path.replace(/^\/+/, "");
      if (base.endsWith("/api") && cleanPath.startsWith("api/")) {
        return `${base}/${cleanPath.replace(/^api\//, "")}`;
      }
      return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
    };
    if (channel === "email") {
      const email = (form.email || "").trim().toLowerCase();
      if (!email) {
        setOtpError((p) => ({ ...p, email: "Enter email first." }));
        return;
      }
      if (!emailOtp.trim()) {
        setOtpError((p) => ({ ...p, email: "Enter OTP to verify." }));
        return;
      }
    setVerifying((p) => ({ ...p, email: true }));
    try {
      await baseAxios.post(mentorUrl("/api/mentor/otp/verify/"), { channel: "email", email, otp: emailOtp.trim() }, { headers });
      setEmailVerified(true);
      setEmailSent(true);
    } catch (err) {
      const data = err.response?.data;
      setOtpError((p) => ({ ...p, email: data?.error || "Email OTP verification failed." }));
        setEmailVerified(false);
      } finally {
        setVerifying((p) => ({ ...p, email: false }));
      }
    } else if (channel === "mobile") {
      const mobile = normalizeMobile(form.personal_mobile);
      if (mobile.length !== 10) {
        setOtpError((p) => ({ ...p, mobile: "Enter 10-digit personal mobile first." }));
        return;
      }
      if (!mobileOtp.trim()) {
        setOtpError((p) => ({ ...p, mobile: "Enter OTP to verify." }));
        return;
      }
    setVerifying((p) => ({ ...p, mobile: true }));
    try {
      await baseAxios.post(mentorUrl("/api/mentor/otp/verify/"), { channel: "mobile", mobile, otp: mobileOtp.trim() }, { headers });
      setMobileVerified(true);
      setMobileSent(true);
    } catch (err) {
      const data = err.response?.data;
      setOtpError((p) => ({ ...p, mobile: data?.error || "Mobile OTP verification failed." }));
        setMobileVerified(false);
      } finally {
        setVerifying((p) => ({ ...p, mobile: false }));
      }
    }
  };

  const getPayload = () => {
    const payload = {
      name: (form.name || "").trim(),
      email: (form.email || "").trim().toLowerCase(),
      personal_mobile: (form.personal_mobile || "").trim(),
      company_mobile: (form.company_mobile || "").trim(),
      role: form.role,
      status: form.status,
      referred_by: null,
      referral_code: "",
      referral_source: (form.referred_by_name || "").trim(),
    };
    if (!isEdit && form.password) payload.password = form.password;
    if (isEdit && (form.password || "").trim()) payload.password = form.password.trim();
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const validationErrors = validateSalesPersonForm(form, isEdit);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (!emailVerified) {
      setErrors({ submit: "Verify email via OTP before submitting." });
      return;
    }
    if (!mobileVerified) {
      setErrors({ submit: "Verify personal mobile via OTP before submitting." });
      return;
    }
    setSubmitting(true);
    try {
      const payload = getPayload();
      const headers = typeof getHeaders === "function" ? getHeaders() : {};
      if (isEdit) {
        await axios.put(`/persons/${person.id}/`, payload, { headers });
      } else {
        await axios.post("/persons/", payload, { headers });
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
      <div className="fixed inset-0 flex min-w-0 items-center justify-center overflow-x-hidden p-4 md:p-6">
        <Dialog.Panel className="mx-auto w-full max-w-5xl rounded-3xl border bg-white shadow-2xl overflow-hidden max-h-[90vh]">
          {/* Decorative Header */}
          <div className="bg-primary/5 px-6 py-6 border-b flex items-center justify-between md:px-8 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  {isEdit ? "Edit Personnel" : "Add New Sales Person"}
                </Dialog.Title>
                <p className="text-sm text-muted-foreground">
                  {isEdit ? "Update account details and permissions." : "Create a new account for your sales team."}
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

          <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto max-h-[calc(90vh-96px)]">
            {errors.submit && (
              <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{errors.submit}</p>
              </div>
            )}
            <div className="space-y-8">
              {/* Account basics first */}
              <section className="rounded-2xl border border-gray-100 bg-white/70 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Account basics</h3>
                <div className="grid gap-6 md:grid-cols-2 md:items-start">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-xs font-medium text-gray-700 uppercase">Full name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="John Doe"
                        className={cn("pl-10 h-11", errors.name && "border-destructive ring-destructive")}
                      />
                    </div>
                    {errors.name && <p className="text-[11px] font-medium text-destructive">{errors.name}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-xs font-medium text-gray-700 uppercase">
                      {isEdit ? "New password (optional)" : "Account password *"}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        placeholder={isEdit ? "Leave blank to keep current" : "Min 6 characters"}
                        className={cn("pl-10 h-11", errors.password && "border-destructive ring-destructive")}
                      />
                    </div>
                    {errors.password && <p className="text-[11px] font-medium text-destructive">{errors.password}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role" className="text-xs font-medium text-gray-700 uppercase">System role</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        id="role"
                        value={form.role}
                        onChange={(e) => handleChange("role", e.target.value)}
                        className={cn(
                          "h-11 w-full rounded-md border bg-background py-2 pl-10 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          errors.role ? "border-destructive" : "border-input"
                        )}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status" className="text-xs font-medium text-gray-700 uppercase">Lifecycle status</Label>
                    <select
                      id="status"
                      value={form.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                      className={cn(
                        "flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        errors.status ? "border-destructive" : "border-input"
                      )}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="company_mobile" className="text-xs font-medium text-gray-700 uppercase">Company mobile *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="company_mobile"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.company_mobile}
                        onChange={(e) => {
                          const digits = normalizeMobile(e.target.value).slice(0, 10);
                          handleChange("company_mobile", digits);
                        }}
                        placeholder="Official company number"
                        className={cn("pl-10 h-11", errors.company_mobile && "border-destructive ring-destructive")}
                      />
                    </div>
                    {errors.company_mobile && <p className="text-[11px] font-medium text-destructive">{errors.company_mobile}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="referred_by_name" className="text-xs font-medium text-gray-700 uppercase">Referred by</Label>
                    <div className="relative">
                      <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="referred_by_name"
                        value={form.referred_by_name}
                        onChange={(e) => handleChange("referred_by_name", e.target.value)}
                        placeholder="Referral name or source"
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact moved to bottom */}
              <section className="rounded-2xl border border-gray-100 bg-white/70 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact & verification</h3>
                <div className="grid gap-6 md:grid-cols-2 md:items-start">
                  {/* Personal mobile + OTP */}
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="personal_mobile" className="text-xs font-medium text-gray-700 uppercase">Personal mobile *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="personal_mobile"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={form.personal_mobile}
                          onChange={(e) => {
                            const digits = normalizeMobile(e.target.value).slice(0, 10);
                            handleChange("personal_mobile", digits);
                          }}
                          placeholder="10 digit personal number"
                          className={cn("pl-10 h-11", errors.personal_mobile && "border-destructive ring-destructive")}
                        />
                      </div>
                      {errors.personal_mobile && <p className="text-[11px] font-medium text-destructive">{errors.personal_mobile}</p>}
                    </div>

                    {!isEdit && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-gray-700">Mobile verification</span>
                          <div className="flex items-center gap-2">
                            {mobileVerified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                                <CheckCircle2 className="h-4 w-4" /> Verified
                              </span>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 px-4"
                              variant="secondary"
                              disabled={sending.mobile || mobileCooldown > 0 || mobileVerified || verifying.mobile}
                              onClick={() => sendOtp("mobile")}
                            >
                              {sending.mobile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {mobileVerified
                                ? "Verified"
                                : mobileCooldown > 0
                                ? `Resend in ${mobileCooldown}s`
                                : mobileSent
                                ? "Resend code"
                                : "Send code"}
                            </Button>
                          </div>
                        </div>

                        {mobileSent && !mobileVerified && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Input
                              placeholder="Enter OTP"
                              value={mobileOtp}
                              onChange={(e) => setMobileOtp(e.target.value)}
                              disabled={verifying.mobile}
                              className="h-9 w-32 text-sm"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 px-4"
                              disabled={verifying.mobile || !mobileOtp}
                              onClick={() => verifyOtp("mobile")}
                            >
                              {verifying.mobile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                            {mobileCooldown > 0 && (
                              <span className="text-[11px] font-medium text-gray-500">Resend in {mobileCooldown}s</span>
                            )}
                          </div>
                        )}

                        {!mobileSent && !mobileVerified && (
                          <p className="text-[11px] font-medium text-gray-600">Send a code to verify this mobile number.</p>
                        )}
                        {otpError.mobile && <p className="text-[11px] font-medium text-destructive">{otpError.mobile}</p>}
                      </div>
                    )}
                  </div>

                  {/* Email with OTP */}
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-xs font-medium text-gray-700 uppercase">Email address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                          placeholder="email@example.com"
                          disabled={isEdit}
                          className={cn("pl-10 h-11", errors.email && "border-destructive ring-destructive")}
                        />
                      </div>
                      {errors.email && <p className="text-[11px] font-medium text-destructive">{errors.email}</p>}
                    </div>

                    {!isEdit && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-gray-700">Email verification</span>
                          <div className="flex items-center gap-2">
                            {emailVerified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                                <CheckCircle2 className="h-4 w-4" /> Verified
                              </span>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 px-4"
                              variant="secondary"
                              disabled={sending.email || emailCooldown > 0 || emailVerified || verifying.email}
                              onClick={() => sendOtp("email")}
                            >
                              {sending.email ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              {emailVerified
                                ? "Verified"
                                : emailCooldown > 0
                                ? `Resend in ${emailCooldown}s`
                                : emailSent
                                ? "Resend code"
                                : "Send code"}
                            </Button>
                          </div>
                        </div>

                        {emailSent && !emailVerified && (
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Input
                              placeholder="Enter OTP"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value)}
                              disabled={verifying.email}
                              className="h-9 w-32 text-sm"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 px-4"
                              disabled={verifying.email || !emailOtp}
                              onClick={() => verifyOtp("email")}
                            >
                              {verifying.email ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                            {emailCooldown > 0 && (
                              <span className="text-[11px] font-medium text-gray-500">Resend in {emailCooldown}s</span>
                            )}
                          </div>
                        )}

                        {!emailSent && !emailVerified && (
                          <p className="text-[11px] font-medium text-gray-600">Send a code to verify this email.</p>
                        )}
                        {otpError.email && <p className="text-[11px] font-medium text-destructive">{otpError.email}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t pt-6 md:flex-row md:items-center md:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="px-6 h-11 font-semibold text-gray-500 hover:text-gray-700"
              >
                Discard Changes
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="px-10 h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : isEdit ? "Update Personnel" : "Create Account"}
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
