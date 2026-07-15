import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";

export const DEMO_STUDENTS_PAGE_SIZE = 30;

function getHeadersFromState(state) {
  const user = state?.userAuth?.user;
  const h = {};
  if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
  if (user?.role) h["X-Sales-Person-Role"] = user.role;
  return h;
}

function rejectPayload(err, fallback) {
  const payload = err.response?.data;
  return typeof payload === "object" && payload !== null
    ? payload
    : { detail: err.message || fallback };
}

function appendDemoStudentFilters(params, filters = {}) {
  const {
    search = "",
    paymentStatus = "",
    studentStatus = "",
    salesPerson = "",
    demoTrainer = "",
    fromDate = "",
    toDate = "",
  } = filters;

  if (search) params.set("search", search);
  if (paymentStatus !== "" && paymentStatus != null) params.set("payment_status", String(paymentStatus));
  if (studentStatus) params.set("student_status", studentStatus);
  if (salesPerson) params.set("sales_person_name", String(salesPerson));
  if (demoTrainer) params.set("demo_trainer", String(demoTrainer));
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
}

/** Paginated list — same filters as stats. */
export const fetchDemoStudents = createAsyncThunk(
  "demoStudents/fetchDemoStudents",
  async ({ page = 1, pageSize = DEMO_STUDENTS_PAGE_SIZE, filters = {} } = {}, { getState, rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      appendDemoStudentFilters(params, filters);
      const { data } = await axios.get(`/demo-students/?${params}`, {
        headers: getHeadersFromState(getState()),
      });
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load demo students."));
    }
  }
);

/** Stats aggregate — same filters as list. */
export const fetchDemoStudentStats = createAsyncThunk(
  "demoStudents/fetchDemoStudentStats",
  async ({ filters = {} } = {}, { getState, rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      appendDemoStudentFilters(params, filters);
      const qs = params.toString();
      const { data } = await axios.get(`/demo-students/stats/${qs ? `?${qs}` : ""}`, {
        headers: getHeadersFromState(getState()),
      });
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load demo student stats."));
    }
  }
);

/** Single student with full feedback history (for feedback modal). */
export const fetchDemoStudentDetail = createAsyncThunk(
  "demoStudents/fetchDemoStudentDetail",
  async (id, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get(`/demo-students/${id}/`, {
        headers: getHeadersFromState(getState()),
      });
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load student feedback."));
    }
  }
);

/** PATCH only student_status on a demo student. */
export const updateDemoStudentStatus = createAsyncThunk(
  "demoStudents/updateDemoStudentStatus",
  async ({ id, student_status }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.patch(
        `/demo-students/${id}/`,
        { student_status },
        { headers: getHeadersFromState(getState()) }
      );
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to update student status."));
    }
  }
);

/** Public form submit (no auth headers). */
export const submitDemoStudentForm = createAsyncThunk(
  "demoStudents/submitDemoStudentForm",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post("/demo-students/", payload);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to submit demo form."));
    }
  }
);

/** Manager/super_admin transfer. */
export const bulkReassignDemoStudents = createAsyncThunk(
  "demoStudents/bulkReassignDemoStudents",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post("/demo-students/bulk_reassign/", payload, {
        headers: getHeadersFromState(getState()),
      });
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to reassign demo students."));
    }
  }
);

/** Current global QR (or null). */
export const fetchDemoClassQr = createAsyncThunk(
  "demoStudents/fetchDemoClassQr",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get("/demo-class-qr/");
      return data?.qr ?? null;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load QR."));
    }
  }
);

/**
 * Create / regenerate global QR.
 * @param {{ expires_in_days?: number|null }} payload — omit/null = permanent
 */
export const generateDemoClassQr = createAsyncThunk(
  "demoStudents/generateDemoClassQr",
  async (payload = {}, { getState, rejectWithValue }) => {
    try {
      const body = {};
      if (payload.expires_in_days != null) body.expires_in_days = payload.expires_in_days;
      const { data } = await axios.post("/demo-class-qr/", body, {
        headers: getHeadersFromState(getState()),
      });
      return data?.qr ?? null;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to generate QR."));
    }
  }
);

/** Expire current active QR. */
export const expireDemoClassQr = createAsyncThunk(
  "demoStudents/expireDemoClassQr",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.post("/demo-class-qr/expire/", {});
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to expire QR."));
    }
  }
);

/** Public validate token before showing form. */
export const validateDemoClassQr = createAsyncThunk(
  "demoStudents/validateDemoClassQr",
  async (token, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`/demo-class-qr/${encodeURIComponent(token)}/`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Invalid or expired QR link."));
    }
  }
);

/** Active trainers for public form dropdown. */
export const fetchDemoTrainersDropdown = createAsyncThunk(
  "demoStudents/fetchDemoTrainersDropdown",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get("/demo-trainers/dropdown/");
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load trainers."));
    }
  }
);

/** Active sales persons for public demo form dropdown (id + name only). */
export const fetchSalesPersonsDropdown = createAsyncThunk(
  "demoStudents/fetchSalesPersonsDropdown",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get("/persons/dropdown/");
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load sales persons."));
    }
  }
);

/** Full trainer list (manager/super_admin manage page). */
export const fetchDemoTrainers = createAsyncThunk(
  "demoStudents/fetchDemoTrainers",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.get("/demo-trainers/", {
        headers: getHeadersFromState(getState()),
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load demo trainers."));
    }
  }
);

export const createDemoTrainer = createAsyncThunk(
  "demoStudents/createDemoTrainer",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.post("/demo-trainers/", payload, {
        headers: getHeadersFromState(getState()),
      });
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to create demo trainer."));
    }
  }
);

export const updateDemoTrainer = createAsyncThunk(
  "demoStudents/updateDemoTrainer",
  async ({ id, ...payload }, { getState, rejectWithValue }) => {
    try {
      const { data } = await axios.put(`/demo-trainers/${id}/`, payload, {
        headers: getHeadersFromState(getState()),
      });
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to update demo trainer."));
    }
  }
);

const initialState = {
  list: [],
  listMeta: { count: 0, page: 1, page_size: DEMO_STUDENTS_PAGE_SIZE, total_pages: 0 },
  listLoading: false,
  listError: null,

  stats: null,
  statsLoading: false,
  statsError: null,

  submitLoading: false,
  submitError: null,
  submitSuccess: null,

  reassignLoading: false,
  reassignError: null,
  reassignResult: null,

  qr: null,
  qrLoading: false,
  qrError: null,

  qrValidate: null,
  qrValidateLoading: false,
  qrValidateError: null,

  trainers: [],
  trainersLoading: false,

  salesPersons: [],
  salesPersonsLoading: false,

  trainersList: [],
  trainersListLoading: false,
  trainersListError: null,
  trainerSaveLoading: false,
  trainerSaveError: null,

  detail: null,
  detailLoading: false,
  detailError: null,

  statusUpdateLoading: false,
  statusUpdateError: null,
};

const demoStudentsSlice = createSlice({
  name: "demoStudents",
  initialState,
  reducers: {
    clearDemoStudentSubmit(state) {
      state.submitError = null;
      state.submitSuccess = null;
    },
    clearDemoStudentReassign(state) {
      state.reassignError = null;
      state.reassignResult = null;
    },
    clearDemoStudentErrors(state) {
      state.listError = null;
      state.statsError = null;
      state.qrError = null;
      state.qrValidateError = null;
    },
    clearDemoTrainerSaveError(state) {
      state.trainerSaveError = null;
    },
    clearDemoStudentDetail(state) {
      state.detail = null;
      state.detailError = null;
      state.detailLoading = false;
      state.statusUpdateError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDemoStudents.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
      })
      .addCase(fetchDemoStudents.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = Array.isArray(action.payload?.results) ? action.payload.results : [];
        state.listMeta = {
          count: action.payload?.count ?? 0,
          page: action.payload?.page ?? 1,
          page_size: action.payload?.page_size ?? DEMO_STUDENTS_PAGE_SIZE,
          total_pages: action.payload?.total_pages ?? 0,
        };
      })
      .addCase(fetchDemoStudents.rejected, (state, action) => {
        state.listLoading = false;
        state.list = [];
        state.listError = action.payload?.detail || "Failed to load demo students.";
      })

      .addCase(fetchDemoStudentStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchDemoStudentStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDemoStudentStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.stats = null;
        state.statsError = action.payload?.detail || "Failed to load stats.";
      })

      .addCase(fetchDemoStudentDetail.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
        state.statusUpdateError = null;
      })
      .addCase(fetchDemoStudentDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detail = action.payload;
      })
      .addCase(fetchDemoStudentDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.detail = null;
        state.detailError = action.payload?.detail || "Failed to load student feedback.";
      })

      .addCase(updateDemoStudentStatus.pending, (state) => {
        state.statusUpdateLoading = true;
        state.statusUpdateError = null;
      })
      .addCase(updateDemoStudentStatus.fulfilled, (state, action) => {
        state.statusUpdateLoading = false;
        const updated = action.payload;
        if (state.detail?.id === updated?.id) {
          state.detail = { ...state.detail, ...updated };
        }
        state.list = state.list.map((row) =>
          row.id === updated?.id ? { ...row, ...updated } : row
        );
      })
      .addCase(updateDemoStudentStatus.rejected, (state, action) => {
        state.statusUpdateLoading = false;
        state.statusUpdateError =
          action.payload?.detail ||
          action.payload?.student_status?.[0] ||
          action.payload ||
          "Failed to update student status.";
      })

      .addCase(submitDemoStudentForm.pending, (state) => {
        state.submitLoading = true;
        state.submitError = null;
        state.submitSuccess = null;
      })
      .addCase(submitDemoStudentForm.fulfilled, (state, action) => {
        state.submitLoading = false;
        state.submitSuccess = action.payload;
      })
      .addCase(submitDemoStudentForm.rejected, (state, action) => {
        state.submitLoading = false;
        state.submitError = action.payload?.detail || action.payload || "Submit failed.";
      })

      .addCase(bulkReassignDemoStudents.pending, (state) => {
        state.reassignLoading = true;
        state.reassignError = null;
        state.reassignResult = null;
      })
      .addCase(bulkReassignDemoStudents.fulfilled, (state, action) => {
        state.reassignLoading = false;
        state.reassignResult = action.payload;
      })
      .addCase(bulkReassignDemoStudents.rejected, (state, action) => {
        state.reassignLoading = false;
        state.reassignError = action.payload?.detail || "Reassign failed.";
      })

      .addCase(fetchDemoClassQr.pending, (state) => {
        state.qrLoading = true;
        state.qrError = null;
      })
      .addCase(fetchDemoClassQr.fulfilled, (state, action) => {
        state.qrLoading = false;
        state.qr = action.payload;
      })
      .addCase(fetchDemoClassQr.rejected, (state, action) => {
        state.qrLoading = false;
        state.qrError = action.payload?.detail || "Failed to load QR.";
      })

      .addCase(generateDemoClassQr.pending, (state) => {
        state.qrLoading = true;
        state.qrError = null;
      })
      .addCase(generateDemoClassQr.fulfilled, (state, action) => {
        state.qrLoading = false;
        state.qr = action.payload;
      })
      .addCase(generateDemoClassQr.rejected, (state, action) => {
        state.qrLoading = false;
        state.qrError = action.payload?.detail || "Failed to generate QR.";
      })

      .addCase(expireDemoClassQr.fulfilled, (state) => {
        state.qr = null;
      })

      .addCase(validateDemoClassQr.pending, (state) => {
        state.qrValidateLoading = true;
        state.qrValidateError = null;
        state.qrValidate = null;
      })
      .addCase(validateDemoClassQr.fulfilled, (state, action) => {
        state.qrValidateLoading = false;
        state.qrValidate = action.payload;
      })
      .addCase(validateDemoClassQr.rejected, (state, action) => {
        state.qrValidateLoading = false;
        state.qrValidate = null;
        state.qrValidateError = action.payload?.detail || "Invalid or expired QR.";
      })

      .addCase(fetchDemoTrainersDropdown.pending, (state) => {
        state.trainersLoading = true;
      })
      .addCase(fetchDemoTrainersDropdown.fulfilled, (state, action) => {
        state.trainersLoading = false;
        state.trainers = action.payload;
      })
      .addCase(fetchDemoTrainersDropdown.rejected, (state) => {
        state.trainersLoading = false;
        state.trainers = [];
      })

      .addCase(fetchSalesPersonsDropdown.pending, (state) => {
        state.salesPersonsLoading = true;
      })
      .addCase(fetchSalesPersonsDropdown.fulfilled, (state, action) => {
        state.salesPersonsLoading = false;
        state.salesPersons = action.payload;
      })
      .addCase(fetchSalesPersonsDropdown.rejected, (state) => {
        state.salesPersonsLoading = false;
        state.salesPersons = [];
      })

      .addCase(fetchDemoTrainers.pending, (state) => {
        state.trainersListLoading = true;
        state.trainersListError = null;
      })
      .addCase(fetchDemoTrainers.fulfilled, (state, action) => {
        state.trainersListLoading = false;
        state.trainersList = action.payload;
      })
      .addCase(fetchDemoTrainers.rejected, (state, action) => {
        state.trainersListLoading = false;
        state.trainersList = [];
        state.trainersListError = action.payload?.detail || "Failed to load demo trainers.";
      })

      .addCase(createDemoTrainer.pending, (state) => {
        state.trainerSaveLoading = true;
        state.trainerSaveError = null;
      })
      .addCase(createDemoTrainer.fulfilled, (state, action) => {
        state.trainerSaveLoading = false;
        state.trainersList = [
          action.payload,
          ...state.trainersList.filter((t) => t.id !== action.payload.id),
        ];
      })
      .addCase(createDemoTrainer.rejected, (state, action) => {
        state.trainerSaveLoading = false;
        state.trainerSaveError = action.payload;
      })

      .addCase(updateDemoTrainer.pending, (state) => {
        state.trainerSaveLoading = true;
        state.trainerSaveError = null;
      })
      .addCase(updateDemoTrainer.fulfilled, (state, action) => {
        state.trainerSaveLoading = false;
        state.trainersList = state.trainersList.map((t) =>
          t.id === action.payload.id ? action.payload : t
        );
      })
      .addCase(updateDemoTrainer.rejected, (state, action) => {
        state.trainerSaveLoading = false;
        state.trainerSaveError = action.payload;
      });
  },
});

export const {
  clearDemoStudentSubmit,
  clearDemoStudentReassign,
  clearDemoStudentErrors,
  clearDemoTrainerSaveError,
  clearDemoStudentDetail,
} = demoStudentsSlice.actions;

export default demoStudentsSlice.reducer;
