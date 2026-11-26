import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";

/** Backend max page size; fetchOverview pulls every page so the table shows the whole period. */
export const WATI_CAMPAIGNS_PAGE_SIZE = 100;
const WATI_OVERVIEW_MAX_PAGES = 10;
export const WATI_TABLE_PAGE_SIZE = 50;

function rejectPayload(err, fallback) {
  const payload = err.response?.data;
  return typeof payload === "object" && payload !== null
    ? payload
    : { detail: err.message || fallback };
}

/** Background auto-refresh requests pass `silent: true` — no spinners, keep current data. */
function isSilent(action) {
  return Boolean(action.meta?.arg && typeof action.meta.arg === "object" && action.meta.arg.silent);
}

function detailArgId(action) {
  const arg = action.meta?.arg;
  return String(typeof arg === "object" && arg ? arg.broadcastId : arg || "");
}

export const fetchOverview = createAsyncThunk(
  "wati/fetchOverview",
  async (
    {
      date_from = "",
      date_to = "",
      page = 1,
      page_size = WATI_CAMPAIGNS_PAGE_SIZE,
      refresh = false,
      // `silent: true` is read by the pending/rejected reducers via action.meta.arg.
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      if (date_from) params.set("date_from", date_from);
      if (date_to) params.set("date_to", date_to);
      if (refresh) params.set("refresh", "1");
      const { data } = await axios.get(`/wati/campaigns/overview/?${params}`);
      // All campaigns in the period: fetch remaining pages and merge rows.
      // Totals / overview_metrics already cover the full range, so keep page 1's.
      const results = [...(data?.results || [])];
      const total = Number(data?.total) || 0;
      let nextPage = Number(page) + 1;
      while (results.length < total && nextPage <= WATI_OVERVIEW_MAX_PAGES) {
        params.set("page", String(nextPage));
        params.delete("refresh");
        const { data: more } = await axios.get(`/wati/campaigns/overview/?${params}`);
        const rows = more?.results || [];
        if (!rows.length) break;
        results.push(...rows);
        nextPage += 1;
      }
      return { ...data, page: 1, results, count: results.length };
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load WATI campaigns."));
    }
  }
);

export const fetchCampaignDetail = createAsyncThunk(
  "wati/fetchCampaignDetail",
  /**
   * Accepts a broadcast id, or `{ broadcastId, refresh }` to recompute from WATI.
   * Several ids ("a,b,c") load the combined (summed) donuts for the selected campaigns.
   */
  async (arg, { rejectWithValue }) => {
    const broadcastId = typeof arg === "object" && arg ? arg.broadcastId : arg;
    const refresh = typeof arg === "object" && arg ? Boolean(arg.refresh) : false;
    try {
      if (String(broadcastId || "").includes(",")) {
        const params = new URLSearchParams({ ids: String(broadcastId) });
        if (refresh) params.set("refresh", "1");
        const { data } = await axios.get(`/wati/campaigns/combined/?${params}`);
        return data;
      }
      const qs = refresh ? "?refresh=1" : "";
      const { data } = await axios.get(
        `/wati/campaigns/${encodeURIComponent(broadcastId)}/${qs}`
      );
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load campaign."));
    }
  }
);

export const fetchRecipients = createAsyncThunk(
  "wati/fetchRecipients",
  async (
    {
      broadcastId = "",
      search = "",
      message_status = "",
      sales_outcome = "",
      wa_response = "",
      source = "",
      date_from = "",
      date_to = "",
      page = 1,
      page_size = WATI_TABLE_PAGE_SIZE,
      unique,
      refresh = false,
      // "-last_activity" (newest first) | "last_activity" (oldest first) | "" (WATI order)
      ordering = "",
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      if (broadcastId && broadcastId !== "all") params.set("broadcast_id", broadcastId);
      if (search) params.set("search", search);
      if (message_status) params.set("message_status", message_status);
      if (sales_outcome) params.set("sales_outcome", sales_outcome);
      if (wa_response) params.set("wa_response", wa_response);
      if (source) params.set("source", source);
      if (date_from) params.set("date_from", date_from);
      if (date_to) params.set("date_to", date_to);
      if (ordering) params.set("ordering", ordering);
      // All campaigns → unique contacts; single campaign → full recipient list.
      if (unique === true || unique === false) {
        params.set("unique", String(unique));
      } else if (!broadcastId || broadcastId === "all") {
        params.set("unique", "true");
      } else {
        params.set("unique", "false");
      }
      if (refresh) params.set("refresh", "1");
      const { data } = await axios.get(`/wati/recipients/?${params}`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load students and contacts."));
    }
  }
);

export const fetchRecipientDrawer = createAsyncThunk(
  "wati/fetchRecipientDrawer",
  async ({ broadcastId, leadOrPhone, phone, scopeCampaign = false }, { rejectWithValue }) => {
    try {
      const key = encodeURIComponent(leadOrPhone || phone);
      const phoneKey = encodeURIComponent(phone || leadOrPhone);
      const [activityRes, historyRes] = await Promise.all([
        axios.get(`/wati/campaigns/${encodeURIComponent(broadcastId)}/leads/${key}/activity/`),
        axios.get(
          `/wati/campaigns/${encodeURIComponent(broadcastId)}/recipients/${phoneKey}/history/`,
          // Selected campaign only — All Campaigns keeps the full WhatsApp thread.
          { params: scopeCampaign ? { scope_campaign: 1 } : undefined }
        ),
      ]);
      return {
        activity: activityRes.data,
        history: historyRes.data,
      };
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load recipient details."));
    }
  }
);

/**
 * Leads table → phone popup: every WATI campaign sent to a lead plus the full WhatsApp thread.
 * Lead activity (local, fast) gives the campaign list + latest campaign id; the unscoped
 * history endpoint then returns the whole conversation (all campaign templates + replies).
 */
export const fetchLeadChat = createAsyncThunk(
  "wati/fetchLeadChat",
  async ({ leadId, phone }, { rejectWithValue }) => {
    try {
      const { data: activity } = await axios.get(`/wati/leads/${leadId}/activity/`);
      const campaigns = Array.isArray(activity?.campaigns) ? activity.campaigns : [];
      const broadcastId =
        activity?.summary?.latest_broadcast_id || campaigns[0]?.broadcast_id || "";
      const chatPhone = phone || activity?.phone || "";
      let history = null;
      if (broadcastId && chatPhone) {
        const { data } = await axios.get(
          `/wati/campaigns/${encodeURIComponent(broadcastId)}/recipients/${encodeURIComponent(
            chatPhone
          )}/history/`
        );
        history = data;
      }
      return {
        activity: {
          lead_id: activity?.lead_id ?? leadId,
          lead_name: activity?.lead_name || "",
          phone: activity?.phone || chatPhone,
          sales_outcome_label: activity?.sales_outcome_label || "",
          events: [],
        },
        history,
        campaigns,
      };
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load WhatsApp chat."));
    }
  }
);

export const fetchCampaignTypes = createAsyncThunk(
  "wati/fetchCampaignTypes",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`/wati/campaign-types/`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load campaign types."));
    }
  }
);

export const fetchWatiTemplates = createAsyncThunk(
  "wati/fetchWatiTemplates",
  async ({ type = "" } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const qs = params.toString();
      const { data } = await axios.get(`/wati/templates/${qs ? `?${qs}` : ""}`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load templates."));
    }
  }
);

export const estimateOutboundCampaign = createAsyncThunk(
  "wati/estimateOutboundCampaign",
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`/wati/outbound-campaigns/estimate/`, body);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to estimate campaign."));
    }
  }
);

export const createOutboundCampaign = createAsyncThunk(
  "wati/createOutboundCampaign",
  async (body, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`/wati/outbound-campaigns/`, body);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to create campaign."));
    }
  }
);

const initialState = {
  overview: {
    loading: false,
    error: null,
    data: null,
  },
  detail: {
    loading: false,
    error: null,
    data: null,
  },
  recipients: {
    loading: false,
    error: null,
    data: null,
  },
  drawer: {
    open: false,
    loading: false,
    error: null,
    phone: null,
    leadOrPhone: null,
    previewName: null,
    data: null,
  },
  outbound: {
    types: [],
    typesLoading: false,
    typesError: null,
    templates: [],
    templatesLoading: false,
    templatesError: null,
    createLoading: false,
    createError: null,
  },
};

const watiSlice = createSlice({
  name: "wati",
  initialState,
  reducers: {
    openRecipientDrawer(state, action) {
      state.drawer.open = true;
      state.drawer.phone = action.payload?.phone ?? null;
      state.drawer.leadOrPhone = action.payload?.leadOrPhone ?? action.payload?.phone ?? null;
      state.drawer.previewName = action.payload?.previewName ?? null;
      state.drawer.error = null;
      // Never flash the previous contact's chat while the next one loads.
      state.drawer.data = null;
      state.drawer.loading = true;
    },
    closeRecipientDrawer(state) {
      state.drawer.open = false;
      state.drawer.loading = false;
      state.drawer.error = null;
      state.drawer.data = null;
      state.drawer.phone = null;
      state.drawer.leadOrPhone = null;
      state.drawer.previewName = null;
      state.drawer.requestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, (state, action) => {
        // Silent polls (while snapshots sync) keep the table visible — no skeleton flash.
        if (action.meta.arg?.silent) return;
        state.overview.loading = true;
        state.overview.error = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.data = action.payload;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        // A failed background poll keeps the last good table instead of an error state.
        if (action.meta.arg?.silent) return;
        state.overview.loading = false;
        state.overview.error = action.payload?.detail || "Failed to load WATI campaigns.";
      })
      .addCase(fetchCampaignDetail.pending, (state, action) => {
        // Silent = background auto-refresh on page load: keep the current view on screen.
        if (isSilent(action)) return;
        state.detail.loading = true;
        state.detail.error = null;
        state.detail.broadcastId = detailArgId(action);
      })
      .addCase(fetchCampaignDetail.fulfilled, (state, action) => {
        // A slow response for a campaign the user has already left must not replace it.
        if (state.detail.broadcastId && detailArgId(action) !== state.detail.broadcastId) return;
        if (!isSilent(action)) state.detail.loading = false;
        state.detail.data = action.payload;
      })
      .addCase(fetchCampaignDetail.rejected, (state, action) => {
        if (isSilent(action)) return; // keep the last good numbers
        if (state.detail.broadcastId && detailArgId(action) !== state.detail.broadcastId) return;
        state.detail.loading = false;
        state.detail.error = action.payload?.detail || "Failed to load campaign.";
      })
      .addCase(fetchRecipients.pending, (state, action) => {
        // Newest request wins (filters changed, or a background refresh finished later).
        state.recipients.requestId = action.meta.requestId;
        if (isSilent(action)) return;
        state.recipients.loading = true;
        state.recipients.error = null;
        // Drop prior filter snapshot so All Campaigns tiles don't keep overall totals
        // while a search/status request is in flight.
        if (state.recipients.data) {
          state.recipients.data = {
            ...state.recipients.data,
            filter_metrics: undefined,
          };
        }
      })
      .addCase(fetchRecipients.fulfilled, (state, action) => {
        if (state.recipients.requestId && action.meta.requestId !== state.recipients.requestId) return;
        state.recipients.loading = false;
        state.recipients.data = action.payload;
      })
      .addCase(fetchRecipients.rejected, (state, action) => {
        if (state.recipients.requestId && action.meta.requestId !== state.recipients.requestId) return;
        state.recipients.loading = false;
        if (isSilent(action)) return; // keep the last good table
        state.recipients.error = action.payload?.detail || "Failed to load students and contacts.";
      })
      .addCase(fetchRecipientDrawer.pending, (state) => {
        state.drawer.loading = true;
        state.drawer.error = null;
      })
      .addCase(fetchRecipientDrawer.fulfilled, (state, action) => {
        state.drawer.loading = false;
        state.drawer.data = action.payload;
      })
      .addCase(fetchRecipientDrawer.rejected, (state, action) => {
        state.drawer.loading = false;
        state.drawer.error = action.payload?.detail || "Failed to load recipient.";
      })
      .addCase(fetchLeadChat.pending, (state, action) => {
        state.drawer.loading = true;
        state.drawer.error = null;
        state.drawer.requestId = action.meta.requestId;
      })
      .addCase(fetchLeadChat.fulfilled, (state, action) => {
        // Ignore a slow response for a lead the user already closed / switched away from.
        if (!state.drawer.open || state.drawer.requestId !== action.meta.requestId) return;
        state.drawer.loading = false;
        state.drawer.data = action.payload;
      })
      .addCase(fetchLeadChat.rejected, (state, action) => {
        if (!state.drawer.open || state.drawer.requestId !== action.meta.requestId) return;
        state.drawer.loading = false;
        state.drawer.error = action.payload?.detail || "Failed to load WhatsApp chat.";
      })
      .addCase(fetchCampaignTypes.pending, (state) => {
        state.outbound.typesLoading = true;
        state.outbound.typesError = null;
      })
      .addCase(fetchCampaignTypes.fulfilled, (state, action) => {
        state.outbound.typesLoading = false;
        state.outbound.types = action.payload?.results || [];
      })
      .addCase(fetchCampaignTypes.rejected, (state, action) => {
        state.outbound.typesLoading = false;
        state.outbound.typesError = action.payload?.detail || "Failed to load campaign types.";
      })
      .addCase(fetchWatiTemplates.pending, (state) => {
        state.outbound.templatesLoading = true;
        state.outbound.templatesError = null;
      })
      .addCase(fetchWatiTemplates.fulfilled, (state, action) => {
        state.outbound.templatesLoading = false;
        state.outbound.templates = action.payload?.results || [];
      })
      .addCase(fetchWatiTemplates.rejected, (state, action) => {
        state.outbound.templatesLoading = false;
        state.outbound.templatesError = action.payload?.detail || "Failed to load templates.";
      })
      .addCase(createOutboundCampaign.pending, (state) => {
        state.outbound.createLoading = true;
        state.outbound.createError = null;
      })
      .addCase(createOutboundCampaign.fulfilled, (state) => {
        state.outbound.createLoading = false;
      })
      .addCase(createOutboundCampaign.rejected, (state, action) => {
        state.outbound.createLoading = false;
        state.outbound.createError = action.payload?.detail || "Failed to create campaign.";
      });
  },
});

export const { openRecipientDrawer, closeRecipientDrawer } = watiSlice.actions;
export default watiSlice.reducer;
