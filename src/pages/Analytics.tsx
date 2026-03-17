import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  FileDown, FileSpreadsheet, Brain, RefreshCw,
  CheckCircle2, XCircle, Banknote, CreditCard,
  AlertTriangle, Lightbulb, ArrowUpRight, ArrowDownRight,
  CalendarDays, Target, Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType } from 'docx';

// ─── Types ─────────────────────────────────────────────────────────────────
type DateRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

interface FinancialData {
  requests: any[];
  discountUsage: any[];
  profiles: any[];
}

// ─── Date helpers ────────────────────────────────────────────────────────────
const getStartDate = (range: DateRange): Date | null => {
  if (range === 'all') return null;
  const now = new Date();
  const days: Record<DateRange, number> = { week: 7, month: 30, '3months': 90, '6months': 180, year: 365, all: 0 };
  const d = new Date(now);
  d.setDate(now.getDate() - days[range]);
  return d;
};

const MONTH_LABELS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const fmt = (n: number) => n.toLocaleString('en-US');

// ─── AI Insights Generator ───────────────────────────────────────────────────
const generateInsights = (data: FinancialData, range: DateRange): { type: 'positive'|'warning'|'info'; text: string }[] => {
  const completed = data.requests.filter(r => r.status === 'completed');
  const canceled  = data.requests.filter(r => ['canceled','cancelled'].includes(r.status));
  const total     = data.requests.length;

  const revenue       = completed.reduce((s, r) => s + (r.price || 0) + (r.spare_parts_total || 0), 0);
  const totalDiscount = data.discountUsage.reduce((s, u) => s + (u.discount_amount || 0), 0);
  const cancelRate    = total > 0 ? (canceled.length / total) * 100 : 0;
  const completeRate  = total > 0 ? (completed.length / total) * 100 : 0;
  const avgOrder      = completed.length > 0 ? revenue / completed.length : 0;

  const electronic = completed.filter(r => r.payment_method === 'electronic').length;
  const cash       = completed.filter(r => r.payment_method !== 'electronic').length;

  // Day of week analysis
  const dayCounts: Record<string, number> = {};
  const DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  completed.forEach(r => {
    const d = DAYS[new Date(r.created_at).getDay()];
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  const topDay = Object.entries(dayCounts).sort((a,b) => b[1]-a[1])[0];

  const insights: { type: 'positive'|'warning'|'info'; text: string }[] = [];

  if (completeRate >= 70) {
    insights.push({ type: 'positive', text: `✅ معدل إنجاز ممتاز ${completeRate.toFixed(1)}% — الفريق يعمل بكفاءة عالية` });
  } else if (completeRate >= 50) {
    insights.push({ type: 'info', text: `ℹ️ معدل الإنجاز ${completeRate.toFixed(1)}% — هناك فرصة لتحسين الأداء` });
  } else {
    insights.push({ type: 'warning', text: `⚠️ معدل الإنجاز منخفض ${completeRate.toFixed(1)}% — يحتاج مراجعة عاجلة` });
  }

  if (cancelRate > 20) {
    insights.push({ type: 'warning', text: `⚠️ نسبة الإلغاء مرتفعة ${cancelRate.toFixed(1)}% — تحليل أسباب الإلغاء ضروري` });
  } else if (cancelRate > 0) {
    insights.push({ type: 'info', text: `📊 نسبة الإلغاء ${cancelRate.toFixed(1)}% — ضمن المعدلات المقبولة` });
  }

  if (totalDiscount > 0 && revenue > 0) {
    const discPct = (totalDiscount / (revenue + totalDiscount)) * 100;
    if (discPct > 15) {
      insights.push({ type: 'warning', text: `🏷️ الخصومات تمثل ${discPct.toFixed(1)}% من الإيرادات الإجمالية — راجع سياسة الخصومات` });
    } else {
      insights.push({ type: 'positive', text: `🏷️ الخصومات المُمنحة ${fmt(totalDiscount)} د.ع — بنسبة صحية ${discPct.toFixed(1)}% من الإيرادات` });
    }
  }

  if (topDay) {
    insights.push({ type: 'info', text: `📅 أكثر أيام الطلبات نشاطاً: ${topDay[0]} بـ ${topDay[1]} طلب مكتمل` });
  }

  if (avgOrder > 0) {
    insights.push({ type: 'info', text: `💡 متوسط قيمة الطلب الواحد: ${fmt(Math.round(avgOrder))} د.ع` });
  }

  if (electronic > cash) {
    insights.push({ type: 'positive', text: `💳 الدفع الإلكتروني يتصدر بـ ${electronic} طلب — اتجاه إيجابي نحو التحول الرقمي` });
  } else if (cash > electronic) {
    insights.push({ type: 'info', text: `💵 الدفع النقدي لا يزال مفضلاً بـ ${cash} طلب — فرصة لتعزيز الدفع الإلكتروني` });
  }

  if (total === 0) {
    return [{ type: 'info', text: 'لا توجد بيانات كافية في الفترة المحددة لإنشاء تحليل.' }];
  }

  return insights;
};

// ─── Main Component ──────────────────────────────────────────────────────────
const Analytics = () => {
  const [data, setData] = useState<FinancialData>({ requests: [], discountUsage: [], profiles: [] });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [exporting, setExporting] = useState<'excel'|'word'|null>(null);

  useEffect(() => { fetchData(); }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(dateRange);

      let reqQuery = supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false });
      if (startDate) reqQuery = reqQuery.gte('created_at', startDate.toISOString());

      const [{ data: requests }, { data: discountUsage }, { data: profiles }] = await Promise.all([
        reqQuery,
        supabase.from('discount_usage').select('discount_amount, created_at, request_id'),
        supabase.from('profiles').select('id, full_name, phone'),
      ]);

      const profilesMap: Record<string, any> = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
      const mappedRequests = (requests || []).map((r: any) => ({
        ...r,
        customer: profilesMap[r.customer_id] || null,
        worker: profilesMap[r.worker_id] || null,
      }));

      setData({ requests: mappedRequests, discountUsage: discountUsage || [], profiles: profiles || [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived Metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const completed = data.requests.filter(r => r.status === 'completed');
    const canceled  = data.requests.filter(r => ['canceled','cancelled'].includes(r.status));
    const total     = data.requests.length;

    const revenue       = completed.reduce((s, r) => s + (r.price || 0) + (r.spare_parts_total || 0), 0);
    const spareParts    = completed.reduce((s, r) => s + (r.spare_parts_total || 0), 0);
    const serviceRevenue = completed.reduce((s, r) => s + (r.price || 0), 0);
    const totalDiscount = data.discountUsage.reduce((s, u) => s + (u.discount_amount || 0), 0);
    const netRevenue    = revenue - totalDiscount;
    const avgOrder      = completed.length > 0 ? revenue / completed.length : 0;
    const cancelRate    = total > 0 ? (canceled.length / total) * 100 : 0;
    const completeRate  = total > 0 ? (completed.length / total) * 100 : 0;

    return {
      total, completed: completed.length, canceled: canceled.length,
      revenue, spareParts, serviceRevenue, totalDiscount, netRevenue,
      avgOrder, cancelRate, completeRate,
      electronic: completed.filter(r => r.payment_method === 'electronic').length,
      cash: completed.filter(r => r.payment_method !== 'electronic').length,
    };
  }, [data]);

  // ─── Monthly Revenue Chart ─────────────────────────────────────────────────
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

  // ─── Payment Pie ───────────────────────────────────────────────────────────
  const paymentData = useMemo(() => [
    { name: 'إلكتروني 💳', value: metrics.electronic, color: '#3b82f6' },
    { name: 'نقدي 💵',     value: metrics.cash,       color: '#10b981' },
  ].filter(d => d.value > 0), [metrics]);

  // ─── Status Bar Chart ─────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار', accepted: 'مقبول', en_route: 'في الطريق',
      arrived: 'وصل', in_progress: 'جاري', completed: 'مكتمل', canceled: 'ملغي', cancelled: 'ملغي'
    };
    const colors: Record<string, string> = {
      pending: '#f59e0b', accepted: '#3b82f6', en_route: '#6366f1',
      arrived: '#06b6d4', in_progress: '#8b5cf6', completed: '#10b981',
      canceled: '#ef4444', cancelled: '#ef4444'
    };
    const merged: Record<string, { name: string; count: number; fill: string }> = {};
    Object.entries(counts).forEach(([status, count]) => {
      const key = status === 'cancelled' ? 'canceled' : status;
      if (!merged[key]) merged[key] = { name: labels[key] || key, count: 0, fill: colors[key] || '#94a3b8' };
      merged[key].count += count;
    });
    return Object.values(merged);
  }, [data]);

  const insights = useMemo(() => generateInsights(data, dateRange), [data, dateRange]);

  // ─── Export Excel ─────────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting('excel');
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: KPIs
      const kpiRows = [
        ['المؤشر', 'القيمة'],
        ['إجمالي الطلبات', metrics.total],
        ['الطلبات المكتملة', metrics.completed],
        ['الطلبات الملغية', metrics.canceled],
        ['معدل الإنجاز %', metrics.completeRate.toFixed(1)],
        ['نسبة الإلغاء %', metrics.cancelRate.toFixed(1)],
        ['إجمالي الإيرادات (د.ع)', metrics.revenue],
        ['إيرادات الخدمة (د.ع)', metrics.serviceRevenue],
        ['إيرادات قطع الغيار (د.ع)', metrics.spareParts],
        ['إجمالي الخصومات (د.ع)', metrics.totalDiscount],
        ['صافي الدخل (د.ع)', metrics.netRevenue],
        ['متوسط قيمة الطلب (د.ع)', Math.round(metrics.avgOrder)],
        ['دفع إلكتروني', metrics.electronic],
        ['دفع نقدي', metrics.cash],
      ];
      const wsKPI = XLSX.utils.aoa_to_sheet(kpiRows);
      XLSX.utils.book_append_sheet(wb, wsKPI, 'المؤشرات المالية');

      // Sheet 2: Transactions
      const txRows = [
        ['رقم الطلب','التاريخ','العميل','الفني','قيمة الخدمة','قطع الغيار','الإجمالي','طريقة الدفع','الحالة'],
        ...data.requests.filter(r => r.status === 'completed').map(r => [
          r.id?.slice(0,8) ?? '',
          new Date(r.created_at).toLocaleDateString('ar-IQ'),
          r.customer?.full_name ?? 'غير معروف',
          r.worker?.full_name ?? 'غير معين',
          r.price ?? 0,
          r.spare_parts_total ?? 0,
          (r.price ?? 0) + (r.spare_parts_total ?? 0),
          r.payment_method === 'electronic' ? 'إلكتروني' : 'نقدي',
          'مكتمل',
        ])
      ];
      const wsTX = XLSX.utils.aoa_to_sheet(txRows);
      XLSX.utils.book_append_sheet(wb, wsTX, 'سجل المدفوعات');

      // Sheet 3: Monthly
      const mRows = [['الشهر','الإيرادات','الإيرادات الصافية','عدد الطلبات'],
        ...monthlyData.map(m => [m.name, m['إيرادات'], m['صافي'], m['طلبات']])];
      const wsM = XLSX.utils.aoa_to_sheet(mRows);
      XLSX.utils.book_append_sheet(wb, wsM, 'الإيرادات الشهرية');

      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `تمام-تقرير-مالي-${new Date().toLocaleDateString('ar-IQ').replace(/\//g,'-')}.xlsx`);
    } finally { setExporting(null); }
  };

  // ─── Export Word ──────────────────────────────────────────────────────────
  const exportWord = async () => {
    setExporting('word');
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: 'التقرير المالي — منصة تمام',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: `الفترة: ${new Date().toLocaleDateString('ar-IQ')}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'المؤشرات المالية الرئيسية', heading: HeadingLevel.HEADING_2 }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'المؤشر', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'القيمة', bold: true })] })] }),
                ]}),
                ...([
                  ['إجمالي الطلبات', String(metrics.total)],
                  ['الطلبات المكتملة', String(metrics.completed)],
                  ['الطلبات الملغية', String(metrics.canceled)],
                  ['معدل الإنجاز', `${metrics.completeRate.toFixed(1)}%`],
                  ['إجمالي الإيرادات', `${fmt(metrics.revenue)} د.ع`],
                  ['إجمالي الخصومات', `${fmt(metrics.totalDiscount)} د.ع`],
                  ['صافي الدخل', `${fmt(metrics.netRevenue)} د.ع`],
                  ['متوسط الطلب', `${fmt(Math.round(metrics.avgOrder))} د.ع`],
                ]).map(([k, v]) => new TableRow({ children: [
                  new TableCell({ children: [new Paragraph(k)] }),
                  new TableCell({ children: [new Paragraph(v)] }),
                ]}))
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'تحليل الذكاء الاصطناعي', heading: HeadingLevel.HEADING_2 }),
            ...insights.map(ins => new Paragraph({ text: ins.text })),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'سجل المدفوعات', heading: HeadingLevel.HEADING_2 }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'التاريخ', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'العميل', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'الإجمالي', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'الدفع', bold: true })] })] }),
                ]}),
                ...data.requests.filter(r => r.status === 'completed').slice(0, 50).map(r =>
                  new TableRow({ children: [
                    new TableCell({ children: [new Paragraph(new Date(r.created_at).toLocaleDateString('ar-IQ'))] }),
                    new TableCell({ children: [new Paragraph(r.customer?.full_name ?? 'غير معروف')] }),
                    new TableCell({ children: [new Paragraph(`${fmt((r.price||0)+(r.spare_parts_total||0))} د.ع`)] }),
                    new TableCell({ children: [new Paragraph(r.payment_method === 'electronic' ? 'إلكتروني' : 'نقدي')] }),
                  ]})
                )
              ],
            }),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `تمام-تقرير-مالي-${new Date().toLocaleDateString('ar-IQ').replace(/\//g,'-')}.docx`);
    } finally { setExporting(null); }
  };

  // ─── UI Helpers ───────────────────────────────────────────────────────────
  const KPICard = ({ title, value, sub, icon: Icon, color, trend }: any) => (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
            {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-slate-400 mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{loading ? '...' : value}</p>
      {sub && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{sub}</p>}
    </div>
  );

  const dateRanges: { id: DateRange; label: string }[] = [
    { id: 'week',    label: 'أسبوع' },
    { id: 'month',   label: 'شهر' },
    { id: '3months', label: '3 أشهر' },
    { id: '6months', label: '6 أشهر' },
    { id: 'year',    label: 'سنة' },
    { id: 'all',     label: 'الكل' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans RTL" dir="rtl">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-slate-100">التحليلات المالية</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">تتبع الإيرادات والخصومات وأداء الطلبات بذكاء</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchData} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl font-bold text-sm transition-all">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
          <button
            onClick={exportExcel}
            disabled={!!exporting}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-60"
          >
            <FileSpreadsheet size={15} /> {exporting === 'excel' ? 'جاري التصدير...' : 'Excel'}
          </button>
          <button
            onClick={exportWord}
            disabled={!!exporting}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-60"
          >
            <FileDown size={15} /> {exporting === 'word' ? 'جاري التصدير...' : 'Word'}
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-2xl w-full max-w-md shadow-sm">
        {dateRanges.map(r => (
          <button
            key={r.id}
            onClick={() => setDateRange(r.id)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              dateRange === r.id
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="إجمالي الإيرادات" value={`${fmt(metrics.revenue)}`} sub="د.ع" icon={DollarSign} color="bg-emerald-100 text-emerald-600" />
        <KPICard title="صافي الدخل" value={`${fmt(metrics.netRevenue)}`} sub="د.ع بعد الخصومات" icon={TrendingUp} color="bg-teal-100 text-teal-600" />
        <KPICard title="الخصومات الممنوحة" value={`${fmt(metrics.totalDiscount)}`} sub="د.ع" icon={Percent} color="bg-amber-100 text-amber-600" />
        <KPICard title="متوسط الطلب" value={`${fmt(Math.round(metrics.avgOrder))}`} sub="د.ع" icon={Target} color="bg-purple-100 text-purple-600" />
        <KPICard title="معدل الإنجاز" value={`${metrics.completeRate.toFixed(1)}%`} icon={CheckCircle2} color="bg-blue-100 text-blue-600" />
        <KPICard title="نسبة الإلغاء" value={`${metrics.cancelRate.toFixed(1)}%`} icon={XCircle} color="bg-red-100 text-red-500" />
      </div>

      {/* Revenue Sub-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 opacity-80"><Banknote size={18}/><span className="text-sm font-bold">إيرادات الخدمة</span></div>
          <p className="text-3xl font-black">{fmt(metrics.serviceRevenue)}</p>
          <p className="text-xs opacity-70 mt-1">د.ع</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 opacity-80"><Package size={18}/><span className="text-sm font-bold">قطع الغيار</span></div>
          <p className="text-3xl font-black">{fmt(metrics.spareParts)}</p>
          <p className="text-xs opacity-70 mt-1">د.ع</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 opacity-80"><CalendarDays size={18}/><span className="text-sm font-bold">إجمالي الطلبات</span></div>
          <p className="text-3xl font-black">{metrics.total}</p>
          <p className="text-xs opacity-70 mt-1">{metrics.completed} مكتمل · {metrics.canceled} ملغي</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 mb-5">الإيرادات الشهرية</h2>
          {monthlyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">لا توجد بيانات كافية</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend />
                  <Area type="monotone" dataKey="إيرادات" stroke="#10b981" strokeWidth={2} fill="url(#gRevenue)" />
                  <Area type="monotone" dataKey="صافي" stroke="#3b82f6" strokeWidth={2} fill="url(#gNet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Payment Pie */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col">
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 mb-5">طرق الدفع</h2>
          {paymentData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">لا يوجد بيانات</div>
          ) : (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {paymentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} طلب`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {paymentData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="font-bold text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-black text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Bar Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 mb-5">توزيع حالات الطلبات</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Bar dataKey="count" name="عدد الطلبات" radius={[6,6,0,0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Requests Bar */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 mb-5">الطلبات المكتملة شهرياً</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Bar dataKey="طلبات" name="الطلبات" radius={[6,6,0,0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Brain size={20} className="text-white"/>
          </div>
          <div>
            <h2 className="text-base font-black text-white">تحليل الذكاء الاصطناعي</h2>
            <p className="text-xs text-slate-400">رؤى تلقائية مبنية على بياناتك الفعلية</p>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-400 text-sm">جاري تحليل البيانات...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
                ins.type === 'positive' ? 'bg-emerald-900/30 border-emerald-700/50' :
                ins.type === 'warning'  ? 'bg-amber-900/30 border-amber-700/50' :
                                          'bg-slate-700/50 border-slate-600/50'
              }`}>
                {ins.type === 'positive' ? <Lightbulb size={16} className="text-emerald-400 mt-0.5 flex-shrink-0"/> :
                 ins.type === 'warning'  ? <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0"/> :
                                           <Brain size={16} className="text-blue-400 mt-0.5 flex-shrink-0"/>}
                <p className="text-sm text-slate-200 font-medium leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100">سجل المدفوعات</h2>
          <span className="text-xs text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
            {data.requests.filter(r => r.status === 'completed').length} عملية
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold">
                <th className="py-3 px-4 text-right">#</th>
                <th className="py-3 px-4 text-right">التاريخ</th>
                <th className="py-3 px-4 text-right">العميل</th>
                <th className="py-3 px-4 text-right hidden md:table-cell">الفني</th>
                <th className="py-3 px-4 text-right">الخدمة</th>
                <th className="py-3 px-4 text-right hidden md:table-cell">قطع الغيار</th>
                <th className="py-3 px-4 text-right">الإجمالي</th>
                <th className="py-3 px-4 text-center">الدفع</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.filter(r => r.status === 'completed').slice(0, 30).map((r, i) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-3 px-4 text-slate-400 text-xs font-mono">{i + 1}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">{new Date(r.created_at).toLocaleDateString('ar-IQ')}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{r.customer?.full_name || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 hidden md:table-cell">{r.worker?.full_name || '—'}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{r.price ? `${fmt(r.price)} د.ع` : '—'}</td>
                  <td className="py-3 px-4 text-purple-600 font-bold hidden md:table-cell">{r.spare_parts_total ? `${fmt(r.spare_parts_total)} د.ع` : '—'}</td>
                  <td className="py-3 px-4 font-black text-slate-800 dark:text-slate-100">{fmt((r.price||0)+(r.spare_parts_total||0))} د.ع</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${r.payment_method === 'electronic' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.payment_method === 'electronic' ? '💳 إلكتروني' : '💵 نقدي'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.requests.filter(r => r.status === 'completed').length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400 text-sm">لا توجد مدفوعات في الفترة المحددة</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Summary Row */}
        {metrics.completed > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 justify-end text-sm font-bold bg-slate-50 dark:bg-slate-900">
            <span className="text-slate-500">الإجمالي:</span>
            <span className="text-emerald-600">{fmt(metrics.serviceRevenue)} د.ع خدمات</span>
            <span className="text-purple-600">+ {fmt(metrics.spareParts)} د.ع قطع</span>
            <span className="text-slate-800 dark:text-slate-100 border-r border-slate-300 pr-4">= {fmt(metrics.revenue)} د.ع</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default Analytics;
