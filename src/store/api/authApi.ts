import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setCredentials } from '../slices/authSlice';
import { API_HOST } from './baseApi';

/**
 * authApi — finance app uses the SAME admin login endpoint
 * (/api/admin/auth/login). The finance-only access check happens at the
 * controller level via AdminMiddleware::requireFinanceAccess.
 *
 * After login we call /api/admin/auth/me to read the canonical role; if
 * it's not one of FINANCE_ROLES the app gates the user out with a
 * friendly "no access" screen.
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface LoginResponseInner {
  user: MeUser;
  token: string;
  refreshToken: string;
}

export interface LoginResponse {
  status?: boolean;
  data?: LoginResponseInner;
  // Some backends wrap, some don't — we destructure defensively
  user?: MeUser;
  token?: string;
  refreshToken?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success?: boolean;
  data?: { token: string; refreshToken: string };
  token?: string;
  refreshToken?: string;
}

const ADMIN_AUTH = `${API_HOST}/api/admin/auth`;

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: ADMIN_AUTH,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('X-Api-Key', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Backend returns the auth payload either at the top level or
          // inside `data` depending on which Response::json wrapper version
          // is in use. Handle both.
          const inner = data.data ?? (data as unknown as LoginResponseInner);
          if (inner?.user && inner?.token) {
            dispatch(setCredentials({
              user: inner.user as any,
              token: inner.token,
              refreshToken: inner.refreshToken,
            }));
          }
        } catch {
          // login failed — error surfaced to caller via rejected promise
        }
      },
      invalidatesTags: ['Auth'],
    }),

    me: builder.query<{ user: MeUser }, void>({
      query: () => ({ url: '/me', method: 'GET' }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ['Auth'],
    }),

    refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
      query: ({ refreshToken }) => ({
        url: '/refresh',
        method: 'POST',
        body: { refreshToken },
      }),
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const inner = data.data ?? data;
          if (inner?.token) {
            localStorage.setItem('token', inner.token);
            if (inner.refreshToken) {
              localStorage.setItem('refreshToken', inner.refreshToken);
            }
          }
        } catch {
          // refresh failed — user re-logs in
        }
      },
    }),

    logout: builder.mutation<{ success: boolean; message?: string }, void>({
      query: () => ({ url: '/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          dispatch(authApi.util.invalidateTags(['Auth']));
        }
      },
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useLoginMutation,
  useMeQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi;
