import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_HOST } from './baseApi';

/**
 * diagnosticsApi — the four endpoints that power the Payment Diagnostics
 * page on finance.cbtgrinder.com.
 *
 *   GET   /payments/user-summary          (?user_id= or ?email=)
 *   POST  /payments/gateway-lookup        { reference, provider? }
 *   POST  /payments/transactions/:id/force-fulfill
 *   POST  /payments/manual-credit         { user_id, amount_kobo, reason, reference }
 *
 * All routes are gated server-side by AdminMiddleware::requireFinanceAccess
 * which checks the role claim on the admin JWT.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface UserBasic {
  id: number | string;
  email: string;
  name: string;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance_kobo: number;
  balance_ngn: number;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentRow {
  id: number;
  internal_ref: string;
  provider_ref: string | null;
  provider: string;
  purpose: string;
  status: string;
  amount_kobo: number;
  amount_ngn: number;
  failure_reason: string | null;
  initialized_at: string | null;
  verified_at: string | null;
  created_at: string | null;
}

export interface WalletTxRow {
  id: number;
  type: string;
  amount_kobo: number;
  amount_ngn: number;
  reason: string;
  reference: string;
  related_payment_id: number | null;
  balance_after_kobo: number | null;
  balance_after_ngn: number | null;
  created_at: string | null;
}

export interface UserSummary {
  user: UserBasic;
  wallet: Wallet | null;
  recent_payments: PaymentRow[];
  recent_wallet_transactions: WalletTxRow[];
}

export interface GatewayVerifyResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending' | 'unknown' | string;
  amount_kobo: number;
  currency?: string;
  paid_at?: string | null;
  customer_email?: string | null;
  gateway_response?: string | null;
  reference: string;
  raw?: any;
}

export interface GatewayLookupResult {
  reference: string;
  provider: string;
  gateway: GatewayVerifyResult;
  local: PaymentRow | null;
  discrepancy: {
    issues: string[];
    gateway_amount_kobo?: number;
    local_amount_kobo?: number;
    gateway_status?: string;
    local_status?: string;
  };
  recoverable: boolean;
}

export interface ForceFulfillResult {
  result: any;
  payment: PaymentRow | null;
}

export interface ManualCreditResult {
  message: string;
  wallet_balance_after_kobo: number;
  wallet_balance_after_ngn: number;
  payment_id: number;
  internal_ref: string;
  wallet_reference: string;
  idempotent?: boolean;
  existing_wallet_transaction?: any;
}

// ─── Slice ──────────────────────────────────────────────────────────

const FINANCE_BASE = `${API_HOST}/api/finance`;

export const diagnosticsApi = createApi({
  reducerPath: 'diagnosticsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: FINANCE_BASE,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Api-Key', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['UserSummary', 'GatewayLookup'],
  endpoints: (builder) => ({
    userSummary: builder.query<UserSummary, { user_id?: number; email?: string }>({
      query: (args) => {
        const qs = new URLSearchParams();
        if (args.user_id) qs.set('user_id', String(args.user_id));
        if (args.email) qs.set('email', args.email);
        return { url: `/payments/user-summary?${qs.toString()}`, method: 'GET' };
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, arg) => [
        { type: 'UserSummary', id: arg.user_id ?? arg.email ?? 'CURRENT' },
      ],
    }),

    gatewayLookup: builder.mutation<
      GatewayLookupResult,
      { reference: string; provider?: string }
    >({
      query: (body) => ({
        url: '/payments/gateway-lookup',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
    }),

    forceFulfill: builder.mutation<ForceFulfillResult, number>({
      query: (id) => ({
        url: `/payments/transactions/${id}/force-fulfill`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['UserSummary'],
    }),

    manualCredit: builder.mutation<
      ManualCreditResult,
      { user_id: number; amount_kobo: number; reason: string; reference: string }
    >({
      query: (body) => ({
        url: '/payments/manual-credit',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['UserSummary'],
    }),
  }),
});

export const {
  useUserSummaryQuery,
  useLazyUserSummaryQuery,
  useGatewayLookupMutation,
  useForceFulfillMutation,
  useManualCreditMutation,
} = diagnosticsApi;
