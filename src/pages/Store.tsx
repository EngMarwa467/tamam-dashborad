import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
 Plus,
 Search,
 Package,
 Edit2,
 Trash2,
 AlertTriangle,
 Image as ImageIcon,
 DollarSign
} from 'lucide-react';
import ProductModal from '../components/ProductModal';

export default function Store() {
 const [parts, setParts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 
 // Modal State
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingProduct, setEditingProduct] = useState<any>(null);
 
 // Analytics State
 const [stats, setStats] = useState({
 totalProducts: 0,
 lowStock: 0,
 totalSalesValue: 0
 });

 useEffect(() => {
 fetchParts();
 }, []);

 const fetchParts = async () => {
 try {
 setLoading(true);
 const { data, error } = await supabase
 .from('spare_parts')
 .select('*')
 .order('created_at', { ascending: false });

 if (error) throw error;
 
 const fetchedParts = data || [];
 setParts(fetchedParts);
 
 const { data: salesData } = await supabase
 .from('request_spare_parts')
 .select('price_at_time, quantity');
 
 const totalSales = (salesData || []).reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0);

 // Calculate basic stats
 setStats({
 totalProducts: fetchedParts.length,
 lowStock: fetchedParts.filter(p => !p.stock_quantity || p.stock_quantity < 5).length,
 totalSalesValue: totalSales
 });

 } catch (error) {
 console.error('Error fetching parts:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (id: string, name: string) => {
 if (!window.confirm(`هل أنت متأكد من حذف المنتج "${name}" نهائياً؟`)) return;

 try {
 const { error } = await supabase
 .from('spare_parts')
 .delete()
 .eq('id', id);

 if (error) throw error;
 
 // Update local state without refetching for speed
 setParts(parts.filter(p => p.id !== id));
 
 } catch (error: any) {
 alert(error.message || 'حدث خطأ أثناء الحذف');
 console.error('Error deleting part:', error);
 }
 };

 const filteredParts = parts.filter(p => 
 p.name?.toLowerCase().includes(search.toLowerCase()) || 
 p.category?.toLowerCase().includes(search.toLowerCase())
 );

 return (
  <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">

    {/* ── Hero Strip ── */}
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-sky-500 to-blue-700 px-8 py-8 shadow-xl shadow-sky-200/40">
      <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />
      <div className="absolute bottom-0 right-1/3 w-28 h-28 bg-cyan-300/20 rounded-full translate-y-1/2" />
      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-sky-100 text-xs font-bold">📦 قطع الغيار</span>
          <h1 className="text-3xl font-black text-white mt-1">المتجر والمخزون</h1>
          <p className="text-sky-100/80 mt-1 text-sm">إدارة قطع الغيار، تسعيرها، ومراقبة المبيعات</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-white text-sky-600 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-sky-50 transition-all shadow-lg flex-shrink-0">
          <Plus size={18} /> إضافة منتج جديد
        </button>
      </div>
    </div>

    {/* ── KPI Cards ── */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[
        { title: 'إجمالي المنتجات', value: stats.totalProducts,                                         from: 'from-blue-500',    to: 'to-indigo-600',  light: 'bg-blue-50',    text: 'text-blue-600',    icon: Package        },
        { title: 'قاربت على النفاذ',  value: stats.lowStock,                                             from: 'from-amber-500',   to: 'to-orange-500',  light: 'bg-amber-50',   text: 'text-amber-600',   icon: AlertTriangle  },
        { title: 'المبيعات الإجمالية', value: `${stats.totalSalesValue.toLocaleString('en-US')} د.ع`,   from: 'from-emerald-500', to: 'to-teal-600',    light: 'bg-emerald-50', text: 'text-emerald-600', icon: DollarSign     },
      ].map((k, i) => (
        <div key={i} className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden p-6">
          <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${k.from} ${k.to}`} />
          <div className={`w-12 h-12 rounded-2xl ${k.light} flex items-center justify-center mb-4`}>
            <k.icon size={22} className={k.text} />
          </div>
          <p className="text-xs font-bold text-slate-400">{k.title}</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{loading ? '...' : k.value}</p>
        </div>
      ))}
    </div>

 {/* Main Content */}
 <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col relative z-20 mb-4">
 
 {/* Glow behind table */}
 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none -z-10" />

 {/* Search Bar */}
 <div className="p-6 border-b border-slate-200 flex flex-col relative z-10">
 <div className="relative w-full md:w-96">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
 <input
 type="text"
 placeholder="ابحث باسم القطعة، التصنيف..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800 shadow-lg shadow-sm transition-all"
 />
 </div>
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-right text-sm relative z-10">
 <thead className="bg-white text-slate-500 border-b border-slate-200 ">
 <tr>
 <th className="px-6 py-5 font-bold">المنتج وصورته</th>
 <th className="px-6 py-5 font-bold">التصنيف</th>
 <th className="px-6 py-5 font-bold">السعر للعميل</th>
 <th className="px-6 py-5 font-bold text-center">المخزون المتوفر</th>
 <th className="px-6 py-5 font-bold text-center">الحالة</th>
 <th className="px-6 py-5 font-bold text-center">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y text-slate-700 divide-white/40 ">
 {loading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-muted-foreground">
 جاري تحميل المنتجات...
 </td>
 </tr>
 ) : filteredParts.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
 <Package size={48} className="mb-4 opacity-20" />
 <p>لا توجد منتجات مسجلة في المتجر حتى الآن.</p>
 </td>
 </tr>
 ) : (
 filteredParts.map((part) => (
 <tr key={part.id} className="hover:bg-slate-50 transition-colors">
 <td className="py-4 px-6">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 ">
 {part.image_url ? (
 <img src={part.image_url} alt={part.name} className="w-full h-full object-cover" />
 ) : (
 <ImageIcon size={24} className="text-slate-400 opacity-50" />
 )}
 </div>
 <div>
 <div className="font-bold text-slate-800 text-base max-w-[200px] truncate">{part.name}</div>
 {part.description && <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">{part.description}</div>}
 </div>
 </div>
 </td>
 <td className="py-4 px-6">
 <span className="bg-secondary text-foreground px-2 py-1 rounded-md text-sm">
 {part.category || 'عام'}
 </span>
 </td>
 <td className="py-4 px-6">
 <p className="font-bold text-emerald-600">{part.price?.toLocaleString('en-US') || 0} د.ع</p>
 </td>
 <td className="py-4 px-6 text-center">
 {(!part.stock_quantity || part.stock_quantity < 5) ? (
 <span className="text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded-md text-sm flex items-center justify-center gap-1 w-max mx-auto">
 <AlertTriangle size={14} />
 {part.stock_quantity || 0}
 </span>
 ) : (
 <span className="font-bold">{part.stock_quantity}</span>
 )}
 </td>
 <td className="py-4 px-6 text-center">
 {part.is_active ? (
 <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">متاح</span>
 ) : (
 <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-bold">مخفي</span>
 )}
 </td>
 <td className="py-4 px-6">
 <div className="flex items-center justify-end gap-2">
 <button 
 onClick={() => { setEditingProduct(part); setIsModalOpen(true); }}
 className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
 >
 <Edit2 size={18} />
 </button>
 <button 
 onClick={() => handleDelete(part.id, part.name)}
 className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
 >
 <Trash2 size={18} />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 <ProductModal 
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 editingProduct={editingProduct}
 onSuccess={fetchParts}
 />
 </div>
 );
}
