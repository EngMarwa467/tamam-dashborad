import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, Plus, Trash2, Edit3, Check, X, MapPin, Users, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tier {
  id: string; name_ar: string; min_rating: number; max_rating: number;
  worker_cut_pct: number; badge_color: string; is_active: boolean;
}
interface Zone { id: string; name_ar: string; city: string; }
interface Override { id: string; tier_id: string; zone_id: string; worker_cut_pct: number; }
interface Worker {
  id: string; full_name: string; phone: string; rating: number;
  rating_count: number; user_id: string;
}

type Tab = 'tiers' | 'overrides' | 'workers';

const inputCls = 'border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white text-slate-800 w-full';
const fmt = (n: number) => (n ?? 0).toLocaleString('en-US');

const BADGE_COLORS = [
  { value: 'gold',   label: '🥇 ذهبي',  bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-300' },
  { value: 'silver', label: '🥈 فضي',   bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
  { value: 'bronze', label: '🥉 برونزي', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  { value: 'blue',   label: '💎 أزرق',   bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
  { value: 'green',  label: '🌿 أخضر',   bg: 'bg-emerald-100',text: 'text-emerald-800',border: 'border-emerald-300' },
  { value: 'gray',   label: '⚪ رمادي',  bg: 'bg-slate-100',  text: 'text-slate-500',  border: 'border-slate-200' },
];

const getBadge = (color: string) =>
  BADGE_COLORS.find(b => b.value === color) ?? BADGE_COLORS[5];

const getTier = (rating: number, tiers: Tier[]): Tier | null => {
  if (!rating || tiers.length === 0) return null;
  return tiers
    .filter(t => t.is_active && rating >= t.min_rating && rating <= t.max_rating)
    .sort((a, b) => b.min_rating - a.min_rating)[0] ?? null;
};

const SQL_MIGRATION = `-- فئات الفنيين
CREATE TABLE IF NOT EXISTS worker_tiers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar        text NOT NULL,
  min_rating     numeric NOT NULL DEFAULT 0,
  max_rating     numeric NOT NULL DEFAULT 5,
  worker_cut_pct numeric NOT NULL DEFAULT 72,
  badge_color    text DEFAULT 'gold',
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

-- تخصيص الفئة بالمنطقة
CREATE TABLE IF NOT EXISTS worker_tier_zone_overrides (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id        uuid REFERENCES worker_tiers(id) ON DELETE CASCADE,
  zone_id        uuid REFERENCES pricing_zones(id) ON DELETE CASCADE,
  worker_cut_pct numeric NOT NULL,
  UNIQUE(tier_id, zone_id)
);

ALTER TABLE worker_tiers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_tier_zone_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON worker_tiers               FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON worker_tier_zone_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read" ON worker_tiers              FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read" ON worker_tier_zone_overrides FOR SELECT TO anon USING (true);`;

export default function WorkerTierPricing() {
  const [tab, setTab] = useState<Tab>('tiers');
  const [tiers,     setTiers]     = useState<Tier[]>([]);
  const [zones,     setZones]     = useState<Zone[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [workers,   setWorkers]   = useState<Worker[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [dbReady,   setDbReady]   = useState(true);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [editBuf,   setEditBuf]   = useState<any>({});
  const [showSQL,   setShowSQL]   = useState(false);

  // New tier form
  const [showTForm, setShowTForm] = useState(false);
  const [newT, setNewT] = useState({ name_ar: '', min_rating: '', max_rating: '', worker_cut_pct: '', badge_color: 'gold' });

  // New override form
  const [showOForm, setShowOForm] = useState(false);
  const [newO, setNewO] = useState({ tier_id: '', zone_id: '', worker_cut_pct: '' });

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: t, error: te },
      { data: z },
      { data: o },
      { data: w },
    ] = await Promise.all([
      supabase.from('worker_tiers').select('*').order('min_rating', { ascending: false }),
      supabase.from('pricing_zones').select('id, name_ar, city').order('name_ar'),
      supabase.from('worker_tier_zone_overrides').select('*'),
      supabase.from('profiles').select('id, user_id, full_name, phone, rating, rating_count').eq('role', 'worker').order('rating', { ascending: false }),
    ]);
    if (te) setDbReady(false);
    setTiers(t || []);
    setZones(z || []);
    setOverrides(o || []);
    setWorkers((w || []).filter((w: any) => w.full_name));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ─── Tier CRUD ───────────────────────────────────────────────────────────────
  const addTier = async () => {
    const { name_ar, min_rating, max_rating, worker_cut_pct, badge_color } = newT;
    if (!name_ar || !min_rating || !max_rating || !worker_cut_pct) return;
    const { error } = await supabase.from('worker_tiers').insert({
      name_ar, min_rating: +min_rating, max_rating: +max_rating,
      worker_cut_pct: +worker_cut_pct, badge_color,
    });
    if (error) { alert('❌ ' + error.message); return; }
    setNewT({ name_ar: '', min_rating: '', max_rating: '', worker_cut_pct: '', badge_color: 'gold' });
    setShowTForm(false); fetchAll();
  };

  const saveTier = async (id: string) => {
    await supabase.from('worker_tiers').update({
      name_ar: editBuf.name_ar,
      min_rating: +editBuf.min_rating, max_rating: +editBuf.max_rating,
      worker_cut_pct: +editBuf.worker_cut_pct, badge_color: editBuf.badge_color,
    }).eq('id', id);
    setEditId(null); fetchAll();
  };

  const toggleTier = async (t: Tier) => {
    await supabase.from('worker_tiers').update({ is_active: !t.is_active }).eq('id', t.id);
    fetchAll();
  };

  const deleteTier = async (id: string) => {
    if (!confirm('حذف الفئة؟ سيحذف كل التخصيصات المرتبطة.')) return;
    await supabase.from('worker_tiers').delete().eq('id', id);
    fetchAll();
  };

  // ─── Override CRUD ───────────────────────────────────────────────────────────
  const addOverride = async () => {
    const { tier_id, zone_id, worker_cut_pct } = newO;
    if (!tier_id || !zone_id || !worker_cut_pct) return;
    const { error } = await supabase.from('worker_tier_zone_overrides').upsert(
      { tier_id, zone_id, worker_cut_pct: +worker_cut_pct },
      { onConflict: 'tier_id,zone_id' }
    );
    if (error) { alert('❌ ' + error.message); return; }
    setNewO({ tier_id: '', zone_id: '', worker_cut_pct: '' });
    setShowOForm(false); fetchAll();
  };

  const deleteOverride = async (id: string) => {
    await supabase.from('worker_tier_zone_overrides').delete().eq('id', id);
    fetchAll();
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const tierName = (id: string) => tiers.find(t => t.id === id)?.name_ar ?? '—';
  const zoneName = (id: string) => zones.find(z => z.id === id)?.name_ar ?? '—';
  const tabCls = (t: Tab) =>
    `py-3 px-5 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`;
  const StarRating = ({ rating }: { rating: number }) => (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
    </span>
  );

  if (loading) return <div className="flex justify-center py-32 text-slate-400 font-medium">جاري التحميل...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-400" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-black text-foreground">تسعير فئات الفنيين</h1>
          <p className="text-[#4b5563] text-sm mt-1">تحديد نسبة ربح الفني بحسب تقييمه ومنطقته — قابلة للتخصيص بالكامل</p>
        </div>
        <button onClick={() => setShowSQL(v => !v)}
          className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl font-bold transition">
          <AlertCircle size={14} /> SQL Migration
        </button>
      </div>

      {/* SQL */}
      {showSQL && (
        <div className="bg-slate-900 rounded-2xl p-5">
          <p className="text-emerald-400 text-xs font-bold mb-3">شغّل في Supabase SQL Editor ↓</p>
          <pre className="text-xs text-slate-200 overflow-x-auto leading-relaxed font-mono">{SQL_MIGRATION}</pre>
        </div>
      )}

      {/* DB Warning */}
      {!dbReady && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-amber-800 text-sm">الجداول غير موجودة</p>
            <p className="text-amber-700 text-xs mt-0.5">اضغط "SQL Migration" أعلاه وشغّله في Supabase أولاً</p>
          </div>
        </div>
      )}

      {/* Formula Banner */}
      <div className="bg-gradient-to-l from-primary/5 to-amber-50 border border-amber-200 rounded-2xl p-4 text-center font-mono text-sm text-slate-700">
        <span className="font-black text-amber-700">كسب الفني</span> = سعر العميل ×{' '}
        <span className="font-black text-primary">نسبة الفئة%</span>{' '}
        <span className="text-slate-400">(× تخصيص المنطقة إن وُجد)</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button className={tabCls('tiers')}    onClick={() => setTab('tiers')}>
          <Star size={13} className="inline ml-1" />الفئات ({tiers.length})
        </button>
        <button className={tabCls('overrides')} onClick={() => setTab('overrides')}>
          <MapPin size={13} className="inline ml-1" />تخصيص المنطقة ({overrides.length})
        </button>
        <button className={tabCls('workers')}  onClick={() => setTab('workers')}>
          <Users size={13} className="inline ml-1" />الفنيون ({workers.length})
        </button>
      </div>

      {/* ══ TAB 1: TIERS ══════════════════════════════════════════════════════ */}
      {tab === 'tiers' && (
        <div className="space-y-4">
          <button onClick={() => setShowTForm(v => !v)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition text-sm">
            <Plus size={15} /> إضافة فئة
          </button>

          {showTForm && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2"><Star size={14} />فئة فني جديدة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">اسم الفئة *</label>
                  <input className={inputCls} placeholder="نخبة / ممتاز / عادي..." value={newT.name_ar} onChange={e => setNewT(p => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">أدنى تقييم * <span className="text-slate-400">(0–5)</span></label>
                  <input className={inputCls} type="number" step="0.1" min="0" max="5" placeholder="4.5" value={newT.min_rating} onChange={e => setNewT(p => ({ ...p, min_rating: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">أعلى تقييم * <span className="text-slate-400">(0–5)</span></label>
                  <input className={inputCls} type="number" step="0.1" min="0" max="5" placeholder="5.0" value={newT.max_rating} onChange={e => setNewT(p => ({ ...p, max_rating: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">نسبة ربح الفني % *</label>
                  <input className={inputCls} type="number" min="0" max="100" step="0.5" placeholder="مثلاً 80" value={newT.worker_cut_pct} onChange={e => setNewT(p => ({ ...p, worker_cut_pct: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">لون الشارة</label>
                  <select className={inputCls} value={newT.badge_color} onChange={e => setNewT(p => ({ ...p, badge_color: e.target.value }))}>
                    {BADGE_COLORS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                {newT.worker_cut_pct && (
                  <div className="flex items-end">
                    <div className="bg-white border border-amber-200 rounded-xl p-3 w-full text-center">
                      <p className="text-xs text-slate-500 font-bold">هامش التطبيق</p>
                      <p className="font-black text-emerald-700 text-lg">{(100 - +newT.worker_cut_pct).toFixed(1)}%</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={addTier} className="bg-amber-600 text-white rounded-xl px-5 py-2 font-bold flex items-center gap-2 text-sm"><Check size={14} />حفظ</button>
                <button onClick={() => setShowTForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold flex items-center gap-2 text-sm"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          {tiers.length === 0 && !showTForm && (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl text-sm">
              لا توجد فئات. أضف فئة أولاً.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {tiers.map(t => {
              const badge = getBadge(t.badge_color);
              const isEdit = editId === t.id;
              return (
                <div key={t.id} className={`bg-white border-2 rounded-2xl p-5 transition ${t.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                      <button onClick={() => toggleTier(t)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {t.is_active ? 'مفعّل' : 'معطّل'}
                      </button>
                      <button onClick={() => deleteTier(t.id)}
                        className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {isEdit ? (
                        <select className="bg-transparent text-xs font-bold outline-none" value={editBuf.badge_color} onChange={e => setEditBuf((b: any) => ({ ...b, badge_color: e.target.value }))}>
                          {BADGE_COLORS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                      ) : (
                        BADGE_COLORS.find(b => b.value === t.badge_color)?.label ?? t.badge_color
                      )}
                    </div>
                  </div>

                  {isEdit ? (
                    <div className="space-y-2">
                      <input className={inputCls} placeholder="اسم الفئة" value={editBuf.name_ar} onChange={e => setEditBuf((b: any) => ({ ...b, name_ar: e.target.value }))} />
                      <div className="grid grid-cols-3 gap-2">
                        <div><label className="text-[10px] text-slate-400 block">أدنى تقييم</label><input className={inputCls} type="number" step="0.1" value={editBuf.min_rating} onChange={e => setEditBuf((b: any) => ({ ...b, min_rating: e.target.value }))} /></div>
                        <div><label className="text-[10px] text-slate-400 block">أعلى تقييم</label><input className={inputCls} type="number" step="0.1" value={editBuf.max_rating} onChange={e => setEditBuf((b: any) => ({ ...b, max_rating: e.target.value }))} /></div>
                        <div><label className="text-[10px] text-slate-400 block">نسبة الربح %</label><input className={inputCls} type="number" step="0.5" value={editBuf.worker_cut_pct} onChange={e => setEditBuf((b: any) => ({ ...b, worker_cut_pct: e.target.value }))} /></div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => saveTier(t.id)} className="flex-1 bg-emerald-500 text-white rounded-xl py-2 font-bold text-sm flex items-center justify-center gap-1"><Check size={13} />حفظ</button>
                        <button onClick={() => setEditId(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-2 font-bold text-sm flex items-center justify-center gap-1"><X size={13} />إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-black text-slate-800 text-lg">{t.name_ar}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm text-slate-600 font-bold">{t.min_rating} – {t.max_rating}</span>
                      </div>
                      <div className="mt-4 bg-slate-50 rounded-xl p-3 flex justify-between items-center">
                        <div className="text-center flex-1">
                          <p className="text-xs text-slate-400 font-bold">ربح الفني</p>
                          <p className="text-xl font-black text-purple-700">{t.worker_cut_pct}%</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center flex-1">
                          <p className="text-xs text-slate-400 font-bold">هامش التطبيق</p>
                          <p className="text-xl font-black text-emerald-600">{(100 - t.worker_cut_pct).toFixed(1)}%</p>
                        </div>
                      </div>
                      <button onClick={() => { setEditId(t.id); setEditBuf({ name_ar: t.name_ar, min_rating: t.min_rating, max_rating: t.max_rating, worker_cut_pct: t.worker_cut_pct, badge_color: t.badge_color }); }}
                        className="mt-3 w-full bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl py-2 font-bold text-sm flex items-center justify-center gap-1 transition border border-slate-200">
                        <Edit3 size={13} />تعديل
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB 2: OVERRIDES ══════════════════════════════════════════════════ */}
      {tab === 'overrides' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 text-right">
            <p className="font-black mb-1">📍 تخصيص المنطقة</p>
            <p className="text-blue-700 text-xs">إذا أضفت تخصيص لمنطقة معينة، سيُستخدم بدل النسبة الافتراضية للفئة في تلك المنطقة تحديداً.</p>
            <p className="text-blue-600 text-xs mt-1">مثال: فئة "نخبة" نسبتها 80% بشكل عام، لكن في "بغداد - الكرادة" تصبح 82%</p>
          </div>

          <button onClick={() => setShowOForm(v => !v)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition text-sm">
            <Plus size={15} /> إضافة تخصيص منطقة
          </button>

          {showOForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-blue-900 text-sm">تخصيص نسبة ربح لفئة في منطقة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">الفئة *</label>
                  <select className={inputCls} value={newO.tier_id} onChange={e => setNewO(p => ({ ...p, tier_id: e.target.value }))}>
                    <option value="">اختر الفئة...</option>
                    {tiers.map(t => <option key={t.id} value={t.id}>{t.name_ar} ({t.worker_cut_pct}% افتراضي)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">المنطقة *</label>
                  <select className={inputCls} value={newO.zone_id} onChange={e => setNewO(p => ({ ...p, zone_id: e.target.value }))}>
                    <option value="">اختر المنطقة...</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">نسبة الربح الخاصة % *</label>
                  <input className={inputCls} type="number" min="0" max="100" step="0.5" placeholder="مثلاً 82" value={newO.worker_cut_pct} onChange={e => setNewO(p => ({ ...p, worker_cut_pct: e.target.value }))} />
                </div>
              </div>
              {newO.tier_id && newO.worker_cut_pct && (() => {
                const tier = tiers.find(t => t.id === newO.tier_id);
                const diff = +newO.worker_cut_pct - (tier?.worker_cut_pct ?? 0);
                return (
                  <div className={`rounded-xl px-4 py-2 text-xs text-center font-bold ${diff > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : diff < 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-500'}`}>
                    {diff > 0 ? `↑ ${diff.toFixed(1)}% أعلى من الافتراضي` : diff < 0 ? `↓ ${Math.abs(diff).toFixed(1)}% أقل من الافتراضي` : 'مساوٍ للنسبة الافتراضية'}
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <button onClick={addOverride} className="bg-blue-600 text-white rounded-xl px-5 py-2 font-bold flex items-center gap-2 text-sm"><Check size={14}/>حفظ</button>
                <button onClick={() => setShowOForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14}/>إلغاء</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black">
                <tr>
                  <th className="px-4 py-3 text-right">الفئة</th>
                  <th className="px-4 py-3 text-right">المنطقة</th>
                  <th className="px-4 py-3 text-right">النسبة الافتراضية</th>
                  <th className="px-4 py-3 text-right text-blue-600">النسبة المخصصة</th>
                  <th className="px-4 py-3 text-right">الفرق</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overrides.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">لا توجد تخصيصات.</td></tr>
                )}
                {overrides.map(o => {
                  const tier = tiers.find(t => t.id === o.tier_id);
                  const diff = o.worker_cut_pct - (tier?.worker_cut_pct ?? 0);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {tier && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-black border ${getBadge(tier.badge_color).bg} ${getBadge(tier.badge_color).text} ${getBadge(tier.badge_color).border}`}>
                            {tier.name_ar}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-bold text-xs">{zoneName(o.zone_id)}</td>
                      <td className="px-4 py-3 text-slate-400 font-bold text-xs">{tier?.worker_cut_pct ?? '—'}%</td>
                      <td className="px-4 py-3 font-black text-blue-700">{o.worker_cut_pct}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-emerald-100 text-emerald-700' : diff < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                          {diff > 0 ? `+${diff.toFixed(1)}%` : diff < 0 ? `${diff.toFixed(1)}%` : 'لا فرق'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteOverride(o.id)} className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100">
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ TAB 3: WORKERS ═══════════════════════════════════════════════════ */}
      {tab === 'workers' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            {tiers.filter(t => t.is_active).map(t => {
              const badge = getBadge(t.badge_color);
              const count = workers.filter(w => w.rating >= t.min_rating && w.rating <= t.max_rating).length;
              return (
                <div key={t.id} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${badge.bg} ${badge.border}`}>
                  <span className={`text-sm font-black ${badge.text}`}>{t.name_ar}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${badge.text}`}>{count} فني</span>
                  <span className={`text-xs ${badge.text} opacity-70`}>{t.worker_cut_pct}%</span>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black">
                <tr>
                  <th className="px-4 py-3 text-right">الفني</th>
                  <th className="px-4 py-3 text-right">هاتف</th>
                  <th className="px-4 py-3 text-right">التقييم</th>
                  <th className="px-4 py-3 text-right">عدد التقييمات</th>
                  <th className="px-4 py-3 text-right">الفئة الحالية</th>
                  <th className="px-4 py-3 text-right text-purple-600">نسبة الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">لا يوجد فنيون.</td></tr>
                )}
                {workers.map(w => {
                  const tier = getTier(w.rating, tiers);
                  const badge = tier ? getBadge(tier.badge_color) : null;
                  return (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">{w.full_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{w.phone}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-600">{w.rating?.toFixed(1) ?? '—'}</span>
                          {w.rating > 0 && <StarRating rating={w.rating} />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{fmt(w.rating_count || 0)}</td>
                      <td className="px-4 py-3">
                        {tier && badge ? (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {tier.name_ar}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">بدون فئة</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tier ? (
                          <span className="font-black text-purple-700">{tier.worker_cut_pct}%</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
