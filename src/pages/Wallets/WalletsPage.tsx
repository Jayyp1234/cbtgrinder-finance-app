import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Loader2, ArrowDownToLine, ArrowUpFromLine, Plus, AlertCircle, Search } from 'lucide-react';
import Card, { StatCard } from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { useListTransactionsQuery } from '../../store/api/paymentsApi';

/**
 * Wallet Operations — read-only ledger of all wallet-related payment activity.
 *
 * Surfaces three views:
 *   1. Top-ups (purpose=wallet_topup, status=success)
 *   2. Manual credits (purpose=manual_credit)
 *   3. Refunds (status=reversed)
 *
 * Plus a "go diagnose" CTA — manual credit happens on Diagnostics, this page
 * is the audit trail for those + organic wallet activity.
 */
export default function WalletsPage() {
  const [tab, setTab] = useState<'topups' | 'manual' | 'refunds'>('topups');
  const navigate = useNavigate();

  const { data: topupData, isLoading: l1 } = useListTransactionsQuery({
    purpose: 'wallet_topup', status: 'success', limit: 50,
  });
  const { data: manualData, isLoading: l2 } = useListTransactionsQuery({
    purpose: 'manual_credit', limit: 50,
  });
  const { data: refundData, isLoading: l3 } = useListTransactionsQuery({
    status: 'reversed', limit: 50,
  });

  // Stats
  const topupSum = (topupData?.transactions ?? []).reduce((acc, t) => acc + t.amount_ngn, 0);
  const manualSum = (manualData?.transactions ?? []).reduce((acc, t) => acc + t.amount_ngn, 0);
  const refundSum = (refundData?.transactions ?? []).reduce((acc, t) => acc + t.amount_ngn, 0);

  const active = tab === 'topups' ? topupData : tab === 'manual' ? manualData : refundData;
  const activeLoading = tab === 'topups' ? l1 : tab === 'manual' ? l2 : l3;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Top-ups (recent)"
          value={`₦${topupSum.toLocaleString()}`}
          sub={`${topupData?.total ?? 0} transactions`}
          icon={ArrowDownToLine}
          tone="emerald"
        />
        <StatCard
          label="Manual credits"
          value={`₦${manualSum.toLocaleString()}`}
          sub={`${manualData?.total ?? 0} credits issued`}
          icon={Plus}
          tone="rose"
        />
        <StatCard
          label="Refunds to wallet"
          value={`₦${refundSum.toLocaleString()}`}
          sub={`${refundData?.total ?? 0} refunds`}
          icon={ArrowUpFromLine}
          tone="amber"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-wrap gap-3">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {([
              { key: 'topups',  label: 'Top-ups' },
              { key: 'manual',  label: 'Manual credits' },
              { key: 'refunds', label: 'Refunds' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <motion.button
            onClick={() => navigate('/diagnostics')}
            className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg text-xs shadow flex items-center gap-1.5"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Search className="w-3.5 h-3.5" /> Issue manual credit
          </motion.button>
        </div>

        {activeLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : (active?.transactions?.length ?? 0) === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No entries in this category yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="text-left text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {active!.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{tx.user?.name ?? '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tx.user?.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-gray-700 dark:text-gray-300">{tx.internal_ref}</code>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                      {tx.amount_display}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                      {(tx.metadata?.reason as string) || tx.failure_reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Reminder:</strong> Manual credits go to Payment Diagnostics. Refunds are issued from the Transactions page (detail view → "Refund to wallet").
          </div>
        </div>
      </Card>
    </div>
  );
}
