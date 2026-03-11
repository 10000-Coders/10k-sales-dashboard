/**
 * Mentor OTP APIs: send and verify OTP for email/mobile.
 * Used for student enrollment (and any flow that needs to verify email/mobile via OTP).
 * Base URL: NEXT_PUBLIC_baseUrl + /mentor (e.g. https://poc.10kcoders.com/api/mentor)
 */

import { getDynamicHeader } from "@/interceptManager";

function getMentorBaseUrl() {
  const env = process.env.NEXT_PUBLIC_mentorBaseUrl;
  if (env) return env.replace(/\/$/, "");
  const base = (process.env.NEXT_PUBLIC_baseUrl || "").replace(/\/$/, "");
  return base ? `${base}/mentor` : "";
}

function getOtpHeaders() {
  const headers = { "Content-Type": "application/json" };
  const { token } = getDynamicHeader();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Send OTP to email or mobile.
 * POST mentor/otp/send/ with body: { channel, email?, mobile?, filters?: string[] }
 * filters: e.g. ["check_and_block_exists_in_sales_student"] to block when already in sales.
 * @returns { Promise<{ success: boolean, error?: string, code?: string }> }
 */
export async function sendMentorOtp({ channel, email, mobile, filters }) {
  const base = getMentorBaseUrl();
  if (!base) return { success: false, error: "Mentor API not configured." };
  try {
    const body = {
      channel,
      ...(channel === "email" && email != null ? { email: String(email).trim().toLowerCase() } : {}),
      ...(channel === "mobile" && mobile != null ? { mobile: String(mobile).replace(/\D/g, "").slice(0, 10) } : {}),
    };
    if (Array.isArray(filters) && filters.length) body.filters = filters;
    const res = await fetch(`${base}/otp/send/`, {
      method: "POST",
      headers: getOtpHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data?.error || "Failed to send OTP.",
        code: data?.code,
      };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "Network error." };
  }
}

/**
 * Verify OTP for email or mobile.
 * POST mentor/otp/verify/ with body: { channel, email?: string, mobile?: string, otp: string }
 * @returns { Promise<{ success: boolean, error?: string }> }
 */
export async function verifyMentorOtp({ channel, email, mobile, otp }) {
  const base = getMentorBaseUrl();
  if (!base) return { success: false, error: "Mentor API not configured." };
  try {
    const res = await fetch(`${base}/otp/verify/`, {
      method: "POST",
      headers: getOtpHeaders(),
      body: JSON.stringify({
        channel,
        otp: String(otp || "").trim(),
        ...(channel === "email" && email != null ? { email: String(email).trim().toLowerCase() } : {}),
        ...(channel === "mobile" && mobile != null ? { mobile: String(mobile).replace(/\D/g, "").slice(0, 10) } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data?.error || "Verification failed." };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || "Network error." };
  }
}
