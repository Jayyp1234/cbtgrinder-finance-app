import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Building2, Loader2, Edit2, Check, X, Star, Tag,
  Grid3x3, Plus, Trash2, Save, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import {
  useGetPlansBundleQuery, useUpdatePlanMutation, useCreatePlanMutation, useDeletePlanMutation,
  useUpdatePlanPriceMutation, useCreatePlanPriceMutation, useDeletePlanPriceMutation,
  type PlanRow, type PlanPriceRow,
} from '../../store/api/plansApi';
import {
  useListEnterprisePlansQuery, useUpdateEnterprisePlanMutation,
  useCreateEnterprisePlanMutation, useArchiveEnterprisePlanMutation,
  type EnterprisePlan,
} from '../../store/api/enterpriseApi';
import {
  useGetMatrixQuery, useSaveMatrixMutation,
  type MatrixCell, type FeatureValueType,
} from '../../store/api/paymentsApi';

type Tab = 'consumer' | 'matrix' | 'enterprise';

export default function PlansPage() {
  const [tab, setTab] = useState<Tab>('consumer');

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <Card className="p-1">
        <div className="flex gap-1">
          <TabBtn active={tab === 'consumer'}  onClick={() => setTab('consumer')}  color="teal"    icon={CreditCard}  label="Consumer plans" />
          <TabBtn active={tab === 'matrix'}    onClick={() => setTab('matrix')}    color="indigo"  icon={Grid3x3}     label="Feature matrix" />
          <TabBtn active={tab === 'enterprise'} onClick={() => setTab('enterprise')} color="purple" icon={Building2}   label="Enterprise plans" />
        </div>
      </Card>

      {tab === 'consumer'   && <ConsumerPlansList />}
      {tab === 'matrix'     && <FeatureMatrix />}
      {tab === 'enterprise' && <EnterprisePlansList />}
    </div>
  );
}

function TabBtn({
  active, onClick, color, icon: Icon, label,
}: { active: boolean; onClick: () => void; color: string; icon: any; label: string }) {
  const colors: Record<string, string> = {
    teal:    'from-teal-500 to-cyan-600',
    indigo:  'from-indigo-500 to-blue-600',
    purple:  'from-purple-500 to-pink-600',
  };
  return (
    <button onClick={onClick}
      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
        active
          ? `bg-gradient-to-r ${colors[color]} text-white shadow-md`
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

// ─── Consumer plans (with multi-term pricing) ───────────────────

function ConsumerPlansList() {
  const { data, isLoading } = useGetPlansBundleQuery();
  const [updatePlan] = useUpdatePlanMutation();
  const [createPlan] = useCreatePlanMutation();
  const [deletePlan] = useDeletePlanMutation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  const plans = data?.plans ?? [];
  const pricesByPlan = data?.prices_by_plan ?? {};

  return (
    <div className="space-y-4">
      {/* Header bar with + New plan */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Consumer plans ({plans.length})</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">User-facing tiers + multi-term pricing. Edit price, term-options, popular flag, and active state.</p>
          </div>
          <motion.button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg text-sm flex items-center gap-1.5 shadow"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" /> New plan
          </motion.button>
        </div>
      </Card>

      {plans.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 mb-3">
            <CreditCard className="w-8 h-8 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No consumer plans yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            Plans are the user-facing tiers like Free, Premium, Pro. Each one has a base price, a period, and a feature-set defined in the matrix.
          </p>
          <motion.button
            onClick={() => setCreating(true)}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg text-sm inline-flex items-center gap-2 shadow"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" /> Create your first plan
          </motion.button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <ConsumerPlanCard
              key={plan.id}
              plan={plan}
              prices={pricesByPlan[plan.id] ?? []}
              editing={editingId === plan.id}
              onEdit={() => setEditingId(plan.id)}
              onCancel={() => setEditingId(null)}
              onSave={async (body) => {
                try {
                  await updatePlan({ id: plan.id, body }).unwrap();
                  toast.success('Plan updated.');
                  setEditingId(null);
                } catch (e: any) {
                  toast.error(e?.data?.message || 'Update failed');
                }
              }}
              onDelete={async () => {
                if (!window.confirm(`Delete plan "${plan.name}"? Users currently on this plan keep their access until period end.`)) return;
                try {
                  await deletePlan(plan.id).unwrap();
                  toast.success('Plan deleted.');
                } catch (e: any) {
                  toast.error(e?.data?.message || 'Delete failed');
                }
              }}
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateConsumerPlanModal
          onClose={() => setCreating(false)}
          onSave={async (body) => {
            try {
              await createPlan(body).unwrap();
              toast.success('Plan created.');
              setCreating(false);
            } catch (e: any) {
              toast.error(e?.data?.message || 'Create failed');
            }
          }}
        />
      )}
    </div>
  );
}

function CreateConsumerPlanModal({
  onClose, onSave,
}: { onClose: () => void; onSave: (body: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [priceNgn, setPriceNgn] = useState(0);
  const [period, setPeriod] = useState('month');
  const [description, setDescription] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !slug.trim()) { toast.error('Name and slug required'); return; }
    setSaving(true);
    await onSave({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      price_ngn: priceNgn,
      period: period.trim(),
      description: description.trim(),
      is_popular: isPopular,
      is_active: isActive,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New consumer plan</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Name (shown to users)">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Premium" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Slug (URL identifier)">
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
              placeholder="premium" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base price (₦)">
              <input type="number" value={priceNgn} onChange={(e) => setPriceNgn(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
            <Field label="Period">
              <select value={period} onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="month">month</option>
                <option value="year">year</option>
                <option value="lifetime">lifetime</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} className="rounded text-amber-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Popular badge</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded text-teal-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
          </div>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-sm">Cancel</button>
          <motion.button onClick={submit} disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow disabled:opacity-50"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create plan
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function ConsumerPlanCard({
  plan, prices, editing, onEdit, onCancel, onSave, onDelete,
}: {
  plan: PlanRow;
  prices: PlanPriceRow[];
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (body: Partial<PlanRow>) => Promise<void>;
  onDelete: () => void;
}) {
  const [price, setPrice] = useState(plan.price_ngn);
  const [active, setActive] = useState(plan.is_active);
  const [name, setName] = useState(plan.name);
  const [tagline, setTagline] = useState(plan.tagline ?? '');
  const [popular, setPopular] = useState(plan.is_popular);

  return (
    <Card hover className="p-5 relative">
      {plan.is_popular && (
        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" /> {plan.most_popular_label || 'Popular'}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{plan.name}</h3>
          <code className="text-xs text-gray-400 font-mono">{plan.slug}</code>
          {plan.tagline && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{plan.tagline}</p>}
        </div>
        {!editing && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit">
              <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Tagline">
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
              placeholder="Get unlimited everything"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Base price (₦, monthly term)">
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded text-teal-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={popular} onChange={(e) => setPopular(e.target.checked)} className="rounded text-amber-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Mark as popular</span>
            </label>
          </div>
          <div className="flex gap-2">
            <motion.button onClick={() => onSave({ name, tagline, price_ngn: price, is_active: active, is_popular: popular })}
              className="px-3 py-1.5 bg-teal-600 text-white font-semibold rounded-lg text-sm flex items-center gap-1.5"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Check className="w-3.5 h-3.5" /> Save
            </motion.button>
            <button onClick={onCancel} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">{plan.price_display}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">/ {plan.period}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{plan.description}</p>

          {/* Multi-term prices */}
          <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2">
              Term pricing
            </h4>
            <MultiTermPrices planId={plan.id} prices={prices} />
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
              plan.is_active
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500 dark:text-gray-400">sort {plan.sort_order}</span>
          </div>
        </>
      )}
    </Card>
  );
}

function MultiTermPrices({ planId, prices }: { planId: number; prices: PlanPriceRow[] }) {
  const [createPrice] = useCreatePlanPriceMutation();
  const [updatePrice] = useUpdatePlanPriceMutation();
  const [deletePrice] = useDeletePlanPriceMutation();
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const sorted = [...prices].sort((a, b) => a.term_months - b.term_months);

  return (
    <div className="space-y-1.5">
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No term-specific prices set. Backend uses plan.price_ngn for the monthly default.</p>
      ) : (
        sorted.map((p) => (
          <PriceRow
            key={p.id ?? p.term_months}
            price={p}
            isEditing={editing === p.id}
            onEdit={() => setEditing(p.id)}
            onCancel={() => setEditing(null)}
            onSave={async (body) => {
              if (!p.id) return;
              try {
                await updatePrice({ priceId: p.id, body }).unwrap();
                toast.success('Price updated.');
                setEditing(null);
              } catch (e: any) {
                toast.error(e?.data?.message || 'Update failed');
              }
            }}
            onDelete={async () => {
              if (!p.id) return;
              if (!window.confirm(`Delete the ${p.term_months}-month price?`)) return;
              try {
                await deletePrice(p.id).unwrap();
                toast.success('Deleted.');
              } catch (e: any) {
                toast.error(e?.data?.message || 'Delete failed');
              }
            }}
          />
        ))
      )}

      {editing === 'new' ? (
        <NewPriceRow
          onCancel={() => setEditing(null)}
          onSave={async (body) => {
            try {
              await createPrice({ planId, body }).unwrap();
              toast.success('Price added.');
              setEditing(null);
            } catch (e: any) {
              toast.error(e?.data?.message || 'Create failed');
            }
          }}
        />
      ) : (
        <button onClick={() => setEditing('new')}
          className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700">
          <Plus className="w-3 h-3" /> Add a term
        </button>
      )}
    </div>
  );
}

function PriceRow({
  price, isEditing, onEdit, onCancel, onSave, onDelete,
}: {
  price: PlanPriceRow;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (body: Partial<PlanPriceRow>) => Promise<void>;
  onDelete: () => void;
}) {
  const [ngn, setNgn] = useState(price.price_ngn);
  const [active, setActive] = useState(price.is_active);
  const [promo, setPromo] = useState(price.is_promotional);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs">
        <span className="font-bold text-gray-700 dark:text-gray-300 w-12">{price.term_months}mo</span>
        <input type="number" value={ngn} onChange={(e) => setNgn(Number(e.target.value))}
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded scale-75" />
          <span className="text-[10px]">Active</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} className="rounded scale-75" />
          <span className="text-[10px]">Promo</span>
        </label>
        <button onClick={() => onSave({ price_ngn: ngn, is_active: active, is_promotional: promo })}
          className="p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg text-xs group">
      <span className="font-bold text-gray-700 dark:text-gray-300 w-12">{price.term_months}mo</span>
      <span className="flex-1 tabular-nums text-gray-900 dark:text-white">{price.price_display}</span>
      <div className="flex items-center gap-1">
        {price.is_promotional && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">promo</span>
        )}
        {!price.is_active && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500">off</span>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <button onClick={onEdit} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500">
          <Edit2 className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function NewPriceRow({
  onCancel, onSave,
}: { onCancel: () => void; onSave: (body: Partial<PlanPriceRow>) => Promise<void> }) {
  const [term, setTerm] = useState(3);
  const [ngn, setNgn] = useState(2000);

  return (
    <div className="flex items-center gap-2 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-xs">
      <select value={term} onChange={(e) => setTerm(Number(e.target.value))}
        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <option value={1}>1mo</option>
        <option value={3}>3mo</option>
        <option value={6}>6mo</option>
        <option value={12}>12mo</option>
      </select>
      <input type="number" value={ngn} onChange={(e) => setNgn(Number(e.target.value))}
        placeholder="₦"
        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
      <button onClick={() => onSave({ term_months: term, price_ngn: ngn, is_active: true })}
        className="p-1 rounded bg-teal-600 text-white">
        <Check className="w-3 h-3" />
      </button>
      <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Feature Matrix ──────────────────────────────────────────

function FeatureMatrix() {
  const { data, isLoading } = useGetMatrixQuery();
  const [saveMatrix, { isLoading: saving }] = useSaveMatrixMutation();

  const [draftCells, setDraftCells] = useState<Record<string, { value: string; enabled: boolean }>>({});

  // Sync draft when fresh data arrives — but only for cells the user hasn't touched.
  useEffect(() => {
    if (!data) return;
    setDraftCells((draft) => {
      const fresh: typeof draft = { ...draft };
      for (const cell of data.cells) {
        const k = `${cell.plan_id}:${cell.feature_key}`;
        if (!(k in draft)) fresh[k] = { value: cell.value, enabled: cell.enabled };
      }
      return fresh;
    });
  }, [data]);

  const cellMap = useMemo(() => {
    const m: Record<string, MatrixCell> = {};
    for (const c of data?.cells ?? []) {
      m[`${c.plan_id}:${c.feature_key}`] = c;
    }
    return m;
  }, [data]);

  if (isLoading || !data) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;
  }

  const visibleFeatures = data.features.filter((f) => f.active);
  const visiblePlans = data.plans.filter((p) => p.is_active);

  const isDirty = (planId: number, fk: string, type: FeatureValueType) => {
    const k = `${planId}:${fk}`;
    const original = cellMap[k];
    const draft = draftCells[k];
    if (!draft) return false;
    const orig = original ?? { value: '', enabled: false };
    if (type === 'boolean') return draft.enabled !== orig.enabled;
    return draft.value !== orig.value || draft.enabled !== orig.enabled;
  };

  const getDraft = (planId: number, fk: string) => {
    const k = `${planId}:${fk}`;
    return draftCells[k] ?? cellMap[k] ?? { value: '', enabled: false };
  };

  const setDraft = (planId: number, fk: string, patch: Partial<{ value: string; enabled: boolean }>) => {
    const k = `${planId}:${fk}`;
    setDraftCells((prev) => ({
      ...prev,
      [k]: { ...(prev[k] ?? cellMap[k] ?? { value: '', enabled: false }), ...patch },
    }));
  };

  const dirtyCells = Object.entries(draftCells).filter(([k, d]) => {
    const orig = cellMap[k];
    if (!orig) return true;
    return d.value !== orig.value || d.enabled !== orig.enabled;
  });

  const handleSave = async () => {
    const payload = dirtyCells.map(([k, d]) => {
      const [pid, fk] = k.split(':');
      return { plan_id: Number(pid), feature_key: fk, value: d.value, enabled: d.enabled };
    });
    if (payload.length === 0) {
      toast('No changes to save.');
      return;
    }
    try {
      const r = await saveMatrix({ cells: payload }).unwrap();
      toast.success(`Saved ${r.updated} cell${r.updated === 1 ? '' : 's'}.`);
      setDraftCells({});
    } catch (e: any) {
      toast.error(e?.data?.message || 'Save failed');
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-indigo-600" /> Plan × Feature matrix
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Toggle features or set numeric caps per plan. Empty cells fall back to the feature default.
          </p>
        </div>
        <div className="flex gap-2">
          {dirtyCells.length > 0 && (
            <button onClick={() => setDraftCells({})}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3" /> Discard
            </button>
          )}
          <motion.button onClick={handleSave} disabled={saving || dirtyCells.length === 0}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 shadow"
            whileHover={dirtyCells.length > 0 ? { scale: 1.02 } : undefined}
            whileTap={dirtyCells.length > 0 ? { scale: 0.98 } : undefined}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save {dirtyCells.length > 0 ? `${dirtyCells.length} change${dirtyCells.length === 1 ? '' : 's'}` : 'changes'}
          </motion.button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                Feature
              </th>
              {visiblePlans.map((p) => (
                <th key={p.id} className="px-3 py-3 text-center text-xs uppercase tracking-wider font-bold text-gray-600 dark:text-gray-300 border-b border-l border-gray-200 dark:border-gray-600 min-w-[110px]">
                  <div>{p.name}</div>
                  <div className="text-[9px] font-normal text-gray-400 mt-0.5">₦{p.price_ngn.toLocaleString()}/{p.period}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleFeatures.map((f) => (
              <tr key={f.id}>
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="font-medium text-gray-900 dark:text-white text-xs">{f.name}</div>
                  <code className="text-[10px] text-gray-400 font-mono">{f.feature_key}</code>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {f.value_type} · default <code>{f.default_value || '—'}</code>
                  </div>
                </td>
                {visiblePlans.map((p) => {
                  const d = getDraft(p.id, f.feature_key);
                  const dirty = isDirty(p.id, f.feature_key, f.value_type);
                  return (
                    <td key={`${p.id}:${f.feature_key}`}
                      className={`px-3 py-2 text-center border-b border-l border-gray-100 dark:border-gray-700 ${dirty ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                      {f.value_type === 'boolean' ? (
                        <input type="checkbox" checked={d.enabled}
                          onChange={(e) => setDraft(p.id, f.feature_key, { enabled: e.target.checked, value: String(e.target.checked) })}
                          className="rounded text-indigo-600" />
                      ) : (
                        <input type="number" value={d.value}
                          onChange={(e) => setDraft(p.id, f.feature_key, { value: e.target.value, enabled: true })}
                          placeholder={f.default_value}
                          className="w-20 px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleFeatures.length === 0 && (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No active features. <a href="/features" className="text-indigo-600 dark:text-indigo-400 font-semibold">Define features first</a>.
        </div>
      )}
    </Card>
  );
}

// ─── Enterprise plans ──────────────────────────────────────────

function EnterprisePlansList() {
  const { data, isLoading } = useListEnterprisePlansQuery();
  const [updatePlan] = useUpdateEnterprisePlanMutation();
  const [createPlan] = useCreateEnterprisePlanMutation();
  const [archivePlan] = useArchiveEnterprisePlanMutation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>;
  }

  const plans = data?.plans ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Enterprise plans ({plans.length})</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Per-student-per-month pricing for school customers.</p>
          </div>
          <motion.button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg text-sm flex items-center gap-1.5 shadow"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Plus className="w-4 h-4" /> New enterprise plan
          </motion.button>
        </div>
      </Card>

      {plans.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 mb-3">
            <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No enterprise plans yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
            Enterprise plans set the per-student-per-month price for schools. Schools subscribe via the school OS.
          </p>
          <motion.button
            onClick={() => setCreating(true)}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg text-sm inline-flex items-center gap-2 shadow"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Plus className="w-4 h-4" /> Create your first plan
          </motion.button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <EnterprisePlanCard
              key={plan.id}
              plan={plan}
              editing={editingId === plan.id}
              onEdit={() => setEditingId(plan.id)}
              onCancel={() => setEditingId(null)}
              onSave={async (body) => {
                try {
                  await updatePlan({ id: plan.id, ...body }).unwrap();
                  toast.success('Enterprise plan updated.');
                  setEditingId(null);
                } catch (e: any) {
                  toast.error(e?.data?.message || 'Update failed');
                }
              }}
              onArchive={async () => {
                if (!window.confirm(`Archive "${plan.display_name}"? Existing subscriptions keep working — only new sign-ups are blocked.`)) return;
                try {
                  await archivePlan(plan.id).unwrap();
                  toast.success('Plan archived.');
                } catch (e: any) {
                  toast.error(e?.data?.message || 'Archive failed');
                }
              }}
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateEnterprisePlanModal
          onClose={() => setCreating(false)}
          onSave={async (body) => {
            try {
              await createPlan(body).unwrap();
              toast.success('Enterprise plan created.');
              setCreating(false);
            } catch (e: any) {
              toast.error(e?.data?.message || 'Create failed');
            }
          }}
        />
      )}
    </div>
  );
}

function CreateEnterprisePlanModal({
  onClose, onSave,
}: { onClose: () => void; onSave: (body: any) => Promise<void> }) {
  const [planKey, setPlanKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [priceNgnPerSeat, setPriceNgnPerSeat] = useState(0);
  const [minSeats, setMinSeats] = useState(1);
  const [maxSeats, setMaxSeats] = useState<number | ''>('');
  const [features, setFeatures] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!planKey.trim() || !displayName.trim()) {
      toast.error('Plan key and display name are required');
      return;
    }
    setSaving(true);
    await onSave({
      plan_key: planKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      display_name: displayName.trim(),
      description: description.trim(),
      monthly_price_per_seat_kobo: priceNgnPerSeat * 100,
      min_seats: minSeats,
      max_seats: maxSeats === '' ? null : Number(maxSeats),
      features: features.split('\n').map((f) => f.trim()).filter(Boolean),
      sort_order: sortOrder,
      is_active: true,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">New enterprise plan</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Plan key (stable identifier, lowercase + underscores)">
            <input type="text" value={planKey} onChange={(e) => setPlanKey(e.target.value)}
              placeholder="elite" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Display name">
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Elite" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Price per seat per month (₦)">
            <input type="number" value={priceNgnPerSeat} onChange={(e) => setPriceNgnPerSeat(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min seats">
              <input type="number" value={minSeats} onChange={(e) => setMinSeats(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
            <Field label="Max seats (blank = unlimited)">
              <input type="number" value={maxSeats} onChange={(e) => setMaxSeats(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="∞"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
          </div>
          <Field label="Features (one per line)">
            <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4}
              placeholder="Exam engine (WAEC, NECO, JAMB)&#10;Teacher dashboard + grading&#10;Up to 1000 students"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Sort order">
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-sm">Cancel</button>
          <motion.button onClick={submit} disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow disabled:opacity-50"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create plan
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function EnterprisePlanCard({
  plan, editing, onEdit, onCancel, onSave, onArchive,
}: {
  plan: EnterprisePlan;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (body: any) => Promise<void>;
  onArchive: () => void;
}) {
  const [ngn, setNgn] = useState(plan.monthly_price_per_seat_ngn);
  const [active, setActive] = useState(plan.is_active);

  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.display_name}</h3>
          <code className="text-xs text-gray-400 font-mono">{plan.plan_key}</code>
        </div>
        {!editing && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit">
              <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            {plan.is_active && (
              <button onClick={onArchive} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Archive">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <Field label="Per-seat price (₦/month)">
            <input type="number" value={ngn} onChange={(e) => setNgn(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded text-purple-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
          <div className="flex gap-2">
            <motion.button onClick={() => onSave({ monthly_price_per_seat_kobo: ngn * 100, is_active: active })}
              className="px-3 py-1.5 bg-purple-600 text-white font-semibold rounded-lg text-sm flex items-center gap-1.5"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Check className="w-3.5 h-3.5" /> Save
            </motion.button>
            <button onClick={onCancel} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">{plan.monthly_price_display}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">/ student / month</span>
          </div>
          {plan.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{plan.description}</p>}
          {plan.features.length > 0 && (
            <ul className="mt-3 space-y-1">
              {plan.features.slice(0, 3).map((f, i) => (
                <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                  <Tag className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
              {plan.features.length > 3 && (
                <li className="text-xs text-gray-400 dark:text-gray-500">+{plan.features.length - 3} more</li>
              )}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
              plan.is_active
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>{plan.is_active ? 'Active' : 'Archived'}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500 dark:text-gray-400">{plan.min_seats}–{plan.max_seats ?? '∞'} seats</span>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── shared ──────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}
