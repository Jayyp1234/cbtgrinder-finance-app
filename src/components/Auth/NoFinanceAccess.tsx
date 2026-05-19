import { ShieldOff, LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout as logoutAction } from '../../store/slices/authSlice';

/**
 * Shown when an admin logs in successfully but their role isn't on the
 * FINANCE_ROLES list. The backend will refuse every API call anyway —
 * this just makes the situation human-readable instead of a wall of
 * 403s in the network tab.
 */
export default function NoFinanceAccess() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-4">
          <ShieldOff className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Finance access required</h1>
        <p className="text-sm text-gray-600 mt-2">
          You're signed in as <strong>{user?.email}</strong> with role{' '}
          <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{user?.role || 'unknown'}</code>.
          This dashboard is restricted to admins with the <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">finance_admin</code>{' '}
          or <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">super_admin</code> role.
        </p>
        <p className="text-xs text-gray-500 mt-4">
          Ask a super-admin to update your role in the admin panel, then sign in again.
        </p>
        <button
          onClick={() => dispatch(logoutAction())}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
