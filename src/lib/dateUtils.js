/**
 * Date range presets for dashboard and analytics.
 */

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function getRangeForPreset(preset) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = new Date(today);
  let from = new Date(today);

  switch (preset) {
    case "today":
      return { from: todayStr(), to: todayStr() };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const ys = y.toISOString().slice(0, 10);
      return { from: ys, to: ys };
    }
    case "this_week": {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      from.setDate(from.getDate() + mondayOffset);
      return { from: from.toISOString().slice(0, 10), to: todayStr() };
    }
    case "last7": {
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString().slice(0, 10), to: todayStr() };
    }
    case "this_month": {
      from.setDate(1);
      return { from: from.toISOString().slice(0, 10), to: todayStr() };
    }
    case "last_month": {
      from.setMonth(from.getMonth() - 1);
      from.setDate(1);
      const toLast = new Date(from.getFullYear(), from.getMonth() + 1, 0);
      return {
        from: from.toISOString().slice(0, 10),
        to: toLast.toISOString().slice(0, 10),
      };
    }
    default:
      return { from: todayStr(), to: todayStr() };
  }
}
