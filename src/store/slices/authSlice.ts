import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Roles allowed inside the finance app. Backend enforces this on every
// request; this list is the client-side mirror used to gate UI BEFORE
// the first API call (so the login screen redirects correctly).
export const FINANCE_ROLES = ['super_admin', 'finance_admin', 'Administrator'];

export const hasFinanceAccess = (role?: string | null): boolean =>
  !!role && FINANCE_ROLES.includes(role);

const storedUser = localStorage.getItem('user');
const initialState: AuthState = {
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken?: string }>
    ) => {
      const { user, token, refreshToken } = action.payload;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken ?? state.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.login.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, { payload }) => {
        state.isLoading = false;
        const inner = (payload as any)?.data ?? payload;
        if (inner?.user && inner?.token) {
          state.user = inner.user;
          state.token = inner.token;
          state.refreshToken = inner.refreshToken ?? state.refreshToken;
          state.isAuthenticated = true;
          localStorage.setItem('token', inner.token);
          if (inner.refreshToken) localStorage.setItem('refreshToken', inner.refreshToken);
          localStorage.setItem('user', JSON.stringify(inner.user));
        }
      })
      .addMatcher(authApi.endpoints.login.matchRejected, (state, { error }) => {
        state.isLoading = false;
        state.error = error.message ?? 'Login failed';
      });

    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    });

    // /auth/me — refresh the cached user record (role might have changed)
    builder.addMatcher(authApi.endpoints.me.matchFulfilled, (state, { payload }) => {
      const u = (payload as any)?.user;
      if (u) {
        state.user = u;
        localStorage.setItem('user', JSON.stringify(u));
      }
    });
  },
});

export const { logout, clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
