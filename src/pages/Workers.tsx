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
      const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'worker').order('created_at', { ascending: false });
      const [earningsRes, ratingsRes, completedRes, adminRatingsRes] = await Promise.all([
        supabase.from('earnings').select('worker_id, worker_earnings, app_fee, total_amount'),
        supabase.from('maintenance_requests').select('worker_id, rating').not('rating', 'is', null),
        supabase.from('maintenance_requests').select('worker_id').eq('status', 'completed'),
        supabase.from('admin_worker_reviews').select('worker_id, score'),
      ]);

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
      (completedRes.data || []).forEach((r: any) => { if (r.worker_id) completedMap[r.worker_id] = (completedMap[r.worker_id] || 0) + 1; });

      const adminRatingsMap: Record<string, { sum: number; count: number }> = {};
      (adminRatingsRes.data || []).forEach((r: any) => {
        if (!adminRatingsMap[r.worker_id]) adminRatingsMap[r.worker_id] = { sum: 0, count: 0 };
        adminRatingsMap[r.worker_id].sum += r.score;
        adminRatingsMap[r.worker_id].count += 1;
      });

      const enriched = (profiles || []).map(w => {
        const uid = w.user_id;
        const e = earningsMap[uid] || { earnings: 0, appFee: 0, total: 0, count: 0 };
        const r = ratingsMap[uid];
        const avgRating = r ? r.sum / r.count : 0;
        const ratingCount = r?.count || 0;
        const completedCount = completedMap[uid] || 0;
        const ar = adminRatingsMap[uid];
        const adminAvg = ar ? ar.sum / ar.count : 0;
        const adminCount = ar?.count || 0;
        let tier = 'برونزي'; let tierColor = 'bg-amber-100 text-amber-700';
        if (avgRating >= 4.5 && completedCount >= 10) { tier = 'ذهبي'; tierColor = 'bg-yellow-100 text-yellow-700'; }
        else if (avgRating >= 3.5 && completedCount >= 5) { tier = 'فضي'; tierColor = 'bg-slate-200 text-slate-700'; }
        return { ...w, totalEarnings: e.earnings, totalAppFee: e.appFee, totalRevenue: e.total, earningsCount: e.count, avgRating, ratingCount, completedCount, adminAvg, adminCount, combinedScore: Math.round(((avgRating + adminAvg) / 2) * 10 + completedCount), tier, tierColor, isVerified: !!w.national_id_url };
      });

      setWorkers(enriched);
      const allEarnings = enriched.reduce((s, w) => s + w.totalEarnings, 0);
      const allAppFees = enriched.reduce((s, w) => s + w.totalAppFee, 0);
      const allCompleted = enriched.reduce((s, w) => s + w.completedCount, 0);
      const allRatings = enriched.filter(w => w.ratingCount > 0);
      const globalAvg = allRatings.length > 0 ? allRatings.reduce((s, w) => s + w.avgRating, 0) / allRatings.length : 0;
      const pendingCount = enriched.filter(w => w.national_id_url && !w.isVerified).length;
      setStats({ total: enriched.length, totalEarnings: allEarnings, avgRating: Math.round(globalAvg * 10) / 10, completedJobs: allCompleted, totalAppFees: allAppFees, pendingVerification: pendingCount });
    } catch {} finally { setLoading(false); }
  };

  const specializations = [...new Set(workers.map(w => w.specialization).filter(Boolean))];

  const filtered = workers.filter(w => {
    const matchSearch = w.full_name?.toLowerCase().includes(search.toLowerCase()) || w.phone?.includes(search);
    const matchSpec = specFilter === 'all' || w.specialization === specFilter;
    const matchVerification = verificationFilter === 'all' ? true : verificationFilter === 'verified' ? w.isVerified : (w.national_id_url && !w.isVerified);
    return matchSearch && matchSpec && matchVerification;
  });

  const sorted = leaderboard ? [...filtered].sort((a, b) => b.combinedScore - a.combinedScore) : filtered;

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={12} className={i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
    ));

  const kpis = [
    { title: 'إجمالي الفنيين',  value: stats.total,                                             icon: UserCog,    from: 'from-violet-500', to: 'to-purple-600', light: 'bg-violet-50',  text: 'text-violet-600'  },
    { title: 'متوسط التقييم',   value: stats.avgRating > 0 ? `${stats.avgRating} ★` : '—',       icon: Star,        from: 'from-amber-400',  to: 'to-orange-500', light: 'bg-amber-50',   text: 'text-amber-600'   },
    { title: 'المهام المنجزة',  value: stats.completedJobs,                                     icon: CheckCircle, from: 'from-emerald-500',to: 'to-teal-600',   light: 'bg-emerald-50', text: 'text-emerald-600' },
    { title: 'أرباح الفنيين',   value: `${stats.totalEarnings.toLocaleString('en-US')} د.ع`,    icon: Banknote,    from: 'from-blue-500',   to: 'to-indigo-600', light: 'bg-blue-50',    text: 'text-blue-600'    },
    { title: 'عمولة التطبيق',   value: `${stats.totalAppFees.toLocaleString('en-US')} د.ع`,    icon: TrendingUp,  from: 'from-rose-400',   to: 'to-red-500',    light: 'bg-rose-50',    text: 'text-rose-600'    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">

      {/* ── Hero Strip ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-amber-500 to-orange-600 px-8 py-8 shadow-xl shadow-amber-200/40">
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-rose-400/20 rounded-full translate-y-1/2" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-amber-100 text-xs font-bold">👷 فريق العمل</span>
            <h1 className="text-3xl font-black text-white mt-1">إدارة الفنيين</h1>
            <p className="text-amber-100/80 mt-1 text-sm">متابعة الأداء، التقييمات، والأرباح</p>
          </div>
          <button onClick={() => setLeaderboard(v => !v)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex-shrink-0 ${
              leaderboard ? 'bg-white text-amber-600 shadow-lg' : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
            }`}>
            <Trophy size={16} /> {leaderboard ? 'المتصدرين 🏆' : 'لوحة المتصدرين'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden p-5">
            <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${k.from} ${k.to}`} />
            <div className={`w-10 h-10 rounded-2xl ${k.light} flex items-center justify-center mb-3`}>
              <k.icon size={18} className={k.text} />
            </div>
            <p className="text-[11px] font-bold text-slate-400">{k.title}</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">
              {loading ? <span className="inline-block w-12 h-5 bg-slate-100 rounded animate-pulse" /> : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          {(['all', 'verified', 'pending'] as const).map(f => (
            <button key={f} onClick={() => setVerificationFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all relative flex-1 ${verificationFilter === f ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {f === 'all' ? 'الكل' : f === 'verified' ? 'موثق' : 'انتظار التوثيق'}
              {f === 'pending' && stats.pendingVerification > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{stats.pendingVerification}</span>
              )}
            </button>
          ))}
        </div>
        {specializations.length > 0 && (
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <button onClick={() => setSpecFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${specFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}>كل التخصصات</button>
            {specializations.map(s => (
              <button key={s} onClick={() => setSpecFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${specFilter === s ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}>{s}</button>
            ))}
          </div>
        )}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="ابحث بالاسم أو الرقم..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 py-2.5 pr-10 pl-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-slate-800" />
        </div>
      </div>

      {/* ── Workers Table ── */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs">
              <tr>
                <th className="px-5 py-4 font-bold text-slate-500">الفني</th>
                <th className="px-5 py-4 font-bold text-slate-500 hidden sm:table-cell">التخصص</th>
                <th className="px-5 py-4 font-bold text-slate-500">التقييم</th>
                <th className="px-5 py-4 font-bold text-slate-500 hidden md:table-cell">الإدارة</th>
                <th className="px-5 py-4 font-bold text-slate-500 text-center hidden md:table-cell">الطلبات</th>
                <th className="px-5 py-4 font-bold text-slate-500 hidden lg:table-cell">الأرباح</th>
                <th className="px-5 py-4 font-bold text-slate-500 text-center hidden sm:table-cell">المستوى</th>
                <th className="px-5 py-4 font-bold text-slate-500 text-center">عرض</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-14 text-slate-400">جاري التحميل...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-14 text-slate-400">لا يوجد فنيين مطابقين.</td></tr>
              ) : sorted.map((w, idx) => (
                <tr key={w.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => setSelectedWorker(w)}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {leaderboard && <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>}
                      <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-700 font-black text-sm flex-shrink-0">
                        {w.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1">
                          {w.full_name}
                          {w.isVerified && <CheckCircle size={12} className="text-primary flex-shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{w.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{w.specialization || 'عام'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">{renderStars(w.avgRating)}<span className="text-[10px] text-slate-400">({w.ratingCount})</span></div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1">{renderStars(w.adminAvg)}<span className="text-[10px] text-slate-400">({w.adminCount})</span></div>
                  </td>
                  <td className="px-5 py-3.5 text-center hidden md:table-cell"><span className="font-black text-slate-800">{w.completedCount}</span></td>
                  <td className="px-5 py-3.5 hidden lg:table-cell"><p className="font-bold text-emerald-600 text-xs">{w.totalEarnings.toLocaleString('en-US')} د.ع</p></td>
                  <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${w.tierColor}`}>{w.tier}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={e => { e.stopPropagation(); setSelectedWorker(w); }} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div className="px-5 py-3 border-t border-slate-100 text-slate-400 text-xs font-bold">عرض {sorted.length} من {workers.length} فني {leaderboard && '— مرتب حسب الأداء 🏆'}</div>}
      </div>

      {selectedWorker && (
        <WorkerDetailsModal worker={selectedWorker} onClose={() => setSelectedWorker(null)} onVerifiedChange={fetchWorkers} />
      )}
    </div>
  );
};

export default Workers;
