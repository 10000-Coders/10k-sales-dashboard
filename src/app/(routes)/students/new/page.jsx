"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import { useSalesBatches } from "@/hooks/useSalesData";
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
import { Loader2, ArrowLeft } from "lucide-react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { validateMarks, normalizeMobile } from "@/lib/studentFormValidations";
import { validateEnrollmentForm, canGenerateEnrollmentQr } from "@/lib/validateEnrollmentForm";
import { INITIAL_ENROLLMENT_FORM, COURSE_OPTIONS, COURSE_VALUES } from "@/lib/enrollmentFormConstants";
import StudentEnrollmentFields from "@/components/enrollment/StudentEnrollmentFields";
import EnrollmentQrModal from "@/components/enrollment/EnrollmentQrModal";
import { isProofScreenshotRequired, isTransactionIdRequired, paymentReceiversForMode } from "@/lib/paymentValidation";
import { QrCode } from "lucide-react";

const PAYMENT_MODE_OPTIONS = [
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
];

/** Modes that must have a receiver (bank) account selected */
const PAYMENT_MODES_NEED_RECEIVER = ["upi", "bank", "card"];

export default function NewStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("lead");
  const referralIdParam = searchParams.get("referral");
  const user = useSelector((state) => state.userAuth?.user);

  const [loadingLead, setLoadingLead] = useState(!!leadIdParam || !!referralIdParam);
  const [fieldErrors, setFieldErrors] = useState({});
  const { salesBatches, loading: salesBatchesLoading, error: salesBatchesError } = useSalesBatches();

  const [form, setForm] = useState({ ...INITIAL_ENROLLMENT_FORM });

  const [initialPayment, setInitialPayment] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    next_payment_follow_up_at: "",
    payment_mode: "upi",
    receiver: "",
    transaction_id: "",
    reference: "",
    notes: "",
    reference_image: null,
    receipt_image: null,
  });
  const [paymentReceivers, setPaymentReceivers] = useState([]);
  const [paymentReceiversLoading, setPaymentReceiversLoading] = useState(false);
  const [paymentReceiversError, setPaymentReceiversError] = useState(null);

  const [paymentFieldErrors, setPaymentFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrToken, setQrToken] = useState(null);
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrError, setQrError] = useState(null);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!leadIdParam && !referralIdParam) {
      router.replace("/students");
      return;
    }
    const h = getHeaders();
    if (leadIdParam) {
      axios
        .get(`/leads/${leadIdParam}/`, { headers: h })
        .then(({ data }) => {
          const mobile = data.mobile ? normalizeMobile(String(data.mobile)) : "";
          const leadCourse = (data.course || data.enrolled_student_course || "").trim();
          setForm((f) => ({
            ...f,
            student_name: (data.name || f.student_name).replace(/[0-9]/g, "").trim() || f.student_name,
            student_email: data.email || f.student_email,
            student_mobile: mobile || f.student_mobile,
            course: COURSE_VALUES.has(leadCourse) ? leadCourse : f.course,
          }));
        })
        .catch(() => {})
        .finally(() => setLoadingLead(false));
      return;
    }
    if (referralIdParam) {
      axios
        .get(`/referrals/${referralIdParam}/`, { headers: h })
        .then(({ data }) => {
          const mobile = data.referred_mobile ? normalizeMobile(String(data.referred_mobile)) : "";
          setForm((f) => ({
            ...f,
            student_name: (data.referred_name || f.student_name).replace(/[0-9]/g, "").trim() || f.student_name,
            student_email: data.referred_email || f.student_email,
            student_mobile: mobile || f.student_mobile,
            college_name: data.referred_college || f.college_name,
            year_of_passing: data.referred_year_of_passing != null ? String(data.referred_year_of_passing) : f.year_of_passing,
            student_degree: data.referred_qualification || f.student_degree,
          }));
        })
        .catch(() => {})
        .finally(() => setLoadingLead(false));
    }
  }, [leadIdParam, referralIdParam, getHeaders, router]);

  const fetchPaymentReceivers = useCallback(async () => {
    try {
      setPaymentReceiversLoading(true);
      setPaymentReceiversError(null);
      const { data } = await axios.get("/payment-receivers/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setPaymentReceivers(list);
    } catch (err) {
      setPaymentReceivers([]);
      setPaymentReceiversError(err.response?.data?.detail || "Failed to load receiver accounts.");
    } finally {
      setPaymentReceiversLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (PAYMENT_MODES_NEED_RECEIVER.includes(initialPayment.payment_mode)) {
      fetchPaymentReceivers();
    }
  }, [initialPayment.payment_mode, fetchPaymentReceivers]);

  const availableSalesBatches = salesBatches.filter((b) => {
    const hasSeats = Number(b.remaining_seats ?? 0) > 0;
    if (!hasSeats) return false;
    if (!form.course) return true;
    return b.course === form.course;
  });
  const selectedSalesBatch = availableSalesBatches.find((b) => String(b.id) === String(form.sales_batch));

  useEffect(() => {
    if (!form.sales_batch) return;
    const stillValid = availableSalesBatches.some((b) => String(b.id) === String(form.sales_batch));
    if (!stillValid) {
      setForm((f) => ({ ...f, sales_batch: "" }));
    }
  }, [availableSalesBatches, form.sales_batch]);

  const handleGenerateQr = async () => {
    if (!canGenerateEnrollmentQr(form)) return;
    setQrError(null);
    setQrGenerating(true);
    try {
      const payload = {
        course: form.course,
        sales_batch: Number(form.sales_batch),
        payment_offered: Number(form.payment_offered),
      };
      if (leadIdParam) payload.lead = Number(leadIdParam);
      if (referralIdParam) payload.referral = Number(referralIdParam);
      const { data } = await axios.post("/enrollment-invites/", payload, { headers: getHeaders() });
      setQrToken(data.token);
      setQrExpiresAt(data.expires_at);
      setQrModalOpen(true);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.sales_batch?.[0];
      setQrError(detail || "Failed to generate QR link.");
    } finally {
      setQrGenerating(false);
    }
  };

  const validateBeforeSubmit = () => {
    if (!leadIdParam && !referralIdParam) return false;
    setError(null);
    setFieldErrors({});
    setPaymentFieldErrors({});

    const errors = validateEnrollmentForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors).find((k) => errors[k]);
      if (firstKey && typeof document !== "undefined") {
        document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    const paymentErrors = {};
    if (!initialPayment.amount || Number(initialPayment.amount) <= 0) {
      paymentErrors.amount = "Initial payment amount is required and must be greater than 0.";
    }
    const offeredNum = Number(form.payment_offered);
    const initNum = Number(initialPayment.amount);
    if (!Number.isNaN(offeredNum) && !Number.isNaN(initNum) && initNum > offeredNum) {
      paymentErrors.amount = "Initial payment cannot exceed the offered amount.";
    }
    if (!initialPayment.payment_date) {
      paymentErrors.payment_date = "Initial payment date is required.";
    }
    if (
      initialPayment.next_payment_follow_up_at &&
      initialPayment.payment_date &&
      initialPayment.next_payment_follow_up_at < initialPayment.payment_date
    ) {
      paymentErrors.next_payment_follow_up_at =
        "Next payment follow-up must be on or after the payment date.";
    }
    if (!initialPayment.payment_mode) {
      paymentErrors.payment_mode = "Initial payment mode is required.";
    }
    if (PAYMENT_MODES_NEED_RECEIVER.includes(initialPayment.payment_mode) && !initialPayment.receiver) {
      paymentErrors.receiver = "Bank account is required for UPI, Bank Transfer, and Card payments.";
    }
    if (isTransactionIdRequired(initialPayment.payment_mode) && !(initialPayment.transaction_id || "").trim()) {
      paymentErrors.transaction_id = "Transaction ID is required for UPI payments.";
    }
    if (isProofScreenshotRequired(initialPayment.payment_mode) && !initialPayment.reference_image) {
      paymentErrors.reference_image = "Proof Screenshot is required for this payment mode.";
    }
    if (!initialPayment.receipt_image) {
      paymentErrors.receipt_image = "Receipt Image is required.";
    }
    if ((initialPayment.notes || "").length > 200) {
      paymentErrors.notes = "Payment note must be 200 characters or less.";
    }
    if (Object.keys(paymentErrors).length) {
      setPaymentFieldErrors(paymentErrors);
      const firstPaymentKey = Object.keys(paymentErrors)[0];
      const idMap = {
        amount: "payment-field-amount",
        payment_date: "payment-field-date",
        next_payment_follow_up_at: "payment-field-next-follow-up",
        payment_mode: "payment-field-mode",
        receiver: "payment-field-receiver",
        transaction_id: "payment-field-transaction-id",
        reference: "payment-field-reference",
        reference_image: "payment-field-reference-image",
        receipt_image: "payment-field-receipt-image",
      };
      const scrollId = idMap[firstPaymentKey];
      if (scrollId && typeof document !== "undefined") {
        document.getElementById(scrollId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validateBeforeSubmit()) return;
    setSubmitConfirmOpen(true);
  };

  const submitEnrollment = async () => {
    if (!leadIdParam && !referralIdParam) return;
    setSaving(true);
    const headers = getHeaders();

    try {
      const studentPayload = {
        ...(leadIdParam ? { lead: Number(leadIdParam) } : {}),
        ...(referralIdParam ? { referral: Number(referralIdParam) } : {}),
        student_name: form.student_name.trim(),
        student_email: form.student_email.trim().toLowerCase(),
        student_mobile: normalizeMobile(form.student_mobile) || "",
        password: form.password || "",
        guardian_number_1: normalizeMobile(form.guardian_number_1) || "",
        guardian_relation_1: form.guardian_relation_1?.trim() || "",
        guardian_number_2: normalizeMobile(form.guardian_number_2) || "",
        guardian_relation_2: form.guardian_relation_2?.trim() || "",
        guardian_email: form.guardian_email?.trim() || "",
        college_name: form.college_name?.trim() || "",
        college_branch_name: form.college_branch_name?.trim() || "",
        tpo_name: form.tpo_name?.trim() || "",
        tpo_number: normalizeMobile(form.tpo_number) || "",
        tpo_email: form.tpo_email?.trim() || "",
        student_degree: form.student_degree?.trim() || "",
        total_percentage: validateMarks(form.total_percentage) || form.total_percentage?.trim() || "",
        education_status: form.education_status || "Pursuing",
        year_of_passing: form.year_of_passing ? Number(form.year_of_passing) : null,
        mode_of_classes: form.mode_of_classes || "Offline",
        reference_details: form.reference_details?.trim() || "",
        course: (form.course || "").trim(),
        sales_batch: Number(form.sales_batch),
        payment_offered: form.payment_offered ? Number(form.payment_offered) : null,
      };

      const { data: student } = await axios.post("/students/", studentPayload, { headers });
      const studentId = student?.id ?? student?.pk;

      if (studentId != null) {
        const formData = new FormData();
        formData.append("amount", Number(initialPayment.amount));
        formData.append("payment_date", initialPayment.payment_date || new Date().toISOString().slice(0, 10));
        const followUpDate = (initialPayment.next_payment_follow_up_at || "").trim();
        if (followUpDate) {
          formData.append("next_payment_follow_up_at", `${followUpDate}T00:00:00`);
        }
        formData.append("payment_mode", initialPayment.payment_mode || "upi");
        if (initialPayment.receiver) formData.append("receiver", initialPayment.receiver);
        if (isTransactionIdRequired(initialPayment.payment_mode)) {
          formData.append("transaction_id", (initialPayment.transaction_id || "").trim());
        }
        const reference = (initialPayment.reference || "").trim();
        if (reference) formData.append("reference", reference);
        formData.append("notes", initialPayment.notes || "");
        if (initialPayment.reference_image) {
          formData.append("reference_image", initialPayment.reference_image);
        }
        formData.append("receipt_image", initialPayment.receipt_image);
        await axios.post(`/students/${studentId}/payments/`, formData, { headers });
      }

      if (studentId != null) {
        router.push(`/students/${studentId}`);
      } else {
        router.push("/students");
      }
    } catch (err) {
      const data = err.response?.data;
      let hasFieldErrors = false;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const apiErrors = {};
        for (const [key, val] of Object.entries(data)) {
          if (key === "detail") continue;
          const msg = Array.isArray(val) ? val[0] : val;
          if (msg && typeof msg === "string") apiErrors[key] = msg;
        }
        if (Object.keys(apiErrors).length > 0) {
          hasFieldErrors = true;
          setFieldErrors((prev) => ({ ...prev, ...apiErrors }));
        }
      }
      const msg = data
        ? (
            typeof data === "string"
              ? data
              : data.detail ||
                (Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null) ||
                (hasFieldErrors ? "Please fix the errors below." : null)
          )
        : "Failed to create student.";
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!leadIdParam && !referralIdParam) {
    return null;
  }

  const fromReferral = !!referralIdParam && !leadIdParam;

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Enroll student</h1>
          <p className="text-muted-foreground">
            {fromReferral
              ? "Enter student details and first payment. Referral details are pre-filled."
              : "Enter student details and first payment. Lead is pre-filled from the lead you selected."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {fromReferral
                ? "Enrolling from referral. Name, email, and mobile are pre-filled where available."
                : "Enrolling from lead. Name, email, mobile, and course are pre-filled from the lead when set."}{" "}
              Fill remaining student details below and add initial payment.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share with student (QR)</CardTitle>
            <CardDescription>
              Select course, sales batch, and payment offered in student details below, then generate a
              one-time QR. The student completes their details without payment; you add payment after they
              submit.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              QR is enabled when course, batch, and offered amount are filled.
            </p>
            <Button
              type="button"
              className="bg-primary text-primary-foreground shadow hover:bg-primary/90"
              disabled={!canGenerateEnrollmentQr(form) || qrGenerating}
              onClick={handleGenerateQr}
            >
              {qrGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Generate QR
            </Button>
          </CardContent>
          {qrError && (
            <CardContent className="pt-0">
              <p className="text-sm text-destructive">{qrError}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student details</CardTitle>
            <CardDescription>Name, contact, guardians, education.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentEnrollmentFields
              form={form}
              setForm={setForm}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              salesBatchesLoading={salesBatchesLoading}
              salesBatchesError={salesBatchesError}
              availableSalesBatches={availableSalesBatches}
              selectedSalesBatch={selectedSalesBatch}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initial payment <span className="text-destructive">*</span></CardTitle>
            <CardDescription>This payment is required at enrollment. Status will be Pending until Admin/Manager verify.</CardDescription>
          </CardHeader>
          <CardContent className="grid items-start gap-4 sm:grid-cols-2">
            <div>
              <Label>Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                max={form.payment_offered || undefined}
                id="payment-field-amount"
                value={initialPayment.amount}
                onChange={(e) => setInitialPayment((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0"
              />
              {paymentFieldErrors.amount && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.amount}</p>
              )}
            </div>
            <div>
              <Label>Payment date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                id="payment-field-date"
                value={initialPayment.payment_date}
                onChange={(e) => setInitialPayment((p) => ({ ...p, payment_date: e.target.value }))}
              />
              {paymentFieldErrors.payment_date && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.payment_date}</p>
              )}
            </div>
            <div>
              <Label htmlFor="payment-field-next-follow-up">
                Next payment follow-up at (optional)
              </Label>
              <Input
                type="date"
                id="payment-field-next-follow-up"
                min={initialPayment.payment_date || undefined}
                value={initialPayment.next_payment_follow_up_at}
                onChange={(e) =>
                  setInitialPayment((p) => ({ ...p, next_payment_follow_up_at: e.target.value }))
                }
              />
              {paymentFieldErrors.next_payment_follow_up_at && (
                <p className="mt-1 text-sm text-destructive">
                  {paymentFieldErrors.next_payment_follow_up_at}
                </p>
              )}
            </div>
            <div>
              <Label>Mode <span className="text-destructive">*</span></Label>
              <select
                id="payment-field-mode"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={initialPayment.payment_mode}
                onChange={(e) =>
                  setInitialPayment((p) => ({
                    ...p,
                    payment_mode: e.target.value,
                    receiver: "",
                    transaction_id: e.target.value === "upi" ? p.transaction_id : "",
                  }))
                }
              >
                {PAYMENT_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {paymentFieldErrors.payment_mode && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.payment_mode}</p>
              )}
            </div>
            {PAYMENT_MODES_NEED_RECEIVER.includes(initialPayment.payment_mode) && (
              <div>
                <Label>{initialPayment.payment_mode === "upi" ? "UPI account *" : "Bank account *"}</Label>
                <select
                  id="payment-field-receiver"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={initialPayment.receiver}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, receiver: e.target.value }))}
                  disabled={paymentReceiversLoading}
                >
                  <option value="">
                    {paymentReceiversLoading
                      ? "Loading accounts..."
                      : initialPayment.payment_mode === "upi"
                        ? "Select UPI account"
                        : "Select bank account"}
                  </option>
                  {paymentReceiversForMode(paymentReceivers, initialPayment.payment_mode).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.receiver_name} · {initialPayment.payment_mode === "upi" ? r.upi_id : r.bank_name || r.account || "—"}
                    </option>
                  ))}
                </select>
                {paymentReceiversError && (
                  <p className="mt-1 text-sm text-destructive">{paymentReceiversError}</p>
                )}
                {paymentFieldErrors.receiver && (
                  <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.receiver}</p>
                )}
              </div>
            )}
            {isTransactionIdRequired(initialPayment.payment_mode) && (
              <div>
                <Label htmlFor="payment-field-transaction-id">Transaction ID *</Label>
                <Input
                  id="payment-field-transaction-id"
                  value={initialPayment.transaction_id}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, transaction_id: e.target.value }))}
                  placeholder="e.g. UPI transaction ID"
                />
                {paymentFieldErrors.transaction_id && (
                  <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.transaction_id}</p>
                )}
              </div>
            )}
            <div>
              <Label htmlFor="payment-field-reference">Reference (optional)</Label>
              <Input
                id="payment-field-reference"
                value={initialPayment.reference}
                onChange={(e) => setInitialPayment((p) => ({ ...p, reference: e.target.value }))}
                placeholder="Cheque number or other note"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <ImageDropzone
                  convertToWebp
                  label={
                    isProofScreenshotRequired(initialPayment.payment_mode)
                      ? "Proof Screenshot *"
                      : "Proof Screenshot (optional)"
                  }
                  value={initialPayment.reference_image}
                  id="payment-field-reference-image"
                  onChange={(file) => setInitialPayment((p) => ({ ...p, reference_image: file }))}
                />
                <ImageDropzone
                  convertToWebp
                  label="Receipt Image *"
                  value={initialPayment.receipt_image}
                  id="payment-field-receipt-image"
                  onChange={(file) => setInitialPayment((p) => ({ ...p, receipt_image: file }))}
                />
              </div>
              {(paymentFieldErrors.reference_image || paymentFieldErrors.receipt_image) && (
                <p className="mt-2 text-sm text-destructive">
                  {paymentFieldErrors.reference_image || paymentFieldErrors.receipt_image}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Input
                maxLength={200}
                value={initialPayment.notes}
                onChange={(e) => setInitialPayment((p) => ({ ...p, notes: e.target.value }))}
              />
              {paymentFieldErrors.notes && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.notes}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => setCancelConfirmOpen(true)} disabled={saving || loadingLead}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || loadingLead}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Review & Submit"}
            </Button>
          </div>
        </div>
      </form>

      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCancelConfirmOpen(false)}>
          <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Discard changes?</h3>
            <p className="mt-2 text-sm text-muted-foreground">All unsaved student and payment details will be lost.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCancelConfirmOpen(false)}>Keep editing</Button>
              <Button type="button" variant="destructive" onClick={() => router.back()}>Discard</Button>
            </div>
          </div>
        </div>
      )}

      {submitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setSubmitConfirmOpen(false)}>
          <div className="w-full max-w-2xl rounded-lg border bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Confirm enrollment</h3>
            <p className="mt-1 text-sm text-muted-foreground">Please verify details before final submit.</p>
            <div className="mt-4 grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{form.student_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{form.student_mobile || "—"}</span></div>
              <div><span className="text-muted-foreground">Course:</span> <span className="font-medium">{COURSE_OPTIONS.find((c) => c.value === form.course)?.label || form.course || "—"}</span></div>
              <div><span className="text-muted-foreground">Sales Batch:</span> <span className="font-medium">{selectedSalesBatch?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Offered Amount:</span> <span className="font-medium">{form.payment_offered ? `₹ ${Number(form.payment_offered).toLocaleString()}` : "—"}</span></div>
              <div><span className="text-muted-foreground">Initial Payment:</span> <span className="font-medium">{initialPayment.amount ? `₹ ${Number(initialPayment.amount).toLocaleString()}` : "—"}</span></div>
              <div><span className="text-muted-foreground">Next payment follow-up:</span> <span className="font-medium">{initialPayment.next_payment_follow_up_at || "—"}</span></div>
              <div><span className="text-muted-foreground">Payment Mode:</span> <span className="font-medium">{PAYMENT_MODE_OPTIONS.find((m) => m.value === initialPayment.payment_mode)?.label || initialPayment.payment_mode || "—"}</span></div>
              <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{paymentReceivers.find((r) => String(r.id) === String(initialPayment.receiver))?.receiver_name || "—"}</span></div>
              {isTransactionIdRequired(initialPayment.payment_mode) && (
                <div><span className="text-muted-foreground">Transaction ID:</span> <span className="font-medium">{initialPayment.transaction_id?.trim() || "—"}</span></div>
              )}
              {initialPayment.reference?.trim() && (
                <div><span className="text-muted-foreground">Reference:</span> <span className="font-medium">{initialPayment.reference.trim()}</span></div>
              )}
              <div><span className="text-muted-foreground">Proof Screenshot:</span> <span className="font-medium">{initialPayment.reference_image?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Receipt Image:</span> <span className="font-medium">{initialPayment.receipt_image?.name || "—"}</span></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSubmitConfirmOpen(false)} disabled={saving}>Back</Button>
              <Button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!validateBeforeSubmit()) {
                    setSubmitConfirmOpen(false);
                    return;
                  }
                  setSubmitConfirmOpen(false);
                  await submitEnrollment();
                }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Enroll"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <EnrollmentQrModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        token={qrToken}
        expiresAt={qrExpiresAt}
      />
    </div>
  );
}
