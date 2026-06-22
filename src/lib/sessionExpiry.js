/**
 * Session expiry: users must log in again after 7 days.
 */

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOGIN_AT_KEY = "sales_dashboard_login_at";

export function setLoginAt() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOGIN_AT_KEY, String(Date.now()));
  } catch (_) {}
}

export function clearLoginAt() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOGIN_AT_KEY);
  } catch (_) {}
}

/**
 * Returns true if there is no stored login time or if 7 days have passed since login.
 */
export function isSessionExpired() {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(LOGIN_AT_KEY);
    if (!stored) return true;
    const loginAt = parseInt(stored, 10);
    if (Number.isNaN(loginAt)) return true;
    return Date.now() - loginAt >= SESSION_DURATION_MS;
  } catch (_) {
    return true;
  }
}
