"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerAuthHandlers } from "@/lib/authBridge";
import { setTokens, clearTokens } from "@/lib/authTokens";
import {
  setSessionTokens,
  clearSession,
} from "@/redux/features/user/userAuth";

/**
 * After persist rehydrate: sync access JWT into memory, invalidate bad sessions,
 * and wire axios refresh → Redux / forced logout.
 * Refresh token stays in HttpOnly cookie only.
 */
export default function AuthTokenSync() {
  const dispatch = useDispatch();
  const { user, access, isLoggedIn } = useSelector((state) => state.userAuth);

  useEffect(() => {
    registerAuthHandlers({
      onTokensUpdated: (tokens) => {
        dispatch(setSessionTokens(tokens));
      },
      onAuthFailed: () => {
        dispatch(clearSession());
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.replace("/login");
        }
      },
    });
  }, [dispatch]);

  useEffect(() => {
    if (isLoggedIn && user && !access) {
      clearTokens();
      dispatch(clearSession());
      return;
    }
    if (access) {
      setTokens({ access });
    }
  }, [isLoggedIn, user, access, dispatch]);

  return null;
}
