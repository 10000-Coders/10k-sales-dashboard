"use client";
import { Provider } from "react-redux";
import { store, persistor } from "./store";
import { PersistGate } from "redux-persist/integration/react";
import SpinnerLoader from "@/components/SpinnerLoader";
import AuthTokenSync from "@/components/AuthTokenSync";

/**
 * Wait for persisted auth to rehydrate before rendering the app.
 * With loading={null}, routes briefly saw isLoggedIn=false and redirected wrongly.
 */
function PersistLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SpinnerLoader />
    </div>
  );
}

export const Providers = ({ children }) => {
  return (
    <Provider store={store}>
      <PersistGate loading={<PersistLoading />} persistor={persistor}>
        <AuthTokenSync />
        {children}
      </PersistGate>
    </Provider>
  );
};
