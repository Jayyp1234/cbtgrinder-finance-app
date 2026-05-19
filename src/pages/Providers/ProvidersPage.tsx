import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plug, Loader2, Edit2, Check, X, Eye, EyeOff, CheckCircle2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import {
  useGetActiveProviderQuery,
  useSetActiveProviderMutation,
  useGetProviderQuery,
  useUpdateProviderMutation,
  type PaymentProvider,
  type PaymentProviderUpdateBody,
} from '../../store/api/paymentsApi';

export default function ProvidersPage() {
  const { data: active, isLoading } = useGetActiveProviderQuery();
  const [setActive, { isLoading: settingActive }] = useSetActiveProviderMutation();

  if (isLoading || !active) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan-600" /></div>;
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <Card className="p-5 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-800">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-600" />
              Active provider: <code className="text-cyan-700 dark:text-cyan-400">{active.active_provider}</code>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
              Every new charge — from any user — routes to whichever provider is selected here. Existing transactions remain tied to the provider they were originated on.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {active.registered.map((key) => (
            <motion.button
              key={key}
              onClick={async () => {
                if (key === active.active_provider) return;
                if (!window.confirm(`Switch active provider to ${key}? New charges will route through it immediately.`)) return;
                try {
                  await setActive({ provider_key: key }).unwrap();
                  toast.success(`Switched to ${key}.`);
                } catch (e: any) {
                  toast.error(e?.data?.message || 'Switch failed');
                }
              }}
              disabled={settingActive}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                key === active.active_provider
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md cursor-default'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-cyan-400'
              }`}
              whileHover={key !== active.active_provider ? { scale: 1.02 } : undefined}
              whileTap={key !== active.active_provider ? { scale: 0.98 } : undefined}
            >
              {key === active.active_provider && <CheckCircle2 className="w-4 h-4" />}
              <span className="capitalize">{key}</span>
            </motion.button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {active.registered.map((key) => (
          <ProviderCard key={key} providerKey={key} />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({ providerKey }: { providerKey: string }) {
  const { data, isLoading } = useGetProviderQuery(providerKey);
  const [update, { isLoading: saving }] = useUpdateProviderMutation();
  const [editing, setEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  const [body, setBody] = useState<PaymentProviderUpdateBody>({});

  if (isLoading || !data) {
    return <Card className="p-5 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan-600" /></Card>;
  }

  const p: PaymentProvider = data.provider;

  const submit = async () => {
    try {
      await update({ key: providerKey, ...body }).unwrap();
      toast.success(`${p.display_name} updated.`);
      setEditing(false);
      setBody({});
    } catch (e: any) {
      toast.error(e?.data?.message || 'Update failed');
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plug className="w-4 h-4 text-cyan-600" />
            {p.display_name}
          </h3>
          <code className="text-xs text-gray-400 font-mono">{p.provider_key}</code>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
              p.mode === 'live'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            }`}>{p.mode}</span>
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
              p.active
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>{p.active ? 'active' : 'inactive'}</span>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 text-sm">
          <Field label="Mode">
            <select
              value={(body.mode ?? p.mode) as string}
              onChange={(e) => setBody({ ...body, mode: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </Field>
          <Field label="Public key">
            <input type="text" defaultValue={p.public_key}
              onChange={(e) => setBody({ ...body, public_key: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label={p.secret_key_set ? `Secret key (current: ${p.secret_key_preview})` : 'Secret key (not set)'}>
            <input type={showSecret ? 'text' : 'password'} placeholder="paste new secret_key to update"
              onChange={(e) => setBody({ ...body, secret_key: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            <button onClick={() => setShowSecret(!showSecret)} className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showSecret ? 'Hide' : 'Show'}
            </button>
          </Field>
          <Field label={p.webhook_secret_set ? `Webhook secret (current: ${p.webhook_secret_preview})` : 'Webhook secret (not set)'}>
            <input type={showWebhook ? 'text' : 'password'} placeholder="paste webhook_secret"
              onChange={(e) => setBody({ ...body, webhook_secret: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            <button onClick={() => setShowWebhook(!showWebhook)} className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {showWebhook ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showWebhook ? 'Hide' : 'Show'}
            </button>
          </Field>
          <Field label="Callback URL">
            <input type="url" defaultValue={p.callback_url}
              onChange={(e) => setBody({ ...body, callback_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>

          <div className="flex gap-2 pt-2">
            <motion.button onClick={submit} disabled={saving}
              className="px-3 py-1.5 bg-cyan-600 text-white font-semibold rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </motion.button>
            <button onClick={() => { setEditing(false); setBody({}); }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <Row k="Public key" v={<code className="text-xs">{p.public_key || '—'}</code>} />
          <Row k="Secret key" v={p.secret_key_set ? <code className="text-xs">{p.secret_key_preview}</code> : <span className="text-amber-600">not set</span>} />
          <Row k="Webhook secret" v={p.webhook_secret_set ? <code className="text-xs">{p.webhook_secret_preview}</code> : <span className="text-amber-600">not set</span>} />
          <Row k="Callback" v={<code className="text-xs break-all">{p.callback_url || '—'}</code>} />
          {p.last_tested_at && (
            <Row k="Last test" v={
              <span className={p.last_test_status === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
                {p.last_test_status} · {p.last_tested_at}
              </span>
            } />
          )}
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-300 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide w-32 flex-shrink-0 font-bold">{k}</span>
      <span className="text-sm text-gray-900 dark:text-white min-w-0 break-all">{v}</span>
    </div>
  );
}
