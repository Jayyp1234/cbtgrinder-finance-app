import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Loader2, Receipt, Calendar, CheckCircle2, X,
  Play, AlertCircle, ExternalLink, Users, TrendingUp, Download,
  Banknote, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card, { StatCard } from '../../components/ui/Card';
import { downloadCsv, csvTimestamp } from '../../utils/csv';
import {
  useListInvoicesQuery,
  useGetInvoiceQuery,
  useMarkInvoicePaidMutation,
  useCancelInvoiceMutation,
  useClearBankRefundMutation,
  useRunBillingMutation,
  useListEnterprisePlansQuery,
  useListSubscriptionsQuery,
  type AdminSubscriptionRow,
  type EnterpriseInvoice,
} from '../../store/api/enterpriseApi';

type Tab = 'invoices' | 'subscriptions';

export default function EnterprisePage() {
  const [tab, setTab] = useState<Tab>('invoices');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [bankRefundOnly, setBankRefundOnly] = useState(false);
  const [clearingInvoice, setClearingInvoice] = useState<EnterpriseInvoice | null>(null);

  // Separate query just for the bank-refund badge count — so the badge stays
  // accurate even when the user is filtered to another status.
  const { data: bankRefundData } = useListInvoicesQuery({ bank_refund_required: true, limit: 200 });
  const bankRefundCount = bankRefundData?.invoices?.length ?? 0;
  const bankRefundTotalNgn = (bankRefundData?.invoices ?? []).reduce((acc, i) => acc + i.total_ngn, 0);

  const { data: invoicesData, isLoading: invLoading, refetch } = useListInvoicesQuery({
    status: statusFilter || undefined,
    search: search || undefined,
    bank_refund_required: bankRefundOnly || undefined,
    limit: 50,
  });
  useListEnterprisePlansQuery(); // prefetch plan catalogue (used elsewhere)
  const { data: subsData, isLoading: subsLoading } = useListSubscriptionsQuery();
  const [runBilling, { isLoading: running }] = useRunBillingMutation();

  // Aggregates
  const invoices = invoicesData?.invoices ?? [];
  const subscriptions = subsData?.subscriptions ?? [];
  const openTotal = invoices.filter((i) => ['open', 'overdue'].includes(i.status)).reduce((acc, i) => acc + i.total_ngn, 0);
  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + i.total_ngn, 0);
  const failedCount = invoices.filter((i) => i.status === 'failed').length;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  const activeSubs = subscriptions.filter((s) => ['active', 'trialing'].includes(s.status));
  const mrrNgn = activeSubs.reduce((acc, s) => acc + s.monthly_total_ngn, 0);
  const totalSeats = activeSubs.reduce((acc, s) => acc + s.active_seats, 0);

  const handleRunBilling = async () => {
    if (!window.confirm('Run the monthly billing engine NOW? It will process any subscription whose period has ended and generate invoices for active seats.')) return;
    try {
      const r = await runBilling({}).unwrap();
      if (r.errors.length > 0) {
        toast.error(`${r.invoices_created} invoices created, ${r.errors.length} errors. Check below.`);
      } else if (r.invoices_created === 0) {
        toast(`Processed ${r.processed} subscriptions — no invoices were due.`, { icon: '✓' });
      } else {
        toast.success(`Generated ${r.invoices_created} invoices totalling ₦${(r.total_kobo / 100).toLocaleString()}.`);
      }
      refetch();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Run failed');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="MRR"           value={`₦${mrrNgn.toLocaleString()}`}     sub={`${activeSubs.length} active subs`} icon={TrendingUp} tone="emerald" />
        <StatCard label="Active seats"  value={totalSeats.toLocaleString()}        sub="Across all schools"    icon={Users}      tone="teal" />
        <StatCard label="Outstanding"   value={`₦${openTotal.toLocaleString()}`}  sub="Open + overdue"        icon={Receipt}    tone="amber" />
        <StatCard label="Collected"     value={`₦${paidTotal.toLocaleString()}`}  sub={`${invoices.filter(i => i.status === 'paid').length} paid`} icon={CheckCircle2} tone="blue" />
        <StatCard label="Overdue"       value={overdueCount}                       sub="Past due_at"           icon={Calendar}   tone="rose" />
      </div>

      {/* Tab switcher */}
      <Card className="p-1">
        <div className="flex gap-1">
          <button onClick={() => setTab('invoices')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              tab === 'invoices'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <Receipt className="w-4 h-4" /> Invoices
          </button>
          <button onClick={() => setTab('subscriptions')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              tab === 'subscriptions'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <Building2 className="w-4 h-4" /> Subscriptions
          </button>
        </div>
      </Card>

      {tab === 'invoices' && <>
      {/* Bank-refund queue banner (only when there are pending) */}
      {bankRefundCount > 0 && !bankRefundOnly && (
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
                <Banknote className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {bankRefundCount} bank refund{bankRefundCount === 1 ? '' : 's'} pending — ₦{bankRefundTotalNgn.toLocaleString()} owed to schools
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 max-w-2xl">
                  These invoices were paid by schools (not parents) and refunded during a plan archive. Process the payouts in BudPay/Paystack's dashboard, then click <strong>Mark refunded</strong> on each row to clear the flag.
                </p>
              </div>
            </div>
            <motion.button
              onClick={() => setBankRefundOnly(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Banknote className="w-3.5 h-3.5" /> Open queue
            </motion.button>
          </div>
        </Card>
      )}

      {bankRefundOnly && (
        <Card className="p-3 bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Banknote className="w-4 h-4" />
            <strong>Filtered:</strong> showing {bankRefundCount} invoice{bankRefundCount === 1 ? '' : 's'} needing bank refund (₦{bankRefundTotalNgn.toLocaleString()}).
          </div>
          <button
            onClick={() => setBankRefundOnly(false)}
            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear filter
          </button>
        </Card>
      )}

      {/* Run cron */}
      <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-600" />
              Monthly billing engine
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
              Generates invoices for every school whose current billing period has ended. Idempotent — re-running the same day is a no-op. The cron runs automatically once daily, but you can fire it manually here.
            </p>
          </div>
          <motion.button
            onClick={handleRunBilling}
            disabled={running}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg shadow-md flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run billing now
          </motion.button>
        </div>
      </Card>

      {/* Invoices */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Invoices</h2>
            {invLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search by school or invoice number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <motion.button
              onClick={() => {
                const rows = invoices;
                if (rows.length === 0) { toast.error('No invoices in current view to export.'); return; }
                downloadCsv(
                  `invoices-${csvTimestamp()}.csv`,
                  [
                    { header: 'invoice_number', accessor: (r) => r.invoice_number },
                    { header: 'enterprise',     accessor: (r) => r.enterprise_name ?? r.enterprise_id },
                    { header: 'billing_owner',  accessor: (r) => r.billing_owner },
                    { header: 'period_start',   accessor: (r) => r.period_start },
                    { header: 'period_end',     accessor: (r) => r.period_end },
                    { header: 'status',         accessor: (r) => r.status },
                    { header: 'total_kobo',     accessor: (r) => r.total_kobo },
                    { header: 'total_ngn',      accessor: (r) => r.total_ngn },
                    { header: 'due_at',         accessor: (r) => r.due_at ?? '' },
                    { header: 'paid_at',        accessor: (r) => r.paid_at ?? '' },
                    { header: 'attempts',       accessor: (r) => r.attempts },
                    { header: 'created_at',     accessor: (r) => r.created_at ?? '' },
                  ],
                  rows,
                );
                toast.success(`Exported ${rows.length} invoices.`);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </motion.button>
          </div>
        </div>

        {invLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No invoices yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Once schools subscribe and seats are billed, invoices land here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="text-left text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {invoices.map((inv) => {
                  const needsBankRefund = !!(inv.metadata as any)?.bank_refund_required;
                  return (
                  <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${needsBankRefund ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono">{inv.invoice_number}</code>
                      {needsBankRefund && (
                        <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 align-middle">
                          <Banknote className="w-2.5 h-2.5" /> Bank
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{inv.enterprise_name ?? `#${inv.enterprise_id}`}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{inv.period_start} → {inv.period_end}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize font-semibold text-gray-700 dark:text-gray-300">
                        {inv.billing_owner === 'school' ? '🏫 School' : '👨‍👩 Parent'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><InvoiceStatusPill status={inv.status} /></td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">{inv.total_display}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {needsBankRefund && (
                          <button
                            onClick={() => setClearingInvoice(inv)}
                            title="Mark refunded outside the app (after processing payout via gateway dashboard)"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setOpenId(inv.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                          <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {failedCount > 0 && (
        <Card className="p-4 bg-rose-50/60 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-rose-800 dark:text-rose-300">
              <strong>{failedCount} failed invoice{failedCount === 1 ? '' : 's'}.</strong> Filter by "Failed" above to inspect and retry — or hit "Run billing now" to give it another attempt.
            </div>
          </div>
        </Card>
      )}
      </>}

      {tab === 'subscriptions' && (
        <SubscriptionsTable subscriptions={subscriptions} loading={subsLoading} />
      )}

      {openId !== null && <InvoiceDetailModal id={openId} onClose={() => setOpenId(null)} />}
      {clearingInvoice && (
        <ClearBankRefundModal invoice={clearingInvoice} onClose={() => setClearingInvoice(null)} />
      )}
    </div>
  );
}

function ClearBankRefundModal({
  invoice, onClose,
}: { invoice: EnterpriseInvoice; onClose: () => void }) {
  const [clear, { isLoading }] = useClearBankRefundMutation();
  const [paidRef, setPaidRef] = useState('');
  const [note, setNote] = useState('');

  const submit = async () => {
    try {
      const r = await clear({
        id: invoice.id,
        paid_reference: paidRef.trim() || undefined,
        note: note.trim() || undefined,
      }).unwrap();
      toast.success(r.message);
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to clear flag');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Confirm bank refund processed</h2>
              <p className="text-sm text-white/85 mt-1">
                Mark this invoice as no-longer-pending in our queue. You should have already issued the payout via the BudPay/Paystack merchant dashboard.
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-lg text-sm">
            <div className="flex items-baseline justify-between">
              <code className="text-xs font-mono text-gray-700 dark:text-gray-300">{invoice.invoice_number}</code>
              <span className="font-bold tabular-nums text-gray-900 dark:text-white">{invoice.total_display}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {invoice.enterprise_name ?? `Enterprise #${invoice.enterprise_id}`}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">
              Gateway payout reference (optional)
            </label>
            <input type="text" value={paidRef} onChange={(e) => setPaidRef(e.target.value)}
              placeholder="e.g. budpay-payout-2026-05-19"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">
              Note (optional)
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Any context worth preserving on the audit log"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-sm">
            Cancel
          </button>
          <motion.button onClick={submit} disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow disabled:opacity-50"
            whileHover={!isLoading ? { scale: 1.02 } : undefined}
            whileTap={!isLoading ? { scale: 0.98 } : undefined}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Mark refunded
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function SubscriptionsTable({
  subscriptions, loading,
}: { subscriptions: AdminSubscriptionRow[]; loading: boolean }) {
  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>;
  }
  if (subscriptions.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No schools subscribed yet.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">When a school starts a subscription, it shows here.</p>
      </Card>
    );
  }

  // Sort: active first, then by MRR desc
  const sorted = [...subscriptions].sort((a, b) => {
    const order = (s: string) => (s === 'active' ? 0 : s === 'trialing' ? 1 : s === 'past_due' ? 2 : s === 'suspended' ? 3 : 4);
    const o = order(a.status) - order(b.status);
    return o !== 0 ? o : b.monthly_total_ngn - a.monthly_total_ngn;
  });

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr className="text-left text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Active seats</th>
              <th className="px-4 py-3 text-right">Monthly</th>
              <th className="px-4 py-3">Period ends</th>
              <th className="px-4 py-3">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{s.enterprise_name || s.enterprise_company_name || `#${s.enterprise_id}`}</div>
                  {s.enterprise_company_name && s.enterprise_name !== s.enterprise_company_name && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{s.enterprise_company_name}</div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">{s.enterprise_email}</div>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.plan_display_name}</td>
                <td className="px-4 py-3"><SubStatusPill status={s.status} /></td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">{s.active_seats}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{s.monthly_total_display}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(s.current_period_end).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SubStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    trialing:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    past_due:  'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    suspended: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    cancelled: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 line-through',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>{status}</span>;
}

function InvoiceDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useGetInvoiceQuery(id);
  const [markPaid, { isLoading: marking }] = useMarkInvoicePaidMutation();
  const [cancel, { isLoading: cancelling }] = useCancelInvoiceMutation();

  const handleMarkPaid = async () => {
    if (!window.confirm('Mark this invoice as PAID? Use only when payment was confirmed off-channel (e.g. bank transfer).')) return;
    try {
      await markPaid({ id, note: 'Marked paid by finance admin' }).unwrap();
      toast.success('Marked paid.');
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed');
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Cancel this invoice? Optional reason:') ?? '';
    if (reason === null) return;
    try {
      await cancel({ id, reason: reason || 'Cancelled by finance admin' }).unwrap();
      toast.success('Invoice cancelled.');
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {isLoading || !data ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 text-white p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <code className="text-xs font-mono text-white/80">{data.invoice.invoice_number}</code>
                  <h2 className="text-xl font-bold mt-1">{data.invoice.enterprise_name ?? `Enterprise #${data.invoice.enterprise_id}`}</h2>
                  <div className="text-xs text-white/80 mt-1">
                    Period {data.invoice.period_start} → {data.invoice.period_end}
                  </div>
                </div>
                <div className="text-right">
                  <InvoiceStatusPill status={data.invoice.status} large />
                  <div className="text-3xl font-extrabold mt-2 tabular-nums">{data.invoice.total_display}</div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Line items */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Line items</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2">Student</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-right px-3 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {data.items.map((it) => (
                        <tr key={it.id}>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{it.student_name_snapshot}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{it.description}</td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-900 dark:text-white">{it.amount_display}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Events */}
              {data.events.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">History</h3>
                  <ul className="space-y-2">
                    {data.events.map((evt) => (
                      <li key={evt.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 dark:text-white capitalize">
                            {evt.event_type.replace(/_/g, ' ')}
                            {evt.from_status && evt.to_status && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">
                                ({evt.from_status} → {evt.to_status})
                              </span>
                            )}
                          </div>
                          {evt.message && <div className="text-xs text-gray-600 dark:text-gray-400">{evt.message}</div>}
                          <div className="text-[10px] text-gray-400 dark:text-gray-500">
                            {evt.created_at ? new Date(evt.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                {data.invoice.status !== 'paid' && data.invoice.status !== 'cancelled' && (
                  <button onClick={handleMarkPaid} disabled={marking}
                    className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                    {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark as paid
                  </button>
                )}
                {data.invoice.status !== 'paid' && data.invoice.status !== 'cancelled' && (
                  <button onClick={handleCancel} disabled={cancelling}
                    className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Cancel invoice
                  </button>
                )}
                <button onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function InvoiceStatusPill({ status, large = false }: { status: string; large?: boolean }) {
  const map: Record<string, string> = {
    draft:     'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    open:      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    paid:      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    overdue:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    failed:    'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 line-through',
    refunded:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-700';
  if (large) {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-white/20 text-white border border-white/30`}>
        {status}
      </span>
    );
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>{status}</span>;
}
