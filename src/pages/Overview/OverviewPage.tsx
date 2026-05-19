import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Banknote, TrendingUp, Wallet, Building2, ArrowUpRight, Loader2, Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Card, { StatCard } from '../../components/ui/Card';
import { useListTransactionsQuery } from '../../store/api/paymentsApi';
import { useListInvoicesQuery } from '../../store/api/enterpriseApi';

/**
 * Overview — the CEO's #24 from the PDF:
 *   "create a dashboard in the admin where we would be able to track the income,
 *    based on monthly, 3 months and all... and also section for enterprise"
 *
 * Pulls recent successful transactions and aggregates them by day for the
 * selected period. Backend has `purpose` on every payment, so we can split
 * Subscription / Wallet Top-up / XP Pack revenue.
 */

type Period = '30d' | '90d' | 'all';

export default function OverviewPage() {
  const [period, setPeriod] = useState<Period>('30d');

  // Pull a large batch of successful payments and aggregate client-side.
  // For production scale we'd add a server-side aggregation endpoint, but
  // for now this is fine — most schools/users won't have 10k+ rows.
  const { data: txData, isLoading: txLoading } = useListTransactionsQuery({
    status: 'success',
    limit: 100,
    page: 1,
  });

  const { data: invData, isLoading: invLoading } = useListInvoicesQuery({ limit: 100 });

  const aggregates = useMemo(() => {
    const rows = txData?.transactions ?? [];
    const cutoff = period === '30d'
      ? Date.now() - 30 * 24 * 3600 * 1000
      : period === '90d'
      ? Date.now() - 90 * 24 * 3600 * 1000
      : 0;

    const inWindow = rows.filter((r) => {
      if (!r.verified_at) return false;
      const ts = new Date(r.verified_at).getTime();
      return ts >= cutoff;
    });

    let total = 0, subscriptions = 0, topups = 0, xpPacks = 0, manualCredits = 0;
    const dayBucket: Record<string, { date: string; subscription: number; wallet_topup: number; xp_pack: number; other: number }> = {};

    for (const r of inWindow) {
      const ngn = r.amount_ngn;
      total += ngn;
      const day = (r.verified_at ?? '').substring(0, 10);
      if (!dayBucket[day]) {
        dayBucket[day] = { date: day, subscription: 0, wallet_topup: 0, xp_pack: 0, other: 0 };
      }
      switch (r.purpose) {
        case 'subscription':  subscriptions += ngn; dayBucket[day].subscription += ngn; break;
        case 'wallet_topup':  topups += ngn;        dayBucket[day].wallet_topup += ngn; break;
        case 'xp_pack':       xpPacks += ngn;       dayBucket[day].xp_pack += ngn; break;
        case 'manual_credit': manualCredits += ngn; dayBucket[day].other += ngn; break;
        default:              dayBucket[day].other += ngn; break;
      }
    }

    const series = Object.values(dayBucket).sort((a, b) => (a.date > b.date ? 1 : -1));
    return { total, subscriptions, topups, xpPacks, manualCredits, series, count: inWindow.length };
  }, [txData, period]);

  // Enterprise stats
  const enterpriseAgg = useMemo(() => {
    const invoices = invData?.invoices ?? [];
    let openTotal = 0, paidTotal = 0, openCount = 0, paidCount = 0;
    for (const inv of invoices) {
      if (inv.status === 'open' || inv.status === 'overdue') {
        openTotal += inv.total_ngn;
        openCount++;
      }
      if (inv.status === 'paid') {
        paidTotal += inv.total_ngn;
        paidCount++;
      }
    }
    return { openTotal, paidTotal, openCount, paidCount, total: invoices.length };
  }, [invData]);

  const pieData = [
    { name: 'Subscriptions', value: aggregates.subscriptions, color: '#10b981' },
    { name: 'Wallet top-ups', value: aggregates.topups,       color: '#3b82f6' },
    { name: 'XP packs',       value: aggregates.xpPacks,      color: '#8b5cf6' },
    { name: 'Manual credits', value: aggregates.manualCredits, color: '#f59e0b' },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Income, billing health, and enterprise snapshot.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
          {(['30d', '90d', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p === '30d' ? 'Last 30 days' : p === '90d' ? 'Last 90 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total income"
          value={`₦${aggregates.total.toLocaleString()}`}
          sub={`${aggregates.count} successful payments`}
          icon={Banknote}
          tone="emerald"
        />
        <StatCard
          label="Subscriptions"
          value={`₦${aggregates.subscriptions.toLocaleString()}`}
          sub="Plan upgrades + renewals"
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          label="Wallet top-ups"
          value={`₦${aggregates.topups.toLocaleString()}`}
          sub="In-app credit purchases"
          icon={Wallet}
          tone="amber"
        />
        <StatCard
          label="Enterprise pending"
          value={`₦${enterpriseAgg.openTotal.toLocaleString()}`}
          sub={`${enterpriseAgg.openCount} unpaid invoice${enterpriseAgg.openCount === 1 ? '' : 's'}`}
          icon={Building2}
          tone="purple"
        />
      </div>

      {/* Income chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daily revenue</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Broken down by purpose</p>
          </div>
          {txLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
        </div>
        {aggregates.series.length === 0 ? (
          <EmptyChart label="No revenue in this window yet." />
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={aggregates.series}>
                <defs>
                  <linearGradient id="sub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="xp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="subscription"  name="Subscriptions" stroke="#10b981" fill="url(#sub)" strokeWidth={2} />
                <Area type="monotone" dataKey="wallet_topup"  name="Wallet top-ups" stroke="#3b82f6" fill="url(#top)" strokeWidth={2} />
                <Area type="monotone" dataKey="xp_pack"       name="XP packs" stroke="#8b5cf6" fill="url(#xp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue mix pie */}
        <Card className="p-5 lg:col-span-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Revenue mix</h2>
          {pieData.length === 0 ? (
            <EmptyChart label="—" />
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" outerRadius={70} innerRadius={40}>
                    {pieData.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Enterprise health */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Enterprise billing</h2>
            {invLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
              whileHover={{ y: -2 }}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Collected</div>
              <div className="text-2xl font-extrabold mt-1 text-gray-900 dark:text-white tabular-nums">
                ₦{enterpriseAgg.paidTotal.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {enterpriseAgg.paidCount} paid invoice{enterpriseAgg.paidCount === 1 ? '' : 's'}
              </div>
            </motion.div>
            <motion.div
              className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
              whileHover={{ y: -2 }}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Outstanding</div>
              <div className="text-2xl font-extrabold mt-1 text-gray-900 dark:text-white tabular-nums">
                ₦{enterpriseAgg.openTotal.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {enterpriseAgg.openCount} open / overdue
              </div>
            </motion.div>
          </div>
          <a
            href="/enterprise"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            <Calendar className="w-4 h-4" />
            Go to Enterprise Billing
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-44 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
      {label}
    </div>
  );
}
