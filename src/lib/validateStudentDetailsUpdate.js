import { normalizeMobile } from "@/lib/studentFormValidations";
import { validatePaymentOfferedFields } from "@/lib/paymentOffered";

export function studentDetailsFromStudent(student) {
  return {
    student_name: student?.student_name || "",
    student_email: student?.student_email || "",
    student_mobile: student?.student_mobile || "",
    student_password: student?.password || "",
    course: student?.course || "",
    payment_offered:
      student?.payment_offered != null && student?.payment_offered !== ""
        ? String(student.payment_offered)
        : "",
    payment_offered_type: student?.payment_offered_type || "",
    payment_offered_comment: student?.payment_offered_comment || "",
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
  const type = (form.payment_offered_type || "").trim();
  const comment = (form.payment_offered_comment || "").trim();
  const hasPaymentEdit = Boolean(offeredRaw || type || comment);

  if (hasPaymentEdit) {
    Object.assign(
      errors,
      validatePaymentOfferedFields(
        {
          course: form.course,
          payment_offered: form.payment_offered,
          payment_offered_type: form.payment_offered_type,
          payment_offered_comment: form.payment_offered_comment,
        },
        { requireFields: true }
      )
    );
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
  const offeredChanged = nextOffered !== prevNormalized;

  const nextType = (form.payment_offered_type || "").trim();
  const prevType = (baseline.payment_offered_type || "").trim();
  const typeChanged = nextType !== prevType;

  const nextComment = (form.payment_offered_comment || "").trim();
  const prevComment = (baseline.payment_offered_comment || "").trim();
  const commentChanged = nextComment !== prevComment;

  if (offeredChanged || typeChanged || commentChanged) {
    payload.payment_offered = offeredRaw === "" ? null : nextOffered;
    payload.payment_offered_type = nextType;
    payload.payment_offered_comment = nextComment;
  }

  return payload;
}

export function studentDetailsHasChanges(form, student) {
  return Object.keys(buildStudentDetailsPatch(form, student)).length > 0;
}
