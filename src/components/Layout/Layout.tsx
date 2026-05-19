import { Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSidebarOpen } from '../../store/slices/uiSlice';
import Sidebar from './Sidebar';
import Header from './Header';

const TITLES: Record<string, { title: string; crumb: string }> = {
  '/':              { title: 'Overview',            crumb: 'Overview' },
  '/diagnostics':   { title: 'Payment Diagnostics', crumb: 'Diagnostics' },
  '/transactions':  { title: 'Transactions',        crumb: 'Transactions' },
  '/webhooks':      { title: 'Webhook Events',      crumb: 'Webhook Events' },
  '/wallets':       { title: 'Wallet Operations',   crumb: 'Wallets' },
  '/enterprise':    { title: 'Enterprise Billing',  crumb: 'Enterprise' },
  '/plans':         { title: 'Plans & Pricing',     crumb: 'Plans' },
  '/features':      { title: 'Feature Catalog',     crumb: 'Features' },
  '/xp-packs':      { title: 'XP Packs',            crumb: 'XP Packs' },
  '/providers':     { title: 'Payment Providers',   crumb: 'Providers' },
};

export default function Layout() {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((s) => s.ui);
  const location = useLocation();

  const cfg = TITLES[location.pathname] ?? { title: 'Finance', crumb: '' };
  const breadcrumb =
    location.pathname === '/'
      ? undefined
      : [{ label: 'Home' }, { label: cfg.crumb }];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar
        isMobileOpen={sidebarOpen}
        onMobileToggle={() => dispatch(setSidebarOpen(!sidebarOpen))}
      />

      <div className="flex-1 lg:ml-72 flex flex-col overflow-hidden">
        <Header
          title={cfg.title}
          breadcrumb={breadcrumb}
          onMobileMenuToggle={() => dispatch(setSidebarOpen(!sidebarOpen))}
          isMobileMenuOpen={sidebarOpen}
        />

        <main className="flex-1 overflow-auto p-3 sm:p-6 bg-gray-50 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
