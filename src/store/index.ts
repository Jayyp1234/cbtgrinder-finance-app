import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './api/authApi';
import { diagnosticsApi } from './api/diagnosticsApi';
import { paymentsApi } from './api/paymentsApi';
import { plansApi } from './api/plansApi';
import { enterpriseApi, enterpriseCustomersApi } from './api/enterpriseApi';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [diagnosticsApi.reducerPath]: diagnosticsApi.reducer,
    [paymentsApi.reducerPath]: paymentsApi.reducer,
    [plansApi.reducerPath]: plansApi.reducer,
    [enterpriseApi.reducerPath]: enterpriseApi.reducer,
    [enterpriseCustomersApi.reducerPath]: enterpriseCustomersApi.reducer,
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      diagnosticsApi.middleware,
      paymentsApi.middleware,
      plansApi.middleware,
      enterpriseApi.middleware,
      enterpriseCustomersApi.middleware,
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export { useAppDispatch, useAppSelector } from './hooks';
