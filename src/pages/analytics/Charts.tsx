import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAnalyticsData, MONTH_LABELS } from './useAnalyticsData';
import { DateRangeBar } from './DateRangeBar';
import type { DateRange } from './useAnalyticsData';

const Charts = () => {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const { data, metrics, loading } = useAnalyticsData(dateRange);
  const navigate = useNavigate();

  const monthlyData = useMemo(() => {
    const map: Record<string, { revenue: number; count: number; discount: number }> = {};
    data.requests.filter(r => r.status === 'completed').forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!map[key]) map[key] = { revenue: 0, count: 0, discount: 0 };
      map[key].revenue += (r.price || 0) + (r.spare_parts_total || 0);
      map[key].count++;
    });
    data.discountUsage.forEach(u => {
      const d = new Date(u.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (map[key]) map[key].discount += u.discount_amount || 0;
    });
    return Object.entries(map)
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => {
        const [, m] = key.split('-');
        return { name: MONTH_LABELS[parseInt(m)-1], إيرادات: v.revenue, صافي: v.revenue - v.discount, طلبات: v.count };
      });
  }, [data]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const labels: Record<string, string> = {
      pending: 'انتظار', accepted: 'مقبول', en_route: 'بالطريق',
      arrived: 'وصل', in_progress: 'جاري', completed: 'مكتمل',
      canceled: 'ملغي', cancelled: 'ملغي',
    };
    const colors: Record<string, string> = {
      pending: '#f59e0b', accepted: '#3b82f6', en_route: '#6366f1',
      arrived: '#06b6d4', in_progress: '#8b5cf6', completed: '#10b981',
      canceled: '#ef4444', cancelled: '#ef4444',
    };
    const merged: Record<string, { name: string; count: number; fill: string }> = {};
    Object.entries(counts).forEach(([status, count]) => {
      const key = status === 'cancelled' ? 'canceled' : status;
      if (!merged[key]) merged[key] = { name: labels[key] || key, count: 0, fill: colors[key] || '#94a3b8' };
      merged[key].count += count;
    });
    return Object.values(merged);
  }, [data]);

  const paymentData = useMemo(() => [
    { name: 'إلكتروني 💳', value: metrics.electronic, color: '#3b82f6' },
    { name: 'نقدي 💵',     value: metrics.cash,       color: '#10b981' },
  ].filter(d => d.value > 0), [metrics]);

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-5">{title}</h3>
      {children}
    </div>
  );

  const empty = <div className="h-52 flex items-center justify-center text-slate-400 text-sm">لا توجد بيانات كافية</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/analytics')}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowRight size={18} className="text-slate-500" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-foreground">الرسوم البيانية</h1>
          <p className="text-slate-500 text-sm mt-0.5">تحليل مرئي للإيرادات والطلبات وطرق الدفع</p>
        </div>
      </div>

      <DateRangeBar value={dateRange} onChange={setDateRange} />

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">جاري تحميل البيانات...</div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="📈 الإيرادات الشهرية — الإجمالي مقابل الصافي">
                {monthlyData.length === 0 ? empty : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }}/>
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}/>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}/>
                        <Legend/>
                        <Area type="monotone" dataKey="إيرادات" stroke="#10b981" strokeWidth={2.5} fill="url(#gR)"/>
                        <Area type="monotone" dataKey="صافي"    stroke="#6366f1" strokeWidth={2.5} fill="url(#gN)"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            <ChartCard title="💳 توزيع طرق الدفع">
              {paymentData.length === 0 ? empty : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value">
                          {paymentData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`${v} طلب`]}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-3">
                    {paymentData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: d.color }}/>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{d.name}</span>
                        </div>
                        <span className="font-black text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ChartCard>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="📊 توزيع حالات الطلبات">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }}/>
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}/>
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }}/>
                    <Bar dataKey="count" name="الطلبات" radius={[6,6,0,0]}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.fill}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="🗓️ الطلبات المكتملة شهرياً">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }}/>
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}/>
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }}/>
                    <Bar dataKey="طلبات" fill="#8b5cf6" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};

export default Charts;
