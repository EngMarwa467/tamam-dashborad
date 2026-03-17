import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, DollarSign, Plus, Trash2, Edit3, Check, X, Tag, Info } from 'lucide-react';
import { IRAQ_GOVERNORATES } from '../data/iraqLocations';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Zone      { id: string; name_ar: string; city: string; district: string; is_active: boolean; }
interface Service   { id: string; name_ar: string; base_price: number; }
interface Pricing   { id: string; zone_id: string; service_id: string; customer_price: number; worker_earning: number; urgent_fee: number; }
interface FieldExtra{ id: string; service_id: string; field_key: string; option_value: string | null; extra_price: number; label_ar: string; }

type Tab = 'zones' | 'pricing' | 'extras';

const fmt = (n: number) => (n ?? 0).toLocaleString('en-US') + ' د.ع';
const inputCls = 'border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white text-slate-800 w-full';

// ─── New Zone Form ─────────────────────────────────────────────────────────────
function ZoneForm({ onSave, onCancel }: { onSave: (z: any) => void; onCancel: () => void }) {
  const [gov,       setGov]       = useState('');
  const [district,  setDistrict]  = useState('');
  const [centerLat, setCenterLat] = useState('');
  const [centerLng, setCenterLng] = useState('');
  const [radius,    setRadius]    = useState('5');

  const govObj    = IRAQ_GOVERNORATES.find(g => g.label === gov);
  const districts = govObj?.districts ?? [];

  const handleSave = () => {
    if (!gov) return;
    const districtObj = districts.find(d => d.label === district);
    const name_ar = district ? `${gov} - ${district}` : gov;
    const city    = govObj!.city;
    onSave({
      name_ar, city,
      district: districtObj?.label ?? '',
      center_lat: centerLat ? +centerLat : null,
      center_lng: centerLng ? +centerLng : null,
      radius_km:  radius ? +radius : 5,
    });
  };

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4" dir="rtl">
      <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2"><MapPin size={14} />إضافة منطقة تسعير</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Country — fixed */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">الدولة</label>
          <div className={inputCls + ' bg-slate-50 text-slate-500 cursor-not-allowed'}>🇮🇶 العراق</div>
        </div>

        {/* Governorate */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">المحافظة *</label>
          <select className={inputCls} value={gov} onChange={e => { setGov(e.target.value); setDistrict(''); }}>
            <option value="">اختر المحافظة...</option>
            {IRAQ_GOVERNORATES.map(g => <option key={g.city} value={g.label}>{g.label}</option>)}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1 block">المنطقة / الحي</label>
          <select className={inputCls} value={district} onChange={e => setDistrict(e.target.value)} disabled={!gov}>
            <option value="">المحافظة كاملة</option>
            {districts.map(d => <option key={d.label} value={d.label}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {/* Geo Center */}
      <div className="border-t border-emerald-200 pt-3">
        <p className="text-xs font-black text-emerald-800 mb-2 flex items-center gap-1">
          📍 نقطة المركز الجغرافية
          <span className="font-normal text-emerald-600">(اختياري — يحسّن دقة المطابقة تلقائياً)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">خط العرض (Lat)</label>
            <input className={inputCls} type="number" step="any" placeholder="33.3152" value={centerLat} onChange={e => setCenterLat(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">خط الطول (Lng)</label>
            <input className={inputCls} type="number" step="any" placeholder="44.3661" value={centerLng} onChange={e => setCenterLng(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">نطاق التغطية (كم)</label>
            <input className={inputCls} type="number" min="1" max="100" placeholder="5" value={radius} onChange={e => setRadius(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-emerald-600 mt-1.5">
          💡 ابحث عن إحداثيات الحي في Google Maps وضعها هنا للمطابقة الجغرافية الدقيقة
        </p>
      </div>

      {gov && (
        <div className="bg-white border border-emerald-100 rounded-xl px-4 py-2 text-sm text-emerald-800 font-bold">
          📍 سيُحفظ باسم: <span className="text-primary">{district ? `${gov} - ${district}` : gov}</span>
          {centerLat && centerLng && <span className="text-xs text-emerald-500 mr-2">· نطاق {radius} كم</span>}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={!gov}
          className="bg-emerald-600 text-white rounded-xl px-5 py-2 font-bold flex items-center gap-2 disabled:opacity-40 text-sm">
          <Check size={15} /> حفظ
        </button>
        <button onClick={onCancel} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold flex items-center gap-2 text-sm">
          <X size={15} /> إلغاء
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ZonePricing() {
  const [tab,      setTab]      = useState<Tab>('zones');
  const [zones,    setZones]    = useState<Zone[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [pricing,  setPricing]  = useState<Pricing[]>([]);
  const [extras,   setExtras]   = useState<FieldExtra[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showZoneForm,    setShowZoneForm]    = useState(false);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [showExtrasForm,  setShowExtrasForm]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf,   setEditBuf]   = useState<any>({});
  const [newP, setNewP] = useState({ zone_id: '', service_id: '', customer_price: '', worker_earning: '', urgent_fee: '10000' });
  const [newE, setNewE] = useState({ service_id: '', field_key: '', option_value: '', extra_price: '', label_ar: '' });
  const [filterZone, setFilterZone] = useState('');
  const [filterSvc,  setFilterSvc]  = useState('');

  const [dbError, setDbError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setDbError(null);
    const [{ data: z, error: ze }, { data: s }, { data: p }, { data: e }] = await Promise.all([
      supabase.from('pricing_zones').select('*').order('name_ar'),
      supabase.from('services').select('id,name_ar,base_price').eq('is_active', true),
      supabase.from('service_pricing').select('*'),
      supabase.from('pricing_field_extras').select('*').order('service_id'),
    ]);
    if (ze) {
      setDbError('⚠️ الجداول غير موجودة في Supabase. شغّل SQL Migration أولاً.');
    }
    setZones(z || []); setServices(s || []); setPricing(p || []); setExtras(e || []);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  // ─── Zone CRUD ───────────────────────────────────────────────────────────────
  const addZone = async (data: any) => {
    const { error } = await supabase.from('pricing_zones').insert({ ...data, is_active: true });
    if (error) { alert('❌ فشل الحفظ: ' + error.message); return; }
    setShowZoneForm(false); fetchAll();
  };
  const toggleZone = async (z: Zone) => {
    await supabase.from('pricing_zones').update({ is_active: !z.is_active }).eq('id', z.id); fetchAll();
  };
  const deleteZone = async (id: string) => {
    if (!confirm('حذف المنطقة؟ سيحذف كل تسعيرها.')) return;
    await supabase.from('pricing_zones').delete().eq('id', id); fetchAll();
  };

  // ─── Pricing CRUD ─────────────────────────────────────────────────────────────
  const addPricing = async () => {
    const { zone_id, service_id, customer_price, worker_earning, urgent_fee } = newP;
    if (!zone_id || !service_id || !customer_price || !worker_earning) return;
    await supabase.from('service_pricing').upsert(
      { zone_id, service_id, customer_price: +customer_price, worker_earning: +worker_earning, urgent_fee: +urgent_fee },
      { onConflict: 'zone_id,service_id' }
    );
    setNewP({ zone_id: '', service_id: '', customer_price: '', worker_earning: '', urgent_fee: '10000' });
    setShowPricingForm(false); fetchAll();
  };
  const savePricing = async (id: string) => {
    await supabase.from('service_pricing').update({
      customer_price: +editBuf.customer_price,
      worker_earning: +editBuf.worker_earning,
      urgent_fee: +editBuf.urgent_fee,
    }).eq('id', id);
    setEditingId(null); fetchAll();
  };
  const deletePricing = async (id: string) => {
    await supabase.from('service_pricing').delete().eq('id', id); fetchAll();
  };

  // ─── Extras CRUD ──────────────────────────────────────────────────────────────
  const addExtra = async () => {
    const { service_id, field_key, option_value, extra_price, label_ar } = newE;
    if (!service_id || !field_key || !extra_price) return;
    await supabase.from('pricing_field_extras').upsert(
      { service_id, field_key, option_value: option_value || null, extra_price: +extra_price, label_ar },
      { onConflict: 'service_id,field_key,option_value' }
    );
    setNewE({ service_id: '', field_key: '', option_value: '', extra_price: '', label_ar: '' });
    setShowExtrasForm(false); fetchAll();
  };
  const saveExtra = async (id: string) => {
    await supabase.from('pricing_field_extras').update({ extra_price: +editBuf.extra_price, label_ar: editBuf.label_ar }).eq('id', id);
    setEditingId(null); fetchAll();
  };
  const deleteExtra = async (id: string) => {
    await supabase.from('pricing_field_extras').delete().eq('id', id); fetchAll();
  };

  // ─── Derived ──────────────────────────────────────────────────────────────────
  const filteredPricing = pricing.filter(p =>
    (!filterZone || p.zone_id === filterZone) &&
    (!filterSvc  || p.service_id === filterSvc)
  );
  const zoneName    = (id: string) => zones.find(z => z.id === id)?.name_ar ?? '—';
  const serviceName = (id: string) => services.find(s => s.id === id)?.name_ar ?? '—';

  const tabCls = (t: Tab) =>
    `py-3 px-5 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`;

  if (loading) return <div className="flex justify-center py-32 text-slate-400 font-medium">جاري التحميل...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-400" dir="rtl">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800">التسعير الديناميكي</h1>
        <p className="text-slate-500 mt-1 text-sm">إدارة مناطق التسعير والأسعار ورسوم الخيارات الإضافية</p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-sm text-blue-800">
        <Info size={18} className="shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-bold mb-1">كيف يعمل؟</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
            <li><strong>أضف منطقة</strong> — مثل "بغداد - الكرادة"</li>
            <li><strong>حدد سعر الخدمة</strong> في تلك المنطقة (سعر العميل + كسب العامل)</li>
            <li><strong>أضف رسوم الإضافات</strong> — مثل كل غرفة إضافية = 5,000 د.ع</li>
          </ol>
          <p className="mt-1.5 font-bold text-blue-900">🏁 يجلب التطبيق السعر تلقائياً بحسب موقع العميل</p>
        </div>
      </div>

      {/* DB Error Banner */}
      {dbError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 text-right">
          <p className="font-black text-red-800 text-base mb-2">{dbError}</p>
          <p className="text-red-700 text-sm font-bold mb-3">شغّل هذا الـ SQL في Supabase SQL Editor:</p>
          <pre className="bg-red-100 rounded-xl p-4 text-xs text-left overflow-x-auto text-slate-800 font-mono leading-relaxed">{`CREATE TABLE pricing_zones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar    text NOT NULL,
  city       text NOT NULL,
  district   text,
  center_lat double precision,
  center_lng double precision,
  radius_km  numeric DEFAULT 5,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES pricing_zones(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  customer_price numeric NOT NULL, worker_earning numeric NOT NULL,
  urgent_fee numeric DEFAULT 10000, is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(zone_id, service_id)
);

CREATE TABLE pricing_field_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  field_key text NOT NULL, option_value text,
  extra_price numeric NOT NULL, label_ar text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(service_id, field_key, option_value)
);

ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES pricing_zones(id);`}</pre>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button className={tabCls('zones')}   onClick={() => setTab('zones')}>
          <MapPin size={13} className="inline ml-1" />المناطق ({zones.length})
        </button>
        <button className={tabCls('pricing')} onClick={() => setTab('pricing')}>
          <DollarSign size={13} className="inline ml-1" />تسعير الخدمات ({pricing.length})
        </button>
        <button className={tabCls('extras')}  onClick={() => setTab('extras')}>
          <Tag size={13} className="inline ml-1" />رسوم الإضافات ({extras.length})
        </button>
      </div>

      {/* ══ TAB: ZONES ══════════════════════════════════════════════ */}
      {tab === 'zones' && (
        <div className="space-y-4">
          <button onClick={() => setShowZoneForm(v => !v)}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition text-sm">
            <Plus size={15} /> إضافة منطقة تسعير
          </button>

          {showZoneForm && <ZoneForm onSave={addZone} onCancel={() => setShowZoneForm(false)} />}

          {zones.length === 0 && !showZoneForm && (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              لا توجد مناطق. أضف منطقة أولاً.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {zones.map(z => (
              <div key={z.id}
                className={`bg-white border-2 rounded-2xl p-5 transition ${z.is_active ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <button onClick={() => toggleZone(z)} title={z.is_active ? 'تعطيل' : 'تفعيل'}
                      className={`px-3 py-1 rounded-full text-xs font-bold ${z.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {z.is_active ? 'مفعّل' : 'معطّل'}
                    </button>
                    <button onClick={() => deleteZone(z.id)}
                      className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">{z.name_ar}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{z.city}</p>
                  </div>
                </div>
                <div className="flex gap-2 text-xs mt-2">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">
                    {pricing.filter(p => p.zone_id === z.id).length} خدمة مسعّرة
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ TAB: PRICING ════════════════════════════════════════════ */}
      {tab === 'pricing' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex gap-2 flex-wrap">
              <select className={inputCls + ' w-auto'} value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                <option value="">كل المناطق</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name_ar}</option>)}
              </select>
              <select className={inputCls + ' w-auto'} value={filterSvc} onChange={e => setFilterSvc(e.target.value)}>
                <option value="">كل الخدمات</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              </select>
            </div>
            <button onClick={() => setShowPricingForm(v => !v)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition text-sm">
              <Plus size={15} /> إضافة سعر
            </button>
          </div>

          {showPricingForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-blue-900 text-sm">تحديد سعر الخدمة في منطقة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">المنطقة *</label>
                  <select className={inputCls} value={newP.zone_id} onChange={e => setNewP(p => ({ ...p, zone_id: e.target.value }))}>
                    <option value="">اختر...</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name_ar}</option>)}
                  </select></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">الخدمة *</label>
                  <select className={inputCls} value={newP.service_id} onChange={e => setNewP(p => ({ ...p, service_id: e.target.value }))}>
                    <option value="">اختر...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name_ar} ({(s.base_price || 0).toLocaleString('en-US')} افتراضي)</option>)}
                  </select></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">سعر العميل (د.ع) *</label>
                  <input className={inputCls} type="number" placeholder="25000" value={newP.customer_price} onChange={e => setNewP(p => ({ ...p, customer_price: e.target.value }))} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">كسب العامل (د.ع) *</label>
                  <input className={inputCls} type="number" placeholder="18000" value={newP.worker_earning} onChange={e => setNewP(p => ({ ...p, worker_earning: e.target.value }))} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">رسوم الصاروخ 🚀 (د.ع)</label>
                  <input className={inputCls} type="number" value={newP.urgent_fee} onChange={e => setNewP(p => ({ ...p, urgent_fee: e.target.value }))} /></div>
                {newP.customer_price && newP.worker_earning && (
                  <div className="flex items-end">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 w-full text-center">
                      <p className="text-xs text-emerald-700 font-bold">هامش التطبيق</p>
                      <p className="font-black text-emerald-800 text-lg">
                        {((+newP.customer_price - +newP.worker_earning) / +newP.customer_price * 100).toFixed(1)}%
                        <span className="text-xs ml-1">({(+newP.customer_price - +newP.worker_earning).toLocaleString('en-US')} د.ع)</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={addPricing} className="bg-blue-600 text-white rounded-xl px-5 py-2 font-bold flex items-center gap-2 text-sm"><Check size={14} />حفظ</button>
                <button onClick={() => setShowPricingForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black">
                <tr>
                  <th className="px-4 py-3 text-right">المنطقة</th>
                  <th className="px-4 py-3 text-right">الخدمة</th>
                  <th className="px-4 py-3 text-right">سعر العميل</th>
                  <th className="px-4 py-3 text-right">كسب العامل</th>
                  <th className="px-4 py-3 text-right text-emerald-700">هامش التطبيق</th>
                  <th className="px-4 py-3 text-right text-orange-500">🚀 صاروخ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPricing.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">لا توجد أسعار مطابقة.</td></tr>
                )}
                {filteredPricing.map(p => {
                  const margin = p.customer_price - p.worker_earning;
                  const pct    = p.customer_price > 0 ? ((margin / p.customer_price) * 100).toFixed(1) : '0';
                  const isEdit = editingId === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800 text-xs">{zoneName(p.zone_id)}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{serviceName(p.service_id)}</td>
                      <td className="px-4 py-3">
                        {isEdit ? <input className={inputCls} type="number" value={editBuf.customer_price} onChange={e => setEditBuf((b: any) => ({ ...b, customer_price: e.target.value }))} />
                          : <span className="font-black text-slate-800">{fmt(p.customer_price)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isEdit ? <input className={inputCls} type="number" value={editBuf.worker_earning} onChange={e => setEditBuf((b: any) => ({ ...b, worker_earning: e.target.value }))} />
                          : <span className="text-purple-700 font-bold">{fmt(p.worker_earning)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg font-black text-xs">
                          {pct}% · {margin.toLocaleString('en-US')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isEdit ? <input className={inputCls} type="number" value={editBuf.urgent_fee} onChange={e => setEditBuf((b: any) => ({ ...b, urgent_fee: e.target.value }))} />
                          : <span className="text-orange-600 font-bold text-xs">{fmt(p.urgent_fee)}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          {isEdit ? (
                            <>
                              <button onClick={() => savePricing(p.id)} className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center hover:bg-emerald-200"><Check size={13} /></button>
                              <button onClick={() => setEditingId(null)} className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center"><X size={13} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingId(p.id); setEditBuf({ customer_price: p.customer_price, worker_earning: p.worker_earning, urgent_fee: p.urgent_fee }); }}
                                className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100"><Edit3 size={13} /></button>
                              <button onClick={() => deletePricing(p.id)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100"><Trash2 size={13} /></button>
                            </>
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

      {/* ══ TAB: EXTRAS ═════════════════════════════════════════════ */}
      {tab === 'extras' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setShowExtrasForm(v => !v)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition text-sm">
              <Plus size={15} /> إضافة رسم إضافي
            </button>
            <span className="text-xs text-slate-500">{extras.length} رسم إضافي مضاف</span>
          </div>

          {showExtrasForm && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-purple-900 text-sm">رسم إضافي على خيار معين</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">الخدمة *</label>
                  <select className={inputCls} value={newE.service_id} onChange={e => setNewE(p => ({ ...p, service_id: e.target.value }))}>
                    <option value="">اختر...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                  </select></div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    مفتاح الحقل * <span className="text-purple-400">(اسمه في النظام)</span>
                  </label>
                  <input className={inputCls} placeholder="rooms_count / extras" value={newE.field_key} onChange={e => setNewE(p => ({ ...p, field_key: e.target.value }))} /></div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">
                    قيمة الخيار <span className="text-purple-400">(للـ chips — فارغ للـ stepper)</span>
                  </label>
                  <input className={inputCls} placeholder="سجاد / شرفة / ..." value={newE.option_value} onChange={e => setNewE(p => ({ ...p, option_value: e.target.value }))} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">الرسم الإضافي (د.ع) *</label>
                  <input className={inputCls} type="number" placeholder="5000" value={newE.extra_price} onChange={e => setNewE(p => ({ ...p, extra_price: e.target.value }))} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">التسمية (للعرض)</label>
                  <input className={inputCls} placeholder="كل غرفة إضافية" value={newE.label_ar} onChange={e => setNewE(p => ({ ...p, label_ar: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addExtra} className="bg-purple-600 text-white rounded-xl px-5 py-2 font-bold flex items-center gap-2 text-sm"><Check size={14} />حفظ</button>
                <button onClick={() => setShowExtrasForm(false)} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-2"><X size={14} />إلغاء</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black">
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
                {extras.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">لا توجد رسوم. ابدأ بإضافة رسم.</td></tr>
                )}
                {extras.map(e => {
                  const isEdit = editingId === e.id;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800 text-xs">{serviceName(e.service_id)}</td>
                      <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{e.field_key}</span></td>
                      <td className="px-4 py-3">
                        {e.option_value
                          ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{e.option_value}</span>
                          : <span className="text-slate-400 text-xs">لكل وحدة (stepper)</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isEdit ? <input className={inputCls} value={editBuf.label_ar} onChange={ev => setEditBuf((b: any) => ({ ...b, label_ar: ev.target.value }))} />
                          : <span className="text-slate-600 text-xs">{e.label_ar || '—'}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isEdit ? <input className={inputCls} type="number" value={editBuf.extra_price} onChange={ev => setEditBuf((b: any) => ({ ...b, extra_price: ev.target.value }))} />
                          : <span className="font-black text-purple-700">+{(e.extra_price || 0).toLocaleString('en-US')} د.ع</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 justify-end">
                          {isEdit ? (
                            <>
                              <button onClick={() => saveExtra(e.id)} className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center hover:bg-emerald-200"><Check size={13} /></button>
                              <button onClick={() => setEditingId(null)} className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center"><X size={13} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingId(e.id); setEditBuf({ extra_price: e.extra_price, label_ar: e.label_ar }); }}
                                className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100"><Edit3 size={13} /></button>
                              <button onClick={() => deleteExtra(e.id)} className="w-7 h-7 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-100"><Trash2 size={13} /></button>
                            </>
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
