"use client";

import { useLayoutEffect } from "react";
import { useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { RBAC_CONFIG, LOGIN_ROUTE, DEFAULT_REDIRECT } from "@/shared/static/rbacConfig";

export default function withPrivateAuth(Component) {
  return function ProtectedRoute(props) {
    const router = useRouter();
    const pathname = usePathname();
    const { isLoggedIn, user } = useSelector((state) => state.userAuth);

    useLayoutEffect(() => {
      // 1. Authentication Check
      if (!isLoggedIn || !user) {
        router.push(LOGIN_ROUTE);
        return;
      }

      // 2. Authorization Check (Role-based)
      const userRole = user.role;
      const allowedPaths = RBAC_CONFIG[userRole] || [];

      // Check if current path is allowed for the role
      // Simple exact match or startWith check depending on nesting
      const isAllowed = allowedPaths.some(path => 
        pathname === path || (path !== "/" && pathname.startsWith(path))
      );

      if (!isAllowed) {
        console.warn(`Access denied for role: ${userRole} to path: ${pathname}`);
        router.push(DEFAULT_REDIRECT);
      }
    }, [isLoggedIn, user, pathname, router]);

    // Show nothing while checking auth/loading
    if (!isLoggedIn || !user) {
      return null;
    }

    return <Component {...props} />;
  };
}
