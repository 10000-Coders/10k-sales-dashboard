import {
  LayoutDashboard,
  Users,
  UserPlus,
  Activity,
  GraduationCap,
  CreditCard,
  BarChart3,
  Layers,
  Share2,
  ClipboardList,
  Trophy,
} from "lucide-react";

/** Nav + page title for /public-challenges (scholarship tests). */
export const SCHOLARSHIP_TEST_NAV_LABEL = "Scholarship test";

export const routeObject = {
  "/": "Dashboard",
  "/leads": "Leads",
  "/sales-persons": "Sales persons",
  "/referrals": "Referrals",
  "/activities": "Activities",
  "/students": "Students",
  "/payments": "Payments",
  "/demo-reviews": "Demo Reviews",
  "/batches": "Batches",
  "/reports/date-account-summary": "Account Summary",
  "/public-challenges": SCHOLARSHIP_TEST_NAV_LABEL,
};

export const MenuItems = [
  { text: "Dashboard", icon: LayoutDashboard },
  { text: "Leads", icon: UserPlus },
  { text: "Students", icon: GraduationCap },
  { text: "Payments", icon: CreditCard, adminOrManagerOnly: true, allowCounselor: true },
  { text: "Batches", icon: Layers, managerOnly: true },
  { text: "Account Summary", icon: BarChart3, managerOnly: true },
  { text: "Referrals", textForCounselor: "Your referral leads", icon: Share2 },
  { text: "Demo Reviews", icon: ClipboardList },
  { text: SCHOLARSHIP_TEST_NAV_LABEL, icon: Trophy, adminManagerSuperAdminOnly: true },
  { text: "Sales persons", icon: Users, managerOnly: true },
  { text: "Activities", icon: Activity },
];
