"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useCallback, Suspense, useMemo, useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import {
  submitReferral,
  resetReferralForm,
  setField,
  REFERRAL_FORM_STATUS,
  selectReferralForm,
  selectReferralFormStatus,
  selectReferralFormError,
  selectReferralFormFieldErrors,
} from "@/redux/features/referralForm/referralFormSlice";
import {
  FormRow,
  INPUT_BASE,
  INPUT_OK,
  INPUT_ERROR,
} from "@/components/referral/ReferralFormPrimitives";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import { sendMentorOtp, verifyMentorOtp } from "@/lib/mentorOtpApi";

const REFERRAL_MOBILE_OTP_RESEND_SEC = 30;
/** Mentor OTP API uses 6-digit OTPs (`OTP_LENGTH` default). */
const REFERRAL_OTP_INPUT_MAX_LEN = 6;

function digits10(raw) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 10);
}

function createReferralMobileOtpState() {
  return {
    input: "",
    sent: false,
    verifiedFor: "",
    error: "",
    phase: "idle",
    cooldown: 0,
  };
}

function referralMobileOtpReducer(state, action) {
  switch (action.type) {
    case "reset":
      return createReferralMobileOtpState();
    case "set_input":
      return { ...state, input: action.value, error: "" };
    case "send_begin":
      return { ...state, phase: "sending", error: "" };
    case "send_ok":
      return {
        ...state,
        phase: "idle",
        sent: true,
        cooldown: REFERRAL_MOBILE_OTP_RESEND_SEC,
        error: "",
      };
    case "send_fail":
      return { ...state, phase: "idle", error: action.message };
    case "verify_begin":
      return { ...state, phase: "verifying", error: "" };
    case "verify_ok":
      return {
        ...state,
        phase: "idle",
        verifiedFor: action.mobile,
        sent: true,
        input: "",
        error: "",
      };
    case "verify_fail":
      return { ...state, phase: "idle", verifiedFor: "", error: action.message };
    case "cooldown_tick":
      return state.cooldown <= 0 ? state : { ...state, cooldown: state.cooldown - 1 };
    case "submit_blocked":
      return state.error ? state : { ...state, error: action.message };
    default:
      return state;
  }
}

function getInitial(name) {
  if (!name || typeof name !== "string") return "?";
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

function ReferralFormContent() {
  const searchParams = useSearchParams();
  const refId = searchParams.get("ref")?.trim() || null;
  const referrerName = useMemo(() => {
    const n = searchParams.get("name") || searchParams.get("by");
    return n ? decodeURIComponent(n).trim() : "";
  }, [searchParams]);

  const dispatch = useDispatch();
  const form = useSelector(selectReferralForm);
  const status = useSelector(selectReferralFormStatus);
  const error = useSelector(selectReferralFormError);
  const fieldErrors = useSelector(selectReferralFormFieldErrors);

  const isSubmitting = status === REFERRAL_FORM_STATUS.SUBMITTING;
  const isSuccess = status === REFERRAL_FORM_STATUS.SUCCESS;

  const [phoneOtp, phoneOtpDispatch] = useReducer(referralMobileOtpReducer, undefined, createReferralMobileOtpState);

  const mobileDigits = digits10(form.referred_mobile);
  const sendingMobileOtp = phoneOtp.phase === "sending";
  const verifyingMobileOtp = phoneOtp.phase === "verifying";
  const mobileOtpVerifiedForField =
    phoneOtp.verifiedFor.length === 10 && phoneOtp.verifiedFor === mobileDigits;

  useEffect(() => {
    if (phoneOtp.cooldown <= 0) return;
    const t = setTimeout(() => phoneOtpDispatch({ type: "cooldown_tick" }), 1000);
    return () => clearTimeout(t);
  }, [phoneOtp.cooldown]);

  useEffect(() => {
    dispatch(resetReferralForm());
    phoneOtpDispatch({ type: "reset" });
  }, [dispatch]);

  useEffect(() => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (firstKey) {
      const el = document.getElementById(`referral-${firstKey}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [fieldErrors]);

  const handleChange = useCallback(
    (name, value) => {
      if (name === "referred_mobile") {
        if (mobileOtpVerifiedForField) return;
        value = digits10(value);
        phoneOtpDispatch({ type: "reset" });
      }
      dispatch(setField({ name, value }));
    },
    [dispatch, mobileOtpVerifiedForField]
  );

  const handleSendMobileOtp = useCallback(async () => {
    if (mobileDigits.length !== 10) {
      phoneOtpDispatch({
        type: "send_fail",
        message: "Enter a valid 10-digit mobile number first.",
      });
      return;
    }
    phoneOtpDispatch({ type: "send_begin" });
    try {
      const result = await sendMentorOtp({
        channel: "mobile",
        mobile: mobileDigits,
        filters: ["check_and_block_exists_in_all_batch"],
      });
      if (result.success) phoneOtpDispatch({ type: "send_ok" });
      else
        phoneOtpDispatch({
          type: "send_fail",
          message: result.error || "Failed to send OTP.",
        });
    } catch {
      phoneOtpDispatch({ type: "send_fail", message: "Network error. Try again." });
    }
  }, [mobileDigits]);

  const handleVerifyMobileOtp = useCallback(async () => {
    if (mobileDigits.length !== 10) {
      phoneOtpDispatch({
        type: "verify_fail",
        message: "Enter a valid 10-digit mobile number first.",
      });
      return;
    }
    const otp = phoneOtp.input.replace(/\D/g, "").slice(0, REFERRAL_OTP_INPUT_MAX_LEN);
    if (otp.length !== REFERRAL_OTP_INPUT_MAX_LEN) {
      phoneOtpDispatch({
        type: "verify_fail",
        message: `Enter the ${REFERRAL_OTP_INPUT_MAX_LEN}-digit OTP sent to your mobile.`,
      });
      return;
    }
    phoneOtpDispatch({ type: "verify_begin" });
    try {
      const result = await verifyMentorOtp({ channel: "mobile", mobile: mobileDigits, otp });
      if (result.success) phoneOtpDispatch({ type: "verify_ok", mobile: mobileDigits });
      else
        phoneOtpDispatch({
          type: "verify_fail",
          message: result.error || "Invalid OTP.",
        });
    } catch {
      phoneOtpDispatch({ type: "verify_fail", message: "Network error. Try again." });
    }
  }, [mobileDigits, phoneOtp.input]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!mobileOtpVerifiedForField) {
        phoneOtpDispatch({
          type: "submit_blocked",
          message: "Confirm your mobile number with the SMS OTP before submitting.",
        });
        document.getElementById("referral-referred_mobile")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      dispatch(submitReferral({ refId, form }));
    },
    [dispatch, refId, form, mobileOtpVerifiedForField]
  );

  if (!refId) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,146,60,0.35),transparent)]" />
        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <CircleAlert className="h-8 w-8" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Link incomplete</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              This invite link is missing information. Ask your friend to resend the full link from their 10000coders
              dashboard so we can connect you to the right counsellor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full bg-slate-100 py-10 text-slate-900 sm:py-14">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/35">
            <div className="border-b border-slate-200 bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 text-white sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-100">Referral submitted</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Thank you for submitting</h1>
            </div>
            <div className="space-y-6 px-6 py-8 sm:px-8 sm:py-9">
              <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="text-base font-semibold text-emerald-900">Your request has been received.</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Our team will contact you within <span className="font-semibold">one business day</span>.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm text-slate-700">
                  Thank you for your interest in 10000Coders. We&apos;ll get in touch with you shortly.
                </p>
                <a
                  href="https://www.10000coders.in/"
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Go to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 py-8 text-slate-900 sm:py-10">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/35">
          <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-7 text-white sm:px-8">
            <div className="flex flex-col gap-5 sm:gap-6">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <Image
                    src="/logo-2.png"
                    alt="10000coders"
                    width={170}
                    height={52}
                    priority
                    className="h-auto w-[130px] sm:w-[165px]"
                  />
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-200">
                  Referral Form
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-[30px]">Get A Free Counselling Call</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Complete this form and our team will contact you with the right program guidance.
                </p>
              </div>

              {referrerName ? (
                <div className="flex w-full items-center gap-3 rounded-xl border border-orange-300/30 bg-orange-500/10 px-3.5 py-3.5">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-lg font-bold text-white"
                    aria-hidden
                  >
                    {getInitial(referrerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-200">Invited by</p>
                    <p className="truncate text-base font-bold text-white sm:text-lg">{referrerName}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

            <form onSubmit={handleSubmit} className="space-y-8 px-5 py-7 sm:px-8 sm:py-8 lg:space-y-7" noValidate>
              {error && (
                <div
                  className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
                  role="alert"
                >
                  <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <section
                className="space-y-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 sm:p-6"
                aria-labelledby="section-contact"
              >
                <h3 id="section-contact" className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shadow-sm ring-1 ring-orange-200/50">
                    <User className="h-4 w-4" aria-hidden />
                  </span>
                  Contact details
                </h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <FormRow
                    label="Full name"
                    name="referred_name"
                    form={form}
                    fieldErrors={fieldErrors}
                    onChange={handleChange}
                    required
                    maxLength={250}
                    placeholder="As per your ID / certificates"
                    autoComplete="name"
                  />
                  <FormRow
                    label="Email"
                    name="referred_email"
                    form={form}
                    fieldErrors={fieldErrors}
                    onChange={handleChange}
                    required
                    type="email"
                    maxLength={254}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <FormRow
                  label="Mobile number"
                  name="referred_mobile"
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit Indian mobile"
                  autoComplete="tel"
                  disabled={mobileOtpVerifiedForField}
                  hint={
                    mobileOtpVerifiedForField
                      ? "Verified — this number is locked."
                      : "For your counselling call."
                  }
                />

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-slate-600">SMS OTP (6 digits)</span>
                    <div className="flex items-center gap-2">
                      {mobileOtpVerifiedForField ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendMobileOtp}
                          disabled={
                            sendingMobileOtp ||
                            phoneOtp.cooldown > 0 ||
                            verifyingMobileOtp ||
                            mobileDigits.length !== 10
                          }
                          className="inline-flex min-h-9 items-center justify-center rounded-lg bg-orange-500 px-3.5 text-sm font-medium text-white hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {sendingMobileOtp ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : phoneOtp.cooldown > 0 ? (
                            `Wait ${phoneOtp.cooldown}s`
                          ) : phoneOtp.sent ? (
                            "Resend OTP"
                          ) : (
                            "Send OTP"
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {phoneOtp.sent && !mobileOtpVerifiedForField ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="sr-only" htmlFor="referral-mobile-otp">
                        SMS OTP
                      </label>
                      <input
                        id="referral-mobile-otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={REFERRAL_OTP_INPUT_MAX_LEN}
                        value={phoneOtp.input}
                        onChange={(e) =>
                          phoneOtpDispatch({
                            type: "set_input",
                            value: e.target.value.replace(/\D/g, "").slice(0, REFERRAL_OTP_INPUT_MAX_LEN),
                          })
                        }
                        disabled={verifyingMobileOtp}
                        placeholder="------"
                        className={`${INPUT_BASE} min-h-10 max-w-[11rem] tabular-nums tracking-widest ${INPUT_OK}`}
                        aria-label="6-digit SMS OTP"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyMobileOtp}
                        disabled={
                          verifyingMobileOtp || phoneOtp.input.replace(/\D/g, "").length !== REFERRAL_OTP_INPUT_MAX_LEN
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                      >
                        {verifyingMobileOtp ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Verify OTP"}
                      </button>
                    </div>
                  ) : null}

                  {phoneOtp.error ? (
                    <p className="flex items-start gap-2 text-sm text-red-600" role="alert">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {phoneOtp.error}
                    </p>
                  ) : null}
                </div>
              </section>

              <section
                className="space-y-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 sm:p-6"
                aria-labelledby="section-education"
              >
                <h3 id="section-education" className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shadow-sm ring-1 ring-orange-200/50">
                    <GraduationCap className="h-4 w-4" aria-hidden />
                  </span>
                  Education background
                </h3>
                <FormRow
                  label="College / Institution"
                  name="referred_college"
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  placeholder="College or university name"
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormRow
                    label="Year of passing"
                    name="referred_year_of_passing"
                    form={form}
                    fieldErrors={fieldErrors}
                    onChange={handleChange}
                    required
                    type="number"
                    min={1990}
                    max={2030}
                    placeholder="e.g. 2024"
                  />
                  <FormRow
                    label="Branch"
                    name="referred_branch"
                    form={form}
                    fieldErrors={fieldErrors}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="e.g. CSE, ECE"
                  />
                </div>
                <FormRow
                  label="Qualification"
                  name="referred_qualification"
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                  required
                  maxLength={250}
                  placeholder="e.g. B.Tech, B.Sc, MCA"
                />
              </section>

              <section
                className="space-y-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 sm:p-6"
                aria-labelledby="section-location"
              >
                <h3 id="section-location" className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shadow-sm ring-1 ring-orange-200/50">
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  Location & goals
                </h3>
                <FormRow
                  label="State"
                  name="referred_state"
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="e.g. Telangana, Karnataka"
                />
                <div className="space-y-1.5">
                  <label htmlFor="referral-referred_address" className="text-sm font-medium text-slate-700">
                    Full address <span className="text-orange-500">*</span>
                  </label>
                  <textarea
                    id="referral-referred_address"
                    rows={3}
                    name="referred_address"
                    value={form.referred_address ?? ""}
                    onChange={(e) => handleChange("referred_address", e.target.value)}
                    maxLength={2000}
                    required
                    className={`${INPUT_BASE} ${fieldErrors.referred_address ? INPUT_ERROR : INPUT_OK}`}
                    placeholder="City, area, landmark — helps us assign the right counsellor"
                    aria-invalid={!!fieldErrors.referred_address}
                    aria-describedby={fieldErrors.referred_address ? "referral-referred_address-error" : undefined}
                  />
                  {fieldErrors.referred_address && (
                    <p
                      id="referral-referred_address-error"
                      className="flex items-center gap-1 text-sm text-red-600"
                      role="alert"
                    >
                      <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                      {fieldErrors.referred_address}
                    </p>
                  )}
                </div>
                <FormRow
                  label="Present status"
                  name="referred_present_status"
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  placeholder="e.g. Student, Working professional"
                />
                <FormRow
                  label="Interested in (course / domain)"
                  name="referred_interested_in"
                  form={form}
                  fieldErrors={fieldErrors}
                  onChange={handleChange}
                  required
                  maxLength={200}
                  placeholder="e.g. Full-stack web, Data Science, AI/ML"
                />
              </section>

              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !mobileOtpVerifiedForField}
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-amber-600 hover:shadow-orange-500/35 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    <>
                      Request my free call
                      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" aria-hidden />
                    </>
                  )}
                </button>
                <p className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
                  We respect your privacy—no spam. Unsubscribe anytime.
                </p>
              </div>
            </form>
            <p className="border-t border-slate-100 px-5 py-4 text-center text-xs text-slate-500 sm:px-8">
              © {new Date().getFullYear()} 10000coders
            </p>
          </div>
        </div>
      </div>
  );
}

export default function PublicReferralFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950" aria-busy="true">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-400" aria-hidden />
            <span className="text-sm text-slate-400">Loading your invite…</span>
          </div>
        </div>
      }
    >
      <ReferralFormContent />
    </Suspense>
  );
}
