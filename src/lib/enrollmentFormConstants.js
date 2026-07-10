import { COURSE_LABELS, COURSE_VALUES, LEAD_COURSE_VALUES } from "@/constants/leadCourse";

export const MODE_OPTIONS = [
  { value: "Offline", label: "Offline" },
  { value: "Online", label: "Online" },
  { value: "Hybrid", label: "Hybrid" },
];

export const COURSE_OPTIONS = [
  { value: "", label: "Select course" },
  ...LEAD_COURSE_VALUES,
];

export { COURSE_LABELS, COURSE_VALUES };

export const PAYMENT_OFFERED_TYPE_OPTIONS = [
  { value: "", label: "Select payment type" },
  { value: "single_payment", label: "Single payment" },
  { value: "installments", label: "Installments" },
  { value: "family_issue", label: "Family issue" },
  { value: "mentor_approved", label: "Mentor approved" },
];

/**
 * Dropdown: pass userEmail → options array (mentor_approved only for one email).
 * Label: pass type value (e.g. "single_payment") → display string.
 */
export function getPaymentOfferedTypeOptions(userEmailOrValue = "") {
  const key = (userEmailOrValue || "").trim().toLowerCase();
  const typeMatch = PAYMENT_OFFERED_TYPE_OPTIONS.find((o) => o.value && o.value === key);
  if (typeMatch) return typeMatch.label;

  if (key === "subbareddyarikatla8@gmail.com") return PAYMENT_OFFERED_TYPE_OPTIONS;
  return PAYMENT_OFFERED_TYPE_OPTIONS.filter((o) => o.value !== "mentor_approved");
}

/** Matches backend PAYMENT_OFFERED_MINIMUMS / GENERAL_COURSES / SPECIAL_COURSES. */
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
const PAYMENT_OFFERED_MINIMUMS = {
  general: { single_payment: 27000, family_issue: 28000, installments: 30000 },
  special: { single_payment: 31000, family_issue: 32000, installments: 34000 },
};

export function getPaymentOfferedMinimum(course, paymentOfferedType) {
  if (!course || !paymentOfferedType || paymentOfferedType === "mentor_approved") return null;
  if (GENERAL_COURSES.has(course)) return PAYMENT_OFFERED_MINIMUMS.general[paymentOfferedType] ?? null;
  if (SPECIAL_COURSES.has(course)) return PAYMENT_OFFERED_MINIMUMS.special[paymentOfferedType] ?? null;
  return null;
}

export const YEAR_MIN = 2010;
export const YEAR_MAX = 2035;

export const INITIAL_ENROLLMENT_FORM = {
  student_name: "",
  student_email: "",
  student_mobile: "",
  password: "",
  guardian_number_1: "",
  guardian_relation_1: "",
  guardian_number_2: "",
  guardian_relation_2: "",
  guardian_email: "",
  college_name: "",
  college_branch_name: "",
  tpo_name: "",
  tpo_number: "",
  tpo_email: "",
  student_degree: "",
  total_percentage: "",
  education_status: "Pursuing",
  year_of_passing: "",
  mode_of_classes: "Offline",
  reference_details: "",
  course: "",
  sales_batch: "",
  payment_offered: "",
  payment_offered_type: "",
  payment_offered_comment: "",
};
