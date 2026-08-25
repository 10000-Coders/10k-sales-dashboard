"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import baseAxios from "axios";
import axios from "@/axios";
import { toast } from "react-toastify";
import { decryptStudentPii } from "@/lib/studentPiiCrypto";

const FollowUpContext = createContext(null);

const SW_PATH = "/follow-up-sw.js";
const NOTIFY_BEFORE_MS = 2 * 60 * 1000; // 2 min before due
const NOTIFY_AFTER_MS = 30 * 60 * 1000; // 30 min after due (catch missed checks)
const NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;
const REFRESH_MS = 5 * 60 * 1000;
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

function filterFollowUpStudents(students) {
  return (students || []).filter(
    (s) => s.next_payment_follow_up_at && s.display_status !== "rejected"
  );
}

function toLeadFollowUpItem(lead) {
  return {
    type: "lead",
    id: lead.id,
    name: lead.name,
    mobile: lead.mobile,
    followUpAt: lead.next_follow_up_at,
    href: `/leads/${lead.id}`,
  };
}

async function toStudentFollowUpItem(student) {
  return {
    type: "student",
    id: student.id,
    name: student.student_name,
    mobile: await decryptStudentPii(student.student_mobile),
    followUpAt: student.next_payment_follow_up_at,
    href: `/students/${student.id}`,
  };
}

async function buildFollowUpItems(leads, students) {
  const studentItems = await Promise.all(
    filterFollowUpStudents(students).map(toStudentFollowUpItem)
  );
  return [
    ...filterFollowUpLeads(leads).map(toLeadFollowUpItem),
    ...studentItems,
  ];
}

function shouldNotify(diffMs) {
  return diffMs <= NOTIFY_BEFORE_MS && diffMs > -NOTIFY_AFTER_MS;
}

function wasRecentlyNotified(type, id) {
  const lastNotified = localStorage.getItem(`notified_${type}_${id}`);
  return lastNotified && Date.now() - parseInt(lastNotified, 10) < NOTIFY_COOLDOWN_MS;
}

function markNotified(type, id) {
  localStorage.setItem(`notified_${type}_${id}`, Date.now().toString());
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

  const leadsDataRef = useRef([]);
  const studentsDataRef = useRef([]);
  const itemsRef = useRef([]);
  const followUpMergeGenRef = useRef(0);
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

  const showDesktopNotification = useCallback(async (item) => {
    if (typeof window === "undefined" || Notification.permission !== "granted") return;

    const isStudent = item.type === "student";
    const title = isStudent ? "Payment Follow-up Reminder" : "Follow-up Reminder";
    const body = isStudent
      ? `Payment follow-up due for ${item.name} (${item.mobile || "no mobile"})`
      : `Follow-up due for ${item.name} (${item.mobile || "no mobile"})`;
    const itemUrl = `${window.location.origin}${item.href}`;
    const options = {
      body,
      icon: "/favicon.ico",
      tag: `follow-up-${item.type}-${item.id}`,
      data: { url: itemUrl },
      requireInteraction: true,
      silent: false,
    };

    const reg = swRegistrationRef.current;
    if (reg?.showNotification) {
      try {
        await reg.showNotification(title, options);
        return;
      } catch {
        /* fall through */
      }
    }

    if (reg?.active) {
      try {
        reg.active.postMessage({ type: "SHOW_NOTIFICATION", title, options });
        return;
      } catch {
        /* fall through */
      }
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      window.location.href = item.href;
    };
  }, []);

  const triggerNotification = useCallback(
    (item) => {
      if (wasRecentlyNotified(item.type, item.id)) return;
      markNotified(item.type, item.id);

      showDesktopNotification(item);

      if (typeof document !== "undefined" && !document.hidden) {
        const isStudent = item.type === "student";
        const message = isStudent
          ? `Payment follow-up due for ${item.name} (${item.mobile || "no mobile"})`
          : `Follow-up due for ${item.name} (${item.mobile || "no mobile"})`;
        toast.info(message, {
          autoClose: 15000,
          onClick: () => {
            window.focus();
            window.location.href = item.href;
          },
        });
        playChime();
      }
    },
    [playChime, showDesktopNotification]
  );

  const tryNotifyItem = useCallback(
    (item, nowServer) => {
      const followUpTime = new Date(item.followUpAt).getTime();
      const diff = followUpTime - nowServer;
      if (shouldNotify(diff)) {
        triggerNotification(item);
      }
    },
    [triggerNotification]
  );

  const checkNotifications = useCallback(() => {
    if (!itemsRef.current.length || typeof window === "undefined") return;
    const nowServer = Date.now() - serverTimeOffsetRef.current;
    itemsRef.current.forEach((item) => tryNotifyItem(item, nowServer));
  }, [tryNotifyItem]);

  const clearScheduledTimers = useCallback(() => {
    scheduledTimersRef.current.forEach((id) => clearTimeout(id));
    scheduledTimersRef.current.clear();
  }, []);

  const scheduleFollowUpTimers = useCallback(
    (items) => {
      clearScheduledTimers();
      if (!items.length) return;

      const nowServer = Date.now() - serverTimeOffsetRef.current;

      items.forEach((item) => {
        const followUpTime = new Date(item.followUpAt).getTime();
        const delay = followUpTime - nowServer;
        if (delay < 0 || delay > MAX_SCHEDULE_MS) return;

        const timerKey = `${item.type}-${item.id}`;
        const timerId = setTimeout(() => {
          tryNotifyItem(item, Date.now() - serverTimeOffsetRef.current);
        }, delay);
        scheduledTimersRef.current.set(timerKey, timerId);
      });
    },
    [clearScheduledTimers, tryNotifyItem]
  );

  const mergeAndApply = useCallback(
    (leads, students) => {
      const gen = ++followUpMergeGenRef.current;
      buildFollowUpItems(leads, students).then((items) => {
        if (gen !== followUpMergeGenRef.current) return;
        setUpcomingFollowUps(items);
        itemsRef.current = items;
        scheduleFollowUpTimers(items);
      });
    },
    [scheduleFollowUpTimers]
  );

  const setUpcomingFollowUpsFromLeads = useCallback(
    (leads) => {
      leadsDataRef.current = leads || [];
      mergeAndApply(leadsDataRef.current, studentsDataRef.current);
    },
    [mergeAndApply]
  );

  const setUpcomingFollowUpsFromStudents = useCallback(
    (students) => {
      studentsDataRef.current = students || [];
      mergeAndApply(leadsDataRef.current, studentsDataRef.current);
    },
    [mergeAndApply]
  );

  const updateLeadInFollowUpList = useCallback(
    (leadId, updates) => {
      leadsDataRef.current = leadsDataRef.current.map((l) =>
        l.id === leadId ? { ...l, ...updates } : l
      );
      mergeAndApply(leadsDataRef.current, studentsDataRef.current);
    },
    [mergeAndApply]
  );

  const updateStudentInFollowUpList = useCallback(
    (studentId, updates) => {
      studentsDataRef.current = studentsDataRef.current.map((s) =>
        s.id === studentId ? { ...s, ...updates } : s
      );
      mergeAndApply(leadsDataRef.current, studentsDataRef.current);
    },
    [mergeAndApply]
  );

  const fetchFollowUpLeads = useCallback(async () => {
    if (!user?.id) return [];
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "100");
    params.set("sales_person", String(user.id));
    const { data } = await axios.get(`/leads/?${params.toString()}`);
    const list = data?.results ?? (Array.isArray(data) ? data : []);
    return list.filter((l) => String(l.sales_person) === String(user.id));
  }, [user?.id]);

  const fetchFollowUpStudents = useCallback(async () => {
    if (!user?.id) return [];
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "100");
    const { data } = await axios.get(`/students/?${params.toString()}`);
    return data?.results ?? (Array.isArray(data) ? data : []);
  }, [user?.id]);

  const fetchAllFollowUps = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [leads, students] = await Promise.all([
        fetchFollowUpLeads(),
        fetchFollowUpStudents(),
      ]);
      leadsDataRef.current = leads;
      studentsDataRef.current = students;
      mergeAndApply(leads, students);
    } catch (error) {
      console.error("Failed to refresh follow-ups:", error);
    }
  }, [user?.id, fetchFollowUpLeads, fetchFollowUpStudents, mergeAndApply]);

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
    fetchAllFollowUps();
    const refreshInterval = setInterval(fetchAllFollowUps, REFRESH_MS);
    return () => clearInterval(refreshInterval);
  }, [user?.id, fetchAllFollowUps]);

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
    scheduleFollowUpTimers(itemsRef.current);
  }, [serverTimeOffset, scheduleFollowUpTimers]);

  const value = {
    upcomingFollowUps,
    serverTimeOffset,
    setUpcomingFollowUpsFromLeads,
    setUpcomingFollowUpsFromStudents,
    updateLeadInFollowUpList,
    updateStudentInFollowUpList,
    syncTime,
    permission,
    requestPermission,
    unlockAudio,
  };

  return <FollowUpContext.Provider value={value}>{children}</FollowUpContext.Provider>;
};
