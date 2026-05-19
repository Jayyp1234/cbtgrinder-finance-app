import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, ExternalLink, Webhook, RotateCcw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import {
  useListWebhookEventsQuery,
  useGetWebhookEventQuery,
  useRetryWebhookEventMutation,
  type WebhookResultStatus,
} from '../../store/api/paymentsApi';

export default function WebhooksPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState<WebhookResultStatus | ''>('');
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useListWebhookEventsQuery({
    page, limit: 25, search, provider, status,
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
                placeholder="event_id, reference…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Provider</label>
            <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Any</option>
              <option value="paystack">Paystack</option>
              <option value="budpay">BudPay</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Result</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Any</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="duplicate">Duplicate</option>
              <option value="ignored">Ignored</option>
              <option value="invalid_signature">Invalid signature</option>
              <option value="not_found">Not found</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <motion.button onClick={onSearch}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg text-sm shadow-md flex items-center gap-2"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Webhook className="w-4 h-4" /> Apply
          </motion.button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Webhook events</h2>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{data?.total ?? 0} total</span>
        </div>

        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : (data?.events?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">No webhook events captured yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="text-left text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Event type</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Signature</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data!.events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white capitalize">{evt.provider}</td>
                    <td className="px-4 py-3"><code className="text-xs">{evt.event_type}</code></td>
                    <td className="px-4 py-3"><code className="text-xs font-mono text-gray-700 dark:text-gray-300">{evt.reference ?? '—'}</code></td>
                    <td className="px-4 py-3"><ResultPill r={evt.result_status} /></td>
                    <td className="px-4 py-3">
                      {evt.signature_valid ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">valid</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">invalid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {evt.received_at ? new Date(evt.received_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setOpenId(evt.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
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
            <div className="text-xs text-gray-500 dark:text-gray-400">Page {data.page} of {data.total_pages}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page >= data.total_pages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40">
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {openId !== null && <EventDetailModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function EventDetailModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useGetWebhookEventQuery(id);
  const [retry, { isLoading: retrying }] = useRetryWebhookEventMutation();

  const handleRetry = async () => {
    try {
      const r = await retry(id).unwrap();
      toast.success(r.message || 'Retried');
    } catch (e: any) {
      toast.error(e?.data?.message || 'Retry failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Webhook event</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          {isLoading || !data ? (
            <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Field k="Provider" v={data.event.provider} />
                <Field k="Event type" v={data.event.event_type} />
                <Field k="Reference" v={<code className="text-xs">{data.event.reference ?? '—'}</code>} />
                <Field k="Linked tx" v={data.event.payment_transaction_id ?? '—'} />
                <Field k="Signature" v={data.event.signature_valid ? '✓ valid' : '✗ invalid'} />
                <Field k="Result" v={<ResultPill r={data.event.result_status} />} />
                <Field k="Received" v={data.event.received_at ?? '—'} />
                <Field k="Processed" v={data.event.processed_at ?? 'No'} />
              </div>
              {data.event.error_message && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                  <div className="text-xs font-bold uppercase text-rose-800 dark:text-rose-300 mb-1">Error</div>
                  <div className="text-xs text-rose-700 dark:text-rose-300">{data.event.error_message}</div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Raw payload</h3>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto text-gray-700 dark:text-gray-300 max-h-64">
{data.event.raw_payload}
                </pre>
              </div>
              <button onClick={handleRetry} disabled={retrying}
                className="w-full px-3 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Re-process this webhook
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-bold">{k}</div>
      <div className="text-sm text-gray-900 dark:text-white mt-0.5 break-all">{v}</div>
    </div>
  );
}

function ResultPill({ r }: { r: string | null }) {
  if (!r) return <span className="text-xs text-gray-400">—</span>;
  const map: Record<string, string> = {
    success:           'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    failed:            'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    duplicate:         'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    ignored:           'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    invalid_signature: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    not_found:         'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    pending:           'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    unknown:           'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[r] ?? 'bg-gray-100 text-gray-700'}`}>{r}</span>;
}
