/**
 * Client validation aligned with DemoStudentClassCreateSerializer (backend).
 * @param {object} form
 * @returns {{ errors: Record<string, string>, values: object|null }}
 */

import { COURSE_LABELS, COURSE_VALUES } from "@/lib/enrollmentFormConstants";

const RATING_OPTIONS = ["poor", "average", "above average", "good", "excellent"];
const COURSE_NAME_MAX = 50;

export function validateDemoClassForm(form) {
  const errors = {};

  const student_name = (form.student_name || "").trim();
  if (!student_name) errors.student_name = "Student name is required.";
  else if (student_name.length > 50) errors.student_name = "Name must be at most 50 characters.";

  const student_email = (form.student_email || "").trim().toLowerCase();
  if (!student_email) errors.student_email = "Email is required.";
  else if (student_email.length > 100) errors.student_email = "Email must be at most 100 characters.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student_email))
    errors.student_email = "Enter a valid email address.";

  const student_phonenumber = String(form.student_phonenumber || "")
    .replace(/\D/g, "")
    .trim();
  if (!student_phonenumber) errors.student_phonenumber = "Phone number is required.";
  else if (student_phonenumber.length !== 10)
    errors.student_phonenumber = "Phone number must be exactly 10 digits.";

  const student_branch = (form.student_branch || "").trim();
  if (!student_branch) errors.student_branch = "Branch is required.";
  else if (student_branch.length > 100) errors.student_branch = "Branch must be at most 100 characters.";

  const student_year_of_pass = String(form.student_year_of_pass || "")
    .replace(/\D/g, "")
    .trim();
  const currentYear = new Date().getFullYear();
  if (!student_year_of_pass) errors.student_year_of_pass = "Year of pass is required.";
  else if (student_year_of_pass.length !== 4)
    errors.student_year_of_pass = "Year of pass must be a 4-digit year.";
  else if (Number(student_year_of_pass) < 1990 || Number(student_year_of_pass) > currentYear + 5)
    errors.student_year_of_pass = `Enter a year between 1990 and ${currentYear + 5}.`;

  const demo_date = (form.demo_date || "").trim();
  if (!demo_date) errors.demo_date = "Demo date is required.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(demo_date))
    errors.demo_date = "Demo date must be YYYY-MM-DD.";

  const courseValue = (form.course_name || "").trim();
  if (!courseValue) errors.course_name = "Course is required.";
  else if (!COURSE_VALUES.has(courseValue))
    errors.course_name = "Select a valid course.";
  else if ((COURSE_LABELS[courseValue] || courseValue).length > COURSE_NAME_MAX)
    errors.course_name = `Course must be at most ${COURSE_NAME_MAX} characters.`;

  const sales_person_name = form.sales_person_name;
  if (sales_person_name === "" || sales_person_name == null)
    errors.sales_person_name = "Sales person is required.";
  else if (Number.isNaN(Number(sales_person_name)))
    errors.sales_person_name = "Select a valid sales person.";

  const demo_trainer = form.demo_trainer;
  if (demo_trainer === "" || demo_trainer == null)
    errors.demo_trainer = "Demo trainer is required.";
  else if (Number.isNaN(Number(demo_trainer)))
    errors.demo_trainer = "Select a valid demo trainer.";

  const demo_topic = (form.demo_topic || "").trim();
  if (!demo_topic) errors.demo_topic = "Demo topic is required.";
  else if (demo_topic.length > 255) errors.demo_topic = "Demo topic must be at most 255 characters.";

  const ratingKeys = [
    "explanation",
    "concept",
    "class_interaction",
    "voice_modulation",
    "eye_contact",
    "body_language",
    "real_time_examples",
  ];
  for (const key of ratingKeys) {
    const val = (form[key] || "").trim().toLowerCase();
    if (!val) errors[key] = "This field is required.";
    else if (!RATING_OPTIONS.includes(val))
      errors[key] = "Select a valid rating.";
  }

  const feedback = (form.feedback || "").trim();
  if (!feedback) errors.feedback = "Feedback is required.";
  else if (feedback.length > 350) errors.feedback = "Feedback must be at most 350 characters.";

  const comments = (form.comments || "").trim();
  if (!comments) errors.comments = "Comments are required.";

  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }

  const course_name = COURSE_LABELS[courseValue] || courseValue;

  return {
    errors: {},
    values: {
      student_name,
      student_email,
      student_phonenumber,
      student_branch,
      student_year_of_pass,
      sales_person_name: Number(sales_person_name),
      demo_date,
      course_name,
      demo_trainer: Number(demo_trainer),
      demo_topic,
      explanation: (form.explanation || "").trim().toLowerCase(),
      concept: (form.concept || "").trim().toLowerCase(),
      class_interaction: (form.class_interaction || "").trim().toLowerCase(),
      voice_modulation: (form.voice_modulation || "").trim().toLowerCase(),
      eye_contact: (form.eye_contact || "").trim().toLowerCase(),
      body_language: (form.body_language || "").trim().toLowerCase(),
      real_time_examples: (form.real_time_examples || "").trim().toLowerCase(),
      feedback,
      comments,
    },
  };
}

/** Map DRF error object { field: ["msg"] } into flat field errors. */
export function mapDemoClassApiErrors(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (typeof payload.detail === "string") return { _form: payload.detail };
  const out = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key === "detail") continue;
    if (Array.isArray(val)) out[key] = val[0] || "Invalid value.";
    else if (typeof val === "string") out[key] = val;
  }
  return out;
}
