/**
 * Mentor OTP APIs: send and verify OTP for email/mobile.
 * Used for student enrollment (and any flow that needs to verify email/mobile via OTP).
 */

import { mentorOtpBaseUrl } from "@/lib/apiConfig";

function getOtpHeaders() {
  return { "Content-Type": "application/json" };
}

/**
 * Send OTP to email or mobile.
 * POST mentor/otp/send/ with body: { channel, email?, mobile?, filters?: string[] }
 * filters: e.g. ["check_and_block_exists_in_sales_student"] to block when already in sales.
 * @returns { Promise<{ success: boolean, error?: string, code?: string }> }
 */
export async function sendMentorOtp({ channel, email, mobile, filters }) {
  if (!mentorOtpBaseUrl) return { success: false, error: "Mentor API not configured." };
  try {
    const body = {
      channel,
      ...(channel === "email" && email != null ? { email: String(email).trim().toLowerCase() } : {}),
      ...(channel === "mobile" && mobile != null ? { mobile: String(mobile).replace(/\D/g, "").slice(0, 10) } : {}),
    };
    if (Array.isArray(filters) && filters.length) body.filters = filters;
    const res = await fetch(`${mentorOtpBaseUrl}/otp/send/`, {
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
  if (!mentorOtpBaseUrl) return { success: false, error: "Mentor API not configured." };
  try {
    const res = await fetch(`${mentorOtpBaseUrl}/otp/verify/`, {
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
