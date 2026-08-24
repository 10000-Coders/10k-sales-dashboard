/** Subpaths of broader RBAC entries that must still be restricted to managers only. */
export const MANAGER_ONLY_PATHS = ["/leaddemo/reassign"];
export const RBAC_CONFIG = {
  manager: ["/", "/sales-persons", "/leads", "/bulk-upload", "/leaddemo/reassign", "/leaddemo/analytics", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/demo-students", "/demo-trainers", "/batches", "/reports/date-account-summary", "/reports/date-account-detail", "/public-challenges"],
  super_admin: ["/", "/sales-persons", "/leads", "/bulk-upload", "/leaddemo/analytics", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/demo-students", "/demo-trainers", "/batches", "/public-challenges"],
  counselor: ["/", "/leads", "/bulk-upload", "/leaddemo/analytics", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/demo-students"],
};

export const DEFAULT_REDIRECT = "/";
export const LOGIN_ROUTE = "/login";
  