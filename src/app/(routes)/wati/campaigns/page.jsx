"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import withPrivateAuth from "@/components/withPrivateAuth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import CampaignWorkspaceFilters from "@/components/wati/CampaignWorkspaceFilters";
import CampaignOverviewMetricTiles from "@/components/wati/CampaignOverviewMetricTiles";
import CampaignReachSummary from "@/components/wati/CampaignReachSummary";
import CampaignRecipientsTable from "@/components/wati/CampaignRecipientsTable";
import RecipientDetailDrawer from "@/components/wati/RecipientDetailDrawer";
import { Button } from "@/components/ui/button";
import {
  WATI_CAMPAIGNS_PAGE_SIZE,
  WATI_TABLE_PAGE_SIZE,
  closeRecipientDrawer,
  fetchCampaignDetail,
  fetchOverview,
  fetchRecipientDrawer,
  fetchRecipients,
  openRecipientDrawer,
} from "@/redux/features/wati/watiSlice";
import { getRangeForPreset } from "@/lib/dateUtils";
import { useDebounce } from "@/hooks/useDebounce";

function WatiCampaignsPageInner() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const overview = useSelector((state) => state.wati.overview);
  const detail = useSelector((state) => state.wati.detail);
  const recipients = useSelector((state) => state.wati.recipients);
  const drawer = useSelector((state) => state.wati.drawer);

  const campaignFromUrl = searchParams?.get("campaign") || "all";

  const [selectedCampaign, setSelectedCampaign] = useState(
    campaignFromUrl && campaignFromUrl !== "all" ? campaignFromUrl : "all"
  );
  const [preset, setPreset] = useState("last30");
  const initialRange = getRangeForPreset("last30");
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [filterSources, setFilterSources] = useState([]);
  const [overviewPage, setOverviewPage] = useState(1);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const sourceFilterParam = filterSources.join(",");

  const debouncedSearch = useDebounce(search, 400);
  const isAll = !selectedCampaign || selectedCampaign === "all";

  useEffect(() => {
    const fromUrl = searchParams?.get("campaign");
    if (fromUrl && fromUrl !== selectedCampaign) {
      setSelectedCampaign(fromUrl === "all" || !fromUrl ? "all" : fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounced search applies automatically
  useEffect(() => {
    setRecipientsPage(1);
    setAppliedSearch(debouncedSearch.trim());
  }, [debouncedSearch]);

  // Filters auto-apply — refetch whenever selection changes
  useEffect(() => {
    dispatch(
      fetchOverview({
        date_from: dateFrom,
        date_to: dateTo,
        page: overviewPage,
        page_size: WATI_CAMPAIGNS_PAGE_SIZE,
        refresh: false,
      })
    );
  }, [dispatch, dateFrom, dateTo, overviewPage]);

  useEffect(() => {
    if (isAll) return;
    dispatch(fetchCampaignDetail(selectedCampaign));
  }, [dispatch, isAll, selectedCampaign]);

  useEffect(() => {
    dispatch(
      fetchRecipients({
        broadcastId: isAll ? "" : selectedCampaign,
        search: appliedSearch,
        message_status: messageStatus,
        source: sourceFilterParam,
        date_from: dateFrom,
        date_to: dateTo,
        page: recipientsPage,
        page_size: WATI_TABLE_PAGE_SIZE,
        unique: isAll,
        refresh: false,
      })
    );
  }, [
    dispatch,
    isAll,
    selectedCampaign,
    appliedSearch,
    messageStatus,
    sourceFilterParam,
    dateFrom,
    dateTo,
    recipientsPage,
  ]);

  const syncCampaignUrl = useCallback(
    (campaignId) => {
      const q = new URLSearchParams(searchParams?.toString() || "");
      q.delete("tab");
      q.delete("outbound");
      if (!campaignId || campaignId === "all") q.delete("campaign");
      else q.set("campaign", campaignId);
      const qs = q.toString();
      router.replace(qs ? `/wati/campaigns?${qs}` : "/wati/campaigns");
    },
    [router, searchParams]
  );

  const handleRefresh = useCallback(async () => {
    setAppliedSearch(search.trim());
    setRefreshing(true);
    try {
      const campaignId = selectedCampaign && selectedCampaign !== "all" ? selectedCampaign : "";
      await Promise.all([
        dispatch(
          fetchOverview({
            date_from: dateFrom,
            date_to: dateTo,
            page: overviewPage,
            page_size: WATI_CAMPAIGNS_PAGE_SIZE,
            refresh: true,
          })
        ),
        dispatch(
          fetchRecipients({
            broadcastId: campaignId,
            search: search.trim(),
            message_status: messageStatus,
            source: sourceFilterParam,
            date_from: dateFrom,
            date_to: dateTo,
            page: recipientsPage,
            page_size: WATI_TABLE_PAGE_SIZE,
            unique: !campaignId,
            refresh: true,
          })
        ),
        campaignId ? dispatch(fetchCampaignDetail(campaignId)) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    dispatch,
    search,
    selectedCampaign,
    dateFrom,
    dateTo,
    overviewPage,
    messageStatus,
    sourceFilterParam,
    recipientsPage,
  ]);

  const handleCampaignChange = useCallback(
    (value) => {
      const next = value || "all";
      setSelectedCampaign(next);
      setRecipientsPage(1);
      setSearch("");
      setAppliedSearch("");
      dispatch(closeRecipientDrawer());
      syncCampaignUrl(next);
    },
    [dispatch, syncCampaignUrl]
  );

  const handlePresetChange = useCallback((value) => {
    setPreset(value);
    const range = getRangeForPreset(value);
    setDateFrom(range.from);
    setDateTo(range.to);
    setOverviewPage(1);
    setRecipientsPage(1);
  }, []);

  const handleDateFromChange = useCallback((value) => {
    setPreset("");
    setDateFrom(value);
    setOverviewPage(1);
    setRecipientsPage(1);
  }, []);

  const handleDateToChange = useCallback((value) => {
    setPreset("");
    setDateTo(value);
    setOverviewPage(1);
    setRecipientsPage(1);
  }, []);

  const campaignOptions = useMemo(() => {
    const rows = overview.data?.results || [];
    const opts = rows.map((r) => ({
      value: String(r.id),
      label: r.name || r.id,
    }));
    if (
      !isAll &&
      selectedCampaign &&
      !opts.some((o) => o.value === String(selectedCampaign))
    ) {
      const name = detail.data?.name || selectedCampaign;
      opts.unshift({ value: String(selectedCampaign), label: name });
    }
    return opts;
  }, [overview.data?.results, isAll, selectedCampaign, detail.data?.name]);

  const filtersActive = Boolean(appliedSearch || messageStatus || sourceFilterParam);
  // When filters are on, only use filter_metrics — never fall back to unfiltered `metrics`
  // (pending clears filter_metrics; falling back would flash overall campaign totals).
  const filteredMetrics = filtersActive
    ? recipients.data?.filter_metrics ?? null
    : null;
  const overviewMetrics = filtersActive
    ? filteredMetrics
    : overview.data?.overview_metrics || null;
  const reachMetrics = filtersActive ? filteredMetrics : detail.data;
  const overviewLoading = filtersActive
    ? recipients.loading || filteredMetrics == null
    : overview.loading && !overviewMetrics;
  const reachLoading = filtersActive
    ? recipients.loading || filteredMetrics == null
    : detail.loading && !detail.data;

  const openDrawerFor = useCallback(
    (row) => {
      const phone = row.phone;
      const leadOrPhone = row.lead_id != null ? String(row.lead_id) : phone;
      const broadcastId = row.broadcast_id || (!isAll ? selectedCampaign : null);
      if ((!phone && !leadOrPhone) || !broadcastId) return;
      const previewName =
        row.display_name || row.lead_name || (phone ? `Contact · ${phone}` : null);
      dispatch(openRecipientDrawer({ phone, leadOrPhone, previewName }));
      dispatch(
        fetchRecipientDrawer({
          broadcastId,
          leadOrPhone: leadOrPhone || phone,
          phone: phone || leadOrPhone,
          // Scope chat to this send only when a single campaign is selected.
          scopeCampaign: !isAll,
        })
      );
    },
    [dispatch, isAll, selectedCampaign]
  );

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">WATI campaigns</CardTitle>
              <CardDescription>
                Broadcast analytics from WATI. Filters apply automatically. Use Refresh to pull the
                latest campaigns from WATI.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-2 shrink-0"
              disabled={refreshing || overview.loading || recipients.loading}
              onClick={handleRefresh}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <CampaignWorkspaceFilters
        campaignOptions={campaignOptions}
        selectedCampaign={selectedCampaign}
        onCampaignChange={handleCampaignChange}
        preset={preset}
        onPresetChange={handlePresetChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => setAppliedSearch(search.trim())}
        messageStatus={messageStatus}
        onMessageStatusChange={(value) => {
          setMessageStatus(value);
          setRecipientsPage(1);
        }}
        filterSources={filterSources}
        onFilterSourcesChange={(values) => {
          setFilterSources(values);
          setRecipientsPage(1);
        }}
      />

      {isAll ? (
        <>
          {overview.error ? <p className="text-sm text-destructive">{overview.error}</p> : null}
          <CampaignOverviewMetricTiles metrics={overviewMetrics} loading={overviewLoading} />
        </>
      ) : (
        <>
          {detail.error || recipients.error ? (
            <p className="text-sm text-destructive">{detail.error || recipients.error}</p>
          ) : null}
          <CampaignReachSummary
            metrics={reachMetrics}
            loading={reachLoading}
            messageStatus={messageStatus}
          />
        </>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          {isAll ? "Unique students & contacts" : "Students & contacts"}
        </h2>
        {isAll ? (
          <p className="text-xs text-muted-foreground">
            One row per phone across campaigns in this date range. CRM student details are shown when
            matched.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Recipients for this campaign with WA delivery and response.
          </p>
        )}
        <CampaignRecipientsTable
          results={recipients.data?.results || []}
          loading={recipients.loading}
          error={recipients.error}
          page={recipients.data?.page || recipientsPage}
          count={recipients.data?.count || 0}
          pageSize={recipients.data?.page_size || WATI_TABLE_PAGE_SIZE}
          onPageChange={setRecipientsPage}
          onRowClick={openDrawerFor}
          showSearch={false}
          showCampaign={false}
          studentFocused={isAll}
          emptyMessage="No students or contacts found for this period and filters."
        />
      </div>

      <RecipientDetailDrawer
        open={drawer.open}
        loading={drawer.loading}
        error={drawer.error}
        data={drawer.data}
        previewName={drawer.previewName}
        previewPhone={drawer.phone}
        onClose={() => dispatch(closeRecipientDrawer())}
      />
    </div>
  );
}

function WatiCampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WatiCampaignsPageInner />
    </Suspense>
  );
}

export default withPrivateAuth(WatiCampaignsPage);
