import { getRangeForPreset, todayStr } from "@/lib/dateUtils";
import { SINGLE_DAY_PRESETS } from "@/lib/dashboardConstants";

/**
 * Params for stats API: single-day vs range and the date(s).
 * @returns {{ singleDay: boolean, date: string, fromDate: string, toDate: string }}
 */
export function getStatsParams(preset, fromDate, toDate) {
  const singleDay = SINGLE_DAY_PRESETS.has(preset);
  const date = singleDay
    ? preset === "today"
      ? todayStr()
      : getRangeForPreset("yesterday").from
    : fromDate;
  return { singleDay, date, fromDate, toDate };
}

/**
 * Normalize one person's stats from API (snake_case) to a consistent shape.
 */
function normalizePerson(p) {
  if (!p) return null;
  return {
    sales_person_id: p.sales_person_id,
    sales_person_name: p.sales_person_name,
    role: p.role,
    leadsTotal: p.leads_total ?? p.leads_created ?? 0,
    activitiesTotal: p.activities_today ?? p.activities_total ?? 0,
    calls: p.calls_today ?? p.calls ?? 0,
    whatsapp: p.whatsapp_today ?? p.whatsapp ?? 0,
    verifiedPaymentAmount: p.verified_payment_amount ?? 0,
    pendingPaymentAmount: p.pending_payment_amount ?? 0,
  };
}

/**
 * Normalize stats API response so UI sees one shape regardless of API field names.
 * @param {object} raw - Raw API response (snake_case)
 * @returns {object|null} Normalized stats or null
 */
export function normalizeStats(raw) {
  if (!raw) return null;
  const normalized = {
    leadsTotal: raw.leads_total ?? raw.leads_created ?? 0,
    activitiesTotal: raw.activities_today ?? raw.activities_total ?? 0,
    calls: raw.calls_today ?? raw.calls ?? 0,
    whatsapp: raw.whatsapp_today ?? raw.whatsapp ?? 0,
    verifiedPaymentCount: raw.verified_payment_count ?? 0,
    verifiedPaymentAmount: raw.verified_payment_amount ?? 0,
    pendingPaymentCount: raw.pending_payment_count ?? 0,
    pendingPaymentAmount: raw.pending_payment_amount ?? 0,
  };
  if (Array.isArray(raw.by_person)) {
    normalized.by_person = raw.by_person.map(normalizePerson).filter(Boolean);
  }
  return normalized;
}
