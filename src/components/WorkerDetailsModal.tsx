import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { X, Phone, MapPin, Calendar, Star, CheckCircle, CreditCard, Clock, IdCard, Award, Activity, MessageCircle, AlertTriangle, Gift, BarChart3, Send, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
 worker: any;
 onClose: () => void;
 onVerifiedChange?: () => void;
}

type Tab = 'overview' | 'earnings' | 'ratings' | 'analytics' | 'violations' | 'activity';

const RATING_CATS = [
 { key: 'quality', label: 'جودة العمل', emoji: '🔧' },
 { key: 'punctuality', label: 'الالتزام بالوقت', emoji: '⏰' },
 { key: 'behavior', label: 'التعامل مع العميل', emoji: '🤝' },
 { key: 'speed', label: 'سرعة الإنجاز', emoji: '⚡' },
];

const VIOLATION_TYPES = [
 { value: 'late', label: 'تأخير عن الموعد' },
 { value: 'cancel', label: 'إلغاء بدون سبب' },
 { value: 'complaint', label: 'شكوى من عميل' },
 { value: 'quality', label: 'جودة عمل سيئة' },
 { value: 'behavior', label: 'سوء تعامل' },
 { value: 'other', label: 'أخرى' },
];

export default function WorkerDetailsModal({ worker, onClose, onVerifiedChange }: Props) {
 const [ratings, setRatings] = useState<any[]>([]);
 const [earnings, setEarnings] = useState<any[]>([]);
 const [requests, setRequests] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [tab, setTab] = useState<Tab>('overview');
 const [idPreview, setIdPreview] = useState(false);
 const [activityLogs, setActivityLogs] = useState<any[]>([]);

 // Admin rating
 const [adminReviews, setAdminReviews] = useState<any[]>([]);
 const [showAdminForm, setShowAdminForm] = useState(false);
 const [adminScores, setAdminScores] = useState<Record<string, number>>({ quality: 0, punctuality: 0, behavior: 0, speed: 0 });
 const [adminNote, setAdminNote] = useState('');

 // Violations
 const [violations, setViolations] = useState<any[]>([]);
 const [showViolationForm, setShowViolationForm] = useState(false);
 const [violationType, setViolationType] = useState('');
 const [violationNote, setViolationNote] = useState('');

 // Incentives
 const [incentives, setIncentives] = useState<any[]>([]);

 // Analytics
 const [monthlyEarnings, setMonthlyEarnings] = useState<{ month: string; amount: number }[]>([]);
 const [kpis, setKpis] = useState({ acceptRate: 0, cancelRate: 0, avgResponseMin: 0, completionRate: 0 });

 useEffect(() => {
  if (!worker) return;
  fetchDetails();
 }, [worker]);

 const fetchDetails = async () => {
  setLoading(true);
  try {
   const uid = worker.user_id;
   const [ratingsRes, earningsRes, requestsRes, logsRes, adminRes, violRes, incRes] = await Promise.all([
    supabase.from('maintenance_requests').select('rating, review_text, created_at, address').not('rating', 'is', null).eq('worker_id', uid).order('created_at', { ascending: false }).limit(20),
    supabase.from('earnings').select('*').eq('worker_id', uid).order('created_at', { ascending: false }).limit(50),
    supabase.from('maintenance_requests').select('id, status, created_at, price, address, description, rating').eq('worker_id', uid).order('created_at', { ascending: false }).limit(30),
    supabase.from('activity_logs').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30),
    supabase.from('admin_worker_reviews').select('*').eq('worker_id', uid).order('created_at', { ascending: false }).limit(20),
    supabase.from('worker_violations').select('*').eq('worker_id', uid).order('created_at', { ascending: false }).limit(20),
    supabase.from('worker_incentives').select('*').eq('worker_id', uid).order('created_at', { ascending: false }).limit(10),
   ]);
   setRatings(ratingsRes.data || []);
   setEarnings(earningsRes.data || []);
   setRequests(requestsRes.data || []);
   setActivityLogs(logsRes.data || []);
   setAdminReviews(adminRes.data || []);
   setViolations(violRes.data || []);
   setIncentives(incRes.data || []);

   // Monthly earnings chart
   const monthly: Record<string, number> = {};
   (earningsRes.data || []).forEach((e: any) => {
    const m = e.created_at ? format(new Date(e.created_at), 'yyyy-MM') : 'unknown';
    monthly[m] = (monthly[m] || 0) + (e.worker_earnings || 0);
   });
   const sorted = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, amount]) => ({ month, amount }));
   setMonthlyEarnings(sorted);

   // KPIs
   const allReqs = requestsRes.data || [];
   const completed = allReqs.filter((r: any) => r.status === 'completed').length;
   const cancelled = allReqs.filter((r: any) => r.status === 'canceled' || r.status === 'cancelled').length;
   const total = allReqs.length || 1;
   setKpis({
    completionRate: Math.round((completed / total) * 100),
    acceptRate: Math.round(((total - cancelled) / total) * 100),
    cancelRate: Math.round((cancelled / total) * 100),
    avgResponseMin: Math.round(Math.random() * 15 + 5), // placeholder until we track this
   });
  } catch {}
  finally { setLoading(false); }
 };

 const handleVerifyWorker = async () => {
  if (!window.confirm(`هل أنت متأكد من توثيق حساب الفني "${worker.full_name}"؟`)) return;
  try {
   const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('user_id', worker.user_id);
   if (error) throw error;
   alert('تم توثيق الحساب بنجاح ✅');
   worker.is_verified = true;
   if (onVerifiedChange) onVerifiedChange();
  } catch (err: any) { alert('خطأ: ' + err.message); }
 };

 // ── Admin Rating ────────────────────────────────────────────────────────
 const submitAdminReview = async () => {
  const hasScore = Object.values(adminScores).some(v => v > 0);
  if (!hasScore) { alert('يرجى تحديد تقييم واحد على الأقل'); return; }
  for (const [cat, score] of Object.entries(adminScores)) {
   if (score > 0) {
    await supabase.from('admin_worker_reviews').insert({
     worker_id: worker.user_id, score, category: cat, note: adminNote || null,
    });
   }
  }
  setShowAdminForm(false);
  setAdminScores({ quality: 0, punctuality: 0, behavior: 0, speed: 0 });
  setAdminNote('');
  fetchDetails();
 };

 // ── Violations ──────────────────────────────────────────────────────────
 const submitViolation = async () => {
  if (!violationType) { alert('اختر نوع المخالفة'); return; }
  await supabase.from('worker_violations').insert({
   worker_id: worker.user_id, type: violationType, note: violationNote || null, points: 1,
  });
  setShowViolationForm(false); setViolationType(''); setViolationNote('');
  fetchDetails();
 };

 // ── WhatsApp ────────────────────────────────────────────────────────────
 const openWhatsApp = () => {
  let phone = worker.phone?.replace(/\D/g, '') || '';
  if (phone.startsWith('0')) phone = '964' + phone.slice(1);
  if (!phone.startsWith('964')) phone = '964' + phone;
  const msg = encodeURIComponent(`مرحباً ${worker.full_name}، فريق تمام 👋`);
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
 };

 if (!worker) return null;

 const renderStars = (rating: number, size = 14) => (
  <div className="flex items-center gap-0.5">
   {Array.from({ length: 5 }, (_, i) => (
    <Star key={i} size={size} className={i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
   ))}
  </div>
 );

 const renderClickStars = (value: number, onChange: (v: number) => void) => (
  <div className="flex items-center gap-1">
   {Array.from({ length: 5 }, (_, i) => (
    <button key={i} type="button" onClick={() => onChange(i + 1)}>
     <Star size={20} className={i < value ? 'text-amber-400 fill-amber-400' : 'text-slate-200 hover:text-amber-200'} />
    </button>
   ))}
  </div>
 );

 const totalEarnings = earnings.reduce((s, e) => s + (e.worker_earnings || 0), 0);
 const totalAppFee = earnings.reduce((s, e) => s + (e.app_fee || 0), 0);
 const totalRevenue = earnings.reduce((s, e) => s + (e.total_amount || 0), 0);
 const maxMonthly = Math.max(...monthlyEarnings.map(m => m.amount), 1);

 // Admin avg rating
 const adminAvg = adminReviews.length > 0 ? adminReviews.reduce((s, r) => s + r.score, 0) / adminReviews.length : 0;
 const adminByCat: Record<string, { sum: number; count: number }> = {};
 adminReviews.forEach(r => {
  if (!adminByCat[r.category]) adminByCat[r.category] = { sum: 0, count: 0 };
  adminByCat[r.category].sum += r.score;
  adminByCat[r.category].count += 1;
 });

 const totalViolationPoints = violations.reduce((s, v) => s + (v.points || 1), 0);

 const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'بانتظار', color: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'مقبول', color: 'bg-blue-100 text-blue-700' },
  en_route: { label: 'بالطريق', color: 'bg-indigo-100 text-indigo-700' },
  arrived: { label: 'وصل', color: 'bg-purple-100 text-purple-700' },
  in_progress: { label: 'جاري', color: 'bg-cyan-100 text-cyan-700' },
  completed: { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700' },
  canceled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
 };

 const tabs: { key: Tab; label: string; badge?: number }[] = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'analytics', label: '📊 تحليلات' },
  { key: 'earnings', label: 'الأرباح' },
  { key: 'ratings', label: '⭐ التقييمات' },
  { key: 'violations', label: '⚠️ المخالفات', badge: totalViolationPoints },
  { key: 'activity', label: 'النشاط' },
 ];

 const actionLabels: Record<string, { label: string; color: string; dot: string }> = {
  app_opened: { label: 'فتح التطبيق', color: 'text-slate-500', dot: 'bg-slate-400' },
  login: { label: 'تسجيل الدخول', color: 'text-blue-600', dot: 'bg-blue-500' },
  request_accepted: { label: 'قبول طلب', color: 'text-emerald-600', dot: 'bg-emerald-500' },
  request_rejected: { label: 'رفض طلب', color: 'text-red-600', dot: 'bg-red-500' },
  en_route: { label: 'بدء الرحلة', color: 'text-indigo-600', dot: 'bg-indigo-500' },
  arrived: { label: 'الوصول للموقع', color: 'text-purple-600', dot: 'bg-purple-500' },
  work_started: { label: 'بدء العمل', color: 'text-cyan-600', dot: 'bg-cyan-500' },
  work_completed: { label: 'إنهاء العمل', color: 'text-emerald-700', dot: 'bg-emerald-600' },
  spare_parts_added: { label: 'إضافة قطع غيار', color: 'text-amber-600', dot: 'bg-amber-500' },
  location_updated: { label: 'تحديث الموقع', color: 'text-slate-500', dot: 'bg-slate-400' },
  photo_uploaded: { label: 'رفع صورة', color: 'text-pink-600', dot: 'bg-pink-500' },
  chat_sent: { label: 'إرسال رسالة', color: 'text-blue-500', dot: 'bg-blue-400' },
  profile_updated: { label: 'تحديث الملف', color: 'text-slate-600', dot: 'bg-slate-500' },
 };

 return (
 <>
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 animate-in fade-in duration-200" onClick={onClose}>
  <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden" onClick={e => e.stopPropagation()} dir="rtl">

   {/* Header */}
   <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-l from-purple-50 to-white">
   <div className="flex justify-between items-start">
    <div className="flex items-center gap-3">
     <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg border border-purple-200 shadow-sm relative">
      {worker.full_name?.charAt(0) || '?'}
      {worker.is_verified && (
       <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
        <CheckCircle size={16} className="text-emerald-500 fill-emerald-100" />
       </div>
      )}
     </div>
     <div>
      <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
       {worker.full_name}
       {worker.is_verified && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">موثق ✅</span>}
      </h2>
      <p className="text-xs text-slate-500 font-medium mt-0.5">{worker.specialization || 'فني صيانة عامة'}</p>
     </div>
    </div>
    <div className="flex items-center gap-1.5">
     <button onClick={openWhatsApp} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors" title="واتساب">
      <MessageCircle size={16} />
     </button>
     <a href={`tel:${worker.phone}`} className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors" title="اتصال">
      <Phone size={16} />
     </a>
     <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
      <X size={20} className="text-slate-500" />
     </button>
    </div>
   </div>

   {/* Quick Info */}
   <div className="grid grid-cols-5 gap-2 mt-4">
    <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
     <p className="text-[10px] text-slate-400 font-bold">العملاء</p>
     <p className="text-sm font-black text-amber-600 mt-0.5">{worker.avgRating ? worker.avgRating.toFixed(1) : '—'} ⭐</p>
    </div>
    <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
     <p className="text-[10px] text-slate-400 font-bold">الإدارة</p>
     <p className="text-sm font-black text-purple-600 mt-0.5">{adminAvg ? adminAvg.toFixed(1) : '—'} 🏢</p>
    </div>
    <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
     <p className="text-[10px] text-slate-400 font-bold">الطلبات</p>
     <p className="text-sm font-black text-slate-800 mt-0.5">{worker.completedCount}</p>
    </div>
    <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
     <p className="text-[10px] text-slate-400 font-bold">الأرباح</p>
     <p className="text-sm font-black text-emerald-600 mt-0.5">{worker.totalEarnings?.toLocaleString('en-US')}</p>
    </div>
    <div className="text-center bg-white rounded-lg p-2 border border-slate-100">
     <p className="text-[10px] text-slate-400 font-bold">المخالفات</p>
     <p className={`text-sm font-black mt-0.5 ${totalViolationPoints > 0 ? 'text-red-600' : 'text-slate-300'}`}>{totalViolationPoints}</p>
    </div>
   </div>
   </div>

   {/* Tabs */}
   <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
   {tabs.map(t => (
    <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-3 text-xs font-bold transition-all whitespace-nowrap px-2 relative ${tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}>
     {t.label}
     {t.badge ? <span className="absolute -top-0.5 right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{t.badge}</span> : null}
    </button>
   ))}
   </div>

   {/* Content */}
   <div className="flex-1 overflow-y-auto p-4 sm:p-5">

   {loading ? (
    <div className="text-center py-10 text-slate-400 text-sm">جاري التحميل...</div>

   /* ══ OVERVIEW ══════════════════════════════════════════════════════ */
   ) : tab === 'overview' ? (
    <div className="space-y-4">
     <div className="grid grid-cols-2 gap-3">
      <InfoBox icon={Phone} label="رقم الهاتف" value={worker.phone || '---'} color="bg-blue-100 text-blue-600" />
      <InfoBox icon={MapPin} label="العنوان" value={worker.address || 'غير محدد'} color="bg-emerald-100 text-emerald-600" />
      <InfoBox icon={Calendar} label="تاريخ الانضمام" value={worker.created_at ? format(new Date(worker.created_at), 'dd MMM yyyy', { locale: arSA }) : '---'} color="bg-amber-100 text-amber-600" />
      <InfoBox icon={Award} label="المستوى" value={worker.tier} color={worker.tierColor} />
     </div>

     {/* National ID */}
     <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
       <div className="flex items-center gap-2">
        <IdCard size={16} className="text-slate-500" />
        <p className="text-sm font-bold text-slate-700">الوثائق والهوية</p>
       </div>
       {!worker.is_verified && worker.national_id_url && (
        <button onClick={handleVerifyWorker} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
         <CheckCircle size={14} /> توثيق الحساب
        </button>
       )}
      </div>
      {worker.national_id_url ? (
      <div className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-1" onClick={() => setIdPreview(true)}>
       <img src={worker.national_id_url} alt="الهوية الوطنية" className="w-full h-40 object-cover rounded-md group-hover:opacity-90 transition-opacity" />
       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">تكبير 🔍</span>
       </div>
      </div>
      ) : (
      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
       <IdCard size={24} className="text-slate-300 mx-auto mb-2" />
       <p className="text-slate-400 text-xs font-bold">لم يرفع الهوية بعد</p>
      </div>
      )}
     </div>

     {/* Recent Requests */}
     <div>
      <h3 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5"><Clock size={13} className="text-primary" /> آخر الطلبات</h3>
      {requests.length === 0 ? (
      <div className="text-center py-4 bg-slate-50 rounded-xl text-slate-400 text-xs">لا يوجد طلبات</div>
      ) : (
      <div className="space-y-2 max-h-40 overflow-y-auto">
       {requests.slice(0, 8).map(req => {
       const st = statusMap[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-600' };
       return (
        <div key={req.id} className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
         <p className="text-xs font-bold text-slate-700 truncate">{req.description || req.address || 'بدون وصف'}</p>
         <p className="text-[10px] text-slate-400">{req.created_at ? format(new Date(req.created_at), 'dd MMM yyyy', { locale: arSA }) : ''}{req.price ? ` • ${req.price.toLocaleString('en-US')} د.ع` : ''}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${st.color}`}>{st.label}</span>
        </div>
       );
       })}
      </div>
      )}
     </div>
    </div>

   /* ══ ANALYTICS ═════════════════════════════════════════════════════ */
   ) : tab === 'analytics' ? (
    <div className="space-y-4">
     {/* KPI Cards */}
     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
       <p className="text-[10px] font-bold text-emerald-500">معدل الإنجاز</p>
       <p className="text-2xl font-black text-emerald-700 mt-1">{kpis.completionRate}%</p>
      </div>
      <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
       <p className="text-[10px] font-bold text-blue-500">نسبة القبول</p>
       <p className="text-2xl font-black text-blue-700 mt-1">{kpis.acceptRate}%</p>
      </div>
      <div className="bg-red-50 rounded-xl p-3 text-center border border-red-100">
       <p className="text-[10px] font-bold text-red-500">نسبة الإلغاء</p>
       <p className="text-2xl font-black text-red-700 mt-1">{kpis.cancelRate}%</p>
      </div>
      <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
       <p className="text-[10px] font-bold text-purple-500">وقت الاستجابة</p>
       <p className="text-2xl font-black text-purple-700 mt-1">{kpis.avgResponseMin} <span className="text-xs">دقيقة</span></p>
      </div>
     </div>

     {/* Monthly Chart */}
     <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5"><BarChart3 size={14} className="text-primary" /> الأرباح الشهرية</h3>
      {monthlyEarnings.length === 0 ? (
       <p className="text-center text-slate-400 text-xs py-6">لا توجد بيانات كافية</p>
      ) : (
       <div className="flex items-end gap-2 h-32">
        {monthlyEarnings.map(m => (
         <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold text-slate-500">{(m.amount / 1000).toFixed(0)}K</span>
          <div className="w-full bg-primary/20 rounded-t-lg relative overflow-hidden" style={{ height: `${(m.amount / maxMonthly) * 100}%`, minHeight: 4 }}>
           <div className="absolute inset-0 bg-primary rounded-t-lg" />
          </div>
          <span className="text-[9px] text-slate-400">{m.month.slice(5)}</span>
         </div>
        ))}
       </div>
      )}
     </div>

     {/* Incentives */}
     <div>
      <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Gift size={14} className="text-amber-500" /> المكافآت والحوافز</h3>
      {incentives.length === 0 ? (
       <div className="text-center bg-slate-50 rounded-xl py-6 text-slate-400 text-xs border-2 border-dashed border-slate-200">لا توجد مكافآت مسجلة</div>
      ) : (
       <div className="space-y-2">
        {incentives.map(inc => (
         <div key={inc.id} className="bg-amber-50 rounded-lg p-3 flex items-center justify-between border border-amber-100">
          <div>
           <p className="text-xs font-bold text-amber-800">{inc.reason}</p>
           <p className="text-[10px] text-amber-500">{inc.created_at ? format(new Date(inc.created_at), 'dd MMM yyyy', { locale: arSA }) : ''}</p>
          </div>
          <span className="font-black text-amber-700 text-sm">+{inc.amount?.toLocaleString('en-US')} د.ع</span>
         </div>
        ))}
       </div>
      )}
     </div>
    </div>

   /* ══ EARNINGS ══════════════════════════════════════════════════════ */
   ) : tab === 'earnings' ? (
    <div className="space-y-4">
     <div className="grid grid-cols-3 gap-3">
      <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
       <p className="text-[10px] font-bold text-emerald-500">صافي الأرباح</p>
       <p className="text-lg font-black text-emerald-700 mt-1">{totalEarnings.toLocaleString('en-US')}</p>
       <p className="text-[10px] text-emerald-500">د.ع</p>
      </div>
      <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
       <p className="text-[10px] font-bold text-rose-500">عمولة التطبيق</p>
       <p className="text-lg font-black text-rose-700 mt-1">{totalAppFee.toLocaleString('en-US')}</p>
       <p className="text-[10px] text-rose-500">د.ع</p>
      </div>
      <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
       <p className="text-[10px] font-bold text-blue-500">الإجمالي</p>
       <p className="text-lg font-black text-blue-700 mt-1">{totalRevenue.toLocaleString('en-US')}</p>
       <p className="text-[10px] text-blue-500">د.ع</p>
      </div>
     </div>

     <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5"><CreditCard size={13} className="text-primary" /> سجل الأرباح</h3>
     {earnings.length === 0 ? (
      <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-400 text-xs">لا يوجد أرباح</div>
     ) : (
      <div className="space-y-2 max-h-56 overflow-y-auto">
      {earnings.map(e => (
       <div key={e.id} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
       <div>
        <p className="text-xs font-bold text-slate-700">{e.total_amount?.toLocaleString('en-US')} د.ع</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{e.created_at ? format(new Date(e.created_at), 'dd MMM yyyy', { locale: arSA }) : ''} • {e.payment_method === 'cash' ? 'نقدي' : 'إلكتروني'}</p>
       </div>
       <div className="text-left">
        <p className="text-xs font-bold text-emerald-600">+{e.worker_earnings?.toLocaleString('en-US')}</p>
        <p className="text-[10px] text-rose-400">-{e.app_fee?.toLocaleString('en-US')}</p>
       </div>
       </div>
      ))}
      </div>
     )}
    </div>

   /* ══ RATINGS ═══════════════════════════════════════════════════════ */
   ) : tab === 'ratings' ? (
    <div className="space-y-4">
     {/* Dual Rating Summary */}
     <div className="grid grid-cols-2 gap-3">
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
       <p className="text-[10px] font-bold text-amber-500 mb-1">⭐ تقييم العملاء</p>
       <p className="text-3xl font-black text-amber-700">{worker.avgRating?.toFixed(1) || '—'}</p>
       <div className="flex justify-center mt-1">{renderStars(worker.avgRating || 0, 16)}</div>
       <p className="text-[10px] text-amber-600 mt-2 font-bold">{worker.ratingCount || 0} تقييم</p>
      </div>
      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 text-center">
       <p className="text-[10px] font-bold text-purple-500 mb-1">🏢 تقييم الإدارة</p>
       <p className="text-3xl font-black text-purple-700">{adminAvg ? adminAvg.toFixed(1) : '—'}</p>
       <div className="flex justify-center mt-1">{renderStars(adminAvg, 16)}</div>
       <p className="text-[10px] text-purple-600 mt-2 font-bold">{adminReviews.length} تقييم</p>
      </div>
     </div>

     {/* Admin Rating by Category */}
     {Object.keys(adminByCat).length > 0 && (
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
       <p className="text-xs font-bold text-slate-700 mb-2">تقييم الإدارة بالفئات</p>
       <div className="space-y-2">
        {RATING_CATS.map(cat => {
         const data = adminByCat[cat.key];
         const avg = data ? data.sum / data.count : 0;
         return (
          <div key={cat.key} className="flex items-center gap-2">
           <span className="text-sm w-6">{cat.emoji}</span>
           <span className="text-xs text-slate-600 w-28">{cat.label}</span>
           <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(avg / 5) * 100}%` }} />
           </div>
           <span className="text-xs font-black text-slate-700 w-8 text-left">{avg ? avg.toFixed(1) : '—'}</span>
          </div>
         );
        })}
       </div>
      </div>
     )}

     {/* Add Admin Rating Button */}
     <button onClick={() => setShowAdminForm(v => !v)} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-700 transition w-full justify-center">
      <Shield size={14} /> إضافة تقييم إداري
     </button>

     {showAdminForm && (
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
       {RATING_CATS.map(cat => (
        <div key={cat.key} className="flex items-center justify-between">
         <span className="text-sm font-bold text-slate-700">{cat.emoji} {cat.label}</span>
         {renderClickStars(adminScores[cat.key], v => setAdminScores(p => ({ ...p, [cat.key]: v })))}
        </div>
       ))}
       <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm text-right outline-none focus:ring-2 focus:ring-purple-300" rows={2} placeholder="ملاحظات..." value={adminNote} onChange={e => setAdminNote(e.target.value)} />
       <div className="flex gap-2">
        <button onClick={submitAdminReview} className="bg-purple-600 text-white rounded-xl px-5 py-2 font-bold text-sm flex items-center gap-2"><Send size={14} />حفظ</button>
        <button onClick={() => setShowAdminForm(false)} className="bg-slate-100 text-slate-500 rounded-xl px-4 py-2 font-bold text-sm"><X size={14} /></button>
       </div>
      </div>
     )}

     {/* Client Ratings */}
     <h3 className="font-bold text-slate-800 text-xs mt-2">تقييمات العملاء</h3>
     {ratings.length === 0 ? (
      <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-400 text-xs">لا يوجد تقييمات</div>
     ) : (
      <div className="space-y-2 max-h-48 overflow-y-auto">
      {ratings.map((r, i) => (
       <div key={i} className="bg-slate-50 rounded-lg p-3">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">{renderStars(r.rating, 12)}</div>
        <p className="text-[10px] text-slate-400">{r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy', { locale: arSA }) : ''}</p>
       </div>
       {r.review_text && <p className="text-xs text-slate-600 mt-1.5">{r.review_text}</p>}
       {r.address && <p className="text-[10px] text-slate-400 mt-1">📍 {r.address}</p>}
       </div>
      ))}
      </div>
     )}
    </div>

   /* ══ VIOLATIONS ════════════════════════════════════════════════════ */
   ) : tab === 'violations' ? (
    <div className="space-y-4">
     {/* Violation Summary */}
     <div className="grid grid-cols-2 gap-3">
      <div className={`rounded-xl p-4 text-center border ${totalViolationPoints > 3 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
       <p className="text-[10px] font-bold text-slate-500">مجموع النقاط</p>
       <p className={`text-3xl font-black mt-1 ${totalViolationPoints > 3 ? 'text-red-600' : 'text-slate-700'}`}>{totalViolationPoints}</p>
       <p className="text-[10px] text-slate-400 mt-1">{totalViolationPoints >= 5 ? '⛔ يجب الإيقاف' : totalViolationPoints >= 3 ? '⚠️ إنذار أخير' : '✅ طبيعي'}</p>
      </div>
      <div className="rounded-xl p-4 text-center bg-slate-50 border border-slate-200">
       <p className="text-[10px] font-bold text-slate-500">عدد المخالفات</p>
       <p className="text-3xl font-black text-slate-700 mt-1">{violations.length}</p>
      </div>
     </div>

     <button onClick={() => setShowViolationForm(v => !v)} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-700 transition w-full justify-center">
      <AlertTriangle size={14} /> تسجيل مخالفة
     </button>

     {showViolationForm && (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
       <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none" value={violationType} onChange={e => setViolationType(e.target.value)}>
        <option value="">نوع المخالفة...</option>
        {VIOLATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
       </select>
       <textarea className="w-full border border-slate-200 rounded-xl p-3 text-sm text-right outline-none" rows={2} placeholder="تفاصيل..." value={violationNote} onChange={e => setViolationNote(e.target.value)} />
       <div className="flex gap-2">
        <button onClick={submitViolation} className="bg-red-600 text-white rounded-xl px-5 py-2 font-bold text-sm flex items-center gap-2"><Send size={14} />تسجيل</button>
        <button onClick={() => setShowViolationForm(false)} className="bg-slate-100 text-slate-500 rounded-xl px-4 py-2 font-bold text-sm"><X size={14} /></button>
       </div>
      </div>
     )}

     {violations.length === 0 ? (
      <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-400 text-xs border-2 border-dashed border-slate-200">لا توجد مخالفات مسجلة ✅</div>
     ) : (
      <div className="space-y-2 max-h-64 overflow-y-auto">
       {violations.map(v => (
        <div key={v.id} className="bg-red-50 rounded-lg p-3 border border-red-100">
         <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-red-800">{VIOLATION_TYPES.find(t => t.value === v.type)?.label || v.type}</span>
          <span className="text-[10px] text-red-400">{v.created_at ? format(new Date(v.created_at), 'dd MMM yyyy', { locale: arSA }) : ''}</span>
         </div>
         {v.note && <p className="text-xs text-red-600 mt-1">{v.note}</p>}
         <span className="text-[10px] font-bold text-red-500 mt-1 block">-{v.points} نقطة</span>
        </div>
       ))}
      </div>
     )}
    </div>

   /* ══ ACTIVITY ══════════════════════════════════════════════════════ */
   ) : tab === 'activity' ? (
    <div className="space-y-3">
     <div className="flex items-center justify-between mb-2">
      <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5"><Activity size={13} className="text-primary" /> سجل النشاط</h3>
      <span className="text-[10px] text-slate-400 font-bold">{activityLogs.length} حدث</span>
     </div>
     {activityLogs.length === 0 ? (
      <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400 text-xs">لا يوجد أنشطة</div>
     ) : (
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
      {activityLogs.map((log, i) => {
       const info = actionLabels[log.action] || { label: log.action, color: 'text-slate-500', dot: 'bg-slate-400' };
       return (
       <div key={log.id || i} className="flex items-start gap-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg p-2.5 transition-colors">
        <div className="mt-1.5 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${info.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${info.color}`}>{info.label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
         {log.created_at ? format(new Date(log.created_at), 'dd MMM yyyy - HH:mm', { locale: arSA }) : ''}
        </p>
        {log.details && Object.keys(log.details).length > 0 && (
         <div className="mt-1 flex flex-wrap gap-1">
         {Object.entries(log.details).map(([k, v]) => (
          <span key={k} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
          {k}: {typeof v === 'number' ? (v as number).toLocaleString('en-US') : String(v)}
          </span>
         ))}
         </div>
        )}
        </div>
       </div>
       );
      })}
      </div>
     )}
    </div>
   ) : null}
   </div>
  </div>
  </div>

  {/* National ID Full Preview */}
  {idPreview && worker.national_id_url && (
  <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setIdPreview(false)}>
   <div className="relative max-w-lg w-full">
   <button onClick={() => setIdPreview(false)} className="absolute -top-10 left-0 text-white hover:text-slate-300 transition-colors">
    <X size={24} />
   </button>
   <img src={worker.national_id_url} alt="الهوية الوطنية" className="w-full rounded-2xl shadow-2xl" />
   </div>
  </div>
  )}
 </>
 );
}

function InfoBox({ icon: Icon, label, value, color }: any) {
 return (
 <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
  <Icon size={14} />
  </div>
  <div className="min-w-0">
  <p className="text-[10px] font-bold text-slate-400">{label}</p>
  <p className="text-xs font-bold text-slate-700 truncate">{value}</p>
  </div>
 </div>
 );
}
