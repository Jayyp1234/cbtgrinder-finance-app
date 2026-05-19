import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Menu, X, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useLogoutMutation } from '../../store/api/authApi';
import { logout } from '../../store/slices/authSlice';
import toast from 'react-hot-toast';

/**
 * Header — sticky top bar matching the admin app:
 *   - Gradient title + breadcrumb
 *   - Dark-mode toggle (theme context)
 *   - User pill with dropdown (name, email, sign out)
 */
interface HeaderProps {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const getInitials = (name?: string) =>
  (name ?? '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export default function Header({ title, breadcrumb, onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch { /* keep going */ }
    dispatch(logout());
    toast.success('Signed out.');
    setShowUserMenu(false);
  };

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-3 sm:px-6 py-4 sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="min-w-0 flex-1">
            <motion.h1
              className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent truncate"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {title}
            </motion.h1>
            {breadcrumb && (
              <motion.nav
                className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {breadcrumb.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-gray-300 dark:text-gray-600">›</span>}
                    <span
                      className={`transition-colors truncate ${
                        idx === breadcrumb.length - 1
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer'
                      }`}
                    >
                      {item.label}
                    </span>
                  </React.Fragment>
                ))}
              </motion.nav>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <motion.button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            <div className="relative">
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors p-2"
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-semibold text-xs sm:text-sm">
                      {getInitials(user?.name)}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
                <div className="text-sm hidden sm:block text-left">
                  <div className="font-semibold text-gray-900 dark:text-white truncate max-w-24 lg:max-w-none">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs capitalize">
                    {user?.role || 'User'}
                  </div>
                </div>
              </motion.button>

              {showUserMenu && (
                <motion.div
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {user?.role}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isLoggingOut ? 'Signing out…' : 'Sign Out'}</span>
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showUserMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
      )}
    </header>
  );
}
