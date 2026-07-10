import {
  formNameRegex,
  formTitleRegex,
  formMobileRegex,
  validateMarks,
  normalizeMobile,
  EDU_STATUS_OPTIONS,
} from "@/lib/studentFormValidations";
import {
  COURSE_VALUES,
  YEAR_MIN,
  YEAR_MAX,
  getPaymentOfferedMinimum,
} from "@/lib/enrollmentFormConstants";

export { EDU_STATUS_OPTIONS };

export function validateEnrollmentForm(form, options = {}) {
  const {
    requirePaymentOffered = true,
    requirePaymentOfferedType = true,
  } = options;
  const errors = {};

  const name = (form.student_name || "").trim();
  if (!name) errors.student_name = "Student name is required.";
  else if (name.length < 4) errors.student_name = "Name must be at least 4 characters.";
  else if (!formNameRegex.test(name))
    errors.student_name = "Name should contain only letters, spaces, and allowed characters (., _ : -).";

  const email = (form.student_email || "").trim().toLowerCase();
  if (!email) errors.student_email = "Student email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.student_email = "Enter a valid email address.";

  const mobileDigits = normalizeMobile(form.student_mobile);
  if (!mobileDigits) errors.student_mobile = "Student mobile is required.";
  else if (mobileDigits.length !== 10) errors.student_mobile = "Mobile must be exactly 10 digits.";
  else if (!formMobileRegex.test(mobileDigits))
    errors.student_mobile = "Please provide a valid 10-digit mobile number.";

  const password = (form.password || "").trim();
  if (!password) errors.password = "Password is required.";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters.";

  const course = (form.course || "").trim();
  if (!course || !COURSE_VALUES.has(course)) errors.course = "Course is required.";

  const salesBatch = (form.sales_batch || "").trim();
  if (!salesBatch) errors.sales_batch = "Sales Batch is required.";

  const guardianRelation1 = (form.guardian_relation_1 || "").trim();
  if (!guardianRelation1) errors.guardian_relation_1 = "Guardian relation is required.";
  else if (guardianRelation1.length < 3)
    errors.guardian_relation_1 = "Guardian relation must be at least 3 characters.";
  else if (!formNameRegex.test(guardianRelation1))
    errors.guardian_relation_1 = "Invalid guardian relation; use only letters and allowed characters.";

  const guardianNum1 = normalizeMobile(form.guardian_number_1);
  if (!guardianNum1) errors.guardian_number_1 = "Guardian number is required.";
  else if (guardianNum1.length !== 10)
    errors.guardian_number_1 = "Guardian number must be exactly 10 digits.";
  else if (!formMobileRegex.test(guardianNum1))
    errors.guardian_number_1 = "Please provide a valid 10-digit guardian number.";

  const guardianRelation2 = (form.guardian_relation_2 || "").trim();
  if (guardianRelation2.length > 0) {
    if (guardianRelation2.length < 3)
      errors.guardian_relation_2 = "Guardian relation 2 must be at least 3 characters.";
    else if (!formNameRegex.test(guardianRelation2))
      errors.guardian_relation_2 = "Invalid guardian relation; use only letters and allowed characters.";
  }

  const guardianNum2 = normalizeMobile(form.guardian_number_2);
  if (guardianNum2.length > 0) {
    if (guardianNum2.length !== 10)
      errors.guardian_number_2 = "Guardian number 2 must be exactly 10 digits.";
    else if (!formMobileRegex.test(guardianNum2))
      errors.guardian_number_2 = "Please provide a valid 10-digit number.";
  }

  const guardianEmail = (form.guardian_email || "").trim();
  if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail))
    errors.guardian_email = "Enter a valid guardian email.";

  const collegeName = (form.college_name || "").trim();
  if (!collegeName) errors.college_name = "College name is required.";
  else if (!formTitleRegex.test(collegeName))
    errors.college_name = "Invalid college name; must contain at least 5 letters.";

  const tpoName = (form.tpo_name || "").trim();
  if (!tpoName) errors.tpo_name = "TPO name is required.";
  else if (!formNameRegex.test(tpoName))
    errors.tpo_name = "Invalid TPO name; use only letters and allowed characters.";

  const tpoNumber = normalizeMobile(form.tpo_number);
  if (!tpoNumber) errors.tpo_number = "TPO number is required.";
  else if (tpoNumber.length !== 10) errors.tpo_number = "TPO number must be exactly 10 digits.";
  else if (!formMobileRegex.test(tpoNumber))
    errors.tpo_number = "Please provide a valid 10-digit TPO number.";

  const studentDegree = (form.student_degree || "").trim();
  if (!studentDegree) errors.student_degree = "Highest qualification is required.";
  else if (!formTitleRegex.test(studentDegree))
    errors.student_degree = "Invalid qualification; must contain at least 5 letters.";

  const yearVal = form.year_of_passing;
  if (yearVal === "" || yearVal == null) errors.year_of_passing = "Year of passing is required.";
  else {
    const y = Number(yearVal);
    if (!Number.isInteger(y)) errors.year_of_passing = "Year must be a number (YYYY).";
    else if (y < YEAR_MIN || y > YEAR_MAX)
      errors.year_of_passing = `Year must be between ${YEAR_MIN} and ${YEAR_MAX}.`;
  }

  const totalPct = (form.total_percentage || "").trim();
  if (!totalPct) errors.total_percentage = "Marks / CGPA is required.";
  else if (!validateMarks(totalPct)) {
    const upper = totalPct.toUpperCase();
    if (upper.includes("%")) errors.total_percentage = "Percentage must be less than or equal to 100%.";
    else if (upper.includes("CGPA")) errors.total_percentage = "CGPA must be less than or equal to 10.";
    else errors.total_percentage = "Use format like 70% or 7.2 CGPA.";
  }

  const educationStatus = (form.education_status || "").trim();
  if (!educationStatus) errors.education_status = "Education status is required.";

  const referenceDetails = (form.reference_details || "").trim();
  if (!referenceDetails) errors.reference_details = "Reference details (how did you find us?) are required.";

  const paymentOfferedType = (form.payment_offered_type || "").trim();

  if (requirePaymentOffered) {
    const paymentOffered = form.payment_offered;
    if (paymentOffered === "" || paymentOffered == null)
      errors.payment_offered = "Payment offered is required.";
    else {
      const num = Number(paymentOffered);
      if (isNaN(num) || num < 0) errors.payment_offered = "Payment offered cannot be negative.";
      else if (num > 100001) errors.payment_offered = "Payment offered cannot exceed ₹100,001.";
      else {
        const minimum = getPaymentOfferedMinimum(course, paymentOfferedType);
        if (minimum != null && num < minimum) {
          errors.payment_offered = `Minimum payment offered is ₹${minimum.toLocaleString("en-IN")} for this course and payment type.`;
        }
      }
    }
  }

  if (requirePaymentOfferedType) {
    if (!paymentOfferedType) {
      errors.payment_offered_type = "Payment offered type is required.";
    } else if (
      paymentOfferedType !== "single_payment" &&
      !(form.payment_offered_comment || "").trim()
    ) {
      errors.payment_offered_comment = "Comment is required for this payment offered type.";
    }
  }

  return errors;
}

export function canGenerateEnrollmentQr(form) {
  const course = (form.course || "").trim();
  const batch = (form.sales_batch || "").trim();
  const offered = form.payment_offered;
  const paymentType = (form.payment_offered_type || "").trim();
  if (!course || !COURSE_VALUES.has(course) || !batch) return false;
  if (offered === "" || offered == null) return false;
  if (!paymentType) return false;
  if (paymentType !== "single_payment" && !(form.payment_offered_comment || "").trim()) {
    return false;
  }
  const num = Number(offered);
  return !isNaN(num) && num >= 0 && num <= 100001;
}
