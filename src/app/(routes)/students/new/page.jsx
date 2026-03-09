"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "@/axios";
import { useSalesBatches } from "@/hooks/useSalesData";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { ImageDropzone } from "@/components/ImageDropzone";
import {
  formNameRegex,
  formTitleRegex,
  formMobileRegex,
  validateMarks,
  normalizeMobile,
  EDU_STATUS_OPTIONS,
} from "@/lib/studentFormValidations";
import { sendMentorOtp, verifyMentorOtp } from "@/lib/mentorOtpApi";

const MODE_OPTIONS = [
  { value: "Offline", label: "Offline" },
  { value: "Online", label: "Online" },
  { value: "Hybrid", label: "Hybrid" },
];

const PAYMENT_MODE_OPTIONS = [
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const COURSE_OPTIONS = [
  { value: "", label: "Select course" },
  { value: "python_fullstack", label: "Python Fullstack" },
  { value: "java_fullstack", label: "Java Fullstack" },
  { value: "mern", label: "MERN" },
  { value: "data_science", label: "Data Science" },
  { value: "devops", label: "DevOps" },
];

const COURSE_VALUES = new Set(["python_fullstack", "java_fullstack", "mern", "data_science", "devops"]);

const YEAR_MIN = 2010;
const YEAR_MAX = 2035;

function validateEnrollmentForm(form) {
  const errors = {};

  const name = (form.student_name || "").trim();
  if (!name) errors.student_name = "Student name is required.";
  else if (name.length < 4) errors.student_name = "Name must be at least 4 characters.";
  else if (!formNameRegex.test(name)) errors.student_name = "Name should contain only letters, spaces, and allowed characters (., _ : -).";

  const email = (form.student_email || "").trim().toLowerCase();
  if (!email) errors.student_email = "Student email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.student_email = "Enter a valid email address.";

  const mobileDigits = normalizeMobile(form.student_mobile);
  if (!mobileDigits) errors.student_mobile = "Student mobile is required.";
  else if (mobileDigits.length !== 10) errors.student_mobile = "Mobile must be exactly 10 digits.";
  else if (!formMobileRegex.test(mobileDigits)) errors.student_mobile = "Please provide a valid 10-digit mobile number.";

  const password = (form.password || "").trim();
  if (!password) errors.password = "Password is required.";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters.";

  const course = (form.course || "").trim();
  if (!course || !COURSE_VALUES.has(course)) errors.course = "Course is required.";

  const salesBatch = (form.sales_batch || "").trim();
  if (!salesBatch) errors.sales_batch = "Sales Batch is required.";

  const guardianRelation1 = (form.guardian_relation_1 || "").trim();
  if (!guardianRelation1) errors.guardian_relation_1 = "Guardian relation is required.";
  else if (guardianRelation1.length < 3) errors.guardian_relation_1 = "Guardian relation must be at least 3 characters.";
  else if (!formNameRegex.test(guardianRelation1)) errors.guardian_relation_1 = "Invalid guardian relation; use only letters and allowed characters.";

  const guardianNum1 = normalizeMobile(form.guardian_number_1);
  if (!guardianNum1) errors.guardian_number_1 = "Guardian number is required.";
  else if (guardianNum1.length !== 10) errors.guardian_number_1 = "Guardian number must be exactly 10 digits.";
  else if (!formMobileRegex.test(guardianNum1)) errors.guardian_number_1 = "Please provide a valid 10-digit guardian number.";

  const guardianRelation2 = (form.guardian_relation_2 || "").trim();
  if (guardianRelation2.length > 0) {
    if (guardianRelation2.length < 3) errors.guardian_relation_2 = "Guardian relation 2 must be at least 3 characters.";
    else if (!formNameRegex.test(guardianRelation2)) errors.guardian_relation_2 = "Invalid guardian relation; use only letters and allowed characters.";
  }

  const guardianNum2 = normalizeMobile(form.guardian_number_2);
  if (guardianNum2.length > 0) {
    if (guardianNum2.length !== 10) errors.guardian_number_2 = "Guardian number 2 must be exactly 10 digits.";
    else if (!formMobileRegex.test(guardianNum2)) errors.guardian_number_2 = "Please provide a valid 10-digit number.";
  }

  const guardianEmail = (form.guardian_email || "").trim();
  if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) errors.guardian_email = "Enter a valid guardian email.";

  const collegeName = (form.college_name || "").trim();
  if (!collegeName) errors.college_name = "College name is required.";
  else if (!formTitleRegex.test(collegeName)) errors.college_name = "Invalid college name; must contain at least 5 letters.";

  const tpoName = (form.tpo_name || "").trim();
  if (!tpoName) errors.tpo_name = "TPO name is required.";
  else if (!formNameRegex.test(tpoName)) errors.tpo_name = "Invalid TPO name; use only letters and allowed characters.";

  const tpoNumber = normalizeMobile(form.tpo_number);
  if (!tpoNumber) errors.tpo_number = "TPO number is required.";
  else if (tpoNumber.length !== 10) errors.tpo_number = "TPO number must be exactly 10 digits.";
  else if (!formMobileRegex.test(tpoNumber)) errors.tpo_number = "Please provide a valid 10-digit TPO number.";

  const studentDegree = (form.student_degree || "").trim();
  if (!studentDegree) errors.student_degree = "Highest qualification is required.";
  else if (!formTitleRegex.test(studentDegree)) errors.student_degree = "Invalid qualification; must contain at least 5 letters.";

  const yearVal = form.year_of_passing;
  if (yearVal === "" || yearVal == null) errors.year_of_passing = "Year of passing is required.";
  else {
    const y = Number(yearVal);
    if (!Number.isInteger(y)) errors.year_of_passing = "Year must be a number (YYYY).";
    else if (y < YEAR_MIN || y > YEAR_MAX) errors.year_of_passing = `Year must be between ${YEAR_MIN} and ${YEAR_MAX}.`;
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

  const paymentOffered = form.payment_offered;
  if (paymentOffered === "" || paymentOffered == null) errors.payment_offered = "Payment offered is required.";
  else {
    const num = Number(paymentOffered);
    if (isNaN(num) || num < 0) errors.payment_offered = "Payment offered cannot be negative.";
    else if (num > 100001) errors.payment_offered = "Payment offered cannot exceed ₹100,001.";
  }

  return errors;
}

export default function NewStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("lead");
  const user = useSelector((state) => state.userAuth?.user);

  const [loadingLead, setLoadingLead] = useState(!!leadIdParam);
  const [fieldErrors, setFieldErrors] = useState({});
  const { salesBatches, loading: salesBatchesLoading, error: salesBatchesError } = useSalesBatches();

  const [form, setForm] = useState({
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
  });

  const [initialPayment, setInitialPayment] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_mode: "upi",
    receiver: "",
    reference: "",
    notes: "",
    reference_image: null,
    receipt_image: null,
  });
  const [paymentReceivers, setPaymentReceivers] = useState([]);
  const [paymentReceiversLoading, setPaymentReceiversLoading] = useState(false);
  const [paymentReceiversError, setPaymentReceiversError] = useState(null);

  const [paymentFieldErrors, setPaymentFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  // OTP verification (mentor APIs)
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [mobileOtpLoading, setMobileOtpLoading] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [mobileVerifyLoading, setMobileVerifyLoading] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState("");
  const [mobileOtpError, setMobileOtpError] = useState("");
  const [emailResendAt, setEmailResendAt] = useState(0);
  const [mobileResendAt, setMobileResendAt] = useState(0);

  const getHeaders = useCallback(() => {
    const h = {};
    if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
    if (user?.role) h["X-Sales-Person-Role"] = user.role;
    return h;
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!leadIdParam) {
      router.replace("/students");
      return;
    }
    const h = getHeaders();
    axios
      .get(`/leads/${leadIdParam}/`, { headers: h })
      .then(({ data }) => {
        const mobile = data.mobile ? normalizeMobile(String(data.mobile)) : "";
        setForm((f) => ({
          ...f,
          student_name: (data.name || f.student_name).replace(/[0-9]/g, "").trim() || f.student_name,
          student_email: data.email || f.student_email,
          student_mobile: mobile || f.student_mobile,
        }));
      })
      .catch(() => {})
      .finally(() => setLoadingLead(false));
  }, [leadIdParam, getHeaders, router]);

  const fetchPaymentReceivers = useCallback(async () => {
    try {
      setPaymentReceiversLoading(true);
      setPaymentReceiversError(null);
      const { data } = await axios.get("/payment-receivers/", { headers: getHeaders() });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      setPaymentReceivers(list);
    } catch (err) {
      setPaymentReceivers([]);
      setPaymentReceiversError(err.response?.data?.detail || "Failed to load receiver accounts.");
    } finally {
      setPaymentReceiversLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (initialPayment.payment_mode === "upi" || initialPayment.payment_mode === "bank") {
      fetchPaymentReceivers();
    }
  }, [initialPayment.payment_mode, fetchPaymentReceivers]);

  const availableSalesBatches = salesBatches.filter((b) => {
    const hasSeats = Number(b.remaining_seats ?? 0) > 0;
    if (!hasSeats) return false;
    if (!form.course) return true;
    return b.course === form.course;
  });
  const selectedSalesBatch = availableSalesBatches.find((b) => String(b.id) === String(form.sales_batch));

  useEffect(() => {
    if (!form.sales_batch) return;
    const stillValid = availableSalesBatches.some((b) => String(b.id) === String(form.sales_batch));
    if (!stillValid) {
      setForm((f) => ({ ...f, sales_batch: "" }));
    }
  }, [availableSalesBatches, form.sales_batch]);

  // Resend OTP countdown (re-render every second)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const emailResendSeconds = Math.max(0, Math.ceil((emailResendAt - now) / 1000));
  const mobileResendSeconds = Math.max(0, Math.ceil((mobileResendAt - now) / 1000));

  const handleSendEmailOtp = async () => {
    const email = (form.student_email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailOtpError("Enter a valid email first.");
      return;
    }
    setEmailOtpError("");
    setEmailOtpLoading(true);
    try {
      const result = await sendMentorOtp({ channel: "email", email });
      if (result.success) {
        setEmailOtpSent(true);
        setEmailOtp("");
        setEmailResendAt(Date.now() + 60000);
      } else {
        setEmailOtpError(result.error || "Failed to send OTP.");
      }
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const email = (form.student_email || "").trim().toLowerCase();
    const otp = (emailOtp || "").trim();
    if (!email || !otp) {
      setEmailOtpError("Enter the OTP sent to your email.");
      return;
    }
    setEmailOtpError("");
    setEmailVerifyLoading(true);
    try {
      const result = await verifyMentorOtp({ channel: "email", email, otp });
      if (result.success) {
        setEmailVerified(true);
        setEmailOtpSent(false);
        setEmailOtp("");
      } else {
        setEmailOtpError(result.error || "Invalid OTP.");
      }
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleSendMobileOtp = async () => {
    const mobile = normalizeMobile(form.student_mobile);
    if (!mobile || mobile.length !== 10 || !formMobileRegex.test(mobile)) {
      setMobileOtpError("Enter a valid 10-digit mobile first.");
      return;
    }
    setMobileOtpError("");
    setMobileOtpLoading(true);
    try {
      const result = await sendMentorOtp({ channel: "mobile", mobile });
      if (result.success) {
        setMobileOtpSent(true);
        setMobileOtp("");
        setMobileResendAt(Date.now() + 60000);
      } else {
        setMobileOtpError(result.error || "Failed to send OTP.");
      }
    } finally {
      setMobileOtpLoading(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    const mobile = normalizeMobile(form.student_mobile);
    const otp = (mobileOtp || "").trim();
    if (!mobile || !otp) {
      setMobileOtpError("Enter the OTP sent to your mobile.");
      return;
    }
    setMobileOtpError("");
    setMobileVerifyLoading(true);
    try {
      const result = await verifyMentorOtp({ channel: "mobile", mobile, otp });
      if (result.success) {
        setMobileVerified(true);
        setMobileOtpSent(false);
        setMobileOtp("");
      } else {
        setMobileOtpError(result.error || "Invalid OTP.");
      }
    } finally {
      setMobileVerifyLoading(false);
    }
  };

  const validateBeforeSubmit = () => {
    if (!leadIdParam) return;
    setError(null);
    setFieldErrors({});
    setPaymentFieldErrors({});

    if (!emailVerified || !mobileVerified) {
      setFieldErrors((prev) => ({
        ...prev,
        ...(emailVerified ? {} : { student_email: "Verify email with OTP to continue." }),
        ...(mobileVerified ? {} : { student_mobile: "Verify mobile with OTP to continue." }),
      }));
      if (!emailVerified && typeof document !== "undefined") {
        document.getElementById("field-student_email")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (!mobileVerified && typeof document !== "undefined") {
        document.getElementById("field-student_mobile")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    const errors = validateEnrollmentForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors).find((k) => errors[k]);
      if (firstKey && typeof document !== "undefined") {
        document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }

    const paymentErrors = {};
    if (!initialPayment.amount || Number(initialPayment.amount) <= 0) {
      paymentErrors.amount = "Initial payment amount is required and must be greater than 0.";
    }
    const offeredNum = Number(form.payment_offered);
    const initNum = Number(initialPayment.amount);
    if (!Number.isNaN(offeredNum) && !Number.isNaN(initNum) && initNum > offeredNum) {
      paymentErrors.amount = "Initial payment cannot exceed the offered amount.";
    }
    if (!initialPayment.payment_date) {
      paymentErrors.payment_date = "Initial payment date is required.";
    }
    if (!initialPayment.payment_mode) {
      paymentErrors.payment_mode = "Initial payment mode is required.";
    }
    if ((initialPayment.payment_mode === "upi" || initialPayment.payment_mode === "bank") && !initialPayment.receiver) {
      paymentErrors.receiver = "Receiver account is required for UPI/Bank payments.";
    }
    if (!initialPayment.reference_image) {
      paymentErrors.reference_image = "Proof Screenshot is required.";
    }
    if (!initialPayment.receipt_image) {
      paymentErrors.receipt_image = "Receipt Image is required.";
    }
    if ((initialPayment.notes || "").length > 200) {
      paymentErrors.notes = "Payment note must be 200 characters or less.";
    }
    if (Object.keys(paymentErrors).length) {
      setPaymentFieldErrors(paymentErrors);
      const firstPaymentKey = Object.keys(paymentErrors)[0];
      const idMap = {
        amount: "payment-field-amount",
        payment_date: "payment-field-date",
        payment_mode: "payment-field-mode",
        receiver: "payment-field-receiver",
        reference_image: "payment-field-reference-image",
        receipt_image: "payment-field-receipt-image",
      };
      const scrollId = idMap[firstPaymentKey];
      if (scrollId && typeof document !== "undefined") {
        document.getElementById(scrollId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validateBeforeSubmit()) return;
    setSubmitConfirmOpen(true);
  };

  const submitEnrollment = async () => {
    if (!leadIdParam) return;
    setSaving(true);
    const headers = getHeaders();

    try {
      const leadId = Number(leadIdParam);

      const studentPayload = {
        lead: leadId,
        student_name: form.student_name.trim(),
        student_email: form.student_email.trim().toLowerCase(),
        student_mobile: normalizeMobile(form.student_mobile) || "",
        password: form.password || "",
        guardian_number_1: normalizeMobile(form.guardian_number_1) || "",
        guardian_relation_1: form.guardian_relation_1?.trim() || "",
        guardian_number_2: normalizeMobile(form.guardian_number_2) || "",
        guardian_relation_2: form.guardian_relation_2?.trim() || "",
        guardian_email: form.guardian_email?.trim() || "",
        college_name: form.college_name?.trim() || "",
        tpo_name: form.tpo_name?.trim() || "",
        tpo_number: normalizeMobile(form.tpo_number) || "",
        tpo_email: form.tpo_email?.trim() || "",
        student_degree: form.student_degree?.trim() || "",
        total_percentage: validateMarks(form.total_percentage) || form.total_percentage?.trim() || "",
        education_status: form.education_status || "Pursuing",
        year_of_passing: form.year_of_passing ? Number(form.year_of_passing) : null,
        mode_of_classes: form.mode_of_classes || "Offline",
        reference_details: form.reference_details?.trim() || "",
        course: (form.course || "").trim(),
        sales_batch: Number(form.sales_batch),
        payment_offered: form.payment_offered ? Number(form.payment_offered) : null,
      };

      const { data: student } = await axios.post("/students/", studentPayload, { headers });
      const studentId = student?.id ?? student?.pk;

      if (studentId != null) {
        const formData = new FormData();
        formData.append("amount", Number(initialPayment.amount));
        formData.append("payment_date", initialPayment.payment_date || new Date().toISOString().slice(0, 10));
        formData.append("payment_mode", initialPayment.payment_mode || "upi");
        if (initialPayment.receiver) formData.append("receiver", initialPayment.receiver);
        formData.append("reference", initialPayment.reference || "");
        formData.append("notes", initialPayment.notes || "");
        formData.append("reference_image", initialPayment.reference_image);
        formData.append("receipt_image", initialPayment.receipt_image);
        await axios.post(`/students/${studentId}/payments/`, formData, { headers });
      }

      if (studentId != null) {
        router.push(`/students/${studentId}`);
      } else {
        router.push("/students");
      }
    } catch (err) {
      const data = err.response?.data;
      let hasFieldErrors = false;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const apiErrors = {};
        for (const [key, val] of Object.entries(data)) {
          if (key === "detail") continue;
          const msg = Array.isArray(val) ? val[0] : val;
          if (msg && typeof msg === "string") apiErrors[key] = msg;
        }
        if (Object.keys(apiErrors).length > 0) {
          hasFieldErrors = true;
          setFieldErrors((prev) => ({ ...prev, ...apiErrors }));
        }
      }
      const msg = data
        ? (
            typeof data === "string"
              ? data
              : data.detail ||
                (Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : null) ||
                (hasFieldErrors ? "Please fix the errors below." : null)
          )
        : "Failed to create student.";
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!leadIdParam) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Enroll student</h1>
          <p className="text-muted-foreground">
            Enter student details and first payment. Lead is pre-filled from the lead you selected.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Enrolling from lead. Fill student details below and add initial payment.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student details</CardTitle>
            <CardDescription>Name, contact, guardians, education.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div id="field-student_name">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.student_name}
                onChange={(e) => {
                  const v = e.target.value.replace(/[0-9]/g, "");
                  setForm((f) => ({ ...f, student_name: v }));
                  if (fieldErrors.student_name) setFieldErrors((prev) => ({ ...prev, student_name: undefined }));
                }}
                placeholder="Student name (letters only)"
                className={fieldErrors.student_name ? "border-destructive" : ""}
              />
              {fieldErrors.student_name && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.student_name}</p>
              )}
            </div>
            <div id="field-password">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => {
                  setForm((f) => ({ ...f, password: e.target.value }));
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="12345678"
                className={fieldErrors.password ? "border-destructive" : ""}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>
            <div id="field-student_email" className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={form.student_email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, student_email: e.target.value }));
                  if (fieldErrors.student_email) setFieldErrors((prev) => ({ ...prev, student_email: undefined }));
                  setEmailVerified(false);
                  setEmailOtpSent(false);
                  setEmailOtp("");
                  setEmailOtpError("");
                }}
                placeholder="email@example.com"
                className={fieldErrors.student_email ? "border-destructive" : ""}
                disabled={emailVerified}
              />
              {!emailVerified && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendEmailOtp}
                    disabled={emailOtpLoading || emailResendSeconds > 0}
                  >
                    {emailOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : emailResendSeconds > 0 ? `Resend in ${emailResendSeconds}s` : emailOtpSent ? "Resend OTP" : "Send OTP"}
                  </Button>
                  {emailOtpSent && (
                    <>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter OTP"
                        value={emailOtp}
                        onChange={(e) => {
                          setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setEmailOtpError("");
                        }}
                        className="w-28"
                      />
                      <Button type="button" size="sm" onClick={handleVerifyEmailOtp} disabled={emailVerifyLoading || !emailOtp.trim()}>
                        {emailVerifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </>
                  )}
                </div>
              )}
              {emailVerified && <p className="text-sm text-green-600 dark:text-green-400">Email verified</p>}
              {(fieldErrors.student_email || emailOtpError) && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.student_email || emailOtpError}</p>
              )}
            </div>
            <div id="field-student_mobile" className="space-y-2">
              <Label>Mobile <span className="text-destructive">*</span></Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={form.student_mobile}
                onChange={(e) => {
                  const v = normalizeMobile(e.target.value);
                  setForm((f) => ({ ...f, student_mobile: v }));
                  if (fieldErrors.student_mobile) setFieldErrors((prev) => ({ ...prev, student_mobile: undefined }));
                  setMobileVerified(false);
                  setMobileOtpSent(false);
                  setMobileOtp("");
                  setMobileOtpError("");
                }}
                placeholder="10 digits only"
                className={fieldErrors.student_mobile ? "border-destructive" : ""}
                disabled={mobileVerified}
              />
              {!mobileVerified && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendMobileOtp}
                    disabled={mobileOtpLoading || mobileResendSeconds > 0}
                  >
                    {mobileOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : mobileResendSeconds > 0 ? `Resend in ${mobileResendSeconds}s` : mobileOtpSent ? "Resend OTP" : "Send OTP"}
                  </Button>
                  {mobileOtpSent && (
                    <>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter OTP"
                        value={mobileOtp}
                        onChange={(e) => {
                          setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                          setMobileOtpError("");
                        }}
                        className="w-28"
                      />
                      <Button type="button" size="sm" onClick={handleVerifyMobileOtp} disabled={mobileVerifyLoading || !mobileOtp.trim()}>
                        {mobileVerifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </Button>
                    </>
                  )}
                </div>
              )}
              {mobileVerified && <p className="text-sm text-green-600 dark:text-green-400">Mobile verified</p>}
              {(fieldErrors.student_mobile || mobileOtpError) && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.student_mobile || mobileOtpError}</p>
              )}
            </div>
            <div id="field-course">
              <Label>Course <span className="text-destructive">*</span></Label>
              <select
                className={`w-full rounded-md border bg-background px-3 py-2 ${fieldErrors.course ? "border-destructive" : "border-input"}`}
                value={form.course}
                onChange={(e) => {
                  setForm((f) => ({ ...f, course: e.target.value }));
                  if (fieldErrors.course) setFieldErrors((prev) => ({ ...prev, course: undefined }));
                }}
              >
                {COURSE_OPTIONS.map((o) => (
                  <option key={o.value || "none"} value={o.value}>{o.label}</option>
                ))}
              </select>
              {fieldErrors.course && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.course}</p>
              )}
            </div>
            <div id="field-sales_batch">
              <Label>Sales Batch <span className="text-destructive">*</span></Label>
              <select
                className={`w-full rounded-md border bg-background px-3 py-2 ${fieldErrors.sales_batch ? "border-destructive" : "border-input"}`}
                value={form.sales_batch}
                onChange={(e) => {
                  setForm((f) => ({ ...f, sales_batch: e.target.value }));
                  if (fieldErrors.sales_batch) setFieldErrors((prev) => ({ ...prev, sales_batch: undefined }));
                }}
                disabled={salesBatchesLoading || !form.course}
                required
              >
                <option value="">
                  {salesBatchesLoading
                    ? "Loading sales batches..."
                    : !form.course
                      ? "Select course first"
                      : "Select sales batch"}
                </option>
                {availableSalesBatches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} ({b.total_students ?? 0}/{b.capacity ?? 0} filled, {b.remaining_seats ?? 0} seats left)
                  </option>
                ))}
              </select>
              {salesBatchesError && (
                <p className="mt-1 text-sm text-destructive">{salesBatchesError}</p>
              )}
              {!salesBatchesLoading && !salesBatchesError && form.course && availableSalesBatches.length === 0 && (
                <p className="mt-1 text-sm text-muted-foreground">No sales batch with available seats for selected course.</p>
              )}
              {selectedSalesBatch && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedSalesBatch.name} ({selectedSalesBatch.total_students ?? 0}/{selectedSalesBatch.capacity ?? 0} filled, {selectedSalesBatch.remaining_seats ?? 0} seats left)
                </p>
              )}
              {fieldErrors.sales_batch && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.sales_batch}</p>
              )}
            </div>
            <div id="field-payment_offered">
              <Label>Payment offered (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                max={100001}
                min={0}
                value={form.payment_offered}
                onChange={(e) => {
                  setForm((f) => ({ ...f, payment_offered: e.target.value }));
                  if (fieldErrors.payment_offered) setFieldErrors((prev) => ({ ...prev, payment_offered: undefined }));
                }}
                placeholder="Quoted amount"
                className={fieldErrors.payment_offered ? "border-destructive" : ""}
              />
              {fieldErrors.payment_offered && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.payment_offered}</p>
              )}
            </div>
            <div id="field-guardian_number_1">
              <Label>Guardian 1 number <span className="text-destructive">*</span></Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={form.guardian_number_1}
                onChange={(e) => {
                  const v = normalizeMobile(e.target.value);
                  setForm((f) => ({ ...f, guardian_number_1: v }));
                  if (fieldErrors.guardian_number_1) setFieldErrors((prev) => ({ ...prev, guardian_number_1: undefined }));
                }}
                placeholder="10 digits only"
                className={fieldErrors.guardian_number_1 ? "border-destructive" : ""}
              />
              {fieldErrors.guardian_number_1 && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.guardian_number_1}</p>
              )}
            </div>
            <div id="field-guardian_relation_1">
              <Label>Guardian 1 relation <span className="text-destructive">*</span></Label>
              <Input
                value={form.guardian_relation_1}
                onChange={(e) => {
                  const v = e.target.value.replace(/[0-9]/g, "");
                  setForm((f) => ({ ...f, guardian_relation_1: v }));
                  if (fieldErrors.guardian_relation_1) setFieldErrors((prev) => ({ ...prev, guardian_relation_1: undefined }));
                }}
                placeholder="e.g. Father, Mother"
                className={fieldErrors.guardian_relation_1 ? "border-destructive" : ""}
              />
              {fieldErrors.guardian_relation_1 && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.guardian_relation_1}</p>
              )}
            </div>
            <div>
              <Label>Guardian 2 number</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={form.guardian_number_2}
                onChange={(e) => {
                  const v = normalizeMobile(e.target.value);
                  setForm((f) => ({ ...f, guardian_number_2: v }));
                  if (fieldErrors.guardian_number_2) setFieldErrors((prev) => ({ ...prev, guardian_number_2: undefined }));
                }}
                placeholder="10 digits only (optional)"
                className={fieldErrors.guardian_number_2 ? "border-destructive" : ""}
              />
              {fieldErrors.guardian_number_2 && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.guardian_number_2}</p>
              )}
            </div>
            <div>
              <Label>Guardian 2 relation</Label>
              <Input
                value={form.guardian_relation_2}
                onChange={(e) => {
                  const v = e.target.value.replace(/[0-9]/g, "");
                  setForm((f) => ({ ...f, guardian_relation_2: v }));
                  if (fieldErrors.guardian_relation_2) setFieldErrors((prev) => ({ ...prev, guardian_relation_2: undefined }));
                }}
                placeholder="Optional"
                className={fieldErrors.guardian_relation_2 ? "border-destructive" : ""}
              />
              {fieldErrors.guardian_relation_2 && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.guardian_relation_2}</p>
              )}
            </div>
            <div>
              <Label>Guardian email</Label>
              <Input
                type="email"
                value={form.guardian_email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, guardian_email: e.target.value }));
                  if (fieldErrors.guardian_email) setFieldErrors((prev) => ({ ...prev, guardian_email: undefined }));
                }}
                placeholder="Optional"
                className={fieldErrors.guardian_email ? "border-destructive" : ""}
              />
              {fieldErrors.guardian_email && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.guardian_email}</p>
              )}
            </div>
            <div id="field-college_name">
              <Label>College <span className="text-destructive">*</span></Label>
              <Input
                value={form.college_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, college_name: e.target.value }));
                  if (fieldErrors.college_name) setFieldErrors((prev) => ({ ...prev, college_name: undefined }));
                }}
                placeholder="College name"
                className={fieldErrors.college_name ? "border-destructive" : ""}
              />
              {fieldErrors.college_name && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.college_name}</p>
              )}
            </div>
            <div id="field-tpo_name">
              <Label>TPO name <span className="text-destructive">*</span></Label>
              <Input
                value={form.tpo_name}
                onChange={(e) => {
                  const v = e.target.value.replace(/[0-9]/g, "");
                  setForm((f) => ({ ...f, tpo_name: v }));
                  if (fieldErrors.tpo_name) setFieldErrors((prev) => ({ ...prev, tpo_name: undefined }));
                }}
                placeholder="Training & Placement Officer name"
                className={fieldErrors.tpo_name ? "border-destructive" : ""}
              />
              {fieldErrors.tpo_name && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.tpo_name}</p>
              )}
            </div>
            <div id="field-tpo_number">
              <Label>TPO number <span className="text-destructive">*</span></Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={form.tpo_number}
                onChange={(e) => {
                  setForm((f) => ({ ...f, tpo_number: normalizeMobile(e.target.value) }));
                  if (fieldErrors.tpo_number) setFieldErrors((prev) => ({ ...prev, tpo_number: undefined }));
                }}
                placeholder="10 digits only"
                className={fieldErrors.tpo_number ? "border-destructive" : ""}
              />
              {fieldErrors.tpo_number && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.tpo_number}</p>
              )}
            </div>
            <div>
              <Label>TPO email (optional)</Label>
              <Input
                type="email"
                value={form.tpo_email}
                onChange={(e) => setForm((f) => ({ ...f, tpo_email: e.target.value }))}
                placeholder="TPo email (optional)"
              />
            </div>
            <div id="field-student_degree">
              <Label>Highest qualification <span className="text-destructive">*</span></Label>
              <Input
                value={form.student_degree}
                onChange={(e) => {
                  setForm((f) => ({ ...f, student_degree: e.target.value }));
                  if (fieldErrors.student_degree) setFieldErrors((prev) => ({ ...prev, student_degree: undefined }));
                }}
                placeholder="e.g. B.Tech, B.Sc"
                className={fieldErrors.student_degree ? "border-destructive" : ""}
              />
              {fieldErrors.student_degree && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.student_degree}</p>
              )}
            </div>
            <div id="field-total_percentage">
              <Label>Marks / CGPA <span className="text-destructive">*</span></Label>
              <Input
                value={form.total_percentage}
                onChange={(e) => {
                  setForm((f) => ({ ...f, total_percentage: e.target.value }));
                  if (fieldErrors.total_percentage) setFieldErrors((prev) => ({ ...prev, total_percentage: undefined }));
                }}
                placeholder="e.g. 70% or 7.2 CGPA"
                className={fieldErrors.total_percentage ? "border-destructive" : ""}
              />
              {fieldErrors.total_percentage && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.total_percentage}</p>
              )}
            </div>
            <div id="field-education_status">
              <Label>Education status <span className="text-destructive">*</span></Label>
              <select
                className={`w-full rounded-md border bg-background px-3 py-2 ${fieldErrors.education_status ? "border-destructive" : "border-input"}`}
                value={form.education_status}
                onChange={(e) => {
                  setForm((f) => ({ ...f, education_status: e.target.value }));
                  if (fieldErrors.education_status) setFieldErrors((prev) => ({ ...prev, education_status: undefined }));
                }}
              >
                {EDU_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {fieldErrors.education_status && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.education_status}</p>
              )}
            </div>
            <div id="field-year_of_passing">
              <Label>Year of passing <span className="text-destructive">*</span></Label>
              <Input
                inputMode="numeric"
                min={YEAR_MIN}
                max={YEAR_MAX}
                value={form.year_of_passing}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setForm((f) => ({ ...f, year_of_passing: v }));
                  if (fieldErrors.year_of_passing) setFieldErrors((prev) => ({ ...prev, year_of_passing: undefined }));
                }}
                placeholder="e.g. 2024"
                className={fieldErrors.year_of_passing ? "border-destructive" : ""}
              />
              {fieldErrors.year_of_passing && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.year_of_passing}</p>
              )}
            </div>
            <div>
              <Label>Mode of classes</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={form.mode_of_classes}
                onChange={(e) => setForm((f) => ({ ...f, mode_of_classes: e.target.value }))}
              >
                {MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div id="field-reference_details">
              <Label>Reference details (how did you find us?) <span className="text-destructive">*</span></Label>
              <textarea
                value={form.reference_details}
                onChange={(e) => {
                  setForm((f) => ({ ...f, reference_details: e.target.value }));
                  if (fieldErrors.reference_details) setFieldErrors((prev) => ({ ...prev, reference_details: undefined }));
                }}
                placeholder="e.g. Friend, Instagram"
                rows={3}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${fieldErrors.reference_details ? "border-destructive" : "border-input"}`}
              />
              {fieldErrors.reference_details && (
                <p className="mt-1 text-sm text-destructive">{fieldErrors.reference_details}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Initial payment <span className="text-destructive">*</span></CardTitle>
            <CardDescription>This payment is required at enrollment. Status will be Pending until Admin/Manager verify.</CardDescription>
          </CardHeader>
          <CardContent className="grid items-start gap-4 sm:grid-cols-2">
            <div>
              <Label>Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                max={form.payment_offered || undefined}
                id="payment-field-amount"
                value={initialPayment.amount}
                onChange={(e) => setInitialPayment((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0"
              />
              {paymentFieldErrors.amount && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.amount}</p>
              )}
            </div>
            <div>
              <Label>Payment date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                id="payment-field-date"
                value={initialPayment.payment_date}
                onChange={(e) => setInitialPayment((p) => ({ ...p, payment_date: e.target.value }))}
              />
              {paymentFieldErrors.payment_date && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.payment_date}</p>
              )}
            </div>
            <div>
              <Label>Mode <span className="text-destructive">*</span></Label>
              <select
                id="payment-field-mode"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={initialPayment.payment_mode}
                onChange={(e) => setInitialPayment((p) => ({ ...p, payment_mode: e.target.value, receiver: "" }))}
              >
                {PAYMENT_MODE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {paymentFieldErrors.payment_mode && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.payment_mode}</p>
              )}
            </div>
            {(initialPayment.payment_mode === "upi" || initialPayment.payment_mode === "bank") && (
              <div>
                <Label>Receiver account *</Label>
                <select
                  id="payment-field-receiver"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={initialPayment.receiver}
                  onChange={(e) => setInitialPayment((p) => ({ ...p, receiver: e.target.value }))}
                  disabled={paymentReceiversLoading}
                >
                  <option value="">
                    {paymentReceiversLoading ? "Loading receiver accounts..." : "Select receiver account"}
                  </option>
                  {paymentReceivers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.receiver_name} · {r.bank_name}
                    </option>
                  ))}
                </select>
                {paymentReceiversError && (
                  <p className="mt-1 text-sm text-destructive">{paymentReceiversError}</p>
                )}
                {paymentFieldErrors.receiver && (
                  <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.receiver}</p>
                )}
              </div>
            )}
            <div>
              <Label>Reference / Transaction ID</Label>
              <Input
                value={initialPayment.reference}
                onChange={(e) => setInitialPayment((p) => ({ ...p, reference: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <ImageDropzone
                  label="Proof Screenshot *"
                  value={initialPayment.reference_image}
                  id="payment-field-reference-image"
                  onChange={(file) => setInitialPayment((p) => ({ ...p, reference_image: file }))}
                />
                <ImageDropzone
                  label="Receipt Image *"
                  value={initialPayment.receipt_image}
                  id="payment-field-receipt-image"
                  onChange={(file) => setInitialPayment((p) => ({ ...p, receipt_image: file }))}
                />
              </div>
              {(paymentFieldErrors.reference_image || paymentFieldErrors.receipt_image) && (
                <p className="mt-2 text-sm text-destructive">
                  {paymentFieldErrors.reference_image || paymentFieldErrors.receipt_image}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Input
                maxLength={200}
                value={initialPayment.notes}
                onChange={(e) => setInitialPayment((p) => ({ ...p, notes: e.target.value }))}
              />
              {paymentFieldErrors.notes && (
                <p className="mt-1 text-sm text-destructive">{paymentFieldErrors.notes}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-end gap-2">
          {(!emailVerified || !mobileVerified) && (
            <p className="text-sm text-muted-foreground">Verify student email and mobile with OTP above to continue.</p>
          )}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => setCancelConfirmOpen(true)} disabled={saving || loadingLead}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loadingLead || !emailVerified || !mobileVerified}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Review & Submit"}
            </Button>
          </div>
        </div>
      </form>

      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCancelConfirmOpen(false)}>
          <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Discard changes?</h3>
            <p className="mt-2 text-sm text-muted-foreground">All unsaved student and payment details will be lost.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCancelConfirmOpen(false)}>Keep editing</Button>
              <Button type="button" variant="destructive" onClick={() => router.back()}>Discard</Button>
            </div>
          </div>
        </div>
      )}

      {submitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setSubmitConfirmOpen(false)}>
          <div className="w-full max-w-2xl rounded-lg border bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Confirm enrollment</h3>
            <p className="mt-1 text-sm text-muted-foreground">Please verify details before final submit.</p>
            <div className="mt-4 grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{form.student_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{form.student_mobile || "—"}</span></div>
              <div><span className="text-muted-foreground">Course:</span> <span className="font-medium">{COURSE_OPTIONS.find((c) => c.value === form.course)?.label || form.course || "—"}</span></div>
              <div><span className="text-muted-foreground">Sales Batch:</span> <span className="font-medium">{selectedSalesBatch?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Offered Amount:</span> <span className="font-medium">{form.payment_offered ? `₹ ${Number(form.payment_offered).toLocaleString()}` : "—"}</span></div>
              <div><span className="text-muted-foreground">Initial Payment:</span> <span className="font-medium">{initialPayment.amount ? `₹ ${Number(initialPayment.amount).toLocaleString()}` : "—"}</span></div>
              <div><span className="text-muted-foreground">Payment Mode:</span> <span className="font-medium">{PAYMENT_MODE_OPTIONS.find((m) => m.value === initialPayment.payment_mode)?.label || initialPayment.payment_mode || "—"}</span></div>
              <div><span className="text-muted-foreground">Receiver:</span> <span className="font-medium">{paymentReceivers.find((r) => String(r.id) === String(initialPayment.receiver))?.receiver_name || "—"}</span></div>
              <div><span className="text-muted-foreground">Proof Screenshot:</span> <span className="font-medium">{initialPayment.reference_image?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Receipt Image:</span> <span className="font-medium">{initialPayment.receipt_image?.name || "—"}</span></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSubmitConfirmOpen(false)} disabled={saving}>Back</Button>
              <Button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!validateBeforeSubmit()) {
                    setSubmitConfirmOpen(false);
                    return;
                  }
                  setSubmitConfirmOpen(false);
                  await submitEnrollment();
                }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Enroll"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
