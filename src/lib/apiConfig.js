function trimTrailingSlash(url) {
  return (url || "").replace(/\/$/, "");
}

const legacyBase = trimTrailingSlash(process.env.NEXT_PUBLIC_baseUrl || "");

/** 10kCoders API root — e.g. https://poc.10kcoders.com/api */
export const mentorBaseUrl =
  trimTrailingSlash(process.env.NEXT_PUBLIC_mentorBaseUrl) || legacyBase;

/** Mentor OTP endpoints live under /mentor */
export const mentorOtpBaseUrl = mentorBaseUrl ? `${mentorBaseUrl}/mentor` : "";

/**
 * Sales API client base. Env is the API root (same shape as mentorBaseUrl);
 * routes are served under /sales (e.g. .../api/sales/leads/).
 */
function resolveSalesBaseUrl() {
  const raw = trimTrailingSlash(process.env.NEXT_PUBLIC_salesBaseUrl);
  if (raw) {
    return raw.endsWith("/sales") ? raw : `${raw}/sales`;
  }
  return legacyBase ? `${legacyBase}/sales` : "/api/sales";
}

export const salesBaseUrl = resolveSalesBaseUrl();
