"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "@/axios";
import baseAxios from "axios";
import { toast } from "react-toastify";

const FollowUpContext = createContext(null);

export const useFollowUp = () => {
  const context = useContext(FollowUpContext);
  if (!context) {
    throw new Error("useFollowUp must be used within a FollowUpProvider");
  }
  return context;
};

export const FollowUpProvider = ({ children }) => {
  const user = useSelector((state) => state.userAuth?.user);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState([]);
  const [serverTimeOffset, setServerTimeOffset] = useState(0); // localTime - serverTime in ms
  const [permission, setPermission] = useState("default");

  const leadsRef = useRef([]);
  const audioCtxRef = useRef(null);

  // Base URL for non-sales APIs
  const baseUrl = process.env.NEXT_PUBLIC_baseUrl || "";

  // 1. Sync Time
  const syncTime = useCallback(async () => {
    try {
      const start = Date.now();
      const endpoint = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/student/server-time/` : "/api/student/server-time/";
      const response = await baseAxios.get(endpoint);
      const serverTimeStr = response.data.datetime;
      const serverTime = new Date(serverTimeStr).getTime();
      const end = Date.now();
      const latency = (end - start) / 2;
      
      // serverTimeOffset = localTime - (serverTime + latency)
      setServerTimeOffset(Date.now() - (serverTime + latency));
    } catch (error) {
      console.error("Failed to sync server time:", error);
    }
  }, [baseUrl]);

  // 2. Fetch Leads
  const fetchMyLeads = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams();
      params.set("sales_person", user.id);
      // We don't filter in backend because we want to show all leads in the provider's logic if needed
      // but primarily we need next_follow_up_at
      const { data } = await axios.get(`/leads/?${params.toString()}`);
      const list = data?.results ?? (Array.isArray(data) ? data : []);
      
      const filtered = list.filter(l => l.next_follow_up_at && l.status !== 'enrolled');
      setUpcomingFollowUps(filtered);
      leadsRef.current = filtered;
    } catch (error) {
      console.error("Failed to fetch leads for follow-up:", error);
    }
  }, [user?.id]);

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
    
    syncTime();
    const timeSyncInterval = setInterval(syncTime, 600000); // Sync time every 10m
    
    return () => clearInterval(timeSyncInterval);
  }, [syncTime]);

  useEffect(() => {
    if (user?.id) {
      fetchMyLeads();
      const leadPollingInterval = setInterval(fetchMyLeads, 120000); // Poll leads every 2m
      return () => clearInterval(leadPollingInterval);
    }
  }, [user?.id, fetchMyLeads]);

  useEffect(() => {
    const notificationCheckInterval = setInterval(checkNotifications, 10000); // Check every 10s
    return () => clearInterval(notificationCheckInterval);
  }, [checkNotifications]);

  const value = {
    upcomingFollowUps,
    serverTimeOffset,
    fetchMyLeads,
    syncTime,
    permission,
    requestPermission: () => Notification.requestPermission().then(setPermission)
  };

  return <FollowUpContext.Provider value={value}>{children}</FollowUpContext.Provider>;
};
