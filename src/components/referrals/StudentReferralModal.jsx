'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import {
  INITIAL_REFERRAL_FORM,
  REFERRAL_FORM_STATUS,
  resetReferralForm,
  submitReferral,
  validateSalesReferralForm,
} from '@/redux/features/referralForm/referralFormSlice';

const SALES_REFERRAL_DEFAULTS = {
  referred_state: 'Not specified',
  referred_address: 'Not specified via sales dashboard',
  referred_present_status: 'Not specified',
};

const EMPTY_MODAL_FORM = {
  referred_name: '',
  referred_email: '',
  referred_mobile: '',
  referred_college: '',
  referred_year_of_passing: '',
  referred_branch: '',
  referred_qualification: '',
  referred_interested_in: '',
};

const inputClass = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-400 focus:ring-red-200'
      : 'border-gray-300 focus:ring-blue-500/40 focus:border-blue-500'
  }`;

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function StudentReferralModal({ open, referrer, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY_MODAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  const status = useSelector((state) => state.referralForm?.status);
  const submitError = useSelector((state) => state.referralForm?.error);
  const isSubmitting = status === REFERRAL_FORM_STATUS.SUBMITTING;

  const resetModal = useCallback(() => {
    setForm(EMPTY_MODAL_FORM);
    setFieldErrors({});
    dispatch(resetReferralForm());
  }, [dispatch]);

  useEffect(() => {
    if (!open) return;
    resetModal();
  }, [open, referrer?.id, resetModal]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetModal();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateSalesReferralForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const fullForm = {
      ...INITIAL_REFERRAL_FORM,
      ...SALES_REFERRAL_DEFAULTS,
      ...form,
    };

    const result = await dispatch(
      submitReferral({ refId: String(referrer.id), form: fullForm })
    );

    if (submitReferral.fulfilled.match(result)) {
      toast.success('Referral submitted successfully.');
      handleClose();
      return;
    }

    const payload = result.payload;
    if (payload?.fieldErrors && Object.keys(payload.fieldErrors).length > 0) {
      setFieldErrors(payload.fieldErrors);
    }
    toast.error(payload?.message || 'Could not submit referral. Please try again.');
  };

  if (!open || !referrer?.id) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-referral-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2
              id="student-referral-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Add referral
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Referred by{' '}
              <span className="font-medium text-gray-700">
                {referrer.student_name || 'Student'}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Full name"
                required
                error={fieldErrors.referred_name}
              >
                <input
                  type="text"
                  value={form.referred_name}
                  onChange={(e) => handleChange('referred_name', e.target.value)}
                  className={inputClass(fieldErrors.referred_name)}
                  placeholder="Referred student name"
                  maxLength={250}
                  autoComplete="name"
                />
              </Field>
            </div>

            <Field label="Email" required error={fieldErrors.referred_email}>
              <input
                type="email"
                value={form.referred_email}
                onChange={(e) => handleChange('referred_email', e.target.value)}
                className={inputClass(fieldErrors.referred_email)}
                placeholder="email@example.com"
                maxLength={254}
                autoComplete="email"
              />
            </Field>

            <Field label="Phone number" required error={fieldErrors.referred_mobile}>
              <input
                type="tel"
                inputMode="numeric"
                value={form.referred_mobile}
                onChange={(e) =>
                  handleChange(
                    'referred_mobile',
                    e.target.value.replace(/\D/g, '').slice(0, 10)
                  )
                }
                className={inputClass(fieldErrors.referred_mobile)}
                placeholder="10-digit mobile"
                maxLength={10}
                autoComplete="tel"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="College / institution"
                required
                error={fieldErrors.referred_college}
              >
                <input
                  type="text"
                  value={form.referred_college}
                  onChange={(e) => handleChange('referred_college', e.target.value)}
                  className={inputClass(fieldErrors.referred_college)}
                  placeholder="College or institution name"
                  maxLength={255}
                />
              </Field>
            </div>

            <Field
              label="Year of passing"
              required
              error={fieldErrors.referred_year_of_passing}
            >
              <input
                type="number"
                value={form.referred_year_of_passing}
                onChange={(e) =>
                  handleChange('referred_year_of_passing', e.target.value)
                }
                className={inputClass(fieldErrors.referred_year_of_passing)}
                placeholder="e.g. 2025"
                min={1990}
                max={2030}
              />
            </Field>

            <Field label="Branch" required error={fieldErrors.referred_branch}>
              <input
                type="text"
                value={form.referred_branch}
                onChange={(e) => handleChange('referred_branch', e.target.value)}
                className={inputClass(fieldErrors.referred_branch)}
                placeholder="e.g. CSE, ECE"
                maxLength={100}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Qualification"
                required
                error={fieldErrors.referred_qualification}
              >
                <input
                  type="text"
                  value={form.referred_qualification}
                  onChange={(e) =>
                    handleChange('referred_qualification', e.target.value)
                  }
                  className={inputClass(fieldErrors.referred_qualification)}
                  placeholder="e.g. B.Tech, Degree"
                  maxLength={250}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field
                label="Interested in (domain / course)"
                required
                error={fieldErrors.referred_interested_in}
              >
                <input
                  type="text"
                  value={form.referred_interested_in}
                  onChange={(e) =>
                    handleChange('referred_interested_in', e.target.value)
                  }
                  className={inputClass(fieldErrors.referred_interested_in)}
                  placeholder="e.g. Full Stack, Python, MERN"
                  maxLength={200}
                />
              </Field>
            </div>
          </div>

          {submitError && Object.keys(fieldErrors).length === 0 && (
            <p className="mt-3 text-sm text-red-600">{submitError}</p>
          )}
        </form>

        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit referral'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
