"use client";

import { useCallback, useEffect, useState } from "react";
import { sendMentorOtp, verifyMentorOtp } from "@/lib/mentorOtpApi";
import { formMobileRegex, normalizeMobile } from "@/lib/studentFormValidations";

export function useEnrollmentOtp(form) {
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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const emailResendSeconds = Math.max(0, Math.ceil((emailResendAt - now) / 1000));
  const mobileResendSeconds = Math.max(0, Math.ceil((mobileResendAt - now) / 1000));

  const resetEmailOtpFlow = useCallback(() => {
    setEmailVerified(false);
    setEmailOtpSent(false);
    setEmailOtp("");
    setEmailOtpError("");
    setEmailResendAt(0);
  }, []);

  const resetMobileOtpFlow = useCallback(() => {
    setMobileVerified(false);
    setMobileOtpSent(false);
    setMobileOtp("");
    setMobileOtpError("");
    setMobileResendAt(0);
  }, []);

  const handleSendEmailOtp = useCallback(async () => {
    const email = (form.student_email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailOtpError("Enter a valid email first.");
      return;
    }
    setEmailOtpError("");
    setEmailOtpLoading(true);
    try {
      const result = await sendMentorOtp({
        channel: "email",
        email,
        filters: ["check_and_block_exists_in_sales_student"],
      });
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
  }, [form.student_email]);

  const handleVerifyEmailOtp = useCallback(async () => {
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
  }, [form.student_email, emailOtp]);

  const handleSendMobileOtp = useCallback(async () => {
    const mobile = normalizeMobile(form.student_mobile);
    if (!mobile || mobile.length !== 10 || !formMobileRegex.test(mobile)) {
      setMobileOtpError("Enter a valid 10-digit mobile first.");
      return;
    }
    setMobileOtpError("");
    setMobileOtpLoading(true);
    try {
      const result = await sendMentorOtp({
        channel: "mobile",
        mobile,
        filters: ["check_and_block_exists_in_sales_student"],
      });
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
  }, [form.student_mobile]);

  const handleVerifyMobileOtp = useCallback(async () => {
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
  }, [form.student_mobile, mobileOtp]);

  return {
    emailVerified,
    mobileVerified,
    emailOtpSent,
    mobileOtpSent,
    emailOtp,
    setEmailOtp,
    mobileOtp,
    setMobileOtp,
    emailOtpLoading,
    mobileOtpLoading,
    emailVerifyLoading,
    mobileVerifyLoading,
    emailOtpError,
    mobileOtpError,
    emailResendSeconds,
    mobileResendSeconds,
    onResetEmailOtpFlow: resetEmailOtpFlow,
    onResetMobileOtpFlow: resetMobileOtpFlow,
    onSendEmailOtp: handleSendEmailOtp,
    onVerifyEmailOtp: handleVerifyEmailOtp,
    onSendMobileOtp: handleSendMobileOtp,
    onVerifyMobileOtp: handleVerifyMobileOtp,
  };
}
