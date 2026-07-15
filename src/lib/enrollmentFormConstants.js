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
