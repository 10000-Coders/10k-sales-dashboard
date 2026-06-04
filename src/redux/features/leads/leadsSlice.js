import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";
import { logout } from "@/redux/features/user/userAuth";

const REASSIGN_PAGE_SIZE = 200;
/** Must match backend sales.bulk_lead_utils.MAX_BULK_LEAD_COUNT */
export const MAX_BULK_LEAD_IMPORT = 200;

function getHeadersFromState(state) {
  const user = state?.userAuth?.user;
  const h = {};
  if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
  if (user?.role) h["X-Sales-Person-Role"] = user.role;
  return h;
}

export const bulkCreateLeads = createAsyncThunk(
  "leads/bulkCreateLeads",
  async ({ leads }, { getState, rejectWithValue }) => {
    const state = getState();
    const salesPersonId = state?.userAuth?.user?.id;
    if (!salesPersonId) {
      return rejectWithValue({ detail: "You must be logged in to import leads." });
    }
    if (!Array.isArray(leads) || leads.length === 0) {
      return rejectWithValue({ detail: "No valid leads to import." });
    }
    if (leads.length > MAX_BULK_LEAD_IMPORT) {
      return rejectWithValue({
        detail: `You uploaded ${leads.length} leads. Maximum ${MAX_BULK_LEAD_IMPORT} leads are allowed per import. Please split the file and try again.`,
      });
    }

    try {
      const headers = getHeadersFromState(state);
      const { data } = await axios.post(
        "/leads/bulk_create/",
        { sales_person: salesPersonId, leads },
        { headers }
      );
      return data;
    } catch (err) {
      const payload = err.response?.data;
      return rejectWithValue(
        typeof payload === "object" && payload !== null
          ? payload
          : { detail: err.message || "Bulk import failed." }
      );
    }
  }
);

/** Fetch all leads owned by a counselor (manager reassign UI). */
export const fetchLeadsForReassign = createAsyncThunk(
  "leads/fetchLeadsForReassign",
  async ({ salesPersonId }, { getState, rejectWithValue }) => {
    if (!salesPersonId) {
      return rejectWithValue({ detail: "Select a counselor to load leads." });
    }
    const headers = getHeadersFromState(getState());
    const all = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const params = new URLSearchParams({
          sales_person: String(salesPersonId),
          page: String(page),
          page_size: String(REASSIGN_PAGE_SIZE),
        });
        const { data } = await axios.get(`/leads/?${params.toString()}`, { headers });
        const list = data?.results ?? (Array.isArray(data) ? data : []);
        all.push(...list);
        const totalPages = data?.total_pages ?? 0;
        const pageSize = data?.page_size ?? REASSIGN_PAGE_SIZE;
        const count = data?.count;
        if (totalPages > 0) {
          hasMore = page < totalPages;
        } else if (count != null) {
          hasMore = all.length < count;
        } else {
          hasMore = list.length >= pageSize;
        }
        page += 1;
      }

      return { leads: all, salesPersonId };
    } catch (err) {
      const payload = err.response?.data;
      return rejectWithValue(
        typeof payload === "object" && payload !== null
          ? payload
          : { detail: err.message || "Failed to load leads." }
      );
    }
  }
);

/** Move selected (or all) leads from one counselor to another. */
export const bulkReassignLeads = createAsyncThunk(
  "leads/bulkReassignLeads",
  async ({ fromSalesPerson, toSalesPerson, leadIds }, { getState, rejectWithValue }) => {
    if (!fromSalesPerson || !toSalesPerson) {
      return rejectWithValue({ detail: "Source and target counselors are required." });
    }
    if (String(fromSalesPerson) === String(toSalesPerson)) {
      return rejectWithValue({ detail: "Target counselor must be different from the source." });
    }

    const payload = {
      from_sales_person: Number(fromSalesPerson),
      to_sales_person: Number(toSalesPerson),
    };
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      payload.lead_ids = leadIds.map((id) => Number(id));
    }

    try {
      const headers = getHeadersFromState(getState());
      const { data } = await axios.post("/leads/bulk_reassign/", payload, { headers });
      return data;
    } catch (err) {
      const payload = err.response?.data;
      return rejectWithValue(
        typeof payload === "object" && payload !== null
          ? payload
          : { detail: err.message || "Lead transfer failed." }
      );
    }
  }
);

export const fetchLeadSourceAnalytics = createAsyncThunk(
  "leads/fetchLeadSourceAnalytics",
  async ({ fromDate, toDate, salesPersonId }, { getState, rejectWithValue }) => {
    if (!fromDate || !toDate) {
      return rejectWithValue({ detail: "From date and to date are required." });
    }

    try {
      const headers = getHeadersFromState(getState());
      const params = new URLSearchParams({
        from: String(fromDate),
        to: String(toDate),
      });
      if (salesPersonId) params.set("sales_person", String(salesPersonId));
      const { data } = await axios.get(`/leads/analytics/simple/?${params.toString()}`, { headers });
      return data;
    } catch (err) {
      const payload = err.response?.data;
      return rejectWithValue(
        typeof payload === "object" && payload !== null
          ? payload
          : { detail: err.message || "Failed to load source analytics." }
      );
    }
  }
);

const leadsSlice = createSlice({
  name: "leads",
  initialState: {
    bulkCreateLoading: false,
    bulkCreateError: null,
    bulkCreateResult: null,
    reassignLeads: [],
    reassignLeadsLoading: false,
    reassignLeadsError: null,
    reassignSourcePersonId: null,
    bulkReassignLoading: false,
    bulkReassignError: null,
    bulkReassignResult: null,
    sourceAnalytics: null,
    sourceAnalyticsLoading: false,
    sourceAnalyticsError: null,
  },
  reducers: {
    clearBulkCreateResult: (state) => {
      state.bulkCreateResult = null;
      state.bulkCreateError = null;
    },
    clearReassignState: (state) => {
      state.reassignLeads = [];
      state.reassignLeadsLoading = false;
      state.reassignLeadsError = null;
      state.reassignSourcePersonId = null;
      state.bulkReassignLoading = false;
      state.bulkReassignError = null;
      state.bulkReassignResult = null;
      state.sourceAnalytics = null;
      state.sourceAnalyticsLoading = false;
      state.sourceAnalyticsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bulkCreateLeads.pending, (state) => {
        state.bulkCreateLoading = true;
        state.bulkCreateError = null;
      })
      .addCase(bulkCreateLeads.fulfilled, (state, action) => {
        state.bulkCreateLoading = false;
        state.bulkCreateResult = action.payload;
        state.bulkCreateError = null;
      })
      .addCase(bulkCreateLeads.rejected, (state, action) => {
        state.bulkCreateLoading = false;
        state.bulkCreateError = action.payload;
        state.bulkCreateResult = null;
      })
      .addCase(fetchLeadsForReassign.pending, (state) => {
        state.reassignLeadsLoading = true;
        state.reassignLeadsError = null;
      })
      .addCase(fetchLeadsForReassign.fulfilled, (state, action) => {
        state.reassignLeadsLoading = false;
        state.reassignLeads = action.payload.leads ?? [];
        state.reassignSourcePersonId = action.payload.salesPersonId;
        state.reassignLeadsError = null;
      })
      .addCase(fetchLeadsForReassign.rejected, (state, action) => {
        state.reassignLeadsLoading = false;
        state.reassignLeads = [];
        state.reassignLeadsError = action.payload;
      })
      .addCase(bulkReassignLeads.pending, (state) => {
        state.bulkReassignLoading = true;
        state.bulkReassignError = null;
      })
      .addCase(bulkReassignLeads.fulfilled, (state, action) => {
        state.bulkReassignLoading = false;
        state.bulkReassignResult = action.payload;
        state.bulkReassignError = null;
      })
      .addCase(bulkReassignLeads.rejected, (state, action) => {
        state.bulkReassignLoading = false;
        state.bulkReassignError = action.payload;
        state.bulkReassignResult = null;
      })
      .addCase(fetchLeadSourceAnalytics.pending, (state) => {
        state.sourceAnalyticsLoading = true;
        state.sourceAnalyticsError = null;
      })
      .addCase(fetchLeadSourceAnalytics.fulfilled, (state, action) => {
        state.sourceAnalyticsLoading = false;
        state.sourceAnalytics = action.payload;
        state.sourceAnalyticsError = null;
      })
      .addCase(fetchLeadSourceAnalytics.rejected, (state, action) => {
        state.sourceAnalyticsLoading = false;
        state.sourceAnalyticsError = action.payload;
        state.sourceAnalytics = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.bulkCreateLoading = false;
        state.bulkCreateError = null;
        state.bulkCreateResult = null;
        state.reassignLeads = [];
        state.reassignLeadsLoading = false;
        state.reassignLeadsError = null;
        state.reassignSourcePersonId = null;
        state.bulkReassignLoading = false;
        state.bulkReassignError = null;
        state.bulkReassignResult = null;
        state.sourceAnalytics = null;
        state.sourceAnalyticsLoading = false;
        state.sourceAnalyticsError = null;
      });
  },
});

export const { clearBulkCreateResult, clearReassignState } = leadsSlice.actions;
export default leadsSlice.reducer;

export const selectLeadsBulkCreateLoading = (state) => state.leads?.bulkCreateLoading ?? false;
export const selectLeadsBulkCreateError = (state) => state.leads?.bulkCreateError ?? null;
export const selectLeadsBulkCreateResult = (state) => state.leads?.bulkCreateResult ?? null;

export const selectReassignLeads = (state) => state.leads?.reassignLeads ?? [];
export const selectReassignLeadsLoading = (state) => state.leads?.reassignLeadsLoading ?? false;
export const selectReassignLeadsError = (state) => state.leads?.reassignLeadsError ?? null;
export const selectBulkReassignLoading = (state) => state.leads?.bulkReassignLoading ?? false;
export const selectLeadSourceAnalytics = (state) => state.leads?.sourceAnalytics ?? null;
export const selectLeadSourceAnalyticsLoading = (state) => state.leads?.sourceAnalyticsLoading ?? false;
export const selectLeadSourceAnalyticsError = (state) => state.leads?.sourceAnalyticsError ?? null;
