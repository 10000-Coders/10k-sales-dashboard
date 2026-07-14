"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchDemoStudentDetail,
  clearDemoStudentDetail,
  updateDemoStudentStatus,
  fetchDemoStudentStats,
} from "@/redux/features/demoStudents/demoStudentsSlice";

const RATING_FIELDS = [
  ["explanation", "Explanation"],
  ["concept", "Concept"],
  ["class_interaction", "Class interaction"],
  ["voice_modulation", "Voice modulation"],
  ["eye_contact", "Eye contact"],
  ["body_language", "Body language"],
  ["real_time_examples", "Real-time examples"],
];

const STUDENT_STATUS_OPTIONS = ["New", "Enrolled", "Active", "Not Interested"];

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function DemoStudentFeedbackModal({
  open,
  onClose,
  studentId,
  studentPreview,
  appliedFilters,
}) {
  const dispatch = useDispatch();
  const {
    detail,
    detailLoading,
    detailError,
    statusUpdateLoading,
    statusUpdateError,
  } = useSelector((state) => state.demoStudents);

  const [studentStatus, setStudentStatus] = useState("");

  useEffect(() => {
    if (!open || !studentId) return;
    dispatch(fetchDemoStudentDetail(studentId));
    return () => {
      dispatch(clearDemoStudentDetail());
    };
  }, [open, studentId, dispatch]);

  useEffect(() => {
    const current = detail?.student_status || studentPreview?.student_status || "";
    setStudentStatus(current);
  }, [detail?.student_status, studentPreview?.student_status, open]);

  if (!open) return null;

  const student = detail || studentPreview;
  const feedbacks = Array.isArray(detail?.feedbacks) ? detail.feedbacks : [];
  const currentStatus = detail?.student_status || studentPreview?.student_status || "";
  const statusDirty = Boolean(studentStatus) && studentStatus !== currentStatus;

  const handleUpdateStatus = async () => {
    if (!studentId || !studentStatus || !statusDirty) return;
    const result = await dispatch(
      updateDemoStudentStatus({ id: studentId, student_status: studentStatus })
    );
    if (updateDemoStudentStatus.fulfilled.match(result)) {
      toast.success("Student status updated.");
      dispatch(fetchDemoStudentStats({ filters: appliedFilters || {} }));
    } else {
      const err = result.payload;
      const msg =
        (typeof err === "string" && err) ||
        err?.detail ||
        err?.student_status?.[0] ||
        "Failed to update student status.";
      toast.error(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">
              {student?.student_name || "Student feedback"}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {student?.student_phonenumber}
              {student?.student_email ? ` · ${student.student_email}` : ""}
            </p>
            {!detailLoading && (
              <p className="mt-1 text-xs text-muted-foreground">
                {feedbacks.length} feedback{feedbacks.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="demo-student-status">
              Demo student status
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                id="demo-student-status"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
                value={studentStatus}
                disabled={detailLoading || statusUpdateLoading}
                onChange={(e) => setStudentStatus(e.target.value)}
              >
                {!studentStatus && <option value="">Select status</option>}
                {STUDENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={!statusDirty || statusUpdateLoading || detailLoading || !studentStatus}
                onClick={handleUpdateStatus}
              >
                {statusUpdateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update"
                )}
              </Button>
            </div>
            {statusUpdateError && (
              <p className="mt-2 text-sm text-destructive">
                {typeof statusUpdateError === "string"
                  ? statusUpdateError
                  : "Failed to update student status."}
              </p>
            )}
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading feedback…
            </div>
          ) : detailError ? (
            <p className="py-8 text-center text-sm text-destructive">{detailError}</p>
          ) : feedbacks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No feedback found for this student.
            </p>
          ) : (
            feedbacks.map((fb, index) => (
              <article
                key={fb.id || index}
                className="rounded-lg border border-border/70 bg-muted/20 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Feedback #{feedbacks.length - index}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(fb.created_at)}</p>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Date: </span>
                    {fb.demo_date || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Course: </span>
                    {fb.course_name || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Trainer: </span>
                    {fb.demo_trainer_name || "—"}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="text-muted-foreground">Topic: </span>
                    {fb.demo_topic || "—"}
                  </p>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {RATING_FIELDS.map(([key, label]) => (
                    <p key={key} className="text-sm">
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="capitalize">{fb[key] || "—"}</span>
                    </p>
                  ))}
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Feedback: </span>
                    {fb.feedback || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Comments: </span>
                    {fb.comments || "—"}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="border-t px-5 py-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
