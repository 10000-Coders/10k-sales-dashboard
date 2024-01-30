import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import axios from '../../../axios';
import useFormData from '@/hooks/useFormData';
import {setDynamicHeader} from '../../../interceptManager';

// Registration action
export const registration = createAsyncThunk('userAuth/registration', async (formData, {rejectWithValue}) => {
  const formDataInputs = useFormData(formData);
  try {
    const response = await axios.post('/salesperson/register-salesperson/', formDataInputs);
    const {name, email, mobile} = formData;
    const updatedState = {
      name,
      email,
      mobile,
    };

    return {responseData: response.data, updatedState};
  } catch (error) {
    return rejectWithValue(error.response);
  }
});

// Login action
export const login = createAsyncThunk('userAuth/login', async (formData, {rejectWithValue}) => {
  const formDataInputs = useFormData(formData);
  try {
    const response = await axios.post('/salesperson/admin-login/', formDataInputs);
    const {salesperson_auth_token} = response.data;
    const updatedState = {
      email: formData.email,
      salesperson_auth_token,
    };

    return {responseData: response.data, updatedState};
  } catch (error) {
    return rejectWithValue(error.response);
  }
});

// addSalesperson action
export const salesApproval = createAsyncThunk(
  'userAuth/salesApproval',
  async (formData, {rejectWithValue, getState}) => {
    try {
      const {salesperson_auth_token} = getState().userAuth.user;
      setDynamicHeader(salesperson_auth_token);

      const response = await axios.post(`/salesperson/add-salesperson/${formData.email}/`);

      return {responseData: response.data};
    } catch (error) {
      return rejectWithValue(error.response);
    }
  },
);

// Logout action
export const logout = createAsyncThunk('userAuth/logout', async () => {
  try {
    return {responseData: null};
  } catch (error) {
    return rejectWithValue(error.response);
  }
});

export const userAuthSlice = createSlice({
  name: 'userAuth',
  initialState: {
    user: {
      name: '',
      mobile: '',
      email: '',
      salesperson_auth_token: '',
    },
    isLoggedIn: false,

    registerLoading: false,
    loginLoading: false,
    logoutLoading: false,
    salesApprovalLoading: false,

    registerError: null,
    loginError: null,
    logoutError: null,
  },
  reducers: {
    // Additional reducers if needed
  },
  extraReducers: builder => {
    builder
      .addCase(registration.pending, state => {
        state.registerLoading = true;
        state.isLoggedIn = false;
        state.user = {
          name: '',
          mobile: '',
          email: '',
          salesperson_auth_token: '',
        };
        state.registerError = null;
      })
      .addCase(registration.fulfilled, (state, action) => {
        state.registerLoading = false;
        state.isLoggedIn = true;
        state.user = {
          ...state.user,
          ...action.payload.updatedState,
          salesperson_auth_token: action.payload.responseData.salesperson_auth_token,
        };
      })
      .addCase(registration.rejected, (state, action) => {
        state.registerLoading = false;
        state.registerError = action.payload;
      })
      .addCase(login.pending, state => {
        state.loginLoading = true;
        state.isLoggedIn = false;
        state.user = {
          name: '',
          mobile: '',
          email: '',
          salesperson_auth_token: '',
        };
        state.loginError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.isLoggedIn = true;
        state.user = {...state.user, ...action.payload.updatedState};
      })
      .addCase(login.rejected, (state, action) => {
        state.loginLoading = false;
        state.loginError = action.payload;
      })
      .addCase(salesApproval.pending, (state, action) => {
        state.salesApprovalLoading = true;
      })
      .addCase(salesApproval.fulfilled, (state, action) => {
        state.salesApprovalLoading = false;
      })
      .addCase(salesApproval.rejected, (state, action) => {
        state.salesApprovalLoading = false;
      })
      .addCase(logout.pending, state => {
        state.logoutLoading = true;
        state.isLoggedIn = false;
        state.logoutError = null;
      })
      .addCase(logout.fulfilled, state => {
        state.logoutLoading = false;
        state.isLoggedIn = false;
      })
      .addCase(logout.rejected, (state, action) => {
        state.logoutLoading = false;
        state.logoutError = action.payload;
      });
  },
});

export default userAuthSlice.reducer;
