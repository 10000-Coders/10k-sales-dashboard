export const RBAC_CONFIG = {
  manager: ["/", "/sales-persons", "/leads", "/activities", "/students", "/payments", "/batches", "/reports/date-account-summary"],
  super_admin: ["/", "/leads", "/activities", "/students", "/payments", "/batches"],
  admin: ["/", "/leads", "/activities", "/students", "/payments"],
  counselor: ["/", "/leads", "/activities", "/students", "/payments"],
};

export const DEFAULT_REDIRECT = "/";
export const LOGIN_ROUTE = "/login";
