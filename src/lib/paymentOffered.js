/** Mirrors backend `validate_payment_offered_rules` / `PAYMENT_OFFERED_MINIMUMS`. */

export const PAYMENT_OFFERED_TYPES = {
  single_payment: "single_payment",
  installments: "installments",
  family_issue: "family_issue",
  mentor_approved: "mentor_approved",
};

const GENERAL_COURSES = new Set([
  "python_fullstack",
  "java_fullstack",
  "mern",
  "devops",
]);

const SPECIAL_COURSES = new Set([
  "data_science",
  "data_analytics",
  "cybersecurity",
  "genai",
]);

/** Course group + type → minimum offered amount (₹). mentor_approved has no course minimum. */
const PAYMENT_OFFERED_MINIMUMS = {
  general: {
    [PAYMENT_OFFERED_TYPES.single_payment]: 27000,
    [PAYMENT_OFFERED_TYPES.family_issue]: 28000,
    [PAYMENT_OFFERED_TYPES.installments]: 30000,
  },
  special: {
    [PAYMENT_OFFERED_TYPES.single_payment]: 31000,
    [PAYMENT_OFFERED_TYPES.family_issue]: 32000,
    [PAYMENT_OFFERED_TYPES.installments]: 34000,
  },
};

const TYPE_LABELS = {
  [PAYMENT_OFFERED_TYPES.single_payment]: "Single payment",
  [PAYMENT_OFFERED_TYPES.installments]: "Installments",
  [PAYMENT_OFFERED_TYPES.family_issue]: "Family issue",
  [PAYMENT_OFFERED_TYPES.mentor_approved]: "Mentor approved",
};

/**
 * `mentor_approved` appears in the type dropdown only for managers.
 * Value/label stay mentor_approved — never renamed to manager approved.
 * @param {string | undefined | null} role
 */
export function canSelectMentorApprovedType(role) {
  return role === "manager";
}

export function paymentOfferedTypeLabel(type) {
  if (!type) return "—";
  return TYPE_LABELS[type] || String(type).replace(/_/g, " ");
}

/**
 * @param {{ role?: string | null }} [opts]
 */
export function getPaymentOfferedTypeOptions({ role } = {}) {
  const options = [
    { value: "", label: "Select payment type" },
    {
      value: PAYMENT_OFFERED_TYPES.single_payment,
      label: TYPE_LABELS[PAYMENT_OFFERED_TYPES.single_payment],
    },
    {
      value: PAYMENT_OFFERED_TYPES.installments,
      label: TYPE_LABELS[PAYMENT_OFFERED_TYPES.installments],
    },
    {
      value: PAYMENT_OFFERED_TYPES.family_issue,
      label: TYPE_LABELS[PAYMENT_OFFERED_TYPES.family_issue],
    },
  ];

  if (canSelectMentorApprovedType(role)) {
    options.push({
      value: PAYMENT_OFFERED_TYPES.mentor_approved,
      label: TYPE_LABELS[PAYMENT_OFFERED_TYPES.mentor_approved],
    });
  }

  return options;
}

export function isPaymentOfferedCommentRequired(type) {
  return Boolean(type) && type !== PAYMENT_OFFERED_TYPES.single_payment;
}

/**
 * @param {string} course
 * @param {string} type
 * @returns {number | null} minimum, or null when no course min applies / unknown
 */
export function getPaymentOfferedMinimum(course, type) {
  if (!course || !type) return null;
  if (type === PAYMENT_OFFERED_TYPES.mentor_approved) return null;

  let group = null;
  if (GENERAL_COURSES.has(course)) group = "general";
  else if (SPECIAL_COURSES.has(course)) group = "special";
  else return null;

  const min = PAYMENT_OFFERED_MINIMUMS[group]?.[type];
  return min == null ? null : min;
}

/**
 * Client-side validation matching backend rules.
 * @param {{ course?: string, payment_offered?: string|number|null, payment_offered_type?: string, payment_offered_comment?: string }} form
 * @param {{ requireFields?: boolean }} [options] when false, skip if all payment fields empty
 * @returns {Record<string, string>}
 */
export function validatePaymentOfferedFields(form, options = {}) {
  const { requireFields = true } = options;
  const errors = {};

  const course = (form.course || "").trim();
  const type = (form.payment_offered_type || "").trim();
  const comment = (form.payment_offered_comment || "").trim();
  const offeredRaw = form.payment_offered;
  const offeredEmpty = offeredRaw === "" || offeredRaw == null;

  if (!requireFields && offeredEmpty && !type && !comment) {
    return errors;
  }

  if (!type) {
    errors.payment_offered_type = "Payment offered type is required.";
  } else if (!Object.values(PAYMENT_OFFERED_TYPES).includes(type)) {
    errors.payment_offered_type = "Select a valid payment offered type.";
  }

  if (type && isPaymentOfferedCommentRequired(type) && !comment) {
    errors.payment_offered_comment = "Comment is required for this payment offered type.";
  }

  if (offeredEmpty) {
    errors.payment_offered = "Payment offered is required.";
  } else {
    const num = Number(offeredRaw);
    if (Number.isNaN(num) || num < 0) {
      errors.payment_offered = "Payment offered cannot be negative.";
    } else if (num > 100001) {
      errors.payment_offered = "Payment offered cannot exceed ₹100,001.";
    } else if (course && type && type !== PAYMENT_OFFERED_TYPES.mentor_approved) {
      if (!GENERAL_COURSES.has(course) && !SPECIAL_COURSES.has(course)) {
        errors.course = "Course is not configured for payment offered validation.";
      } else {
        const minimum = getPaymentOfferedMinimum(course, type);
        if (minimum == null) {
          errors.payment_offered_type =
            "This payment offered type is not allowed for the selected course.";
        } else if (num < minimum) {
          errors.payment_offered = `Minimum payment offered is ₹${minimum.toLocaleString("en-IN")} for this course and payment type.`;
        }
      }
    }
  }

  return errors;
}

/** True when course, batch, offered amount, and type (plus comment if needed) are ready for QR. */
export function canGenerateEnrollmentQrWithPayment(form) {
  const course = (form.course || "").trim();
  const batch = (form.sales_batch || "").trim();
  if (!course || !batch) return false;
  const errors = validatePaymentOfferedFields(form, { requireFields: true });
  return Object.keys(errors).length === 0;
}
