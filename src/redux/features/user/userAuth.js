import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";

const DEV_BYPASS_USER = {
  id: 1,
  name: "Sales User",
  email: "sales.user@10000coders.in",
  role: "manager",
};

/**
 * Login with email + OTP (password login removed).
 * POST /login/otp/verify/ returns same shape as old password login (sales person object).
 */
export const login = createAsyncThunk(
  "userAuth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post("/login/otp/verify/", {
        email: payload.email?.trim()?.toLowerCase(),
        otp: String(payload.otp || "").trim(),
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { detail: "Login failed." });
    }
  }
);

export const logout = createAsyncThunk("userAuth/logout", async () => ({}));

const userAuthSlice = createSlice({
  name: "userAuth",
  initialState: {
    user: DEV_BYPASS_USER,
    isLoggedIn: true,
    loginLoading: false,
    loginError: null,
  },
  reducers: {
    ensureDevSession: (state) => {
      if (!state.user) {
        state.user = DEV_BYPASS_USER;
      }
      state.isLoggedIn = true;
      state.loginError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loginLoading = true;
        state.loginError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.isLoggedIn = true;
        state.user = action.payload;
        state.loginError = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loginLoading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.loginError = action.payload?.detail || action.payload?.message || "Login failed.";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = DEV_BYPASS_USER;
        state.isLoggedIn = true;
        state.loginError = null;
      });
  },
});

export const { ensureDevSession } = userAuthSlice.actions;
export default userAuthSlice.reducer;
