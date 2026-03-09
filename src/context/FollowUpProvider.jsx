"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import baseAxios from "axios"; // For server-time only (non-sales API)
import { toast } from "react-toastify";

const FollowUpContext = createContext(null);

export const useFollowUp = () => {
  const context = useContext(FollowUpContext);
  if (!context) {
    throw new Error("useFollowUp must be used within a FollowUpProvider");
  }
  return context;
};

/** Filter leads that have a follow-up due and are not enrolled */
function filterFollowUpLeads(leads) {
  return (leads || []).filter((l) => l.next_follow_up_at && l.status !== "enrolled");
}

const SERVER_TIME_STORAGE_KEY = "sales_dashboard_server_time_offset";
const SERVER_TIME_CACHE_MS = 60 * 60 * 1000; // 1 hour - offset doesn't change, device clocks drift slowly

/** In-flight promise to dedupe concurrent/Strict Mode double calls */
let serverTimeFetchPromise = null;

function getStoredServerTimeOffset() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SERVER_TIME_STORAGE_KEY);
    if (!stored) return null;
    const { offset, at } = JSON.parse(stored);
    if (Date.now() - at < SERVER_TIME_CACHE_MS) return offset;
  } catch {
    /* ignore */
  }
  return null;
}

function setStoredServerTimeOffset(offset) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SERVER_TIME_STORAGE_KEY, JSON.stringify({ offset, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export const FollowUpProvider = ({ children }) => {
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const [serverTimeOffset, setServerTimeOffset] = useState(() => getStoredServerTimeOffset() ?? 0);
  const [permission, setPermission] = useState("default");

  const leadsRef = useRef([]);
  const audioCtxRef = useRef(null);

  // Base URL for non-sales APIs (e.g. https://poc.10kcoders.com/api/ — no trailing slash after replace)
  const baseUrl = (process.env.NEXT_PUBLIC_baseUrl || "").replace(/\/$/, "");
  const apiRoot = baseUrl.replace(/\/api\/api\/?$/, "/api");

  // Sync server time: use cached offset from localStorage if fresh (< 1h), else fetch once and store.
  // In-flight guard prevents duplicate API calls (React Strict Mode double-mount, concurrent calls).
  const syncTime = useCallback(async () => {
    const cached = getStoredServerTimeOffset();
    if (cached != null) {
      setServerTimeOffset(cached);
      return; // No API call - use stored offset
    }
    if (serverTimeFetchPromise) {
      return serverTimeFetchPromise; // Reuse in-flight request
    }
    const doFetch = async () => {
      try {
        const start = Date.now();
        const endpoint = apiRoot ? `${apiRoot}/student/server-time/` : "/api/student/server-time/";
        const response = await baseAxios.get(endpoint);
        const serverTimeStr = response.data.datetime;
        const serverTime = new Date(serverTimeStr).getTime();
        const end = Date.now();
        const latency = (end - start) / 2;
        const offset = Date.now() - (serverTime + latency);
        setServerTimeOffset(offset);
        setStoredServerTimeOffset(offset);
      } catch (error) {
        console.error("Failed to sync server time:", error);
      } finally {
        serverTimeFetchPromise = null;
      }
    };
    serverTimeFetchPromise = doFetch();
    return serverTimeFetchPromise;
  }, [apiRoot]);

  /** Update notification list from leads state (called by Leads page when it fetches) */
  const setUpcomingFollowUpsFromLeads = useCallback((leads) => {
    const filtered = filterFollowUpLeads(leads);
    setUpcomingFollowUps(filtered);
    leadsRef.current = filtered;
  }, []);

  /** Optimistically update a lead in the list (e.g. after logging activity) */
  const updateLeadInFollowUpList = useCallback((leadId, updates) => {
    setUpcomingFollowUps((prev) => {
      const next = prev.map((l) =>
        l.id === leadId ? { ...l, ...updates } : l
      );
      const filtered = next.filter((l) => l.next_follow_up_at && l.status !== "enrolled");
      leadsRef.current = filtered;
      return filtered;
    });
  }, []);

  // 3. Notification Logic
  const checkNotifications = useCallback(() => {
    if (!leadsRef.current.length || typeof window === "undefined") return;

    const nowServer = Date.now() - serverTimeOffset;
    
    leadsRef.current.forEach((lead) => {
      const followUpTime = new Date(lead.next_follow_up_at).getTime();
      const diff = followUpTime - nowServer;

      // Notify if within 30 seconds of follow-up time (or just past it)
      if (diff <= 30000 && diff > -600000) { // Notify if due soon or overdue by up to 10m
        const notifiedKey = `notified_lead_${lead.id}`;
        const lastNotified = localStorage.getItem(notifiedKey);
        
        // Only notify once every 15 minutes for the same lead
        if (!lastNotified || (Date.now() - parseInt(lastNotified) > 900000)) {
          triggerNotification(lead);
          localStorage.setItem(notifiedKey, Date.now().toString());
        }
      }
    });
  }, [serverTimeOffset]);

  const playChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.stop(ctx.currentTime + 0.25);
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, []);

  const triggerNotification = (lead) => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const notification = new Notification("Follow-up Reminder", {
        body: `Follow-up due for ${lead.name} (${lead.mobile})`,
        icon: "/favicon.ico", // Fallback to favicon
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/leads/${lead.id}`;
      };
    }
    toast.info(`Follow-up due for ${lead.name} (${lead.mobile || "no mobile"})`, {
      autoClose: 15000,
      onClick: () => {
        window.focus();
        window.location.href = `/leads/${lead.id}`;
      },
    });
    playChime();
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(setPermission);
      }
    }
    syncTime(); // Sync once on mount; use local time for notifications if it fails
  }, [syncTime]);

  useEffect(() => {
    const notificationCheckInterval = setInterval(checkNotifications, 10000); // Check every 10s
    return () => clearInterval(notificationCheckInterval);
  }, [checkNotifications]);

  const value = {
    upcomingFollowUps,
    serverTimeOffset,
    setUpcomingFollowUpsFromLeads,
    updateLeadInFollowUpList,
    syncTime,
    permission,
    requestPermission: () => Notification.requestPermission().then(setPermission),
  };

  return <FollowUpContext.Provider value={value}>{children}</FollowUpContext.Provider>;
};
