"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import baseAxios from "axios";
import axios from "@/axios";
import { toast } from "react-toastify";

const FollowUpContext = createContext(null);

const SW_PATH = "/follow-up-sw.js";
const NOTIFY_BEFORE_MS = 2 * 60 * 1000; // 2 min before due
const NOTIFY_AFTER_MS = 30 * 60 * 1000; // 30 min after due (catch missed checks)
const NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;
const LEADS_REFRESH_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;
const MAX_SCHEDULE_MS = 24 * 60 * 60 * 1000;
const CHIME_DURATION_MS = 10 * 1000;
const CHIME_BEEP_INTERVAL_SEC = 0.55;
const CHIME_BEEP_LENGTH_SEC = 0.22;
const CHIME_FREQUENCY_HZ = 880;

export const useFollowUp = () => {
  const context = useContext(FollowUpContext);
  if (!context) {
    throw new Error("useFollowUp must be used within a FollowUpProvider");
  }
  return context;
};

function filterFollowUpLeads(leads) {
  return (leads || []).filter((l) => l.next_follow_up_at && l.status !== "enrolled");
}

function shouldNotifyLead(diffMs) {
  return diffMs <= NOTIFY_BEFORE_MS && diffMs > -NOTIFY_AFTER_MS;
}

function wasRecentlyNotified(leadId) {
  const lastNotified = localStorage.getItem(`notified_lead_${leadId}`);
  return lastNotified && Date.now() - parseInt(lastNotified, 10) < NOTIFY_COOLDOWN_MS;
}

function markLeadNotified(leadId) {
  localStorage.setItem(`notified_lead_${leadId}`, Date.now().toString());
}

const SERVER_TIME_STORAGE_KEY = "sales_dashboard_server_time_offset";
const SERVER_TIME_CACHE_MS = 60 * 60 * 1000;

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
  const user = useSelector((state) => state.userAuth?.user);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const [serverTimeOffset, setServerTimeOffset] = useState(() => getStoredServerTimeOffset() ?? 0);
  const [permission, setPermission] = useState("default");

  const leadsRef = useRef([]);
  const audioCtxRef = useRef(null);
  const swRegistrationRef = useRef(null);
  const scheduledTimersRef = useRef(new Map());
  const serverTimeOffsetRef = useRef(serverTimeOffset);

  const baseUrl = (process.env.NEXT_PUBLIC_baseUrl || "").replace(/\/$/, "");
  const apiRoot = baseUrl.replace(/\/api\/api\/?$/, "/api");

  useEffect(() => {
    serverTimeOffsetRef.current = serverTimeOffset;
  }, [serverTimeOffset]);

  const syncTime = useCallback(async () => {
    const cached = getStoredServerTimeOffset();
    if (cached != null) {
      setServerTimeOffset(cached);
      return;
    }
    if (serverTimeFetchPromise) {
      return serverTimeFetchPromise;
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

  const unlockAudio = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  const playChime = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const startAt = ctx.currentTime;
      const beepCount = Math.ceil(CHIME_DURATION_MS / 1000 / CHIME_BEEP_INTERVAL_SEC);

      for (let i = 0; i < beepCount; i += 1) {
        const beepStart = startAt + i * CHIME_BEEP_INTERVAL_SEC;
        const beepEnd = beepStart + CHIME_BEEP_LENGTH_SEC;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = CHIME_FREQUENCY_HZ;
        gain.gain.setValueAtTime(0.0001, beepStart);
        gain.gain.exponentialRampToValueAtTime(0.14, beepStart + 0.02);
        gain.gain.setValueAtTime(0.14, beepEnd - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, beepEnd);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(beepStart);
        osc.stop(beepEnd);
      }
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }, []);

  const showDesktopNotification = useCallback(async (lead) => {
    if (typeof window === "undefined" || Notification.permission !== "granted") return;

    const body = `Follow-up due for ${lead.name} (${lead.mobile || "no mobile"})`;
    const leadUrl = `${window.location.origin}/leads/${lead.id}`;
    const options = {
      body,
      icon: "/favicon.ico",
      tag: `follow-up-${lead.id}`,
      data: { url: leadUrl },
      requireInteraction: true,
      silent: false,
    };

    const reg = swRegistrationRef.current;
    if (reg?.showNotification) {
      try {
        await reg.showNotification("Follow-up Reminder", options);
        return;
      } catch {
        /* fall through */
      }
    }

    if (reg?.active) {
      try {
        reg.active.postMessage({
          type: "SHOW_NOTIFICATION",
          title: "Follow-up Reminder",
          options,
        });
        return;
      } catch {
        /* fall through */
      }
    }

    const notification = new Notification("Follow-up Reminder", options);
    notification.onclick = () => {
      window.focus();
      window.location.href = `/leads/${lead.id}`;
    };
  }, []);

  const triggerNotification = useCallback(
    (lead) => {
      if (wasRecentlyNotified(lead.id)) return;
      markLeadNotified(lead.id);

      showDesktopNotification(lead);

      if (typeof document !== "undefined" && !document.hidden) {
        toast.info(`Follow-up due for ${lead.name} (${lead.mobile || "no mobile"})`, {
          autoClose: 15000,
          onClick: () => {
            window.focus();
            window.location.href = `/leads/${lead.id}`;
          },
        });
        playChime();
      }
    },
    [playChime, showDesktopNotification]
  );

  const tryNotifyLead = useCallback(
    (lead, nowServer) => {
      const followUpTime = new Date(lead.next_follow_up_at).getTime();
      const diff = followUpTime - nowServer;
      if (shouldNotifyLead(diff)) {
        triggerNotification(lead);
      }
    },
    [triggerNotification]
  );

  const checkNotifications = useCallback(() => {
    if (!leadsRef.current.length || typeof window === "undefined") return;
    const nowServer = Date.now() - serverTimeOffsetRef.current;
    leadsRef.current.forEach((lead) => tryNotifyLead(lead, nowServer));
  }, [tryNotifyLead]);

  const clearScheduledTimers = useCallback(() => {
    scheduledTimersRef.current.forEach((id) => clearTimeout(id));
    scheduledTimersRef.current.clear();
  }, []);

  const scheduleFollowUpTimers = useCallback(
    (leads) => {
      clearScheduledTimers();
      if (!leads.length) return;

      const nowServer = Date.now() - serverTimeOffsetRef.current;

      leads.forEach((lead) => {
        const followUpTime = new Date(lead.next_follow_up_at).getTime();
        const delay = followUpTime - nowServer;
        if (delay < 0 || delay > MAX_SCHEDULE_MS) return;

        const timerId = setTimeout(() => {
          tryNotifyLead(lead, Date.now() - serverTimeOffsetRef.current);
        }, delay);
        scheduledTimersRef.current.set(lead.id, timerId);
      });
    },
    [clearScheduledTimers, tryNotifyLead]
  );

  const applyLeads = useCallback(
    (leads) => {
      const filtered = filterFollowUpLeads(leads);
      setUpcomingFollowUps(filtered);
      leadsRef.current = filtered;
      scheduleFollowUpTimers(filtered);
    },
    [scheduleFollowUpTimers]
  );

  const setUpcomingFollowUpsFromLeads = useCallback(
    (leads) => {
      applyLeads(leads);
    },
    [applyLeads]
  );

  const updateLeadInFollowUpList = useCallback(
    (leadId, updates) => {
      setUpcomingFollowUps((prev) => {
        const next = prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l));
        const filtered = filterFollowUpLeads(next);
        leadsRef.current = filtered;
        scheduleFollowUpTimers(filtered);
        return filtered;
      });
    },
    [scheduleFollowUpTimers]
  );

  const fetchFollowUpLeads = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", "100");
      params.set("sales_person", String(user.id));
      const headers = {
        "X-Sales-Person-Id": String(user.id),
      };
      if (user.role) headers["X-Sales-Person-Role"] = user.role;
      const { data } = await axios.get(`/leads/?${params.toString()}`, { headers });
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      const mine = list.filter((l) => String(l.sales_person) === String(user.id));
      applyLeads(mine);
    } catch (error) {
      console.error("Failed to refresh follow-up leads:", error);
    }
  }, [user?.id, user?.role, applyLeads]);

  const requestPermission = useCallback(async () => {
    unlockAudio();
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      playChime();
    }
    return result;
  }, [unlockAudio, playChime]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(SW_PATH)
      .then((reg) => {
        swRegistrationRef.current = reg;
      })
      .catch((err) => {
        console.warn("Follow-up service worker registration failed:", err);
      });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    syncTime();
  }, [syncTime]);

  useEffect(() => {
    if (!user?.id) return;
    fetchFollowUpLeads();
    const refreshInterval = setInterval(fetchFollowUpLeads, LEADS_REFRESH_MS);
    return () => clearInterval(refreshInterval);
  }, [user?.id, fetchFollowUpLeads]);

  useEffect(() => {
    const poll = setInterval(checkNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [checkNotifications]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkNotifications]);

  useEffect(() => {
    return () => clearScheduledTimers();
  }, [clearScheduledTimers]);

  useEffect(() => {
    scheduleFollowUpTimers(leadsRef.current);
  }, [serverTimeOffset, scheduleFollowUpTimers]);

  const value = {
    upcomingFollowUps,
    serverTimeOffset,
    setUpcomingFollowUpsFromLeads,
    updateLeadInFollowUpList,
    syncTime,
    permission,
    requestPermission,
    unlockAudio,
  };

  return <FollowUpContext.Provider value={value}>{children}</FollowUpContext.Provider>;
};
