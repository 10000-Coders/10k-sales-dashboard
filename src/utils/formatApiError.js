const SKIP_KEYS = new Set([
  "failed_count",
  "failed_truncated",
  "invalid_lead_ids",
  "created_count",
  "skipped_count",
  "created",
  "skipped",
  "failed",
  "errors_summary",
]);

function formatValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "object" && item !== null ? formatApiError(item, "") : String(item)))
      .filter(Boolean)
      .join("; ");
  }
  if (typeof value === "object") return formatApiError(value, "");
  return String(value);
}

/**
 * Turn Django REST / API error payloads into a user-facing string.
 */
export function formatApiError(payload, fallback = "Something went wrong.") {
  if (payload == null) return fallback;
  if (typeof payload === "string") return payload;

  if (typeof payload !== "object") return fallback;

  const { detail, non_field_errors: nonFieldErrors } = payload;

  if (detail != null) {
    return formatValue(detail) || fallback;
  }

  if (nonFieldErrors != null) {
    const msg = formatValue(nonFieldErrors);
    if (msg) return msg;
  }

  const parts = [];
  for (const [key, value] of Object.entries(payload)) {
    if (SKIP_KEYS.has(key) || key === "non_field_errors") continue;
    const msg = formatValue(value);
    if (!msg) continue;
    const label = key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    parts.push(`${label}: ${msg}`);
  }

  return parts.length ? parts.join(" ") : fallback;
}
