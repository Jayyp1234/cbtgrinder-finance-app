import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

/**
 * baseApi — root for ALL endpoints in the finance app.
 *
 * Two URL bases share one tenant:
 *   - `/api/admin/auth/*`    → login, refresh, /auth/me  (same admin JWT)
 *   - `/api/finance/*`       → everything financial
 *
 * Each slice attaches the right prefix to its query, so this baseQuery's
 * baseUrl resolves to the API HOST only. Slices construct the full path
 * (`/api/admin/...` or `/api/finance/...`) themselves.
 *
 * Why share one host instead of two baseQueries?
 *   - Same JWT, same auth headers, same retry/reauth logic — sharing keeps
 *     the surface tiny.
 *   - The endpoint path tells the backend which routes file (admin or
 *     finance) to dispatch to.
 */
const API_HOST = (() => {
  const runtimeUrl = (globalThis as any)?.__APP_CONFIG__?.API_BASE_URL as string | undefined;
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  const isProd = (import.meta as any)?.env?.PROD as boolean | undefined;
  const chosen = runtimeUrl && runtimeUrl.trim().length > 0
    ? runtimeUrl.trim()
    : (envUrl && envUrl.trim().length > 0 ? envUrl.trim() : undefined);
  const fallback = isProd ? 'https://main.cbtgrinder.com' : 'http://localhost:8080';
  const base = chosen ?? fallback;
  return base.replace(/\/+$/, '');
})();

export { API_HOST };

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_HOST,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Api-Key', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Auth', 'PaymentLookup', 'UserSummary', 'WalletTx'],
  endpoints: () => ({}),
});
