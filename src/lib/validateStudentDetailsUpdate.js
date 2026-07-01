import { normalizeMobile } from "@/lib/studentFormValidations";

export function studentDetailsFromStudent(student) {
  return {
    student_name: student?.student_name || "",
    student_email: student?.student_email || "",
    student_mobile: student?.student_mobile || "",
    student_password: student?.password || "",
    payment_offered:
      student?.payment_offered != null && student?.payment_offered !== ""
        ? String(student.payment_offered)
        : "",
  };
}

export function validateStudentDetailsUpdate(form) {
  const errors = {};
  const name = (form.student_name || "").trim();
  if (!name) errors.student_name = "Student name is required.";
  else if (name.length < 2) errors.student_name = "Student name must be at least 2 characters.";

  const email = (form.student_email || "").trim().toLowerCase();
  if (!email) errors.student_email = "Student email is required.";
  else if (!email.includes("@") || !email.split("@")[1]?.includes(".")) {
    errors.student_email = "Enter a valid email address.";
  }

  const mobile = normalizeMobile(form.student_mobile);
  if (!mobile) errors.student_mobile = "Mobile is required.";
  else if (mobile.length !== 10) errors.student_mobile = "Mobile must be 10 digits.";

  const offeredRaw = (form.payment_offered ?? "").toString().trim();
  if (offeredRaw) {
    const num = Number(offeredRaw);
    if (Number.isNaN(num) || num < 0) {
      errors.payment_offered = "Payment offered cannot be negative.";
    }
  }

  return errors;
}

/** PATCH payload — only fields that changed from the loaded student record. */
export function buildStudentDetailsPatch(form, student) {
  const baseline = studentDetailsFromStudent(student);
  const payload = {};

  const name = (form.student_name || "").trim();
  if (name !== baseline.student_name.trim()) payload.student_name = name;

  const email = (form.student_email || "").trim().toLowerCase();
  if (email !== baseline.student_email.trim().toLowerCase()) payload.student_email = email;

  const mobile = (form.student_mobile || "").trim();
  if (normalizeMobile(mobile) !== normalizeMobile(baseline.student_mobile)) {
    payload.student_mobile = mobile;
  }

  if ((form.student_password ?? "") !== baseline.student_password) {
    payload.student_password = form.student_password ?? "";
  }

  const offeredRaw = (form.payment_offered ?? "").toString().trim();
  const prevOffered =
    student?.payment_offered != null && student?.payment_offered !== ""
      ? String(student.payment_offered)
      : "";
  const nextOffered = offeredRaw === "" ? "" : String(Number(offeredRaw));
  const prevNormalized = prevOffered === "" ? "" : String(Number(prevOffered));
  if (nextOffered !== prevNormalized) {
    payload.payment_offered = offeredRaw === "" ? null : nextOffered;
  }

  return payload;
}

export function studentDetailsHasChanges(form, student) {
  return Object.keys(buildStudentDetailsPatch(form, student)).length > 0;
}
