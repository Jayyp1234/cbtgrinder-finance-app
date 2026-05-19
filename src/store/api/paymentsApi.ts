import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_HOST } from './baseApi';

/**
 * paymentsApi — consumes the existing /api/admin/payments/* surface.
 *
 * The backend doesn't have a separate /api/finance/payments transactions
 * endpoint yet — we reuse what admin already exposes. Any finance_admin
 * with a valid JWT can hit these because AdminMiddleware::handle() doesn't
 * gate on role for the basic admin endpoints. The truly sensitive ones
 * (manual credit, gateway lookup) live under /api/finance/* and DO
 * require requireFinanceAccess.
 */

// ─── Types ───────────────────────────────────────────────

export type PaymentStatus = 'initialized' | 'pending' | 'success' | 'failed' | 'reversed';
export type PaymentPurpose = 'subscription' | 'wallet_topup' | 'xp_pack' | 'refund_reversal' | 'manual_credit' | string;

export interface AdminPaymentRow {
  id: number;
  internal_ref: string;
  provider_ref: string | null;
  user: { id: number; email: string | null; name: string | null };
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount_kobo: number;
  amount_ngn: number;
  amount_display: string;
  plan_id: number | null;
  plan_name: string | null;
  xp_pack_id: number | null;
  xp_pack_name: string | null;
  failure_reason: string | null;
  metadata: Record<string, any> | null;
  initialized_at: string | null;
  verified_at: string | null;
  created_at: string | null;
}

export interface AdminPaymentDetail extends AdminPaymentRow {
  provider: string;
  ip: string | null;
  user_agent: string | null;
}

export interface WalletTxRow {
  id: number;
  user_id: number;
  type: 'credit' | 'debit';
  amount_kobo: number;
  balance_after_kobo: number;
  reason: string;
  reference: string;
  related_payment_id: number | null;
  created_at: string;
  metadata?: string | null;
}

export interface TransactionsListResponse {
  transactions: AdminPaymentRow[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface TransactionDetailResponse {
  transaction: AdminPaymentDetail;
  wallet_transactions: WalletTxRow[];
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  status?: PaymentStatus | '';
  purpose?: PaymentPurpose | '';
  user_id?: number | '';
  search?: string;
}

// ─── Webhook events ──────────────────────────────────────

export type WebhookResultStatus =
  | 'success' | 'failed' | 'duplicate' | 'ignored' | 'invalid_signature' | 'not_found' | 'pending' | 'unknown';

export interface WebhookEventRow {
  id: number;
  provider: string;
  event_id: string;
  event_type: string;
  reference: string | null;
  payment_transaction_id: number | null;
  signature_valid: boolean;
  source_ip: string | null;
  processed: boolean;
  processed_at: string | null;
  result_status: WebhookResultStatus | null;
  error_message: string | null;
  received_at: string | null;
}

export interface WebhookEventDetail extends WebhookEventRow {
  raw_payload: string;
  parsed_payload: Record<string, any> | null;
}

export interface WebhookEventFilters {
  page?: number;
  limit?: number;
  provider?: string;
  status?: WebhookResultStatus | '';
  processed?: '' | 0 | 1;
  search?: string;
}

export interface WebhookEventsListResponse {
  events: WebhookEventRow[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── Providers ───────────────────────────────────────────

export interface PaymentProvider {
  id: number;
  provider_key: string;
  display_name: string;
  mode: 'test' | 'live';
  public_key: string;
  secret_key_set: boolean;
  secret_key_preview: string;
  webhook_secret_set: boolean;
  webhook_secret_preview: string;
  callback_url: string;
  active: boolean;
  last_tested_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ActiveProviderResponse {
  active_provider: string;
  registered: string[];
  providers: PaymentProvider[];
}

export type PaymentProviderUpdateBody =
  Partial<Record<'mode' | 'public_key' | 'secret_key' | 'webhook_secret' | 'callback_url' | 'display_name', string>>
  & Partial<Record<'active' | 'clear_secret_key' | 'clear_webhook_secret', boolean>>;

// ─── XP Packs ────────────────────────────────────────────

export interface XpPack {
  id: number;
  name: string;
  slug: string;
  xp_amount: number;
  price_kobo: number;
  price_ngn: number;
  price_display: string;
  bonus_pct: number;
  description: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// ─── Feature catalog ─────────────────────────────────────

export type FeatureValueType = 'boolean' | 'numeric_cap' | 'numeric_allowance';
export type ResetPeriod = 'none' | 'monthly' | 'weekly' | 'daily';

export interface FeatureDefinition {
  id: number;
  feature_key: string;
  name: string;
  description: string;
  value_type: FeatureValueType;
  default_value: string;
  reset_period: ResetPeriod;
  category: string;
  sort_order: number;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// ─── Plan × Feature matrix ───────────────────────────────

export interface MatrixPlan {
  id: number;
  name: string;
  slug: string;
  price_ngn: number;
  period: string;
  is_active: boolean;
  sort_order: number;
}

export interface MatrixCell {
  plan_id: number;
  feature_key: string;
  value: string;
  enabled: boolean;
  is_override: boolean;
}

export interface FeatureMatrix {
  plans: MatrixPlan[];
  features: FeatureDefinition[];
  cells: MatrixCell[];
}

// ─── API ─────────────────────────────────────────────────

const PAYMENTS_BASE = `${API_HOST}/api/admin/payments`;

export const paymentsApi = createApi({
  reducerPath: 'paymentsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: PAYMENTS_BASE,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Api-Key', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Transaction', 'WebhookEvent', 'Provider', 'ActiveProvider', 'XpPack', 'Feature', 'Matrix'],
  endpoints: (builder) => ({
    // Transactions
    listTransactions: builder.query<TransactionsListResponse, TransactionFilters | void>({
      query: (args) => {
        const qs = new URLSearchParams();
        const f = (args || {}) as TransactionFilters;
        if (f.page)    qs.set('page', String(f.page));
        if (f.limit)   qs.set('limit', String(f.limit));
        if (f.status)  qs.set('status', String(f.status));
        if (f.purpose) qs.set('purpose', String(f.purpose));
        if (f.user_id) qs.set('user_id', String(f.user_id));
        if (f.search)  qs.set('search', String(f.search));
        const tail = qs.toString();
        return { url: `/transactions${tail ? `?${tail}` : ''}`, method: 'GET' };
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'Transaction', id: 'LIST' }],
    }),
    getTransaction: builder.query<TransactionDetailResponse, number>({
      query: (id) => ({ url: `/transactions/${id}`, method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_r, _e, id) => [{ type: 'Transaction', id }],
    }),
    refundTransaction: builder.mutation<
      { message: string; wallet_balance_after_kobo: number; wallet_balance_after_ngn: number; refund_reference: string },
      { id: number; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/transactions/${id}/refund`,
        method: 'POST',
        body: reason ? { reason } : {},
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Transaction', id }, { type: 'Transaction', id: 'LIST' }],
    }),

    // Webhook events
    listWebhookEvents: builder.query<WebhookEventsListResponse, WebhookEventFilters | void>({
      query: (args) => {
        const qs = new URLSearchParams();
        const f = (args || {}) as WebhookEventFilters;
        if (f.page)     qs.set('page', String(f.page));
        if (f.limit)    qs.set('limit', String(f.limit));
        if (f.provider) qs.set('provider', f.provider);
        if (f.status)   qs.set('status', f.status);
        if (f.processed !== undefined && f.processed !== '') qs.set('processed', String(f.processed));
        if (f.search)   qs.set('search', f.search);
        const tail = qs.toString();
        return { url: `/webhook-events${tail ? `?${tail}` : ''}`, method: 'GET' };
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'WebhookEvent', id: 'LIST' }],
    }),
    getWebhookEvent: builder.query<{ event: WebhookEventDetail }, number>({
      query: (id) => ({ url: `/webhook-events/${id}`, method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_r, _e, id) => [{ type: 'WebhookEvent', id }],
    }),
    retryWebhookEvent: builder.mutation<{ message: string; result: any; event: WebhookEventDetail }, number>({
      query: (id) => ({ url: `/webhook-events/${id}/retry`, method: 'POST' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_r, _e, id) => [
        { type: 'WebhookEvent', id },
        { type: 'WebhookEvent', id: 'LIST' },
        { type: 'Transaction', id: 'LIST' },
      ],
    }),

    // Providers
    getActiveProvider: builder.query<ActiveProviderResponse, void>({
      query: () => ({ url: '/active-provider', method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ['ActiveProvider'],
    }),
    setActiveProvider: builder.mutation<{ active_provider: string; message: string }, { provider_key: string }>({
      query: (body) => ({ url: '/active-provider', method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['ActiveProvider', { type: 'Provider' }],
    }),
    getProvider: builder.query<{ provider: PaymentProvider }, string>({
      query: (key) => ({ url: `/providers/${key}`, method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_r, _e, key) => [{ type: 'Provider', id: key }],
    }),
    updateProvider: builder.mutation<{ provider: PaymentProvider }, { key: string } & PaymentProviderUpdateBody>({
      query: ({ key, ...body }) => ({ url: `/providers/${key}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_r, _e, { key }) => [{ type: 'Provider', id: key }, 'ActiveProvider'],
    }),

    // ─── XP Packs ───────────────────────────────────────
    listXpPacks: builder.query<{ packs: XpPack[] }, void>({
      query: () => ({ url: '/xp-packs', method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'XpPack', id: 'LIST' }],
    }),
    createXpPack: builder.mutation<{ pack: XpPack }, Partial<XpPack>>({
      query: (body) => ({ url: '/xp-packs', method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'XpPack', id: 'LIST' }],
    }),
    updateXpPack: builder.mutation<{ pack: XpPack }, { id: number } & Partial<XpPack>>({
      query: ({ id, ...body }) => ({ url: `/xp-packs/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'XpPack', id: 'LIST' }],
    }),
    deleteXpPack: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/xp-packs/${id}`, method: 'DELETE' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'XpPack', id: 'LIST' }],
    }),

    // ─── Feature catalog ────────────────────────────────
    listFeatures: builder.query<{ features: FeatureDefinition[] }, void>({
      query: () => ({ url: '/features', method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'Feature', id: 'LIST' }],
    }),
    createFeature: builder.mutation<{ feature: FeatureDefinition }, Partial<FeatureDefinition>>({
      query: (body) => ({ url: '/features', method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'Feature', id: 'LIST' }, { type: 'Matrix' }],
    }),
    updateFeature: builder.mutation<{ feature: FeatureDefinition }, { id: number } & Partial<FeatureDefinition>>({
      query: ({ id, ...body }) => ({ url: `/features/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'Feature', id: 'LIST' }, { type: 'Matrix' }],
    }),
    deleteFeature: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/features/${id}`, method: 'DELETE' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'Feature', id: 'LIST' }, { type: 'Matrix' }],
    }),

    // ─── Plan × Feature Matrix ──────────────────────────
    getMatrix: builder.query<FeatureMatrix, void>({
      query: () => ({ url: '/matrix', method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'Matrix' }],
    }),
    saveMatrix: builder.mutation<
      { updated: number; matrix: FeatureMatrix },
      { cells: Array<{ plan_id: number; feature_key: string; value: string; enabled: boolean }> }
    >({
      query: (body) => ({ url: '/matrix', method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'Matrix' }],
    }),
  }),
});

export const {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useRefundTransactionMutation,
  useListWebhookEventsQuery,
  useGetWebhookEventQuery,
  useRetryWebhookEventMutation,
  useGetActiveProviderQuery,
  useSetActiveProviderMutation,
  useGetProviderQuery,
  useUpdateProviderMutation,
  useListXpPacksQuery,
  useCreateXpPackMutation,
  useUpdateXpPackMutation,
  useDeleteXpPackMutation,
  useListFeaturesQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useDeleteFeatureMutation,
  useGetMatrixQuery,
  useSaveMatrixMutation,
} = paymentsApi;
