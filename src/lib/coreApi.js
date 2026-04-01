import axios from "axios";
import { getDynamicHeader } from "@/interceptManager";

/**
 * Main API base (same as mentor app) — for public-challenges, mentor/problems, etc.
 * Sales default axios uses `{base}/sales`; this client uses `{base}` only.
 */
const base = process.env.NEXT_PUBLIC_baseUrl || "";
const instance = axios.create({
  baseURL: base ? base.replace(/\/$/, "") : "",
});

instance.interceptors.request.use(
  (config) => {
    const { token } = getDynamicHeader();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default instance;
