/** Subpaths of broader RBAC entries that must still be restricted to managers only. */
export const MANAGER_ONLY_PATHS = ["/leaddemo/reassign"];
export const RBAC_CONFIG = {
  manager: ["/", "/sales-persons", "/leads", "/bulk-upload", "/leaddemo/reassign", "/leaddemo/analytics", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/batches", "/reports/date-account-summary", "/public-challenges"],
  super_admin: ["/", "/leads", "/bulk-upload", "/leaddemo/analytics", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/batches", "/public-challenges"],
  admin: ["/", "/leads", "/bulk-upload", "/leaddemo/analytics", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/public-challenges"],
  counselor: ["/", "/leads", "/bulk-upload", "/leaddemo/analytics", "/referrals", "/activities", "/students", "/payments", "/demo-reviews"],
};

export const DEFAULT_REDIRECT = "/";
export const LOGIN_ROUTE = "/login";
  