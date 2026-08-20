import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";
import axiosBase from "axios";
import { setTokens, clearTokens } from "@/lib/authTokens";
import { clearLoginAt } from "@/lib/sessionExpiry";
import { tokenRefreshUrl } from "@/lib/apiConfig";

function tokenLogoutUrl() {
  return tokenRefreshUrl.replace(/\/refresh\/?$/, "/logout/");
}

/**
 * Login with email + OTP.
 * POST /login/otp/verify/ → { access, user }
 * Refresh token is set as HttpOnly cookie by the API (withCredentials).
 */
export const login = createAsyncThunk(
  "userAuth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        "/login/otp/verify/",
        {
          email: payload.email?.trim()?.toLowerCase(),
          otp: String(payload.otp || "").trim(),
        },
        { withCredentials: true }
      );
      const data = response.data || {};
      if (!data.access || !data.user) {
        return rejectWithValue({
          detail: "Login response missing access token. Please try again.",
        });
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { detail: "Login failed." });
    }
  }
);

export const logout = createAsyncThunk("userAuth/logout", async () => {
  try {
    await axiosBase.post(tokenLogoutUrl(), {}, { withCredentials: true });
  } catch (_) {
    /* still clear local access */
  }
  clearTokens();
  clearLoginAt();
  return {};
});

const initialState = {
  user: null,
  access: null,
  isLoggedIn: false,
  loginLoading: false,
  loginError: null,
};

const userAuthSlice = createSlice({
  name: "userAuth",
  initialState,
  reducers: {
    /** Sync access after silent refresh (axios interceptor). */
    setSessionTokens(state, action) {
      const { access } = action.payload || {};
      if (access) {
        state.access = access;
        setTokens({ access });
      }
    },
    clearSession(state) {
      clearTokens();
      clearLoginAt();
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loginLoading = true;
        state.loginError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        const { access, user } = action.payload;
        setTokens({ access });
        state.loginLoading = false;
        state.isLoggedIn = true;
        state.user = user;
        state.access = access;
        state.loginError = null;
      })
      .addCase(login.rejected, (state, action) => {
        clearTokens();
        state.loginLoading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.access = null;
        state.loginError =
          action.payload?.detail || action.payload?.message || "Login failed.";
      })
      .addCase(logout.fulfilled, (state) => {
        Object.assign(state, initialState);
      });
  },
});

export const { setSessionTokens, clearSession } = userAuthSlice.actions;
export default userAuthSlice.reducer;
