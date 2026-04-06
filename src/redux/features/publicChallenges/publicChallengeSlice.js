import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '@/lib/coreApi';

// ============================================================================
// PUBLIC CHALLENGE MANAGEMENT ASYNC THUNKS
// ============================================================================

export const fetchPublicChallenges = createAsyncThunk(
  'publicChallenges/fetchPublicChallenges',
  async (arg, { getState, rejectWithValue }) => {
    try {
      const current = getState().publicChallenges.listFetchParams;
      const query =
        arg === undefined || arg === null ? { ...current } : { ...current, ...arg };

      const params = new URLSearchParams();
      const searchTrim = (query.search || '').trim();
      if (searchTrim) params.set('search', searchTrim);
      if (query.start_date) params.set('start_date', query.start_date);
      if (query.end_date) params.set('end_date', query.end_date);
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(query.page_size) || 20));
      params.set('page', String(page));
      params.set('page_size', String(pageSize));

      const response = await axios.get(
        `public-challenges/admin/challenges/?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const fetchPublicChallengeById = createAsyncThunk(
  'publicChallenges/fetchPublicChallengeById',
  async (challengeId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`public-challenges/admin/challenges/${challengeId}/`);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const createPublicChallenge = createAsyncThunk(
  'publicChallenges/createPublicChallenge',
  async (challengeData, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      Object.keys(challengeData).forEach(key => {
        if (key === 'problem_ids' || key === 'mcq_question_ids') {
          // Handle arrays separately
          return;
        }
        if (challengeData[key] !== null && challengeData[key] !== undefined && challengeData[key] !== '') {
          let value = challengeData[key];
          // Convert to string, handling arrays and objects
          if (Array.isArray(value)) {
            value = value[0]; // Get first element if it's an array
          }
          // Convert to string (numbers, booleans, etc.)
          if (typeof value !== 'string' && typeof value !== 'object') {
            value = String(value);
          } else if (typeof value === 'object' && value !== null) {
            // Skip objects (except files)
            return;
          }
          formData.append(key, value);
        }
      });

      // Add problem_ids and mcq_question_ids as arrays
      // Always send problem_ids and mcq_question_ids if they exist (even if empty)
      if (challengeData.problem_ids !== undefined) {
        if (Array.isArray(challengeData.problem_ids)) {
          if (challengeData.problem_ids.length === 0) {
            // Send empty array indicator
            formData.append('problem_ids', '[]');
          } else {
            challengeData.problem_ids.forEach(id => {
              formData.append('problem_ids[]', id);
            });
          }
        }
      }
      if (challengeData.mcq_question_ids !== undefined) {
        if (Array.isArray(challengeData.mcq_question_ids)) {
          if (challengeData.mcq_question_ids.length === 0) {
            // Send empty array indicator
            formData.append('mcq_question_ids', '[]');
          } else {
            challengeData.mcq_question_ids.forEach(id => {
              formData.append('mcq_question_ids[]', id);
            });
          }
        }
      }
      
      const response = await axios.post('public-challenges/admin/challenges/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const updatePublicChallenge = createAsyncThunk(
  'publicChallenges/updatePublicChallenge',
  async ({ challengeId, challengeData }, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      Object.keys(challengeData).forEach(key => {
        if (key === 'problem_ids' || key === 'mcq_question_ids') {
          return;
        }
        if (challengeData[key] !== null && challengeData[key] !== undefined && challengeData[key] !== '') {
          let value = challengeData[key];
          // Convert to string, handling arrays and objects
          if (Array.isArray(value)) {
            value = value[0]; // Get first element if it's an array
          }
          // Convert to string (numbers, booleans, etc.)
          if (typeof value !== 'string' && typeof value !== 'object') {
            value = String(value);
          } else if (typeof value === 'object' && value !== null) {
            // Skip objects (except files)
            return;
          }
          formData.append(key, value);
        }
      });

      // Always send problem_ids and mcq_question_ids if they exist (even if empty)
      if (challengeData.problem_ids !== undefined) {
        if (Array.isArray(challengeData.problem_ids)) {
          if (challengeData.problem_ids.length === 0) {
            // Send empty array indicator
            formData.append('problem_ids', '[]');
          } else {
            challengeData.problem_ids.forEach(id => {
              formData.append('problem_ids[]', id);
            });
          }
        }
      }
      if (challengeData.mcq_question_ids !== undefined) {
        if (Array.isArray(challengeData.mcq_question_ids)) {
          if (challengeData.mcq_question_ids.length === 0) {
            // Send empty array indicator
            formData.append('mcq_question_ids', '[]');
          } else {
            challengeData.mcq_question_ids.forEach(id => {
              formData.append('mcq_question_ids[]', id);
            });
          }
        }
      }
      
      const response = await axios.put(`public-challenges/admin/challenges/${challengeId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const deletePublicChallenge = createAsyncThunk(
  'publicChallenges/deletePublicChallenge',
  async (challengeId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`public-challenges/admin/challenges/${challengeId}/`);
      return { challengeId, data: response.data };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const activatePublicChallenge = createAsyncThunk(
  'publicChallenges/activatePublicChallenge',
  async ({ challengeId, activationData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`public-challenges/admin/challenges/${challengeId}/activate/`, activationData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const updateChallengeSchedule = createAsyncThunk(
  'publicChallenges/updateChallengeSchedule',
  async ({ challengeId, scheduleData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`public-challenges/admin/challenges/${challengeId}/update-schedule/`, scheduleData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const fetchChallengeRegistrations = createAsyncThunk(
  'publicChallenges/fetchChallengeRegistrations',
  async (challengeId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`public-challenges/admin/challenges/${challengeId}/registrations/`);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const fetchParticipantSubmissions = createAsyncThunk(
  'publicChallenges/fetchParticipantSubmissions',
  async (challengeId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`public-challenges/admin/challenges/${challengeId}/participant-submissions/`);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const fetchChallengeLeaderboard = createAsyncThunk(
  'publicChallenges/fetchChallengeLeaderboard',
  async (payload, { rejectWithValue }) => {
    try {
      // Handle both object payload and direct challengeId for backward compatibility
      const challengeId = typeof payload === 'object' ? payload.challengeId : payload;
      const type = typeof payload === 'object' ? payload.type : null;

      let url = `public-challenges/admin/challenges/${challengeId}/leaderboard/`;
      if (type) {
        url += `?type=${type}`;
      }

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const fetchPublicLeads = createAsyncThunk(
  'publicChallenges/fetchPublicLeads',
  async (filters, { rejectWithValue }) => {
    try {
      // Build query string from filters
      const params = new URLSearchParams();
      if (filters) {
        Object.keys(filters).forEach(key => {
          if (filters[key]) params.append(key, filters[key]);
        });
      }

      const response = await axios.get(`public-challenges/leads/?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }

);

export const saveDownloadHistory = createAsyncThunk(
  'publicChallenges/saveDownloadHistory',
  async (historyData, { rejectWithValue }) => {
    try {
      const response = await axios.post('public-challenges/download-history/', historyData);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

export const fetchDownloadHistory = createAsyncThunk(
  'publicChallenges/fetchDownloadHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('public-challenges/download-history/');
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);


const initialState = {
  allChallenges: [],
  /** Last query used for admin challenge list (sales dashboard pagination / filters). */
  listFetchParams: {
    page: 1,
    page_size: 20,
    search: '',
    start_date: '',
    end_date: '',
  },
  challengesListMeta: {
    count: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
  },
  currentChallenge: null,
  registrations: [],
  participantSubmissions: [],
  leaderboard: [],
  getLoading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  activateLoading: false,
  updateScheduleLoading: false,
  submissionsLoading: false,
  leaderboardLoading: false,
  leadsLoading: false,
  leads: [],
  leadsCount: 0,

  downloadHistory: [],
  downloadHistoryLoading: false,
  error: null,
};

const publicChallengeSlice = createSlice({
  name: 'publicChallenges',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = null;
    },
    setCurrentChallenge: (state, action) => {
      state.currentChallenge = action.payload;
    },
    clearCurrentChallenge: (state) => {
      state.currentChallenge = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch challenges
    builder
      .addCase(fetchPublicChallenges.pending, (state) => {
        state.getLoading = true;
        state.error = null;
      })
      .addCase(fetchPublicChallenges.fulfilled, (state, action) => {
        state.getLoading = false;
        if (action.payload.success && action.payload.data) {
          const payload = action.payload;
          const rows = Array.isArray(payload.data) ? payload.data : [];
          state.allChallenges = rows;
          if (typeof payload.count === 'number') {
            state.challengesListMeta = {
              count: payload.count,
              page: payload.page ?? 1,
              page_size: payload.page_size ?? (rows.length || 20),
              total_pages: payload.total_pages ?? 1,
            };
          } else {
            state.challengesListMeta = {
              count: rows.length,
              page: 1,
              page_size: rows.length || 20,
              total_pages: 1,
            };
          }
          if (action.meta.arg !== undefined && action.meta.arg !== null) {
            state.listFetchParams = {
              ...state.listFetchParams,
              ...action.meta.arg,
            };
          }
        }
      })
      .addCase(fetchPublicChallenges.rejected, (state, action) => {
        state.getLoading = false;
        state.error = action.payload;
      });

    // Fetch challenge by ID
    builder
      .addCase(fetchPublicChallengeById.pending, (state) => {
        state.getLoading = true;
        state.error = null;
      })
      .addCase(fetchPublicChallengeById.fulfilled, (state, action) => {
        state.getLoading = false;
        if (action.payload.success && action.payload.data) {
          state.currentChallenge = action.payload.data;
        }
      })
      .addCase(fetchPublicChallengeById.rejected, (state, action) => {
        state.getLoading = false;
        state.error = action.payload;
      });

    // Create challenge
    builder
      .addCase(createPublicChallenge.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createPublicChallenge.fulfilled, (state, action) => {
        state.createLoading = false;
        if (action.payload.success && action.payload.data) {
          state.allChallenges.unshift(action.payload.data);
        }
      })
      .addCase(createPublicChallenge.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      });

    // Update challenge
    builder
      .addCase(updatePublicChallenge.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updatePublicChallenge.fulfilled, (state, action) => {
        state.updateLoading = false;
        if (action.payload.success && action.payload.data) {
          const index = state.allChallenges.findIndex(c => c.id === action.payload.data.id);
          if (index !== -1) {
            state.allChallenges[index] = action.payload.data;
          }
          if (state.currentChallenge && state.currentChallenge.id === action.payload.data.id) {
            state.currentChallenge = action.payload.data;
          }
        }
      })
      .addCase(updatePublicChallenge.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      });

    // Delete challenge
    builder
      .addCase(deletePublicChallenge.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deletePublicChallenge.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.allChallenges = state.allChallenges.filter(c => c.id !== action.payload.challengeId);
        if (state.currentChallenge && state.currentChallenge.id === action.payload.challengeId) {
          state.currentChallenge = null;
        }
      })
      .addCase(deletePublicChallenge.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });

    // Activate challenge
    builder
      .addCase(activatePublicChallenge.pending, (state) => {
        state.activateLoading = true;
        state.error = null;
      })
      .addCase(activatePublicChallenge.fulfilled, (state, action) => {
        state.activateLoading = false;
        if (action.payload.success && action.payload.data) {
          const index = state.allChallenges.findIndex(c => c.id === action.payload.data.id);
          if (index !== -1) {
            state.allChallenges[index] = action.payload.data;
          }
          if (state.currentChallenge && state.currentChallenge.id === action.payload.data.id) {
            state.currentChallenge = action.payload.data;
          }
        }
      })
      .addCase(activatePublicChallenge.rejected, (state, action) => {
        state.activateLoading = false;
        state.error = action.payload;
      });

    // Fetch registrations
    builder
      .addCase(fetchChallengeRegistrations.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.registrations = Array.isArray(action.payload.data) ? action.payload.data : [];
        }
      });

    // Update challenge schedule
    builder
      .addCase(updateChallengeSchedule.pending, (state) => {
        state.updateScheduleLoading = true;
        state.error = null;
      })
      .addCase(updateChallengeSchedule.fulfilled, (state, action) => {
        state.updateScheduleLoading = false;
        if (action.payload.success && action.payload.data) {
          const index = state.allChallenges.findIndex(c => c.id === action.payload.data.id);
          if (index !== -1) {
            state.allChallenges[index] = action.payload.data;
          }
          if (state.currentChallenge && state.currentChallenge.id === action.payload.data.id) {
            state.currentChallenge = action.payload.data;
          }
        }
      })
      .addCase(updateChallengeSchedule.rejected, (state, action) => {
        state.updateScheduleLoading = false;
        state.error = action.payload;
      });

    // Fetch participant submissions
    builder
      .addCase(fetchParticipantSubmissions.pending, (state) => {
        state.submissionsLoading = true;
        state.error = null;
      })
      .addCase(fetchParticipantSubmissions.fulfilled, (state, action) => {
        state.submissionsLoading = false;
        if (action.payload.success && action.payload.data) {
          state.participantSubmissions = Array.isArray(action.payload.data) ? action.payload.data : [];
        }
      })
      .addCase(fetchParticipantSubmissions.rejected, (state, action) => {
        state.submissionsLoading = false;
        state.error = action.payload;
      });

    // Fetch leaderboard
    builder
      .addCase(fetchChallengeLeaderboard.pending, (state) => {
        state.leaderboardLoading = true;
        state.error = null;
      })
      .addCase(fetchChallengeLeaderboard.fulfilled, (state, action) => {
        state.leaderboardLoading = false;
        if (action.payload.success && action.payload.data) {
          state.leaderboard = Array.isArray(action.payload.data) ? action.payload.data : [];
        }
      })
      .addCase(fetchChallengeLeaderboard.rejected, (state, action) => {
        state.leaderboardLoading = false;
        state.error = action.payload;
      });

    // Fetch leads
    builder
      .addCase(fetchPublicLeads.pending, (state) => {
        state.leadsLoading = true;
        state.error = null;
      })
      .addCase(fetchPublicLeads.fulfilled, (state, action) => {
        state.leadsLoading = false;
        if (action.payload.results) {
          state.leads = action.payload.results;
          state.leadsCount = action.payload.count || action.payload.results.length;
        } else {
          state.leads = [];
          state.leadsCount = 0;
        }
      })

      .addCase(fetchPublicLeads.rejected, (state, action) => {
        state.leadsLoading = false;
        state.error = action.payload;
      });

    // Save download history
    builder
      .addCase(saveDownloadHistory.fulfilled, (state, action) => {
        // Optional: you can show a success message or log it
      })
      .addCase(saveDownloadHistory.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Fetch download history
    builder
      .addCase(fetchDownloadHistory.pending, (state) => {
        state.downloadHistoryLoading = true;
        state.error = null;
      })
      .addCase(fetchDownloadHistory.fulfilled, (state, action) => {
        state.downloadHistoryLoading = false;
        if (action.payload.success && action.payload.data) {
          state.downloadHistory = Array.isArray(action.payload.data) ? action.payload.data : [];
        }
      })
      .addCase(fetchDownloadHistory.rejected, (state, action) => {
        state.downloadHistoryLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearErrors,
  setCurrentChallenge,
  clearCurrentChallenge,
} = publicChallengeSlice.actions;

export default publicChallengeSlice.reducer;

