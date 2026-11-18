import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/axios";

export const WATI_CAMPAIGNS_PAGE_SIZE = 20;
export const WATI_TABLE_PAGE_SIZE = 50;

function rejectPayload(err, fallback) {
  const payload = err.response?.data;
  return typeof payload === "object" && payload !== null
    ? payload
    : { detail: err.message || fallback };
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
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load WATI campaigns."));
    }
  }
);

export const fetchCampaignDetail = createAsyncThunk(
  "wati/fetchCampaignDetail",
  async (broadcastId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`/wati/campaigns/${encodeURIComponent(broadcastId)}/`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load campaign."));
    }
  }
);

export const fetchCampaignLeads = createAsyncThunk(
  "wati/fetchCampaignLeads",
  async (
    { broadcastId, search = "", page = 1, page_size = WATI_TABLE_PAGE_SIZE },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      if (search) params.set("search", search);
      const { data } = await axios.get(
        `/wati/campaigns/${encodeURIComponent(broadcastId)}/leads/?${params}`
      );
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load campaign recipients."));
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
      source = "",
      date_from = "",
      date_to = "",
      page = 1,
      page_size = WATI_TABLE_PAGE_SIZE,
      unique,
      refresh = false,
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
      if (source) params.set("source", source);
      if (date_from) params.set("date_from", date_from);
      if (date_to) params.set("date_to", date_to);
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

export const fetchCampaignMessages = createAsyncThunk(
  "wati/fetchCampaignMessages",
  async ({ broadcastId, page = 1, page_size = WATI_TABLE_PAGE_SIZE }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      const { data } = await axios.get(
        `/wati/campaigns/${encodeURIComponent(broadcastId)}/messages/?${params}`
      );
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load campaign messages."));
    }
  }
);

export const fetchCampaignHistory = createAsyncThunk(
  "wati/fetchCampaignHistory",
  async ({ broadcastId, page = 1, page_size = WATI_TABLE_PAGE_SIZE }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      const { data } = await axios.get(
        `/wati/campaigns/${encodeURIComponent(broadcastId)}/history/?${params}`
      );
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load campaign history."));
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

export const fetchLeadWatiActivity = createAsyncThunk(
  "wati/fetchLeadWatiActivity",
  async (arg, { rejectWithValue }) => {
    const leadId = typeof arg === "object" && arg != null ? arg.leadId : arg;
    const refresh = Boolean(typeof arg === "object" && arg != null && arg.refresh);
    try {
      const { data } = await axios.get(`/wati/leads/${leadId}/activity/`, {
        params: refresh ? { refresh: 1 } : undefined,
      });
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load WATI activity for lead."));
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

export const fetchOutboundCampaigns = createAsyncThunk(
  "wati/fetchOutboundCampaigns",
  async ({ page = 1, page_size = 20 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      const { data } = await axios.get(`/wati/outbound-campaigns/?${params}`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load outbound campaigns."));
    }
  }
);

export const fetchOutboundCampaignDetail = createAsyncThunk(
  "wati/fetchOutboundCampaignDetail",
  async (campaignId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`/wati/outbound-campaigns/${campaignId}/`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load outbound campaign."));
    }
  }
);

export const fetchOutboundRecipients = createAsyncThunk(
  "wati/fetchOutboundRecipients",
  async ({ campaignId, page = 1, page_size = 50, status = "" } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });
      if (status) params.set("status", status);
      const { data } = await axios.get(
        `/wati/outbound-campaigns/${campaignId}/recipients/?${params}`
      );
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to load outbound recipients."));
    }
  }
);

export const cancelOutboundCampaign = createAsyncThunk(
  "wati/cancelOutboundCampaign",
  async (campaignId, { rejectWithValue }) => {
    try {
      const { data } = await axios.delete(`/wati/outbound-campaigns/${campaignId}/`);
      return data;
    } catch (err) {
      return rejectWithValue(rejectPayload(err, "Failed to cancel campaign."));
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
  leads: {
    loading: false,
    error: null,
    data: null,
  },
  recipients: {
    loading: false,
    error: null,
    data: null,
  },
  messages: {
    loading: false,
    error: null,
    data: null,
  },
  history: {
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
  leadActivity: {
    loading: false,
    error: null,
    data: null,
  },
  outbound: {
    types: [],
    typesLoading: false,
    typesError: null,
    templates: [],
    templatesLoading: false,
    templatesError: null,
    list: { loading: false, error: null, data: null },
    detail: { loading: false, error: null, data: null },
    recipients: { loading: false, error: null, data: null },
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
    },
    closeRecipientDrawer(state) {
      state.drawer.open = false;
      state.drawer.loading = false;
      state.drawer.error = null;
      state.drawer.data = null;
      state.drawer.phone = null;
      state.drawer.leadOrPhone = null;
      state.drawer.previewName = null;
    },
    clearCampaignDetail(state) {
      state.detail = { loading: false, error: null, data: null };
      state.leads = { loading: false, error: null, data: null };
      state.recipients = { loading: false, error: null, data: null };
      state.messages = { loading: false, error: null, data: null };
      state.history = { loading: false, error: null, data: null };
      state.drawer = { ...initialState.drawer };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, (state) => {
        state.overview.loading = true;
        state.overview.error = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.data = action.payload;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.overview.loading = false;
        state.overview.error = action.payload?.detail || "Failed to load WATI campaigns.";
      })
      .addCase(fetchCampaignDetail.pending, (state) => {
        state.detail.loading = true;
        state.detail.error = null;
      })
      .addCase(fetchCampaignDetail.fulfilled, (state, action) => {
        state.detail.loading = false;
        state.detail.data = action.payload;
      })
      .addCase(fetchCampaignDetail.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.error = action.payload?.detail || "Failed to load campaign.";
      })
      .addCase(fetchCampaignLeads.pending, (state) => {
        state.leads.loading = true;
        state.leads.error = null;
      })
      .addCase(fetchCampaignLeads.fulfilled, (state, action) => {
        state.leads.loading = false;
        state.leads.data = action.payload;
      })
      .addCase(fetchCampaignLeads.rejected, (state, action) => {
        state.leads.loading = false;
        state.leads.error = action.payload?.detail || "Failed to load recipients.";
      })
      .addCase(fetchRecipients.pending, (state) => {
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
        state.recipients.loading = false;
        state.recipients.data = action.payload;
      })
      .addCase(fetchRecipients.rejected, (state, action) => {
        state.recipients.loading = false;
        state.recipients.error = action.payload?.detail || "Failed to load students and contacts.";
      })
      .addCase(fetchCampaignMessages.pending, (state) => {
        state.messages.loading = true;
        state.messages.error = null;
      })
      .addCase(fetchCampaignMessages.fulfilled, (state, action) => {
        state.messages.loading = false;
        state.messages.data = action.payload;
      })
      .addCase(fetchCampaignMessages.rejected, (state, action) => {
        state.messages.loading = false;
        state.messages.error = action.payload?.detail || "Failed to load messages.";
      })
      .addCase(fetchCampaignHistory.pending, (state) => {
        state.history.loading = true;
        state.history.error = null;
      })
      .addCase(fetchCampaignHistory.fulfilled, (state, action) => {
        state.history.loading = false;
        state.history.data = action.payload;
      })
      .addCase(fetchCampaignHistory.rejected, (state, action) => {
        state.history.loading = false;
        state.history.error = action.payload?.detail || "Failed to load history.";
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
      .addCase(fetchLeadWatiActivity.pending, (state) => {
        state.leadActivity.loading = true;
        state.leadActivity.error = null;
      })
      .addCase(fetchLeadWatiActivity.fulfilled, (state, action) => {
        state.leadActivity.loading = false;
        state.leadActivity.data = action.payload;
      })
      .addCase(fetchLeadWatiActivity.rejected, (state, action) => {
        state.leadActivity.loading = false;
        state.leadActivity.error = action.payload?.detail || "Failed to load WATI activity.";
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
      .addCase(createOutboundCampaign.fulfilled, (state, action) => {
        state.outbound.createLoading = false;
        state.outbound.detail.data = action.payload;
      })
      .addCase(createOutboundCampaign.rejected, (state, action) => {
        state.outbound.createLoading = false;
        state.outbound.createError = action.payload?.detail || "Failed to create campaign.";
      })
      .addCase(fetchOutboundCampaigns.pending, (state) => {
        state.outbound.list.loading = true;
        state.outbound.list.error = null;
      })
      .addCase(fetchOutboundCampaigns.fulfilled, (state, action) => {
        state.outbound.list.loading = false;
        state.outbound.list.data = action.payload;
      })
      .addCase(fetchOutboundCampaigns.rejected, (state, action) => {
        state.outbound.list.loading = false;
        state.outbound.list.error = action.payload?.detail || "Failed to load outbound campaigns.";
      })
      .addCase(fetchOutboundCampaignDetail.pending, (state) => {
        state.outbound.detail.loading = true;
        state.outbound.detail.error = null;
      })
      .addCase(fetchOutboundCampaignDetail.fulfilled, (state, action) => {
        state.outbound.detail.loading = false;
        state.outbound.detail.data = action.payload;
      })
      .addCase(fetchOutboundCampaignDetail.rejected, (state, action) => {
        state.outbound.detail.loading = false;
        state.outbound.detail.error = action.payload?.detail || "Failed to load campaign.";
      })
      .addCase(fetchOutboundRecipients.pending, (state) => {
        state.outbound.recipients.loading = true;
        state.outbound.recipients.error = null;
      })
      .addCase(fetchOutboundRecipients.fulfilled, (state, action) => {
        state.outbound.recipients.loading = false;
        state.outbound.recipients.data = action.payload;
      })
      .addCase(fetchOutboundRecipients.rejected, (state, action) => {
        state.outbound.recipients.loading = false;
        state.outbound.recipients.error =
          action.payload?.detail || "Failed to load recipients.";
      })
      .addCase(cancelOutboundCampaign.fulfilled, (state, action) => {
        state.outbound.detail.data = action.payload;
      });
  },
});

export const { openRecipientDrawer, closeRecipientDrawer, clearCampaignDetail } = watiSlice.actions;
export default watiSlice.reducer;
