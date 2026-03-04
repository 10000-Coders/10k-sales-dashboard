"use client";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Loader2 } from "lucide-react";
import { logout } from "@/redux/features/user/userAuth";
import { clearLoginAt } from "@/lib/sessionExpiry";
import { routeObject, MenuItems } from "@/shared/static/sidebarItems";
import { cn } from "@/lib/utils";

export default function SideBar() {
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
        return true;
      }),
    [isManager, isAdminOrManagerOrSuperAdmin, user?.role]
  );

  useEffect(() => {
    if (pathname?.startsWith("/leads")) {
      setActiveItem("Leads");
    } else if (pathname?.startsWith("/activities")) {
      setActiveItem("Activities");
    } else if (pathname?.startsWith("/students")) {
      setActiveItem("Students");
    } else if (pathname?.startsWith("/payments")) {
      setActiveItem("Payments");
    } else {
      setActiveItem(routeObject[pathname] || "Dashboard");
    }
  }, [pathname]);

  const handleActiveItem = (text) => {
    if (text === "Dashboard") {
      router.push("/");
    } else if (text === "Sales persons") {
      router.push("/sales-persons");
    } else if (text === "Leads") {
      router.push("/leads");
    } else if (text === "Activities") {
      router.push("/activities");
    } else if (text === "Students") {
      router.push("/students");
    } else if (text === "Payments") {
      router.push("/payments");
    } else {
      const slug = text.toLowerCase().replace(/\s+/g, "");
      router.push(`/${slug}`);
    }
    setActiveItem(text);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    clearLoginAt(); // clear 48h session timestamp
    await new Promise(resolve => setTimeout(resolve, 500));
    dispatch(logout());
    router.replace("/login");
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[250px] flex-shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white overflow-x-hidden">
        <div className="flex flex-shrink-0 items-center justify-center px-4 py-4">
          <div className="bg-white rounded-lg p-2">
            <Image
              className="object-contain"
              width={133}
              height={40}
              src="/10k_brand_icon.png"
              alt="10k Coders"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden">
          <ul className="flex flex-col items-center gap-0">
            {visibleMenuItems.map((item, idx) => (
              <li
                key={idx}
                className={cn(
                  "relative flex w-[250px] cursor-pointer items-center justify-between rounded-r-full px-[30px] py-[12px] transition-all duration-200",
                  activeItem === item.text 
                    ? "bg-[#FF8000] text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                )}
                onClick={() => handleActiveItem(item.text)}
              >
                <span className="font-medium">{item.text}</span>
                {activeItem === item.text ? item.imgWhite : item.imgBlack}
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout Button at Bottom */}
        <div className="mt-auto border-t border-gray-100 p-4">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
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
