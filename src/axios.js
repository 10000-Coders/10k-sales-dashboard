import axios from "axios";
import { getDynamicHeader } from "./interceptManager";
import { salesBaseUrl } from "@/lib/apiConfig";

const instance = axios.create({
  baseURL: salesBaseUrl,
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
