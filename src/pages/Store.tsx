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
 <div className="space-y-6 dir-rtl">
 {/* Header */}
 <div className="flex justify-between items-center mb-8">
 <div>
 <h1 className="text-3xl font-bold text-slate-800 ">المتجر والمخزون</h1>
 <p className="text-slate-500 mt-1 font-medium">إدارة قطع الغيار، تسعيرها، ومراقبة المبيعات.</p>
 </div>
 <button 
 onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
 className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-2"
 >
 <Plus size={20} />
 <span>إضافة منتج جديد</span>
 </button>
 </div>

 {/* Analytics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
 <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-40 border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border flex items-center justify-center">
 <Package size={24} className="text-primary " />
 </div>
 <p className="text-base font-bold text-slate-600 ">إجمالي المنتجات</p>
 </div>
 <p className="text-4xl font-black text-slate-800 mt-4">{stats.totalProducts}</p>
 </div>

 <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-40 border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all">
 <div className="flex items-center gap-4 relative">
 <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
 <AlertTriangle size={24} className="text-amber-500 text-amber-600 " />
 </div>
 <p className="text-base font-bold text-slate-600 ">قاربت على النفاذ</p>
 </div>
 <div className="flex items-baseline gap-2 mt-4">
 <p className="text-4xl font-black text-slate-800 ">{stats.lowStock}</p>
 <span className="text-sm font-medium text-slate-500">منتجات</span>
 </div>
 </div>

 <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-40 border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
 <DollarSign size={24} className="text-emerald-600 " />
 </div>
 <p className="text-base font-bold text-slate-600 ">المبيعات الإجمالية</p>
 </div>
 <p className="text-3xl font-black text-slate-800 mt-4">{stats.totalSalesValue.toLocaleString('en-US')} <span className="text-xl">د.ع</span></p>
 </div>
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
