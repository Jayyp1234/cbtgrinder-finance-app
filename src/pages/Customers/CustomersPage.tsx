import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Search, Loader2, Filter as FilterIcon, ChevronLeft, ChevronRight,
  Eye, UserCheck, Ban, X, Mail, Phone, Calendar, Users as UsersIcon, GraduationCap,
  Briefcase, CheckCircle2, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card, { StatCard } from '../../components/ui/Card';
import {
  useListEnterpriseCustomersQuery,
  useUpdateEnterpriseCustomerStatusMutation,
  useGetEnterpriseCustomerQuery,
  type EnterpriseCustomer,
} from '../../store/api/enterpriseApi';

/**
 * Enterprise Customers — every school account that signed up.
 *
 * Ported from admin app (was at /enterprise there). Belongs in finance
 * because:
 *   - Customer count drives MRR projections (Overview page)
 *   - Activating/deactivating affects whether they're billable
 *   - Detail view shows their subscription + invoice history (via the
 *     existing Enterprise Billing page once wired up)
 */
const PAGE_SIZES = [10, 25, 50, 100];

const TYPE_LABELS: Record<string, string> = {
  tutorial_center: 'Tutorial Center',
  secondary_school: 'Secondary School',
  university: 'University',
  coaching_center: 'Coaching Center',
};
const TYPE_GRADIENTS: Record<string, string> = {
  tutorial_center: 'from-blue-500 to-indigo-600',
  secondary_school: 'from-emerald-500 to-teal-600',
  university: 'from-purple-500 to-violet-600',
  coaching_center: 'from-orange-500 to-red-600',
};

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [instType, setInstType] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useListEnterpriseCustomersQuery({
    page, limit, search: search || undefined,
    status: status || undefined,
    institution_type: instType || undefined,
  });
  const [updateStatus, { isLoading: updating }] = useUpdateEnterpriseCustomerStatusMutation();

  const onSearch = () => { setSearch(searchInput.trim()); setPage(1); };

  const enterprises = data?.enterprises ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const activeCount   = enterprises.filter((e) => e.status === 1).length;
  const verifiedCount = enterprises.filter((e) => e.is_email_verified === 1).length;
  const onboardedCount = enterprises.filter((e) => e.onboarded === 1).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total customers"  value={total} sub="In the database"                  icon={Building2}    tone="purple" />
        <StatCard label="Active"           value={activeCount} sub={`of ${enterprises.length} on this page`} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Email verified"   value={verifiedCount} sub="Inbox confirmed"          icon={Mail}         tone="blue" />
        <StatCard label="Onboarded"        value={onboardedCount} sub="Finished setup wizard"   icon={GraduationCap} tone="teal" />
      </div>

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="name, email, company…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Any</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select value={instType} onChange={(e) => { setInstType(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Any type</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Per page</label>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <motion.button onClick={onSearch}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg text-sm shadow-md flex items-center gap-2"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <FilterIcon className="w-4 h-4" /> Apply
          </motion.button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">All enterprise customers</h2>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{total} total</span>
        </div>

        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
        ) : enterprises.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No enterprise customers match those filters.</p>
            {(search || status || instType) && (
              <button onClick={() => { setSearch(''); setSearchInput(''); setStatus(''); setInstType(''); setPage(1); }}
                className="mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="text-left text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Students</th>
                  <th className="px-4 py-3 text-right">Staff</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {enterprises.map((e) => (
                  <Row key={e.id} e={e}
                    onView={() => setOpenId(e.id)}
                    onToggle={async () => {
                      const next = e.status === 1 ? 0 : 1;
                      try {
                        await updateStatus({ id: e.id, status: next }).unwrap();
                        toast.success(next === 1 ? 'Activated.' : 'Deactivated.');
                      } catch (err: any) {
                        toast.error(err?.data?.message || 'Update failed');
                      }
                    }}
                    busy={updating}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40">
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {openId !== null && <CustomerDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Row({
  e, onView, onToggle, busy,
}: {
  e: EnterpriseCustomer;
  onView: () => void;
  onToggle: () => void;
  busy: boolean;
}) {
  const type = e.institution_type ?? 'tutorial_center';
  const grad = TYPE_GRADIENTS[type] ?? 'from-gray-500 to-gray-600';
  const label = TYPE_LABELS[type] ?? type;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {(e.name?.[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">{e.name}</div>
            {e.company_name && e.company_name !== e.name && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.company_name}</div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{e.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-900 dark:text-white">{e.student_count}</td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{e.staff_count}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {e.status === 1 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">active</span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">inactive</span>
          )}
          {e.is_email_verified === 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">unverified</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        {e.date_created ? new Date(e.date_created).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex gap-1 justify-end">
          <button onClick={onView} title="View" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={onToggle} disabled={busy} title={e.status === 1 ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded-lg ${e.status === 1
              ? 'hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400'
              : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
            } disabled:opacity-50`}>
            {e.status === 1 ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

function CustomerDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useGetEnterpriseCustomerQuery(id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer detail</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {isLoading || !data ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${TYPE_GRADIENTS[data.enterprise.institution_type ?? 'tutorial_center'] ?? 'from-gray-500 to-gray-600'} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}>
                {(data.enterprise.name?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{data.enterprise.name}</h3>
                {data.enterprise.company_name && <p className="text-sm text-gray-500 dark:text-gray-400">{data.enterprise.company_name}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {TYPE_LABELS[data.enterprise.institution_type ?? 'tutorial_center'] ?? data.enterprise.institution_type}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <Field icon={Mail}     k="Email"     v={data.enterprise.email} />
              <Field icon={Phone}    k="Phone"     v={data.enterprise.phone || '—'} />
              <Field icon={UsersIcon} k="Students" v={data.enterprise.student_count.toLocaleString()} />
              <Field icon={Briefcase} k="Staff"    v={data.enterprise.staff_count.toLocaleString()} />
              <Field icon={Calendar} k="Joined"    v={data.enterprise.date_created ? new Date(data.enterprise.date_created).toLocaleString() : '—'} />
              <Field icon={data.enterprise.status === 1 ? CheckCircle2 : XCircle} k="Status"
                v={data.enterprise.status === 1 ? 'Active' : 'Inactive'} />
            </div>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-sm">Close</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, k, v }: { icon: any; k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-bold">{k}</div>
        <div className="text-sm text-gray-900 dark:text-white">{v}</div>
      </div>
    </div>
  );
}
