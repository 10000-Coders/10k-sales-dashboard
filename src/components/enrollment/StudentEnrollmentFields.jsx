"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  MODE_OPTIONS,
  COURSE_OPTIONS,
} from "@/lib/enrollmentFormConstants";
import { EDU_STATUS_OPTIONS } from "@/lib/validateEnrollmentForm";
import { normalizeMobile } from "@/lib/studentFormValidations";
import {
  canSelectMentorApprovedType,
  getPaymentOfferedMinimum,
  getPaymentOfferedTypeOptions,
  isPaymentOfferedCommentRequired,
  paymentOfferedTypeLabel,
  PAYMENT_OFFERED_TYPES,
} from "@/lib/paymentOffered";

/**
 * Shared student enrollment fields (sales enroll + public QR form).
 */
export default function StudentEnrollmentFields({
  form,
  setForm,
  fieldErrors,
  setFieldErrors,
  lockCourseBatchOffered = false,
  lockedDisplay = null,
  salesBatchesLoading = false,
  salesBatchesError = null,
  availableSalesBatches = [],
  selectedSalesBatch = null,
  userRole = null,
  emailVerified = false,
  mobileVerified = false,
  emailOtpSent = false,
  mobileOtpSent = false,
  emailOtp = "",
  setEmailOtp,
  mobileOtp = "",
  setMobileOtp,
  emailOtpLoading = false,
  mobileOtpLoading = false,
  emailVerifyLoading = false,
  mobileVerifyLoading = false,
  emailOtpError = "",
  mobileOtpError = "",
  emailResendSeconds = 0,
  mobileResendSeconds = 0,
  onSendEmailOtp,
  onVerifyEmailOtp,
  onSendMobileOtp,
  onVerifyMobileOtp,
  onResetEmailOtpFlow,
  onResetMobileOtpFlow,
}) {
  const clearError = (key) => {
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const typeOptions = getPaymentOfferedTypeOptions({
    role: userRole,
  });
  const mentorTypeLocked =
    form.payment_offered_type === PAYMENT_OFFERED_TYPES.mentor_approved &&
    !canSelectMentorApprovedType(userRole);
  const commentRequired = isPaymentOfferedCommentRequired(form.payment_offered_type);
  const offeredMin = getPaymentOfferedMinimum(form.course, form.payment_offered_type);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div id="field-student_name">
        <Label>Name <span className="text-destructive">*</span></Label>
        <Input
          value={form.student_name}
          onChange={(e) => {
            const v = e.target.value.replace(/[0-9]/g, "");
            setForm((f) => ({ ...f, student_name: v }));
            clearError("student_name");
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
            clearError("password");
          }}
          placeholder="Min 8 characters"
          className={fieldErrors.password ? "border-destructive" : ""}
        />
        {fieldErrors.password && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.password}</p>
        )}
      </div>
      <div id="field-student_email" className="space-y-2">
        <Label>Email <span className="text-destructive">*</span></Label>
        <div className="flex gap-2">
          <Input
            type="email"
            value={form.student_email}
            onChange={(e) => {
              setForm((f) => ({ ...f, student_email: e.target.value }));
              clearError("student_email");
              onResetEmailOtpFlow?.();
            }}
            placeholder="email@example.com"
            className={`flex-1 ${fieldErrors.student_email ? "border-destructive" : ""} ${emailVerified ? "bg-muted" : ""}`}
            disabled={emailVerified || emailOtpSent}
          />
          {!emailVerified && onSendEmailOtp && !emailOtpSent && (
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={onSendEmailOtp}
              disabled={emailOtpLoading || !(form.student_email || "").trim()}
            >
              {emailOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
            </Button>
          )}
          {!emailVerified && onSendEmailOtp && emailOtpSent && (
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={onSendEmailOtp}
              disabled={emailOtpLoading || emailResendSeconds > 0}
            >
              {emailOtpLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : emailResendSeconds > 0 ? (
                `Resend ${emailResendSeconds}s`
              ) : (
                "Resend OTP"
              )}
            </Button>
          )}
        </div>
        {emailOtpSent && !emailVerified && onVerifyEmailOtp && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter OTP"
              value={emailOtp}
              onChange={(e) => {
                setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              }}
              className="w-28"
            />
            <Button
              type="button"
              size="sm"
              onClick={onVerifyEmailOtp}
              disabled={emailVerifyLoading || !emailOtp.trim()}
            >
              {emailVerifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
            {onResetEmailOtpFlow && (
              <button
                type="button"
                className="text-sm text-muted-foreground underline hover:text-foreground"
                onClick={onResetEmailOtpFlow}
              >
                Change email
              </button>
            )}
          </div>
        )}
        {emailVerified && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-green-600 dark:text-green-400">Email verified</p>
            {onResetEmailOtpFlow && (
              <button
                type="button"
                className="text-left text-sm text-muted-foreground underline hover:text-foreground w-fit"
                onClick={onResetEmailOtpFlow}
              >
                Change email
              </button>
            )}
          </div>
        )}
        {(fieldErrors.student_email || emailOtpError) && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.student_email || emailOtpError}</p>
        )}
      </div>
      <div id="field-student_mobile" className="space-y-2">
        <Label>Mobile <span className="text-destructive">*</span></Label>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            maxLength={10}
            value={form.student_mobile}
            onChange={(e) => {
              const v = normalizeMobile(e.target.value);
              setForm((f) => ({ ...f, student_mobile: v }));
              clearError("student_mobile");
              onResetMobileOtpFlow?.();
            }}
            placeholder="10 digits only"
            className={`flex-1 ${fieldErrors.student_mobile ? "border-destructive" : ""} ${mobileVerified ? "bg-muted" : ""}`}
            disabled={mobileVerified || mobileOtpSent}
          />
          {!mobileVerified && onSendMobileOtp && !mobileOtpSent && (
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={onSendMobileOtp}
              disabled={mobileOtpLoading || !(form.student_mobile || "").trim()}
            >
              {mobileOtpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
            </Button>
          )}
          {!mobileVerified && onSendMobileOtp && mobileOtpSent && (
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0"
              onClick={onSendMobileOtp}
              disabled={mobileOtpLoading || mobileResendSeconds > 0}
            >
              {mobileOtpLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mobileResendSeconds > 0 ? (
                `Resend ${mobileResendSeconds}s`
              ) : (
                "Resend OTP"
              )}
            </Button>
          )}
        </div>
        {mobileOtpSent && !mobileVerified && onVerifyMobileOtp && (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter OTP"
              value={mobileOtp}
              onChange={(e) => {
                setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
              }}
              className="w-28"
            />
            <Button
              type="button"
              size="sm"
              onClick={onVerifyMobileOtp}
              disabled={mobileVerifyLoading || !mobileOtp.trim()}
            >
              {mobileVerifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
            {onResetMobileOtpFlow && (
              <button
                type="button"
                className="text-sm text-muted-foreground underline hover:text-foreground"
                onClick={onResetMobileOtpFlow}
              >
                Change number
              </button>
            )}
          </div>
        )}
        {mobileVerified && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-green-600 dark:text-green-400">Mobile verified</p>
            {onResetMobileOtpFlow && (
              <button
                type="button"
                className="text-left text-sm text-muted-foreground underline hover:text-foreground w-fit"
                onClick={onResetMobileOtpFlow}
              >
                Change number
              </button>
            )}
          </div>
        )}
        {(fieldErrors.student_mobile || mobileOtpError) && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.student_mobile || mobileOtpError}</p>
        )}
      </div>

      <div id="field-course">
        <Label>Course <span className="text-destructive">*</span></Label>
        {lockCourseBatchOffered ? (
          <Input value={lockedDisplay?.courseLabel || form.course} disabled className="bg-muted" />
        ) : (
          <select
            className={`w-full rounded-md border bg-background px-3 py-2 ${fieldErrors.course ? "border-destructive" : "border-input"}`}
            value={form.course}
            onChange={(e) => {
              setForm((f) => ({ ...f, course: e.target.value }));
              clearError("course");
              clearError("payment_offered");
              clearError("payment_offered_type");
            }}
          >
            {COURSE_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {fieldErrors.course && <p className="mt-1 text-sm text-destructive">{fieldErrors.course}</p>}
      </div>

      <div id="field-sales_batch">
        <Label>Sales Batch <span className="text-destructive">*</span></Label>
        {lockCourseBatchOffered ? (
          <Input value={lockedDisplay?.salesBatchName || ""} disabled className="bg-muted" />
        ) : (
          <select
            className={`w-full rounded-md border bg-background px-3 py-2 ${fieldErrors.sales_batch ? "border-destructive" : "border-input"}`}
            value={form.sales_batch}
            onChange={(e) => {
              setForm((f) => ({ ...f, sales_batch: e.target.value }));
              clearError("sales_batch");
            }}
            disabled={salesBatchesLoading || !form.course}
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
        )}
        {salesBatchesError && <p className="mt-1 text-sm text-destructive">{salesBatchesError}</p>}
        {!lockCourseBatchOffered &&
          !salesBatchesLoading &&
          !salesBatchesError &&
          form.course &&
          availableSalesBatches.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              No sales batch with available seats for selected course.
            </p>
          )}
        {selectedSalesBatch && !lockCourseBatchOffered && (
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedSalesBatch.name} ({selectedSalesBatch.total_students ?? 0}/
            {selectedSalesBatch.capacity ?? 0} filled, {selectedSalesBatch.remaining_seats ?? 0} seats left)
          </p>
        )}
        {fieldErrors.sales_batch && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.sales_batch}</p>
        )}
      </div>

      <div id="field-payment_offered_type">
        <Label>
          Payment offered type <span className="text-destructive">*</span>
        </Label>
        {lockCourseBatchOffered || mentorTypeLocked ? (
          <Input
            value={
              lockedDisplay?.paymentOfferedTypeLabel ||
              paymentOfferedTypeLabel(form.payment_offered_type)
            }
            disabled
            className="bg-muted"
          />
        ) : (
          <select
            className={`w-full rounded-md border bg-background px-3 py-2 ${fieldErrors.payment_offered_type ? "border-destructive" : "border-input"}`}
            value={form.payment_offered_type || ""}
            onChange={(e) => {
              const nextType = e.target.value;
              setForm((f) => ({
                ...f,
                payment_offered_type: nextType,
                payment_offered_comment:
                  nextType === "single_payment" ? "" : f.payment_offered_comment,
              }));
              clearError("payment_offered_type");
              clearError("payment_offered_comment");
              clearError("payment_offered");
            }}
          >
            {typeOptions.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {mentorTypeLocked && !lockCourseBatchOffered && (
          <p className="mt-1 text-xs text-muted-foreground">
            Mentor approved can only be changed by a manager.
          </p>
        )}
        {fieldErrors.payment_offered_type && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.payment_offered_type}</p>
        )}
      </div>

      <div id="field-payment_offered">
        <Label>Payment offered (₹) <span className="text-destructive">*</span></Label>
        {lockCourseBatchOffered ? (
          <Input
            value={
              lockedDisplay?.paymentOffered != null
                ? `₹ ${Number(lockedDisplay.paymentOffered).toLocaleString("en-IN")}`
                : form.payment_offered
            }
            disabled
            className="bg-muted"
          />
        ) : (
          <Input
            type="number"
            step="0.01"
            max={100001}
            min={offeredMin ?? 0}
            value={form.payment_offered}
            onChange={(e) => {
              setForm((f) => ({ ...f, payment_offered: e.target.value }));
              clearError("payment_offered");
            }}
            placeholder={
              offeredMin != null
                ? `Min ₹${offeredMin.toLocaleString("en-IN")}`
                : "Quoted amount"
            }
            className={fieldErrors.payment_offered ? "border-destructive" : ""}
          />
        )}
        {!lockCourseBatchOffered && offeredMin != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Minimum for this course and type: ₹{offeredMin.toLocaleString("en-IN")}
          </p>
        )}
        {fieldErrors.payment_offered && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.payment_offered}</p>
        )}
      </div>

      {(lockCourseBatchOffered
        ? Boolean(lockedDisplay?.paymentOfferedComment || form.payment_offered_comment)
        : commentRequired || Boolean(form.payment_offered_comment)) && (
        <div id="field-payment_offered_comment" className="sm:col-span-2">
          <Label>
            Payment offered comment
            {commentRequired && !lockCourseBatchOffered ? (
              <span className="text-destructive"> *</span>
            ) : null}
          </Label>
          {lockCourseBatchOffered ? (
            <Input
              value={lockedDisplay?.paymentOfferedComment || form.payment_offered_comment || ""}
              disabled
              className="bg-muted"
            />
          ) : (
            <textarea
              rows={2}
              value={form.payment_offered_comment || ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, payment_offered_comment: e.target.value }));
                clearError("payment_offered_comment");
              }}
              placeholder="Reason for this payment type"
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${fieldErrors.payment_offered_comment ? "border-destructive" : "border-input"}`}
            />
          )}
          {fieldErrors.payment_offered_comment && (
            <p className="mt-1 text-sm text-destructive">{fieldErrors.payment_offered_comment}</p>
          )}
        </div>
      )}

      <div id="field-guardian_number_1">
        <Label>Guardian 1 number <span className="text-destructive">*</span></Label>
        <Input
          inputMode="numeric"
          maxLength={10}
          value={form.guardian_number_1}
          onChange={(e) => {
            setForm((f) => ({ ...f, guardian_number_1: normalizeMobile(e.target.value) }));
            clearError("guardian_number_1");
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
            clearError("guardian_relation_1");
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
            setForm((f) => ({ ...f, guardian_number_2: normalizeMobile(e.target.value) }));
            clearError("guardian_number_2");
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
            clearError("guardian_relation_2");
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
            clearError("guardian_email");
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
            clearError("college_name");
          }}
          placeholder="College name"
          className={fieldErrors.college_name ? "border-destructive" : ""}
        />
        {fieldErrors.college_name && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.college_name}</p>
        )}
      </div>
      <div id="field-college_branch_name">
        <Label>Branch or department in your college</Label>
        <Input
          value={form.college_branch_name}
          onChange={(e) => {
            setForm((f) => ({ ...f, college_branch_name: e.target.value }));
            clearError("college_branch_name");
          }}
          placeholder="e.g. CSE, ECE, Mechanical"
          className={fieldErrors.college_branch_name ? "border-destructive" : ""}
        />
        {fieldErrors.college_branch_name && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.college_branch_name}</p>
        )}
      </div>
      <div id="field-tpo_name">
        <Label>TPO name <span className="text-destructive">*</span></Label>
        <Input
          value={form.tpo_name}
          onChange={(e) => {
            const v = e.target.value.replace(/[0-9]/g, "");
            setForm((f) => ({ ...f, tpo_name: v }));
            clearError("tpo_name");
          }}
          placeholder="Training & Placement Officer name"
          className={fieldErrors.tpo_name ? "border-destructive" : ""}
        />
        {fieldErrors.tpo_name && <p className="mt-1 text-sm text-destructive">{fieldErrors.tpo_name}</p>}
      </div>
      <div id="field-tpo_number">
        <Label>TPO number <span className="text-destructive">*</span></Label>
        <Input
          inputMode="numeric"
          maxLength={10}
          value={form.tpo_number}
          onChange={(e) => {
            setForm((f) => ({ ...f, tpo_number: normalizeMobile(e.target.value) }));
            clearError("tpo_number");
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
          placeholder="TPO email (optional)"
        />
      </div>
      <div id="field-student_degree">
        <Label>Highest qualification <span className="text-destructive">*</span></Label>
        <Input
          value={form.student_degree}
          onChange={(e) => {
            setForm((f) => ({ ...f, student_degree: e.target.value }));
            clearError("student_degree");
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
            clearError("total_percentage");
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
            clearError("education_status");
          }}
        >
          {EDU_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
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
          min={2010}
          max={2035}
          value={form.year_of_passing}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setForm((f) => ({ ...f, year_of_passing: v }));
            clearError("year_of_passing");
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
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div id="field-reference_details" className="sm:col-span-2">
        <Label>Reference details (how did you find us?) <span className="text-destructive">*</span></Label>
        <textarea
          value={form.reference_details}
          onChange={(e) => {
            setForm((f) => ({ ...f, reference_details: e.target.value }));
            clearError("reference_details");
          }}
          placeholder="e.g. Friend, Instagram"
          rows={3}
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${fieldErrors.reference_details ? "border-destructive" : "border-input"}`}
        />
        {fieldErrors.reference_details && (
          <p className="mt-1 text-sm text-destructive">{fieldErrors.reference_details}</p>
        )}
      </div>
    </div>
  );
}
