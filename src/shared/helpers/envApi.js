import { mentorBaseUrl, salesBaseUrl } from "@/lib/apiConfig";

const envConfig = {
  mentorBaseUrl,
  salesBaseUrl,
  /** @deprecated Use salesBaseUrl or mentorBaseUrl */
  apiBaseUrl: salesBaseUrl,
};

export { envConfig };
