/** Subpaths of broader RBAC entries that must still be restricted to managers only. */
export const MANAGER_ONLY_PATHS = ["/leads/reassign"];
export const RBAC_CONFIG = {
  manager: ["/", "/sales-persons", "/leads", "/leads/reassign", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/batches", "/reports/date-account-summary", "/public-challenges"],
  super_admin: ["/", "/leads", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/batches", "/public-challenges"],
  admin: ["/", "/leads", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/public-challenges"],
  counselor: ["/", "/leads", "/referrals", "/activities", "/students", "/payments", "/demo-reviews"],
};

export const DEFAULT_REDIRECT = "/";
export const LOGIN_ROUTE = "/login";
  