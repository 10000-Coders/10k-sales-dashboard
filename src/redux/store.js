'use client';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from './storage'; // custom storage with SSR support
import rootReducer from './reducers';
import { dashboardApi } from './features/dashboard/dashboardApi';

const persistConfig = {
  key: 'sales-dashboard',
  storage,
  whitelist: ['userAuth'], // Only persist auth; salesData and dashboardApi cache are transient
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

/** Clear dashboard stats cache on logout so next user doesn't see stale data */
const logoutClearDashboardCache = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type === 'userAuth/logout/fulfilled') {
    store.dispatch(dashboardApi.util.resetApiState());
  }
  return result;
};

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
      .concat(dashboardApi.middleware)
      .concat(logoutClearDashboardCache),
  devTools: process.env.NODE_ENV !== 'production',
});

const persistor = persistStore(store);
export {store, persistor};
