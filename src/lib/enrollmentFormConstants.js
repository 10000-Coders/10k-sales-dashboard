export const MODE_OPTIONS = [
  { value: "Offline", label: "Offline" },
  { value: "Online", label: "Online" },
  { value: "Hybrid", label: "Hybrid" },
];

export const COURSE_OPTIONS = [
  { value: "", label: "Select course" },
  { value: "python_fullstack", label: "Python Fullstack" },
  { value: "java_fullstack", label: "Java Fullstack" },
  { value: "mern", label: "MERN" },
  { value: "data_science", label: "Data Science" },
  { value: "devops", label: "DevOps" },
  { value: "data_analytics", label: "Data Analytics" },
  { value: "cybersecurity", label: "Cyber security" },
];

export const COURSE_LABELS = {
  python_fullstack: "Python Fullstack",
  java_fullstack: "Java Fullstack",
  mern: "MERN",
  data_science: "Data Science",
  devops: "DevOps",
  data_analytics: "Data Analytics",
  cybersecurity: "Cyber security",
};

export const COURSE_VALUES = new Set([
  "python_fullstack",
  "java_fullstack",
  "mern",
  "data_science",
  "devops",
  "data_analytics",
  "cybersecurity",
]);

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
};
