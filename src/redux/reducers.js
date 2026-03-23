"use client";
import { combineReducers } from "@reduxjs/toolkit";
import userAuthReducer from "./features/user/userAuth";
import salesDataReducer from "./features/salesData/salesDataSlice";
import referralFormReducer from "./features/referralForm/referralFormSlice";
import { dashboardApi } from "./features/dashboard/dashboardApi";

const rootReducer = combineReducers({
  userAuth: userAuthReducer,
  salesData: salesDataReducer,
  referralForm: referralFormReducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
});

export default rootReducer;
