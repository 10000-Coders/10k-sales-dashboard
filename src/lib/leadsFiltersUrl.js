/** Persist last leads-list filter query so nav links can restore it. */

export const LEADS_FILTERS_STORAGE_KEY = "leadsListFilters";

export function saveLeadsFiltersQuery(qs) {
  try {
    sessionStorage.setItem(LEADS_FILTERS_STORAGE_KEY, qs || "");
  } catch {
    /* ignore private-mode / quota errors */
  }
}

/** Href for the leads list, including the last saved filter query if any. */
export function getLeadsListHref() {
  try {
    const qs = sessionStorage.getItem(LEADS_FILTERS_STORAGE_KEY);
    return qs ? `/leads?${qs}` : "/leads";
  } catch {
    return "/leads";
  }
}
