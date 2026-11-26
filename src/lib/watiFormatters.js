/** Format WATI timestamps for display (en-IN). */
export function formatWatiDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWatiDate(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatWatiNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return "0";
  return Number(n).toLocaleString("en-IN");
}

/** Badge tone for message / campaign status. */
export function watiStatusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("fail") || s.includes("error")) return "fail";
  if (s.includes("read") || s.includes("complete") || s.includes("success")) return "ok";
  if (s.includes("deliver") || s.includes("run") || s.includes("process") || s.includes("queue")) {
    return "run";
  }
  if (s.includes("reply") || s.includes("warn") || s.includes("no response") || s.includes("stop")) {
    return "warn";
  }
  return "neutral";
}
