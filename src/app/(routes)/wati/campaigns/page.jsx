"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import withPrivateAuth from "@/components/withPrivateAuth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Megaphone, RefreshCw } from "lucide-react";
import CampaignWorkspaceFilters, {
  MESSAGE_STATUS_FILTER_OPTIONS,
  WA_RESPONSE_FILTER_OPTIONS,
  TEXT_REPLY_OPTION,
} from "@/components/wati/CampaignWorkspaceFilters";
import CreateCampaignDrawer from "@/components/wati/CreateCampaignDrawer";
import CampaignOverviewMetricTiles from "@/components/wati/CampaignOverviewMetricTiles";
import CampaignReachSummary from "@/components/wati/CampaignReachSummary";
import CampaignRecipientsTable from "@/components/wati/CampaignRecipientsTable";
import CampaignsTable from "@/components/wati/CampaignsTable";
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

const SYNC_POLL_INTERVAL_MS = 15000;

// Follow-up audience selection on a single campaign:
//   all  -> every recipient matching the filters (all pages) minus `excluded` phones
//   some -> only the `included` phones the manager ticked
const ALL_SELECTION = { mode: "all", excluded: new Map(), included: new Map() };
const EMPTY_PICK = { mode: "some", excluded: new Map(), included: new Map() };
// After a manual Refresh only: poll briefly while snapshots finish syncing.
const SYNC_POLL_MAX_MS = 60000;

function formatSyncedAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

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
  const [waResponse, setWaResponse] = useState("");
  // WA status filter (button label / "__text__"); only applies while WA response = Responded.
  const [waReply, setWaReply] = useState("");
  const [replyOptions, setReplyOptions] = useState([]);
  const [filterSources, setFilterSources] = useState([]);
  const [recipientsPage, setRecipientsPage] = useState(1);
  // Last activity sort for the recipients table: "" (WATI order) | "-last_activity" | "last_activity".
  const [recipientOrdering, setRecipientOrdering] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // { [campaignId]: row } — survives paging, cleared when the date range changes.
  const [selectedCampaignRows, setSelectedCampaignRows] = useState({});
  const [audienceSelection, setAudienceSelection] = useState(ALL_SELECTION);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  // Silent overview polling only after the user clicks Refresh (not on every page open).
  const [overviewPollEnabled, setOverviewPollEnabled] = useState(false);
  const sourceFilterParam = filterSources.join(",");

  const debouncedSearch = useDebounce(search, 400);
  const isAll = !selectedCampaign || selectedCampaign === "all";
  // `selectedCampaign` is "all", one id, or "id1,id2,…" (combined view of several campaigns).
  const selectedCampaignIds = useMemo(
    () => (isAll ? [] : String(selectedCampaign).split(",").filter(Boolean)),
    [isAll, selectedCampaign]
  );
  const isMulti = selectedCampaignIds.length > 1;
  const showReplyColumn = !isAll && waResponse === "responded";
  const replyFilter = showReplyColumn ? waReply : "";

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

  // Load snapshot-backed overview only (no refresh=1). Manual Refresh enqueues WATI sync.
  useEffect(() => {
    dispatch(
      fetchOverview({
        date_from: dateFrom,
        date_to: dateTo,
        page: 1,
        page_size: WATI_CAMPAIGNS_PAGE_SIZE,
        refresh: false,
      })
    );
  }, [dispatch, dateFrom, dateTo]);

  // Single campaign: cached detail only. Re-sync from WATI happens on Refresh.
  useEffect(() => {
    if (isAll) return;
    dispatch(fetchCampaignDetail(selectedCampaign));
  }, [dispatch, isAll, selectedCampaign]);

  useEffect(() => {
    // All view is campaign-centric; recipients load only for a single campaign.
    if (isAll) return;
    dispatch(
      fetchRecipients({
        broadcastId: selectedCampaign,
        search: appliedSearch,
        message_status: messageStatus,
        wa_response: waResponse,
        sales_outcome: replyFilter,
        source: sourceFilterParam,
        date_from: dateFrom,
        date_to: dateTo,
        page: recipientsPage,
        page_size: WATI_TABLE_PAGE_SIZE,
        ordering: recipientOrdering,
        refresh: false,
      })
    );
  }, [
    recipientOrdering,
    dispatch,
    isAll,
    selectedCampaign,
    appliedSearch,
    messageStatus,
    waResponse,
    replyFilter,
    sourceFilterParam,
    dateFrom,
    dateTo,
    recipientsPage,
  ]);

  // After manual Refresh only: poll overview while snapshots report syncing (15s, max 60s).
  const pollStartedAtRef = useRef(0);
  const [pollExpired, setPollExpired] = useState(false);
  const overviewSyncing = Boolean(isAll && overview.data?.syncing);
  useEffect(() => {
    if (!overviewPollEnabled || !overviewSyncing || pollExpired) return undefined;
    if (!pollStartedAtRef.current) pollStartedAtRef.current = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - pollStartedAtRef.current > SYNC_POLL_MAX_MS) {
        clearInterval(timer);
        setPollExpired(true);
        setOverviewPollEnabled(false);
        return;
      }
      dispatch(
        fetchOverview({
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          page_size: WATI_CAMPAIGNS_PAGE_SIZE,
          silent: true,
        })
      );
    }, SYNC_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [overviewPollEnabled, overviewSyncing, pollExpired, dispatch, dateFrom, dateTo]);
  useEffect(() => {
    if (!overviewSyncing) {
      pollStartedAtRef.current = 0;
      setOverviewPollEnabled(false);
    }
  }, [overviewSyncing]);
  useEffect(() => {
    pollStartedAtRef.current = 0;
    setPollExpired(false);
    setOverviewPollEnabled(false);
  }, [dateFrom, dateTo]);
  const showSyncing = Boolean(overviewSyncing && overviewPollEnabled && !pollExpired);
  const lastSyncedAt = isAll ? overview.data?.last_synced_at : detail.data?.synced_at;

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
      // Single campaign: the detail refresh rebuilds the contact list from WATI (and re-checks
      // "failed" contacts against their chats) — load the table only after it finishes, so
      // the table shows the corrected statuses instead of a half-rebuilt list.
      if (campaignId) {
        await dispatch(fetchCampaignDetail({ broadcastId: campaignId, refresh: true }));
      }
      await Promise.all([
        // All view: enqueue a background WATI sync for this page's campaigns.
        // Single campaign: only that campaign is recomputed (detail refresh below).
        dispatch(
          fetchOverview({
            date_from: dateFrom,
            date_to: dateTo,
            page: 1,
            page_size: WATI_CAMPAIGNS_PAGE_SIZE,
            refresh: !campaignId,
          })
        ),
        campaignId
          ? dispatch(
              fetchRecipients({
                broadcastId: campaignId,
                search: search.trim(),
                message_status: messageStatus,
                wa_response: waResponse,
                sales_outcome: replyFilter,
                source: sourceFilterParam,
                date_from: dateFrom,
                date_to: dateTo,
                page: recipientsPage,
                page_size: WATI_TABLE_PAGE_SIZE,
                ordering: recipientOrdering,
                refresh: true,
              })
            )
          : Promise.resolve(),
      ]);
      pollStartedAtRef.current = Date.now();
      setPollExpired(false);
      // All-campaigns Refresh may enqueue background sync — allow brief silent polls.
      if (!campaignId) setOverviewPollEnabled(true);
    } finally {
      setRefreshing(false);
    }
  }, [
    dispatch,
    search,
    selectedCampaign,
    dateFrom,
    dateTo,
    messageStatus,
    waResponse,
    replyFilter,
    sourceFilterParam,
    recipientsPage,
    recipientOrdering,
  ]);

  /** Accepts one id, "all", or an array of ids (multi-select / "Open selected"). */
  const handleCampaignChange = useCallback(
    (value) => {
      const ids = Array.isArray(value)
        ? value.map(String).filter(Boolean)
        : value && value !== "all"
          ? [String(value)]
          : [];
      const next = ids.length ? ids.join(",") : "all";
      // Adding/removing campaigns keeps the student filters; going to or from the All view
      // (a different screen) starts them fresh.
      const crossesAll = next === "all" || isAll;
      setSelectedCampaign(next);
      setRecipientsPage(1);
      if (crossesAll) {
        setSearch("");
        setAppliedSearch("");
        setWaResponse("");
        setWaReply("");
        setReplyOptions([]);
      }
      dispatch(closeRecipientDrawer());
      syncCampaignUrl(next);
    },
    [dispatch, syncCampaignUrl, isAll]
  );

  const handlePresetChange = useCallback((value) => {
    setPreset(value);
    const range = getRangeForPreset(value);
    setDateFrom(range.from);
    setDateTo(range.to);
    setSelectedCampaignRows({});
    setRecipientsPage(1);
  }, []);

  const handleDateFromChange = useCallback((value) => {
    setPreset("");
    setDateFrom(value);
    setSelectedCampaignRows({});
    setRecipientsPage(1);
  }, []);

  const handleDateToChange = useCallback((value) => {
    setPreset("");
    setDateTo(value);
    setSelectedCampaignRows({});
    setRecipientsPage(1);
  }, []);

  const campaignOptions = useMemo(() => {
    const rows = overview.data?.results || [];
    const opts = rows.map((r) => ({
      value: String(r.id),
      label: r.name || r.id,
    }));
    // Selected campaigns outside the loaded date range still need a named option.
    const namesFromDetail = {};
    if (isMulti) {
      (detail.data?.campaigns || []).forEach((c) => {
        if (c?.id) namesFromDetail[String(c.id)] = c.name || c.id;
      });
    } else if (detail.data?.id) {
      namesFromDetail[String(detail.data.id)] = detail.data.name || detail.data.id;
    }
    selectedCampaignIds
      .filter((id) => !opts.some((o) => o.value === id))
      .reverse()
      .forEach((id) => opts.unshift({ value: id, label: namesFromDetail[id] || id }));
    return opts;
  }, [overview.data?.results, isMulti, selectedCampaignIds, detail.data]);

  // Student filters only apply to a single campaign; ignore them on the All view.
  const filtersActive =
    !isAll &&
    Boolean(appliedSearch || messageStatus || waResponse || replyFilter || sourceFilterParam);
  // When filters are on, only use filter_metrics — never fall back to unfiltered `metrics`
  // (pending clears filter_metrics; falling back would flash overall campaign totals).
  const filteredMetrics = filtersActive
    ? recipients.data?.filter_metrics ?? null
    : null;
  const overviewMetrics = filtersActive
    ? filteredMetrics
    : overview.data?.overview_metrics || null;
  // Donuts are a fixed campaign summary — filters only narrow the Students & contacts table.
  const reachMetrics = detail.data;
  const overviewLoading = filtersActive
    ? recipients.loading || filteredMetrics == null
    : overview.loading && !overviewMetrics;
  const reachLoading = detail.loading && !detail.data;

  // A new campaign/filter combination is a new audience: start again from "all matching".
  useEffect(() => {
    setAudienceSelection(ALL_SELECTION);
  }, [selectedCampaign, appliedSearch, messageStatus, waResponse, replyFilter, sourceFilterParam]);

  // WA status dropdown choices come with the Responded table data; keep the last ones while
  // the table reloads so the dropdown doesn't flicker.
  const replyOptionsFromApi = recipients.data?.reply_options;
  useEffect(() => {
    if (!showReplyColumn) {
      setReplyOptions([]);
      return;
    }
    if (Array.isArray(replyOptionsFromApi)) setReplyOptions(replyOptionsFromApi);
  }, [showReplyColumn, replyOptionsFromApi]);

  const recipientsCount = Number(recipients.data?.count) || 0;
  const audienceCount =
    audienceSelection.mode === "all"
      ? Math.max(recipientsCount - audienceSelection.excluded.size, 0)
      : audienceSelection.included.size;

  const isRowSelected = useCallback(
    (row) => {
      const phone = String(row?.phone || "");
      if (!phone) return false;
      return audienceSelection.mode === "all"
        ? !audienceSelection.excluded.has(phone)
        : audienceSelection.included.has(phone);
    },
    [audienceSelection]
  );

  const setRowsSelected = useCallback((rows, checked) => {
    setAudienceSelection((prev) => {
      const key = prev.mode === "all" ? "excluded" : "included";
      const next = new Map(prev[key]);
      rows.forEach((row) => {
        const phone = String(row?.phone || "");
        if (!phone) return;
        // In "all" mode a checked row is one NOT in the excluded map.
        const add = prev.mode === "all" ? !checked : checked;
        if (add) next.set(phone, row);
        else next.delete(phone);
      });
      return { ...prev, [key]: next };
    });
  }, []);

  const handleToggleRow = useCallback(
    (row) => setRowsSelected([row], !isRowSelected(row)),
    [setRowsSelected, isRowSelected]
  );

  const audienceFilterLabel = useMemo(() => {
    const parts = [];
    const response = WA_RESPONSE_FILTER_OPTIONS.find((o) => o.value && o.value === waResponse);
    if (response) parts.push(response.label);
    if (replyFilter) {
      const reply = replyOptions.find((o) => o.value === replyFilter);
      parts.push(reply?.label || (replyFilter === TEXT_REPLY_OPTION ? "Text reply" : replyFilter));
    }
    const status = MESSAGE_STATUS_FILTER_OPTIONS.find((o) => o.value && o.value === messageStatus);
    if (status) parts.push(status.label);
    if (sourceFilterParam) parts.push(`Source: ${filterSources.join(", ")}`);
    if (appliedSearch) parts.push(`Search: ${appliedSearch}`);
    return parts.join(" · ");
  }, [
    waResponse,
    replyFilter,
    replyOptions,
    messageStatus,
    sourceFilterParam,
    filterSources,
    appliedSearch,
  ]);

  const followUpAudience = useMemo(() => {
    if (isAll) return null;
    const combinedNames = isMulti
      ? (detail.data?.campaigns || []).map((c) => c?.name).filter(Boolean)
      : [];
    return {
      // Several campaigns → the backend combines them to one row (and one send) per person.
      broadcastId: isMulti ? null : String(selectedCampaign),
      broadcastIds: isMulti ? selectedCampaignIds : null,
      campaignName: isMulti
        ? combinedNames.length
          ? combinedNames.join(" + ")
          : `${selectedCampaignIds.length} campaigns`
        : detail.data?.name || String(selectedCampaign),
      filters: {
        search: appliedSearch,
        message_status: messageStatus,
        wa_response: waResponse,
        sales_outcome: replyFilter,
        source: sourceFilterParam,
      },
      excludePhones:
        audienceSelection.mode === "all" ? Array.from(audienceSelection.excluded.keys()) : [],
      includePhones:
        audienceSelection.mode === "some" ? Array.from(audienceSelection.included.keys()) : [],
      count: audienceCount,
      filterLabel: audienceFilterLabel,
    };
  }, [
    isAll,
    isMulti,
    selectedCampaign,
    selectedCampaignIds,
    detail.data?.name,
    detail.data?.campaigns,
    appliedSearch,
    messageStatus,
    waResponse,
    replyFilter,
    sourceFilterParam,
    audienceSelection,
    audienceCount,
    audienceFilterLabel,
  ]);

  const openDrawerFor = useCallback(
    (row) => {
      const phone = row.phone;
      const leadOrPhone = row.lead_id != null ? String(row.lead_id) : phone;
      // Combined rows carry the person's best campaign — open that campaign's chat.
      const broadcastId = row.broadcast_id || (!isAll && !isMulti ? selectedCampaign : null);
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
    [dispatch, isAll, isMulti, selectedCampaign]
  );

  return (
    <div className="flex w-full max-w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {isAll ? null : (
                <button
                  type="button"
                  onClick={() => handleCampaignChange("all")}
                  className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  All campaigns
                  {detail.data?.name ? (
                    <span className="text-muted-foreground/70">/ {detail.data.name}</span>
                  ) : null}
                </button>
              )}
              <CardTitle className="text-2xl">WATI campaigns</CardTitle>
              <CardDescription>
                {isAll
                  ? "Campaign outcomes for the selected period. Click a campaign to see its recipients."
                  : isMulti
                    ? `People across ${selectedCampaignIds.length} selected campaigns, one row per person.`
                    : "Recipients for this campaign with message status and response."}
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={
                  refreshing || showSyncing || overview.loading || (!isAll && recipients.loading)
                }
                onClick={handleRefresh}
              >
                {refreshing || showSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {showSyncing ? "Syncing…" : "Refresh"}
              </Button>
              {lastSyncedAt ? (
                <span className="text-xs text-muted-foreground">
                  Last synced {formatSyncedAgo(lastSyncedAt)}
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <CampaignWorkspaceFilters
        campaignOptions={campaignOptions}
        selectedCampaigns={selectedCampaignIds}
        onCampaignsChange={handleCampaignChange}
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
        waResponse={waResponse}
        onWaResponseChange={(value) => {
          setWaResponse(value);
          if (value !== "responded") setWaReply("");
          setRecipientsPage(1);
        }}
        waReply={waReply}
        onWaReplyChange={(value) => {
          setWaReply(value);
          setRecipientsPage(1);
        }}
        waReplyOptions={replyOptions}
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
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">
              Campaigns
              {overview.data?.total != null ? (
                <span className="ml-1 font-normal text-muted-foreground">({overview.data.total})</span>
              ) : null}
            </h2>
            <p className="text-xs text-muted-foreground">
              One row per campaign. Response % is the share of delivered messages. Tick campaigns to total them.
            </p>
            <CampaignsTable
              results={overview.data?.results || []}
              loading={overview.loading}
              error={overview.error}
              onRowClick={(row) => handleCampaignChange(String(row.id))}
              selected={selectedCampaignRows}
              onSelectedChange={setSelectedCampaignRows}
              onOpenSelected={(ids) => handleCampaignChange(ids)}
            />
          </div>
        </>
      ) : (
        <>
          {detail.error || recipients.error ? (
            <p className="text-sm text-destructive">{detail.error || recipients.error}</p>
          ) : null}
          <CampaignReachSummary
            metrics={reachMetrics}
            loading={reachLoading}
          />
          {isMulti ? (
            <p className="-mt-3 text-xs text-muted-foreground">
              Charts add up the messages of all {selectedCampaignIds.length} campaigns. The list
              below counts people: someone in 3 of these campaigns is 3 messages but 1 person.
            </p>
          ) : null}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Students &amp; contacts</h2>
            <p className="text-xs text-muted-foreground">
              {isMulti
                ? "Each person once. Responded = replied to any selected campaign; Not responded = replied to none; Failed = failed in every one. Tick or untick rows to choose who gets a follow-up campaign — each person gets it once."
                : "Recipients for this campaign with message status and response. Tick or untick rows to choose who gets a follow-up campaign."}
            </p>
            <div className="flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-xs text-foreground">
                <span className="font-semibold">
                  {recipients.loading && !recipients.data ? "…" : audienceCount}
                </span>{" "}
                {audienceSelection.mode === "all"
                  ? `of ${recipientsCount} matching recipient${recipientsCount === 1 ? "" : "s"} selected (all pages)`
                  : `recipient${audienceCount === 1 ? "" : "s"} picked`}
                {audienceFilterLabel ? (
                  <span className="text-muted-foreground"> · {audienceFilterLabel}</span>
                ) : null}
                <span className="ml-2 inline-flex gap-2">
                  {audienceSelection.mode === "all" && audienceSelection.excluded.size === 0 ? null : (
                    <button
                      type="button"
                      className="font-medium text-[#FF8000] hover:underline"
                      onClick={() => setAudienceSelection(ALL_SELECTION)}
                    >
                      Select all matching
                    </button>
                  )}
                  {audienceCount > 0 ? (
                    <button
                      type="button"
                      className="font-medium text-muted-foreground hover:text-foreground hover:underline"
                      onClick={() => setAudienceSelection(EMPTY_PICK)}
                    >
                      Clear selection
                    </button>
                  ) : null}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-2"
                disabled={recipients.loading || audienceCount === 0}
                onClick={() => setFollowUpOpen(true)}
              >
                <Megaphone className="h-4 w-4" />
                Send campaign to {audienceCount} recipient{audienceCount === 1 ? "" : "s"}
              </Button>
            </div>
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
              showCampaign={isMulti}
              selectable
              isRowSelected={isRowSelected}
              onToggleRow={handleToggleRow}
              onTogglePage={setRowsSelected}
              ordering={recipientOrdering}
              onOrderingChange={(value) => {
                setRecipientOrdering(value);
                setRecipientsPage(1);
              }}
              showReplyColumn={showReplyColumn}
              emptyMessage="No students or contacts found for this campaign and filters."
            />
          </div>
        </>
      )}

      <CreateCampaignDrawer
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        audience={followUpAudience}
      />

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
