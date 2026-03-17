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

 useEffect(() => {
 fetchRequests();
 }, []);

 const fetchRequests = async () => {
 setLoading(true);
 try {
 // 1. Fetch Requests (without implicit foreign key relations that throw PGRST200)
 const { data: requestsData, error: reqError } = await supabase
 .from('maintenance_requests')
 .select('*')
 .order('created_at', { ascending: false });

 if (reqError) {
 console.error("Supabase Error Code:", reqError.code, reqError.message);
 throw reqError;
 }

 // 2. Fetch Profiles to map names manually
 const { data: profilesData } = await supabase
 .from('profiles')
 .select('id, user_id, full_name, phone');
 
 // Create a hash map for O(1) profile lookups
 const profilesMap = (profilesData || []).reduce((acc: any, profile: any) => {
 // customer_id / worker_id = auth.users.id = profiles.user_id
 if (profile.user_id) acc[profile.user_id] = profile;
 acc[profile.id] = profile; // fallback
 return acc;
 }, {});

 // 3. Fetch Cancellation Reasons to map labels
 const { data: reasonsData } = await supabase
 .from('cancellation_reasons')
 .select('id, reason_label');

 const reasonsMap = (reasonsData || []).reduce((acc: any, r: any) => {
 acc[r.id] = r.reason_label;
 return acc;
 }, {});

 // 4. Map the names and reasons back into the request objects
 const mappedRequests = (requestsData || []).map(req => ({
 ...req,
 customer: profilesMap[req.customer_id] || null,
 worker: profilesMap[req.worker_id] || null,
 cancellation_reason: reasonsMap[req.cancellation_reason_id] || null,
 service: { name_ar: 'خدمة صيانة', price: req.price }
 }));
 
 setRequests(mappedRequests);
 } catch (error) {
 console.error("Error fetching requests:", error);
 } finally {
 setLoading(false);
 }
 };

 const statusMap: Record<string, { label: string, color: string }> = {
 pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700 border-amber-200' },
 accepted: { label: 'تم القبول', color: 'bg-blue-100 text-blue-700 border-blue-200' },
 en_route: { label: 'في الطريق', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
 arrived: { label: 'وصل للعميل', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
 in_progress: { label: 'جاري العمل', color: 'bg-purple-100 text-purple-700 border-purple-200' },
 completed: { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
 canceled: { label: 'ملغي', color: 'bg-red-50 text-red-600 border-red-200' },
 cancelled: { label: 'ملغي', color: 'bg-red-50 text-red-600 border-red-200' }
 };

 const filtered = requests.filter((r) => {
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
  XLSX.utils.book_append_sheet(wb, ws, "Maintenance Requests");
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  saveAs(blob, `Maintenance_Requests_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  } catch (error) {
  console.error("Error exporting to Excel:", error);
  } finally {
  setExporting(false);
  }
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-500 font-sans RTL">
 
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
  <div>
  <h1 className="text-4xl font-black text-slate-800 ">إدارة الطلبات</h1>
  <p className="text-slate-600 mt-2 font-medium">متابعة صيانة العملاء وتعيينات الفنيين المباشرة</p>
  </div>

  <button
  onClick={exportExcel}
  disabled={exporting || loading || filtered.length === 0}
  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm flex-shrink-0"
  >
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
  {exporting ? 'جاري التصدير...' : `Excel (${filtered.length})`}
  </button>

 {/* Filters & Search */}
 <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
 <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-full sm:w-auto overflow-x-auto whitespace-nowrap">
 {[
 { id: 'all', label: 'الكل' }, 
 { id: 'pending', label: 'قيد الانتظار' }, 
 { id: 'in_progress', label: 'نشط' }, 
 { id: 'completed', label: 'مكتمل' },
 { id: 'canceled', label: 'ملغي' }
 ].map((f) => (
 <button
 key={f.id}
 onClick={() => setFilter(f.id as any)}
 className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
 filter === f.id 
 ? 'bg-white shadow-md shadow-sm text-primary' 
 : 'text-slate-500 hover:text-slate-800 :text-white'
 }`}
 >
 {f.label}
 </button>
 ))}
 </div>

 <div className="relative w-full sm:w-72">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <input 
 type="text"
 placeholder="ابحث بالعنوان أو الاسم..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-white border border-slate-200 py-3 pr-12 pl-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-lg shadow-sm text-slate-800 "
 />
 </div>
 </div>
 </div>

 {loading ? (
 <div className="flex justify-center items-center py-20 text-slate-500 font-medium">جاري تحميل الطلبات...</div>
 ) : filtered.length === 0 ? (
 <div className="flex justify-center items-center py-20 text-slate-500 font-medium bg-white border border-slate-200 rounded-3xl relative z-10">لا توجد طلبات مطابقة.</div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
 {filtered.map(request => {
 const statusInfo = statusMap[request.status] || { label: request.status, color: 'bg-white text-slate-500 border-slate-200' };
 
 return (
 <div key={request.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between group">
 
 <div className="absolute inset-0 bg-gradient-to-bra from-white/40 to-white/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
 
 <div className="flex justify-between items-start mb-4">
 <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${statusInfo.color}`}>
 {statusInfo.label}
 </span>
 
 <div className="text-left relative z-10">
 <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
 #{request.id.slice(0, 8)}
 </span>
 </div>
 </div>

 <h3 className="text-xl font-bold text-slate-800 mb-2 relative z-10">
 {request.service?.name_ar || request.title || request.description || 'طلب صيانة'}
 </h3>
 
 <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 relative z-10">
 <MapPin size={16} className="text-primary flex-shrink-0" />
 <span className="truncate" title={request.address || ''}>
 {request.address || (request.latitude && request.longitude ? `${request.latitude.toFixed(4)}, ${request.longitude.toFixed(4)}` : 'موقع غير محدد')}
 </span>
 </div>

 <div className="space-y-3 bg-white rounded-2xl border border-slate-200 p-4 mb-5 relative z-10">
 <div className="flex flex-col">
 <span className="text-muted-foreground text-xs mb-1">العميل:</span>
 <span className="font-bold text-foreground">{request.customer?.full_name || 'غير متوفر'}</span>
 </div>
 <div className="flex flex-col">
 <span className="text-muted-foreground text-xs mb-1">الفني:</span>
 <span className={`${request.worker ? 'font-bold text-primary' : 'text-amber-500 font-bold'}`}>
 {request.worker?.full_name || 'بانتظار الموافقة'}
 </span>
 </div>
 </div>

 <div className="flex justify-between items-center border-t border-slate-200 pt-5 mt-auto relative z-10">
 <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
 <CalendarClock size={16} />
 <span>{format(new Date(request.created_at), 'dd MMM، p', { locale: arSA })}</span>
 </div>

 <div className="flex items-center gap-2">
 <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${request.payment_method === 'electronic' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
  {request.payment_method === 'electronic' ? '💳' : '💵'}
 </span>
 <div className="flex items-center gap-1.5 font-bold text-slate-800 bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-500/20">
 <CreditCard size={18} />
 <span>{request.price ? `${request.price.toLocaleString('en-US')} د.ع` : 'يحدد لاحقاً'}</span>
 </div>
 </div>
 </div>

 {/* Quick Action */}
 <button 
 onClick={() => setSelectedRequest(request)}
 className="w-full mt-5 bg-white hover:bg-white :bg-slate-700/80 text-primary font-bold py-3 rounded-2xl transition-all border border-slate-200 flex justify-center items-center gap-2 shadow-sm hover:shadow-md relative z-10"
 >
 <span>إدارة الطلب</span>
 <ChevronDown size={18} />
 </button>
 </div>
 );
 })}
 </div>
 )}
 {selectedRequest && (
 <RequestDetailsModal 
 request={selectedRequest} 
 onClose={() => setSelectedRequest(null)}
 onRefresh={fetchRequests}
 />
 )}
 </div>
 );
};

export default Requests;
