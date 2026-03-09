"use client";
import { combineReducers } from "@reduxjs/toolkit";
import userAuthReducer from "./features/user/userAuth";
import salesDataReducer from "./features/salesData/salesDataSlice";

const rootReducer = combineReducers({
  userAuth: userAuthReducer,
  salesData: salesDataReducer,
});

export default rootReducer;
