import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Star, Banknote, UserCog, TrendingUp, CheckCircle, Eye, Trophy } from 'lucide-react';
import WorkerDetailsModal from '../components/WorkerDetailsModal';

const Workers = () => {
 const [workers, setWorkers] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [specFilter, setSpecFilter] = useState('all');
 const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'pending'>('all');
 const [selectedWorker, setSelectedWorker] = useState<any>(null);
 const [leaderboard, setLeaderboard] = useState(false);
 const [stats, setStats] = useState({ total: 0, totalEarnings: 0, avgRating: 0, completedJobs: 0, totalAppFees: 0, pendingVerification: 0 });

 useEffect(() => { fetchWorkers(); }, []);

 const fetchWorkers = async () => {
 setLoading(true);
 try {
  // 1. Fetch worker profiles
  const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'worker')
  .order('created_at', { ascending: false });

  // 2. Fetch all earnings, ratings, completed counts in parallel
   const [earningsRes, ratingsRes, completedRes, adminRatingsRes] = await Promise.all([
   supabase.from('earnings').select('worker_id, worker_earnings, app_fee, total_amount'),
   supabase.from('maintenance_requests').select('worker_id, rating').not('rating', 'is', null),
   supabase.from('maintenance_requests').select('worker_id').eq('status', 'completed'),
   supabase.from('admin_worker_reviews').select('worker_id, score'),
   ]);

  // Build maps
  const earningsMap: Record<string, { earnings: number; appFee: number; total: number; count: number }> = {};
  (earningsRes.data || []).forEach((e: any) => {
  if (!earningsMap[e.worker_id]) earningsMap[e.worker_id] = { earnings: 0, appFee: 0, total: 0, count: 0 };
  earningsMap[e.worker_id].earnings += e.worker_earnings || 0;
  earningsMap[e.worker_id].appFee += e.app_fee || 0;
  earningsMap[e.worker_id].total += e.total_amount || 0;
  earningsMap[e.worker_id].count += 1;
  });

  const ratingsMap: Record<string, { sum: number; count: number }> = {};
  (ratingsRes.data || []).forEach((r: any) => {
  if (!ratingsMap[r.worker_id]) ratingsMap[r.worker_id] = { sum: 0, count: 0 };
  ratingsMap[r.worker_id].sum += r.rating;
  ratingsMap[r.worker_id].count += 1;
  });

  const completedMap: Record<string, number> = {};
  (completedRes.data || []).forEach((r: any) => {
  if (r.worker_id) completedMap[r.worker_id] = (completedMap[r.worker_id] || 0) + 1;
   });

   const adminRatingsMap: Record<string, { sum: number; count: number }> = {};
   (adminRatingsRes.data || []).forEach((r: any) => {
   if (!adminRatingsMap[r.worker_id]) adminRatingsMap[r.worker_id] = { sum: 0, count: 0 };
   adminRatingsMap[r.worker_id].sum += r.score;
   adminRatingsMap[r.worker_id].count += 1;
   });

  // Enrich workers
  const enriched = (profiles || []).map(w => {
  const uid = w.user_id;
  const e = earningsMap[uid] || { earnings: 0, appFee: 0, total: 0, count: 0 };
  const r = ratingsMap[uid];
  const avgRating = r ? (r.sum / r.count) : 0;
  const ratingCount = r?.count || 0;
   const completedCount = completedMap[uid] || 0;
   const ar = adminRatingsMap[uid];
   const adminAvg = ar ? ar.sum / ar.count : 0;
   const adminCount = ar?.count || 0;

  // Performance tier
  let tier = 'برونزي';
  let tierColor = 'bg-amber-100 text-amber-700';
  if (avgRating >= 4.5 && completedCount >= 10) { tier = 'ذهبي'; tierColor = 'bg-yellow-100 text-yellow-700'; }
  else if (avgRating >= 3.5 && completedCount >= 5) { tier = 'فضي'; tierColor = 'bg-slate-200 text-slate-700'; }

   return {
    ...w,
    totalEarnings: e.earnings,
    totalAppFee: e.appFee,
    totalRevenue: e.total,
    earningsCount: e.count,
    avgRating,
    ratingCount,
    completedCount,
    adminAvg,
    adminCount,
    combinedScore: Math.round(((avgRating + adminAvg) / 2) * 10 + completedCount),
    tier,
    tierColor,
    isVerified: !!w.national_id_url,
   };
   });

  setWorkers(enriched);

  // Global stats
  const allEarnings = enriched.reduce((s, w) => s + w.totalEarnings, 0);
  const allAppFees = enriched.reduce((s, w) => s + w.totalAppFee, 0);
  const allCompleted = enriched.reduce((s, w) => s + w.completedCount, 0);
  const allRatings = enriched.filter(w => w.ratingCount > 0);
  const globalAvg = allRatings.length > 0 ? allRatings.reduce((s, w) => s + w.avgRating, 0) / allRatings.length : 0;
  const pendingCount = enriched.filter(w => w.national_id_url && !w.isVerified).length;

  setStats({
  total: enriched.length,
  totalEarnings: allEarnings,
  avgRating: Math.round(globalAvg * 10) / 10,
  completedJobs: allCompleted,
  totalAppFees: allAppFees,
  pendingVerification: pendingCount,
  });
 } catch {}
 finally { setLoading(false); }
 };

 // Unique specializations
 const specializations = [...new Set(workers.map(w => w.specialization).filter(Boolean))];

 const filtered = workers.filter(w => {
 const matchSearch = w.full_name?.toLowerCase().includes(search.toLowerCase()) || w.phone?.includes(search);
 const matchSpec = specFilter === 'all' || w.specialization === specFilter;
 const matchVerification = 
   verificationFilter === 'all' ? true :
   verificationFilter === 'verified' ? w.isVerified :
   (w.national_id_url && !w.isVerified); // Pending means has image but not verified
 
 return matchSearch && matchSpec && matchVerification;
  });

  // Leaderboard sort
  const sorted = leaderboard ? [...filtered].sort((a, b) => b.combinedScore - a.combinedScore) : filtered;

 const StatCard = ({ title, value, icon: Icon, color, sub }: any) => (
 <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
  <div className="flex items-center gap-3 mb-3">
  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
   <Icon size={20} />
  </div>
  <p className="text-xs font-bold text-slate-400">{title}</p>
  </div>
  <p className="text-2xl font-black text-slate-800">{loading ? '...' : value}</p>
  {sub && <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>}
 </div>
 );

 const renderStars = (rating: number) => {
 return Array.from({ length: 5 }, (_, i) => (
  <Star key={i} size={13} className={i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
 ));
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-500 font-sans RTL">
  {/* Header */}
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
  <div>
   <h1 className="text-3xl sm:text-4xl font-black text-slate-800">إدارة الفنيين</h1>
   <p className="text-slate-500 mt-1 font-medium text-sm">متابعة الأداء، التقييمات، والأرباح</p>
  </div>
   <button
    onClick={() => setLeaderboard(v => !v)}
    className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${leaderboard ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}
   >
    <Trophy size={16} /> {leaderboard ? 'المتصدرين 🏆' : 'لوحة المتصدرين'}
   </button>
  </div>

  {/* KPI Cards */}
  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
  <StatCard title="إجمالي الفنيين" value={stats.total} icon={UserCog} color="bg-purple-100 text-purple-600" />
  <StatCard title="متوسط التقييم" value={`${stats.avgRating} ⭐`} icon={Star} color="bg-amber-100 text-amber-600" />
  <StatCard title="الطلبات المنجزة" value={stats.completedJobs} icon={CheckCircle} color="bg-emerald-100 text-emerald-600" />
  <StatCard title="أرباح الفنيين" value={`${stats.totalEarnings.toLocaleString('en-US')}`} icon={Banknote} color="bg-blue-100 text-blue-600" sub="د.ع" />
  <StatCard title="عمولة التطبيق" value={`${stats.totalAppFees.toLocaleString('en-US')}`} icon={TrendingUp} color="bg-rose-100 text-rose-600" sub="د.ع (20%)" />
  </div>

  {/* Filters */}
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
  
  {/* Verification Filter */}
  <div className="flex bg-white p-1 rounded-xl border border-slate-200">
   <button onClick={() => setVerificationFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex-1 ${verificationFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>الكل</button>
   <button onClick={() => setVerificationFilter('verified')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex-1 ${verificationFilter === 'verified' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>موثق</button>
   <button onClick={() => setVerificationFilter('pending')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex-1 relative ${verificationFilter === 'pending' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
    بانتظار التوثيق
    {stats.pendingVerification > 0 && (
     <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white z-10">{stats.pendingVerification}</span>
    )}
   </button>
  </div>

  {specializations.length > 0 && (
   <div className="flex bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto">
   <button onClick={() => setSpecFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${specFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>كل التخصصات</button>
   {specializations.map(s => (
    <button key={s} onClick={() => setSpecFilter(s)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${specFilter === s ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{s}</button>
   ))}
   </div>
  )}
  <div className="relative flex-1 sm:max-w-xs ml-auto">
   <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
   <input type="text" placeholder="ابحث بالاسم أو الرقم..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-slate-200 py-2.5 pr-10 pl-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 text-slate-800" />
  </div>
  </div>

  {/* Workers Table */}
  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
   <table className="w-full text-right text-sm">
   <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
    <tr>
    <th className="px-4 sm:px-5 py-3.5 font-bold">الفني</th>
    <th className="px-4 sm:px-5 py-3.5 font-bold hidden sm:table-cell">التخصص</th>
    <th className="px-4 sm:px-5 py-3.5 font-bold">التقييم</th>
     <th className="px-4 sm:px-5 py-3.5 font-bold hidden md:table-cell">الإدارة</th>
     <th className="px-4 sm:px-5 py-3.5 font-bold text-center hidden md:table-cell">الطلبات</th>
    <th className="px-4 sm:px-5 py-3.5 font-bold hidden lg:table-cell">الأرباح</th>
    <th className="px-4 sm:px-5 py-3.5 font-bold text-center hidden sm:table-cell">المستوى</th>
    <th className="px-4 sm:px-5 py-3.5 font-bold text-center">عرض</th>
    </tr>
   </thead>
   <tbody className="divide-y divide-slate-100">
    {loading ? (
    <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">جاري تحميل البيانات...</td></tr>
     ) : sorted.length === 0 ? (
     <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">لا يوجد فنيين مطابقين.</td></tr>
     ) : (
     sorted.map((w, idx) => (
      <tr key={w.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedWorker(w)}>
      <td className="px-4 sm:px-5 py-3">
       <div className="flex items-center gap-2.5">
       {leaderboard && <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>}
       <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
       {w.full_name?.charAt(0) || '?'}
      </div>
      <div className="min-w-0">
       <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1">
       {w.full_name}
       {w.isVerified && <CheckCircle size={13} className="text-primary flex-shrink-0" />}
       </div>
       <div className="text-[10px] text-slate-400 dir-ltr text-right truncate">{w.phone}</div>
      </div>
      </div>
     </td>
     <td className="px-4 sm:px-5 py-3 hidden sm:table-cell">
      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{w.specialization || 'عام'}</span>
     </td>
     <td className="px-4 sm:px-5 py-3">
      <div className="flex items-center gap-1">
      {renderStars(w.avgRating)}
      <span className="text-[10px] text-slate-400 mr-1">({w.ratingCount})</span>
      </div>
      </td>
      <td className="px-4 sm:px-5 py-3 hidden md:table-cell">
       <div className="flex items-center gap-1">
       {renderStars(w.adminAvg)}
       <span className="text-[10px] text-slate-400 mr-1">({w.adminCount})</span>
       </div>
      </td>
      <td className="px-4 sm:px-5 py-3 text-center hidden md:table-cell">
      <span className="font-black text-slate-800 text-sm">{w.completedCount}</span>
     </td>
     <td className="px-4 sm:px-5 py-3 hidden lg:table-cell">
      <p className="font-bold text-emerald-600 text-xs">{w.totalEarnings.toLocaleString('en-US')} د.ع</p>
     </td>
     <td className="px-4 sm:px-5 py-3 text-center hidden sm:table-cell">
      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${w.tierColor}`}>{w.tier}</span>
     </td>
     <td className="px-4 sm:px-5 py-3 text-center">
      <button onClick={(e) => { e.stopPropagation(); setSelectedWorker(w); }} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
      <Eye size={16} />
      </button>
     </td>
     </tr>
    ))
    )}
   </tbody>
   </table>
  </div>
   {!loading && <div className="px-5 py-3 border-t border-slate-100 text-slate-400 text-xs font-bold">عرض {sorted.length} من {workers.length} فني {leaderboard && '— مرتب حسب الأداء 🏆'}</div>}
  </div>

  {/* Worker Details Modal */}
  {selectedWorker && (
  <WorkerDetailsModal
   worker={selectedWorker}
   onClose={() => setSelectedWorker(null)}
   onVerifiedChange={fetchWorkers}
  />
  )}
 </div>
 );
};

export default Workers;
