/** Human-readable period for team table header (en-IN). */
export function formatStatsPeriodLabel(fromIso, toIso) {
  const fmt = (iso) => {
    if (!iso) return "";
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };
  const from = fmt(fromIso);
  const to = fmt(toIso ?? fromIso);
  if (!from) return "";
  return from === to ? from : `${from} – ${to}`;
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
    overdueLeads: p.overdue_leads ?? 0,
    interestedLeadsCount: p.interested_leads_count ?? 0,
    interestedLeadsDue: p.interested_leads_due ?? 0,
  };
}

/**
 * Normalize stats API response so UI sees one shape regardless of API field names.
 * @param {object} raw - Raw API response (snake_case)
 * @returns {object|null} Normalized stats or null
 */
export function normalizeStats(raw) {
  if (!raw) return null;
  const periodFrom = raw.from_date ?? raw.date ?? null;
  const periodTo = raw.to_date ?? raw.date ?? periodFrom;
  const normalized = {
    leadsTotal: raw.leads_total ?? raw.leads_created ?? 0,
    activitiesTotal: raw.activities_today ?? raw.activities_total ?? 0,
    calls: raw.calls_today ?? raw.calls ?? 0,
    whatsapp: raw.whatsapp_today ?? raw.whatsapp ?? 0,
    verifiedPaymentCount: raw.verified_payment_count ?? 0,
    verifiedPaymentAmount: raw.verified_payment_amount ?? 0,
    pendingPaymentCount: raw.pending_payment_count ?? 0,
    pendingPaymentAmount: raw.pending_payment_amount ?? 0,
    overdueLeads: raw.overdue_leads ?? 0,
    interestedLeadsCount: raw.interested_leads_count ?? 0,
    interestedLeadsDue: raw.interested_leads_due ?? 0,
    periodFrom,
    periodTo,
    periodLabel: formatStatsPeriodLabel(periodFrom, periodTo),
  };
  if (Array.isArray(raw.by_person)) {
    normalized.by_person = raw.by_person.map(normalizePerson).filter(Boolean);
  }
  return normalized;
}
