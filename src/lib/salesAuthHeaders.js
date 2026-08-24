/**
 * Headers still used by sales APIs that have not moved to JWT identity yet
 * (students, payments, referrals, demo reviews, etc.).
 * Lead, sales-person, sales-batch, and stats endpoints use Bearer JWT only.
 */
export function getSalesPersonHeaders(user) {
  const h = {};
  if (user?.id != null) h["X-Sales-Person-Id"] = String(user.id);
  if (user?.role) h["X-Sales-Person-Role"] = user.role;
  return h;
}
