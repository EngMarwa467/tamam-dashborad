import { useNavigate } from 'react-router-dom';
import { DollarSign, BarChart3, Brain, FileSpreadsheet, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAnalyticsData, fmt } from './useAnalyticsData';

const hubs = [
  {
    path: '/analytics/kpis',
    label: 'المؤشرات المالية',
    desc: 'إيرادات، صافي دخل، خصومات، متوسط الطلب',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
    tag: 'مالي',
    tagColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    path: '/analytics/charts',
    label: 'الرسوم البيانية',
    desc: 'إيرادات شهرية، طرق الدفع، توزيع الحالات',
    icon: BarChart3,
    gradient: 'from-violet-500 to-indigo-600',
    glow: 'shadow-violet-500/20',
    tag: 'مرئي',
    tagColor: 'bg-violet-100 text-violet-700',
  },
  {
    path: '/analytics/insights',
    label: 'تحليل الذكاء الاصطناعي',
    desc: 'رؤى تلقائية وتوصيات مبنية على بياناتك',
    icon: Brain,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'shadow-rose-500/20',
    tag: 'ذكاء اصطناعي',
    tagColor: 'bg-rose-100 text-rose-700',
  },
  {
    path: '/analytics/payments',
    label: 'سجل المدفوعات',
    desc: 'كل العمليات المكتملة + تصدير Excel و Word',
    icon: FileSpreadsheet,
    gradient: 'from-blue-500 to-cyan-600',
    glow: 'shadow-blue-500/20',
    tag: 'تصدير',
    tagColor: 'bg-blue-100 text-blue-700',
  },
];

const AnalyticsHub = () => {
  const navigate = useNavigate();
  const { metrics, loading, refetch } = useAnalyticsData('month');

  const quickStats = [
    { label: 'الإيرادات (شهر)', value: `${fmt(metrics.revenue)} د.ع`, color: 'text-emerald-600' },
    { label: 'الطلبات المكتملة', value: String(metrics.completed),  color: 'text-blue-600' },
    { label: 'معدل الإنجاز',    value: `${metrics.completeRate.toFixed(0)}%`, color: 'text-violet-600' },
    { label: 'صافي الدخل',      value: `${fmt(metrics.netRevenue)} د.ع`, color: 'text-teal-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground">التحليلات المالية</h1>
          <p className="text-[#4b5563] dark:text-slate-400 mt-1.5 font-medium text-sm">مركز إدارة البيانات المالية والإحصاءات الذكية</p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickStats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm text-center hover:shadow-md transition-shadow">
            <p className={`text-2xl font-black ${s.color}`}>{loading ? '...' : s.value}</p>
            <p className="text-xs text-slate-600 font-bold mt-1">{s.label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">آخر 30 يوم</p>
          </div>
        ))}
      </div>

      {/* Hub Cards Grid */}
      <div>
        <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest mb-4">الأقسام</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {hubs.map((hub) => (
            <button
              key={hub.path}
              onClick={() => navigate(hub.path)}
              className={`group relative overflow-hidden bg-gradient-to-br ${hub.gradient} rounded-2xl p-6 text-white shadow-xl ${hub.glow} hover:scale-[1.02] hover:shadow-2xl transition-all text-right w-full`}
            >
              {/* Background decoration */}
              <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-white/5 -translate-x-16 -translate-y-16" />
              <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-black/10 translate-x-10 translate-y-10" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                    <hub.icon size={24} className="text-white" />
                  </div>
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${hub.tagColor}`}>
                    {hub.tag}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white mb-1.5">{hub.label}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{hub.desc}</p>

                <div className="mt-5 flex items-center gap-2 text-white/90 text-sm font-bold group-hover:gap-3 transition-all">
                  <span>فتح القسم</span>
                  <ArrowLeft size={16} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AnalyticsHub;
