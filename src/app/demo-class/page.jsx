"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import DemoClassFeedbackForm from "@/components/demoStudents/DemoClassFeedbackForm";
import {
  validateDemoClassForm,
  mapDemoClassApiErrors,
} from "@/lib/validateDemoClassForm";
import useToast from "@/hooks/useToast";
import {
  validateDemoClassQr,
  fetchDemoTrainersDropdown,
  fetchSalesPersonsDropdown,
  submitDemoStudentForm,
  clearDemoStudentSubmit,
} from "@/redux/features/demoStudents/demoStudentsSlice";

function emptyForm() {
  return {
    student_name: "",
    student_email: "",
    student_phonenumber: "",
    student_branch: "",
    student_year_of_pass: "",
    sales_person_name: "",
    demo_date: new Date().toISOString().slice(0, 10),
    course_name: "",
    demo_trainer: "",
    demo_topic: "",
    explanation: "",
    concept: "",
    class_interaction: "",
    voice_modulation: "",
    eye_contact: "",
    body_language: "",
    real_time_examples: "",
    feedback: "",
    comments: "",
  };
}

function firstErrorMessage(errors) {
  if (!errors || typeof errors !== "object") return "Please fix the form errors.";
  if (typeof errors._form === "string" && errors._form) return errors._form;
  const first = Object.values(errors).find((v) => typeof v === "string" && v);
  return first || "Please fix the form errors.";
}

function DemoClassFormInner() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { showSuccessToast, showErrorToast } = useToast();

  const {
    qrValidate,
    qrValidateLoading,
    qrValidateError,
    trainers,
    trainersLoading,
    salesPersons,
    salesPersonsLoading,
    submitLoading,
  } = useSelector((state) => state.demoStudents);

  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (token) dispatch(validateDemoClassQr(token));
    dispatch(fetchDemoTrainersDropdown());
    dispatch(fetchSalesPersonsDropdown());
  }, [dispatch, token]);

  const onChange = (next) => {
    setForm(next);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearDemoStudentSubmit());
    setFieldErrors({});

    const { errors, values } = validateDemoClassForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showErrorToast(firstErrorMessage(errors));
      return;
    }

    const result = await dispatch(submitDemoStudentForm(values));
    if (submitDemoStudentForm.fulfilled.match(result)) {
      setForm(emptyForm());
      setFieldErrors({});
      showSuccessToast("Submitted successfully. Thank you!");
      return;
    }
    const apiErrors = mapDemoClassApiErrors(result.payload);
    setFieldErrors(apiErrors);
    showErrorToast(firstErrorMessage(apiErrors) || "Failed to submit demo form.");
  };

  if (!token) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardHeader>
          <CardTitle>Missing QR token</CardTitle>
          <CardDescription>Scan a valid demo class QR code to open this form.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (qrValidateLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Validating link…
      </div>
    );
  }

  if (qrValidateError || !qrValidate?.valid) {
    return (
      <Card className="mx-auto mt-10 max-w-lg border-destructive/40">
        <CardHeader>
          <CardTitle>QR link unavailable</CardTitle>
          <CardDescription>
            {typeof qrValidateError === "string"
              ? qrValidateError
              : "This QR has expired or is invalid. Please ask for a new QR."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Demo class feedback</CardTitle>
          <CardDescription>
            Submit your details and session feedback. Same phone number updates your profile and adds
            another feedback entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DemoClassFeedbackForm
            form={form}
            fieldErrors={fieldErrors}
            trainers={trainers}
            trainersLoading={trainersLoading}
            salesPersons={salesPersons}
            salesPersonsLoading={salesPersonsLoading}
            submitLoading={submitLoading}
            onChange={onChange}
            onSubmit={onSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DemoClassPublicPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      }
    >
      <DemoClassFormInner />
    </Suspense>
  );
}
