import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_HOST } from './baseApi';

/**
 * enterpriseApi — Phase 0 school billing surface for the finance app.
 *
 * Endpoints:
 *   GET    /api/admin/enterprise/plans                 — pricing catalogue CRUD
 *   GET    /api/admin/enterprise/invoices              — invoice ledger list
 *   GET    /api/admin/enterprise/invoices/{id}         — detail (items + events)
 *   POST   /api/admin/enterprise/invoices/{id}/mark-paid
 *   POST   /api/admin/enterprise/invoices/{id}/cancel
 *   POST   /api/admin/enterprise/billing/run           — fire the monthly cron
 */

// ─── Types ───────────────────────────────────────────────

export interface EnterprisePlan {
  id: number;
  plan_key: string;
  display_name: string;
  description: string;
  monthly_price_per_seat_kobo: number;
  monthly_price_per_seat_ngn: number;
  monthly_price_display: string;
  currency: string;
  features: string[];
  min_seats: number;
  max_seats: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface EnterpriseInvoice {
  id: number;
  subscription_id: number;
  enterprise_id: number;
  billing_owner: 'school' | 'parent';
  parent_user_id: number | null;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal_kobo: number;
  total_kobo: number;
  total_ngn: number;
  total_display: string;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'overdue' | 'cancelled' | 'failed' | 'refunded';
  metadata?: Record<string, any> | null;
  due_at: string | null;
  paid_at: string | null;
  attempts: number;
  enterprise_name?: string;
  created_at: string | null;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  seat_id: number;
  student_name_snapshot: string;
  description: string;
  amount_kobo: number;
  amount_display: string;
}

export interface InvoiceEvent {
  id: number;
  invoice_id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  created_at: string | null;
}

export interface InvoiceDetail {
  invoice: EnterpriseInvoice;
  items: InvoiceItem[];
  events: InvoiceEvent[];
}

export interface EnterpriseRefundPreview {
  plan: EnterprisePlan;
  schools_count: number;
  active_seats_count: number;
  open_invoices: { count: number; total_kobo: number; total_ngn: number; total_display: string };
  parent_refunds: { count: number; total_kobo: number; total_ngn: number; total_display: string };
  school_refunds_required: { count: number; total_kobo: number; total_ngn: number; total_display: string };
  sample: Array<{
    subscription_id: number;
    enterprise_id: number;
    enterprise_name: string;
    enterprise_email: string;
    status: string;
    active_seats: number;
  }>;
}

export interface EnterpriseDeleteRefundResult {
  message: string;
  cancelled_subscriptions: number;
  cancelled_seats: number;
  voided_invoices: number;
  refunded_parents: number;
  total_parent_refund_kobo: number;
  total_parent_refund_ngn: number;
  total_parent_refund_display: string;
  bank_refunds_owed: number;
  total_bank_refund_kobo: number;
  total_bank_refund_ngn: number;
  total_bank_refund_display: string;
}

export interface RunBillingResult {
  processed: number;
  invoices_created: number;
  total_kobo: number;
  errors: string[];
  summary: Array<{
    subscription_id: number;
    enterprise_id: number;
    invoices: Array<{ id: number; invoice_number: string; billing_owner: string; total_kobo: number; total_display: string }>;
    errors: string[];
  }>;
}

/** Enterprise = a school/tutorial-center/university — a customer that pays us. */
export interface EnterpriseCustomer {
  id: number;
  name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  institution_type: string | null;
  status: number; // 1 = active, 0 = inactive
  onboarded: number;
  is_email_verified: number;
  date_created: string;
  date_updated: string;
  student_count: number;
  staff_count: number;
}

export interface EnterpriseCustomersResponse {
  enterprises: EnterpriseCustomer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminSubscriptionRow {
  id: number;
  enterprise_id: number;
  plan_id: number;
  billing_cycle: string;
  default_billing_owner: 'school' | 'parent';
  current_period_start: string;
  current_period_end: string;
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  auto_renew: boolean;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;

  // joined
  enterprise_name: string;
  enterprise_company_name: string;
  enterprise_email: string;
  plan_display_name: string;
  plan_price_per_seat_kobo: number;
  active_seats: number;
  monthly_total_kobo: number;
  monthly_total_ngn: number;
  monthly_total_display: string;
}

const BASE = `${API_HOST}/api/admin/enterprise`;

export const enterpriseApi = createApi({
  reducerPath: 'enterpriseApi',
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
  tagTypes: ['EnterprisePlans', 'Invoices', 'Subscriptions', 'EnterpriseCustomer'],
  endpoints: (b) => ({
    // Plans catalogue
    listEnterprisePlans: b.query<{ plans: EnterprisePlan[] }, { includeArchived?: boolean } | void>({
      query: (args) => ({
        url: `/plans${args?.includeArchived ? '?archived=1' : ''}`,
        method: 'GET',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ['EnterprisePlans'],
    }),
    createEnterprisePlan: b.mutation<{ plan: EnterprisePlan }, Partial<EnterprisePlan> & { features?: string[] }>({
      query: (body) => ({ url: '/plans', method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['EnterprisePlans'],
    }),
    updateEnterprisePlan: b.mutation<{ plan: EnterprisePlan }, { id: number } & Partial<EnterprisePlan> & { features?: string[] }>({
      query: ({ id, ...body }) => ({ url: `/plans/${id}`, method: 'PUT', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['EnterprisePlans'],
    }),
    archiveEnterprisePlan: b.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/plans/${id}`, method: 'DELETE' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['EnterprisePlans'],
    }),
    getEnterpriseRefundPreview: b.query<EnterpriseRefundPreview, number>({
      query: (id) => ({ url: `/plans/${id}/refund-preview`, method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
    }),
    deleteEnterprisePlanWithRefund: b.mutation<
      EnterpriseDeleteRefundResult,
      { id: number; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/plans/${id}/delete-with-refund`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['EnterprisePlans', 'Invoices', 'Subscriptions'],
    }),

    // Invoices
    listInvoices: b.query<
      { invoices: EnterpriseInvoice[] },
      { status?: string; search?: string; limit?: number; offset?: number; bank_refund_required?: boolean } | void
    >({
      query: (args) => {
        const qs = new URLSearchParams();
        if (args?.status)                qs.set('status', args.status);
        if (args?.search)                qs.set('search', args.search);
        if (args?.limit)                 qs.set('limit', String(args.limit));
        if (args?.offset)                qs.set('offset', String(args.offset));
        if (args?.bank_refund_required)  qs.set('bank_refund_required', '1');
        const tail = qs.toString();
        return { url: `/invoices${tail ? `?${tail}` : ''}`, method: 'GET' };
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ['Invoices'],
    }),

    clearBankRefund: b.mutation<
      { message: string; invoice_id: number },
      { id: number; paid_reference?: string; note?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/invoices/${id}/clear-bank-refund`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Invoices'],
    }),
    getInvoice: b.query<InvoiceDetail, number>({
      query: (id) => ({ url: `/invoices/${id}`, method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_r, _e, id) => [{ type: 'Invoices', id }],
    }),
    markInvoicePaid: b.mutation<
      { invoice: EnterpriseInvoice },
      { id: number; payment_transaction_id?: number; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/mark-paid`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Invoices'],
    }),
    cancelInvoice: b.mutation<{ invoice: EnterpriseInvoice }, { id: number; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/cancel`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Invoices'],
    }),
    runBilling: b.mutation<RunBillingResult, { as_of?: string } | void>({
      query: (body) => ({ url: '/billing/run', method: 'POST', body: body ?? {} }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['Invoices'],
    }),

    listSubscriptions: b.query<
      { subscriptions: AdminSubscriptionRow[] },
      { status?: string; search?: string; limit?: number; offset?: number } | void
    >({
      query: (args) => {
        const qs = new URLSearchParams();
        if (args?.status)  qs.set('status', args.status);
        if (args?.search)  qs.set('search', args.search);
        if (args?.limit)   qs.set('limit', String(args.limit));
        if (args?.offset)  qs.set('offset', String(args.offset));
        const tail = qs.toString();
        return { url: `/subscriptions${tail ? `?${tail}` : ''}`, method: 'GET' };
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ['Subscriptions'],
    }),

  }),
});

// ═══════════════════════════════════════════════════════════════════
//  Enterprise CUSTOMERS slice — separate baseUrl (/api/admin/enterprises,
//  plural) so it can't collide with the singular /api/admin/enterprise/*
//  family above. Same admin JWT.
// ═══════════════════════════════════════════════════════════════════

const CUSTOMERS_BASE = `${API_HOST}/api/admin/enterprises`;

export const enterpriseCustomersApi = createApi({
  reducerPath: 'enterpriseCustomersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: CUSTOMERS_BASE,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Api-Key', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['EnterpriseCustomer'],
  endpoints: (b) => ({
    listEnterpriseCustomers: b.query<
      EnterpriseCustomersResponse,
      { page?: number; limit?: number; search?: string; status?: string; institution_type?: string } | void
    >({
      query: (args) => {
        const qs = new URLSearchParams();
        const a = (args || {}) as any;
        if (a.page)             qs.set('page', String(a.page));
        if (a.limit)            qs.set('limit', String(a.limit));
        if (a.search)           qs.set('search', a.search);
        if (a.status)           qs.set('status', a.status);
        if (a.institution_type) qs.set('institution_type', a.institution_type);
        const tail = qs.toString();
        return { url: `${tail ? `?${tail}` : ''}`, method: 'GET' };
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ['EnterpriseCustomer'],
    }),
    getEnterpriseCustomer: b.query<{ enterprise: EnterpriseCustomer }, number>({
      query: (id) => ({ url: `/${id}`, method: 'GET' }),
      transformResponse: (res: any) => {
        const inner = res?.data ?? res;
        // Backend may return the row directly or nested under .enterprise
        return { enterprise: inner?.enterprise ?? inner };
      },
      providesTags: (_r, _e, id) => [{ type: 'EnterpriseCustomer' as const, id }],
    }),
    updateEnterpriseCustomerStatus: b.mutation<
      { success: boolean },
      { id: number; status: number }
    >({
      query: (body) => ({ url: '/update-status', method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ['EnterpriseCustomer'],
    }),
  }),
});

export const {
  useListEnterprisePlansQuery,
  useCreateEnterprisePlanMutation,
  useUpdateEnterprisePlanMutation,
  useArchiveEnterprisePlanMutation,
  useGetEnterpriseRefundPreviewQuery,
  useDeleteEnterprisePlanWithRefundMutation,
  useListInvoicesQuery,
  useGetInvoiceQuery,
  useMarkInvoicePaidMutation,
  useCancelInvoiceMutation,
  useClearBankRefundMutation,
  useRunBillingMutation,
  useListSubscriptionsQuery,
} = enterpriseApi;

export const {
  useListEnterpriseCustomersQuery,
  useGetEnterpriseCustomerQuery,
  useUpdateEnterpriseCustomerStatusMutation,
} = enterpriseCustomersApi;
