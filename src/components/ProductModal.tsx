import { useState, useEffect } from 'react';
import { X, Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSuccess: () => void;
 editingProduct?: any | null;
}

export default function ProductModal({ isOpen, onClose, onSuccess, editingProduct }: ProductModalProps) {
 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
 name: '',
 description: '',
 category: '',
 price: '',
 stock_quantity: '',
 image_url: '',
 is_active: true
 });

 useEffect(() => {
 if (editingProduct) {
 setFormData({
 name: editingProduct.name || '',
 description: editingProduct.description || '',
 category: editingProduct.category || '',
 price: editingProduct.price?.toString() || '',
 stock_quantity: editingProduct.stock_quantity?.toString() || '',
 image_url: editingProduct.image_url || '',
 is_active: editingProduct.is_active ?? true
 });
 } else {
 setFormData({
 name: '', description: '', category: '', price: '', stock_quantity: '', image_url: '', is_active: true
 });
 }
 }, [editingProduct, isOpen]);

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 const payload = {
 name: formData.name,
 description: formData.description,
 category: formData.category,
 price: parseFloat(formData.price) || 0,
 stock_quantity: parseInt(formData.stock_quantity) || 0,
 image_url: formData.image_url,
 is_active: formData.is_active
 };

 if (editingProduct) {
 // Update
 const { error } = await supabase
 .from('spare_parts')
 .update(payload)
 .eq('id', editingProduct.id);
 if (error) throw error;
 } else {
 // Insert
 const { error } = await supabase
 .from('spare_parts')
 .insert([payload]);
 if (error) throw error;
 }

 onSuccess();
 onClose();
 } catch (error: any) {
 alert(error.message || 'حدث خطأ أثناء الحفظ');
 console.error(error);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 dir-rtl">
 <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 font-sans border border-slate-200 ">
 
 {/* Decorative Top Glow */}
 <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500 opacity-80" />
 
 {/* Header */}
 <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 relative z-10">
 <h2 className="text-2xl font-black bg-primary">
 {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
 </h2>
 <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-destructive hover:text-white shadow-sm border border-slate-200 transition-all text-slate-500 mr-4">
 <X size={20} />
 </button>
 </div>

 {/* Form Body */}
 <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
 
 {/* Image Preview / URL Input */}
 <div className="col-span-1 md:col-span-2 flex gap-6 items-center bg-secondary/20 p-4 rounded-xl border border-border">
 <div className="w-24 h-24 rounded-bl bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
 {formData.image_url ? (
 <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
 ) : (
 <ImageIcon size={32} className="text-muted-foreground opacity-50" />
 )}
 </div>
 <div className="flex-1">
 <label className="block text-sm font-bold text-muted-foreground mb-2">رابط صورة المنتج (URL)</label>
 <input
 type="url"
 value={formData.image_url}
 onChange={(e) => setFormData({...formData, image_url: e.target.value})}
 placeholder="https://example.com/image.jpg"
 className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 text-left dir-ltr placeholder-right"
 />
 </div>
 </div>

 {/* Basic Info */}
 <div className="col-span-1 md:col-span-2">
 <label className="block text-sm font-bold text-muted-foreground mb-2">اسم القطعة <span className="text-destructive">*</span></label>
 <input
 required
 type="text"
 value={formData.name}
 onChange={(e) => setFormData({...formData, name: e.target.value})}
 placeholder="مثال: مفتاح قاطع كهربائي مزدوج"
 className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50"
 />
 </div>

 <div className="col-span-1 md:col-span-2">
 <label className="block text-sm font-bold text-muted-foreground mb-2">وصف تنفيذي (اختياري)</label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({...formData, description: e.target.value})}
 placeholder="وصف تفصيلي للقطعة يُسهّل على الفني معرفة استخدامها..."
 className="w-full p-3 bg-background border border-border rounded-xl h-24 resize-none focus:ring-2 focus:ring-primary/50"
 />
 </div>

 <div>
 <label className="block text-sm font-bold text-muted-foreground mb-2">التصنيف</label>
 <select
 value={formData.category}
 onChange={(e) => setFormData({...formData, category: e.target.value})}
 className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50"
 >
 <option value="">اختر التصنيف...</option>
 <option value="كهرباء">كهرباء</option>
 <option value="سباكة">سباكة</option>
 <option value="تكييف">تكييف ومخارج</option>
 <option value="مواد بناء">مواد بناء</option>
 <option value="أخرى">أخرى</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-bold text-muted-foreground mb-2">الكمية في المخزون (الرصيد)</label>
 <input
 type="number"
 min="0"
 value={formData.stock_quantity}
 onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
 className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 text-left dir-ltr"
 />
 </div>

 <div className="col-span-1 md:col-span-2">
 <label className="block text-sm font-bold text-emerald-700 mb-2">سعر المبيع للعميل (د.ع) <span className="text-destructive">*</span></label>
 <input
 required
 type="number"
 min="0"
 value={formData.price}
 onChange={(e) => setFormData({...formData, price: e.target.value})}
 className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-left dir-ltr font-bold text-emerald-900"
 />
 </div>

 <div className="col-span-1 md:col-span-2 pt-4 border-t border-border flex items-center justify-between">
 <div>
 <p className="font-bold text-foreground">تفعيل المنتج بالكُتالوج؟</p>
 <p className="text-xs text-muted-foreground mt-1">إذا تم الإيقاف، لن يظهر للفنيين أثناء الفوترة للعميل.</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input 
 type="checkbox" 
 className="sr-only peer" 
 checked={formData.is_active}
 onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
 />
 <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x[-100%] peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
 </label>
 </div>

 </div>

 {/* Footer actions */}
 <div className="flex justify-end gap-3 pt-6 pb-2 sticky bottom-0 bg-white border-t border-slate-200 mt-6 relative z-10">
 <button
 type="button"
 onClick={onClose}
 disabled={loading}
 className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
 >
 إلغاء
 </button>
 <button
 type="submit"
 disabled={loading}
 className="px-8 py-3 rounded-2xl font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:-translate-y-0.5 flex items-center gap-2"
 >
 {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
 <span>{editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
 </button>
 </div>

 </form>
 </div>
 </div>
 );
}
