import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, ExternalLink, Filter, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import {
  useListTransactionsQuery,
  useGetTransactionQuery,
  useRefundTransactionMutation,
  type PaymentStatus,
  type PaymentPurpose,
} from '../../store/api/paymentsApi';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [purpose, setPurpose] = useState<PaymentPurpose | ''>('');
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, isFetching, refetch } = useListTransactionsQuery({
    page, limit: 25, search, status, purpose,
  });

  const onSearch = () => { setSearch(searchInput.trim()); setPage(1); };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="email, ref, name…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Any</option>
              <option value="initialized">Initialized</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Purpose</label>
            <select
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value as any); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Any</option>
              <option value="subscription">Subscription</option>
              <option value="wallet_topup">Wallet top-up</option>
              <option value="xp_pack">XP pack</option>
              <option value="manual_credit">Manual credit</option>
              <option value="refund_reversal">Refund reversal</option>
            </select>
          </div>
          <motion.button
            onClick={onSearch}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg text-sm shadow-md flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4" /> Apply
          </motion.button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">All transactions</h2>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{data?.total ?? 0} total</span>
        </div>

        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : (data?.transactions?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No transactions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="text-left text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data!.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{tx.user?.name ?? '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tx.user?.email ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-gray-700 dark:text-gray-300">{tx.internal_ref}</code>
                    </td>
                    <td className="px-4 py-3">
                      <PurposePill purpose={tx.purpose} />
                    </td>
                    <td className="px-4 py-3"><StatusPill status={tx.status} /></td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">
                      {tx.amount_display}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setOpenId(tx.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Page {data.page} of {data.total_pages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {openId !== null && <TransactionDetailModal id={openId} onClose={() => setOpenId(null)} onRefunded={refetch} />}
    </div>
  );
}

function TransactionDetailModal({ id, onClose, onRefunded }: { id: number; onClose: () => void; onRefunded: () => void }) {
  const { data, isLoading } = useGetTransactionQuery(id);
  const [refund, { isLoading: refunding }] = useRefundTransactionMutation();
  const [reason, setReason] = useState('');

  const handleRefund = async () => {
    if (!window.confirm('Credit this user the original payment amount to their wallet?')) return;
    try {
      const r = await refund({ id, reason: reason.trim() || undefined }).unwrap();
      toast.success(r.message);
      onRefunded();
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Refund failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transaction detail</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          {isLoading || !data ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : (
            <div className="space-y-4 text-sm">
              <Row k="User" v={`${data.transaction.user.name ?? '—'} · ${data.transaction.user.email ?? '—'}`} />
              <Row k="Internal ref" v={<code className="font-mono text-xs">{data.transaction.internal_ref}</code>} />
              <Row k="Provider ref" v={<code className="font-mono text-xs">{data.transaction.provider_ref ?? '—'}</code>} />
              <Row k="Provider" v={data.transaction.provider} />
              <Row k="Purpose" v={<PurposePill purpose={data.transaction.purpose} />} />
              <Row k="Status" v={<StatusPill status={data.transaction.status} />} />
              <Row k="Amount" v={<span className="font-bold tabular-nums">{data.transaction.amount_display}</span>} />
              <Row k="Initialized" v={data.transaction.initialized_at ?? '—'} />
              <Row k="Verified" v={data.transaction.verified_at ?? '—'} />
              {data.transaction.failure_reason && (
                <Row k="Failure" v={<span className="text-rose-600 dark:text-rose-400">{data.transaction.failure_reason}</span>} />
              )}

              {data.transaction.status === 'success' && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Refund to wallet
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
                    Credits the original amount to the user's wallet and marks this payment <code>reversed</code>. Does not call the gateway's refund API.
                  </p>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg text-sm mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={handleRefund}
                    disabled={refunding}
                    className="w-full px-3 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Refund to wallet
                  </button>
                </div>
              )}

              {data.wallet_transactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Linked wallet activity</h3>
                  <ul className="space-y-1.5">
                    {data.wallet_transactions.map((wt) => (
                      <li key={wt.id} className="text-xs flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <span className="text-gray-700 dark:text-gray-300 capitalize">{wt.type}: {wt.reason}</span>
                        <span className="font-bold tabular-nums">₦{(wt.amount_kobo / 100).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">{k}</span>
      <span className="text-sm text-gray-900 dark:text-white">{v}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    success:     'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    pending:     'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    initialized: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    failed:      'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    reversed:    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}

function PurposePill({ purpose }: { purpose: string }) {
  const labels: Record<string, { label: string; cls: string }> = {
    subscription:    { label: 'Subscription',  cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    wallet_topup:    { label: 'Wallet top-up', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    xp_pack:         { label: 'XP pack',       cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    manual_credit:   { label: 'Manual credit', cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
    refund_reversal: { label: 'Refund',        cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  };
  const e = labels[purpose] ?? { label: purpose, cls: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${e.cls}`}>{e.label}</span>;
}
