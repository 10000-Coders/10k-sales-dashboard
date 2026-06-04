"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import withPrivateAuth from "@/components/withPrivateAuth";

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
import { Loader2, Check, X, ImageIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function getMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_baseUrl || "";
  return `${base}/media/${path.replace(/^\//, "")}`;
}

function canViewPayments(role) {
  return role === "admin" || role === "manager" || role === "super_admin" || role === "counselor";
}

const PAYMENT_MODE_LABELS = {
  upi: "UPI",
  bank: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  other: "Other",
};

const COURSE_LABELS = {
  python_fullstack: "Python Fullstack",
  java_fullstack: "Java Fullstack",
  mern: "MERN",
  data_science: "Data Science",
  devops: "DevOps",
};

/** Module-level cache + in-flight dedup to avoid duplicate payments/batch-summary/receivers API calls (e.g. Strict Mode) */
const PAYMENTS_CACHE_MS = 2 * 60 * 1000; // 2 min
const paymentsCache = new Map();
const paymentsFetchPromises = new Map();
let batchSummaryInFlightKey = null;
let batchSummaryInFlightPromise = null;

function paymentsCacheKey(prefix, params) {
  return `${prefix}:${params?.toString() ?? ""}`;
}

function clearPaymentsListAndSummaryCache() {
  for (const key of paymentsCache.keys()) {
    if (key.startsWith("payments:") || key.startsWith("batch-summary")) {
      paymentsCache.delete(key);
      paymentsFetchPromises.delete(key);
    }
  }
  batchSummaryInFlightKey = null;
  batchSummaryInFlightPromise = null;
}

/**
 * @typedef {Object} PaymentItem
 * @property {string | null | undefined} reference_image
 * @property {string | null | undefined} receipt_image
 */

function PaymentsPage() {
  const router = useRouter();
  const user = useSelector((state) => state.userAuth?.user);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSalesPerson, setFilterSalesPerson] = useState(""); // sales_person id
  const [filterSalesBatch, setFilterSalesBatch] = useState("");
  const [filterMentorBatch, setFilterMentorBatch] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [summaryRows, setSummaryRows] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [batchPaymentsModalOpen, setBatchPaymentsModalOpen] = useState(false);
  const [batchPaymentsLoading, setBatchPaymentsLoading] = useState(false);
  const [batchPaymentsError, setBatchPaymentsError] = useState(null);
  const [batchPayments, setBatchPayments] = useState([]);
  const [batchPaymentsTitle, setBatchPaymentsTitle] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedImageField, setSelectedImageField] = useState("reference_image");
  const [modalZoom, setModalZoom] = useState(1);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const imageContainerRef = useRef(null);
  const [receivers, setReceivers] = useState([]);
  const [receiverLoading, setReceiverLoading] = useState(false);
  const [receiverListModalOpen, setReceiverListModalOpen] = useState(false);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState(null);
  const [receiverForm, setReceiverForm] = useState({
    receiver_name: "",
    account: "",
    bank_name: "",
    branch: "",
    ifsc: "",
    status: "active",
  });
  const [receiverSaving, setReceiverSaving] = useState(false);
  const [receiverError, setReceiverError] = useState(null);

  const userRole = (user?.role || "").toLowerCase();
  const canView = canViewPayments(userRole);
  const canVerify = userRole === "manager";
  const canManageReceivers = userRole === "manager";
  const superAdminNeedsBatch =
    userRole === "super_admin" && !filterSalesBatch && !filterMentorBatch;

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);


  const fetchPayments = useCallback(async () => {
    if (!canView) return;
    if (superAdminNeedsBatch) {
      setPayments([]);
      setError("Select a sales batch or mentor batch to view payments.");
      return;
    }
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterSalesPerson) params.set("sales_person", filterSalesPerson);
    if (filterSalesBatch) params.set("sales_batch", filterSalesBatch);
    if (filterMentorBatch) params.set("mentor_batch", filterMentorBatch);
    if (filterDateRange) params.set("date_range", filterDateRange);
    if (filterDateFrom) params.set("date_from", filterDateFrom);
    if (filterDateTo) params.set("date_to", filterDateTo);
    const key = paymentsCacheKey("payments", params);
    const cached = paymentsCache.get(key);
    if (cached && Date.now() - cached.at < PAYMENTS_CACHE_MS) {
      setPayments(cached.data);
      return;
    }
    let promise = paymentsFetchPromises.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const url = params.toString() ? `/payments/?${params.toString()}` : "/payments/";
          const { data } = await axios.get(url, { headers: getHeaders() });
          const list = data?.results ?? (Array.isArray(data) ? data : []);
          paymentsCache.set(key, { data: list, at: Date.now() });
          return list;
        } finally {
          paymentsFetchPromises.delete(key);
        }
      })();
      paymentsFetchPromises.set(key, promise);
    }
    try {
      setLoading(true);
      setError(null);
      const list = await promise;
      setPayments(list);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load payments.");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [
    canView,
    superAdminNeedsBatch,
    filterStatus,
    filterSalesPerson,
    filterSalesBatch,
    filterMentorBatch,
    filterDateRange,
    filterDateFrom,
    filterDateTo,
    getHeaders,
  ]);

  const fetchBatchSummary = useCallback(async () => {
    if (!canView) return;
    if (superAdminNeedsBatch) {
      setSummaryRows([]);
      setSummaryError(null);
      return;
    }
    const buildParams = () => {
      const params = new URLSearchParams();
      params.set("group_by", "sales_batch");
      if (filterStatus) params.set("status", filterStatus);
      if (filterSalesPerson) params.set("sales_person", filterSalesPerson);
      if (filterSalesBatch) params.set("sales_batch", filterSalesBatch);
      if (filterMentorBatch) params.set("mentor_batch", filterMentorBatch);
      if (filterDateRange) params.set("date_range", filterDateRange);
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);
      return params.toString();
    };
    const summaryParams = buildParams();
    const cacheKey = paymentsCacheKey("batch-summary", summaryParams);

    const cached = paymentsCache.get(cacheKey);
    if (cached && Date.now() - cached.at < PAYMENTS_CACHE_MS) {
      setSummaryRows(cached.data);
      return;
    }
    if (batchSummaryInFlightKey === cacheKey && batchSummaryInFlightPromise) {
      try {
        setSummaryLoading(true);
        setSummaryError(null);
        const rows = await batchSummaryInFlightPromise;
        setSummaryRows(rows);
      } catch (err) {
        setSummaryRows([]);
        setSummaryError(err.response?.data?.detail || "Failed to load batch summary.");
      } finally {
        setSummaryLoading(false);
      }
      return;
    }

    const doFetch = async () => {
      const url = `/payments/batch-summary/${summaryParams ? `?${summaryParams}` : ""}`;
      const { data } = await axios.get(url, { headers: getHeaders() });
      const rows = Array.isArray(data) ? data : data?.results ?? [];
      paymentsCache.set(cacheKey, { data: rows, at: Date.now() });
      return rows;
    };

    batchSummaryInFlightKey = cacheKey;
    batchSummaryInFlightPromise = doFetch();

    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const rows = await batchSummaryInFlightPromise;
      setSummaryRows(rows);
    } catch (err) {
      setSummaryRows([]);
      setSummaryError(err.response?.data?.detail || "Failed to load batch summary.");
    } finally {
      batchSummaryInFlightKey = null;
      batchSummaryInFlightPromise = null;
      setSummaryLoading(false);
    }
  }, [
    canView,
    superAdminNeedsBatch,
    filterStatus,
    filterSalesPerson,
    filterSalesBatch,
    filterMentorBatch,
    filterDateRange,
    filterDateFrom,
    filterDateTo,
    getHeaders,
  ]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchBatchSummary();
  }, [fetchBatchSummary]);

  const fetchReceivers = useCallback(async () => {
    if (!canManageReceivers) return;
    const key = paymentsCacheKey("receivers", "");
    const cached = paymentsCache.get(key);
    if (cached && Date.now() - cached.at < PAYMENTS_CACHE_MS) {
      setReceivers(cached.data);
      return;
    }
    let promise = paymentsFetchPromises.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const { data } = await axios.get("/payment-receivers/", { headers: getHeaders() });
          const list = data?.results ?? (Array.isArray(data) ? data : []);
          paymentsCache.set(key, { data: list, at: Date.now() });
          return list;
        } finally {
          paymentsFetchPromises.delete(key);
        }
      })();
      paymentsFetchPromises.set(key, promise);
    }
    try {
      setReceiverLoading(true);
      const list = await promise;
      setReceivers(list);
    } catch {
      setReceivers([]);
    } finally {
      setReceiverLoading(false);
    }
  }, [canManageReceivers, getHeaders]);

  useEffect(() => {
    fetchReceivers();
  }, [fetchReceivers]);

  const openReceiverModal = (receiver = null) => {
    setEditingReceiver(receiver);
    setReceiverForm(
      receiver
        ? {
            receiver_name: receiver.receiver_name || "",
            account: receiver.account || "",
            bank_name: receiver.bank_name || "",
            branch: receiver.branch || "",
            ifsc: receiver.ifsc || "",
            status: receiver.status || "active",
          }
        : {
            receiver_name: "",
            account: "",
            bank_name: "",
            branch: "",
            ifsc: "",
            status: "active",
          }
    );
    setReceiverError(null);
    setReceiverModalOpen(true);
  };

  const closeReceiverModal = () => {
    setReceiverModalOpen(false);
    setEditingReceiver(null);
    setReceiverError(null);
  };

  const handleSaveReceiver = async (e) => {
    e.preventDefault();
    const name = (receiverForm.receiver_name || "").trim();
    const account = (receiverForm.account || "").trim();
    const bank = (receiverForm.bank_name || "").trim();
    const branch = (receiverForm.branch || "").trim();
    const ifsc = (receiverForm.ifsc || "").trim();

    if (!name || name.length < 3) {
      setReceiverError("Receiver name must be at least 3 characters.");
      return;
    }
    if (!/^[0-9]{6,18}$/.test(account)) {
      setReceiverError("Account number must be 6-18 digits (numbers only).");
      return;
    }
    if (!bank) {
      setReceiverError("Bank name is required.");
      return;
    }
    if (!branch || branch.length < 3) {
      setReceiverError("Branch is required (minimum 3 characters).");
      return;
    }
    if (ifsc && !/^[A-Za-z]{4}0[0-9A-Za-z]{6}$/.test(ifsc)) {
      setReceiverError("Enter a valid IFSC (e.g., HDFC0001234).");
      return;
    }
    setReceiverSaving(true);
    setReceiverError(null);
    try {
      if (editingReceiver) {
        await axios.patch(`/payment-receivers/${editingReceiver.id}/`, receiverForm, { headers: getHeaders() });
      } else {
        await axios.post("/payment-receivers/", receiverForm, { headers: getHeaders() });
      }
      paymentsCache.delete(paymentsCacheKey("receivers", ""));
      paymentsFetchPromises.delete(paymentsCacheKey("receivers", ""));
      fetchReceivers();
      closeReceiverModal();
    } catch (err) {
      const d = err.response?.data;
      setReceiverError(d?.detail || (d && typeof d === "object" ? JSON.stringify(d) : "Failed to save."));
    } finally {
      setReceiverSaving(false);
    }
  };

  const handleDeleteReceiver = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment receiver? This action cannot be undone.")) return;
    try {
      await axios.delete(`/payment-receivers/${id}/`, { headers: getHeaders() });
      setReceivers((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const d = err.response?.data;
      alert(d?.detail || "Failed to delete receiver. Please try again.");
    }
  };

  const openModal = (p, imageField = "reference_image") => {
    setSelectedPayment(p);
    setSelectedImageField(imageField);
    setModalZoom(1);
    setRejectReason("");
    setShowRejectInput(false);
  };

  const closeModal = () => {
    setSelectedPayment(null);
    setSelectedImageField("reference_image");
    setShowRejectInput(false);
    setRejectReason("");
  };

  const handleVerify = async (paymentId, status, notes = "") => {
    setVerifyingId(paymentId);
    try {
      const { data: updated } = await axios.patch(
        `/payments/${paymentId}/`,
        { status, ...(notes ? { notes } : {}) },
        { headers: getHeaders() }
      );
      
      // Update main payments list (include recalculated student_due_amount from API)
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, ...updated } : p))
      );

      // Update batch payments list if it's open
      if (batchPaymentsModalOpen) {
        setBatchPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, ...updated } : p))
        );
      }

      // Invalidate cache so batch summary refetches fresh counts
      clearPaymentsListAndSummaryCache();
      fetchBatchSummary();

      // Close the detail modal
      closeModal();
    } catch (err) {
      if (err.response?.status === 403) {
        alert("Only Manager can verify/reject payments."); 
      } else {
        console.error(err);
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRejectConfirm = () => {
    if (!selectedPayment) return;
    const reason = rejectReason.trim() || "No reason provided.";
    handleVerify(selectedPayment.id, "rejected", reason);
  };

  const openBatchPaymentsModal = async (row) => {
    try {
      setBatchPaymentsModalOpen(true);
      setBatchPaymentsTitle(row.batch_name || "Unassigned");
      setBatchPaymentsLoading(true);
      setBatchPaymentsError(null);
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSalesPerson) params.set("sales_person", filterSalesPerson);
      if (filterSalesBatch) params.set("sales_batch", filterSalesBatch);
      if (filterMentorBatch) params.set("mentor_batch", filterMentorBatch);
      if (filterDateRange) params.set("date_range", filterDateRange);
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);
      params.set("sales_batch", String(row.batch_key || row.batch_name || ""));
      clearPaymentsListAndSummaryCache();
      const url = `/payments/${params.toString() ? `?${params.toString()}` : ""}`;
      const { data } = await axios.get(url, { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setBatchPayments(list);
    } catch (err) {
      setBatchPayments([]);
      setBatchPaymentsError(err.response?.data?.detail || "Failed to load batch payments.");
    } finally {
      setBatchPaymentsLoading(false);
    }
  };

  const salesPersonOptions = Array.from(
    new Map(
      payments
        .filter((p) => p?.added_by != null)
        .map((p) => [String(p.added_by), p.sales_person_name || p.added_by_name || `User ${p.added_by}`])
    ).entries()
  ).map(([id, name]) => ({ id, name }));
  const salesBatchOptions = Array.from(new Set(payments.map((p) => p.sales_batch_name).filter(Boolean)));

  const getVerifiedAmount = (row) => {
    const keys = [
      "verified_amount",
      "total_verified_amount",
      "verified_total_amount",
      "total_amount_verified",
      "verified_sum",
      "verified_amount_sum",
    ];
    for (const k of keys) {
      if (row[k] != null) return Number(row[k]) || 0;
    }
    // Fallback to total_amount if backend hasn't added a verified-only field yet
    return Number(row.total_amount || 0) || 0;
  };

  const getTotalDueAmount = (row) => Number(row.total_due_amount ?? 0) || 0;

  const getStudentDueAmount = (payment) => {
    if (payment?.student_due_amount != null && payment.student_due_amount !== "") {
      return Number(payment.student_due_amount) || 0;
    }
    const offered = payment?.student_payment_offered;
    if (offered == null || offered === "") return null;
    return 0;
  };

  // ... withPrivateAuth handles the initial !user and !canView checks for page access ...


  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Payments</CardTitle>
              <CardDescription>
                View all payments. Batch summary is shown above the table for quick drill-down.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              {(user?.role === "manager" || user?.role === "super_admin") && (
                <select
                  value={filterSalesPerson}
                  onChange={(e) => setFilterSalesPerson(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">All sales persons</option>
                  {salesPersonOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
              <select
                value={filterSalesBatch}
                onChange={(e) => setFilterSalesBatch(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">All sales batches</option>
                {salesBatchOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <input
                type="text"
                value={filterMentorBatch}
                onChange={(e) => setFilterMentorBatch(e.target.value)}
                placeholder="Mentor batch (id or name)"
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Date preset</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="From"
              />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                placeholder="To"
              />
              {canManageReceivers && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReceiverListModalOpen(true)}
                  className="h-9"
                >
                  Banks
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Sales Batch-wise summary</p>
            </div>
            {summaryLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : summaryError ? (
              <p className="py-4 text-sm text-destructive">{summaryError}</p>
            ) : summaryRows.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No summary rows.</p>
            ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Total Payments</TableHead>
                <TableHead>Verified Amount</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Rejected</TableHead>
              </TableRow>
            </TableHeader>
                <TableBody>
                  {summaryRows.map((row) => (
                    <TableRow
                      key={`sales_batch-${row.batch_key}-${row.batch_name}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openBatchPaymentsModal(row)}
                    >
                      <TableCell className="font-medium">{row.batch_name || "Unassigned"}</TableCell>
                      <TableCell>{row.total_payments ?? 0}</TableCell>
                      <TableCell>₹ {getVerifiedAmount(row).toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-orange-700 dark:text-orange-400">
                        ₹ {getTotalDueAmount(row).toLocaleString()}
                      </TableCell>
                      <TableCell>{row.pending_count ?? 0}</TableCell>
                      <TableCell>{row.verified_count ?? 0}</TableCell>
                      <TableCell>{row.rejected_count ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <p className="py-2 text-sm text-muted-foreground">
            Click a sales batch row above to view all payments in that batch.
          </p>
        </CardContent>
      </Card>

      {batchPaymentsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6"
          onClick={() => setBatchPaymentsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-payments-title"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-5 py-4">
              <div>
                <h2 id="batch-payments-title" className="text-xl font-semibold tracking-tight">
                  {batchPaymentsTitle} payments
                </h2>
                <p className="text-sm text-muted-foreground">
                  Click a payment row for full details and verify/reject.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setBatchPaymentsModalOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {batchPaymentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : batchPaymentsError ? (
                <p className="py-6 text-center text-destructive">{batchPaymentsError}</p>
              ) : batchPayments.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">No payments found for this batch.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Sales Batch</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded by</TableHead>
                      <TableHead>Proof Screenshot</TableHead>
                      <TableHead>Receipt Image</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchPayments.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openModal(p)}
                      >
                        <TableCell>
                          <span className="font-medium">{p.student_name ?? "—"}</span>
                        </TableCell>
                        <TableCell>{p.sales_person_name || "Unassigned"}</TableCell>
                        <TableCell>{p.sales_batch_name || "Unassigned"}</TableCell>
                        <TableCell className="font-medium">₹ {Number(p.amount).toLocaleString()}</TableCell>
                        <TableCell className="font-medium text-orange-700 dark:text-orange-400">
                          {getStudentDueAmount(p) != null
                            ? `₹ ${getStudentDueAmount(p).toLocaleString()}`
                            : "—"}
                        </TableCell>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell>{PAYMENT_MODE_LABELS[p.payment_mode] ?? p.payment_mode}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              p.status === "verified" && "bg-green-100 text-green-800",
                              p.status === "rejected" && "bg-red-100 text-red-800",
                              p.status === "pending" && "bg-amber-100 text-amber-800"
                            )}
                          >
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.added_by_name ?? "—"}</TableCell>
                        <TableCell>
                          {p.reference_image ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal(p, "reference_image");
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
                                openModal(p, "receipt_image");
                              }}
                            >
                              <ImageIcon className="h-4 w-4" />
                              View
                            </button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment detail modal — larger, clearer layout with offered amount & course */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6"
          onClick={closeModal}
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
              <Button variant="ghost" size="icon" className="rounded-full" onClick={closeModal} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 overflow-y-auto">
              <div className="grid flex-1 gap-6 p-5 md:grid-cols-[1fr,minmax(320px,1fr)] lg:gap-8 lg:p-6">
                {/* Left: details in card sections */}
                <div className="space-y-5">
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Student & course</h3>
                    <dl className="grid gap-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Student</dt>
                        <dd>
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/students/${selectedPayment.student}`);
                              closeModal();
                            }}
                          >
                            {selectedPayment.student_name ?? "—"}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Course</dt>
                        <dd className="font-medium">
                          {selectedPayment.student_course ? (COURSE_LABELS[selectedPayment.student_course] ?? selectedPayment.student_course) : "—"}
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Offered amount</dt>
                        <dd className="font-semibold">
                          {selectedPayment.student_payment_offered != null
                            ? `₹ ${Number(selectedPayment.student_payment_offered).toLocaleString()}`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-muted-foreground">Amount due</dt>
                        <dd className="font-semibold text-orange-700 dark:text-orange-400">
                          {getStudentDueAmount(selectedPayment) != null
                            ? `₹ ${getStudentDueAmount(selectedPayment).toLocaleString()}`
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
                        <dd>{PAYMENT_MODE_LABELS[selectedPayment.payment_mode] ?? selectedPayment.payment_mode}</dd>
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
                          <div className="flex flex-wrap justify-between gap-2">
                            <dt className="text-muted-foreground">Verified at</dt>
                            <dd>{formatDateTime(selectedPayment.verified_at)}</dd>
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

                  {selectedPayment.notes && selectedPayment.status !== "rejected" && (
                    <div className="rounded-lg border bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-200">Payment note</p>
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-white/70 p-3 text-sm text-blue-900 shadow-inner dark:bg-blue-950/40 dark:text-blue-50">
                        <div className="min-h-[40px] min-w-[200px] max-w-full whitespace-pre-wrap break-all leading-relaxed">
                          {selectedPayment.notes}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPayment.status === "rejected" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">Rejection reason (visible to who added)</p>
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-white/60 p-3 text-sm text-amber-900 shadow-inner dark:bg-amber-950/40 dark:text-amber-100">
                        <div className="min-h-[40px] min-w-[200px] max-w-full whitespace-pre-wrap break-all leading-relaxed">
                          {selectedPayment.notes || "No reason provided."}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPayment.status === "pending" && canVerify && (
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      {!showRejectInput ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="default"
                            disabled={verifyingId === selectedPayment.id}
                            onClick={() => handleVerify(selectedPayment.id, "verified")}
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
                            className="w-full min-h-[88px] max-h-48 rounded-lg border border-input bg-background px-3 py-2 text-sm overflow-y-auto"
                            placeholder="e.g. Invalid receipt, unclear screenshot..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="default"
                              variant="destructive"
                              disabled={verifyingId === selectedPayment.id || !rejectReason.trim()}
                              onClick={handleRejectConfirm}
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

                {/* Right: proof/receipt image */}
                <div className="flex flex-col rounded-lg border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Payment images</h3>
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
                      ref={imageContainerRef}
                      className="min-h-[240px] flex-1 overflow-auto rounded-lg border bg-muted/20 p-3"
                      style={{ maxHeight: "min(420px, 50vh)" }}
                      onWheel={(e) => {
                        // Prevent page zoom/scroll; use wheel to zoom image only
                        e.preventDefault();
                        e.stopPropagation();
                        const delta = e.deltaY > 0 ? -0.1 : 0.1;
                        setModalZoom((z) => Math.min(4, Math.max(0.5, +(z + delta).toFixed(2))));
                      }}
                      onDoubleClick={() => setModalZoom(1)}
                    >
                      <div
                        className="max-w-full"
                        style={{
                          transform: `scale(${modalZoom})`,
                          transformOrigin: "center",
                          transition: "transform 120ms ease-out",
                          display: "inline-block",
                        }}
                      >
                        <img
                          src={getMediaUrl(selectedImageField === "reference_image" ? selectedPayment.reference_image : selectedPayment.receipt_image)}
                          alt={selectedImageField === "reference_image" ? "Payment proof screenshot" : "Payment receipt image"}
                          className="max-w-full w-full h-full object-contain"
                          style={{ maxHeight: "360px" }}
                          draggable={false}
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Scroll/Pinch (with Ctrl/⌘) to zoom, double-click to reset.
                      </p>
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

      {/* Manager bank list modal */}
      {receiverListModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6"
          onClick={() => setReceiverListModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="receiver-list-modal-title"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-5 py-4">
              <h2 id="receiver-list-modal-title" className="text-xl font-semibold tracking-tight">
                All bank accounts
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReceiverListModalOpen(false);
                    openReceiverModal(null);
                  }}
                >
                  Add bank
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setReceiverListModalOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {receiverLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : receivers.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No receiver accounts yet. Add one to show in UPI/bank payment form.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receiver name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Bank · Branch</TableHead>
                      <TableHead>IFSC</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivers.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.receiver_name}</TableCell>
                        <TableCell className="font-mono text-sm">{r.account}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.bank_name}
                          {r.branch ? ` · ${r.branch}` : ""}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{r.ifsc || "—"}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              r.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReceiverListModalOpen(false);
                              openReceiverModal(r);
                            }}
                          >
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteReceiver(r.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment receiver add/edit modal — Manager only */}
      {receiverModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeReceiverModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="receiver-modal-title"
        >
          <div
            className="relative w-full max-w-md rounded-xl border bg-background shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="receiver-modal-title" className="text-lg font-semibold mb-4">
              {editingReceiver ? "Edit receiver account" : "Add receiver account"}
            </h2>
            {receiverError && (
              <p className="mb-3 text-sm text-destructive">{receiverError}</p>
            )}
            <form onSubmit={handleSaveReceiver} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Receiver name *</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={receiverForm.receiver_name}
                  onChange={(e) => setReceiverForm((f) => ({ ...f, receiver_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Account number *</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={receiverForm.account}
                  onChange={(e) => setReceiverForm((f) => ({ ...f, account: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Bank name *</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={receiverForm.bank_name}
                  onChange={(e) => setReceiverForm((f) => ({ ...f, bank_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Branch</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={receiverForm.branch}
                  onChange={(e) => setReceiverForm((f) => ({ ...f, branch: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">IFSC</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={receiverForm.ifsc}
                  onChange={(e) => setReceiverForm((f) => ({ ...f, ifsc: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={receiverForm.status}
                  onChange={(e) => setReceiverForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={receiverSaving}>
                  {receiverSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={closeReceiverModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default withPrivateAuth(PaymentsPage);
