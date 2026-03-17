import React, { useEffect, useState } from 'react';
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
    <div className="space-y-6 animate-in fade-in duration-500 font-sans RTL">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800">إدارة الخدمات</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">أضف أو عدل الخدمات التي يقدمها تطبيق تمام</p>
        </div>
        <button 
          onClick={() => { setSelectedService(null); setIsModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={20} />
          <span>إضافة خدمة جديدة</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 mb-1">إجمالي الخدمات</p>
          <p className="text-3xl font-black text-slate-800">{services.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 mb-1">الخدمات النشطة</p>
          <p className="text-3xl font-black text-emerald-700">{activeCount}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
          <p className="text-xs font-bold text-blue-600 mb-1">متوسط الأسعار</p>
          <p className="text-3xl font-black text-blue-700">{avgPrice.toLocaleString('en-US')} <span className="text-sm font-bold text-blue-600">د.ع</span></p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="ابحث عن اسم الخدمة..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full bg-transparent py-2.5 pr-10 pl-4 text-sm font-bold text-slate-800 outline-none" 
          />
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">جاري تحميل الخدمات...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <Settings2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-bold">لا يوجد خدمات متاحة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(service => {
            const Icon = getLucideIcon(service.icon_name);
            return (
              <div key={service.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${service.is_active ? 'border-emerald-100' : 'border-slate-200 opacity-70'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${service.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setSelectedService(service); setIsModalOpen(true); }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => toggleServiceStatus(service.id, service.is_active)}
                      className={`p-1.5 rounded-lg transition-colors ${service.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      title={service.is_active ? 'تعطيل الخدمة' : 'تفعيل الخدمة'}
                    >
                      {service.is_active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </button>
                    <button 
                      onClick={() => deleteService(service.id, service.name_ar)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-black text-slate-800">{service.name_ar}</h3>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">السعر الأساسي</span>
                  <span className="text-sm font-black text-primary">{service.base_price.toLocaleString('en-US')} د.ع</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Service Modal */}
      {isModalOpen && (
        <ServiceModal
          service={selectedService}
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            fetchServices();
          }}
        />
      )}
    </div>
  );
}
