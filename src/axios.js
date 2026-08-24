import axios from "axios";
import { getAccessToken, setTokens, clearTokens } from "@/lib/authTokens";
import { notifyAuthFailed, notifyTokensUpdated } from "@/lib/authBridge";
import { salesBaseUrl, tokenRefreshUrl } from "@/lib/apiConfig";

const instance = axios.create({
  baseURL: salesBaseUrl,
});

instance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise = null;

/**
 * Refresh uses HttpOnly cookie (withCredentials). JS never sees the refresh token.
 */
async function refreshAccessToken() {
  const { data } = await axios.post(
    tokenRefreshUrl,
    {},
    { withCredentials: true }
  );
  if (!data?.access) {
    throw new Error("Refresh did not return access token");
  }
  setTokens({ access: data.access });
  notifyTokensUpdated({ access: data.access });
  return data.access;
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    const url = String(original.url || "");
    if (url.includes("/login/otp/") || url.includes("/token/refresh") || url.includes("/token/logout")) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const access = await refreshPromise;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${access}`;
      return instance(original);
    } catch (refreshError) {
      clearTokens();
      notifyAuthFailed();
      return Promise.reject(refreshError);
    }
  }
);

export default instance;
