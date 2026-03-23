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
} from "lucide-react";

export const routeObject = {
  "/": "Dashboard",
  "/sales-persons": "Sales persons",
  "/leads": "Leads",
  "/referrals": "Referrals",
  "/activities": "Activities",
  "/students": "Students",
  "/payments": "Payments",
  "/batches": "Batches",
  "/reports/date-account-summary": "Account Summary",
};

export const MenuItems = [
  { text: "Dashboard", icon: LayoutDashboard },
  { text: "Leads", icon: UserPlus },
  { text: "Referrals", textForCounselor: "Your referral leads", icon: Share2 },
  { text: "Students", icon: GraduationCap },
  { text: "Payments", icon: CreditCard, adminOrManagerOnly: true, allowCounselor: true },
  { text: "Batches", icon: Layers, managerOnly: true },
  { text: "Account Summary", icon: BarChart3, managerOnly: true },
  { text: "Sales persons", icon: Users, managerOnly: true },
  { text: "Activities", icon: Activity },
];
