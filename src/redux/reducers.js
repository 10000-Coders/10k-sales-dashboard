"use client";
import { combineReducers } from "@reduxjs/toolkit";
import userAuthReducer from "./features/user/userAuth";
import salesDataReducer from "./features/salesData/salesDataSlice";
import leadsReducer from "./features/leads/leadsSlice";
import referralFormReducer from "./features/referralForm/referralFormSlice";
import publicChallengeReducer from "./features/publicChallenges/publicChallengeSlice";
import mcqQuestionReducer from "./features/mcqQuestions/mcqQuestionSlice";
import { dashboardApi } from "./features/dashboard/dashboardApi";

const rootReducer = combineReducers({
  userAuth: userAuthReducer,
  salesData: salesDataReducer,
  leads: leadsReducer,
  referralForm: referralFormReducer,
  publicChallenges: publicChallengeReducer,
  mcqQuestions: mcqQuestionReducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
});

export default rootReducer;
