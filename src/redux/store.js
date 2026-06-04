'use client';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from './storage'; // custom storage with SSR support
import rootReducer from './reducers';

const persistConfig = {
  key: 'sales-dashboard',
  storage,
  whitelist: ['userAuth'], // Only persist auth; salesData is transient
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

const persistor = persistStore(store);
export {store, persistor};
