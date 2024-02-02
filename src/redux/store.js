'use client';
import {configureStore} from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import {persistStore, persistReducer} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import rootReducer from './reducers';

const persistConfig = {
  key: 'sales-dashboard',
  storage,
  // whitelist: ['navigation'], only navigation will be persisted
  // blacklist: ['navigation'] navigation will not be persisted
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  //   middleware: [thunk],
  devTools: process.env.NODE_ENV !== 'production',
});

const persistor = persistStore(store);
export {store, persistor};
