import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Zap, Droplets, Wind, Hammer, Paintbrush, Wrench, Sparkles, Scissors, PenTool, Monitor } from 'lucide-react';

interface Props {
  service?: any;
  onClose: () => void;
  onSaved: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Zap', icon: Zap, label: 'كهرباء' },
  { name: 'Droplets', icon: Droplets, label: 'سباكة / مياه' },
  { name: 'Wind', icon: Wind, label: 'تكييف / هواء' },
  { name: 'Hammer', icon: Hammer, label: 'نجارة / بناء' },
  { name: 'Paintbrush', icon: Paintbrush, label: 'دهانات / أصباغ' },
  { name: 'Wrench', icon: Wrench, label: 'صيانة عامة / ميكانيكا' },
  { name: 'Sparkles', icon: Sparkles, label: 'تنظيف / تلميع' },
  { name: 'Scissors', icon: Scissors, label: 'قص / تفصيل' },
  { name: 'PenTool', icon: PenTool, label: 'أعمال يدوية / حرف' },
  { name: 'Monitor', icon: Monitor, label: 'إلكترونيات / شاشات' },
];

export default function ServiceModal({ service, onClose, onSaved }: Props) {
  const [nameAr, setNameAr] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [iconName, setIconName] = useState('Zap');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setNameAr(service.name_ar || '');
      setBasePrice(service.base_price?.toString() || '');
      setIconName(service.icon_name || 'Zap');
    }
  }, [service]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !basePrice) return alert('الرجاء إدخال اسم الخدمة والسعر');
    
    setSaving(true);
    try {
      const data = {
        name_ar: nameAr,
        base_price: Number(basePrice),
        icon_name: iconName,
      };

      if (service?.id) {
        // تحديث خدمة قائمة
        const { error } = await supabase.from('services').update(data).eq('id', service.id);
        if (error) throw error;
      } else {
        // إضافة خدمة جديدة
        const { error } = await supabase.from('services').insert({ ...data, is_active: true });
        if (error) throw error;
      }
      
      onSaved();
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm rtl">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-black text-slate-800">
            {service ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم الخدمة (عربي)</label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold text-slate-800"
              placeholder="مثال: صيانة غسالات"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">السعر الأساسي (دينار عراقي)</label>
            <input
              type="number"
              required
              min="0"
              step="500"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold text-slate-800"
              placeholder="مثال: 50000"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">اختر الأيقونة المناسبة</label>
            <div className="grid grid-cols-5 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
              {AVAILABLE_ICONS.map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  title={opt.label}
                  onClick={() => setIconName(opt.name)}
                  className={`p-3 rounded-xl flex items-center justify-center border transition-all ${
                    iconName === opt.name 
                      ? 'border-primary bg-primary/10 text-primary shadow-sm' 
                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <opt.icon size={24} />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-bold text-center">قم باختيار الأيقونة التي تعبر بصرياً عن تخصص هذه الخدمة</p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
            >
              {saving ? 'جاري الحفظ...' : (
                <>
                  <Save size={18} />
                  <span>حفظ الخدمة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
