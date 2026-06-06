import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_HOST } from './baseApi';

/**
 * plansApi — consumes /api/admin/plans/* (the consumer-tier plans, NOT the
 * enterprise plans). Slim port of admin's plansApi.
 */

export interface PlanRow {
  id: number;
  name: string;
  slug: string;
  price_ngn: number;
  price_display: string;
  period: string;
  description: string;
  tagline?: string | null;
  color?: string | null;
  icon?: string | null;
  button_text: string;
  features: string[];
  comparison: Record<string, string>;
  is_popular: boolean;
  most_popular_label?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlanPriceRow {
  id: number | null;
  plan_id: number;
  term_months: number;
  price_ngn: number;
  price_display: string;
  display_label?: string | null;
  badge?: string | null;
  is_active: boolean;
  is_promotional: boolean;
  sort_order: number;
}

export interface FeatureDef {
  feature_key: string;
  name: string;
  value_type: string;
}

export interface PlansBundle {
  plans: PlanRow[];
  features: FeatureDef[];
  matrix: Record<number, Record<string, { value: string; enabled: boolean; is_override: boolean }>>;
  prices_by_plan: Record<number, PlanPriceRow[]>;
}

export interface UpsertPlanRequest {
  name?: string;
  slug?: string;
  price_ngn?: number;
  period?: string;
  description?: string;
  tagline?: string | null;
  is_popular?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface RefundPreviewRow {
  subscription_id: number;
  user_id: number;
  email: string;
  name: string;
  last_payment_id: number | null;
  refund_kobo: number;
  refund_ngn: number;
  refund_display: string;
}

export interface RefundPreview {
  plan: PlanRow;
  users_count: number;
  users_with_refund: number;
  total_refund_kobo: number;
  total_refund_ngn: number;
  total_refund_display: string;
  sample: RefundPreviewRow[];
}

export interface DeleteWithRefundResult {
  message: string;
  refunded_users: number;
  total_credited_kobo: number;
  total_credited_ngn: number;
  errors: string[];
}

const BASE = `${API_HOST}/api/admin/plans`;

export const plansApi = createApi({
  reducerPath: 'plansApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Api-Key', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Plans'],
  endpoints: (b) => ({
    getPlansBundle: b.query<PlansBundle, void>({
      query: () => ({ url: '/', method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ['Plans'],
    }),
    updatePlan: b.mutation<{ plan: PlanRow }, { id: number; body: UpsertPlanRequest }>({
      query: ({ id, body }) => ({ url: `/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Plans'],
    }),
    createPlan: b.mutation<{ plan: PlanRow }, UpsertPlanRequest>({
      query: (body) => ({ url: '/', method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Plans'],
    }),
    deletePlan: b.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Plans'],
    }),

    // ─── Multi-term prices ───
    createPlanPrice: b.mutation<
      { price: PlanPriceRow },
      { planId: number; body: Partial<PlanPriceRow> }
    >({
      query: ({ planId, body }) => ({ url: `/${planId}/prices`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Plans'],
    }),
    updatePlanPrice: b.mutation<
      { price: PlanPriceRow },
      { priceId: number; body: Partial<PlanPriceRow> }
    >({
      query: ({ priceId, body }) => ({ url: `/prices/${priceId}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Plans'],
    }),
    deletePlanPrice: b.mutation<{ message: string }, number>({
      query: (priceId) => ({ url: `/prices/${priceId}`, method: 'DELETE' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Plans'],
    }),

    // ─── Refund + archive ───
    getRefundPreview: b.query<RefundPreview, number>({
      query: (id) => ({ url: `/${id}/refund-preview`, method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
    }),
    deletePlanWithRefund: b.mutation<DeleteWithRefundResult, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/${id}/delete-with-refund`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Plans'],
    }),
  }),
});

export const {
  useGetPlansBundleQuery,
  useUpdatePlanMutation,
  useCreatePlanMutation,
  useDeletePlanMutation,
  useCreatePlanPriceMutation,
  useUpdatePlanPriceMutation,
  useDeletePlanPriceMutation,
  useGetRefundPreviewQuery,
  useDeletePlanWithRefundMutation,
} = plansApi;
