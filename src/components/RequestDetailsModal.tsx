import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import {
 X,
 MapPin,
 Clock,
 CheckCircle,
 Truck,
 Wrench,
 CreditCard,
 Image as ImageIcon,
 Mic,
 Navigation,
 MessageSquare,
 ClipboardList,
 ChevronRight,
 AlertTriangle,
 UserCheck,
 Phone,
 MessageCircle,
 Ban
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';

// Fix standard Leaflet pin icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
 iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
 iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
 shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const LiveTrackingMap = ({ custLat, custLng, workerLat, workerLng, status }: any) => {
 const centerPosition = workerLat && workerLng && status === 'en_route' 
 ? [workerLat, workerLng] 
 : [custLat, custLng];

 return (
 <div className="w-full h-64 sm:h-80 bg-secondary rounded-2xl overflow-hidden mt-3 border border-border relative z-0">
 <MapContainer 
 center={centerPosition as any} 
 zoom={14} 
 style={{ width: '100%', height: '100%' }}
 scrollWheelZoom={false}
 >
 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
 
 {custLat && custLng && (
 <Marker position={[custLat, custLng]}>
 <Popup>
 <div className="font-bold text-slate-800 text-right font-sansRTL text-sm">موقع العميل</div>
 </Popup>
 </Marker>
 )}

 {workerLat && workerLng && ['accepted', 'en_route', 'arrived'].includes(status) && (
 <Marker position={[workerLat, workerLng]}>
 <Popup>
 <div className="font-bold text-primary text-right font-sansRTL text-sm">الفني (مباشر)</div>
 </Popup>
 </Marker>
 )}

 {custLat && custLng && workerLat && workerLng && ['accepted', 'en_route'].includes(status) && (
 <Polyline positions={[[custLat, custLng], [workerLat, workerLng]]} color="#10b981" weight={4} dashArray="5, 10" />
 )}

 </MapContainer>
 </div>
 );
};

interface Props {
  request: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function RequestDetailsModal({ request, onClose, onRefresh }: Props) {
 const [activeTab, setActiveTab] = useState<'info' | 'media' | 'map' | 'admin'>('info');
 const [updating, setUpdating] = useState(false);
 const [adminNote, setAdminNote] = useState('');
 const [cancelReason, setCancelReason] = useState('');
 const [showCancelForm, setShowCancelForm] = useState(false);

 if (!request) return null;

 const isCanceled = request.status === 'canceled' || request.status === 'cancelled';
 const isCompleted = request.status === 'completed';

 const steps = [
 { key: 'pending', label: 'الطلب مسجل', icon: Clock },
 { key: 'accepted', label: 'تم القبول', icon: CheckCircle },
 { key: 'en_route', label: 'في الطريق', icon: Truck },
 { key: 'arrived', label: 'وصل الموقع', icon: MapPin },
 { key: 'in_progress', label: 'جاري العمل', icon: Wrench },
 { key: 'completed', label: 'مكتمل الدفع', icon: CreditCard },
 ];

 const currentStepIndex = isCanceled ? -1 : steps.findIndex(s => s.key === request.status);

 // ── Status Flow ────────────────────────────────────────────────────────
 const statusFlow: Record<string, { next: string; nextLabel: string; color: string }> = {
  pending:     { next: 'accepted',    nextLabel: 'قبول الطلب ✅',    color: 'bg-blue-600 hover:bg-blue-700' },
  accepted:    { next: 'en_route',    nextLabel: 'بدأ الرحلة 🚗',    color: 'bg-indigo-600 hover:bg-indigo-700' },
  en_route:    { next: 'arrived',     nextLabel: 'وصل الموقع 📍',    color: 'bg-purple-600 hover:bg-purple-700' },
  arrived:     { next: 'in_progress', nextLabel: 'بدء العمل 🔧',     color: 'bg-cyan-600 hover:bg-cyan-700' },
  in_progress: { next: 'completed',   nextLabel: 'إنهاء وتأكيد ✅', color: 'bg-emerald-600 hover:bg-emerald-700' },
 };

 const canAdvance = !isCanceled && !isCompleted && statusFlow[request.status];

 const updateStatus = async (newStatus: string) => {
  setUpdating(true);
  try {
   const { error } = await supabase
    .from('maintenance_requests')
    .update({ status: newStatus, admin_note: adminNote || null })
    .eq('id', request.id);
   if (error) throw error;
   request.status = newStatus;
   if (onRefresh) onRefresh();
   alert(`تم تحديث الحالة إلى: ${steps.find(s => s.key === newStatus)?.label || newStatus}`);
  } catch (err: any) {
   alert('خطأ: ' + err.message);
  } finally { setUpdating(false); }
 };

 const cancelRequest = async () => {
  if (!cancelReason.trim()) { alert('يرجى كتابة سبب الإلغاء'); return; }
  setUpdating(true);
  try {
   const { error } = await supabase
    .from('maintenance_requests')
    .update({ status: 'canceled', admin_note: cancelReason })
    .eq('id', request.id);
   if (error) throw error;
   request.status = 'canceled';
   if (onRefresh) onRefresh();
   alert('تم إلغاء الطلب');
   setShowCancelForm(false);
  } catch (err: any) {
   alert('خطأ: ' + err.message);
  } finally { setUpdating(false); }
 };

 const revertStatus = async () => {
  if (currentStepIndex <= 0) return;
  const prevStatus = steps[currentStepIndex - 1].key;
  if (!window.confirm(`هل تريد إرجاع الحالة إلى "${steps[currentStepIndex - 1].label}"؟`)) return;
  await updateStatus(prevStatus);
 };

 // WhatsApp helpers
 const openWhatsApp = (phone: string, name: string) => {
  let p = phone?.replace(/\D/g, '') || '';
  if (p.startsWith('0')) p = '964' + p.slice(1);
  if (!p.startsWith('964')) p = '964' + p;
  const msg = encodeURIComponent(`مرحباً ${name}، فريق تمام — بخصوص طلبك #${request.id.slice(0, 8)} 👋`);
  window.open(`https://wa.me/${p}?text=${msg}`, '_blank');
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 animate-in fade-in duration-200" onClick={onClose}>
 <div 
 className="w-full max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden" 
 onClick={e => e.stopPropagation()}
 dir="rtl"
 >
 {/* Header */}
 <div className="flex justify-between items-start sm:items-center p-4 sm:p-6 border-b border-slate-200 bg-white relative z-10">
 <div>
 <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
 تفاصيل الطلب 
 <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm border border-primary/20">#{request.id.slice(0, 8)}</span>
 </h2>
 <p className="text-slate-500 font-medium text-sm mt-2">مسجل في: {format(new Date(request.created_at), 'dd MMMM yyyy - p', { locale: arSA })}</p>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
 <X size={24} className="text-slate-500 hover:text-red-500 transition-colors" />
 </button>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-border px-2 sm:px-6 overflow-x-auto whitespace-nowrap">
 {[
  { key: 'info', label: 'البيانات والتسعير' },
  { key: 'admin', label: '🎛️ إدارة الحالة' },
  { key: 'map', label: 'الموقع الحي' },
  { key: 'media', label: 'الوسائط' },
 ].map(t => (
 <button key={t.key} onClick={() => setActiveTab(t.key as any)} className={`py-3 sm:py-4 px-3 sm:px-4 font-bold text-sm border-b-2 transition-colors flex-shrink-0 ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
 ))}
 </div>

 {/* Content */}
 <div className="p-4 sm:p-6 overflow-y-auto flex-1">

 {/* ══ INFO TAB ════════════════════════════════════════════════════════ */}
 {activeTab === 'info' && (
 <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">

 {/* Canceled Warning */}
 {isCanceled && (
  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 space-y-3">
   <div className="flex items-start gap-3">
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
     <X size={18} className="text-red-600" />
    </div>
    <div className="min-w-0 flex-1">
     <p className="font-bold text-red-800 text-sm sm:text-base">تم إلغاء هذا الطلب</p>
     <p className="text-red-600 text-xs sm:text-sm mt-0.5">لن يتم متابعة العمل عليه.</p>
    </div>
   </div>
   {(request.cancellation_reason || request.admin_note) && (
    <div className="bg-red-100/50 border border-red-200/50 rounded-xl p-3">
     <p className="text-[10px] sm:text-xs font-bold text-red-700 mb-1">سبب الإلغاء:</p>
     <p className="text-xs sm:text-sm font-bold text-red-900">{request.cancellation_reason || request.admin_note}</p>
    </div>
   )}
  </div>
 )}

 {/* Timeline */}
 {!isCanceled && (
 <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 relative z-10">
 <h3 className="font-bold mb-4 text-slate-800 text-sm sm:text-base">مسار وتتبع الطلب</h3>
 <div className="flex flex-col gap-0">
 {steps.map((step, index) => {
 const isPassed = index <= currentStepIndex;
 const isActive = index === currentStepIndex;
 const isLast = index === steps.length - 1;
 const Icon = step.icon;

 return (
 <div key={step.key} className="flex flex-row items-stretch">
 <div className="flex flex-col items-center mr-1 sm:mr-2 ml-2 sm:ml-4 relative z-10">
 <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex shrink-0 items-center justify-center border-[3px] transition-all duration-500 z-10 
 ${isActive ? 'bg-primary border-primary/20 text-primary-foreground shadow-md shadow-primary/30 ring-2 ring-primary/20' : 
 isPassed ? 'bg-primary border-primary text-primary-foreground' : 
 'bg-white border-slate-200 text-slate-400'}`
 }>
 <Icon size={16} />
 </div>
 {!isLast && (
 <div className={`w-0.5 flex-1 transition-all duration-500 
 ${index < currentStepIndex ? 'bg-primary' : 'bg-slate-200'}`} 
 />
 )}
 </div>
 <div className={`flex-1 min-w-0 pb-5 ${isLast ? 'pb-1' : ''}`}>
 <div className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-300
 ${isActive ? 'bg-primary/5 border-primary/20 shadow-sm' : 
 isPassed ? 'bg-white border-slate-100' : 
 'bg-transparent border-transparent opacity-50'}`
 }>
 <h4 className={`text-xs sm:text-sm font-bold ${isActive ? 'text-primary' : isPassed ? 'text-slate-800' : 'text-slate-500'}`}>
 {step.label}
 </h4>
 {isActive && <p className="text-[10px] sm:text-xs text-primary/80 mt-0.5 font-bold">● المرحلة الحالية</p>}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Profiles */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
 <div className="border border-slate-200 rounded-2xl p-3 sm:p-4 bg-white shadow-sm flex items-center gap-3 overflow-hidden">
 <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
 <span className="text-blue-700 font-bold text-sm sm:text-base">ع</span>
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 mb-0.5">العميل</h4>
 <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">{request.customer?.full_name || 'غير متوفر'}</p>
 <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 dir-ltr text-right truncate">{request.customer?.phone || '---'}</p>
 </div>
 {request.customer?.phone && (
 <button onClick={() => openWhatsApp(request.customer.phone, request.customer.full_name)} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors flex-shrink-0" title="واتساب">
  <MessageCircle size={14} />
 </button>
 )}
 </div>

 <div className="border border-slate-200 rounded-2xl p-3 sm:p-4 bg-white shadow-sm flex items-center gap-3 overflow-hidden">
 <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
 <span className="text-purple-700 font-bold text-sm sm:text-base">ف</span>
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 mb-0.5">الفني</h4>
 <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">{request.worker?.full_name || 'بانتظار الموافقة'}</p>
 <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 dir-ltr text-right truncate">{request.worker?.phone || '---'}</p>
 </div>
 {request.worker?.phone && (
 <button onClick={() => openWhatsApp(request.worker.phone, request.worker.full_name)} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors flex-shrink-0" title="واتساب">
  <MessageCircle size={14} />
 </button>
 )}
 </div>
 </div>

 {/* Service Details */}
 {request.service_details && Object.keys(request.service_details).length > 0 && (
 <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50/30">
 <h3 className="font-bold mb-3 text-blue-900 border-b border-blue-100 pb-2 text-xs sm:text-sm flex items-center gap-2">
 <ClipboardList size={15} className="text-blue-500" />
 تفاصيل الخدمة (من العميل)
 </h3>
 <div className="space-y-2">
 {Object.entries(request.service_details).map(([key, value]) => {
 const label = key.replace(/_/g, ' ');
 const renderValue = () => {
 if (typeof value === 'boolean') {
 return (
 <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
 value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
 }`}>
 {value ? 'نعم ✓' : 'لا'}
 </span>
 );
 }
 if (Array.isArray(value)) {
 return value.length > 0 ? (
 <div className="flex flex-wrap gap-1">
 {(value as string[]).map((v, i) => (
 <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{v}</span>
 ))}
 </div>
 ) : <span className="text-slate-400 text-xs">—</span>;
 }
 return <span className="font-bold text-slate-800 text-xs sm:text-sm">{String(value)}</span>;
 };
 return (
 <div key={key} className="flex justify-between items-start gap-3 py-1.5 border-b border-blue-100/60 last:border-0">
 <div className="flex-1">{renderValue()}</div>
 <span className="text-slate-500 text-xs font-medium text-right flex-shrink-0">{label}</span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Invoice */}
 {!isCanceled && (
 <div className="border border-emerald-100 rounded-2xl p-3 sm:p-5 bg-emerald-50/30">
 <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
 <h3 className="font-bold text-emerald-900 text-xs sm:text-sm">الفاتورة والأسعار</h3>
 <span className={`text-xs font-bold px-3 py-1 rounded-lg ${request.payment_method === 'electronic' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
  {request.payment_method === 'electronic' ? '💳 إلكتروني' : '💵 نقدي'}
 </span>
 </div>
 <div className="space-y-3 text-xs sm:text-sm">
 <div className="flex justify-between items-center text-emerald-800 gap-2">
 <span className="font-medium truncate flex-1 min-w-0">أجرة الخدمة ({request.service?.name_ar || 'عام'})</span>
 <span className="font-bold bg-emerald-100 px-2 py-0.5 rounded-md flex-shrink-0 text-xs sm:text-sm">{request.price?.toLocaleString('en-US')} د.ع</span>
 </div>
 <div className="flex justify-between items-center text-emerald-800 gap-2">
 <span className="font-medium truncate flex-1 min-w-0">قطع الغيار</span>
 <span className="font-bold bg-emerald-100 px-2 py-0.5 rounded-md flex-shrink-0 text-xs sm:text-sm">{request.spare_parts_total?.toLocaleString('en-US') || 0} د.ع</span>
 </div>
 <div className="flex justify-between items-center pt-3 border-t border-emerald-200 mt-1 gap-2">
 <span className="font-black text-emerald-900 text-sm sm:text-base">الإجمالي</span>
 <span className="font-black text-emerald-700 text-base sm:text-xl">
 {((request.price || 0) + (request.spare_parts_total || 0)).toLocaleString('en-US')} د.ع
 </span>
 </div>
 </div>
 </div>
 )}

 </div>
 )}

 {/* ══ ADMIN TAB ═══════════════════════════════════════════════════════ */}
 {activeTab === 'admin' && (
 <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">

 {/* Current Status */}
 <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center">
  <p className="text-xs font-bold text-slate-400 mb-2">الحالة الحالية</p>
  <span className={`inline-block px-5 py-2 rounded-xl text-sm font-black ${
   isCanceled ? 'bg-red-100 text-red-700' :
   isCompleted ? 'bg-emerald-100 text-emerald-700' :
   'bg-primary/10 text-primary'
  }`}>
   {steps.find(s => s.key === request.status)?.label || (isCanceled ? 'ملغي' : request.status)}
  </span>
 </div>

 {/* Status Actions */}
 {canAdvance && (
  <div className="space-y-3">
   <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><ChevronRight size={16} /> تقديم الحالة</h3>
   
   {/* Admin Note */}
   <textarea
    className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-right"
    rows={2}
    placeholder="ملاحظة إدارية (اختياري)..."
    value={adminNote}
    onChange={e => setAdminNote(e.target.value)}
   />

   <div className="flex gap-2">
    {/* Advance */}
    <button
     disabled={updating}
     onClick={() => updateStatus(statusFlow[request.status].next)}
     className={`flex-1 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${statusFlow[request.status].color} disabled:opacity-50`}
    >
     {updating ? 'جاري...' : statusFlow[request.status].nextLabel}
    </button>

    {/* Revert */}
    {currentStepIndex > 0 && (
     <button
      disabled={updating}
      onClick={revertStatus}
      className="px-4 py-3 rounded-xl font-bold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors disabled:opacity-50"
      title="إرجاع الحالة"
     >
      ↩️ إرجاع
     </button>
    )}
   </div>
  </div>
 )}

 {/* Direct Status Jump */}
 {!isCanceled && !isCompleted && (
  <div className="space-y-3">
   <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><UserCheck size={16} /> تغيير مباشر للحالة</h3>
   <div className="grid grid-cols-3 gap-2">
    {steps.filter(s => s.key !== request.status).map(step => {
     const Icon = step.icon;
     return (
      <button
       key={step.key}
       disabled={updating}
       onClick={() => {
        if (window.confirm(`هل تريد تغيير الحالة إلى "${step.label}"؟`)) updateStatus(step.key);
       }}
       className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all text-slate-600 hover:text-primary disabled:opacity-50"
      >
       <Icon size={18} />
       <span className="text-[10px] font-bold">{step.label}</span>
      </button>
     );
    })}
   </div>
  </div>
 )}

 {/* Cancel Section */}
 {!isCanceled && !isCompleted && (
  <div className="border-t border-slate-200 pt-4 space-y-3">
   <button
    onClick={() => setShowCancelForm(v => !v)}
    className="flex items-center gap-2 text-red-600 hover:text-red-700 font-bold text-sm"
   >
    <Ban size={16} /> إلغاء الطلب
   </button>

   {showCancelForm && (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
     <div className="flex items-center gap-2 text-red-700">
      <AlertTriangle size={16} />
      <span className="text-sm font-bold">تأكيد إلغاء الطلب</span>
     </div>
     <textarea
      className="w-full border border-red-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-300 text-right bg-white"
      rows={2}
      placeholder="سبب الإلغاء (مطلوب)..."
      value={cancelReason}
      onChange={e => setCancelReason(e.target.value)}
     />
     <div className="flex gap-2">
      <button
       disabled={updating}
       onClick={cancelRequest}
       className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl transition-colors disabled:opacity-50"
      >
       {updating ? 'جاري...' : 'تأكيد الإلغاء'}
      </button>
      <button onClick={() => setShowCancelForm(false)} className="bg-slate-100 text-slate-500 font-bold py-2 px-4 rounded-xl">
       تراجع
      </button>
     </div>
    </div>
   )}
  </div>
 )}

 {/* Contact Shortcuts */}
 <div className="border-t border-slate-200 pt-4 space-y-3">
  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Phone size={16} /> التواصل السريع</h3>
  <div className="grid grid-cols-2 gap-3">
   {request.customer?.phone && (
    <button
     onClick={() => openWhatsApp(request.customer.phone, request.customer.full_name)}
     className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors"
    >
     <MessageCircle size={16} /> واتساب العميل
    </button>
   )}
   {request.worker?.phone && (
    <button
     onClick={() => openWhatsApp(request.worker.phone, request.worker.full_name)}
     className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm transition-colors"
    >
     <MessageCircle size={16} /> واتساب الفني
    </button>
   )}
  </div>
 </div>

 </div>
 )}

 {/* ══ MEDIA TAB ═══════════════════════════════════════════════════════ */}
 {activeTab === 'media' && (
 <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
 <div className="bg-secondary/30 rounded-2xl p-6 border border-border">
 <h3 className="font-bold mb-3 flex items-center gap-2">
 <MessageSquare size={18} className="text-primary" />
 وصف المشكلة (العميل)
 </h3>
 <p className="text-muted-foreground leading-relaxed">
 {request.description || 'لم يتم كتابة وصف.'}
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="border border-border rounded-2xl p-4">
 <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
 <ImageIcon size={16} className="text-primary" />
 الصورة المرسلة من العميل
 </h3>
 {request.before_photo_url ? (
 <img src={request.before_photo_url} alt="مرفق المشكلة" className="w-full h-48 object-cover rounded-xl" />
 ) : (
 <div className="w-full h-48 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border">لا توجد صورة</div>
 )}
 </div>

 <div className="space-y-6">
 <div className="border border-border rounded-2xl p-4">
 <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
 <Mic size={16} className="text-primary" />
 الملاحظة الصوتية (العميل)
 </h3>
 {request.voice_url ? (
 <audio controls src={request.voice_url} className="w-full rounded-full" />
 ) : (
 <div className="bg-secondary p-4 rounded-xl text-center text-muted-foreground text-sm">لا يوجد تسجيل صوتي</div>
 )}
 </div>

 <div className="border border-border rounded-2xl p-4">
 <h3 className="font-bold mb-3 flex items-center gap-2 text-sm text-foreground">
 <CheckCircle size={16} className="text-emerald-500" />
 صورة الإنجاز (الفني)
 </h3>
 {request.after_image_url ? (
 <img src={request.after_image_url} alt="العمل المنجز" className="w-full h-48 object-cover rounded-xl" />
 ) : (
 <div className="bg-secondary p-4 rounded-xl text-center text-muted-foreground text-sm border border-dashed border-border">لم تُرفع بعد</div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ══ MAP TAB ═════════════════════════════════════════════════════════ */}
 {activeTab === 'map' && (
 <div className="animate-in slide-in-from-bottom-4 duration-300">
 <div className="bg-secondary/30 rounded-2xl p-5 border border-border mb-4 flex items-start gap-3">
 <Navigation size={20} className="text-primary flex-shrink-0 mt-0.5" />
 <div>
 <h3 className="font-bold text-foreground mb-1">موقع الطلب</h3>
 <p className="text-muted-foreground text-sm leading-relaxed">{request.address || 'لم يقم العميل بكتابة عنوان نصي.'}</p>
 </div>
 </div>

 {request.latitude && request.longitude ? (
 <div className="border border-border rounded-2xl p-2 bg-card">
 <LiveTrackingMap 
 custLat={request.latitude} 
 custLng={request.longitude} 
 workerLat={request.worker_lat} 
 workerLng={request.worker_lng} 
 status={request.status} 
 />
 <div className="flex justify-between items-center mt-3 mb-2 px-2 text-xs">
 <span className="text-muted-foreground">
 موقع العميل: {request.latitude.toFixed(5)}, {request.longitude.toFixed(5)}
 </span>
 {request.worker_lat && (
 <span className="text-primary font-bold">
 موقع الفني: {request.worker_lat.toFixed(5)}, {request.worker_lng.toFixed(5)}
 </span>
 )}
 </div>
 </div>
 ) : (
 <div className="h-64 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-secondary/20">
 <MapPin size={48} className="mb-3 opacity-20" />
 <p>الإحداثيات الجغرافية غير متوفرة.</p>
 </div>
 )}
 </div>
 )}
 
 </div>
 
 </div>
 </div>
 );
}
