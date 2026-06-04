"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "@/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import StudentEnrollmentFields from "@/components/enrollment/StudentEnrollmentFields";
import { INITIAL_ENROLLMENT_FORM } from "@/lib/enrollmentFormConstants";
import { validateEnrollmentForm } from "@/lib/validateEnrollmentForm";
import { validateMarks, normalizeMobile } from "@/lib/studentFormValidations";
import { useEnrollmentOtp } from "@/hooks/useEnrollmentOtp";

function EnrollFormContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState(null);
  const [inviteMeta, setInviteMeta] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_ENROLLMENT_FORM });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);

  const otp = useEnrollmentOtp(form);

  const lockedDisplay = inviteMeta
    ? {
        courseLabel: inviteMeta.course_label,
        salesBatchName: inviteMeta.sales_batch_name,
        paymentOffered: inviteMeta.payment_offered,
      }
    : null;

  const loadInvite = useCallback(async () => {
    if (!token) {
      setInviteError("Missing enrollment link. Please scan the QR code shared by your counselor.");
      setLoadingInvite(false);
      return;
    }
    setLoadingInvite(true);
    setInviteError(null);
    try {
      const { data } = await axios.get(`/enrollment-invites/${token}/`);
      setInviteMeta(data);
      setForm((f) => ({
        ...f,
        course: data.course || "",
        sales_batch: data.sales_batch ? String(data.sales_batch) : "",
        payment_offered: data.payment_offered != null ? String(data.payment_offered) : "",
        student_name: (data.lead_name || f.student_name).replace(/[0-9]/g, "").trim() || f.student_name,
        student_email: data.lead_email || f.student_email,
        student_mobile: data.lead_mobile ? normalizeMobile(String(data.lead_mobile)) : f.student_mobile,
      }));
    } catch (err) {
      const status = err.response?.status;
      const detail =
        err.response?.data?.detail ||
        (status === 410
          ? "This enrollment link has expired or was already used."
          : "Invalid enrollment link.");
      setInviteError(detail);
    } finally {
      setLoadingInvite(false);
    }
  }, [token]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || success) return;
    setSubmitError(null);
    setFieldErrors({});

    if (!otp.emailVerified || !otp.mobileVerified) {
      setFieldErrors((prev) => ({
        ...prev,
        ...(otp.emailVerified ? {} : { student_email: "Verify email with OTP to continue." }),
        ...(otp.mobileVerified ? {} : { student_mobile: "Verify mobile with OTP to continue." }),
      }));
      return;
    }

    const errors = validateEnrollmentForm(form, { requirePaymentOffered: false });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
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
      };
      await axios.post(`/enrollment-invites/${token}/submit/`, payload);
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const apiErrors = {};
        for (const [key, val] of Object.entries(data)) {
          if (key === "detail") continue;
          const msg = Array.isArray(val) ? val[0] : val;
          if (msg && typeof msg === "string") apiErrors[key] = msg;
        }
        if (Object.keys(apiErrors).length > 0) {
          setFieldErrors(apiErrors);
        }
      }
      setSubmitError(
        typeof data === "string"
          ? data
          : data?.detail || data?.message || "Failed to submit enrollment. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enrollment link unavailable</CardTitle>
            <CardDescription>{inviteError}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-4 text-xl font-semibold">Registration received</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you! Your counselor will contact you regarding payment and next steps.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4 py-8 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Complete your enrollment</h1>
        <p className="text-muted-foreground">
          Fill in your details below. Course, batch, and fee are set by your counselor.
        </p>
      </div>

      {submitError && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{submitError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Student details</CardTitle>
            <CardDescription>Verify email and mobile with OTP, then submit.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentEnrollmentFields
              form={form}
              setForm={setForm}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              lockCourseBatchOffered
              lockedDisplay={lockedDisplay}
              {...otp}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col items-end gap-2">
          {(!otp.emailVerified || !otp.mobileVerified) && (
            <p className="text-sm text-muted-foreground">
              Verify student email and mobile with OTP to submit.
            </p>
          )}
          <Button type="submit" disabled={submitting || !otp.emailVerified || !otp.mobileVerified}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit enrollment"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function PublicEnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <EnrollFormContent />
    </Suspense>
  );
}
