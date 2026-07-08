/** Course values stored on Lead.course (same as SalesStudent course slugs). */
export const LEAD_COURSE_VALUES = [
  { value: "python_fullstack", label: "Python Fullstack" },
  { value: "java_fullstack", label: "Java Fullstack" },
  { value: "mern", label: "MERN" },
  { value: "data_science", label: "Data Science" },
  { value: "devops", label: "DevOps" },
  { value: "data_analytics", label: "Data Analytics" },
  { value: "cybersecurity", label: "Cyber security" },
  { value: "genai", label: "GenAI" },
];

export const COURSE_LABELS = Object.fromEntries(
  LEAD_COURSE_VALUES.map((o) => [o.value, o.label])
);

export const COURSE_VALUES = new Set(LEAD_COURSE_VALUES.map((o) => o.value));

/** Leads list filter — frontend-only dropdown options. */
export const LEAD_COURSE_FILTER_OPTIONS = [
  { value: "", label: "All courses" },
  ...LEAD_COURSE_VALUES,
  { value: "unknown", label: "Not set" },
];

const LABEL_BY_VALUE = Object.fromEntries(
  LEAD_COURSE_VALUES.map((o) => [o.value, o.label])
);

export function getLeadCourseLabel(value) {
  if (!value) return "";
  return LABEL_BY_VALUE[value] ?? value;
}

/** Leads list filter for is_related (related type). */
export const LEAD_RELATED_VALUES = [
  { value: "none", label: "None" },
  { value: "irrelevant", label: "Irrelevant" },
  { value: "relevant", label: "Relevant" },
];

export const LEAD_IS_RELATED_FILTER_OPTIONS = [
  { value: "", label: "All leads" },
  ...LEAD_RELATED_VALUES,
];

const RELATED_LABEL_BY_VALUE = Object.fromEntries(
  LEAD_RELATED_VALUES.map((o) => [o.value, o.label])
);

export const LEAD_RELATED_BADGE_STYLES = {
  none: "bg-muted text-muted-foreground ring-1 ring-border",
  irrelevant: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20",
  relevant: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20",
};

/** Normalize related type string from API. */
export function normalizeLeadRelatedValue(value) {
  if (!value || value === "none") return "none";
  const lower = String(value).toLowerCase();
  if (lower in RELATED_LABEL_BY_VALUE) return lower;
  return "none";
}

export function getLeadRelatedLabel(value) {
  return RELATED_LABEL_BY_VALUE[normalizeLeadRelatedValue(value)] ?? "None";
}
