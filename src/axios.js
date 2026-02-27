import axios from "axios";
import { getDynamicHeader } from "./interceptManager";

// Sales API: backend base (e.g. http://localhost:8000/api) + /sales → http://localhost:8000/api/sales
const base = process.env.NEXT_PUBLIC_baseUrl || "";
const salesBase = base ? `${base.replace(/\/$/, "")}/sales` : "/api/sales";
const instance = axios.create({
  baseURL: salesBase,
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
