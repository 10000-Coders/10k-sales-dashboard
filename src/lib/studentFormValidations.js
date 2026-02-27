/**
 * Student form validations aligned with mentor batch / AddNewStudentBackend.
 * Used when enrolling students from sales so they have full info for moving to batches.
 */

// Name: letters, spaces, and ., _ : -
export const formNameRegex = /^[a-zA-Z\s._,:-]+$/;

// Title/college/degree: at least 5 letters, allowed chars
export const formTitleRegex =
  /^(?=.*[a-zA-Z].*[a-zA-Z].*[a-zA-Z].*[a-zA-Z].*[a-zA-Z])[a-zA-Z0-9_.\-:,()\s'"&]*$/;

// Mobile: exactly 10 digits
export const formMobileRegex = /^[0-9]{10}$/;

/**
 * Validate marks: "70%", "7.2 CGPA", etc. Returns sanitized string if valid, else "".
 */
export function validateMarks(marks) {
  const sanitized = String(marks).toUpperCase().trim().replace(/\s+/g, "");
  if (sanitized.includes("%")) {
    const num = Number(sanitized.split("%")[0]);
    return num <= 100 && !Number.isNaN(num) ? sanitized : "";
  }
  if (sanitized.includes("CGPA")) {
    const num = Number(sanitized.split("CGPA")[0]);
    return num <= 10 && !Number.isNaN(num) ? sanitized : "";
  }
  return "";
}

/** Strip non-digits; use for mobile/guardian number inputs */
export function normalizeMobile(val) {
  if (val == null) return "";
  return String(val).replace(/\D/g, "").slice(0, 10);
}

export const EDU_STATUS_OPTIONS = [
  { value: "Pursuing", label: "Pursuing" },
  { value: "Completed", label: "Completed" },
];
