import { useCallback, useEffect, useState } from "react";
import axios from "@/axios";
import { getStatsParams, normalizeStats } from "@/lib/dashboardStats";

function buildSalesHeaders(userId, userRole) {
  const headers = {};
  if (userId != null) headers["X-Sales-Person-Id"] = String(userId);
  if (userRole) headers["X-Sales-Person-Role"] = userRole;
  return headers;
}

async function fetchStatsSingleDay({ date, salesPersonId, headers }) {
  const params = new URLSearchParams({ date });
  if (salesPersonId != null) {
    params.set("sales_person", String(salesPersonId));
  }
  const { data } = await axios.get(`/stats/?${params.toString()}`, { headers });
  return data;
}

async function fetchStatsRange({ from, to, salesPersonId, headers }) {
  const params = new URLSearchParams({ from, to });
  if (salesPersonId != null) {
    params.set("sales_person", String(salesPersonId));
  }
  const { data } = await axios.get(`/stats/range/?${params.toString()}`, { headers });
  return data;
}

/**
 * Fetches my stats and (for manager) team stats for the given period.
 * Calls the API on mount and whenever the period or user changes.
 */
export function useDashboardStats({ preset, fromDate, toDate, userId, userRole, isManager }) {
  const { singleDay, date: singleDayDate } = getStatsParams(preset, fromDate, toDate);

  const [myStats, setMyStats] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMy, setErrorMy] = useState(false);
  const [errorTeam, setErrorTeam] = useState(false);

  const loadStats = useCallback(
    async ({ manualRefresh = false } = {}) => {
      if (!userId) return;

      const headers = buildSalesHeaders(userId, userRole);

      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoadingMy(true);
        if (isManager) setLoadingTeam(true);
      }

      setErrorMy(false);
      setErrorTeam(false);

      const loadMyStats = async () => {
        try {
          const raw = singleDay
            ? await fetchStatsSingleDay({ date: singleDayDate, salesPersonId: userId, headers })
            : await fetchStatsRange({ from: fromDate, to: toDate, salesPersonId: userId, headers });
          setMyStats(normalizeStats(raw));
        } catch {
          setErrorMy(true);
          if (!manualRefresh) setMyStats(null);
        } finally {
          if (!manualRefresh) setLoadingMy(false);
        }
      };

      const loadTeamStats = async () => {
        if (!isManager) {
          setTeamStats(null);
          setErrorTeam(false);
          if (!manualRefresh) setLoadingTeam(false);
          return;
        }

        try {
          const raw = singleDay
            ? await fetchStatsSingleDay({ date: singleDayDate, headers })
            : await fetchStatsRange({ from: fromDate, to: toDate, headers });
          setTeamStats(normalizeStats(raw));
        } catch {
          setErrorTeam(true);
          if (!manualRefresh) setTeamStats(null);
        } finally {
          if (!manualRefresh) setLoadingTeam(false);
        }
      };

      try {
        await Promise.all([loadMyStats(), loadTeamStats()]);
      } finally {
        if (manualRefresh) setRefreshing(false);
      }
    },
    [userId, userRole, isManager, singleDay, singleDayDate, fromDate, toDate]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshStats = useCallback(() => loadStats({ manualRefresh: true }), [loadStats]);

  const loading = loadingMy || (isManager && loadingTeam);

  return {
    myStats,
    teamStats,
    loadingMy,
    loadingTeam,
    loading,
    refreshing,
    errorMy,
    errorTeam,
    refreshStats,
    singleDay,
  };
}
