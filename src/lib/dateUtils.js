/**
 * Date range presets for dashboard and analytics.
 * Always use the user's local calendar date (not UTC via toISOString) to avoid
 * off-by-one errors in timezones ahead of UTC (e.g. India IST).
 */

/** Format a Date as YYYY-MM-DD in local timezone. */
export function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayStr() {
  return formatLocalDate(new Date());
}

export function getRangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let from = new Date(today);

  switch (preset) {
    case "today":
      return { from: formatLocalDate(today), to: formatLocalDate(today) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const ys = formatLocalDate(y);
      return { from: ys, to: ys };
    }
    case "this_week": {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      from.setDate(from.getDate() + mondayOffset);
      return { from: formatLocalDate(from), to: formatLocalDate(today) };
    }
    case "last7": {
      from.setDate(from.getDate() - 6);
      return { from: formatLocalDate(from), to: formatLocalDate(today) };
    }
    case "this_month": {
      from.setDate(1);
      return { from: formatLocalDate(from), to: formatLocalDate(today) };
    }
    case "last_month": {
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      const toLast = new Date(from.getFullYear(), from.getMonth() + 1, 0);
      return {
        from: formatLocalDate(from),
        to: formatLocalDate(toLast),
      };
    }
    default:
      return { from: formatLocalDate(today), to: formatLocalDate(today) };
  }
}
