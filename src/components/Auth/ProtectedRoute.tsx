import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import LoginPage from './LoginPage';
import NoFinanceAccess from './NoFinanceAccess';
import { hasFinanceAccess, logout as logoutAction } from '../../store/slices/authSlice';
import { useMeQuery } from '../../store/api/authApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — finance app gate.
 *
 * Four states:
 *   1. Not logged in        → LoginPage
 *   2. /auth/me returns 401 → auto-logout + LoginPage (stale token cleanup)
 *   3. Logged in, no role   → NoFinanceAccess
 *   4. Logged in + role OK  → render children
 *
 * The /auth/me canary is what makes this resilient to backend restarts that
 * invalidate JWTs — instead of leaving the user staring at a broken UI with
 * every panel 401-ing, we detect the auth failure once and reset to login.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const { data: meResp, isLoading: meLoading, error: meError } = useMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  // Watch for /auth/me failures. If the backend says 401 or 403, our token
  // is stale (typical after backend restart). Wipe local state so the user
  // gets a fresh login screen instead of a wall of 401s in DevTools.
  useEffect(() => {
    if (!meError) return;
    const status = (meError as any)?.status;
    if (status === 401 || status === 403) {
      dispatch(logoutAction());
    }
  }, [meError, dispatch]);

  // (kept for parity — slice's extraReducer handles persistence)
  useEffect(() => { void meResp; }, [meResp]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (meLoading && !user?.role) {
    return null;
  }

  if (!hasFinanceAccess(user?.role)) {
    return <NoFinanceAccess />;
  }

  return <>{children}</>;
}
