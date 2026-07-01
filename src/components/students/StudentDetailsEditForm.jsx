"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { normalizeMobile } from "@/lib/studentFormValidations";
import {
  buildStudentDetailsPatch,
  studentDetailsFromStudent,
  studentDetailsHasChanges,
  validateStudentDetailsUpdate,
} from "@/lib/validateStudentDetailsUpdate";

export default function StudentDetailsEditForm({
  studentId,
  student,
  getHeaders,
  editing,
  onEditingChange,
  onUpdated,
}) {
  const [form, setForm] = useState(() => studentDetailsFromStudent(student));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(studentDetailsFromStudent(student));
    setFieldErrors({});
    setError(null);
  }, [student]);

  const hasChanges = useMemo(
    () => studentDetailsHasChanges(form, student),
    [form, student]
  );

  if (!editing) return null;

  const clearError = (key) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const clientErrors = validateStudentDetailsUpdate(form);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      setError("Fix the highlighted fields before saving.");
      return;
    }

    const payload = buildStudentDetailsPatch(form, student);
    if (!Object.keys(payload).length) {
      toast.info("No changes to save.");
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const { data } = await axios.patch(`/students/${studentId}/`, payload, {
        headers: getHeaders(),
      });
      toast.success("Student details updated.");
      onUpdated?.(data);
      onEditingChange(false);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const next = {};
        for (const [key, value] of Object.entries(data)) {
          if (key === "detail") continue;
          const msg = Array.isArray(value) ? value[0] : value;
          if (typeof msg === "string") {
            next[key === "password" ? "student_password" : key] = msg;
          }
        }
        if (Object.keys(next).length) setFieldErrors(next);
      }
      setError(data?.detail || "Failed to update student details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      autoComplete="off"
      className="space-y-4 rounded-lg border bg-muted/20 p-4"
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="edit-student-name">Name <span className="text-destructive">*</span></Label>
          <Input
            id="edit-student-name"
            value={form.student_name}
            disabled={saving}
            onChange={(e) => {
              setForm((f) => ({ ...f, student_name: e.target.value.replace(/[0-9]/g, "") }));
              clearError("student_name");
            }}
            className={fieldErrors.student_name ? "border-destructive" : ""}
          />
          {fieldErrors.student_name && <p className="text-sm text-destructive">{fieldErrors.student_name}</p>}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="edit-student-email">Email <span className="text-destructive">*</span></Label>
          <Input
            id="edit-student-email"
            type="email"
            name="student_contact_email"
            autoComplete="off"
            value={form.student_email}
            disabled={saving}
            onChange={(e) => {
              setForm((f) => ({ ...f, student_email: e.target.value }));
              clearError("student_email");
            }}
            className={fieldErrors.student_email ? "border-destructive" : ""}
          />
          {fieldErrors.student_email && <p className="text-sm text-destructive">{fieldErrors.student_email}</p>}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="edit-student-mobile">Mobile <span className="text-destructive">*</span></Label>
          <Input
            id="edit-student-mobile"
            inputMode="numeric"
            value={form.student_mobile}
            disabled={saving}
            maxLength={10}
            onChange={(e) => {
              setForm((f) => ({ ...f, student_mobile: normalizeMobile(e.target.value) }));
              clearError("student_mobile");
            }}
            className={fieldErrors.student_mobile ? "border-destructive" : ""}
          />
          {fieldErrors.student_mobile && <p className="text-sm text-destructive">{fieldErrors.student_mobile}</p>}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="edit-student-password">Password</Label>
          <Input
            id="edit-student-password"
            type="password"
            name="student_portal_password"
            autoComplete="new-password"
            value={form.student_password}
            disabled={saving}
            onChange={(e) => {
              setForm((f) => ({ ...f, student_password: e.target.value }));
              clearError("student_password");
            }}
            className={fieldErrors.student_password ? "border-destructive" : ""}
          />
          {fieldErrors.student_password && <p className="text-sm text-destructive">{fieldErrors.student_password}</p>}
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor="edit-payment-offered">Payment offered (₹)</Label>
          <Input
            id="edit-payment-offered"
            type="number"
            min={0}
            step="0.01"
            value={form.payment_offered}
            disabled={saving}
            onChange={(e) => {
              setForm((f) => ({ ...f, payment_offered: e.target.value }));
              clearError("payment_offered");
            }}
            className={`max-w-xs ${fieldErrors.payment_offered ? "border-destructive" : ""}`}
          />
          {fieldErrors.payment_offered && <p className="text-sm text-destructive">{fieldErrors.payment_offered}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving || !hasChanges}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save details"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || !hasChanges}
          onClick={() => setForm(studentDetailsFromStudent(student))}
        >
          Reset
        </Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={() => onEditingChange(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
