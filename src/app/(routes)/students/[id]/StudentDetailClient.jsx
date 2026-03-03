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
import { Loader2, ArrowLeft, Phone, Mail, User, Check, X, ImageIcon, ZoomIn, ZoomOut } from "lucide-react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";

const PAYMENT_MODE_OPTIONS = [
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const COURSE_LABELS = {
  python_fullstack: "Python Fullstack",
  java_fullstack: "Java Fullstack",
  mern: "MERN",
  data_science: "Data Science",
  devops: "DevOps",
};

const COURSE_OPTIONS = [
  { value: "python_fullstack", label: "Python Fullstack" },
  { value: "java_fullstack", label: "Java Fullstack" },
  { value: "mern", label: "MERN" },
  { value: "data_science", label: "Data Science" },
  { value: "devops", label: "DevOps" },
];

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

function canVerifyPayments(role) {
  return role === "manager";
}

export default function StudentDetailClient() {
  const params = useParams();
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const id = params?.id;
  const [student, setStudent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_mode: "upi",
    receiver: "",
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
  const [salesBatches, setSalesBatches] = useState([]);
  const [salesBatchesLoading, setSalesBatchesLoading] = useState(false);
  const [salesBatchesError, setSalesBatchesError] = useState(null);
  const [editCourse, setEditCourse] = useState("");
  const [editSalesBatch, setEditSalesBatch] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const base = process.env.NEXT_PUBLIC_baseUrl || "";
    return `${base}/media/${path.replace(/^\//, "")}`;
  };
  const canVerify = canVerifyPayments(user?.role);

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

  const fetchPaymentReceivers = useCallback(async () => {
    try {
      const { data } = await axios.get("/payment-receivers/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setPaymentReceivers(list);
    } catch {
      setPaymentReceivers([]);
    }
  }, [getHeaders]);

  const fetchSalesBatches = useCallback(async () => {
    try {
      setSalesBatchesLoading(true);
      setSalesBatchesError(null);
      const { data } = await axios.get("/sales-batches/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setSalesBatches(list);
    } catch (err) {
      setSalesBatches([]);
      setSalesBatchesError(err.response?.data?.detail || "Failed to load sales batches.");
    } finally {
      setSalesBatchesLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchStudent(), fetchPayments()]).finally(() => setLoading(false));
  }, [id, fetchStudent, fetchPayments]);

  useEffect(() => {
    fetchSalesBatches();
  }, [fetchSalesBatches]);

  useEffect(() => {
    if (addPaymentOpen && (paymentForm.payment_mode === "upi" || paymentForm.payment_mode === "bank")) {
      fetchPaymentReceivers();
    }
  }, [addPaymentOpen, paymentForm.payment_mode, fetchPaymentReceivers]);

  const handleVerifyPayment = async (paymentId, status, notes = "", onSuccess) => {
    setVerifyingId(paymentId);
    try {
      await axios.patch(
        `/payments/${paymentId}/`,
        { status, ...(notes ? { notes } : {}) },
        { headers: getHeaders() }
      );
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
  const pendingAmount = offeredAmount != null ? Math.max(0, offeredAmount - committedAmount) : null;
  
  const isFullyPaid = offeredAmount != null && committedAmount >= offeredAmount;
  const canManageCourseBatch = user?.role === "manager" || user?.role === "super_admin";

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!id || !paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    if (!paymentForm.reference_image || !paymentForm.receipt_image) {
      setPaymentError("Both Proof Screenshot and Receipt Image are required.");
      return;
    }
    if ((paymentForm.payment_mode === "upi" || paymentForm.payment_mode === "bank") && !paymentForm.receiver) {
      setPaymentError("Please select a receiver bank account for UPI / Bank Transfer payments.");
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
      formData.append("payment_mode", paymentForm.payment_mode || "upi");
      if (paymentForm.receiver) formData.append("receiver", paymentForm.receiver);
      formData.append("reference", paymentForm.reference || "");
      formData.append("notes", paymentForm.notes || "");
      formData.append("reference_image", paymentForm.reference_image);
      formData.append("receipt_image", paymentForm.receipt_image);
      await axios.post(`/students/${id}/payments/`, formData, { headers });
      setPaymentForm({
        amount: "",
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: "upi",
        receiver: "",
        reference: "",
        notes: "",
        reference_image: null,
        receipt_image: null,
      });
      setAddPaymentOpen(false);
      fetchPayments();
      fetchStudent();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.detail || (typeof data === "object" ? JSON.stringify(data) : err.message) || "Failed to add payment.";
      setPaymentError(msg);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const saveCourseAndBatch = async () => {
    if (!id || student?.is_moved_to_batch) return;
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
    <div className="flex flex-1 flex-col gap-6 p-8">
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
            <span className={cn("rounded-full px-3 py-1 text-sm font-medium", displayStatusBadge)}>
              {student.display_status_label ?? "—"}
              {student.is_moved_to_batch && (
                <span className="ml-1.5 opacity-90">· Moved to batch</span>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{student.student_mobile || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{student.student_email || "—"}</span>
            </div>
          </div>
          {student.guardian_number_1 && (
            <p className="text-sm text-muted-foreground">
              Guardian {student.guardian_relation_1 || ""}: {student.guardian_number_1}
            </p>
          )}
          {student.course && (
            <p className="text-sm font-medium">Course: {COURSE_LABELS[student.course] ?? student.course}</p>
          )}
          {student.payment_offered != null && (
            <p className="text-sm text-muted-foreground">Offered amount: ₹ {Number(student.payment_offered).toLocaleString()}</p>
          )}
          {student.college_name && (
            <p className="text-sm text-muted-foreground">College: {student.college_name} · {student.student_degree || ""}</p>
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
                <Label>Course</Label>
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
                <Label>Sales batch</Label>
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
                  onClick={() => setConfirmOpen(true)}
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
                <Label>Mode</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={paymentForm.payment_mode}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_mode: e.target.value, receiver: "" }))}
                >
                  {PAYMENT_MODE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {(paymentForm.payment_mode === "upi" || paymentForm.payment_mode === "bank") && (
                <div>
                  <Label>Receiver account *</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={paymentForm.receiver}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, receiver: e.target.value }))}
                  >
                    <option value="">Select receiver account</option>
                    {paymentReceivers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.receiver_name} · {r.bank_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Reference</Label>
                <Input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ImageDropzone
                    label="Proof Screenshot *"
                    value={paymentForm.reference_image}
                    onChange={(file) => setPaymentForm((p) => ({ ...p, reference_image: file }))}
                  />
                  <ImageDropzone
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
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Mode</dt>
                        <dd className="capitalize">{selectedPayment.payment_mode}</dd>
                      </div>
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
