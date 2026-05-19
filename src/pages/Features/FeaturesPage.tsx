import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ListChecks, Plus, Edit2, Trash2, Loader2, X, Check, Tag, ToggleLeft, Hash, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import {
  useListFeaturesQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useDeleteFeatureMutation,
  type FeatureDefinition,
  type FeatureValueType,
  type ResetPeriod,
} from '../../store/api/paymentsApi';

/**
 * Feature Catalog — the master list of features that can be gated per plan.
 *
 * Each feature has:
 *   - feature_key (stable identifier used in code, never renamed)
 *   - value_type (boolean | numeric_cap | numeric_allowance)
 *   - default_value (the "free tier" value, applied when no plan override)
 *   - reset_period (none | monthly | weekly | daily — for allowances)
 *   - category (grouping in UI)
 *
 * Plans assign per-feature overrides via the Plan × Feature Matrix
 * (separate page). This page just maintains the catalog.
 */
export default function FeaturesPage() {
  const { data, isLoading, refetch } = useListFeaturesQuery();
  const [create] = useCreateFeatureMutation();
  const [update] = useUpdateFeatureMutation();
  const [del] = useDeleteFeatureMutation();
  const [editing, setEditing] = useState<FeatureDefinition | null>(null);
  const [creating, setCreating] = useState(false);

  const features = data?.features ?? [];
  const grouped = useMemo(() => {
    const out: Record<string, FeatureDefinition[]> = {};
    for (const f of features) {
      const c = f.category || 'Other';
      if (!out[c]) out[c] = [];
      out[c].push(f);
    }
    return out;
  }, [features]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 text-white p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur">
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Feature Catalog</h1>
                <p className="text-sm text-white/90 mt-1 max-w-2xl">
                  The master list of features that can be gated per plan. Each entry has a value type (boolean, cap, allowance) and an optional reset period. Use the Plan × Feature Matrix to set per-plan overrides.
                </p>
              </div>
            </div>
            <motion.button
              onClick={() => setCreating(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold rounded-lg shadow flex items-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" /> New feature
            </motion.button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : features.length === 0 ? (
        <Card className="p-10 text-center">
          <ListChecks className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No features defined yet.</p>
          <button onClick={() => setCreating(true)} className="mt-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            + Define the first feature
          </button>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([category, list]) => (
            <Card key={category} className="overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/30">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  {category}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{list.length} feature{list.length === 1 ? '' : 's'}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {list.map((f) => (
                  <FeatureRow key={f.id} f={f}
                    onEdit={() => setEditing(f)}
                    onToggleActive={async () => {
                      try { await update({ id: f.id, active: !f.active }).unwrap(); } catch { /* ignore */ }
                    }}
                    onDelete={async () => {
                      if (!window.confirm(`Delete "${f.feature_key}"? Plans using this feature will lose their override.`)) return;
                      try { await del(f.id).unwrap(); toast.success('Deleted.'); refetch(); }
                      catch (e: any) { toast.error(e?.data?.message || 'Delete failed'); }
                    }}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <FeatureEditor
          feature={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (body) => {
            try {
              if (editing) {
                await update({ id: editing.id, ...body }).unwrap();
                toast.success('Feature updated.');
              } else {
                await create(body).unwrap();
                toast.success('Feature created.');
              }
              setCreating(false); setEditing(null);
            } catch (e: any) {
              toast.error(e?.data?.message || 'Save failed');
            }
          }}
        />
      )}
    </div>
  );
}

function FeatureRow({
  f, onEdit, onToggleActive, onDelete,
}: {
  f: FeatureDefinition;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const TypeIcon = f.value_type === 'boolean' ? ToggleLeft : f.value_type === 'numeric_cap' ? Hash : Gauge;
  return (
    <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex-shrink-0">
        <TypeIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{f.name}</span>
          <code className="text-xs text-gray-400 font-mono">{f.feature_key}</code>
          {f.reset_period && f.reset_period !== 'none' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              resets {f.reset_period}
            </span>
          )}
        </div>
        {f.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{f.description}</p>}
        <div className="text-[10px] text-gray-400 mt-0.5">
          type <code>{f.value_type}</code> · default <code>{f.default_value || '—'}</code>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs mr-2">
          <input type="checkbox" checked={f.active} onChange={onToggleActive} className="rounded text-indigo-600" />
          <span className={f.active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-500'}>
            {f.active ? 'Active' : 'Off'}
          </span>
        </label>
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function FeatureEditor({
  feature, onClose, onSave,
}: {
  feature: FeatureDefinition | null;
  onClose: () => void;
  onSave: (body: Partial<FeatureDefinition>) => Promise<void>;
}) {
  const [key, setKey] = useState(feature?.feature_key ?? '');
  const [name, setName] = useState(feature?.name ?? '');
  const [desc, setDesc] = useState(feature?.description ?? '');
  const [valueType, setValueType] = useState<FeatureValueType>(feature?.value_type ?? 'boolean');
  const [defaultValue, setDefaultValue] = useState(feature?.default_value ?? 'false');
  const [resetPeriod, setResetPeriod] = useState<ResetPeriod>(feature?.reset_period ?? 'none');
  const [category, setCategory] = useState(feature?.category ?? '');
  const [sortOrder, setSortOrder] = useState(feature?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!key.trim() || !name.trim()) {
      toast.error('feature_key and name are required');
      return;
    }
    setSaving(true);
    await onSave({
      feature_key: key.trim(),
      name: name.trim(),
      description: desc.trim(),
      value_type: valueType,
      default_value: defaultValue.trim(),
      reset_period: resetPeriod,
      category: category.trim() || 'Other',
      sort_order: sortOrder,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{feature ? 'Edit feature' : 'New feature'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="feature_key (stable identifier used in code)">
            <input type="text" value={key} onChange={(e) => setKey(e.target.value)}
              placeholder="practice_mode_unlimited"
              disabled={!!feature}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${feature ? 'opacity-60 cursor-not-allowed' : ''}`} />
            {feature && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keys are immutable to keep code-level references stable.</p>}
          </Field>
          <Field label="Display name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Unlimited practice questions"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Description (shown on pricing page)">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value type">
              <select value={valueType} onChange={(e) => setValueType(e.target.value as FeatureValueType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="boolean">Boolean (on/off)</option>
                <option value="numeric_cap">Numeric cap (hard limit)</option>
                <option value="numeric_allowance">Numeric allowance (resets)</option>
              </select>
            </Field>
            <Field label="Default value (free tier)">
              <input type="text" value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)}
                placeholder={valueType === 'boolean' ? 'false' : '0'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reset period">
              <select value={resetPeriod} onChange={(e) => setResetPeriod(e.target.value as ResetPeriod)}
                disabled={valueType !== 'numeric_allowance'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50">
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {valueType !== 'numeric_allowance' && <p className="text-[10px] text-gray-400 mt-1">Only applies to allowance types</p>}
            </Field>
            <Field label="Category">
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="Practice / Exam / AI"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
          </div>
          <Field label="Sort order">
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-sm">Cancel</button>
          <motion.button onClick={submit} disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow disabled:opacity-50"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {feature ? 'Save changes' : 'Create feature'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}
