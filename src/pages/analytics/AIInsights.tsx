import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAnalyticsData, fmt } from './useAnalyticsData';
import { DateRangeBar } from './DateRangeBar';
import type { DateRange, AnalyticsData } from './useAnalyticsData';

const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

const generateInsights = (data: AnalyticsData, _range: DateRange) => {
  const completed = data.requests.filter(r => r.status === 'completed');
  const canceled  = data.requests.filter(r => ['canceled','cancelled'].includes(r.status));
  const total     = data.requests.length;
  const revenue       = completed.reduce((s, r) => s + (r.price || 0) + (r.spare_parts_total || 0), 0);
  const totalDiscount = data.discountUsage.reduce((s, u) => s + (u.discount_amount || 0), 0);
  const cancelRate    = total > 0 ? (canceled.length / total) * 100 : 0;
  const completeRate  = total > 0 ? (completed.length / total) * 100 : 0;
  const avgOrder      = completed.length > 0 ? revenue / completed.length : 0;
  const electronic    = completed.filter(r => r.payment_method === 'electronic').length;
  const cash          = completed.filter(r => r.payment_method !== 'electronic').length;

  const dayCounts: Record<string, number> = {};
  completed.forEach(r => {
    const d = DAYS[new Date(r.created_at).getDay()];
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

  type Insight = { type: 'positive'|'warning'|'info'; title: string; text: string };
  const insights: Insight[] = [];

  if (total === 0) return [{ type: 'info' as const, title: 'لا توجد بيانات', text: 'لا توجد بيانات كافية في الفترة المحددة.' }];

  if (completeRate >= 70)
    insights.push({ type: 'positive', title: 'أداء ممتاز', text: `معدل إنجاز ${completeRate.toFixed(1)}% — الفريق يعمل بكفاءة عالية. استمر في الأداء الجيد!` });
  else if (completeRate >= 50)
    insights.push({ type: 'info', title: 'أداء مقبول', text: `معدل الإنجاز ${completeRate.toFixed(1)}% — هناك مجال لتحسين معالجة الطلبات وتقليل وقت الانتظار.` });
  else
    insights.push({ type: 'warning', title: 'تحذير: أداء منخفض', text: `معدل الإنجاز ${completeRate.toFixed(1)}% فقط — يستلزم مراجعة عاجلة لعملية قبول الطلبات.` });

  if (cancelRate > 20)
    insights.push({ type: 'warning', title: 'نسبة إلغاء مرتفعة', text: `${cancelRate.toFixed(1)}% من الطلبات ملغاة. راجع أسباب الإلغاء وحلول تحسين رضا العملاء.` });
  else if (cancelRate > 0)
    insights.push({ type: 'info', title: 'نسبة الإلغاء', text: `${cancelRate.toFixed(1)}% ضمن المعدلات الطبيعية للصناعة. حافظ على هذا المستوى.` });

  if (totalDiscount > 0 && revenue > 0) {
    const pct = (totalDiscount / (revenue + totalDiscount)) * 100;
    if (pct > 15)
      insights.push({ type: 'warning', title: 'خصومات مرتفعة', text: `الخصومات ${pct.toFixed(1)}% من الإيرادات الإجمالية — قد تؤثر على هامش الربح. راجع سياسة الكوبونات.` });
    else
      insights.push({ type: 'positive', title: 'سياسة خصومات صحية', text: `الخصومات الممنوحة ${fmt(totalDiscount)} د.ع بنسبة ${pct.toFixed(1)}% — توازن جيد بين الجذب وهامش الربح.` });
  }

  if (avgOrder > 0)
    insights.push({ type: 'info', title: 'متوسط قيمة الطلب', text: `كل طلب يدر في المتوسط ${fmt(Math.round(avgOrder))} د.ع. ارفع هذا الرقم بتشجيع إضافة قطع الغيار.` });

  if (topDay)
    insights.push({ type: 'info', title: 'ذروة النشاط', text: `أكثر أيام الإنجاز نشاطاً: ${topDay[0]} بـ ${topDay[1]} طلب. جدّد توزيع الفنيين في هذا اليوم.` });

  if (electronic > cash)
    insights.push({ type: 'positive', title: 'تحول رقمي إيجابي', text: `${electronic} طلب بالدفع الإلكتروني مقابل ${cash} نقداً — اتجاه ممتاز نحو الرقمنة.` });
  else if (cash > 0)
    insights.push({ type: 'info', title: 'الدفع النقدي لا يزال مهيمناً', text: `${cash} طلب نقدي — فكّر في تحفيزات لتشجيع الدفع الإلكتروني كخصومات 5%.` });

  return insights;
};

const AIInsights = () => {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const { data, loading } = useAnalyticsData(dateRange);
  const navigate = useNavigate();
  const insights = useMemo(() => generateInsights(data, dateRange), [data, dateRange]);

  const typeConfig = {
    positive: { icon: Lightbulb,    bg: 'from-emerald-50 to-teal-50',   border: 'border-emerald-200',  iconBg: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', badgeLabel: 'إيجابي' },
    warning:  { icon: AlertTriangle, bg: 'from-amber-50 to-orange-50',   border: 'border-amber-200',    iconBg: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700',   badgeLabel: 'تنبيه' },
    info:     { icon: TrendingUp,    bg: 'from-blue-50 to-indigo-50',    border: 'border-blue-200',     iconBg: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700',     badgeLabel: 'معلومة' },
  };

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
          <h1 className="text-3xl font-black text-foreground">تحليل الذكاء الاصطناعي</h1>
          <p className="text-slate-500 text-sm mt-0.5">رؤى تلقائية مبنية على بياناتك الفعلية</p>
        </div>
      </div>

      <DateRangeBar value={dateRange} onChange={setDateRange} />

      {/* AI Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 flex items-center gap-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <Brain size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">محرك التحليل الذكي</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            يحلل بياناتك الفعلية من Supabase ويولّد توصيات مخصصة — بدون API خارجي
          </p>
        </div>
      </div>

      {/* Insights Grid */}
      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">جاري التحليل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {insights.map((ins, i) => {
            const cfg = typeConfig[ins.type];
            return (
              <div
                key={i}
                className={`bg-gradient-to-br ${cfg.bg} border ${cfg.border} rounded-2xl p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <cfg.icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-black text-slate-800 text-sm">{ins.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.badgeLabel}</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{ins.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIInsights;
