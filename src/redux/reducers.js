"use client";
import { combineReducers } from "@reduxjs/toolkit";
import counterReducer from "./features/counter/counterSlice";
import userAuthReducer from "./features/user/userAuth";

const rootReducer = combineReducers({
  counter: counterReducer, // Just for Testing
  userAuth: userAuthReducer,
});

export default rootReducer;
