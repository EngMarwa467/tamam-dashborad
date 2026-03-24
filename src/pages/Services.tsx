import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Settings2, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import ServiceModal from '../components/ServiceModal';

export default function Services() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setServices(data);
    } catch (err: any) {
      alert('خطأ في جلب الخدمات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchServices();
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    }
  };

  const deleteService = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف خدمة "${name}" نهائياً؟`)) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      fetchServices();
    } catch (err: any) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  };

  const getLucideIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.Zap;
  };

  const filtered = services.filter(s => s.name_ar?.toLowerCase().includes(search.toLowerCase()));

  const activeCount = services.filter(s => s.is_active).length;
  const avgPrice = services.length ? Math.round(services.reduce((acc, s) => acc + s.base_price, 0) / services.length) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">

      {/* ── Hero Strip ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-500 to-teal-600 px-8 py-8 shadow-xl shadow-emerald-200/40">
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 right-1/3 w-28 h-28 bg-blue-400/20 rounded-full translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-emerald-100 text-xs font-bold">⚙️ كتالوج الخدمات</span>
            <h1 className="text-3xl font-black text-white mt-1">إدارة الخدمات</h1>
            <p className="text-emerald-100/80 mt-1 text-sm">أضف أو عدل الخدمات التي يقدمها تطبيق تمام</p>
          </div>
          <button
            onClick={() => { setSelectedService(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-white text-emerald-600 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-emerald-900/10 flex-shrink-0">
            <Plus size={18} /> إضافة خدمة جديدة
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'إجمالي الخدمات', value: services.length, from: 'from-blue-500', to: 'to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600' },
          { title: 'الخدمات النشطة', value: activeCount, from: 'from-emerald-500', to: 'to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
          { title: 'متوسط الأسعار', value: `${avgPrice.toLocaleString('en-US')} د.ع`, from: 'from-violet-500', to: 'to-purple-600', light: 'bg-violet-50', text: 'text-violet-600' },
        ].map((k, i) => (
          <div key={i} className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden p-5">
            <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${k.from} ${k.to}`} />
            <p className={`text-xs font-bold ${k.text} mb-1`}>{k.title}</p>
            <p className="text-3xl font-black text-slate-800">{loading ? '...' : k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-md">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input type="text" placeholder="ابحث عن اسم الخدمة..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 py-2.5 pr-11 pl-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-slate-800" />
      </div>

      {/* ── Services Grid ── */}
      {loading ? (
        <div className="text-center py-14 text-slate-400">جاري تحميل الخدمات...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 flex flex-col items-center gap-3">
          <Settings2 size={40} className="text-slate-300" />
          <p className="text-slate-500 font-bold">لا يوجد خدمات متاحة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(service => {
            const Icon = getLucideIcon(service.icon_name);
            return (
              <div key={service.id}
                className={`relative bg-white rounded-3xl border shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden p-5 ${service.is_active ? 'border-emerald-100' : 'border-slate-100 opacity-60'}`}>
                <div className={`absolute top-0 right-0 left-0 h-1 ${service.is_active ? 'bg-gradient-to-l from-emerald-400 to-teal-500' : 'bg-slate-200'}`} />
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-1.5">
                    <button onClick={() => { setSelectedService(service); setIsModalOpen(true); }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => toggleServiceStatus(service.id, service.is_active)}
                      className={`p-1.5 rounded-xl transition-colors ${service.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                      {service.is_active ? <CheckCircle size={15} /> : <XCircle size={15} />}
                    </button>
                    <button onClick={() => deleteService(service.id, service.name_ar)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${service.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon size={24} />
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-800 text-right">{service.name_ar}</h3>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-black text-primary">{service.base_price.toLocaleString('en-US')} د.ع</span>
                  <span className="text-xs font-bold text-slate-400">السعر الأساسي</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <ServiceModal service={selectedService} onClose={() => setIsModalOpen(false)} onSaved={() => { setIsModalOpen(false); fetchServices(); }} />
      )}
    </div>
  );
}

