import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";
import { logout } from "@/redux/features/user/userAuth";

/** Cache TTL in ms - avoid refetching persons/batches on every navigation */
const PERSONS_CACHE_MS = 5 * 60 * 1000; // 5 minutes
const BATCHES_CACHE_MS = 5 * 60 * 1000; // 5 minutes

export const fetchSalesPersons = createAsyncThunk(
  "salesData/fetchSalesPersons",
  async (_, { rejectWithValue }) => {
    try {
      // JWT via axios interceptor. Manager / Super Admin only on the backend.
      const { data } = await axios.get("/persons/");
      return data?.results ?? (Array.isArray(data) ? data : []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        return rejectWithValue(
          err.response?.data?.detail || "You don't have permission to view sales persons."
        );
      }
      return rejectWithValue(err.response?.data?.detail || "Failed to load sales persons.");
    }
  }
);

export const fetchSalesBatches = createAsyncThunk(
  "salesData/fetchSalesBatches",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get("/sales-batches/");
      return data?.results ?? (Array.isArray(data) ? data : []);
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || "Failed to load sales batches.");
    }
  }
);

/** Slim list for dropdowns: GET /sales-batches/dropdown/ (id, name, course). Optional course filter. */
export const fetchSalesBatchDropdown = createAsyncThunk(
  "salesData/fetchSalesBatchDropdown",
  async (course, { rejectWithValue }) => {
    try {
      const params = course ? { course } : undefined;
      const { data } = await axios.get("/sales-batches/dropdown/", { params });
      return {
        course: course || "",
        batches: Array.isArray(data) ? data : [],
      };
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
    salesBatchDropdown: [],
    salesBatchDropdownCourse: "",
    salesBatchDropdownFetchedAt: null,
    salesBatchDropdownError: null,
    salesBatchDropdownLoading: false,
  },
  reducers: {
    invalidatePersons: (state) => {
      state.personsFetchedAt = null;
    },
    invalidateSalesBatches: (state) => {
      state.salesBatchesFetchedAt = null;
    },
    invalidateSalesBatchDropdown: (state) => {
      state.salesBatchDropdownFetchedAt = null;
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
      .addCase(fetchSalesBatchDropdown.pending, (state) => {
        state.salesBatchDropdownLoading = true;
      })
      .addCase(fetchSalesBatchDropdown.fulfilled, (state, action) => {
        state.salesBatchDropdown = action.payload.batches;
        state.salesBatchDropdownCourse = action.payload.course;
        state.salesBatchDropdownFetchedAt = Date.now();
        state.salesBatchDropdownError = null;
        state.salesBatchDropdownLoading = false;
      })
      .addCase(fetchSalesBatchDropdown.rejected, (state, action) => {
        state.salesBatchDropdownError = action.payload;
        state.salesBatchDropdownLoading = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.persons = [];
        state.personsFetchedAt = null;
        state.personsError = null;
        state.salesBatches = [];
        state.salesBatchesFetchedAt = null;
        state.salesBatchesError = null;
        state.salesBatchDropdown = [];
        state.salesBatchDropdownCourse = "";
        state.salesBatchDropdownFetchedAt = null;
        state.salesBatchDropdownError = null;
      });
  },
});

export const { invalidatePersons, invalidateSalesBatches, invalidateSalesBatchDropdown, setPersons } =
  salesDataSlice.actions;
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

/** Check if sales batch dropdown cache is still fresh for the requested course filter */
export function isSalesBatchDropdownCacheFresh(state, course = "", maxAgeMs = BATCHES_CACHE_MS) {
  const at = state?.salesData?.salesBatchDropdownFetchedAt;
  if (!at) return false;
  if ((state?.salesData?.salesBatchDropdownCourse || "") !== (course || "")) return false;
  return Date.now() - at < maxAgeMs;
}
