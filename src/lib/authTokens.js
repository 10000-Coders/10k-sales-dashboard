/**
 * Access token only in memory + localStorage.
 * Refresh token is HttpOnly cookie set by the API — never stored in JS.
 */

const ACCESS_KEY = "sales_access_token";

let memoryAccess = "";

function canUseStorage() {
  return typeof window !== "undefined";
}

/** @deprecated refresh arg ignored — kept for call-site compatibility */
export function setTokens({ access }) {
  memoryAccess = access || "";
  if (!canUseStorage()) return;
  try {
    if (memoryAccess) window.localStorage.setItem(ACCESS_KEY, memoryAccess);
    else window.localStorage.removeItem(ACCESS_KEY);
    // Remove any legacy refresh token left in localStorage
    window.localStorage.removeItem("sales_refresh_token");
  } catch (_) {
    /* ignore quota / private mode */
  }
}

export function getAccessToken() {
  if (memoryAccess) return memoryAccess;
  if (!canUseStorage()) return "";
  try {
    memoryAccess = window.localStorage.getItem(ACCESS_KEY) || "";
  } catch (_) {
    memoryAccess = "";
  }
  return memoryAccess;
}

export function clearTokens() {
  memoryAccess = "";
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem("sales_refresh_token");
  } catch (_) {
    /* ignore */
  }
}
