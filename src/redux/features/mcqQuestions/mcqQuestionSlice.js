import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '@/lib/coreApi';

// ============================================================================
// MCQ QUESTION MANAGEMENT ASYNC THUNKS
// ============================================================================

export const fetchMCQQuestions = createAsyncThunk(
  'mcqQuestions/fetchMCQQuestions',
  async ({ page = 1, pageSize = 30, search = '', difficulty = '', category = '', questionType = '' } = {}, { rejectWithValue }) => {
    try {
      const queryObj = {
        page,
        page_size: pageSize,
      };
      if (search) queryObj.search = search;
      if (difficulty) queryObj.difficulty = difficulty;
      if (category) queryObj.category = category;
      if (questionType) queryObj.question_type = questionType;
      
      const query = new URLSearchParams(queryObj).toString();
      const response = await axios.get(`public-challenges/admin/mcq-questions/?${query}`);
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

export const fetchMCQQuestionById = createAsyncThunk(
  'mcqQuestions/fetchMCQQuestionById',
  async (questionId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`public-challenges/admin/mcq-questions/${questionId}/`);
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

export const createMCQQuestion = createAsyncThunk(
  'mcqQuestions/createMCQQuestion',
  async (questionData, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      
      // Add question fields - ensure values are properly converted to strings
      Object.keys(questionData).forEach(key => {
        if (key === 'options') {
          // Options will be handled separately
          return;
        }
        if (key === 'question_image' && questionData[key]) {
          formData.append(key, questionData[key]);
        } else if (key === 'category') {
          // Always send category, even if null (so backend can set it to None)
          const categoryValue = questionData[key];
          if (categoryValue !== null && categoryValue !== undefined && categoryValue !== '') {
            formData.append(key, String(categoryValue));
          } else {
            formData.append(key, '');
          }
        } else if (questionData[key] !== null && questionData[key] !== undefined && questionData[key] !== '') {
          let value = questionData[key];
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
      
      // Add options
      if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((option, index) => {
          formData.append(`options[${index}][option_text]`, option.option_text || '');
          formData.append(`options[${index}][is_correct]`, option.is_correct ? 'true' : 'false');
          formData.append(`options[${index}][order]`, option.order || index);
          if (option.option_image) {
            formData.append(`options[${index}][option_image]`, option.option_image);
          }
        });
      }
      
      const response = await axios.post('public-challenges/admin/mcq-questions/', formData, {
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

export const updateMCQQuestion = createAsyncThunk(
  'mcqQuestions/updateMCQQuestion',
  async ({ questionId, questionData }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      
      // Add question fields - ensure values are properly converted to strings
      Object.keys(questionData).forEach(key => {
        if (key === 'options') {
          // Options will be handled separately
          return;
        }
        if (key === 'question_image' && questionData[key]) {
          formData.append(key, questionData[key]);
        } else if (key === 'category') {
          // Always send category, even if null (so backend can set it to None)
          const categoryValue = questionData[key];
          if (categoryValue !== null && categoryValue !== undefined && categoryValue !== '') {
            formData.append(key, String(categoryValue));
          } else {
            formData.append(key, '');
          }
        } else if (questionData[key] !== null && questionData[key] !== undefined && questionData[key] !== '') {
          let value = questionData[key];
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
      
      // Add options
      if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((option, index) => {
          formData.append(`options[${index}][option_text]`, option.option_text || '');
          formData.append(`options[${index}][is_correct]`, option.is_correct ? 'true' : 'false');
          formData.append(`options[${index}][order]`, option.order || index);
          if (option.option_image) {
            formData.append(`options[${index}][option_image]`, option.option_image);
          }
        });
      }
      
      const response = await axios.put(`public-challenges/admin/mcq-questions/${questionId}/`, formData, {
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

export const deleteMCQQuestion = createAsyncThunk(
  'mcqQuestions/deleteMCQQuestion',
  async (questionId, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`public-challenges/admin/mcq-questions/${questionId}/`);
      return { questionId, data: response.data };
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 'Unknown',
        data: error.response?.data || null
      });
    }
  }
);

// ============================================================================
// MCQ CATEGORY MANAGEMENT ASYNC THUNKS
// ============================================================================

export const fetchMCQCategories = createAsyncThunk(
  'mcqQuestions/fetchMCQCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('public-challenges/admin/mcq-categories/');
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

export const createMCQCategory = createAsyncThunk(
  'mcqQuestions/createMCQCategory',
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await axios.post('public-challenges/admin/mcq-categories/', categoryData);
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

export const updateMCQCategory = createAsyncThunk(
  'mcqQuestions/updateMCQCategory',
  async ({ categoryId, categoryData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`public-challenges/admin/mcq-categories/${categoryId}/`, categoryData);
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

export const bulkImportMCQQuestions = createAsyncThunk(
  'mcqQuestions/bulkImportMCQQuestions',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post('public-challenges/admin/mcq-questions/bulk-import/', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || {
        success: false,
        message: error.message || 'Failed to import MCQ questions',
      });
    }
  }
);

// ============================================================================
// MCQ QUESTION SLICE
// ============================================================================

const initialState = {
  allQuestions: [],
  categories: [],
  currentQuestion: null,
  getLoading: false,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  bulkImportLoading: false,
  bulkImportError: null,
  error: null,
  pagination: {},
  searchTerm: '',
  selectedDifficulty: 'ALL',
  selectedCategory: 'ALL',
  selectedQuestionType: 'ALL',
  bulkImportResult: null,
};

const mcqQuestionSlice = createSlice({
  name: 'mcqQuestions',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = null;
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    setSelectedDifficulty: (state, action) => {
      state.selectedDifficulty = action.payload;
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setSelectedQuestionType: (state, action) => {
      state.selectedQuestionType = action.payload;
    },
    setCurrentQuestion: (state, action) => {
      state.currentQuestion = action.payload;
    },
    clearCurrentQuestion: (state) => {
      state.currentQuestion = null;
    },
    clearBulkImportResult: (state) => {
      state.bulkImportResult = null;
      state.bulkImportError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch questions
    builder
      .addCase(fetchMCQQuestions.pending, (state) => {
        state.getLoading = true;
        state.error = null;
      })
      .addCase(fetchMCQQuestions.fulfilled, (state, action) => {
        state.getLoading = false;
        if (action.payload.success && action.payload.data) {
          state.allQuestions = action.payload.data.results || action.payload.data || [];
          state.pagination = {
            count: action.payload.data.count || action.payload.data.length || 0,
            page: action.payload.data.page || 1,
            pageSize: action.payload.data.page_size || 30,
            totalPages: action.payload.data.total_pages || 1,
          };
        }
      })
      .addCase(fetchMCQQuestions.rejected, (state, action) => {
        state.getLoading = false;
        state.error = action.payload;
      });

    // Fetch question by ID
    builder
      .addCase(fetchMCQQuestionById.pending, (state) => {
        state.getLoading = true;
        state.error = null;
      })
      .addCase(fetchMCQQuestionById.fulfilled, (state, action) => {
        state.getLoading = false;
        if (action.payload.success && action.payload.data) {
          state.currentQuestion = action.payload.data;
        }
      })
      .addCase(fetchMCQQuestionById.rejected, (state, action) => {
        state.getLoading = false;
        state.error = action.payload;
      });

    // Create question
    builder
      .addCase(createMCQQuestion.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createMCQQuestion.fulfilled, (state, action) => {
        state.createLoading = false;
        if (action.payload.success && action.payload.data) {
          state.allQuestions.unshift(action.payload.data);
        }
      })
      .addCase(createMCQQuestion.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload;
      });

    // Update question
    builder
      .addCase(updateMCQQuestion.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateMCQQuestion.fulfilled, (state, action) => {
        state.updateLoading = false;
        if (action.payload.success && action.payload.data) {
          const index = state.allQuestions.findIndex(q => q.id === action.payload.data.id);
          if (index !== -1) {
            state.allQuestions[index] = action.payload.data;
          }
          if (state.currentQuestion && state.currentQuestion.id === action.payload.data.id) {
            state.currentQuestion = action.payload.data;
          }
        }
      })
      .addCase(updateMCQQuestion.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
      });

    // Delete question
    builder
      .addCase(deleteMCQQuestion.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteMCQQuestion.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.allQuestions = state.allQuestions.filter(q => q.id !== action.payload.questionId);
        if (state.currentQuestion && state.currentQuestion.id === action.payload.questionId) {
          state.currentQuestion = null;
        }
      })
      .addCase(deleteMCQQuestion.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload;
      });

    // Fetch categories
    builder
      .addCase(fetchMCQCategories.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.categories = action.payload.data;
        }
      })
      .addCase(fetchMCQCategories.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Create category
    builder
      .addCase(createMCQCategory.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.categories.push(action.payload.data);
        }
      })
      .addCase(createMCQCategory.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Update category
    builder
      .addCase(updateMCQCategory.fulfilled, (state, action) => {
        if (action.payload.success && action.payload.data) {
          state.categories = state.categories.map(cat =>
            cat.id === action.payload.data.id ? action.payload.data : cat
          );
        }
      })
      .addCase(updateMCQCategory.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Bulk import MCQ questions
    builder
      .addCase(bulkImportMCQQuestions.pending, (state) => {
        state.bulkImportLoading = true;
        state.bulkImportError = null;
        state.bulkImportResult = null;
      })
      .addCase(bulkImportMCQQuestions.fulfilled, (state, action) => {
        state.bulkImportLoading = false;
        state.bulkImportResult = action.payload;
        if (action.payload?.success === false && action.payload?.errors) {
          state.bulkImportError = action.payload.errors;
        } else {
          state.bulkImportError = null;
        }
      })
      .addCase(bulkImportMCQQuestions.rejected, (state, action) => {
        state.bulkImportLoading = false;
        state.bulkImportError = action.payload;
      });
  },
});

export const {
  clearErrors,
  setSearchTerm,
  setSelectedDifficulty,
  setSelectedCategory,
  setSelectedQuestionType,
  setCurrentQuestion,
  clearCurrentQuestion,
  clearBulkImportResult,
} = mcqQuestionSlice.actions;

export default mcqQuestionSlice.reducer;

