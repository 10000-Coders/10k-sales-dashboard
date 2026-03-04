/**
 * Session expiry: users must log in again after 48 hours.
 */

const SESSION_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours
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
 * Returns true if there is no stored login time or if 48 hours have passed since login.
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
