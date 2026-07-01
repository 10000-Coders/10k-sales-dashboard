"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFollowUp } from "@/context/FollowUpProvider";
import { Bell, Calendar, ChevronRight, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FollowUpTimer } from "./FollowUpTimer";
import { toast } from "react-toastify";

export const FollowUpNotification = () => {
  const router = useRouter();
  const { upcomingFollowUps, serverTimeOffset, permission, requestPermission } = useFollowUp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeFollowUps = upcomingFollowUps
    .filter((item) => {
      const due = new Date(item.followUpAt).getTime();
      const now = Date.now() - serverTimeOffset;
      return due - now < 3600000; // due in next 1 hour or overdue
    })
    .sort((a, b) => new Date(a.followUpAt) - new Date(b.followUpAt));

  const leadCount = activeFollowUps.filter((i) => i.type === "lead").length;
  const studentCount = activeFollowUps.filter((i) => i.type === "student").length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEnableAlerts = async (e) => {
    e.stopPropagation();
    const result = await requestPermission();
    if (result === "granted") {
      toast.success(
        "Desktop alerts enabled. Keep one dashboard tab open; reminders appear even on WhatsApp or other sites."
      );
    } else if (result === "denied") {
      toast.warn(
        "Notifications are blocked. Allow them in your browser site settings for this dashboard."
      );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        title={
          permission !== "granted"
            ? "Enable desktop alerts for follow-up reminders"
            : "Follow-up reminders"
        }
      >
        <Bell className="h-5 w-5" />
        {permission !== "granted" ? (
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
        ) : null}
        {activeFollowUps.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {activeFollowUps.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-white shadow-xl dark:bg-slate-900">
          {permission !== "granted" && (
            <div className="border-b bg-amber-50 px-4 py-3 dark:bg-amber-950/40">
              <p className="text-xs text-amber-950 dark:text-amber-100">
                Click below and allow notifications in your browser. Keep one dashboard tab
                open (can be in the background). Sound plays when you are on the dashboard tab.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2 w-full gap-2"
                onClick={handleEnableAlerts}
              >
                <BellRing className="h-4 w-4" />
                Enable desktop alerts
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Upcoming Follow-ups</h3>
            <span className="text-xs text-muted-foreground">
              {activeFollowUps.length} active
              {leadCount > 0 || studentCount > 0
                ? ` · ${leadCount} lead${leadCount === 1 ? "" : "s"}${studentCount > 0 ? `, ${studentCount} student${studentCount === 1 ? "" : "s"}` : ""}`
                : ""}
            </span>
          </div>
          <div className="max-h-[400px] overflow-auto py-2">
            {activeFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No urgent follow-ups</p>
              </div>
            ) : (
              activeFollowUps.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  className="flex w-full items-start gap-3 border-b border-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50 last:border-0"
                  onClick={() => {
                    router.push(item.href);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          item.type === "student"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.type === "student" ? "Student" : "Lead"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <FollowUpTimer followUpAt={item.followUpAt} className="text-xs" />
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          {activeFollowUps.length > 0 && (
            <div className="flex gap-2 border-t px-4 py-2">
              {leadCount > 0 && (
                <Button
                  variant="link"
                  className="h-auto flex-1 p-0 text-xs text-primary"
                  onClick={() => {
                    router.push("/leads");
                    setIsOpen(false);
                  }}
                >
                  View leads
                </Button>
              )}
              {studentCount > 0 && (
                <Button
                  variant="link"
                  className="h-auto flex-1 p-0 text-xs text-primary"
                  onClick={() => {
                    router.push("/students");
                    setIsOpen(false);
                  }}
                >
                  View students
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
