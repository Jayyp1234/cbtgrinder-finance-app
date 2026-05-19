import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Edit2, Trash2, Loader2, X, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import {
  useListXpPacksQuery,
  useCreateXpPackMutation,
  useUpdateXpPackMutation,
  useDeleteXpPackMutation,
  type XpPack,
} from '../../store/api/paymentsApi';

/**
 * XP Packs — bundled XP top-ups that users buy with cash.
 *
 * Each pack has:
 *   - name + slug (the storefront label)
 *   - xp_amount (how much XP they get)
 *   - price_kobo (what they pay, kobo)
 *   - bonus_pct (advertised "+20% bonus!" markup, surfaced in UI only)
 *
 * Full CRUD. Live edit toggle for the `active` column.
 */
export default function XpPacksPage() {
  const { data, isLoading, refetch } = useListXpPacksQuery();
  const [createPack] = useCreateXpPackMutation();
  const [updatePack] = useUpdateXpPackMutation();
  const [deletePack] = useDeleteXpPackMutation();
  const [editing, setEditing] = useState<XpPack | null>(null);
  const [creating, setCreating] = useState(false);

  const packs = data?.packs ?? [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 text-white p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">XP Packs</h1>
                <p className="text-sm text-white/90 mt-1 max-w-2xl">
                  Bundled XP top-ups that users buy with cash. Price + bonus % is shown in the user app — keep them attractive without undercutting margin.
                </p>
              </div>
            </div>
            <motion.button
              onClick={() => setCreating(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold rounded-lg shadow flex items-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" /> New pack
            </motion.button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
      ) : packs.length === 0 ? (
        <Card className="p-10 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No XP packs yet.</p>
          <button onClick={() => setCreating(true)} className="mt-3 text-sm font-semibold text-purple-600 dark:text-purple-400">
            + Create the first one
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map((p) => (
            <PackCard
              key={p.id}
              pack={p}
              onEdit={() => setEditing(p)}
              onToggleActive={async () => {
                try {
                  await updatePack({ id: p.id, active: !p.active }).unwrap();
                  toast.success(p.active ? 'Pack archived.' : 'Pack activated.');
                } catch (e: any) {
                  toast.error(e?.data?.message || 'Update failed');
                }
              }}
              onDelete={async () => {
                if (!window.confirm(`Delete "${p.name}"? This is permanent.`)) return;
                try {
                  await deletePack(p.id).unwrap();
                  toast.success('Pack deleted.');
                  refetch();
                } catch (e: any) {
                  toast.error(e?.data?.message || 'Delete failed');
                }
              }}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PackEditor
          pack={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (body) => {
            try {
              if (editing) {
                await updatePack({ id: editing.id, ...body }).unwrap();
                toast.success('Pack updated.');
              } else {
                await createPack(body).unwrap();
                toast.success('Pack created.');
              }
              setCreating(false);
              setEditing(null);
            } catch (e: any) {
              toast.error(e?.data?.message || 'Save failed');
            }
          }}
        />
      )}
    </div>
  );
}

function PackCard({
  pack, onEdit, onToggleActive, onDelete,
}: {
  pack: XpPack;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <Card hover className="overflow-hidden relative">
      {pack.bonus_pct > 0 && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full shadow">
          +{pack.bonus_pct}% bonus
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
            <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{pack.name}</h3>
            <code className="text-xs text-gray-400 font-mono">{pack.slug}</code>
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">{pack.price_display}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/ pack</span>
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
            ⚡ {pack.xp_amount.toLocaleString()} XP
          </div>
        </div>

        {pack.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{pack.description}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={pack.active}
              onChange={onToggleActive}
              className="rounded text-purple-600"
            />
            <span className={pack.active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-gray-500'}>
              {pack.active ? 'Active' : 'Inactive'}
            </span>
          </label>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PackEditor({
  pack, onClose, onSave,
}: {
  pack: XpPack | null;
  onClose: () => void;
  onSave: (body: Partial<XpPack>) => Promise<void>;
}) {
  const [name, setName] = useState(pack?.name ?? '');
  const [slug, setSlug] = useState(pack?.slug ?? '');
  const [xp, setXp] = useState(pack?.xp_amount ?? 1000);
  const [priceNgn, setPriceNgn] = useState(pack ? pack.price_ngn : 500);
  const [bonus, setBonus] = useState(pack?.bonus_pct ?? 0);
  const [desc, setDesc] = useState(pack?.description ?? '');
  const [sortOrder, setSortOrder] = useState(pack?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug required');
      return;
    }
    setSaving(true);
    await onSave({
      name: name.trim(),
      slug: slug.trim(),
      xp_amount: xp,
      price_kobo: priceNgn * 100,
      bonus_pct: bonus,
      description: desc.trim(),
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
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{pack ? 'Edit pack' : 'New XP pack'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Name (shown to users)">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Starter Pack"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <Field label="Slug (URL identifier, lowercase + dashes)">
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
              placeholder="starter-pack"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="XP amount">
              <input type="number" value={xp} onChange={(e) => setXp(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
            <Field label="Price (₦)">
              <input type="number" value={priceNgn} onChange={(e) => setPriceNgn(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bonus % (display only)">
              <input type="number" value={bonus} onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
            <Field label="Sort order">
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </Field>
          </div>
          <Field label="Description (optional)">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </Field>
        </div>
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-sm">Cancel</button>
          <motion.button onClick={submit} disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg text-sm flex items-center gap-2 shadow disabled:opacity-50"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {pack ? 'Save changes' : 'Create pack'}
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
