import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Plus, Trash2, Edit3, Check, X, Clock, Zap, Tag, AlertCircle } from 'lucide-react';
import { IRAQ_GOVERNORATES } from '../data/iraqLocations';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service     { id: string; name_ar: string; base_price: number; }
interface PricingCfg  { id: string; service_id: string; city: string; district: string; base_price: number; price_per_km: number; worker_cut_pct: number; urgent_fee: number; center_lat: number | null; center_lng: number | null; }
interface SurgeRule   { id: string; city: string | null; label: string; day_of_week: number[] | null; hour_from: number; hour_to: number; multiplier: number; is_active: boolean; }
interface DemandCfg   { id: string; city: string; surge_threshold_ratio: number; max_surge_multiplier: number; is_active: boolean; }
interface Extra       { id: string; service_id: string; option_key: string; option_value: string | null; extra_fee: number; label_ar: string; }

type Tab = 'pricing' | 'peak' | 'demand' | 'extras';

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const IRAQ_CITIES = ['بغداد', 'البصرة', 'أربيل', 'نينوى', 'النجف', 'كربلاء', 'كركوك', 'الأنبار', 'ديالى', 'بابل', 'ذي قار', 'ميسان', 'المثنى', 'القادسية', 'واسط', 'صلاح الدين', 'السليمانية', 'دهوك'];
const inputCls = 'border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white text-slate-800 w-full';
const fmt = (n: number) => (n ?? 0).toLocaleString('en-US');

const SQL_MIGRATION = `-- 1. إعدادات التسعير الأساسية
CREATE TABLE IF NOT EXISTS pricing_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     uuid REFERENCES services(id) ON DELETE CASCADE,
  city           text NOT NULL,
  district       text DEFAULT '',
  base_price     numeric NOT NULL,
  price_per_km   numeric DEFAULT 500,
  worker_cut_pct numeric DEFAULT 72,
  urgent_fee     numeric DEFAULT 10000,
  center_lat     double precision,
  center_lng     double precision,
  is_active      boolean DEFAULT true,
  UNIQUE(service_id, city, district)
);

-- 2. قواعد الذروة
CREATE TABLE IF NOT EXISTS pricing_surge_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city          text,
  label         text NOT NULL,
  day_of_week   int[],
  hour_from     int NOT NULL,
  hour_to       int NOT NULL,
  multiplier    numeric DEFAULT 1.3,
  is_active     boolean DEFAULT true
);

-- 3. إعداد الـ Surge الديناميكي
CREATE TABLE IF NOT EXISTS pricing_demand_config (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city                  text NOT NULL,
  surge_threshold_ratio numeric DEFAULT 0.3,
  max_surge_multiplier  numeric DEFAULT 2.0,
  is_active             boolean DEFAULT true,
  UNIQUE(city)
);

-- 4. رسوم الإضافات
CREATE TABLE IF NOT EXISTS pricing_extras (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   uuid REFERENCES services(id) ON DELETE CASCADE,
  option_key   text NOT NULL,
  option_value text,
  extra_fee    numeric NOT NULL,
  label_ar     text,
  UNIQUE(service_id, option_key, option_value)
);

-- 5. إضافة أعمدة للطلبات
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS price_breakdown jsonb;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS distance_km numeric;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS surge_multiplier numeric DEFAULT 1.0;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS city text;

-- 6. RLS Policies
ALTER TABLE pricing_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_surge_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_demand_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_extras        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON pricing_config        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON pricing_surge_rules   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON pricing_demand_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON pricing_extras        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- اقرأ RLS للتطبيق (anon)
CREATE POLICY "anon_read" ON pricing_config        FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read" ON pricing_surge_rules   FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read" ON pricing_demand_config FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read" ON pricing_extras        FOR SELECT TO anon USING (true);`;

export default function DynamicPricing() {
  const [tab, setTab] = useState<Tab>('pricing');
  const [services,   setServices]   = useState<Service[]>([]);
  const [configs,    setConfigs]    = useState<PricingCfg[]>([]);
  const [surges,     setSurges]     = useState<SurgeRule[]>([]);
  const [demands,    setDemands]    = useState<DemandCfg[]>([]);
  const [extras,     setExtras]     = useState<Extra[]>([]);
  const [dbReady,    setDbReady]    = useState(true);
  const [loading,    setLoading]    = useState(true);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editBuf,    setEditBuf]    = useState<any>({});

  // Forms
  const [showPForm, setShowPForm] = useState(false);
  const [showSForm, setShowSForm] = useState(false);
  const [showDForm, setShowDForm] = useState(false);
  const [showEForm, setShowEForm] = useState(false);
  const [newP, setNewP] = useState({ service_id: '', city: '', district: '', base_price: '', price_per_km: '500', worker_cut_pct: '72', urgent_fee: '10000', center_lat: '', center_lng: '' });
  const [newS, setNewS] = useState({ city: '', label: '', day_of_week: [] as number[], hour_from: '18', hour_to: '23', multiplier: '1.3' });
  const [newD, setNewD] = useState({ city: '', surge_threshold_ratio: '0.3', max_surge_multiplier: '2.0' });
  const [newE, setNewE] = useState({ service_id: '', option_key: '', option_value: '', extra_fee: '', label_ar: '' });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: c, error: ce }, { data: sr }, { data: dc }, { data: ex }] = await Promise.all([
      supabase.from('services').select('id,name_ar,base_price').eq('is_active', true),
      supabase.from('pricing_config').select('*').order('city'),
      supabase.from('pricing_surge_rules').select('*').order('hour_from'),
      supabase.from('pricing_demand_config').select('*').order('city'),
      supabase.from('pricing_extras').select('*').order('service_id'),
    ]);
    if (ce) setDbReady(false);
    setServices(s || []); setConfigs(c || []); setSurges(sr || []); setDemands(dc || []); setExtras(ex || []);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  // ── Pricing Config ────────────────────────────────────────────────────────────
  const addConfig = async () => {
    const { error } = await supabase.from('pricing_config').upsert({
      service_id: newP.service_id, city: newP.city, district: newP.district || '',
      base_price: +newP.base_price, price_per_km: +newP.price_per_km,
      worker_cut_pct: +newP.worker_cut_pct, urgent_fee: +newP.urgent_fee,
      center_lat: newP.center_lat ? +newP.center_lat : null,
      center_lng: newP.center_lng ? +newP.center_lng : null,
    }, { onConflict: 'service_id,city,district' });
    if (error) { alert('❌ ' + error.message); return; }
    setShowPForm(false); setNewP({ service_id: '', city: '', district: '', base_price: '', price_per_km: '500', worker_cut_pct: '72', urgent_fee: '10000', center_lat: '', center_lng: '' }); fetchAll();
  };
  const saveConfig = async (id: string) => {
    await supabase.from('pricing_config').update({ base_price: +editBuf.base_price, price_per_km: +editBuf.price_per_km, worker_cut_pct: +editBuf.worker_cut_pct, urgent_fee: +editBuf.urgent_fee }).eq('id', id);
    setEditId(null); fetchAll();
  };
  const delConfig = async (id: string) => { if (confirm('حذف؟')) { await supabase.from('pricing_config').delete().eq('id', id); fetchAll(); } };

  // ── Surge Rules ───────────────────────────────────────────────────────────────
  const addSurge = async () => {
    const { error } = await supabase.from('pricing_surge_rules').insert({
      city: newS.city || null, label: newS.label,
      day_of_week: newS.day_of_week.length ? newS.day_of_week : null,
      hour_from: +newS.hour_from, hour_to: +newS.hour_to, multiplier: +newS.multiplier,
    });
    if (error) { alert('❌ ' + error.message); return; }
    setShowSForm(false); fetchAll();
  };
  const toggleSurge = async (r: SurgeRule) => { await supabase.from('pricing_surge_rules').update({ is_active: !r.is_active }).eq('id', r.id); fetchAll(); };
  const delSurge = async (id: string) => { await supabase.from('pricing_surge_rules').delete().eq('id', id); fetchAll(); };

  // ── Demand Config ─────────────────────────────────────────────────────────────
  const addDemand = async () => {
    const { error } = await supabase.from('pricing_demand_config').upsert({
      city: newD.city, surge_threshold_ratio: +newD.surge_threshold_ratio, max_surge_multiplier: +newD.max_surge_multiplier,
    }, { onConflict: 'city' });
    if (error) { alert('❌ ' + error.message); return; }
    setShowDForm(false); fetchAll();
  };
  const saveDemand = async (id: string) => {
    await supabase.from('pricing_demand_config').update({ surge_threshold_ratio: +editBuf.surge_threshold_ratio, max_surge_multiplier: +editBuf.max_surge_multiplier }).eq('id', id);
    setEditId(null); fetchAll();
  };
  const delDemand = async (id: string) => { await supabase.from('pricing_demand_config').delete().eq('id', id); fetchAll(); };

  // ── Extras ────────────────────────────────────────────────────────────────────
  const addExtra = async () => {
    const { error } = await supabase.from('pricing_extras').upsert({
      service_id: newE.service_id, option_key: newE.option_key,
      option_value: newE.option_value || null, extra_fee: +newE.extra_fee, label_ar: newE.label_ar,
    }, { onConflict: 'service_id,option_key,option_value' });
    if (error) { alert('❌ ' + error.message); return; }
    setShowEForm(false); fetchAll();
  };
  const saveExtra = async (id: string) => {
    await supabase.from('pricing_extras').update({ extra_fee: +editBuf.extra_fee, label_ar: editBuf.label_ar }).eq('id', id);
    setEditId(null); fetchAll();
  };
  const delExtra = async (id: string) => { await supabase.from('pricing_extras').delete().eq('id', id); fetchAll(); };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const svcName = (id: string) => services.find(s => s.id === id)?.name_ar ?? '—';
  const tabCls = (t: Tab) => `py-3 px-4 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`;
  const btnCls = 'bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm hover:bg-primary/90 transition';

  if (loading) return <div className="flex justify-center py-32 text-slate-400">جاري التحميل...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-400" dir="rtl">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800">التسعير الديناميكي</h1>
        <p className="text-slate-500 text-sm mt-1">نظام تسعير متكامل — سعر أساسي + مسافة + ذروة + طلب</p>
      </div>

      {/* Formula Banner */}
      <div className="bg-gradient-to-l from-primary/5 to-blue-50 border border-primary/20 rounded-2xl p-4 font-mono text-sm text-slate-700 text-center">
        <span className="font-black text-primary">السعر</span> = (أساسي + كم × سعر/كم) × <span className="text-orange-600 font-bold">ذروة</span> × <span className="text-red-600 font-bold">طلب</span> + إضافات + صاروخ − كوبون
      </div>

      {/* SQL Alert */}
      {!dbReady && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <p className="font-black text-red-800 flex items-center gap-2"><AlertCircle size={18} />الجداول غير موجودة — شغّل SQL Migration أولاً</p>
          <pre className="mt-3 bg-red-100 rounded-xl p-3 text-xs text-left overflow-x-auto font-mono leading-relaxed text-slate-800">{SQL_MIGRATION}</pre>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        <button className={tabCls('pricing')} onClick={() => setTab('pricing')}><DollarSign size={13} className="inline ml-1" />الأسعار ({configs.length})</button>
        <button className={tabCls('peak')}    onClick={() => setTab('peak')}><Clock size={13} className="inline ml-1" />الذروة ({surges.length})</button>
        <button className={tabCls('demand')}  onClick={() => setTab('demand')}><Zap size={13} className="inline ml-1" />Surge ({demands.length})</button>
        <button className={tabCls('extras')}  onClick={() => setTab('extras')}><Tag size={13} className="inline ml-1" />الإضافات ({extras.length})</button>
      </div>

      {/* ══ TAB 1: PRICING CONFIG ═══════════════════════════════════════ */}
      {tab === 'pricing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setShowPForm(v => !v)} className={btnCls}><Plus size={15} />إضافة سعر</button>
            <p className="text-xs text-slate-400">السعر النهائي = (أساسي + مسافة) × معاملات الذروة والطلب</p>
          </div>

          {showPForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-blue-900 text-sm">تسعير خدمة في مدينة / منطقة</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="col-span-2 lg:col-span-1">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">الخدمة *</label>
                  <select className={inputCls} value={newP.service_id} onChange={e => setNewP(p => ({ ...p, service_id: e.target.value }))}>
                    <option value="">اختر...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">المدينة *</label>
                  <select className={inputCls} value={newP.city} onChange={e => setNewP(p => ({ ...p, city: e.target.value, district: '' }))}>
                    <option value="">اختر...</option>
                    {IRAQ_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">المنطقة / الحي <span className="text-slate-400">(فارغ = كل المدينة)</span></label>
                  <select className={inputCls} value={newP.district} onChange={e => setNewP(p => ({ ...p, district: e.target.value }))} disabled={!newP.city}>
                    <option value="">كل المدينة (عام)</option>
                    {(IRAQ_GOVERNORATES.find(g => g.label === newP.city)?.districts || []).map(d => <option key={d.label} value={d.label}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">السعر الأساسي (د.ع) *</label>
                  <input className={inputCls} type="number" placeholder="20000" value={newP.base_price} onChange={e => setNewP(p => ({ ...p, base_price: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">سعر الكيلومتر (د.ع)</label>
                  <input className={inputCls} type="number" placeholder="500" value={newP.price_per_km} onChange={e => setNewP(p => ({ ...p, price_per_km: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">نسبة العامل %</label>
                  <input className={inputCls} type="number" min="0" max="100" placeholder="72" value={newP.worker_cut_pct} onChange={e => setNewP(p => ({ ...p, worker_cut_pct: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">رسوم الصاروخ 🚀</label>
                  <input className={inputCls} type="number" placeholder="10000" value={newP.urgent_fee} onChange={e => setNewP(p => ({ ...p, urgent_fee: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Lat مركز المدينة</label>
                  <input className={inputCls} type="number" step="any" placeholder="33.3152" value={newP.center_lat} onChange={e => setNewP(p => ({ ...p, center_lat: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Lng مركز المدينة</label>
                  <input className={inputCls} type="number" step="any" placeholder="44.3661" value={newP.center_lng} onChange={e => setNewP(p => ({ ...p, center_lng: e.target.value }))} />
                </div>
              </div>
              {newP.base_price && newP.worker_cut_pct && (
                <div className="bg-white border border-blue-100 rounded-xl p-3 text-xs text-center">
                  <span className="text-slate-500">هامش التطبيق: </span>
                  <span className="font-black text-emerald-700">{(100 - +newP.worker_cut_pct).toFixed(1)}%</span>
                  <span className="text-slate-400 mx-2">·</span>
                  <span className="text-slate-500">كسب العامل: </span>
                  <span className="font-black text-purple-700">{(+newP.base_price * +newP.worker_cut_pct / 100).toLocaleString('en-US')} د.ع</span>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={addConfig} className="bg-blue-600 text-white rounded-xl px-5 py-2 font-bold text-sm flex items-center gap-2"><Check size={14} />حفظ</button>
                <button onClick={() => setShowPForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs font-black text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">الخدمة</th>
                  <th className="px-4 py-3 text-right">المدينة</th>
                  <th className="px-4 py-3 text-right">المنطقة</th>
                  <th className="px-4 py-3 text-right">الأساسي</th>
                  <th className="px-4 py-3 text-right">سعر/كم</th>
                  <th className="px-4 py-3 text-right">نسبة العامل</th>
                  <th className="px-4 py-3 text-right text-orange-500">🚀</th>
                  <th className="px-4 py-3 text-right text-emerald-600">هامش</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configs.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-400">لا توجد أسعار. أضف أولاً.</td></tr>}
                {configs.map(c => {
                  const isEdit = editId === c.id;
                  const margin = 100 - (isEdit ? +editBuf.worker_cut_pct : c.worker_cut_pct);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-xs">{svcName(c.service_id)}</td>
                      <td className="px-4 py-3 text-xs">{c.city}</td>
                      <td className="px-4 py-3 text-xs">{c.district ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{c.district}</span> : <span className="text-slate-400">عام</span>}</td>
                      <td className="px-4 py-3">{isEdit ? <input className={inputCls} type="number" value={editBuf.base_price} onChange={e => setEditBuf((b: any) => ({ ...b, base_price: e.target.value }))} /> : <span className="font-black">{fmt(c.base_price)} د.ع</span>}</td>
                      <td className="px-4 py-3">{isEdit ? <input className={inputCls} type="number" value={editBuf.price_per_km} onChange={e => setEditBuf((b: any) => ({ ...b, price_per_km: e.target.value }))} /> : <span className="text-blue-700">{fmt(c.price_per_km)}</span>}</td>
                      <td className="px-4 py-3">{isEdit ? <input className={inputCls} type="number" value={editBuf.worker_cut_pct} onChange={e => setEditBuf((b: any) => ({ ...b, worker_cut_pct: e.target.value }))} /> : <span className="text-purple-700 font-bold">{c.worker_cut_pct}%</span>}</td>
                      <td className="px-4 py-3">{isEdit ? <input className={inputCls} type="number" value={editBuf.urgent_fee} onChange={e => setEditBuf((b: any) => ({ ...b, urgent_fee: e.target.value }))} /> : <span className="text-orange-600">{fmt(c.urgent_fee)}</span>}</td>
                      <td className="px-4 py-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-black">{margin.toFixed(1)}%</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          {isEdit ? (
                            <><button onClick={() => saveConfig(c.id)} className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center hover:bg-emerald-200"><Check size={13} /></button><button onClick={() => setEditId(null)} className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center"><X size={13} /></button></>
                          ) : (
                            <><button onClick={() => { setEditId(c.id); setEditBuf({ base_price: c.base_price, price_per_km: c.price_per_km, worker_cut_pct: c.worker_cut_pct, urgent_fee: c.urgent_fee }); }} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100"><Edit3 size={13} /></button><button onClick={() => delConfig(c.id)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100"><Trash2 size={13} /></button></>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ TAB 2: PEAK HOURS ════════════════════════════════════════════ */}
      {tab === 'peak' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setShowSForm(v => !v)} className={btnCls}><Plus size={15} />إضافة قاعدة ذروة</button>
            <p className="text-xs text-slate-400">الذروة تضرب السعر × المعامل في الأوقات المحددة</p>
          </div>

          {showSForm && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-orange-900 text-sm">قاعدة وقت الذروة</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">التسمية *</label>
                  <input className={inputCls} placeholder="ذروة المساء" value={newS.label} onChange={e => setNewS(p => ({ ...p, label: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">المدينة (فارغ = كل)</label>
                  <select className={inputCls} value={newS.city} onChange={e => setNewS(p => ({ ...p, city: e.target.value }))}>
                    <option value="">كل المدن</option>
                    {IRAQ_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">من ساعة</label>
                  <input className={inputCls} type="number" min="0" max="23" value={newS.hour_from} onChange={e => setNewS(p => ({ ...p, hour_from: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">إلى ساعة</label>
                  <input className={inputCls} type="number" min="0" max="23" value={newS.hour_to} onChange={e => setNewS(p => ({ ...p, hour_to: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">المعامل (× السعر)</label>
                  <input className={inputCls} type="number" step="0.1" min="1" max="3" value={newS.multiplier} onChange={e => setNewS(p => ({ ...p, multiplier: e.target.value }))} />
                </div>
                <div className="col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-slate-500 mb-2 block">أيام الأسبوع (فارغ = كل يوم)</label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((d, i) => (
                      <button key={i} type="button"
                        onClick={() => setNewS(p => ({ ...p, day_of_week: p.day_of_week.includes(i) ? p.day_of_week.filter(x => x !== i) : [...p.day_of_week, i] }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${newS.day_of_week.includes(i) ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {newS.multiplier && (
                <div className="bg-orange-100 rounded-xl px-4 py-2 text-xs text-center font-bold text-orange-800">
                  السعر سيرتفع ×{newS.multiplier} = زيادة {((+newS.multiplier - 1) * 100).toFixed(0)}%
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={addSurge} className="bg-orange-600 text-white rounded-xl px-5 py-2 font-bold text-sm flex items-center gap-2"><Check size={14} />حفظ</button>
                <button onClick={() => setShowSForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {surges.length === 0 && <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl text-sm">لا توجد قواعد ذروة.</div>}
            {surges.map(r => (
              <div key={r.id} className={`bg-white border-2 rounded-2xl p-4 flex items-center justify-between ${r.is_active ? 'border-orange-200' : 'border-slate-100 opacity-50'}`}>
                <div className="flex gap-2">
                  <button onClick={() => toggleSurge(r)} className={`px-3 py-1 rounded-full text-xs font-bold ${r.is_active ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>{r.is_active ? 'مفعّل' : 'معطّل'}</button>
                  <button onClick={() => delSurge(r.id)} className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-800">{r.label}</p>
                  <p className="text-xs text-slate-500">
                    {r.city || 'كل المدن'} · {r.hour_from}:00 - {r.hour_to}:00
                    {r.day_of_week?.length ? ` · ${r.day_of_week.map(d => DAYS[d]).join('، ')}` : ' · كل يوم'}
                  </p>
                </div>
                <span className="text-2xl font-black text-orange-600">×{r.multiplier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ TAB 3: DEMAND SURGE ══════════════════════════════════════════ */}
      {tab === 'demand' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <button onClick={() => setShowDForm(v => !v)} className={btnCls}><Plus size={15} />إضافة إعداد Surge</button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-right">
            <p className="font-black text-red-800 mb-1">🧠 كيف يعمل Surge الديناميكي؟</p>
            <p className="text-red-700">إذا كانت نسبة (عمال متاحون ÷ طلبات نشطة) أقل من العتبة → يرتفع السعر تدريجياً حتى الحد الأقصى</p>
            <p className="text-xs text-red-500 mt-1">مثال: عتبة 30% + حد أقصى ×2 → إذا كان هناك 3 عمال و20 طلب (15%) = السعر يرتفع ×1.7</p>
          </div>

          {showDForm && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">المدينة *</label>
                  <select className={inputCls} value={newD.city} onChange={e => setNewD(p => ({ ...p, city: e.target.value }))}>
                    <option value="">اختر...</option>
                    {IRAQ_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">عتبة الـ Surge (0-1)</label>
                  <input className={inputCls} type="number" step="0.05" min="0.1" max="1" placeholder="0.3" value={newD.surge_threshold_ratio} onChange={e => setNewD(p => ({ ...p, surge_threshold_ratio: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">أقصى معامل</label>
                  <input className={inputCls} type="number" step="0.1" min="1" max="5" placeholder="2.0" value={newD.max_surge_multiplier} onChange={e => setNewD(p => ({ ...p, max_surge_multiplier: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addDemand} className="bg-red-600 text-white rounded-xl px-5 py-2 font-bold text-sm flex items-center gap-2"><Check size={14} />حفظ</button>
                <button onClick={() => setShowDForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {demands.length === 0 && <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl text-sm">لا توجد إعدادات Surge.</div>}
            {demands.map(d => {
              const isEdit = editId === d.id;
              return (
                <div key={d.id} className="bg-white border-2 border-red-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    {isEdit ? (
                      <><button onClick={() => saveDemand(d.id)} className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center"><Check size={13} /></button><button onClick={() => setEditId(null)} className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center"><X size={13} /></button></>
                    ) : (
                      <><button onClick={() => { setEditId(d.id); setEditBuf({ surge_threshold_ratio: d.surge_threshold_ratio, max_surge_multiplier: d.max_surge_multiplier }); }} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Edit3 size={13} /></button><button onClick={() => delDemand(d.id)} className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center"><Trash2 size={13} /></button></>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">{d.city}</p>
                    <div className="text-xs text-slate-500 flex gap-3 justify-end mt-1">
                      {isEdit ? (
                        <><input className="border rounded-lg px-2 py-1 text-xs w-24" type="number" step="0.05" value={editBuf.surge_threshold_ratio} onChange={e => setEditBuf((b: any) => ({ ...b, surge_threshold_ratio: e.target.value }))} /><input className="border rounded-lg px-2 py-1 text-xs w-24" type="number" step="0.1" value={editBuf.max_surge_multiplier} onChange={e => setEditBuf((b: any) => ({ ...b, max_surge_multiplier: e.target.value }))} /></>
                      ) : (
                        <><span>عتبة: <strong>{(d.surge_threshold_ratio * 100).toFixed(0)}%</strong></span><span>أقصى: <strong className="text-red-600">×{d.max_surge_multiplier}</strong></span></>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB 4: EXTRAS ════════════════════════════════════════════════ */}
      {tab === 'extras' && (
        <div className="space-y-4">
          <button onClick={() => setShowEForm(v => !v)} className={btnCls}><Plus size={15} />إضافة رسم إضافي</button>

          {showEForm && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">الخدمة *</label>
                  <select className={inputCls} value={newE.service_id} onChange={e => setNewE(p => ({ ...p, service_id: e.target.value }))}>
                    <option value="">اختر...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">مفتاح الحقل *</label>
                  <input className={inputCls} placeholder="rooms_count / extras" value={newE.option_key} onChange={e => setNewE(p => ({ ...p, option_key: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">قيمة الخيار</label>
                  <input className={inputCls} placeholder="سجاد / شرفة / (فارغ=stepper)" value={newE.option_value} onChange={e => setNewE(p => ({ ...p, option_value: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">الرسم (د.ع) *</label>
                  <input className={inputCls} type="number" placeholder="5000" value={newE.extra_fee} onChange={e => setNewE(p => ({ ...p, extra_fee: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">التسمية</label>
                  <input className={inputCls} placeholder="كل غرفة إضافية" value={newE.label_ar} onChange={e => setNewE(p => ({ ...p, label_ar: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addExtra} className="bg-purple-600 text-white rounded-xl px-5 py-2 font-bold text-sm flex items-center gap-2"><Check size={14} />حفظ</button>
                <button onClick={() => setShowEForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b text-xs font-black text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">الخدمة</th>
                  <th className="px-4 py-3 text-right">الحقل</th>
                  <th className="px-4 py-3 text-right">الخيار</th>
                  <th className="px-4 py-3 text-right">التسمية</th>
                  <th className="px-4 py-3 text-right text-purple-700">الرسم</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extras.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">لا توجد رسوم إضافية.</td></tr>}
                {extras.map(e => {
                  const isEdit = editId === e.id;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-xs">{svcName(e.service_id)}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{e.option_key}</span></td>
                      <td className="px-4 py-3">{e.option_value ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{e.option_value}</span> : <span className="text-slate-400 text-xs">لكل وحدة</span>}</td>
                      <td className="px-4 py-3">{isEdit ? <input className={inputCls} value={editBuf.label_ar} onChange={ev => setEditBuf((b: any) => ({ ...b, label_ar: ev.target.value }))} /> : <span className="text-xs text-slate-600">{e.label_ar || '—'}</span>}</td>
                      <td className="px-4 py-3">{isEdit ? <input className={inputCls} type="number" value={editBuf.extra_fee} onChange={ev => setEditBuf((b: any) => ({ ...b, extra_fee: ev.target.value }))} /> : <span className="font-black text-purple-700">+{fmt(e.extra_fee)} د.ع</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          {isEdit ? (
                            <><button onClick={() => saveExtra(e.id)} className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center"><Check size={13} /></button><button onClick={() => setEditId(null)} className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center"><X size={13} /></button></>
                          ) : (
                            <><button onClick={() => { setEditId(e.id); setEditBuf({ extra_fee: e.extra_fee, label_ar: e.label_ar }); }} className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Edit3 size={13} /></button><button onClick={() => delExtra(e.id)} className="w-7 h-7 bg-red-50 text-red-400 rounded-lg flex items-center justify-center"><Trash2 size={13} /></button></>
                          )}
                        </div>
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
