import axios from "axios";
import { mentorBaseUrl } from "@/lib/apiConfig";

/**
 * 10kCoders API client — public-challenges, mentor/problems, mentor/students, etc.
 * Do not attach sales JWT — mentor/core APIs use their own auth.
 */
const instance = axios.create({
  baseURL: mentorBaseUrl,
});

instance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default instance;
