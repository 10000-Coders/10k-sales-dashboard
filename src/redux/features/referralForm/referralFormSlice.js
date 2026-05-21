import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";
import { getAllStudents } from '@/utils/referrialApis';

export const REFERRAL_FORM_STATUS = {
  IDLE: "idle",
  SUBMITTING: "submitting",
  SUCCESS: "success",
  ERROR: "error",
};

export const INITIAL_REFERRAL_FORM = {
  referred_name: "",
  referred_email: "",
  referred_mobile: "",
  referred_college: "",
  referred_year_of_passing: "",
  referred_branch: "",
  referred_qualification: "",
  referred_state: "",
  referred_address: "",
  referred_present_status: "",
  referred_interested_in: "",
};

const NAME_REGEX = /^[a-zA-Z\s._,:-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_DIGITS_REGEX = /^[0-9]{10}$/;
const YEAR_MIN = 1990;
const YEAR_MAX = 2030;

function trim(v) {
  return typeof v === "string" ? v.trim() : v;
}

function digitsOnly(val) {
  return String(val ?? "").replace(/\D/g, "").slice(0, 10);
}

/**
 * Client-side validation for referral form. Returns object of field name -> error message.
 * Aligns with backend ReferralCreateSerializer and model max lengths.
 */
export function validateReferralForm(form) {
  const errors = {};
  const name = trim(form.referred_name);
  if (!name) {
    errors.referred_name = "Name is required.";
  } else if (name.length < 2) {
    errors.referred_name = "Name must be at least 2 characters.";
  } else if (name.length > 250) {
    errors.referred_name = "Name must be 250 characters or less.";
  } else if (!NAME_REGEX.test(name)) {
    errors.referred_name = "Name should contain only letters, spaces, and . , _ : -";
  }

  const email = trim(form.referred_email).toLowerCase();
  if (!email) {
    errors.referred_email = "Email is required.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.referred_email = "Enter a valid email address.";
  } else if (email.length > 254) {
    errors.referred_email = "Email is too long.";
  }

  const mobileRaw = trim(form.referred_mobile);
  const mobileDigits = digitsOnly(mobileRaw);
  if (!mobileRaw) {
    errors.referred_mobile = "Mobile number is required.";
  } else if (mobileDigits.length !== 10) {
    errors.referred_mobile = "Mobile must be exactly 10 digits.";
  } else if (!MOBILE_DIGITS_REGEX.test(mobileDigits)) {
    errors.referred_mobile = "Please enter a valid 10-digit mobile number.";
  }

  const college = trim(form.referred_college);
  if (!college) {
    errors.referred_college = "College / institution is required.";
  } else if (college.length < 2) {
    errors.referred_college = "College / institution must be at least 2 characters.";
  } else if (college.length > 255) {
    errors.referred_college = "College name must be 255 characters or less.";
  }

  const yearVal = form.referred_year_of_passing;
  if (yearVal === "" || yearVal == null) {
    errors.referred_year_of_passing = "Year of passing is required.";
  } else {
    const y = Number(yearVal);
    if (!Number.isInteger(y) || Number.isNaN(y)) {
      errors.referred_year_of_passing = "Year must be a whole number (e.g. 2024).";
    } else if (y < YEAR_MIN || y > YEAR_MAX) {
      errors.referred_year_of_passing = `Year must be between ${YEAR_MIN} and ${YEAR_MAX}.`;
    }
  }

  const branch = trim(form.referred_branch);
  if (!branch) {
    errors.referred_branch = "Branch is required.";
  } else if (branch.length > 100) {
    errors.referred_branch = "Branch must be 100 characters or less.";
  }

  const qualification = trim(form.referred_qualification);
  if (!qualification) {
    errors.referred_qualification = "Qualification is required.";
  } else if (qualification.length > 250) {
    errors.referred_qualification = "Qualification must be 250 characters or less.";
  }

  const state = trim(form.referred_state);
  if (!state) {
    errors.referred_state = "State is required.";
  } else if (state.length > 100) {
    errors.referred_state = "State must be 100 characters or less.";
  }

  const address = trim(form.referred_address);
  if (!address) {
    errors.referred_address = "Address is required.";
  } else if (address.length < 10) {
    errors.referred_address = "Please enter a complete address (at least 10 characters).";
  } else if (address.length > 2000) {
    errors.referred_address = "Address must be 2000 characters or less.";
  }

  const presentStatus = trim(form.referred_present_status);
  if (!presentStatus) {
    errors.referred_present_status = "Present status is required.";
  } else if (presentStatus.length > 50) {
    errors.referred_present_status = "Present status must be 50 characters or less.";
  }

  const interestedIn = trim(form.referred_interested_in);
  if (!interestedIn) {
    errors.referred_interested_in = "Interested in (course / domain) is required.";
  } else if (interestedIn.length > 200) {
    errors.referred_interested_in = "Interested in must be 200 characters or less.";
  }

  return errors;
}

/** Validation for sales-dashboard student referral modal (subset of fields). */
export function validateSalesReferralForm(form) {
  const full = validateReferralForm({
    ...INITIAL_REFERRAL_FORM,
    referred_state: "Not specified",
    referred_address: "Not specified via sales dashboard",
    referred_present_status: "Not specified",
    ...form,
  });

  const keys = [
    "referred_name",
    "referred_email",
    "referred_mobile",
    "referred_college",
    "referred_year_of_passing",
    "referred_branch",
    "referred_qualification",
    "referred_interested_in",
  ];

  const errors = {};
  for (const key of keys) {
    if (full[key]) errors[key] = full[key];
  }
  return errors;
}

function normalizePayload(form) {
  const trim = (v) => (typeof v === "string" ? v.trim() : v);
  return {
    referred_name: trim(form.referred_name),
    referred_email: trim(form.referred_email).toLowerCase(),
    referred_mobile:
      trim(form.referred_mobile).replace(/\D/g, "").slice(-10) || trim(form.referred_mobile),
    referred_college: trim(form.referred_college) || "",
    referred_year_of_passing: form.referred_year_of_passing
      ? Number(form.referred_year_of_passing)
      : null,
    referred_branch: trim(form.referred_branch) || "",
    referred_qualification: trim(form.referred_qualification) || "",
    referred_state: trim(form.referred_state) || "",
    referred_address: trim(form.referred_address) || "",
    referred_present_status: trim(form.referred_present_status) || "",
    referred_interested_in: trim(form.referred_interested_in) || "",
  };
}

function parseValidationErrors(data) {
  if (!data || typeof data !== "object") return {};
  const out = {};
  for (const [key, val] of Object.entries(data)) {
    const msg = Array.isArray(val) ? val[0] : val;
    out[key] = typeof msg === "string" ? msg : String(msg);
  }
  return out;
}

export const submitReferral = createAsyncThunk(
  "referralForm/submit",
  async ({ refId, form }, { rejectWithValue }) => {
    const ref = Number(refId);
    if (!refId || Number.isNaN(ref)) {
      return rejectWithValue({
        message: "Invalid referral link. Please use the link shared by your friend.",
        fieldErrors: {},
      });
    }

    const fieldErrors = validateReferralForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      return rejectWithValue({
        message: "Please fix the errors below.",
        fieldErrors,
      });
    }

    const payload = { referrer: ref, ...normalizePayload(form) };

    try {
      const { data } = await axios.post("/referrals/", payload);
      return data;
    } catch (err) {
      const res = err.response;
      const data = res?.data;

      if (res?.status === 400 && data) {
        const fieldErrors = parseValidationErrors(data);
        const message =
          data.detail ||
          (typeof data === "object" && Object.keys(fieldErrors).length > 0
            ? "Please fix the errors below."
            : "Invalid request.");
        return rejectWithValue({ message, fieldErrors });
      }

      const message =
        data?.detail ?? data?.message ?? "Something went wrong. Please try again.";
      return rejectWithValue({ message, fieldErrors: {} });
    }
  }
);
export const getAllStudentsFromBackend = createAsyncThunk(
  'batch/getAllStudentsFromBackend',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await getAllStudents(params);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || {
          message: error?.message || 'Failed to fetch students',
        }
      );
    }
  }
);

function getInitialState() {
  return {
    form: { ...INITIAL_REFERRAL_FORM },
    status: REFERRAL_FORM_STATUS.IDLE,
    error: null,
    fieldErrors: {},
    all_students_backend: [],
    all_students_backend_count: 0,
    all_students_backend_total_pages: 1,
    all_students_backend_current_page: 1,
    all_students_backend_page_size: 25,
    all_students_backend_loading: false,
    all_students_backend_error: null,

    filter_options_backend: {
      available_branches: [],
      available_batches: [],
      available_colleges: [],
    },
  };
}


const referralFormSlice = createSlice({
  name: "referralForm",
  initialState: getInitialState(),
  reducers: {
    setField: (state, { payload: { name, value } }) => {
      if (name in state.form) {
        state.form[name] = value;
        delete state.fieldErrors[name];
        state.error = null;
      }
    },
    resetReferralForm: (state) => {
      state.form = { ...INITIAL_REFERRAL_FORM };
      state.status = REFERRAL_FORM_STATUS.IDLE;
      state.error = null;
      state.fieldErrors = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitReferral.pending, (state) => {
        state.status = REFERRAL_FORM_STATUS.SUBMITTING;
        state.error = null;
        state.fieldErrors = {};
      })
      .addCase(submitReferral.fulfilled, (state) => {
        state.status = REFERRAL_FORM_STATUS.SUCCESS;
        state.error = null;
        state.fieldErrors = {};
        state.form = { ...INITIAL_REFERRAL_FORM };
      })
      .addCase(submitReferral.rejected, (state, action) => {
        const payload = action.payload ?? {};
        state.status = REFERRAL_FORM_STATUS.ERROR;
        state.error = payload.message ?? action.error?.message ?? "Request failed.";
        state.fieldErrors = payload.fieldErrors ?? {};
      })
      .addCase(getAllStudentsFromBackend.pending, (state) => {
        state.all_students_backend_loading = true;
        state.all_students_backend_error = null;
      })

      .addCase(getAllStudentsFromBackend.fulfilled, (state, action) => {
        state.all_students_backend_loading = false;
        state.all_students_backend_error = null;

        const payload = action.payload || {};
        const data = payload.data || payload;
        const filters = payload.filters || data.filters || {};

        state.all_students_backend = data.results || [];
        state.all_students_backend_count = data.count || 0;

        state.all_students_backend_page_size =
          data.page_size || data.pageSize || 25;

        state.all_students_backend_current_page =
          data.current_page || data.page || 1;

        state.all_students_backend_total_pages =
          data.total_pages ||
          Math.ceil(
            (data.count || 0) / (data.page_size || data.pageSize || 25)
          ) ||
          1;

        state.filter_options_backend = {
          available_branches: filters.available_branches || [],
          available_batches: filters.available_batches || [],
          available_colleges: filters.available_colleges || [],
        };
      })

      .addCase(getAllStudentsFromBackend.rejected, (state, action) => {
        state.all_students_backend_loading = false;
        state.all_students_backend = [];
        state.all_students_backend_count = 0;
        state.all_students_backend_total_pages = 1;
        state.all_students_backend_current_page = 1;

        const payload = action.payload;
        let errorMessage = 'Failed to fetch students';
        if (typeof payload === 'string') {
          errorMessage = payload;
        } else if (payload && typeof payload === 'object') {
          errorMessage =
            payload.message ||
            payload.detail ||
            (Array.isArray(payload.non_field_errors)
              ? payload.non_field_errors[0]
              : null) ||
            errorMessage;
        } else if (action.error?.message) {
          errorMessage = action.error.message;
        }

        state.all_students_backend_error = errorMessage;
      });
  },
});

export const { setField, resetReferralForm } = referralFormSlice.actions;

export const selectReferralForm = (state) => state.referralForm?.form ?? INITIAL_REFERRAL_FORM;
export const selectReferralFormStatus = (state) =>
  state.referralForm?.status ?? REFERRAL_FORM_STATUS.IDLE;
export const selectReferralFormError = (state) => state.referralForm?.error ?? null;
export const selectReferralFormFieldErrors = (state) =>
  state.referralForm?.fieldErrors ?? {};
export const selectIsSubmitting = (state) =>
  state.referralForm?.status === REFERRAL_FORM_STATUS.SUBMITTING;
export const selectIsSuccess = (state) =>
  state.referralForm?.status === REFERRAL_FORM_STATUS.SUCCESS;

export const selectAllStudentsFromBackend = (state) =>
  state.referralForm?.all_students_backend ?? [];

export const selectAllStudentsFromBackendCount = (state) =>
  state.referralForm?.all_students_backend_count ?? 0;

export const selectAllStudentsFromBackendTotalPages = (state) =>
  state.referralForm?.all_students_backend_total_pages ?? 1;

export const selectAllStudentsFromBackendCurrentPage = (state) =>
  state.referralForm?.all_students_backend_current_page ?? 1;

export const selectAllStudentsFromBackendPageSize = (state) =>
  state.referralForm?.all_students_backend_page_size ?? 25;

export const selectGetAllStudentsFromBackendLoading = (state) =>
  state.referralForm?.all_students_backend_loading ?? false;

export const selectGetAllStudentsFromBackendError = (state) =>
  state.referralForm?.all_students_backend_error ?? null;

export const selectFilterOptionsBackend = (state) =>
  state.referralForm?.filter_options_backend ?? {
    available_branches: [],
    available_batches: [],
    available_colleges: [],
  };
export default referralFormSlice.reducer;
