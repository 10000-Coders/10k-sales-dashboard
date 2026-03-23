export const RBAC_CONFIG = {
  manager: ["/", "/sales-persons", "/leads", "/referrals", "/activities", "/students", "/payments", "/batches", "/reports/date-account-summary"],
  super_admin: ["/", "/leads", "/referrals", "/activities", "/students", "/payments", "/batches"],
  admin: ["/", "/leads", "/referrals", "/activities", "/students", "/payments"],
  counselor: ["/", "/leads", "/referrals", "/activities", "/students", "/payments"],
};

export const DEFAULT_REDIRECT = "/";
export const LOGIN_ROUTE = "/login";
