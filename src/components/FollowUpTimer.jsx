"use client";

import React, { useState, useEffect } from "react";
import { useFollowUp } from "@/context/FollowUpProvider";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const FollowUpTimer = ({ followUpAt, className }) => {
  const { serverTimeOffset } = useFollowUp();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("scheduled"); // scheduled | soon | now | overdue

  useEffect(() => {
    if (!followUpAt) return;

    const SOON_MS = 15 * 60 * 1000; // 15 minutes
    const NOW_WINDOW_MS = 60 * 1000; // ±1 minute counts as "now"

    const formatDuration = (ms) => {
      const abs = Math.max(ms, 0);
      const minutes = Math.floor(abs / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      if (minutes > 0) return `${minutes}m`;
      const seconds = Math.floor(abs / 1000);
      return `${seconds}s`;
    };

    const compute = () => {
      const target = new Date(followUpAt).getTime();
      if (Number.isNaN(target)) {
        setText("—");
        setStatus("scheduled");
        return;
      }
      const nowServer = Date.now() - serverTimeOffset;
      const diff = target - nowServer; // positive = future

      if (diff > SOON_MS) {
        setStatus("scheduled");
        setText(`Scheduled in ${formatDuration(diff)}`);
      } else if (diff > NOW_WINDOW_MS) {
        setStatus("soon");
        setText(`Due soon (in ${formatDuration(diff)})`);
      } else if (diff >= -NOW_WINDOW_MS) {
        setStatus("now");
        setText("Due now");
      } else {
        setStatus("overdue");
        setText(`Overdue by ${formatDuration(diff * -1)}`);
      }
    };

    compute();
    const timer = setInterval(compute, 1000);
    return () => clearInterval(timer);
  }, [followUpAt, serverTimeOffset]);

  if (!followUpAt) return <span className="text-muted-foreground">—</span>;

  const color =
    status === "overdue" || status === "now"
      ? "text-red-600 dark:text-red-400"
      : status === "soon"
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium tabular-nums",
        color,
        className
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {text}
    </span>
  );
};
