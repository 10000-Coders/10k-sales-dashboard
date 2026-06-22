/** Course values stored on Lead.course (same as SalesStudent course slugs). */
export const LEAD_COURSE_VALUES = [
  { value: "python_fullstack", label: "Python Fullstack" },
  { value: "java_fullstack", label: "Java Fullstack" },
  { value: "mern", label: "MERN" },
  { value: "data_science", label: "Data Science" },
  { value: "devops", label: "DevOps" },
  { value: "data_analytics", label: "Data Analytics" },
  { value: "cybersecurity", label: "Cyber security" },
];

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

/** Leads list filter for is_related. */
export const LEAD_IS_RELATED_FILTER_OPTIONS = [
  { value: "", label: "All leads" },
  { value: "true", label: "Related only" },
  { value: "false", label: "Not related" },
];
