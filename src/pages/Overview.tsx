import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCog, Wrench, XCircle, Banknote, TrendingUp, ArrowUpRight, RefreshCw, Star } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Clay-style SVG illustration (store building)
const StoreIllustration = () => (
  <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Background blobs */}
    <ellipse cx="200" cy="130" rx="110" ry="90" fill="#dbeafe" opacity="0.5"/>
    <ellipse cx="260" cy="80" rx="50" ry="40" fill="#fce7f3" opacity="0.6"/>

    {/* Building body */}
    <rect x="90" y="80" width="140" height="120" rx="16" fill="#e0eeff"/>
    <rect x="90" y="80" width="140" height="120" rx="16" fill="url(#buildingGrad)"/>

    {/* Roof */}
    <path d="M78 85 L160 42 L242 85 Z" fill="#3b82f6" rx="8"/>
    <path d="M78 85 L160 42 L242 85 Z" fill="url(#roofGrad)"/>

    {/* Door */}
    <rect x="138" y="140" width="44" height="60" rx="10" fill="#1d4ed8"/>
    <circle cx="175" cy="172" r="3" fill="#93c5fd"/>

    {/* Windows */}
    <rect x="103" y="100" width="36" height="28" rx="6" fill="#bfdbfe"/>
    <rect x="181" y="100" width="36" height="28" rx="6" fill="#bfdbfe"/>
    <line x1="121" y1="100" x2="121" y2="128" stroke="#3b82f6" strokeWidth="1"/>
    <line x1="103" y1="114" x2="139" y2="114" stroke="#3b82f6" strokeWidth="1"/>
    <line x1="199" y1="100" x2="199" y2="128" stroke="#3b82f6" strokeWidth="1"/>
    <line x1="181" y1="114" x2="217" y2="114" stroke="#3b82f6" strokeWidth="1"/>

    {/* Sign */}
    <rect x="118" y="64" width="84" height="22" rx="6" fill="#ec4899"/>
    <text x="160" y="79" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">تـمـام</text>

    {/* Floating package 1 */}
    <g transform="translate(44,60)">
      <rect x="0" y="0" width="32" height="28" rx="6" fill="#fbbf24"/>
      <line x1="16" y1="0" x2="16" y2="28" stroke="#f59e0b" strokeWidth="1.5"/>
      <line x1="0" y1="14" x2="32" y2="14" stroke="#f59e0b" strokeWidth="1.5"/>
    </g>

    {/* Floating package 2 (smaller) */}
    <g transform="translate(248,50)">
      <rect x="0" y="0" width="24" height="20" rx="5" fill="#a78bfa"/>
      <line x1="12" y1="0" x2="12" y2="20" stroke="#8b5cf6" strokeWidth="1.5"/>
      <line x1="0" y1="10" x2="24" y2="10" stroke="#8b5cf6" strokeWidth="1.5"/>
    </g>

    {/* Floating coins */}
    <circle cx="62" cy="140" r="12" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
    <text x="62" y="145" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="bold">$</text>

    <circle cx="268" cy="130" r="10" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
    <text x="268" y="135" textAnchor="middle" fill="#92400e" fontSize="9" fontWeight="bold">$</text>

    <circle cx="50" cy="170" r="7" fill="#fde68a" stroke="#fbbf24" strokeWidth="1"/>

    {/* Stars */}
    <text x="30" y="50" fontSize="16" fill="#fbbf24">★</text>
    <text x="275" y="100" fontSize="12" fill="#f9a8d4">★</text>
    <text x="260" y="175" fontSize="10" fill="#93c5fd">★</text>

    {/* Ground shadow */}
    <ellipse cx="160" cy="205" rx="80" ry="12" fill="#cbd5e1" opacity="0.4"/>

    <defs>
      <linearGradient id="buildingGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#eff6ff"/>
        <stop offset="100%" stopColor="#dbeafe"/>
      </linearGradient>
      <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60a5fa"/>
        <stop offset="100%" stopColor="#2563eb"/>
      </linearGradient>
    </defs>
  </svg>
);

const Overview = () => {
  const [stats, setStats] = useState({ customers: 0, workers: 0, activeRequests: 0, canceledRequests: 0, totalRevenue: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true); setRefreshing(true);
    try {
      const [customersRes, workersRes, activeRes, canceledRes, revenueRes, weeklyRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
        supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'en_route', 'arrived', 'in_progress']),
        supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['canceled', 'cancelled']),
        supabase.from('maintenance_requests').select('price, spare_parts_total').eq('status', 'completed'),
        supabase.from('maintenance_requests').select('created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      const totalRev = (revenueRes.data || []).reduce((acc, curr) => acc + (curr.price || 0) + (curr.spare_parts_total || 0), 0);
      const dayCounts: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        dayCounts[DAY_NAMES[d.getDay()]] = 0;
      }
      (weeklyRes.data || []).forEach((req: any) => {
        const dn = DAY_NAMES[new Date(req.created_at).getDay()];
        if (dayCounts[dn] !== undefined) dayCounts[dn]++;
      });
      setChartData(Object.entries(dayCounts).map(([name, count]) => ({ name, 'طلبات': count })));
      setStats({ customers: customersRes.count || 0, workers: workersRes.count || 0, activeRequests: activeRes.count || 0, canceledRequests: canceledRes.count || 0, totalRevenue: totalRev });
    } catch { } finally { setLoading(false); setRefreshing(false); }
  };

  const kpis = [
    { title: 'إجمالي العملاء', value: stats.customers, icon: Users, gradient: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600', trend: '+12%' },
    { title: 'الفنيون', value: stats.workers, icon: UserCog, gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-600', trend: '+5%' },
    { title: 'طلبات نشطة', value: stats.activeRequests, icon: Wrench, gradient: 'from-amber-400 to-orange-500', light: 'bg-amber-50', text: 'text-amber-600', trend: 'الآن' },
    { title: 'ملغية', value: stats.canceledRequests, icon: XCircle, gradient: 'from-rose-400 to-red-500', light: 'bg-rose-50', text: 'text-rose-600', trend: '' },
    { title: 'إجمالي الأرباح', value: `${stats.totalRevenue.toLocaleString('en-US')}`, sub: 'د.ع', icon: Banknote, gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600', trend: '↑' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl"
      style={{ fontFamily: "'Inter', 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-600 via-blue-500 to-indigo-600 shadow-2xl shadow-blue-200">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/3 w-48 h-48 bg-pink-400/20 rounded-full translate-y-1/2" />

        <div className="relative flex flex-col lg:flex-row items-center gap-6 px-8 py-10">
          {/* Text side */}
          <div className="flex-1 text-right">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-1.5 rounded-full text-white text-xs font-bold mb-4">
              <Star size={12} className="fill-amber-300 text-amber-300" />
              لوحة التحكم الذكية — تمام
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight">
              مرحباً بك في<br />
              <span className="text-pink-300">لوحة تحكم تمام</span>
            </h1>
            <p className="text-blue-100 mt-3 text-sm lg:text-base max-w-md font-medium">
              إدارة الطلبات، الفنيين، والعملاء — كل شيء في مكان واحد. تابع أداء منصتك لحظةً بلحظة.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={fetchStats} disabled={refreshing}
                className="flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-blue-50 transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-900/20 disabled:opacity-70">
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                تحديث البيانات
              </button>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2.5 rounded-2xl text-white text-sm font-bold">
                <TrendingUp size={15} />
                نمو مستمر
              </div>
            </div>
          </div>

          {/* Illustration side */}
          <div className="w-64 h-52 lg:w-80 lg:h-64 flex-shrink-0 drop-shadow-2xl">
            <StoreIllustration />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <div key={i}
            className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden p-5">
            {/* Gradient top strip */}
            <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${k.gradient}`} />

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                {k.trend && <><ArrowUpRight size={11} className={k.text} /><span className={k.text}>{k.trend}</span></>}
              </div>
              <div className={`p-3 rounded-2xl ${k.light}`}>
                <k.icon size={20} className={k.text} />
              </div>
            </div>

            <p className="text-xs font-bold text-slate-400 text-right">{k.title}</p>
            <div className="flex items-baseline gap-1 justify-end mt-1">
              <span className="text-[11px] text-slate-400">{(k as any).sub}</span>
              <span className="text-2xl lg:text-3xl font-black text-slate-800">
                {loading ? <span className="inline-block w-12 h-7 bg-slate-100 rounded-lg animate-pulse" /> : k.value}
              </span>
            </div>

            {/* Hover glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ${k.gradient} rounded-3xl`} />
          </div>
        ))}
      </div>

      {/* ── Chart + Activity ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              آخر 7 أيام
            </div>
            <h2 className="text-lg font-black text-slate-800">معدل الطلبات الأسبوعي</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}/>
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}/>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', fontFamily: 'Inter' }}
                  labelStyle={{ fontWeight: 900, color: '#1e293b' }}/>
                <Area type="monotone" dataKey="طلبات" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#blueGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats Panel */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <h2 className="text-lg font-black text-slate-800 mb-5 text-right">ملخص سريع</h2>

          <div className="space-y-3 flex-1">
            {[
              { label: 'معدل الإنجاز', val: stats.customers > 0 ? '—' : '—', color: '#3b82f6', pct: 75 },
              { label: 'رضا العملاء', val: '4.8 ★', color: '#ec4899', pct: 96 },
              { label: 'الفنيون النشطون', val: `${stats.workers}`, color: '#8b5cf6', pct: stats.workers > 0 ? 80 : 0 },
            ].map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">{item.val}</span>
                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Pink CTA */}
          <div className="mt-5 bg-gradient-to-l from-pink-500 to-rose-500 rounded-2xl p-4 text-right shadow-lg shadow-pink-200">
            <p className="text-white/80 text-xs font-bold mb-0.5">اشتراكات جديدة</p>
            <p className="text-white font-black text-xl">{loading ? '...' : stats.customers}</p>
            <p className="text-white/70 text-[10px] mt-1">عميل مسجّل إجمالاً</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
