import { useCallback, useEffect, useRef, useState } from "react";
import axios from "@/axios";
import { normalizeStats } from "@/lib/dashboardStats";

function buildSalesHeaders(userId, userRole) {
  const headers = {};
  if (userId != null) headers["X-Sales-Person-Id"] = String(userId);
  if (userRole) headers["X-Sales-Person-Role"] = userRole;
  return headers;
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
export function useDashboardStats({ fromDate, toDate, userId, userRole, isManager }) {
  const [myStats, setMyStats] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMy, setErrorMy] = useState(false);
  const [errorTeam, setErrorTeam] = useState(false);
  const requestSeqRef = useRef(0);

  const loadStats = useCallback(
    async ({ manualRefresh = false } = {}) => {
      if (!userId) return;

      const requestSeq = ++requestSeqRef.current;
      const isStale = () => requestSeq !== requestSeqRef.current;

      const headers = buildSalesHeaders(userId, userRole);

      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoadingMy(true);
        setMyStats(null);
        if (isManager) {
          setLoadingTeam(true);
          setTeamStats(null);
        }
      }

      setErrorMy(false);
      setErrorTeam(false);

      const loadMyStats = async () => {
        try {
          const raw = await fetchStatsRange({
            from: fromDate,
            to: toDate,
            salesPersonId: userId,
            headers,
          });
          if (isStale()) return;
          setMyStats(normalizeStats(raw));
        } catch {
          if (isStale()) return;
          setErrorMy(true);
          if (!manualRefresh) setMyStats(null);
        } finally {
          if (!manualRefresh && !isStale()) setLoadingMy(false);
        }
      };

      const loadTeamStats = async () => {
        if (!isManager) {
          if (isStale()) return;
          setTeamStats(null);
          setErrorTeam(false);
          if (!manualRefresh) setLoadingTeam(false);
          return;
        }

        try {
          const raw = await fetchStatsRange({ from: fromDate, to: toDate, headers });
          if (isStale()) return;
          setTeamStats(normalizeStats(raw));
        } catch {
          if (isStale()) return;
          setErrorTeam(true);
          if (!manualRefresh) setTeamStats(null);
        } finally {
          if (!manualRefresh && !isStale()) setLoadingTeam(false);
        }
      };

      try {
        await Promise.all([loadMyStats(), loadTeamStats()]);
      } finally {
        if (manualRefresh) setRefreshing(false);
      }
    },
    [userId, userRole, isManager, fromDate, toDate]
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
  };
}
