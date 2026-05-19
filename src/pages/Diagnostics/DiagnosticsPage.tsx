import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, AlertCircle, CheckCircle2, Loader2, RefreshCw,
  Wallet, Receipt, Banknote, Globe, ArrowDownToLine, ArrowUpFromLine, Plus,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import {
  useLazyUserSummaryQuery,
  useGatewayLookupMutation,
  useForceFulfillMutation,
  useManualCreditMutation,
  type UserSummary,
  type GatewayLookupResult,
} from '../../store/api/diagnosticsApi';

export default function DiagnosticsPage() {
  // ─── User lookup ──────────────────────────────────────────────────
  const [emailQuery, setEmailQuery] = useState('');
  const [userIdQuery, setUserIdQuery] = useState('');
  const [trigger, { data: summary, isFetching: loadingSummary }] = useLazyUserSummaryQuery();

  const runUserLookup = async () => {
    const email = emailQuery.trim();
    const userId = parseInt(userIdQuery, 10);
    if (!email && !userId) {
      toast.error('Enter a user email or id');
      return;
    }
    try {
      await trigger({
        ...(email ? { email } : {}),
        ...(userId ? { user_id: userId } : {}),
      }).unwrap();
    } catch (e: any) {
      toast.error(e?.data?.message || 'User not found');
    }
  };

  // ─── Gateway lookup ──────────────────────────────────────────────
  const [refQuery, setRefQuery] = useState('');
  const [providerQuery, setProviderQuery] = useState<'auto' | 'budpay' | 'paystack'>('auto');
  const [lookup, { data: lookupResult, isLoading: looking }] = useGatewayLookupMutation();

  const runGatewayLookup = async () => {
    const reference = refQuery.trim();
    if (!reference) {
      toast.error('Enter a reference');
      return;
    }
    try {
      await lookup({
        reference,
        ...(providerQuery !== 'auto' ? { provider: providerQuery } : {}),
      }).unwrap();
    } catch (e: any) {
      toast.error(e?.data?.message || 'Lookup failed');
    }
  };

  // ─── Action mutations ────────────────────────────────────────────
  const [forceFulfill, { isLoading: fulfilling }] = useForceFulfillMutation();
  const [manualCredit, { isLoading: crediting }] = useManualCreditMutation();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero strip */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-rose-600 via-red-600 to-orange-600 text-white p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Recovery cockpit</h2>
              <p className="text-sm text-white/80 mt-0.5 max-w-2xl">
                Look up a user, verify a transaction at the gateway, and recover stuck payments — or credit a wallet manually when nothing's recoverable. Every action is audit-logged with admin id, reason, and reference.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── User Lookup ──────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-600" />
          Find a user
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="email"
            placeholder="user@email.com"
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runUserLookup()}
            className="md:col-span-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <input
            type="number"
            placeholder="OR user id (e.g. 42)"
            value={userIdQuery}
            onChange={(e) => setUserIdQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runUserLookup()}
            className="md:col-span-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <motion.button
            onClick={runUserLookup}
            disabled={loadingSummary}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loadingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Look up user
          </motion.button>
        </div>
      </Card>

      {/* ─── User Summary ─────────────────────────────────── */}
      {summary && (
        <UserSummaryCard
          summary={summary}
          onAction={() => runUserLookup()}
          fulfilling={fulfilling}
          forceFulfill={forceFulfill}
        />
      )}

      {/* ─── Gateway Lookup ─────────────────────────────── */}
      <Card className="p-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-600" />
          Verify a reference at the gateway
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Paste a BudPay/Paystack reference — we'll ask the gateway directly and compare against our DB.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="reference (top_20260504..., trx_...)"
            value={refQuery}
            onChange={(e) => setRefQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runGatewayLookup()}
            className="md:col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <select
            value={providerQuery}
            onChange={(e) => setProviderQuery(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="auto">Auto-detect</option>
            <option value="budpay">BudPay</option>
            <option value="paystack">Paystack</option>
          </select>
          <motion.button
            onClick={runGatewayLookup}
            disabled={looking}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Verify
          </motion.button>
        </div>
        {lookupResult && (
          <GatewayLookupResultCard
            result={lookupResult}
            onForceFulfill={async (id) => {
              try {
                const out = await forceFulfill(id).unwrap();
                toast.success(`Fulfilled — status now: ${out.payment?.status ?? '?'}`);
                if (summary?.user) runUserLookup();
              } catch (e: any) {
                toast.error(e?.data?.message || 'Fulfillment failed');
              }
            }}
            fulfilling={fulfilling}
          />
        )}
      </Card>

      {/* ─── Manual Credit ──────────────────────────────────── */}
      <ManualCreditCard
        currentUserId={summary?.user?.id ? Number(summary.user.id) : null}
        currentUserEmail={summary?.user?.email}
        prefillReference={lookupResult?.reference ?? ''}
        prefillAmountKobo={lookupResult?.gateway?.amount_kobo ?? 0}
        manualCredit={manualCredit}
        crediting={crediting}
        onCredited={() => runUserLookup()}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  User Summary
// ═══════════════════════════════════════════════════════════════════

function UserSummaryCard({
  summary,
  onAction,
  fulfilling,
  forceFulfill,
}: {
  summary: UserSummary;
  onAction: () => void;
  fulfilling: boolean;
  forceFulfill: (id: number) => any;
}) {
  const balanceNgn = summary.wallet?.balance_ngn ?? 0;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-100 font-bold">User</div>
            <h3 className="text-xl font-bold mt-0.5">{summary.user.name}</h3>
            <div className="text-sm text-emerald-100">{summary.user.email} · id {summary.user.id}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-emerald-100 font-bold">Wallet</div>
            <div className="text-3xl font-extrabold mt-0.5 tabular-nums">₦{balanceNgn.toLocaleString()}</div>
            <button
              onClick={onAction}
              className="text-xs text-emerald-100 hover:text-white inline-flex items-center gap-1 mt-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
        <div className="p-5">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Recent payments
          </h4>
          {summary.recent_payments.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">No payments on record.</p>
          ) : (
            <ul className="space-y-2">
              {summary.recent_payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-gray-700 dark:text-gray-300 truncate">{p.internal_ref}</code>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {p.purpose} · {p.provider}
                      {p.failure_reason && <span className="text-red-500"> · {p.failure_reason}</span>}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-900 dark:text-white tabular-nums">₦{p.amount_ngn.toLocaleString()}</span>
                    {['pending', 'initialized', 'failed'].includes(p.status) && (
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Force fulfill ${p.internal_ref}?`)) return;
                          try {
                            await forceFulfill(p.id).unwrap();
                            toast.success('Re-ran fulfillment.');
                          } catch (e: any) {
                            toast.error(e?.data?.message || 'Failed');
                          }
                        }}
                        disabled={fulfilling}
                        title="Force re-fulfill"
                        className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Recent wallet activity
          </h4>
          {summary.recent_wallet_transactions.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">No wallet activity.</p>
          ) : (
            <ul className="space-y-2">
              {summary.recent_wallet_transactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <li key={tx.id} className="flex items-start gap-2 text-xs">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isCredit ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                               : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                    }`}>
                      {isCredit ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-white capitalize">{tx.reason}</div>
                      <div className="text-gray-500 dark:text-gray-400 truncate">{tx.reference}</div>
                    </div>
                    <div className={`font-bold tabular-nums flex-shrink-0 ${isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {isCredit ? '+' : '-'}₦{tx.amount_ngn.toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Gateway Lookup Result
// ═══════════════════════════════════════════════════════════════════

function GatewayLookupResultCard({
  result, onForceFulfill, fulfilling,
}: {
  result: GatewayLookupResult;
  onForceFulfill: (id: number) => void;
  fulfilling: boolean;
}) {
  const gw = result.gateway;
  const local = result.local;
  const issues = result.discrepancy?.issues ?? [];

  return (
    <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
        <div className="p-4 bg-indigo-50/40 dark:bg-indigo-900/10">
          <div className="text-xs uppercase tracking-wide text-indigo-700 dark:text-indigo-400 font-bold mb-2">Gateway says</div>
          <div className="space-y-1 text-sm">
            <KeyValue k="status" v={<StatusPill status={gw.status} />} />
            <KeyValue k="amount" v={<span className="font-bold">₦{Math.floor((gw.amount_kobo ?? 0) / 100).toLocaleString()}</span>} />
            <KeyValue k="customer" v={gw.customer_email ?? '—'} />
            <KeyValue k="paid_at" v={gw.paid_at ?? '—'} />
            <KeyValue k="response" v={gw.gateway_response ?? '—'} />
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300 font-bold mb-2">Our DB says</div>
          {local ? (
            <div className="space-y-1 text-sm">
              <KeyValue k="status" v={<StatusPill status={local.status} />} />
              <KeyValue k="amount" v={<span className="font-bold">₦{Math.floor((local.amount_kobo ?? 0) / 100).toLocaleString()}</span>} />
              <KeyValue k="purpose" v={local.purpose} />
              <KeyValue k="internal_ref" v={<code className="text-xs font-mono">{local.internal_ref}</code>} />
              <KeyValue k="verified_at" v={local.verified_at ?? '—'} />
            </div>
          ) : (
            <div className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No row in <code>payment_transactions</code>.
            </div>
          )}
        </div>
      </div>

      {issues.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">Discrepancies</div>
          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
            {issues.map((i) => (
              <li key={i} className="flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /><code>{i}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recoverable && local && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800 px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-emerald-800 dark:text-emerald-300">
            <strong>Recoverable.</strong> Gateway confirms paid, local row is stuck — re-run fulfillment.
          </div>
          <button
            onClick={() => onForceFulfill(local.id)}
            disabled={fulfilling}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {fulfilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Force fulfill
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Manual Credit
// ═══════════════════════════════════════════════════════════════════

function ManualCreditCard({
  currentUserId, currentUserEmail, prefillReference, prefillAmountKobo,
  manualCredit, crediting, onCredited,
}: {
  currentUserId: number | null;
  currentUserEmail?: string;
  prefillReference: string;
  prefillAmountKobo: number;
  manualCredit: any;
  crediting: boolean;
  onCredited: () => void;
}) {
  const [amountNgn, setAmountNgn] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (prefillReference) setReference(prefillReference);
    if (prefillAmountKobo) setAmountNgn(String(Math.floor(prefillAmountKobo / 100)));
  }, [prefillReference, prefillAmountKobo]);

  const submit = async () => {
    if (!currentUserId) { toast.error('Look up the user first.'); return; }
    const ngn = parseInt(amountNgn, 10);
    if (!ngn || ngn <= 0) { toast.error('Amount must be > 0'); return; }
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    if (!reference.trim()) { toast.error('Reference is required'); return; }
    if (!window.confirm(`Credit ₦${ngn.toLocaleString()} to ${currentUserEmail ?? currentUserId}?`)) return;
    try {
      const r = await manualCredit({
        user_id: currentUserId,
        amount_kobo: ngn * 100,
        reason: reason.trim(),
        reference: reference.trim(),
      }).unwrap();
      if (r.idempotent) toast(`Already credited — no double-credit.`, { icon: 'ℹ️' });
      else {
        toast.success(r.message);
        setAmountNgn(''); setReason(''); setReference('');
        onCredited();
      }
    } catch (e: any) {
      toast.error(e?.data?.message || 'Manual credit failed');
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
        <Banknote className="w-4 h-4 text-rose-600" />
        Manual wallet credit
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Use this when there's nothing recoverable from the gateway side. Logged with admin id + reason + reference.
      </p>
      {!currentUserId && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Look up a user first (above).
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Amount (₦)</label>
          <input type="number" value={amountNgn} onChange={(e) => setAmountNgn(e.target.value)} placeholder="500"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={!currentUserId} />
        </div>
        <div className="md:col-span-1">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reference (idempotency)</label>
          <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="CEO-MAY-5-500"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={!currentUserId} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reason (audit log)</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Top-up on May 5 — webhook never fired, bank confirmed debit"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={!currentUserId} />
        </div>
      </div>
      <motion.button
        onClick={submit} disabled={!currentUserId || crediting}
        className="mt-4 w-full md:w-auto px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-md"
        whileHover={currentUserId && !crediting ? { scale: 1.02 } : undefined}
        whileTap={currentUserId && !crediting ? { scale: 0.98 } : undefined}
      >
        {crediting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Credit wallet
      </motion.button>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function KeyValue({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide w-28 flex-shrink-0">{k}</span>
      <span className="text-sm text-gray-900 dark:text-white min-w-0">{v}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    success:     'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    pending:     'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    initialized: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    failed:      'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    abandoned:   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    reversed:    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    unknown:     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}
