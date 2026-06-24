"use client";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Loader2 } from "lucide-react";
import { logout } from "@/redux/features/user/userAuth";
import { clearLoginAt } from "@/lib/sessionExpiry";
import { routeObject, MenuItems, SCHOLARSHIP_TEST_NAV_LABEL } from "@/shared/static/sidebarItems";
import { cn } from "@/lib/utils";

export default function SideBar({ mobileOpen = false, onMobileClose }) {
  const [activeItem, setActiveItem] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  
  const user = useSelector((state) => state.userAuth?.user);
  
  const isAdminOrManagerOrSuperAdmin =
    user?.role === "admin" || user?.role === "manager" || user?.role === "super_admin";
  const isManager = user?.role === "manager";

  const visibleMenuItems = useMemo(
    () =>
      MenuItems.filter((item) => {
        if (item.managerOnly) return isManager;
        if (item.adminOrManagerOnly)
          return (
            isAdminOrManagerOrSuperAdmin ||
            (item.allowCounselor && user?.role === "counselor")
          );
        if (item.adminManagerSuperAdminOnly) return isAdminOrManagerOrSuperAdmin;
        return true;
      }),
    [isManager, isAdminOrManagerOrSuperAdmin, user?.role]
  );

  useEffect(() => {
    if (pathname?.startsWith("/public-challenges")) {
      setActiveItem(SCHOLARSHIP_TEST_NAV_LABEL);
    } else if (pathname?.startsWith("/leads") || pathname?.startsWith("/bulk-upload")) {
      setActiveItem("Leads");
    } else if (pathname?.startsWith("/referrals")) {
      setActiveItem("Referrals");
    } else if (pathname?.startsWith("/activities")) {
      setActiveItem("Activities");
    } else if (pathname?.startsWith("/students")) {
      setActiveItem("Students");
    } else if (pathname?.startsWith("/payments")) {
      setActiveItem("Payments");
    } else {
      setActiveItem(routeObject[pathname] || "Dashboard");
    }
    onMobileClose?.();
  }, [pathname, onMobileClose]);

  const handleActiveItem = (text) => {
    if (text === "Dashboard") {
      router.push("/");
    } else if (text === SCHOLARSHIP_TEST_NAV_LABEL) {
      router.push("/public-challenges");
    } else if (text === "Sales persons") {
      router.push("/sales-persons");
    } else if (text === "Leads") {
      router.push("/leads");
    } else if (text === "Referrals") {
      router.push("/referrals");
    } else if (text === "Activities") {
      router.push("/activities");
    } else if (text === "Students") {
      router.push("/students");
    } else if (text === "Payments") {
      router.push("/payments");
    } else if (text === "Demo Reviews") {
      router.push("/demo-reviews");
    } else if (text === "Account Summary") {
      router.push("/reports/date-account-summary");
    } else {
      const slug = text.toLowerCase().replace(/\s+/g, "");
      router.push(`/${slug}`);
    }
    setActiveItem(text);
    onMobileClose?.();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    clearLoginAt(); // clear 7-day session timestamp
    await new Promise(resolve => setTimeout(resolve, 500));
    dispatch(logout());
    router.replace("/login");
  };

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 flex h-[100dvh] max-h-[100dvh] w-[250px] flex-shrink-0 flex-col overflow-hidden border-r border-border/80 bg-card shadow-[4px_0_24px_-12px_rgba(0,0,0,0.08)]",
          "transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-shrink-0 items-center border-b border-border/60 px-4 py-5">
          <div className="rounded-xl bg-muted/50 p-2 ring-1 ring-border/40">
            <Image
              className="object-contain"
              width={128}
              height={38}
              src="/10k_brand_icon.png"
              alt="10k Coders"
              priority
            />
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Menu
          </p>
          <ul className="flex flex-col gap-0.5">
            {visibleMenuItems.map((item, idx) => {
              const IconComponent = item.icon;
              const isCounselorOrAdmin = user?.role === "counselor" || user?.role === "admin";
              const label = item.textForCounselor && isCounselorOrAdmin ? item.textForCounselor : item.text;
              const active = activeItem === item.text;
              return (
                <li key={idx}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150",
                      active
                        ? "bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/25"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => handleActiveItem(item.text)}
                  >
                    <IconComponent className={cn("h-[18px] w-[18px] shrink-0", active && "opacity-100")} />
                    <span className="leading-snug">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-border/60 bg-muted/20 p-3">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <LogOut className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Sign Out?</h3>
              <p className="text-gray-500">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex border-t border-gray-100 bg-gray-50 p-4 gap-3">
              <button
                disabled={loggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Logout"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
