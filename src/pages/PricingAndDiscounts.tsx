import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Percent, Tag, Users, Plus, Search, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import DiscountModal from '../components/DiscountModal';

const PricingAndDiscounts = () => {
 const [discounts, setDiscounts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [showModal, setShowModal] = useState(false);
 const [editingDiscount, setEditingDiscount] = useState<any>(null);
 const [stats, setStats] = useState({ active: 0, totalUsed: 0, totalAmount: 0 });

 useEffect(() => { fetchDiscounts(); }, []);

 const fetchDiscounts = async () => {
  setLoading(true);
  try {
  const [{ data: codes }, { data: usage }] = await Promise.all([
   supabase.from('discount_codes').select('*').order('created_at', { ascending: false }),
   supabase.from('discount_usage').select('discount_amount'),
  ]);

  setDiscounts(codes || []);
  const activeCodes = (codes || []).filter(c => c.is_active);
  const totalUsed = (codes || []).reduce((s, c) => s + (c.used_count || 0), 0);
  const totalAmount = (usage || []).reduce((s, u) => s + (u.discount_amount || 0), 0);
  setStats({ active: activeCodes.length, totalUsed, totalAmount });
  } catch {}
  finally { setLoading(false); }
 };

 const toggleActive = async (id: string, current: boolean) => {
  await supabase.from('discount_codes').update({ is_active: !current }).eq('id', id);
  fetchDiscounts();
 };

 const deleteDiscount = async (id: string, code: string) => {
  if (!window.confirm(`هل أنت متأكد من حذف الكوبون "${code}"؟`)) return;
  await supabase.from('discount_codes').delete().eq('id', id);
  fetchDiscounts();
 };

 const filtered = discounts.filter(d =>
  d.code?.toLowerCase().includes(search.toLowerCase())
 );

 const isExpired = (d: any) => d.expires_at && new Date(d.expires_at) < new Date();
 const isMaxed = (d: any) => d.max_uses && d.used_count >= d.max_uses;

 const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
   <Icon size={22} />
  </div>
  <div>
   <p className="text-xs font-bold text-slate-400">{title}</p>
   <p className="text-2xl font-black text-slate-800 mt-0.5">{loading ? '...' : value}</p>
   {sub && <p className="text-[10px] text-slate-400 font-bold">{sub}</p>}
  </div>
  </div>
 );

 return (
  <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">

    {/* ── Hero Strip ── */}
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-rose-500 to-orange-600 px-8 py-8 shadow-xl shadow-rose-200/40">
      <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-yellow-400/20 rounded-full translate-y-1/2" />
      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-rose-100 text-xs font-bold">🏷️ أكواد الخصم</span>
          <h1 className="text-3xl font-black text-white mt-1">إدارة الخصومات</h1>
          <p className="text-rose-100/80 mt-1 text-sm">إنشاء وإدارة أكواد الخصم والكوبونات</p>
        </div>
        <button onClick={() => { setEditingDiscount(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-white text-rose-600 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-rose-50 transition-all shadow-lg flex-shrink-0">
          <Plus size={18} /> إضافة كود خصم
        </button>
      </div>
    </div>

    {/* ── KPI Cards ── */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { title: 'الكوبونات النشطة',   value: stats.active,                                            from: 'from-emerald-500', to: 'to-teal-600',   light: 'bg-emerald-50', text: 'text-emerald-600', icon: Percent },
        { title: 'مرات الاستخدام',     value: stats.totalUsed,                                         from: 'from-blue-500',    to: 'to-indigo-600', light: 'bg-blue-50',    text: 'text-blue-600',    icon: Users   },
        { title: 'إجمالي الخصومات د.ع', value: stats.totalAmount.toLocaleString('en-US'),               from: 'from-amber-500',   to: 'to-orange-500', light: 'bg-amber-50',   text: 'text-amber-600',   icon: Tag     },
      ].map((k, i) => (
        <div key={i} className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden p-5">
          <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${k.from} ${k.to}`} />
          <div className={`w-10 h-10 rounded-2xl ${k.light} flex items-center justify-center mb-3`}>
            <k.icon size={18} className={k.text} />
          </div>
          <p className="text-[11px] font-bold text-slate-400">{k.title}</p>
          <p className="text-2xl font-black text-slate-800 mt-0.5">{loading ? '...' : k.value}</p>
        </div>
      ))}
    </div>


  {/* Table */}
  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
   <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
   <h2 className="text-base font-black text-slate-800">قائمة الكوبونات</h2>
   <div className="relative w-full sm:w-64">
    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
    <input type="text" placeholder="ابحث بكود الخصم..." value={search} onChange={e => setSearch(e.target.value)}
    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
   </div>
   </div>

   {loading ? (
   <div className="text-center py-12 text-slate-400 text-sm">جاري التحميل...</div>
   ) : filtered.length === 0 ? (
   <div className="text-center py-12 text-slate-400 text-sm">لا توجد كوبونات {search ? 'مطابقة' : 'بعد'}</div>
   ) : (
   <div className="overflow-x-auto">
    <table className="w-full text-sm">
    <thead>
     <tr className="bg-slate-50 text-slate-500 text-xs font-bold">
     <th className="py-3 px-4 text-right">الكود</th>
     <th className="py-3 px-4 text-right">الخصم</th>
     <th className="py-3 px-4 text-right hidden sm:table-cell">الاستخدام</th>
     <th className="py-3 px-4 text-right hidden md:table-cell">الحد الأدنى</th>
     <th className="py-3 px-4 text-right hidden md:table-cell">الانتهاء</th>
     <th className="py-3 px-4 text-right">الحالة</th>
     <th className="py-3 px-4 text-center">إجراءات</th>
     </tr>
    </thead>
    <tbody>
     {filtered.map(d => {
     const expired = isExpired(d);
     const maxed = isMaxed(d);
     const effectiveActive = d.is_active && !expired && !maxed;
     return (
      <tr key={d.id} className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${!effectiveActive ? 'opacity-60' : ''}`}>
      <td className="py-3 px-4">
       <span className="font-black text-slate-800 tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg text-xs">{d.code}</span>
      </td>
      <td className="py-3 px-4">
       <span className={`font-bold text-xs px-2 py-1 rounded-lg ${d.discount_type === 'percentage' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
       {d.discount_type === 'percentage' ? `${d.discount_value}%` : `${Number(d.discount_value).toLocaleString('en-US')} د.ع`}
       </span>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
       <span className="text-slate-600 font-bold">{d.used_count || 0}</span>
       <span className="text-slate-400 text-xs">/{d.max_uses || '∞'}</span>
      </td>
      <td className="py-3 px-4 hidden md:table-cell text-slate-500 text-xs font-bold">
       {d.min_order_amount > 0 ? `${Number(d.min_order_amount).toLocaleString('en-US')} د.ع` : '—'}
      </td>
      <td className="py-3 px-4 hidden md:table-cell text-xs font-bold">
       {d.expires_at ? (
       <span className={expired ? 'text-red-500' : 'text-slate-500'}>
        {format(new Date(d.expires_at), 'dd MMM yyyy', { locale: arSA })}
        {expired && ' (منتهي)'}
       </span>
       ) : <span className="text-slate-400">بدون</span>}
      </td>
      <td className="py-3 px-4">
       {expired ? (
       <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-md">منتهي</span>
       ) : maxed ? (
       <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">مكتمل</span>
       ) : d.is_active ? (
       <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">نشط</span>
       ) : (
       <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">معطّل</span>
       )}
      </td>
      <td className="py-3 px-4">
       <div className="flex items-center justify-center gap-1">
       <button onClick={() => { setEditingDiscount(d); setShowModal(true); }}
        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
        <Pencil size={14} className="text-blue-500" />
       </button>
       <button onClick={() => toggleActive(d.id, d.is_active)}
        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title={d.is_active ? 'تعطيل' : 'تفعيل'}>
        {d.is_active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
       </button>
       <button onClick={() => deleteDiscount(d.id, d.code)}
        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
        <Trash2 size={14} className="text-red-400" />
       </button>
       </div>
      </td>
      </tr>
     );
     })}
    </tbody>
    </table>
   </div>
   )}
   <div className="p-3 border-t border-slate-100 text-center text-xs text-slate-400 font-bold">
   {filtered.length} كوبون
   </div>
  </div>

  {/* Modal */}
  {showModal && (
   <DiscountModal
   discount={editingDiscount}
   onClose={() => { setShowModal(false); setEditingDiscount(null); }}
   onSave={fetchDiscounts}
   />
  )}
  </div>
 );
};

export default PricingAndDiscounts;
