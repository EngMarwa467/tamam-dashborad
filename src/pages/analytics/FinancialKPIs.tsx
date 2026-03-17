import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, DollarSign, BarChart3, FileSpreadsheet, TrendingUp, Target, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';
import { useAnalyticsData, fmt } from './useAnalyticsData';
import { DateRangeBar } from './DateRangeBar';
import type { DateRange } from './useAnalyticsData';

const FinancialKPIs = () => {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const { metrics, loading } = useAnalyticsData(dateRange);
  const navigate = useNavigate();

  const cards = [
    {
      label: 'إجمالي الإيرادات',
      value: fmt(metrics.revenue),
      sub: 'د.ع',
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/30',
    },
    {
      label: 'صافي الدخل',
      value: fmt(metrics.netRevenue),
      sub: 'بعد الخصومات',
      icon: TrendingUp,
      gradient: 'from-cyan-500 to-blue-600',
      glow: 'shadow-cyan-500/30',
    },
    {
      label: 'إيرادات الخدمة',
      value: fmt(metrics.serviceRevenue),
      sub: 'د.ع',
      icon: Target,
      gradient: 'from-violet-500 to-purple-600',
      glow: 'shadow-violet-500/30',
    },
    {
      label: 'قطع الغيار',
      value: fmt(metrics.spareParts),
      sub: 'د.ع',
      icon: BarChart3,
      gradient: 'from-rose-500 to-pink-600',
      glow: 'shadow-rose-500/30',
    },
    {
      label: 'الخصومات الممنوحة',
      value: fmt(metrics.totalDiscount),
      sub: 'د.ع',
      icon: FileSpreadsheet,
      gradient: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/30',
    },
    {
      label: 'متوسط الطلب',
      value: fmt(Math.round(metrics.avgOrder)),
      sub: 'د.ع / طلب',
      icon: ArrowUpRight,
      gradient: 'from-indigo-500 to-indigo-600',
      glow: 'shadow-indigo-500/30',
    },
    {
      label: 'معدل الإنجاز',
      value: `${metrics.completeRate.toFixed(1)}%`,
      sub: `${metrics.completed} طلب مكتمل`,
      icon: CheckCircle2,
      gradient: 'from-teal-500 to-green-600',
      glow: 'shadow-teal-500/30',
    },
    {
      label: 'نسبة الإلغاء',
      value: `${metrics.cancelRate.toFixed(1)}%`,
      sub: `${metrics.canceled} طلب ملغي`,
      icon: XCircle,
      gradient: 'from-red-500 to-rose-600',
      glow: 'shadow-red-500/30',
    },
  ];

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
          <h1 className="text-3xl font-black text-foreground">المؤشرات المالية</h1>
          <p className="text-slate-500 text-sm mt-0.5">نظرة تفصيلية على الإيرادات والتكاليف</p>
        </div>
      </div>

      {/* Date Range */}
      <DateRangeBar value={dateRange} onChange={setDateRange} />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <div key={i} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-xl ${card.glow} hover:scale-[1.02] transition-transform`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <card.icon size={20} className="text-white" />
              </div>
            </div>
            <p className="text-white/70 text-xs font-bold mb-1">{card.label}</p>
            <p className="text-2xl font-black text-white leading-tight">
              {loading ? '...' : card.value}
            </p>
            {card.sub && <p className="text-white/60 text-[11px] mt-1 font-medium">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Summary strip */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-wrap gap-6 justify-around shadow-sm">
        <div className="text-center">
          <p className="text-2xl font-black text-foreground">{loading ? '...' : metrics.total}</p>
          <p className="text-xs text-slate-400 font-bold mt-1">إجمالي الطلبات</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-emerald-600">{loading ? '...' : metrics.completed}</p>
          <p className="text-xs text-slate-400 font-bold mt-1">مكتملة</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-red-500">{loading ? '...' : metrics.canceled}</p>
          <p className="text-xs text-slate-400 font-bold mt-1">ملغية</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-blue-600">{loading ? '...' : metrics.electronic}</p>
          <p className="text-xs text-slate-400 font-bold mt-1">دفع إلكتروني</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-amber-600">{loading ? '...' : metrics.cash}</p>
          <p className="text-xs text-slate-400 font-bold mt-1">دفع نقدي</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialKPIs;
