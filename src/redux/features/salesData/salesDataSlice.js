import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";
import { logout } from "@/redux/features/user/userAuth";

/** Cache TTL in ms - avoid refetching persons/batches on every navigation */
const PERSONS_CACHE_MS = 5 * 60 * 1000; // 5 minutes
const BATCHES_CACHE_MS = 5 * 60 * 1000; // 5 minutes

function getHeadersFromState(state) {
  const user = state?.userAuth?.user;
  const h = {};
  if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
  if (user?.role) h["X-Sales-Person-Role"] = user.role;
  return h;
}

export const fetchSalesPersons = createAsyncThunk(
  "salesData/fetchSalesPersons",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const headers = getHeadersFromState(state);
      const { data } = await axios.get("/persons/", { headers });
      return data?.results ?? (Array.isArray(data) ? data : []);
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load sales persons.");
    }
  }
);

export const fetchSalesBatches = createAsyncThunk(
  "salesData/fetchSalesBatches",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const headers = getHeadersFromState(state);
      const { data } = await axios.get("/sales-batches/", { headers });
      return data?.results ?? (Array.isArray(data) ? data : []);
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load sales batches.");
    }
  }
);

const salesDataSlice = createSlice({
  name: "salesData",
  initialState: {
    persons: [],
    personsFetchedAt: null,
    personsError: null,
    personsLoading: false,
    salesBatches: [],
    salesBatchesFetchedAt: null,
    salesBatchesError: null,
    salesBatchesLoading: false,
  },
  reducers: {
    invalidatePersons: (state) => {
      state.personsFetchedAt = null;
    },
    invalidateSalesBatches: (state) => {
      state.salesBatchesFetchedAt = null;
    },
    setPersons: (state, action) => {
      state.persons = action.payload;
      state.personsFetchedAt = Date.now();
      state.personsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesPersons.pending, (state) => {
        state.personsLoading = true;
      })
      .addCase(fetchSalesPersons.fulfilled, (state, action) => {
        state.persons = action.payload;
        state.personsFetchedAt = Date.now();
        state.personsError = null;
        state.personsLoading = false;
      })
      .addCase(fetchSalesPersons.rejected, (state, action) => {
        state.personsError = action.payload;
        state.personsLoading = false;
      })
      .addCase(fetchSalesBatches.pending, (state) => {
        state.salesBatchesLoading = true;
      })
      .addCase(fetchSalesBatches.fulfilled, (state, action) => {
        state.salesBatches = action.payload;
        state.salesBatchesFetchedAt = Date.now();
        state.salesBatchesError = null;
        state.salesBatchesLoading = false;
      })
      .addCase(fetchSalesBatches.rejected, (state, action) => {
        state.salesBatchesError = action.payload;
        state.salesBatchesLoading = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.persons = [];
        state.personsFetchedAt = null;
        state.personsError = null;
        state.salesBatches = [];
        state.salesBatchesFetchedAt = null;
        state.salesBatchesError = null;
      });
  },
});

export const { invalidatePersons, invalidateSalesBatches, setPersons } = salesDataSlice.actions;
export default salesDataSlice.reducer;

/** Check if persons cache is still fresh */
export function isPersonsCacheFresh(state, maxAgeMs = PERSONS_CACHE_MS) {
  const at = state?.salesData?.personsFetchedAt;
  if (!at) return false;
  return Date.now() - at < maxAgeMs;
}

/** Check if sales batches cache is still fresh */
export function isSalesBatchesCacheFresh(state, maxAgeMs = BATCHES_CACHE_MS) {
  const at = state?.salesData?.salesBatchesFetchedAt;
  if (!at) return false;
  return Date.now() - at < maxAgeMs;
}
