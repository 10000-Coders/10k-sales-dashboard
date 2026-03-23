import { useGetStatsSingleDayQuery, useGetStatsRangeQuery } from "@/redux/features/dashboard/dashboardApi";
import { getStatsParams, normalizeStats } from "@/lib/dashboardStats";

/**
 * Fetches my stats and (for manager) team stats for the given period.
 * Returns normalized stats, loading/error state, and refetch helpers.
 */
export function useDashboardStats({ preset, fromDate, toDate, userId, isManager }) {
  const { singleDay, date: singleDayDate } = getStatsParams(preset, fromDate, toDate);

  const mySingle = useGetStatsSingleDayQuery(
    { date: singleDayDate, salesPersonId: userId },
    { skip: !userId || !singleDay }
  );
  const myRange = useGetStatsRangeQuery(
    { from: fromDate, to: toDate, salesPersonId: userId },
    { skip: !userId || singleDay }
  );
  const myStatsRaw = singleDay ? mySingle.data : myRange.data;
  const myStats = normalizeStats(myStatsRaw);
  const loadingMy = mySingle.isLoading || myRange.isLoading;
  const errorMy = mySingle.isError || myRange.isError;
  const refetchMy = () => (singleDay ? mySingle.refetch() : myRange.refetch());

  const teamSingle = useGetStatsSingleDayQuery(
    { date: singleDayDate },
    { skip: !isManager || !singleDay }
  );
  const teamRange = useGetStatsRangeQuery(
    { from: fromDate, to: toDate },
    { skip: !isManager || singleDay }
  );
  const teamStatsRaw = singleDay ? teamSingle.data : teamRange.data;
  const teamStats = normalizeStats(teamStatsRaw);
  const loadingTeam = teamSingle.isLoading || teamRange.isLoading;
  const errorTeam = teamSingle.isError || teamRange.isError;
  const refetchTeam = () => (singleDay ? teamSingle.refetch() : teamRange.refetch());

  const loading = loadingMy || (isManager && loadingTeam);

  return {
    myStats,
    teamStats,
    loadingMy,
    loadingTeam,
    loading,
    errorMy,
    errorTeam,
    refetchMy,
    refetchTeam,
    singleDay,
  };
}
