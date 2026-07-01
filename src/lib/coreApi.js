import axios from "axios";
import { getDynamicHeader } from "@/interceptManager";
import { mentorBaseUrl } from "@/lib/apiConfig";

/**
 * 10kCoders API client — public-challenges, mentor/problems, mentor/students, etc.
 */
const instance = axios.create({
  baseURL: mentorBaseUrl,
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
