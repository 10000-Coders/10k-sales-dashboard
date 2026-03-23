"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useCallback, Suspense, useMemo } from "react";
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

  useEffect(() => {
    dispatch(resetReferralForm());
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
        value = String(value).replace(/\D/g, "").slice(0, 10);
      }
      dispatch(setField({ name, value }));
    },
    [dispatch]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      dispatch(submitReferral({ refId, form }));
    },
    [dispatch, refId, form]
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
      <div className="relative min-h-screen overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.25),transparent)]" />
        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">You&apos;re on the list</h1>
            <p className="mt-4 text-lg text-slate-200">
              Our team will reach out shortly—usually within{" "}
              <span className="font-semibold text-amber-300">one business day</span>—to understand your goals and walk
              you through the next steps.
            </p>
            <ul className="mt-8 space-y-3 text-left text-sm text-slate-300">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                Keep your phone handy for a quick call from our counsellor.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                Check spam/junk if you don&apos;t see our email.
              </li>
            </ul>
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

              <section className="space-y-5" aria-labelledby="section-contact">
                <h3 id="section-contact" className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
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
                  maxLength={15}
                  placeholder="10-digit Indian mobile"
                  autoComplete="tel"
                  hint="We’ll call this number for your free counselling session."
                />
              </section>

              <section className="space-y-5" aria-labelledby="section-education">
                <h3 id="section-education" className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
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

              <section className="space-y-5" aria-labelledby="section-location">
                <h3 id="section-location" className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
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

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
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
