import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getDynamicHeader } from "@/interceptManager";

const base = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_baseUrl || "" : "";
const salesBase = base ? `${base.replace(/\/$/, "")}/sales` : "/api/sales";

/** How long to keep unused stats in cache (seconds). */
const STATS_CACHE_SECONDS = 5 * 60;

const baseQuery = fetchBaseQuery({
  baseUrl: salesBase,
  prepareHeaders: (headers, { getState }) => {
    const { token } = getDynamicHeader();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const user = getState()?.userAuth?.user;
    if (user?.id != null) {
      headers.set("X-Sales-Person-Id", String(user.id));
    }
    if (user?.role) {
      headers.set("X-Sales-Person-Role", user.role);
    }
    return headers;
  },
});

/** Log stats API errors for debugging; can be replaced with Sentry etc. */
const baseQueryWithErrorLogging = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error) {
    console.error("[Dashboard stats]", result.error.status, result.error.data ?? result.error.error);
  }
  return result;
};

/**
 * RTK Query API for dashboard stats. Cache is keyed by (date/range + salesPersonId).
 * Cache is cleared on logout via store middleware.
 * In-flight requests are automatically cancelled when query args change (preset/date/user).
 */
export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: baseQueryWithErrorLogging,
  keepUnusedDataFor: STATS_CACHE_SECONDS,
  endpoints: (builder) => ({
    getStatsSingleDay: builder.query({
      query: ({ date, salesPersonId }) => {
        const params = new URLSearchParams({ date });
        if (salesPersonId != null) {
          params.set("sales_person", String(salesPersonId));
        }
        return { url: `/stats/?${params.toString()}` };
      },
    }),
    getStatsRange: builder.query({
      query: ({ from, to, salesPersonId }) => {
        const params = new URLSearchParams({ from, to });
        if (salesPersonId != null) {
          params.set("sales_person", String(salesPersonId));
        }
        return { url: `/stats/range/?${params.toString()}` };
      },
    }),
  }),
});

export const { useGetStatsSingleDayQuery, useGetStatsRangeQuery, useLazyGetStatsSingleDayQuery, useLazyGetStatsRangeQuery } = dashboardApi;
