"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import {
  validateDemoTrainerForm,
  mapDemoTrainerApiErrors,
} from "@/lib/validateDemoTrainerForm";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

function emptyForm() {
  return {
    name: "",
    email: "",
    phone: "",
    status: "Active",
    courseText: "",
  };
}

function trainerToForm(trainer) {
  if (!trainer) return emptyForm();
  const courses = Array.isArray(trainer.course) ? trainer.course : [];
  return {
    name: trainer.name || "",
    email: trainer.email || "",
    phone: trainer.phone || "",
    status: trainer.status || "Active",
    courseText: courses.join(", "),
  };
}

export default function DemoTrainerFormDialog({
  open,
  onClose,
  trainer,
  saving,
  onSave,
}) {
  const isEdit = Boolean(trainer?.id);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(trainerToForm(trainer));
    setFieldErrors({});
  }, [open, trainer]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    const { errors, values } = validateDemoTrainerForm({
      ...form,
      course: form.courseText,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    const result = await onSave(values);
    if (result?.ok) {
      onClose();
      return;
    }
    if (result?.errors) setFieldErrors(mapDemoTrainerApiErrors(result.errors));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit demo trainer" : "Add demo trainer"}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted">
            <FaTimes />
          </button>
        </div>

        <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={50} />
            <FieldError message={fieldErrors.name} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            <FieldError message={fieldErrors.email} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={15} />
            <FieldError message={fieldErrors.phone} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <FieldError message={fieldErrors.status} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Courses</label>
            <Input
              value={form.courseText}
              onChange={(e) => set("courseText", e.target.value)}
              placeholder="python, mern, java"
            />
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated course names</p>
            <FieldError message={fieldErrors.course} />
          </div>

          {fieldErrors._form && <p className="text-sm text-destructive">{fieldErrors._form}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create trainer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
