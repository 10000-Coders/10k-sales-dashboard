export const RBAC_CONFIG = {
  manager: ["/", "/sales-persons", "/leads", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/batches", "/reports/date-account-summary"],
  super_admin: ["/", "/leads", "/referrals", "/activities", "/students", "/payments", "/demo-reviews", "/batches"],
  admin: ["/", "/leads", "/referrals", "/activities", "/students", "/payments", "/demo-reviews"],
  counselor: ["/", "/leads", "/referrals", "/activities", "/students", "/payments", "/demo-reviews"],
};

export const DEFAULT_REDIRECT = "/";
export const LOGIN_ROUTE = "/login";
