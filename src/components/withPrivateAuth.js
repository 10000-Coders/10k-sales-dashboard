"use client";

import { useLayoutEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { RBAC_CONFIG, LOGIN_ROUTE, DEFAULT_REDIRECT, MANAGER_ONLY_PATHS } from "@/shared/static/rbacConfig";
import { logout } from "@/redux/features/user/userAuth";
import { isSessionExpired, clearLoginAt } from "@/lib/sessionExpiry";
import { getAccessToken } from "@/lib/authTokens";

export default function withPrivateAuth(Component) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { isLoggedIn, user, access } = useSelector((state) => state.userAuth);

    useLayoutEffect(() => {
      const hasToken = Boolean(access || getAccessToken());

      // 1. Authentication Check (user + JWT)
      if (!isLoggedIn || !user || !hasToken) {
        router.push(LOGIN_ROUTE);
        return;
      }

      // 2. Session expiry: 30 days — force re-login
      if (isSessionExpired()) {
        clearLoginAt();
        dispatch(logout());
        router.replace(LOGIN_ROUTE);
        return;
      }

      // 3. Manager-only routes (e.g. lead transfer)
      const userRole = user.role;
      const isManagerOnlyRoute = MANAGER_ONLY_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
      );
      if (isManagerOnlyRoute && userRole !== "manager") {
        router.push(DEFAULT_REDIRECT);
        return;
      }

      // 4. Authorization Check (Role-based)
      const allowedPaths = RBAC_CONFIG[userRole] || [];

      const isAllowed = allowedPaths.some((path) =>
        pathname === path || (path !== "/" && pathname.startsWith(path))
      );

      if (!isAllowed) {
        console.warn(`Access denied for role: ${userRole} to path: ${pathname}`);
        router.push(DEFAULT_REDIRECT);
      }
    }, [isLoggedIn, user, access, pathname, router, dispatch]);

    const hasToken = Boolean(access || getAccessToken());
    if (!isLoggedIn || !user || !hasToken) {
      return null;
    }

    return <Component {...props} />;
  };
}
