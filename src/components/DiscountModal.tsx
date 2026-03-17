import { useState } from 'react';
import { X, Percent, Banknote } from 'lucide-react';

interface Props {
 discount?: any;
 onClose: () => void;
 onSave: () => void;
}

export default function DiscountModal({ discount, onClose, onSave }: Props) {
 const [form, setForm] = useState({
  code: discount?.code || '',
  discount_type: discount?.discount_type || 'percentage',
  discount_value: discount?.discount_value || '',
  max_uses: discount?.max_uses || '',
  min_order_amount: discount?.min_order_amount || '',
  expires_at: discount?.expires_at ? new Date(discount.expires_at).toISOString().split('T')[0] : '',
  is_active: discount?.is_active ?? true,
 });
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');

 const isEditing = !!discount;

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (!form.code.trim()) return setError('يرجى إدخال كود الخصم');
  if (!form.discount_value || Number(form.discount_value) <= 0) return setError('يرجى إدخال قيمة خصم صحيحة');
  if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) return setError('النسبة لا يمكن أن تتجاوز 100%');

  setSaving(true);
  try {
   const { supabase } = await import('../lib/supabase');
   const payload = {
    code: form.code.trim().toUpperCase(),
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    max_uses: form.max_uses ? Number(form.max_uses) : null,
    min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
    expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    is_active: form.is_active,
   };

   if (isEditing) {
    const { error: err } = await supabase.from('discount_codes').update(payload).eq('id', discount.id);
    if (err) throw err;
   } else {
    const { error: err } = await supabase.from('discount_codes').insert(payload);
    if (err) throw err;
   }

   onSave();
   onClose();
  } catch (err: any) {
   setError(err.message || 'حدث خطأ');
  } finally {
   setSaving(false);
  }
 };

 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200" onClick={onClose}>
  <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">
   
   {/* Header */}
   <div className="p-5 border-b border-slate-200 bg-gradient-to-l from-emerald-50 to-white flex justify-between items-center">
   <h2 className="text-lg font-black text-slate-800">{isEditing ? 'تعديل كود الخصم' : 'إضافة كود خصم جديد'}</h2>
   <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
    <X size={20} className="text-slate-500" />
   </button>
   </div>

   {/* Form */}
   <form onSubmit={handleSubmit} className="p-5 space-y-4">
   
   {error && (
    <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl p-3">{error}</div>
   )}

   {/* Code */}
   <div>
    <label className="text-xs font-bold text-slate-600 mb-1.5 block">كود الخصم</label>
    <input
    type="text"
    value={form.code}
    onChange={e => setForm({ ...form, code: e.target.value })}
    placeholder="مثال: WELCOME50"
    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase tracking-widest"
    />
   </div>

   {/* Type + Value */}
   <div className="grid grid-cols-2 gap-3">
    <div>
    <label className="text-xs font-bold text-slate-600 mb-1.5 block">نوع الخصم</label>
    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
     <button type="button" onClick={() => setForm({ ...form, discount_type: 'percentage' })}
     className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${form.discount_type === 'percentage' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}>
     <Percent size={12} /> نسبة
     </button>
     <button type="button" onClick={() => setForm({ ...form, discount_type: 'fixed' })}
     className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${form.discount_type === 'fixed' ? 'bg-primary text-white shadow-sm' : 'text-slate-500'}`}>
     <Banknote size={12} /> ثابت
     </button>
    </div>
    </div>
    <div>
    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
     القيمة {form.discount_type === 'percentage' ? '(%)' : '(د.ع)'}
    </label>
    <input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })}
     placeholder={form.discount_type === 'percentage' ? '25' : '5000'}
     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
    </div>
   </div>

   {/* Max Uses + Min Amount */}
   <div className="grid grid-cols-2 gap-3">
    <div>
    <label className="text-xs font-bold text-slate-600 mb-1.5 block">الحد الأقصى للاستخدام</label>
    <input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })}
     placeholder="غير محدود" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
    </div>
    <div>
    <label className="text-xs font-bold text-slate-600 mb-1.5 block">الحد الأدنى للطلب (د.ع)</label>
    <input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: e.target.value })}
     placeholder="0" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
    </div>
   </div>

   {/* Expiry */}
   <div>
    <label className="text-xs font-bold text-slate-600 mb-1.5 block">تاريخ الانتهاء (اختياري)</label>
    <input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })}
    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
   </div>

   {/* Active Toggle */}
   <label className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
    className="w-4 h-4 rounded accent-primary" />
    <span className="text-sm font-bold text-slate-700">الكود نشط ومفعّل</span>
   </label>

   {/* Submit */}
   <button type="submit" disabled={saving}
    className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md shadow-primary/20">
    {saving ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إنشاء الكوبون'}
   </button>
   </form>
  </div>
  </div>
 );
}
