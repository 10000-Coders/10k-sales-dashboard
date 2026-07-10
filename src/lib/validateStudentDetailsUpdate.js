import { normalizeMobile } from "@/lib/studentFormValidations";
import { getPaymentOfferedMinimum } from "@/lib/enrollmentFormConstants";

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
    payment_offered_type: student?.payment_offered_type || "",
    payment_offered_comment: student?.payment_offered_comment || "",
  };
}

export function validateStudentDetailsUpdate(form, student = null) {
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

  const paymentOfferedType = (form.payment_offered_type || "").trim();
  const offeredRaw = (form.payment_offered ?? "").toString().trim();
  if (offeredRaw) {
    const num = Number(offeredRaw);
    if (Number.isNaN(num) || num < 0) {
      errors.payment_offered = "Payment offered cannot be negative.";
    } else {
      const course = student?.course || "";
      const minimum = getPaymentOfferedMinimum(course, paymentOfferedType);
      if (minimum != null && num < minimum) {
        errors.payment_offered = `Minimum payment offered is ₹${minimum.toLocaleString("en-IN")} for this course and payment type.`;
      }
    }
  }

  if (!paymentOfferedType) {
    errors.payment_offered_type = "Payment offered type is required.";
  } else if (
    paymentOfferedType !== "single_payment" &&
    !(form.payment_offered_comment || "").trim()
  ) {
    errors.payment_offered_comment = "Comment is required for this payment offered type.";
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

  const nextType = (form.payment_offered_type || "").trim();
  const prevType = (baseline.payment_offered_type || "").trim();
  if (nextType !== prevType) {
    payload.payment_offered_type = nextType;
  }

  const nextComment = (form.payment_offered_comment || "").trim();
  const prevComment = (baseline.payment_offered_comment || "").trim();
  if (nextComment !== prevComment) {
    payload.payment_offered_comment = nextComment;
  }

  return payload;
}

export function studentDetailsHasChanges(form, student) {
  return Object.keys(buildStudentDetailsPatch(form, student)).length > 0;
}
