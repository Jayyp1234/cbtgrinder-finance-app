import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Receipt,
  Wallet,
  Building2,
  CreditCard,
  Plug,
  Webhook,
  LogOut,
  Zap,
  ListChecks,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useLogoutMutation } from '../../store/api/authApi';
import { logout } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileToggle: () => void;
}

type Item = {
  id: string;
  label: string;
  icon: any;
  color: string;
  path: string;
};

const NAV: Item[] = [
  { id: '/',              label: 'Overview',            icon: LayoutDashboard, color: 'text-emerald-600', path: '/' },
  { id: '/diagnostics',   label: 'Payment Diagnostics', icon: Search,          color: 'text-rose-600',    path: '/diagnostics' },
  { id: '/transactions',  label: 'Transactions',        icon: Receipt,         color: 'text-blue-600',    path: '/transactions' },
  { id: '/webhooks',      label: 'Webhook Events',      icon: Webhook,         color: 'text-indigo-600',  path: '/webhooks' },
  { id: '/wallets',       label: 'Wallet Operations',   icon: Wallet,          color: 'text-amber-600',   path: '/wallets' },
  { id: '/enterprise',    label: 'Enterprise Billing',  icon: Building2,       color: 'text-purple-600',  path: '/enterprise' },
  { id: '/plans',         label: 'Plans & Pricing',     icon: CreditCard,      color: 'text-teal-600',    path: '/plans' },
  { id: '/features',      label: 'Feature Catalog',     icon: ListChecks,      color: 'text-indigo-600',  path: '/features' },
  { id: '/xp-packs',      label: 'XP Packs',            icon: Zap,             color: 'text-purple-600',  path: '/xp-packs' },
  { id: '/providers',     label: 'Payment Providers',   icon: Plug,            color: 'text-cyan-600',    path: '/providers' },
];

const initials = (n?: string) =>
  (n ?? '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export default function Sidebar({ isMobileOpen, onMobileToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [, setOpen] = useState({});

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(path + '/');

  const sidebarInner = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 shadow-xl border-r border-gray-100 dark:border-gray-700 transition-colors duration-200">
      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
        <motion.div
          className="flex items-center space-x-3 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400 }}
          onClick={() => navigate('/')}
        >
          <div className="relative">
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-lg">
              <img
                src="/web-app-manifest-192x192.png"
                alt="CBT Grinder Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl shadow-lg object-contain"
              />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">
              CBT GRINDER
            </h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tracking-wide uppercase">
              Finance
            </p>
          </div>
        </motion.div>
      </div>

      {/* Menu */}
      <div className="flex-1 px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto min-h-0">
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-3">
          NAVIGATION
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(item.path);
            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (isMobileOpen) onMobileToggle();
                  setOpen({});
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 sm:py-3 text-left text-sm font-medium rounded-xl transition-all duration-200 group ${
                  active
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <item.icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${
                      active ? item.color : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Footer tip card */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50">
          <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mb-1">Safety first</h3>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
            Every wallet credit and refund is audited with admin id, reason, and reference. Use Diagnostics to investigate before crediting.
          </p>
        </div>
      </div>

      {/* User / Logout */}
      <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs sm:text-sm">{initials(user?.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
          </div>
        </div>
        <motion.button
          onClick={async () => {
            try { await logoutMutation().unwrap(); } catch { /* ignore */ }
            dispatch(logout());
            toast.success('Signed out.');
            if (isMobileOpen) onMobileToggle();
            navigate('/');
          }}
          disabled={isLoggingOut}
          className="w-full flex items-center space-x-3 px-3 py-2 sm:py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group disabled:opacity-60"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-4 h-4 group-hover:text-red-500" />
          <span>{isLoggingOut ? 'Signing out…' : 'Sign Out'}</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block w-72 h-screen fixed left-0 top-0 z-30">{sidebarInner()}</div>

      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={onMobileToggle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed left-0 top-0 w-72 h-full"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {sidebarInner()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
