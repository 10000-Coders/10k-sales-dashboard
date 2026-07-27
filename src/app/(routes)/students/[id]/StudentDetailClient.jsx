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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Phone, Mail, User, Check, X, ImageIcon, ZoomIn, ZoomOut, Activity, MessageCircle, Circle, KeyRound, Pencil } from "lucide-react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { FollowUpTimer } from "@/components/FollowUpTimer";
import { useFollowUp } from "@/context/FollowUpProvider";
import { isProofScreenshotRequired, isTransactionIdRequired, paymentReceiversForMode } from "@/lib/paymentValidation";
import { useSalesBatchDropdown } from "@/hooks/useSalesData";
import StudentDetailsEditForm from "@/components/students/StudentDetailsEditForm";
import { COURSE_LABELS, LEAD_COURSE_VALUES } from "@/constants/leadCourse";
import { paymentOfferedTypeLabel } from "@/lib/paymentOffered";

const PAYMENT_MODE_OPTIONS = [
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
];

const PAYMENT_MODES_NEED_RECEIVER = ["upi", "bank", "card"];

const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
];

/** Payment / pending-amount follow-up outcomes (matches backend StudentOutcome). */
const STUDENT_ACTIVITY_OUTCOMES = [
  { value: "not_answered", label: "Not Answered" },
  { value: "callback", label: "Callback Scheduled" },
  { value: "pending_reminder", label: "Pending Amount — Reminded" },
  { value: "payment_promised", label: "Promised to Pay" },
  { value: "partial_discussed", label: "Partial Payment Discussed" },
  { value: "payment_submitted", label: "Payment Submitted (Proof Pending)" },
  { value: "cannot_pay_now", label: "Cannot Pay Now" },
  { value: "refused_payment", label: "Refused to Pay" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "completed", label: "Completed" },
  { value: "dropout", label: "Drop Out" },
  { value: "other", label: "Other" },
];

const STUDENT_OUTCOME_LABELS = Object.fromEntries(
  STUDENT_ACTIVITY_OUTCOMES.map((o) => [o.value, o.label])
);

function formatStudentOutcome(outcome, outcomeLabel) {
  if (outcomeLabel) return outcomeLabel;
  if (outcome && STUDENT_OUTCOME_LABELS[outcome]) return STUDENT_OUTCOME_LABELS[outcome];
  return outcome ? outcome.replace(/_/g, " ") : "—";
}

const LEAD_OUTCOME_LABELS = {
  not_answered: "Not Answered",
  interested: "Interested",
  not_interested: "Not Interested",
  callback: "Callback",
  wrong_number: "Wrong Number",
  enrolled: "Enrolled",
  other: "Other",
};

function formatActivityOutcome(activity) {
  if (activity?.outcome_label) return activity.outcome_label;
  if (activity?.subject_type === "student") {
    return formatStudentOutcome(activity.outcome, null);
  }
  return LEAD_OUTCOME_LABELS[activity?.outcome] || activity?.outcome?.replace(/_/g, " ") || "—";
}

function getActivityIcon(type) {
  switch (type) {
    case "call":
      return Phone;
    case "whatsapp":
      return MessageCircle;
    default:
      return Circle;
  }
}

function formatActivityDate(d) {
  const dt = d ? new Date(d) : new Date();
  const safeDate = isNaN(dt.getTime()) ? new Date() : dt;
  const now = new Date();
  if (safeDate.toDateString() === now.toDateString()) {
    return safeDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  return safeDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStudentPassword(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly && digitsOnly.length === raw.length) {
    return digitsOnly;
  }
  return raw;
}

const COURSE_OPTIONS = LEAD_COURSE_VALUES;

/**
 * @typedef {Object} PaymentItem
 * @property {string | null | undefined} reference_image
 * @property {string | null | undefined} receipt_image
 */

/** Badge colors for display_status from API. */
function getDisplayStatusBadgeClass(displayStatus) {
  const m = {
    paid: "bg-green-100 text-green-800",
    verification_pending: "bg-amber-100 text-amber-800",
    due: "bg-orange-100 text-orange-800",
    draft: "bg-gray-100 text-gray-700",
    rejected: "bg-red-100 text-red-800",
  };
  return m[displayStatus] || "bg-muted";
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** datetime-local input value from API ISO string */
function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/** API payload from date (YYYY-MM-DD) or datetime-local */
function toApiDateTime(value) {
  if (!value) return null;
  if (value.length === 10) return `${value}T00:00:00`;
  if (value.length === 16) return `${value}:00`;
  return value;
}

/** Latest payment — follow-up is stored on the most recent payment (matches backend). */
function getPrimaryPaymentForFollowUp(payments) {
  if (!payments?.length) return null;
  const sorted = [...payments].sort((a, b) => {
    const da = new Date(a.payment_date || a.created_at).getTime();
    const db = new Date(b.payment_date || b.created_at).getTime();
    if (db !== da) return db - da;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  return sorted[0];
}

function canVerifyPayments(role) {
  return role === "manager";
}

/** Dedup initial load: React Strict Mode (dev) mounts twice; each GET also triggers a CORS OPTIONS preflight. */
let studentDetailCache = { key: null, student: null, payments: null, activities: null, at: 0 };
let studentDetailFetchPromise = null;
let studentDetailFetchCacheKey = null;
const STUDENT_DETAIL_CACHE_MS = 5000;

function invalidateStudentDetailCache() {
  studentDetailCache = { key: null, student: null, payments: null, activities: null, at: 0 };
  studentDetailFetchPromise = null;
  studentDetailFetchCacheKey = null;
}

export default function StudentDetailClient() {
  const params = useParams();
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const { updateStudentInFollowUpList } = useFollowUp() || {};
  const id = params?.id;
  const [student, setStudent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [activityForm, setActivityForm] = useState({
    activity_type: "call",
    outcome: "",
    notes: "",
    next_follow_up_at: "",
  });
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
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
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedImageField, setSelectedImageField] = useState("reference_image");
  const [modalZoom, setModalZoom] = useState(1);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [followUpEditValue, setFollowUpEditValue] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpError, setFollowUpError] = useState(null);
  const [headerFollowUpValue, setHeaderFollowUpValue] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [editSalesBatch, setEditSalesBatch] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailsEditing, setDetailsEditing] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const base = process.env.NEXT_PUBLIC_baseUrl || "";
    return `${base}/media/${path.replace(/^\//, "")}`;
  };
  const canVerify = canVerifyPayments(user?.role);
  const {
    salesBatchDropdown: salesBatches,
    loading: salesBatchesLoading,
    error: salesBatchesError,
  } = useSalesBatchDropdown({ course: editCourse });

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchStudent = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/students/${id}/`, { headers: getHeaders() });
      setStudent(data);
      setEditCourse(data?.course || "");
      setEditSalesBatch(data?.sales_batch ? String(data.sales_batch) : "");
    } catch (err) {
      setStudent(null);
      setError(err.response?.data?.detail || "Student not found.");
    }
  }, [id, getHeaders]);

  const fetchPayments = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/students/${id}/payments/`, { headers: getHeaders() });
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setPayments([]);
    }
  }, [id, getHeaders]);

  const fetchActivityHistory = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await axios.get(`/students/${id}/activity-history/`, { headers: getHeaders() });
      setAllActivities(Array.isArray(data) ? data : []);
    } catch {
      setAllActivities([]);
    }
  }, [id, getHeaders]);

  const fetchPaymentReceivers = useCallback(async () => {
    try {
      const { data } = await axios.get("/payment-receivers/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setPaymentReceivers(list);
    } catch {
      setPaymentReceivers([]);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (!id || user?.id == null) return;

    const cacheKey = `${id}|${user.id}|${user.role}`;
    const headers = getHeaders();

    const applyCacheToState = () => {
      const cached = studentDetailCache;
      if (cached.key !== cacheKey) return;
      if (cached.student) {
        setStudent(cached.student);
        setEditCourse(cached.student.course || "");
        setEditSalesBatch(cached.student.sales_batch ? String(cached.student.sales_batch) : "");
      }
      setPayments(cached.payments ?? []);
      setAllActivities(cached.activities ?? []);
    };

    if (
      studentDetailCache.key === cacheKey &&
      Date.now() - studentDetailCache.at < STUDENT_DETAIL_CACHE_MS
    ) {
      applyCacheToState();
      setLoading(false);
      return;
    }

    if (studentDetailFetchPromise && studentDetailFetchCacheKey === cacheKey) {
      setLoading(true);
      studentDetailFetchPromise
        .then(() => {
          applyCacheToState();
        })
        .catch(() => {
          setStudent(null);
          setPayments([]);
          setAllActivities([]);
        })
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    setError(null);
    studentDetailFetchCacheKey = cacheKey;
    studentDetailFetchPromise = (async () => {
      try {
        const [studentRes, paymentsRes, activitiesRes] = await Promise.all([
          axios.get(`/students/${id}/`, { headers }),
          axios.get(`/students/${id}/payments/`, { headers }),
          axios.get(`/students/${id}/activity-history/`, { headers }),
        ]);
        const studentData = studentRes.data;
        const paymentsList = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
        const activitiesList = Array.isArray(activitiesRes.data) ? activitiesRes.data : [];
        studentDetailCache = {
          key: cacheKey,
          student: studentData,
          payments: paymentsList,
          activities: activitiesList,
          at: Date.now(),
        };
        setStudent(studentData);
        setEditCourse(studentData?.course || "");
        setEditSalesBatch(studentData?.sales_batch ? String(studentData.sales_batch) : "");
        setPayments(paymentsList);
        setAllActivities(activitiesList);
      } catch (err) {
        setStudent(null);
        setError(err.response?.data?.detail || "Student not found.");
        setPayments([]);
        setAllActivities([]);
      } finally {
        setLoading(false);
        studentDetailFetchPromise = null;
        studentDetailFetchCacheKey = null;
      }
    })();
  }, [id, user?.id, user?.role, getHeaders]);

  useEffect(() => {
    if (addPaymentOpen && PAYMENT_MODES_NEED_RECEIVER.includes(paymentForm.payment_mode)) {
      fetchPaymentReceivers();
    }
  }, [addPaymentOpen, paymentForm.payment_mode, fetchPaymentReceivers]);

  useEffect(() => {
    if (selectedPayment) {
      setFollowUpEditValue(toDatetimeLocalValue(selectedPayment.next_payment_follow_up_at));
      setFollowUpError(null);
    }
  }, [selectedPayment]);

  useEffect(() => {
    setHeaderFollowUpValue(toDatetimeLocalValue(student?.next_payment_follow_up_at));
  }, [student?.next_payment_follow_up_at]);

  const handleUpdatePaymentFollowUp = async (paymentId, rawValue, onSuccess) => {
    if (!paymentId) {
      setFollowUpError("No payment found to update.");
      return;
    }
    const trimmed = (rawValue || "").trim();
    const apiValue = trimmed ? toApiDateTime(trimmed) : null;
    if (trimmed && !apiValue) {
      setFollowUpError("Choose a valid follow-up date and time.");
      return;
    }
    setFollowUpSaving(true);
    setFollowUpError(null);
    try {
      const { data } = await axios.patch(
        `/payments/${paymentId}/`,
        { next_payment_follow_up_at: apiValue },
        { headers: getHeaders() }
      );
      invalidateStudentDetailCache();
      await Promise.all([fetchPayments(), fetchStudent(), fetchActivityHistory()]);
      setHeaderFollowUpValue(toDatetimeLocalValue(data.next_payment_follow_up_at));
      if (selectedPayment?.id === paymentId) {
        setSelectedPayment(data);
        setFollowUpEditValue(toDatetimeLocalValue(data.next_payment_follow_up_at));
      }
      toast.success(apiValue ? "Payment follow-up saved." : "Payment follow-up cleared.");
      if (updateStudentInFollowUpList && id) {
        updateStudentInFollowUpList(Number(id), {
          next_payment_follow_up_at: data.next_payment_follow_up_at ?? null,
        });
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.next_payment_follow_up_at?.[0] ||
        "Failed to update follow-up date.";
      setFollowUpError(typeof msg === "string" ? msg : "Failed to update follow-up date.");
    } finally {
      setFollowUpSaving(false);
    }
  };

  const handleVerifyPayment = async (paymentId, status, notes = "", onSuccess) => {
    setVerifyingId(paymentId);
    try {
      await axios.patch(
        `/payments/${paymentId}/`,
        { status, ...(notes ? { notes } : {}) },
        { headers: getHeaders() }
      );
      invalidateStudentDetailCache();
      fetchPayments();
      fetchStudent();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingId(null);
    }
  };

  const offeredAmount = student?.payment_offered != null ? Number(student.payment_offered) : null;
  // Committed amount = Verified + Pending (excluding rejected)
  const committedAmount = payments
    .filter((p) => p.status === "verified" || p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  
  // Total paid as displayed in UI summary (usually means verified + pending)
  const totalPaid = committedAmount; 
  const pendingAmount =
    student?.amount_due != null
      ? Number(student.amount_due)
      : offeredAmount != null
        ? Math.max(0, offeredAmount - committedAmount)
        : null;
  
  const isFullyPaid = offeredAmount != null && committedAmount >= offeredAmount;
  const canManageCourseBatch = user?.role === "manager" || user?.role === "super_admin";
  const canEditDetails = [
    "varshini10kcoders@gmail.com",
    "sridhar10kcoders@gmail.com",
    "subbareddyarikatla8@gmail.com",
  ].includes(user?.email?.toLowerCase());
  const primaryFollowUpPayment = getPrimaryPaymentForFollowUp(payments);

  const handleLogStudentActivity = async (e) => {
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
      const followUpTrimmed = (activityForm.next_follow_up_at || "").trim();
      let followUpApi = null;
      if (followUpTrimmed) {
        followUpApi = toApiDateTime(followUpTrimmed);
        if (!followUpApi) {
          setActivityError("Enter a valid follow-up date and time.");
          setActivitySubmitting(false);
          return;
        }
      }
      const payload = {
        activity_type: activityForm.activity_type,
        outcome: activityForm.outcome,
        notes: trimmedNotes,
        next_follow_up_at: followUpApi,
      };
      await axios.post(`/students/${id}/activities/`, payload, { headers: getHeaders() });
      setActivityForm({
        activity_type: "call",
        outcome: "",
        notes: "",
        next_follow_up_at: "",
      });
      invalidateStudentDetailCache();
      await Promise.all([fetchActivityHistory(), fetchPayments(), fetchStudent()]);
      if (updateStudentInFollowUpList && id) {
        updateStudentInFollowUpList(Number(id), {
          next_payment_follow_up_at: followUpApi,
        });
      }
      toast.success(
        followUpApi
          ? "Activity logged. Payment follow-up updated."
          : "Activity logged."
      );
    } catch (err) {
      setActivityError(err.response?.data?.detail || "Failed to log activity.");
    } finally {
      setActivitySubmitting(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!id || !paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    if (!paymentForm.receipt_image) {
      setPaymentError("Receipt Image is required.");
      return;
    }
    if (isProofScreenshotRequired(paymentForm.payment_mode) && !paymentForm.reference_image) {
      setPaymentError("Proof Screenshot is required for this payment mode.");
      return;
    }
    if (PAYMENT_MODES_NEED_RECEIVER.includes(paymentForm.payment_mode) && !paymentForm.receiver) {
      setPaymentError("Please select a bank account for UPI, Bank Transfer, or Card payments.");
      return;
    }
    if (isTransactionIdRequired(paymentForm.payment_mode) && !(paymentForm.transaction_id || "").trim()) {
      setPaymentError("Transaction ID is required for UPI payments.");
      return;
    }
    const newAmount = Number(paymentForm.amount);
    if (offeredAmount != null && totalPaid + newAmount > offeredAmount) {
      setPaymentError(
        `Total payments would exceed offered amount. Offered: ₹ ${offeredAmount.toLocaleString()}, already paid: ₹ ${totalPaid.toLocaleString()}, remaining: ₹ ${pendingAmount.toLocaleString()}.`
      );
      return;
    }
    setPaymentSubmitting(true);
    setPaymentError(null);
    const headers = getHeaders();
    try {
      const formData = new FormData();
      formData.append("amount", Number(paymentForm.amount));
      const dateStr = paymentForm.payment_date || new Date().toISOString().slice(0, 10);
      formData.append("payment_date", `${dateStr}T00:00:00`);
      const followUpStr = (paymentForm.next_payment_follow_up_at || "").trim();
      const followUpApi = followUpStr ? toApiDateTime(followUpStr) : null;
      if (followUpApi) {
        formData.append("next_payment_follow_up_at", followUpApi);
      } else if (followUpStr) {
        setPaymentError("Enter a valid follow-up date and time.");
        setPaymentSubmitting(false);
        return;
      }
      formData.append("payment_mode", paymentForm.payment_mode || "upi");
      if (paymentForm.receiver) formData.append("receiver", paymentForm.receiver);
      if (isTransactionIdRequired(paymentForm.payment_mode)) {
        formData.append("transaction_id", (paymentForm.transaction_id || "").trim());
      }
      const reference = (paymentForm.reference || "").trim();
      if (reference) formData.append("reference", reference);
      formData.append("notes", paymentForm.notes || "");
      if (paymentForm.reference_image) {
        formData.append("reference_image", paymentForm.reference_image);
      }
      formData.append("receipt_image", paymentForm.receipt_image);
      await axios.post(`/students/${id}/payments/`, formData, { headers });
      setPaymentForm({
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
      setAddPaymentOpen(false);
      invalidateStudentDetailCache();
      void Promise.all([fetchPayments(), fetchStudent()]);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.detail || (typeof data === "object" ? JSON.stringify(data) : err.message) || "Failed to add payment.";
      setPaymentError(msg);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleStudentDetailsUpdated = useCallback((data) => {
    setStudent(data);
    setEditCourse(data?.course || "");
    setEditSalesBatch(data?.sales_batch ? String(data.sales_batch) : "");
    invalidateStudentDetailCache();
  }, []);

  const validateCourseAndBatch = () => {
    const fieldErrs = {};
    if (!editCourse.trim()) {
      fieldErrs.course = "Course is required.";
    }
    if (!editSalesBatch.trim()) {
      fieldErrs.sales_batch = "Sales batch is required.";
    }
    return fieldErrs;
  };

  const handleSaveCourseBatchClick = () => {
    setEditError(null);
    const fieldErrs = validateCourseAndBatch();
    if (Object.keys(fieldErrs).length > 0) {
      setEditFieldErrors(fieldErrs);
      setEditError("Please select both course and sales batch.");
      return;
    }
    setEditFieldErrors({});
    setConfirmOpen(true);
  };

  const saveCourseAndBatch = async () => {
    if (!id || student?.is_moved_to_batch) return;
    const fieldErrs = validateCourseAndBatch();
    if (Object.keys(fieldErrs).length > 0) {
      setConfirmOpen(false);
      setEditFieldErrors(fieldErrs);
      setEditError("Please select both course and sales batch.");
      return;
    }
    setConfirmOpen(false);
    setEditSaving(true);
    setEditError(null);
    setEditFieldErrors({});
    try {
      await axios.patch(
        `/students/${id}/`,
        {
          course: editCourse || null,
          sales_batch: editSalesBatch ? Number(editSalesBatch) : null,
        },
        { headers: getHeaders() }
      );
      toast.success("Sales batch / course updated.");
      invalidateStudentDetailCache();
      fetchStudent();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const fieldErrs = {};
        for (const [k, v] of Object.entries(data)) {
          if (k === "detail") continue;
          const msg = Array.isArray(v) ? v[0] : v;
          if (msg && typeof msg === "string") fieldErrs[k] = msg;
        }
        if (Object.keys(fieldErrs).length) setEditFieldErrors(fieldErrs);
      }
      const msg =
        data?.detail ||
        (typeof data === "string" ? data : null) ||
        err.message ||
        "Failed to update sales batch/course.";
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Button variant="ghost" onClick={() => router.push("/students")}>
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Button>
        <p className="text-destructive">{error || "Student not found."}</p>
      </div>
    );
  }

  const displayStatusBadge = getDisplayStatusBadgeClass(student.display_status);

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" className="w-fit" onClick={() => router.push("/students")}>
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <User className="h-6 w-6" />
                {student.student_name}
              </CardTitle>
              <CardDescription>
                Lead source: {student.lead_source || "—"} · Uploaded by {student.sales_person_name ?? "—"}
              </CardDescription>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className={cn("rounded-full px-3 py-1 text-sm font-medium", displayStatusBadge)}>
                {student.display_status_label ?? "—"}
                {student.is_moved_to_batch && (
                  <span className="ml-1.5 opacity-90">· Moved to batch</span>
                )}
              </span>
              {canEditDetails && !detailsEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setDetailsEditing(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit details
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEditDetails && (
            <StudentDetailsEditForm
              studentId={id}
              student={student}
              getHeaders={getHeaders}
              editing={detailsEditing}
              onEditingChange={setDetailsEditing}
              onUpdated={handleStudentDetailsUpdated}
            />
          )}

          {!detailsEditing && (
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{student.student_mobile || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{student.student_email || "—"}</span>
            </div>
            {student.password && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <KeyRound className="h-4 w-4" />
                <span className="font-mono tabular-nums tracking-wide">{formatStudentPassword(student.password)}</span>
              </div>
            )}
          </div>
          )}

          {!detailsEditing && student.guardian_number_1 && (
            <p className="text-sm text-muted-foreground">
              Guardian {student.guardian_relation_1 || ""}: {student.guardian_number_1}
            </p>
          )}
          {!detailsEditing && student.course && (
            <p className="text-sm font-medium">Course: {COURSE_LABELS[student.course] ?? student.course}</p>
          )}
          {!detailsEditing && student.payment_offered != null && (
            <p className="text-sm text-muted-foreground">
              Offered amount: ₹ {Number(student.payment_offered).toLocaleString()}
              {student.payment_offered_type ? (
                <> · Type: {paymentOfferedTypeLabel(student.payment_offered_type)}</>
              ) : null}
              {pendingAmount != null && (
                <>
                  {" "}
                  · <span className="font-medium text-orange-700 dark:text-orange-400">
                    Due: ₹ {pendingAmount.toLocaleString()}
                  </span>
                </>
              )}
            </p>
          )}
          {!detailsEditing && student.payment_offered_comment?.trim() && (
            <p className="text-sm text-muted-foreground">
              Offered comment: {student.payment_offered_comment.trim()}
            </p>
          )}
          {primaryFollowUpPayment && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">
                    Next payment follow-up (optional — clear field and save to remove)
                  </Label>
                  <Input
                    type="datetime-local"
                    className="h-9 w-auto min-w-[220px] text-sm"
                    value={headerFollowUpValue}
                    onChange={(e) => {
                      setHeaderFollowUpValue(e.target.value);
                      setFollowUpError(null);
                    }}
                  />
                </div>
                {student.next_payment_follow_up_at && (
                  <FollowUpTimer followUpAt={student.next_payment_follow_up_at} className="text-sm pb-2" />
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={followUpSaving}
                  onClick={() =>
                    handleUpdatePaymentFollowUp(primaryFollowUpPayment.id, headerFollowUpValue)
                  }
                >
                  {followUpSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : headerFollowUpValue ? (
                    "Save follow-up"
                  ) : (
                    "Clear follow-up"
                  )}
                </Button>
              </div>
              {followUpError && <p className="text-xs text-destructive">{followUpError}</p>}
            </div>
          )}
          {student.college_name && (
            <p className="text-sm text-muted-foreground">
              College: {student.college_name}
              {student.college_branch_name ? ` · ${student.college_branch_name}` : ""}
              {student.student_degree ? ` · ${student.student_degree}` : ""}
            </p>
          )}
          {(student.tpo_name || student.tpo_number || student.tpo_email) && (
            <p className="text-sm text-muted-foreground">
              TPo: {[student.tpo_name, student.tpo_number, student.tpo_email].filter(Boolean).join(" · ")}
            </p>
          )}
          {student.sales_batch_name && (
            <p className="text-sm text-muted-foreground">Sales batch: {student.sales_batch_name}</p>
          )}
          {student.target_batch_name && (
            <p className="text-sm font-medium">Mentor batch: {student.target_batch_name}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Activities — Lead: {student.lead_activities_count ?? 0} · Student:{" "}
            {student.student_activities_count ?? 0}
          </p>
        </CardContent>
      </Card>

      {canManageCourseBatch && (
        <Card>
          <CardHeader>
            <CardTitle>Course & Sales Batch</CardTitle>
            <CardDescription>
              {student.is_moved_to_batch
                ? "Batch/Course cannot be changed after moving to mentor batch."
                : "Change sales batch or course before moving to mentor batch."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            {salesBatchesError && <p className="text-sm text-destructive">{salesBatchesError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Course <span className="text-destructive">*</span></Label>
                <select
                  disabled={student.is_moved_to_batch || editSaving}
                  className={`w-full rounded-md border bg-background px-3 py-2 ${editFieldErrors.course ? "border-destructive" : "border-input"}`}
                  value={editCourse}
                  onChange={(e) => {
                    setEditCourse(e.target.value);
                    setEditFieldErrors((p) => ({ ...p, course: undefined }));
                    // clear batch if course changed
                    setEditSalesBatch("");
                  }}
                >
                  <option value="">Select course</option>
                  {COURSE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {editFieldErrors.course && <p className="text-sm text-destructive">{editFieldErrors.course}</p>}
              </div>
              <div className="grid gap-1">
                <Label>Sales batch <span className="text-destructive">*</span></Label>
                <select
                  disabled={student.is_moved_to_batch || editSaving || salesBatchesLoading}
                  className={`w-full rounded-md border bg-background px-3 py-2 ${editFieldErrors.sales_batch ? "border-destructive" : "border-input"}`}
                  value={editSalesBatch}
                  onChange={(e) => {
                    setEditSalesBatch(e.target.value);
                    setEditFieldErrors((p) => ({ ...p, sales_batch: undefined }));
                  }}
                >
                  <option value="">{salesBatchesLoading ? "Loading sales batches..." : "Select sales batch"}</option>
                  {salesBatches
                    .filter((b) => !editCourse || b.course === editCourse)
                    .map((b) => (
                      <option key={b.id} value={String(b.id)}>
                        {b.name} {b.remaining_seats != null ? `(seats left: ${b.remaining_seats})` : ""}
                      </option>
                    ))}
                </select>
                {editFieldErrors.sales_batch && <p className="text-sm text-destructive">{editFieldErrors.sales_batch}</p>}
              </div>
            </div>

            {!student.is_moved_to_batch && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={
                    editSaving ||
                    (editCourse === (student.course || "") &&
                      (editSalesBatch || "") === (student.sales_batch ? String(student.sales_batch) : ""))
                  }
                  onClick={handleSaveCourseBatchClick}
                >
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Changes are allowed only before moving to mentor batch.
                </p>
              </div>
            )}

            {student.is_moved_to_batch && (
              <p className="text-sm text-muted-foreground">
                Batch/Course cannot be changed after moving to mentor batch.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Payments</CardTitle>
              <CardDescription>Payments are Pending until Admin/Manager verify.</CardDescription>
            </div>
            {!isFullyPaid && (
              <Button onClick={() => setAddPaymentOpen(!addPaymentOpen)}>
                {addPaymentOpen ? "Cancel" : "Add payment"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {offeredAmount != null && (
            <div className="flex flex-wrap gap-4 rounded-md bg-muted/50 px-4 py-3 text-sm">
              <span><strong>Offered:</strong> ₹ {offeredAmount.toLocaleString()}</span>
              <span><strong>Paid so far:</strong> ₹ {totalPaid.toLocaleString()}</span>
              <span><strong>Pending:</strong> ₹ {pendingAmount.toLocaleString()}</span>
              {primaryFollowUpPayment && (
                <span className="flex flex-wrap items-center gap-2">
                  <strong>Next payment follow-up:</strong>
                  {student.next_payment_follow_up_at ? (
                    <FollowUpTimer followUpAt={student.next_payment_follow_up_at} className="inline text-sm" />
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </span>
              )}
            </div>
          )}
          {addPaymentOpen && !isFullyPaid && (
            <form onSubmit={handleAddPayment} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
              {paymentError && (
                <p className="text-sm text-destructive sm:col-span-2">{paymentError}</p>
              )}
              {offeredAmount != null && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  You can add up to <strong>₹ {pendingAmount.toLocaleString()}</strong> (remaining of offered amount).
                </p>
              )}
              <div>
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={pendingAmount != null ? pendingAmount : undefined}
                  value={paymentForm.amount}
                  onChange={(e) => {
                    setPaymentForm((p) => ({ ...p, amount: e.target.value }));
                    setPaymentError(null);
                  }}
                  placeholder={pendingAmount != null ? `Max ₹ ${pendingAmount.toLocaleString()}` : undefined}
                />
                {offeredAmount != null && paymentForm.amount && Number(paymentForm.amount) > pendingAmount && (
                  <p className="mt-1 text-sm text-destructive">
                    Amount exceeds remaining. Max: ₹ {pendingAmount.toLocaleString()}.
                  </p>
                )}
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Next payment follow-up at (optional)</Label>
                <Input
                  type="datetime-local"
                  min={paymentForm.payment_date ? `${paymentForm.payment_date}T00:00` : undefined}
                  value={paymentForm.next_payment_follow_up_at}
                  onChange={(e) =>
                    setPaymentForm((p) => ({ ...p, next_payment_follow_up_at: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Mode</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={paymentForm.payment_mode}
                  onChange={(e) =>
                    setPaymentForm((p) => ({
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
              </div>
              {PAYMENT_MODES_NEED_RECEIVER.includes(paymentForm.payment_mode) && (
                <div>
                  <Label>{paymentForm.payment_mode === "upi" ? "UPI account *" : "Bank account *"}</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={paymentForm.receiver}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, receiver: e.target.value }))}
                  >
                    <option value="">
                      {paymentForm.payment_mode === "upi" ? "Select UPI account" : "Select bank account"}
                    </option>
                    {paymentReceiversForMode(paymentReceivers, paymentForm.payment_mode).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.receiver_name} · {paymentForm.payment_mode === "upi" ? r.upi_id : r.bank_name || r.account || "—"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {isTransactionIdRequired(paymentForm.payment_mode) && (
                <div>
                  <Label htmlFor="payment-field-transaction-id">Transaction ID *</Label>
                  <Input
                    id="payment-field-transaction-id"
                    value={paymentForm.transaction_id}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, transaction_id: e.target.value }))}
                    placeholder="e.g. UPI transaction ID"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="payment-field-reference">Reference (optional)</Label>
                <Input
                  id="payment-field-reference"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                  placeholder="Cheque number or other note"
                />
              </div>
              <div className="sm:col-span-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ImageDropzone
                    convertToWebp
                    label={
                      isProofScreenshotRequired(paymentForm.payment_mode)
                        ? "Proof Screenshot *"
                        : "Proof Screenshot (optional)"
                    }
                    value={paymentForm.reference_image}
                    onChange={(file) => setPaymentForm((p) => ({ ...p, reference_image: file }))}
                  />
                  <ImageDropzone
                    convertToWebp
                    label="Receipt Image *"
                    value={paymentForm.receipt_image}
                    onChange={(file) => setPaymentForm((p) => ({ ...p, receipt_image: file }))}
                  />
                </div>
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={paymentSubmitting}>
                  {paymentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save payment"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setAddPaymentOpen(false); setPaymentError(null); }}>Cancel</Button>
              </div>
            </form>
          )}

          {payments.length === 0 ? (
            <p className="text-muted-foreground">
              No payments yet. Add one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proof Screenshot</TableHead>
                  <TableHead>Receipt Image</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Rejection reason</TableHead>
                  {canVerify && <TableHead className="w-[140px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">₹ {Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell>
                      {p.next_payment_follow_up_at ? (
                        <FollowUpTimer followUpAt={p.next_payment_follow_up_at} className="text-[11px]" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{p.payment_mode}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        p.status === "verified" && "bg-green-100 text-green-800",
                        p.status === "rejected" && "bg-red-100 text-red-800",
                        p.status === "pending" && "bg-amber-100 text-amber-800"
                      )}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.reference_image ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment(p);
                            setSelectedImageField("reference_image");
                            setModalZoom(1);
                            setRejectReason("");
                            setShowRejectInput(false);
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                          View
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {p.receipt_image ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment(p);
                            setSelectedImageField("receipt_image");
                            setModalZoom(1);
                            setRejectReason("");
                            setShowRejectInput(false);
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                          View
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.added_by_name ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                      {p.status === "rejected" && p.notes ? p.notes : "—"}
                    </TableCell>
                    {canVerify && p.status === "pending" && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={verifyingId === p.id}
                            onClick={() => handleVerifyPayment(p.id, "verified")}
                          >
                            {verifyingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={verifyingId === p.id}
                            onClick={() => handleVerifyPayment(p.id, "rejected")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-8 space-y-6 border-t pt-8">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Activity className="h-5 w-5" />
                Contact & activity history
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                All calls and WhatsApp — from lead stage and after enrollment (
                {student.lead_activities_count ?? 0} lead · {student.student_activities_count ?? 0} student).
              </p>
            </div>

            <form onSubmit={handleLogStudentActivity} className="space-y-4 rounded-lg border bg-muted/20 p-4">
              {activityError && <p className="text-sm text-destructive">{activityError}</p>}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Log new student contact (payment follow-up)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select
                    value={activityForm.activity_type}
                    onChange={(e) => setActivityForm((p) => ({ ...p, activity_type: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Payment follow-up outcome</Label>
                  <select
                    value={activityForm.outcome}
                    onChange={(e) => setActivityForm((p) => ({ ...p, outcome: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="" disabled>Select outcome</option>
                    {STUDENT_ACTIVITY_OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Next payment follow-up (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={activityForm.next_follow_up_at}
                    onChange={(e) => setActivityForm((p) => ({ ...p, next_follow_up_at: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <textarea
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes (max 200 chars)"
                  rows={2}
                  maxLength={200}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit" disabled={activitySubmitting} size="sm">
                {activitySubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Log student activity
              </Button>
            </form>

            {allActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {allActivities.map((a) => {
                  const Icon = getActivityIcon(a.activity_type);
                  const isLead = a.subject_type === "lead";
                  return (
                    <li
                      key={`${a.subject_type}-${a.id}`}
                      className="flex gap-3 rounded-md border p-3 text-sm"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                              isLead
                                ? "bg-blue-100 text-blue-800"
                                : "bg-orange-100 text-orange-800"
                            )}
                          >
                            {isLead ? "Lead" : "Student"}
                          </span>
                          <span className="font-medium capitalize">{a.activity_type}</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{formatActivityOutcome(a)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatActivityDate(a.activity_at)}
                          </span>
                        </div>
                        {a.sales_person_name ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            By {a.sales_person_name}
                          </p>
                        ) : null}
                        {a.notes ? <p className="mt-1 text-muted-foreground">{a.notes}</p> : null}
                        {a.next_follow_up_at ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Next follow-up: {formatDateTime(a.next_follow_up_at)}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Confirm change</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This student will be reassigned before mentor move. Continue?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button onClick={saveCourseAndBatch} disabled={editSaving}>
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment detail modal — larger, with course & offered amount */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6"
          onClick={() => {
            setSelectedPayment(null);
            setSelectedImageField("reference_image");
            setShowRejectInput(false);
            setRejectReason("");
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div
            className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-5 py-4">
              <h2 id="payment-modal-title" className="text-xl font-semibold tracking-tight">
                Payment details
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setSelectedPayment(null);
                  setSelectedImageField("reference_image");
                  setShowRejectInput(false);
                  setRejectReason("");
                  setFollowUpError(null);
                }}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 overflow-y-auto">
              <div className="grid flex-1 gap-6 p-5 md:grid-cols-[1fr,minmax(320px,1fr)] lg:gap-8 lg:p-6">
                <div className="space-y-5">
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Student & course</h3>
                    <dl className="grid gap-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Course</dt>
                        <dd className="font-medium">
                          {(selectedPayment.student_course ?? student?.course)
                            ? (COURSE_LABELS[selectedPayment.student_course ?? student?.course] ?? (selectedPayment.student_course || student?.course))
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Offered amount</dt>
                        <dd className="font-semibold">
                          {(selectedPayment.student_payment_offered != null || student?.payment_offered != null)
                            ? `₹ ${Number(selectedPayment.student_payment_offered ?? student?.payment_offered).toLocaleString()}`
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment</h3>
                    <dl className="grid gap-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Amount</dt>
                        <dd className="text-lg font-semibold">₹ {Number(selectedPayment.amount).toLocaleString()}</dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Date</dt>
                        <dd>{formatDateTime(selectedPayment.payment_date)}</dd>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <dt className="text-muted-foreground">Next payment follow-up</dt>
                        <dd className="space-y-2">
                          <Input
                            type="datetime-local"
                            className="h-9 max-w-xs text-sm"
                            value={followUpEditValue}
                            onChange={(e) => {
                              setFollowUpEditValue(e.target.value);
                              setFollowUpError(null);
                            }}
                          />
                          {selectedPayment.next_payment_follow_up_at && (
                            <FollowUpTimer
                              followUpAt={selectedPayment.next_payment_follow_up_at}
                              className="text-sm"
                            />
                          )}
                          {followUpError && (
                            <p className="text-xs text-destructive">{followUpError}</p>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={followUpSaving}
                            onClick={() =>
                              handleUpdatePaymentFollowUp(selectedPayment.id, followUpEditValue)
                            }
                          >
                            {followUpSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : followUpEditValue ? (
                              "Save follow-up date"
                            ) : (
                              "Clear follow-up"
                            )}
                          </Button>
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Mode</dt>
                        <dd className="capitalize">{selectedPayment.payment_mode}</dd>
                      </div>
                      {selectedPayment.transaction_id && (
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground">Transaction ID</dt>
                          <dd className="break-all">{selectedPayment.transaction_id}</dd>
                        </div>
                      )}
                      {selectedPayment.reference && (
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground">Reference</dt>
                          <dd className="break-all">{selectedPayment.reference}</dd>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Uploaded by</dt>
                        <dd>{selectedPayment.added_by_name ?? "—"}</dd>
                      </div>
                      {selectedPayment.verified_by_name && (
                        <>
                          <div className="flex flex-wrap justify-between gap-2">
                            <dt className="text-muted-foreground">Verified by</dt>
                            <dd>{selectedPayment.verified_by_name}</dd>
                          </div>
                        </>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                              selectedPayment.status === "verified" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                              selectedPayment.status === "rejected" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                              selectedPayment.status === "pending" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            )}
                          >
                            {selectedPayment.status}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {selectedPayment.notes && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">Rejection reason</p>
                      <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">{selectedPayment.notes}</p>
                    </div>
                  )}

                  {selectedPayment.status === "pending" && canVerify && (
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      {!showRejectInput ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="default"
                            disabled={verifyingId === selectedPayment.id}
                            onClick={() =>
                              handleVerifyPayment(selectedPayment.id, "verified", "", () => {
                                setSelectedPayment(null);
                                setSelectedImageField("reference_image");
                                setShowRejectInput(false);
                              })
                            }
                          >
                            {verifyingId === selectedPayment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Approve
                          </Button>
                          <Button size="default" variant="outline" onClick={() => setShowRejectInput(true)}>
                            <X className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Reason for rejection (shown to who added this payment)</label>
                          <textarea
                            className="w-full min-h-[88px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            placeholder="e.g. Invalid receipt, unclear screenshot..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="default"
                              variant="destructive"
                              disabled={verifyingId === selectedPayment.id || !rejectReason.trim()}
                              onClick={() => {
                                const reason = rejectReason.trim() || "No reason provided.";
                                handleVerifyPayment(selectedPayment.id, "rejected", reason, () => {
                                  setSelectedPayment(null);
                                  setSelectedImageField("reference_image");
                                  setShowRejectInput(false);
                                  setRejectReason("");
                                });
                              }}
                            >
                              {verifyingId === selectedPayment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                              Confirm reject
                            </Button>
                            <Button size="default" variant="outline" onClick={() => { setShowRejectInput(false); setRejectReason(""); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col rounded-lg border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment images</h3>
                    {(selectedImageField === "reference_image" ? selectedPayment.reference_image : selectedPayment.receipt_image) && (
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setModalZoom((z) => Math.min(z + 0.5, 4))} aria-label="Zoom in">
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setModalZoom((z) => Math.max(z - 0.5, 0.5))} aria-label="Zoom out">
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">{Math.round(modalZoom * 100)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={selectedImageField === "reference_image" ? "default" : "outline"}
                      size="sm"
                      disabled={!selectedPayment.reference_image}
                      onClick={() => { setSelectedImageField("reference_image"); setModalZoom(1); }}
                    >
                      Proof Screenshot
                    </Button>
                    <Button
                      type="button"
                      variant={selectedImageField === "receipt_image" ? "default" : "outline"}
                      size="sm"
                      disabled={!selectedPayment.receipt_image}
                      onClick={() => { setSelectedImageField("receipt_image"); setModalZoom(1); }}
                    >
                      Receipt Image
                    </Button>
                  </div>
                  {(selectedImageField === "reference_image" ? selectedPayment.reference_image : selectedPayment.receipt_image) ? (
                    <div
                      className="min-h-[240px] flex-1 overflow-auto rounded-lg border bg-muted/20 p-3"
                      style={{ maxHeight: "min(420px, 50vh)" }}
                    >
                      <img
                        src={getMediaUrl(selectedImageField === "reference_image" ? selectedPayment.reference_image : selectedPayment.receipt_image)}
                        alt={selectedImageField === "reference_image" ? "Payment proof screenshot" : "Payment receipt image"}
                        className="max-w-full transition-transform duration-200"
                        style={{ transform: `scale(${modalZoom})`, transformOrigin: "top left" }}
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[200px] flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
                      {selectedImageField === "reference_image" ? "No proof screenshot uploaded" : "No receipt image uploaded"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
