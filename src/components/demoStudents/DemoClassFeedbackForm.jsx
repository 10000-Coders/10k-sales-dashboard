"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { COURSE_OPTIONS } from "@/lib/enrollmentFormConstants";

export const DEMO_CLASS_RATING_FIELDS = [
  ["explanation", "Explanation"],
  ["concept", "Concept"],
  ["class_interaction", "Class interaction"],
  ["voice_modulation", "Voice modulation"],
  ["eye_contact", "Eye contact"],
  ["body_language", "Body language"],
  ["real_time_examples", "Real-time examples"],
];

export const DEMO_CLASS_RATING_OPTIONS = [
  "poor",
  "average",
  "above average",
  "good",
  "excellent",
];

const selectClass = (hasError) =>
  `h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    hasError ? "border-destructive" : "border-input"
  }`;

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

function RatingSelect({ id, label, value, error, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        <RequiredMark />
      </label>
      <select
        id={id}
        className={selectClass(Boolean(error))}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        required
      >
        <option value="">Select rating</option>
        {DEMO_CLASS_RATING_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

export default function DemoClassFeedbackForm({
  form,
  fieldErrors,
  trainers,
  trainersLoading,
  salesPersons = [],
  salesPersonsLoading = false,
  submitLoading,
  onChange,
  onSubmit,
}) {
  const setField = (key, value) => onChange({ ...form, [key]: value });

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit} noValidate>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">
          Student name
          <RequiredMark />
        </label>
        <Input
          value={form.student_name}
          onChange={(e) => setField("student_name", e.target.value)}
          placeholder="enter your name"
          maxLength={50}
          required
          aria-invalid={Boolean(fieldErrors.student_name)}
        />
        <FieldError message={fieldErrors.student_name} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Email
          <RequiredMark />
        </label>
        <Input
          type="email"
          value={form.student_email}
          onChange={(e) => setField("student_email", e.target.value)}
          placeholder="enter your email"
          maxLength={100}
          required
          aria-invalid={Boolean(fieldErrors.student_email)}
        />
        <FieldError message={fieldErrors.student_email} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Phone
          <RequiredMark />
        </label>
        <Input
          value={form.student_phonenumber}
          onChange={(e) =>
            setField("student_phonenumber", e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          placeholder="enter your phone number"
          maxLength={10}
          inputMode="numeric"
          required
          aria-invalid={Boolean(fieldErrors.student_phonenumber)}
        />
        <FieldError message={fieldErrors.student_phonenumber} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Branch
          <RequiredMark />
        </label>
        <Input
          value={form.student_branch}
          onChange={(e) => setField("student_branch", e.target.value)}
          placeholder="e.g. CSE, ECE, ME, Civil"
          maxLength={100}
          required
          aria-invalid={Boolean(fieldErrors.student_branch)}
        />
        <FieldError message={fieldErrors.student_branch} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Year of pass
          <RequiredMark />
        </label>
        <Input
          value={form.student_year_of_pass}
          onChange={(e) =>
            setField("student_year_of_pass", e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          placeholder="e.g. 2026"
          maxLength={4}
          inputMode="numeric"
          required
          aria-invalid={Boolean(fieldErrors.student_year_of_pass)}
        />
        <FieldError message={fieldErrors.student_year_of_pass} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Demo date
          <RequiredMark />
        </label>
        <Input
          type="date"
          value={form.demo_date}
          onChange={(e) => setField("demo_date", e.target.value)}
          required
          aria-invalid={Boolean(fieldErrors.demo_date)}
        />
        <FieldError message={fieldErrors.demo_date} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Course
          <RequiredMark />
        </label>
        <select
          className={selectClass(Boolean(fieldErrors.course_name))}
          value={form.course_name}
          onChange={(e) => setField("course_name", e.target.value)}
          required
          aria-invalid={Boolean(fieldErrors.course_name)}
        >
          {COURSE_OPTIONS.map((o) => (
            <option key={o.value || "empty"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.course_name} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Sales person
          <RequiredMark />
        </label>
        <select
          className={selectClass(Boolean(fieldErrors.sales_person_name))}
          value={form.sales_person_name}
          onChange={(e) => setField("sales_person_name", e.target.value)}
          disabled={salesPersonsLoading}
          required
          aria-invalid={Boolean(fieldErrors.sales_person_name)}
        >
          <option value="">
            {salesPersonsLoading ? "Loading…" : "Select sales person"}
          </option>
          {salesPersons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.sales_person_name} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Trainer
          <RequiredMark />
        </label>
        <select
          className={selectClass(Boolean(fieldErrors.demo_trainer))}
          value={form.demo_trainer}
          onChange={(e) => setField("demo_trainer", e.target.value)}
          disabled={trainersLoading}
          required
          aria-invalid={Boolean(fieldErrors.demo_trainer)}
        >
          <option value="">{trainersLoading ? "Loading…" : "Select trainer"}</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <FieldError message={fieldErrors.demo_trainer} />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">
          Demo topic
          <RequiredMark />
        </label>
        <Input
          value={form.demo_topic}
          onChange={(e) => setField("demo_topic", e.target.value)}
          placeholder="e.g. React basics, SQL joins, OOP concepts"
          maxLength={255}
          required
          aria-invalid={Boolean(fieldErrors.demo_topic)}
        />
        <FieldError message={fieldErrors.demo_topic} />
      </div>

      {DEMO_CLASS_RATING_FIELDS.map(([key, label]) => (
        <RatingSelect
          key={key}
          id={`rating-${key}`}
          label={label}
          value={form[key]}
          error={fieldErrors[key]}
          onChange={(v) => setField(key, v)}
        />
      ))}

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">
          Feedback
          <RequiredMark />
        </label>
        <Input
          value={form.feedback}
          onChange={(e) => setField("feedback", e.target.value)}
          placeholder="e.g. Session was clear and helpful"
          maxLength={350}
          required
          aria-invalid={Boolean(fieldErrors.feedback)}
        />
        <FieldError message={fieldErrors.feedback} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">
          Comments
          <RequiredMark />
        </label>
        <textarea
          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.comments}
          onChange={(e) => setField("comments", e.target.value)}
          placeholder="e.g. Would like more coding practice examples"
          required
          aria-invalid={Boolean(fieldErrors.comments)}
        />
        <FieldError message={fieldErrors.comments} />
      </div>

      {fieldErrors._form && (
        <p className="text-sm text-destructive sm:col-span-2">{fieldErrors._form}</p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" className="w-full" disabled={submitLoading}>
          {submitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit feedback
        </Button>
      </div>
    </form>
  );
}
