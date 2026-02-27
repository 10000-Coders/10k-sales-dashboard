"use client";
import { combineReducers } from "@reduxjs/toolkit";
import userAuthReducer from "./features/user/userAuth";

const rootReducer = combineReducers({
  userAuth: userAuthReducer,
});

export default rootReducer;
