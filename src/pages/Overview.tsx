import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCog, Wrench, XCircle, Banknote } from 'lucide-react';
import { 
 AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const Overview = () => {
 const [stats, setStats] = useState({
 customers: 0,
 workers: 0,
 activeRequests: 0,
 canceledRequests: 0,
 totalRevenue: 0,
 });

 const [chartData, setChartData] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetchStats();
 }, []);

 const fetchStats = async () => {
 setLoading(true);
 try {
 // Run all queries in parallel for better performance
 const [customersRes, workersRes, activeRes, canceledRes, revenueRes, weeklyRes] = await Promise.all([
 supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
 supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'worker'),
 supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['pending', 'accepted', 'en_route', 'arrived', 'in_progress']),
 supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).in('status', ['canceled', 'cancelled']),
 supabase.from('maintenance_requests').select('price, spare_parts_total').eq('status', 'completed'),
 supabase.from('maintenance_requests').select('created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
 ]);

 const totalRev = (revenueRes.data || []).reduce((acc, curr) => acc + (curr.price || 0) + (curr.spare_parts_total || 0), 0);

 // Build weekly chart data from real requests
 const dayCounts: Record<string, number> = {};
 for (let i = 6; i >= 0; i--) {
 const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
 const dayName = DAY_NAMES[date.getDay()];
 dayCounts[dayName] = 0;
 }
 (weeklyRes.data || []).forEach((req: any) => {
 const dayName = DAY_NAMES[new Date(req.created_at).getDay()];
 if (dayCounts[dayName] !== undefined) dayCounts[dayName]++;
 });
 setChartData(Object.entries(dayCounts).map(([name, count]) => ({ name, 'طلبات': count })));

 setStats({
 customers: customersRes.count || 0,
 workers: workersRes.count || 0,
 activeRequests: activeRes.count || 0,
 canceledRequests: canceledRes.count || 0,
 totalRevenue: totalRev,
 });
 } catch (error) {
 // silently fail
 } finally {
 setLoading(false);
 }
 };

 const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all">
 <div className="flex justify-between items-start mb-4">
 <div className={`p-4 rounded-2xl ${colorClass} bg-white border border-slate-200 `}>
 <Icon size={28} />
 </div>
 </div>
 <div>
 <h3 className="text-muted-foreground text-sm font-bold">{title}</h3>
 <p className="text-3xl font-black text-foreground mt-1">
 {loading ? '...' : value}
 </p>
 </div>
 </div>
 );

 return (
 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans RTL">
 
 <div className="flex justify-between items-center mb-8 relative z-10">
 <div>
 <h1 className="text-4xl font-black text-slate-800 ">نظرة عامة</h1>
 <p className="text-slate-600 mt-2 font-medium">إحصائيات التطبيق والأداء المالي</p>
 </div>
 <button onClick={fetchStats} className="bg-white border border-slate-200 shadow-sm text-primary hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold transition-all hover:-translate-y-0.5">
 تحديث البيانات
 </button>
 </div>

 {/* KPI Cards Grid */}
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
 <StatCard 
 title="إجمالي العملاء" 
 value={stats.customers} 
 icon={Users} 
 colorClass="bg-blue-500/10 text-blue-500 border border-blue-500/20"
 />
 <StatCard 
 title="الفنيين المسجلين" 
 value={stats.workers} 
 icon={UserCog} 
 colorClass="bg-purple-500/10 text-purple-500 border border-purple-500/20"
 />
 <StatCard 
 title="الطلبات النشطة" 
 value={stats.activeRequests} 
 icon={Wrench} 
 colorClass="bg-amber-500/10 text-amber-500 border border-amber-500/20"
 />
 <StatCard 
 title="الطلبات الملغية" 
 value={stats.canceledRequests} 
 icon={XCircle} 
 colorClass="bg-red-500/10 text-red-500 border border-red-500/20"
 />
 <StatCard 
 title="إجمالي الأرباح" 
 value={`${stats.totalRevenue.toLocaleString('en-US')} د.ع`} 
 icon={Banknote} 
 colorClass="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
 />
 </div>

 {/* Charts Section */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 relative z-10">
 
 {/* Main Chart */}
 <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
 <h2 className="text-xl font-bold text-slate-800 mb-6">معدل الطلبات الأسبوعي</h2>
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.8}/>
 <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <XAxis dataKey="name" stroke="hsl(215.4 16.3% 46.9%)" tick={{fill: 'hsl(215.4 16.3% 46.9%)'}} />
 <YAxis stroke="hsl(215.4 16.3% 46.9%)" tick={{fill: 'hsl(215.4 16.3% 46.9%)'}} />
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" vertical={false} />
 <Tooltip 
 contentStyle={{ backgroundColor: 'hsl(0 0% 100%)', borderRadius: '1rem', border: '1px solid hsl(214.3 31.8% 91.4%)' }}
 labelStyle={{ fontWeight: 'bold', color: 'hsl(222.2 84% 4.9%)' }}
 />
 <Area 
 type="monotone" 
 dataKey="طلبات" 
 stroke="hsl(160 84% 39%)" 
 strokeWidth={3}
 fillOpacity={1} 
 fill="url(#colorRequests)" 
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* Quick Actions or Recent Activity Panel */}
 <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
 <h2 className="text-xl font-bold text-slate-800 mb-6">نشاطات سريعة</h2>
 <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 text-slate-500 opacity-70 bg-white rounded-2xl border border-slate-200 p-6">
 <Wrench size={48} />
 <p>سيتم عرض أحدث النشاطات للطلبات هنا فور اكتمال الجداول الإضافية.</p>
 </div>
 </div>
 </div>
 
 </div>
 );
};

export default Overview;
