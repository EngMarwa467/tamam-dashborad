import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, MapPin, CalendarClock, CreditCard, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import RequestDetailsModal from '../components/RequestDetailsModal';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Requests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'canceled'>('all');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: requestsData, error: reqError } = await supabase
        .from('maintenance_requests').select('*').order('created_at', { ascending: false });
      if (reqError) throw reqError;
      const { data: profilesData } = await supabase.from('profiles').select('id, user_id, full_name, phone');
      const profilesMap = (profilesData || []).reduce((acc: any, profile: any) => {
        if (profile.user_id) acc[profile.user_id] = profile;
        acc[profile.id] = profile;
        return acc;
      }, {});
      const { data: reasonsData } = await supabase.from('cancellation_reasons').select('id, reason_label');
      const reasonsMap = (reasonsData || []).reduce((acc: any, r: any) => { acc[r.id] = r.reason_label; return acc; }, {});
      const mappedRequests = (requestsData || []).map(req => ({
        ...req,
        customer: profilesMap[req.customer_id] || null,
        worker: profilesMap[req.worker_id] || null,
        cancellation_reason: reasonsMap[req.cancellation_reason_id] || null,
        service: { name_ar: 'خدمة صيانة', price: req.price }
      }));
      setRequests(mappedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally { setLoading(false); }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    pending:     { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    accepted:    { label: 'تم القبول',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
    en_route:    { label: 'في الطريق',    color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    arrived:     { label: 'وصل للعميل',   color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    in_progress: { label: 'جاري العمل',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
    completed:   { label: 'مكتمل',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    canceled:    { label: 'ملغي',          color: 'bg-red-50 text-red-600 border-red-200' },
    cancelled:   { label: 'ملغي',          color: 'bg-red-50 text-red-600 border-red-200' },
  };

  const filtered = requests.filter(r => {
    const isMatchingStatus =
      filter === 'all' ? true :
      filter === 'in_progress' ? ['accepted', 'en_route', 'arrived', 'in_progress'].includes(r.status) :
      filter === 'canceled' ? ['canceled', 'cancelled'].includes(r.status) :
      r.status === filter;
    const matchesSearch =
      r.address?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.worker?.full_name?.toLowerCase().includes(search.toLowerCase());
    return isMatchingStatus && matchesSearch;
  });

  const exportExcel = () => {
    setExporting(true);
    try {
      const data = filtered.map(req => ({
        'معرف الطلب': req.id,
        'الحالة': statusMap[req.status]?.label || req.status,
        'اسم العميل': req.customer?.full_name || 'غير متوفر',
        'رقم هاتف العميل': req.customer?.phone || 'غير متوفر',
        'اسم الفني': req.worker?.full_name || 'غير معين',
        'رقم هاتف الفني': req.worker?.phone || 'غير متوفر',
        'العنوان': req.address || 'غير محدد',
        'السعر': req.price ? `${req.price.toLocaleString('en-US')} د.ع` : 'يحدد لاحقاً',
        'طريقة الدفع': req.payment_method === 'electronic' ? 'إلكتروني' : 'نقدي',
        'تاريخ الإنشاء': format(new Date(req.created_at), 'dd/MM/yyyy HH:mm', { locale: arSA }),
        'الوصف': req.description || '',
        'سبب الإلغاء': req.cancellation_reason || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Requests');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `Requests_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (e) { console.error(e); } finally { setExporting(false); }
  };

  // Stats
  const total = requests.length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const active = requests.filter(r => ['accepted', 'en_route', 'arrived', 'in_progress'].includes(r.status)).length;
  const completed = requests.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">

      {/* ── Hero Strip ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-violet-600 to-purple-700 px-8 py-8 shadow-xl shadow-purple-200/40">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-blue-400/20 rounded-full translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-purple-200 text-xs font-bold">🔧 لأحدث الطلبات</span>
            <h1 className="text-3xl font-black text-white mt-1">إدارة الطلبات</h1>
            <p className="text-purple-100/80 mt-1 text-sm">متابعة صيانة العملاء وتعيينات الفنيين</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-white/60 text-[10px] font-bold">إجمالي</p>
              <p className="text-white font-black text-xl">{total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-white/60 text-[10px] font-bold">نشط</p>
              <p className="text-amber-300 font-black text-xl">{active}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-white/60 text-[10px] font-bold">مكتمل</p>
              <p className="text-emerald-300 font-black text-xl">{completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Export ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'pending', label: `انتظار (${pending})` },
            { id: 'in_progress', label: `نشط (${active})` },
            { id: 'completed', label: `مكتمل (${completed})` },
            { id: 'canceled', label: 'ملغي' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === f.id ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="ابحث بالعنوان أو الاسم..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 py-2.5 pr-10 pl-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-slate-800" />
        </div>
        <button onClick={exportExcel} disabled={exporting || loading || filtered.length === 0}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm text-sm flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          {exporting ? 'جاري...' : `Excel (${filtered.length})`}
        </button>
      </div>

      {/* ── Request Cards ── */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400 font-medium">جاري تحميل الطلبات...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-20 text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm gap-3">
          <CreditCard size={40} className="opacity-30" />
          <p className="font-bold">لا توجد طلبات مطابقة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(request => {
            const statusInfo = statusMap[request.status] || { label: request.status, color: 'bg-slate-100 text-slate-500 border-slate-200' };
            return (
              <div key={request.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${statusInfo.color}`}>{statusInfo.label}</span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">#{request.id.slice(0, 8)}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {request.service?.name_ar || request.title || request.description || 'طلب صيانة'}
                </h3>

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <MapPin size={13} className="text-primary flex-shrink-0" />
                  <span className="truncate">{request.address || 'موقع غير محدد'}</span>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-slate-700">{request.customer?.full_name || 'غير متوفر'}</span>
                    <span className="text-slate-400 text-xs">العميل</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={`font-bold ${request.worker ? 'text-primary' : 'text-amber-500'}`}>
                      {request.worker?.full_name || 'بانتظار الموافقة'}
                    </span>
                    <span className="text-slate-400 text-xs">الفني</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CalendarClock size={13} />
                    <span>{format(new Date(request.created_at), 'dd MMM، p', { locale: arSA })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl text-xs border border-emerald-100">
                    <CreditCard size={12} />
                    <span>{request.price ? `${request.price.toLocaleString('en-US')} د.ع` : 'يحدد لاحقاً'}</span>
                  </div>
                </div>

                <button onClick={() => setSelectedRequest(request)}
                  className="w-full mt-4 bg-slate-50 hover:bg-primary/5 text-primary font-bold py-2.5 rounded-2xl transition-all border border-slate-200 hover:border-primary/30 flex justify-center items-center gap-2 text-sm">
                  إدارة الطلب <ChevronDown size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedRequest && (
        <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} onRefresh={fetchRequests} />
      )}
    </div>
  );
};

export default Requests;
