"use client";
import { combineReducers } from "@reduxjs/toolkit";
import userAuthReducer from "./features/user/userAuth";
import salesDataReducer from "./features/salesData/salesDataSlice";
import leadsReducer from "./features/leads/leadsSlice";
import referralFormReducer from "./features/referralForm/referralFormSlice";
import publicChallengeReducer from "./features/publicChallenges/publicChallengeSlice";
import mcqQuestionReducer from "./features/mcqQuestions/mcqQuestionSlice";
import demoStudentsReducer from "./features/demoStudents/demoStudentsSlice";

const rootReducer = combineReducers({
  userAuth: userAuthReducer,
  salesData: salesDataReducer,
  leads: leadsReducer,
  referralForm: referralFormReducer,
  publicChallenges: publicChallengeReducer,
  mcqQuestions: mcqQuestionReducer,
  demoStudents: demoStudentsReducer,
});

export default rootReducer;
