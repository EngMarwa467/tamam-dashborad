import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit3, Check, X, Star, Users, CreditCard, Clock, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  id: string; name_ar: string; name_en: string; price_iqd: number;
  period_days: number; is_active: boolean; is_popular: boolean;
  sort_order: number; features: string[]; color: string;
}
interface Sub {
  id: string; user_id: string; plan_id: string; status: string;
  starts_at: string; expires_at: string;
  profiles?: { full_name: string; phone: string };
  subscription_plans?: { name_ar: string };
}

type Tab = 'plans' | 'subscribers';

const inputCls = 'border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white text-slate-800 w-full';

const COLORS = [
  { value: 'gray',   label: 'رمادي',  from: 'from-slate-400',  to: 'to-slate-500',  badge: 'bg-slate-100 text-slate-700' },
  { value: 'blue',   label: 'أزرق',   from: 'from-blue-500',   to: 'to-indigo-600', badge: 'bg-blue-100 text-blue-700' },
  { value: 'gold',   label: 'ذهبي',   from: 'from-amber-400',  to: 'to-orange-500', badge: 'bg-amber-100 text-amber-700' },
  { value: 'green',  label: 'أخضر',   from: 'from-emerald-500',to: 'to-teal-600',   badge: 'bg-emerald-100 text-emerald-700' },
  { value: 'purple', label: 'بنفسجي', from: 'from-purple-500', to: 'to-pink-500',   badge: 'bg-purple-100 text-purple-700' },
];
const getColor = (c: string) => COLORS.find(x => x.value === c) ?? COLORS[0];
const fmt = (n: number) => n.toLocaleString('en-US');
const daysLabel = (d: number) => d === 30 ? 'شهري' : d === 90 ? 'ربع سنوي' : d === 365 ? 'سنوي' : `${d} يوم`;

const EMPTY_PLAN = { name_ar: '', name_en: '', price_iqd: '', period_days: '30', is_popular: false, color: 'blue', features: [''] };

export default function SubscriptionPlans() {
  const [tab, setTab]         = useState<Tab>('plans');
  const [plans, setPlans]     = useState<Plan[]>([]);
  const [subs, setSubs]       = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState<any>(EMPTY_PLAN);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('sort_order'),
      supabase.from('subscriptions').select('*, profiles(full_name, phone), subscription_plans(name_ar)').order('created_at', { ascending: false }),
    ]);
    setPlans(p || []);
    setSubs(s || []);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  // ── Plan CRUD ─────────────────────────────────────────────────────────────
  const addPlan = async () => {
    const { name_ar, name_en, price_iqd, period_days, is_popular, color, features } = form;
    if (!name_ar || !price_iqd) return;
    const cleaned = features.filter((f: string) => f.trim());
    await supabase.from('subscription_plans').insert({
      name_ar, name_en, price_iqd: +price_iqd, period_days: +period_days,
      is_popular, color, features: cleaned, sort_order: plans.length + 1,
    });
    setForm(EMPTY_PLAN); setShowForm(false); fetchAll();
  };

  const savePlan = async (id: string) => {
    const cleaned = (editBuf.features || []).filter((f: string) => f.trim());
    await supabase.from('subscription_plans').update({
      name_ar: editBuf.name_ar, name_en: editBuf.name_en,
      price_iqd: +editBuf.price_iqd, period_days: +editBuf.period_days,
      is_popular: editBuf.is_popular, color: editBuf.color, features: cleaned,
    }).eq('id', id);
    setEditId(null); fetchAll();
  };

  const deletePlan = async (id: string) => {
    if (!confirm('حذف الخطة؟')) return;
    await supabase.from('subscription_plans').delete().eq('id', id);
    fetchAll();
  };

  const toggleActive = async (p: Plan) => {
    await supabase.from('subscription_plans').update({ is_active: !p.is_active }).eq('id', p.id);
    fetchAll();
  };

  const moveOrder = async (id: string, dir: 'up' | 'down') => {
    const idx = plans.findIndex(p => p.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= plans.length) return;
    const a = plans[idx], b = plans[swapIdx];
    await Promise.all([
      supabase.from('subscription_plans').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('subscription_plans').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    fetchAll();
  };

  // ── Feature helpers ───────────────────────────────────────────────────────
  const featureChange = (arr: string[], i: number, val: string, setter: any, key: string) => {
    const next = [...arr]; next[i] = val; setter((p: any) => ({ ...p, [key]: next }));
  };
  const addFeature   = (arr: string[], setter: any, key: string) => setter((p: any) => ({ ...p, [key]: [...arr, ''] }));
  const removeFeature = (arr: string[], i: number, setter: any, key: string) => {
    setter((p: any) => ({ ...p, [key]: arr.filter((_: any, j: number) => j !== i) }));
  };

  // ── Status helpers ────────────────────────────────────────────────────────
  const statusCls = (s: string) => ({
    active:    'bg-emerald-100 text-emerald-700',
    pending:   'bg-amber-100 text-amber-700',
    expired:   'bg-red-100 text-red-600',
    cancelled: 'bg-slate-100 text-slate-500',
  }[s] ?? 'bg-slate-100 text-slate-500');

  const statusLabel = (s: string) => ({ active: 'نشط', pending: 'معلق', expired: 'منتهي', cancelled: 'ملغي' }[s] ?? s);

  const filteredSubs = statusFilter === 'all' ? subs : subs.filter(s => s.status === statusFilter);

  const tabCls = (t: Tab) => `py-3 px-5 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`;

  const FeatureEditor = ({ features, setter, fKey }: { features: string[], setter: any, fKey: string }) => (
    <div className="space-y-2">
      {features.map((f: string, i: number) => (
        <div key={i} className="flex gap-2">
          <input className={inputCls} placeholder={`الميزة ${i + 1}`} value={f}
            onChange={e => featureChange(features, i, e.target.value, setter, fKey)} />
          <button onClick={() => removeFeature(features, i, setter, fKey)}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-100"><X size={13} /></button>
        </div>
      ))}
      <button onClick={() => addFeature(features, setter, fKey)}
        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 mt-1">
        <Plus size={13} /> إضافة ميزة
      </button>
    </div>
  );

  if (loading) return <div className="flex justify-center py-32 text-slate-400">جاري التحميل...</div>;

  // ── Global stats ──────────────────────────────────────────────────────────
  const activeCount  = subs.filter(s => s.status === 'active').length;
  const pendingCount = subs.filter(s => s.status === 'pending').length;
  const expiredCount = subs.filter(s => s.status === 'expired').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-400" dir="rtl">

      {/* ── Hero Strip ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-pink-500 to-purple-700 px-8 py-8 shadow-xl shadow-purple-200/40">
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 right-1/3 w-28 h-28 bg-blue-400/20 rounded-full translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-pink-200 text-xs font-bold">💎 خطط الاشتراك</span>
            <h1 className="text-3xl font-black text-white mt-1">إدارة الاشتراكات</h1>
            <p className="text-pink-100/80 mt-1 text-sm">خطط القيمة والمشتركون — متصل بـ QiCard عند توفر الـ API</p>
          </div>
          <div className="flex gap-3 text-center">
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
              <p className="text-xl font-black text-white">{activeCount}</p>
              <p className="text-[10px] font-bold text-pink-100">نشط</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
              <p className="text-xl font-black text-amber-300">{pendingCount}</p>
              <p className="text-[10px] font-bold text-pink-100">معلق</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
              <p className="text-xl font-black text-white">{plans.filter(p => p.is_active).length}</p>
              <p className="text-[10px] font-bold text-pink-100">خطة نشطة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button className={tabCls('plans')}       onClick={() => setTab('plans')}><CreditCard size={13} className="inline ml-1" />الخطط ({plans.length})</button>
        <button className={tabCls('subscribers')} onClick={() => setTab('subscribers')}><Users size={13} className="inline ml-1" />المشتركون ({subs.length})</button>
      </div>

      {/* ══ TAB 1: PLANS ═══════════════════════════════════════════════════ */}
      {tab === 'plans' && (
        <div className="space-y-5">
          <button onClick={() => setShowForm(v => !v)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition text-sm">
            <Plus size={15} /> إضافة خطة
          </button>

          {/* Add Form */}
          {showForm && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 space-y-5">
              <h3 className="font-black text-blue-900 text-base flex items-center gap-2"><Sparkles size={16} />خطة اشتراك جديدة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">اسم الخطة (عربي) *</label>
                  <input className={inputCls} placeholder="الاحترافية" value={form.name_ar} onChange={e => setForm((p: any) => ({ ...p, name_ar: e.target.value }))} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">اسم الخطة (إنجليزي)</label>
                  <input className={inputCls} placeholder="Pro" value={form.name_en} onChange={e => setForm((p: any) => ({ ...p, name_en: e.target.value }))} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">السعر (د.ع) *</label>
                  <input className={inputCls} type="number" placeholder="35000" value={form.price_iqd} onChange={e => setForm((p: any) => ({ ...p, price_iqd: e.target.value }))} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">المدة</label>
                  <select className={inputCls} value={form.period_days} onChange={e => setForm((p: any) => ({ ...p, period_days: e.target.value }))}>
                    <option value="7">أسبوعي (7 أيام)</option>
                    <option value="30">شهري (30 يوم)</option>
                    <option value="90">ربع سنوي (90 يوم)</option>
                    <option value="180">نصف سنوي (180 يوم)</option>
                    <option value="365">سنوي (365 يوم)</option>
                  </select></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">اللون</label>
                  <select className={inputCls} value={form.color} onChange={e => setForm((p: any) => ({ ...p, color: e.target.value }))}>
                    {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select></div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 rounded-xl px-4 py-2.5 w-full hover:bg-amber-50">
                    <input type="checkbox" checked={form.is_popular} onChange={e => setForm((p: any) => ({ ...p, is_popular: e.target.checked }))} className="rounded" />
                    <span className="text-sm font-bold text-slate-700">⭐ الأكثر طلباً</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-2 block">المزايا المضمنة</label>
                <FeatureEditor features={form.features} setter={setForm} fKey="features" />
              </div>
              <div className="flex gap-2">
                <button onClick={addPlan} className="bg-blue-600 text-white rounded-xl px-5 py-2 font-bold text-sm flex items-center gap-2"><Check size={14} />حفظ الخطة</button>
                <button onClick={() => setShowForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {plans.map((plan, idx) => {
              const col = getColor(plan.color);
              const isEdit = editId === plan.id;
              return (
                <div key={plan.id} className={`bg-white border-2 rounded-2xl overflow-hidden transition ${plan.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60'}`}>
                  {/* Color Header */}
                  <div className={`bg-gradient-to-l ${col.from} ${col.to} px-5 py-4 relative`}>
                    {plan.is_popular && (
                      <span className="absolute top-3 left-3 bg-white/90 text-amber-700 text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                        <Star size={10} className="fill-amber-500 text-amber-500" /> الأكثر طلباً
                      </span>
                    )}
                    <p className="text-white font-black text-xl">{plan.name_ar}</p>
                    {plan.name_en && <p className="text-white/70 text-xs">{plan.name_en}</p>}
                    <div className="mt-2">
                      <span className="text-3xl font-black text-white">{fmt(plan.price_iqd)}</span>
                      <span className="text-white/80 text-sm mr-1">د.ع / {daysLabel(plan.period_days)}</span>
                    </div>
                  </div>

                  <div className="p-5">
                    {isEdit ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="text-[10px] text-slate-400 block">اسم عربي</label><input className={inputCls} value={editBuf.name_ar} onChange={e => setEditBuf((b: any) => ({ ...b, name_ar: e.target.value }))} /></div>
                          <div><label className="text-[10px] text-slate-400 block">اسم إنجليزي</label><input className={inputCls} value={editBuf.name_en || ''} onChange={e => setEditBuf((b: any) => ({ ...b, name_en: e.target.value }))} /></div>
                          <div><label className="text-[10px] text-slate-400 block">السعر د.ع</label><input className={inputCls} type="number" value={editBuf.price_iqd} onChange={e => setEditBuf((b: any) => ({ ...b, price_iqd: e.target.value }))} /></div>
                          <div><label className="text-[10px] text-slate-400 block">المدة</label>
                            <select className={inputCls} value={editBuf.period_days} onChange={e => setEditBuf((b: any) => ({ ...b, period_days: e.target.value }))}>
                              <option value="7">7 أيام</option><option value="30">30 يوم</option><option value="90">90 يوم</option><option value="180">180 يوم</option><option value="365">365 يوم</option>
                            </select></div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1"><label className="text-[10px] text-slate-400 block">اللون</label>
                            <select className={inputCls} value={editBuf.color} onChange={e => setEditBuf((b: any) => ({ ...b, color: e.target.value }))}>
                              {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select></div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                              <input type="checkbox" checked={editBuf.is_popular} onChange={e => setEditBuf((b: any) => ({ ...b, is_popular: e.target.checked }))} />
                              <span className="text-xs font-bold">الأكثر طلباً</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1.5">المزايا</label>
                          <FeatureEditor features={editBuf.features || []} setter={setEditBuf} fKey="features" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => savePlan(plan.id)} className="flex-1 bg-emerald-500 text-white rounded-xl py-2 font-bold text-sm flex items-center justify-center gap-1"><Check size={13}/>حفظ</button>
                          <button onClick={() => setEditId(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-2 font-bold text-sm flex items-center justify-center gap-1"><X size={13}/>إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Features List */}
                        <ul className="space-y-1.5 mb-4 min-h-[80px]">
                          {(plan.features || []).map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                              <Check size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                          {(!plan.features || plan.features.length === 0) && <li className="text-slate-300 text-xs italic">لا توجد مزايا مضافة</li>}
                        </ul>

                        {/* Duration badge */}
                        <div className="flex items-center gap-2 mb-4">
                          <Clock size={13} className="text-slate-400" />
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{daysLabel(plan.period_days)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => toggleActive(plan)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {plan.is_active ? 'مفعّلة' : 'معطّلة'}
                          </button>
                          <button onClick={() => { setEditId(plan.id); setEditBuf({ ...plan, features: [...(plan.features || [])] }); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100">
                            <Edit3 size={11} />تعديل
                          </button>
                          <button onClick={() => deletePlan(plan.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-400 hover:bg-red-100">
                            <Trash2 size={11} />حذف
                          </button>
                          <div className="flex gap-1 mr-auto">
                            <button onClick={() => moveOrder(plan.id, 'up')} disabled={idx === 0}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-30"><ChevronUp size={13}/></button>
                            <button onClick={() => moveOrder(plan.id, 'down')} disabled={idx === plans.length - 1}
                              className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-30"><ChevronDown size={13}/></button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB 2: SUBSCRIBERS ══════════════════════════════════════════════ */}
      {tab === 'subscribers' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'active', 'pending', 'expired', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${statusFilter === s ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {s === 'all' ? 'الكل' : statusLabel(s)} {s !== 'all' && `(${subs.filter(x => x.status === s).length})`}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black">
                <tr>
                  <th className="px-4 py-3 text-right">المشترك</th>
                  <th className="px-4 py-3 text-right">الخطة</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">البداية</th>
                  <th className="px-4 py-3 text-right">الانتهاء</th>
                  <th className="px-4 py-3 text-right">متبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-14 text-slate-400 text-sm">لا توجد اشتراكات.</td></tr>
                )}
                {filteredSubs.map(s => {
                  const daysLeft = s.expires_at
                    ? Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{(s as any).profiles?.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">{(s as any).profiles?.phone ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{(s as any).subscription_plans?.name_ar ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCls(s.status)}`}>{statusLabel(s.status)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.starts_at ? new Date(s.starts_at).toLocaleDateString('ar-IQ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString('ar-IQ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {daysLeft !== null ? (
                          <span className={`text-xs font-black ${daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {daysLeft > 0 ? `${daysLeft} يوم` : 'انتهى'}
                          </span>
                        ) : '—'}
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
