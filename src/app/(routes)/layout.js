import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Sales Dashboard | 10000Coders",
  description: "Leads, referrals, payments, and team performance",
};

export default function GroupLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
