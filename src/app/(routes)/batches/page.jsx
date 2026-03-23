"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import useToast from "@/hooks/useToast";
import Select from "react-select";

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

function canManageSalesBatches(role) {
  return role === "manager" || role === "super_admin";
}

/** Module-level cache + in-flight dedup for /sales-batches/ (avoids 2x call from Strict Mode) */
const SALES_BATCHES_CACHE_MS = 2 * 60 * 1000; // 2 min
const salesBatchesCache = { data: null, at: 0 };
let salesBatchesFetchPromise = null;

function clearSalesBatchesCache() {
  salesBatchesCache.data = null;
  salesBatchesCache.at = 0;
  salesBatchesFetchPromise = null;
}

/** Module-level cache + in-flight dedup for /students/?sales_batch=<id> (avoids 2x call from Strict Mode) */
const BATCH_STUDENTS_CACHE_MS = 2 * 60 * 1000; // 2 min
const batchStudentsCache = new Map(); // salesBatchId -> { data, at }
const batchStudentsFetchPromises = new Map(); // salesBatchId -> Promise

function clearBatchStudentsCache(salesBatchId = null) {
  if (salesBatchId != null) {
    batchStudentsCache.delete(String(salesBatchId));
    batchStudentsFetchPromises.delete(String(salesBatchId));
  } else {
    batchStudentsCache.clear();
    batchStudentsFetchPromises.clear();
  }
}

function BatchesPage() {
  const user = useSelector((state) => state.userAuth?.user);
  const canManage = canManageSalesBatches(user?.role);
  const { showSuccessToast, showErrorToast } = useToast();
  const [salesBatches, setSalesBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    course: "",
    capacity: "",
    status: "active",
  });
  const [selectedSalesBatchId, setSelectedSalesBatchId] = useState("");
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [batchStudents, setBatchStudents] = useState([]);
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false);
  const [batchStudentsError, setBatchStudentsError] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [mentorBatches, setMentorBatches] = useState([]);
  const [mentorBatchesLoading, setMentorBatchesLoading] = useState(false);
  const [targetBatch, setTargetBatch] = useState("");
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [moveError, setMoveError] = useState(null);
  const [paymentSummaryByStudent, setPaymentSummaryByStudent] = useState({});
  const [paymentSummaryLoading, setPaymentSummaryLoading] = useState(false);
  const lastBatchStudentsFetchRef = useRef({ id: null, at: 0 });

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  const fetchSalesBatches = useCallback(async () => {
    if (salesBatchesCache.data != null && Date.now() - salesBatchesCache.at < SALES_BATCHES_CACHE_MS) {
      setSalesBatches(salesBatchesCache.data);
      setLoading(false);
      return;
    }
    if (salesBatchesFetchPromise) {
      try {
        setLoading(true);
        setError(null);
        const list = await salesBatchesFetchPromise;
        setSalesBatches(list);
      } catch (err) {
        setSalesBatches([]);
        setError(err.response?.data?.detail || "Failed to load sales batches.");
      } finally {
        setLoading(false);
      }
      return;
    }
    try {
      setLoading(true);
      setError(null);
      salesBatchesFetchPromise = (async () => {
        try {
          const { data } = await axios.get("/sales-batches/", { headers: getHeaders() });
          const list = data?.results ?? (Array.isArray(data) ? data : []);
          salesBatchesCache.data = list;
          salesBatchesCache.at = Date.now();
          return list;
        } finally {
          salesBatchesFetchPromise = null;
        }
      })();
      const list = await salesBatchesFetchPromise;
      setSalesBatches(list);
    } catch (err) {
      setSalesBatches([]);
      setError(err.response?.data?.detail || "Failed to load sales batches.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchBatchStudents = useCallback(async (salesBatchId) => {
    if (!salesBatchId) return;
    const key = String(salesBatchId);
    const cached = batchStudentsCache.get(key);
    if (cached && Date.now() - cached.at < BATCH_STUDENTS_CACHE_MS) {
      setBatchStudents(cached.data);
      return;
    }
    let promise = batchStudentsFetchPromises.get(key);
    if (!promise) {
      promise = (async () => {
        try {
          const params = new URLSearchParams();
          params.set("sales_batch", key);
          const { data } = await axios.get(`/students/?${params.toString()}`, { headers: getHeaders() });
          const list = data?.results ?? (Array.isArray(data) ? data : []);
          batchStudentsCache.set(key, { data: list, at: Date.now() });
          return list;
        } finally {
          batchStudentsFetchPromises.delete(key);
        }
      })();
      batchStudentsFetchPromises.set(key, promise);
    }
    try {
      setBatchStudentsLoading(true);
      setBatchStudentsError(null);
      const list = await promise;
      setBatchStudents(list);
    } catch (err) {
      setBatchStudents([]);
      setBatchStudentsError(err.response?.data?.detail || "Failed to load students in this sales batch.");
    } finally {
      setBatchStudentsLoading(false);
    }
  }, [getHeaders]);

  const fetchPaymentSummaries = useCallback((studentsList) => {
    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      setPaymentSummaryByStudent({});
      return;
    }
    setPaymentSummaryLoading(true);
    try {
      const entries = studentsList
        .filter((s) => s?.id != null)
        .map((s) => {
          const verified = Number(s.total_paid ?? 0);
          const pending = Number(s.pending_amount ?? 0);
          return [s.id, { verified, pending }];
        });
      const mapped = Object.fromEntries(entries);
      setPaymentSummaryByStudent(mapped);
    } finally {
      setPaymentSummaryLoading(false);
    }
  }, []);

  const fetchMentorBatches = useCallback(async () => {
    try {
      setMentorBatchesLoading(true);
      const { data } = await axios.get("/batches/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setMentorBatches(list);
    } catch {
      setMentorBatches([]);
    } finally {
      setMentorBatchesLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchSalesBatches();
  }, [fetchSalesBatches]);

  useEffect(() => {
    if (moveModalOpen) fetchMentorBatches();
  }, [moveModalOpen, fetchMentorBatches]);

  useEffect(() => {
    if (!selectedSalesBatchId) {
      setBatchStudents([]);
      setBatchStudentsError(null);
      setSelectedStudentIds([]);
      setPaymentSummaryByStudent({});
      setStudentsModalOpen(false);
      return;
    }
    // Extra guard: avoid duplicate fetches on rapid remount/effect re-run (dev Strict Mode)
    const now = Date.now();
    if (
      lastBatchStudentsFetchRef.current.id === String(selectedSalesBatchId) &&
      now - lastBatchStudentsFetchRef.current.at < 2000
    ) {
      return;
    }
    lastBatchStudentsFetchRef.current = { id: String(selectedSalesBatchId), at: now };
    fetchBatchStudents(selectedSalesBatchId);
    setSelectedStudentIds([]);
    setMoveError(null);
    setTargetBatch("");
    setStudentsModalOpen(true);
  }, [selectedSalesBatchId, fetchBatchStudents]);

  const openCreateModal = () => {
    setEditingBatch(null);
    setForm({ name: "", course: "", capacity: "", status: "active" });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setForm({
      name: batch.name || "",
      course: batch.course || "",
      capacity: batch.capacity != null ? String(batch.capacity) : "",
      status: batch.status || "active",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBatch(null);
    setFormError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.course || !String(form.capacity).trim()) {
      setFormError("Name, course, and capacity are required.");
      return;
    }
    const capacityNumber = Number(form.capacity);
    if (!Number.isFinite(capacityNumber)) {
      setFormError("Capacity must be a number.");
      return;
    }
    if (capacityNumber <= 10) {
      setFormError("Capacity must be greater than 10.");
      return;
    }
    if (capacityNumber > 150) {
      setFormError("Capacity cannot exceed 150.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        course: form.course,
        capacity: capacityNumber,
        status: form.status || "active",
      };
      if (editingBatch?.id) {
        await axios.patch(`/sales-batches/${editingBatch.id}/`, payload, { headers: getHeaders() });
      } else {
        await axios.post("/sales-batches/", payload, { headers: getHeaders() });
      }
      closeModal();
      clearSalesBatchesCache();
      fetchSalesBatches();
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        data?.detail ||
          (data && typeof data === "object" ? Object.values(data).flat().join(" ") : "Failed to save sales batch.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batchId) => {
    if (!confirm("Delete this sales batch?")) return;
    try {
      await axios.delete(`/sales-batches/${batchId}/`, { headers: getHeaders() });
      clearSalesBatchesCache();
      fetchSalesBatches();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete sales batch.");
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      const ids = batchStudents
        .filter((s) => !s?.is_moved_to_batch)
        .map((s) => s.id)
        .filter((id) => id != null);
      setSelectedStudentIds(ids);
      return;
    }
    setSelectedStudentIds([]);
  };

  const openBatchStudents = (batchId) => {
    if (!batchId) return;
    setSelectedSalesBatchId(String(batchId));
    setMoveError(null);
    setTargetBatch("");
    setStudentsModalOpen(true);
    // useEffect fetches students when selectedSalesBatchId changes
  };

  const handleMoveSelectedStudents = async (e) => {
    e.preventDefault();
    if (!selectedSalesBatchId || selectedStudentIds.length === 0 || !targetBatch.trim()) return;
    setMoveSubmitting(true);
    setMoveError(null);
    try {
      const { data } = await axios.post(
        `/sales-batches/${selectedSalesBatchId}/move-selected-to-batch/`,
        { student_ids: selectedStudentIds, target_batch: targetBatch.trim() },
        { headers: getHeaders() }
      );
      const movedCount = Number(data?.moved_count ?? 0);
      const skippedCount = Array.isArray(data?.skipped) ? data.skipped.length : Number(data?.skipped ?? 0);
      showSuccessToast(`Moved ${movedCount} student(s). Skipped ${skippedCount}.`);
      setMoveModalOpen(false);
      setTargetBatch("");
      setSelectedStudentIds([]);
      clearSalesBatchesCache();
      clearBatchStudentsCache(selectedSalesBatchId);
      await Promise.all([fetchBatchStudents(selectedSalesBatchId), fetchSalesBatches()]);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.detail ||
        (Array.isArray(data?.non_field_errors) ? data.non_field_errors[0] : null) ||
        (typeof data === "string" ? data : null) ||
        "Failed to move selected students.";
      setMoveError(msg);
      showErrorToast(msg);
    } finally {
      setMoveSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedSalesBatchId) return;
    fetchPaymentSummaries(batchStudents);
  }, [selectedSalesBatchId, batchStudents, fetchPaymentSummaries]);

  const selectedSalesBatch = salesBatches.find((b) => String(b.id) === String(selectedSalesBatchId)) || null;
  const salesBatchOptions = salesBatches.map((b) => ({
    value: String(b.id),
    label: `${b.name} (${COURSE_LABELS[b.course] ?? b.course ?? "—"} · ${b.total_students ?? 0} total)`,
  }));
  const selectedSalesBatchOption =
    salesBatchOptions.find((o) => o.value === String(selectedSalesBatchId)) ?? null;

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">Sales Batches</CardTitle>
                <CardDescription>
                  Manage sales batch capacity and movement summary before mentor batch assignment.
                </CardDescription>
              </div>
              {canManage && (
                <Button onClick={openCreateModal}>Create Sales Batch</Button>
              )}
            </div>
            <div>
              <div className="sm:max-w-2xl">
                <Select
                  options={salesBatchOptions}
                  value={selectedSalesBatchOption}
                  onChange={(option) => {
                    if (!option?.value) {
                      setSelectedSalesBatchId("");
                      setStudentsModalOpen(false);
                      return;
                    }
                    openBatchStudents(option.value);
                  }}
                  isSearchable
                  isClearable
                  placeholder="Search and select sales batch (opens modal)"
                />
                {!loading && salesBatchOptions.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">No sales batches available.</p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-6 text-center text-destructive">{error}</p>
          ) : salesBatches.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No sales batches found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Moved</TableHead>
                  <TableHead>Not Moved</TableHead>
                  <TableHead>Remaining Seats</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-[140px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesBatches.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openBatchStudents(b.id)}
                  >
                    <TableCell className="font-medium">{b.name || "—"}</TableCell>
                    <TableCell>{COURSE_LABELS[b.course] ?? b.course ?? "—"}</TableCell>
                    <TableCell>{b.capacity ?? "—"}</TableCell>
                    <TableCell>{b.total_students ?? 0}</TableCell>
                    <TableCell>{b.moved_students ?? 0}</TableCell>
                    <TableCell>{b.not_moved_students ?? 0}</TableCell>
                    <TableCell>{b.remaining_seats ?? 0}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          b.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {b.status ?? "—"}
                      </span>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(b);
                          }}
                        >
                          Edit
                        </Button>
                        {Number(b.total_students ?? 0) === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(b.id);
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-batch-modal-title"
        >
          <div
            className="relative w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="sales-batch-modal-title" className="text-lg font-semibold">
                {editingBatch ? "Edit Sales Batch" : "Create Sales Batch"}
              </h2>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={closeModal} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {formError && (
              <p className="mb-3 text-sm text-destructive">{formError}</p>
            )}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label>Batch name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Course *</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.course}
                  onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
                  required
                >
                  <option value="">Select course</option>
                  {COURSE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Capacity *</Label>
                <Input
                  type="number"
                  min={11}
                  max={150}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {studentsModalOpen && selectedSalesBatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 md:p-6"
          onClick={() => setStudentsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-batch-students-title"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-5 py-4">
              <div>
                <h2 id="sales-batch-students-title" className="text-xl font-semibold tracking-tight">
                  {selectedSalesBatch.name} students
                </h2>
                <p className="text-sm text-muted-foreground">
                  Review details and move selected students to actual mentor batch.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setStudentsModalOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Batch: {selectedSalesBatch?.name ?? "—"} · Selected: {selectedStudentIds.length}
                </span>
                {canManage && (
                  <Button
                    variant="outline"
                    disabled={selectedStudentIds.length === 0}
                    onClick={() => {
                      setMoveError(null);
                      setTargetBatch("");
                      setMoveModalOpen(true);
                    }}
                  >
                    Move Selected to Actual Batch
                  </Button>
                )}
              </div>
              {batchStudentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : batchStudentsError ? (
                <p className="py-6 text-center text-destructive">{batchStudentsError}</p>
              ) : batchStudents.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">No students found in this sales batch.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canManage && (
                        <TableHead className="w-[40px]">
                          <input
                            type="checkbox"
                            checked={
                              batchStudents.some((s) => !s?.is_moved_to_batch) &&
                              selectedStudentIds.length === batchStudents.filter((s) => !s?.is_moved_to_batch).length
                            }
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            aria-label="Select all students"
                          />
                        </TableHead>
                      )}
                      <TableHead>Name</TableHead>
                      <TableHead>Student Owner</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Offered</TableHead>
                      <TableHead>Verified Paid</TableHead>
                      <TableHead>Pending Verification</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchStudents.map((s) => (
                      <TableRow key={s.id}>
                      {canManage && (
                        <TableCell>
                          {!s.is_moved_to_batch ? (
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(s.id)}
                              onChange={() => toggleStudentSelection(s.id)}
                              aria-label={`Select ${s.student_name}`}
                            />
                          ) : null}
                        </TableCell>
                      )}
                        <TableCell className="font-medium">{s.student_name ?? "—"}</TableCell>
                        <TableCell>{s.sales_person_name ?? "—"}</TableCell>
                        <TableCell>{COURSE_LABELS[s.course] ?? s.course ?? "—"}</TableCell>
                        <TableCell>{s.student_mobile ?? "—"}</TableCell>
                        <TableCell>
                          {s.payment_offered != null ? `₹ ${Number(s.payment_offered).toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>
                          {paymentSummaryLoading
                            ? "..."
                            : `₹ ${Number(paymentSummaryByStudent[s.id]?.verified || 0).toLocaleString()}`}
                        </TableCell>
                        <TableCell>
                          {paymentSummaryLoading
                            ? "..."
                            : `₹ ${Number(paymentSummaryByStudent[s.id]?.pending || 0).toLocaleString()}`}
                        </TableCell>
                        <TableCell>
                          {s.is_moved_to_batch ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Moved</span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Not moved</span>
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

      {moveModalOpen && selectedSalesBatch && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setMoveModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-selected-modal-title"
        >
          <div
            className="relative w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="move-selected-modal-title" className="mb-3 text-lg font-semibold">
              Move Selected to Actual Batch
            </h2>
            {moveError && (
              <p className="mb-3 text-sm text-destructive">{moveError}</p>
            )}
            <form onSubmit={handleMoveSelectedStudents} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Target mentor batch</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={targetBatch}
                  onChange={(e) => setTargetBatch(e.target.value)}
                  disabled={mentorBatchesLoading}
                >
                  <option value="">{mentorBatchesLoading ? "Loading batches..." : "Select target batch"}</option>
                  {mentorBatches.map((b) => {
                    const value = typeof b === "string" ? b : b?.name;
                    if (!value) return null;
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={moveSubmitting || !targetBatch.trim() || selectedStudentIds.length === 0}>
                  {moveSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Move"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setMoveModalOpen(false)}>
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
export default withPrivateAuth(BatchesPage);
