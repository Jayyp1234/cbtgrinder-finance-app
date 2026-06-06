import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import OverviewPage from './pages/Overview/OverviewPage';
import DiagnosticsPage from './pages/Diagnostics/DiagnosticsPage';
import TransactionsPage from './pages/Transactions/TransactionsPage';
import WebhooksPage from './pages/Webhooks/WebhooksPage';
import WalletsPage from './pages/Wallets/WalletsPage';
import EnterprisePage from './pages/Enterprise/EnterprisePage';
import CustomersPage from './pages/Customers/CustomersPage';
import PlansPage from './pages/Plans/PlansPage';
import FeaturesPage from './pages/Features/FeaturesPage';
import XpPacksPage from './pages/XpPacks/XpPacksPage';
import ProvidersPage from './pages/Providers/ProvidersPage';

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#1f2937', color: '#fff' },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index           element={<OverviewPage />} />
              <Route path="diagnostics" element={<DiagnosticsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="webhooks"  element={<WebhooksPage />} />
              <Route path="wallets"   element={<WalletsPage />} />
              <Route path="enterprise" element={<EnterprisePage />} />
              <Route path="customers"  element={<CustomersPage />} />
              <Route path="plans"     element={<PlansPage />} />
              <Route path="features"  element={<FeaturesPage />} />
              <Route path="xp-packs"  element={<XpPacksPage />} />
              <Route path="providers" element={<ProvidersPage />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}
