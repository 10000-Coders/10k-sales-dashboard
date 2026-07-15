/** True for Manager and Super Admin (team filters / sales-person dropdowns). */
export function isManagerOrSuperAdmin(role) {
  return role === "manager" || role === "super_admin";
}

/** True only for Manager (team table + all stats). Super Admin sees own stats only. */
export function isManager(role) {
  return role === "manager";
}

export const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export const SINGLE_DAY_PRESETS = new Set(["today", "yesterday"]);

/** Step-by-step responsibilities by role (lead tracking, follow-up, enrollment, payments). */
export const ROLE_RESPONSIBILITIES = {
  counselor: [
    "Add and track your leads; update lead status as you engage (Leads).",
    "Log every call and WhatsApp on the lead page with outcome and notes.",
    "Set and update the next follow-up date so you don't miss follow-ups; use the navbar reminder.",
    "When a lead is ready, enroll them as a student (Enroll from lead) and add initial payment with proof.",
    "Keep track of your activities and payment stats here; ensure pending payments are followed up.",
  ],
  admin: [
    "Track your leads; log calls and WhatsApp and set next follow-up on each lead page.",
    "Enroll qualified leads as students and add the first payment with proof (Manager will verify).",
    "Add any follow-up payments for your students; upload proof so Manager can verify.",
    "Monitor your lead pipeline and activity so no follow-up is missed.",
  ],
  manager: [
    "Monitor team performance: leads, activities, and payments; support counselors as needed.",
    "Verify or reject student payments submitted by counselors (Payments).",
    "Manage sales persons and their roles; manage batches and payment receiver accounts.",
    "Oversee the lead pipeline; filter by counselor and date to follow up with the team.",
    "Review Activities by period and by person to keep the team on track.",
  ],
  super_admin: [
    "View your own leads, students, activities, and payment stats (same scope as counselor/admin).",
    "Use Dashboard and Activities to track your productivity; use Payments to view your students' payments.",
    "Enroll students from your own leads only; Sales persons and Batches are managed by Manager.",
  ],
};
