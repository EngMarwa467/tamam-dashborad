import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileSpreadsheet, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType } from 'docx';
import { useAnalyticsData, fmt } from './useAnalyticsData';
import { DateRangeBar } from './DateRangeBar';
import type { DateRange } from './useAnalyticsData';

const PaymentsTable = () => {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const { data, metrics, loading } = useAnalyticsData(dateRange);
  const navigate = useNavigate();
  const [exporting, setExporting] = useState<'excel'|'word'|null>(null);

  const completed = data.requests.filter(r => r.status === 'completed');

  const exportExcel = async () => {
    setExporting('excel');
    try {
      const wb = XLSX.utils.book_new();
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), 'المؤشرات');

      const txRows = [
        ['#','التاريخ','العميل','الفني','الخدمة (د.ع)','قطع الغيار (د.ع)','الإجمالي (د.ع)','طريقة الدفع'],
        ...completed.map((r, i) => [
          i + 1,
          new Date(r.created_at).toLocaleDateString('en-US'),
          r.customer?.full_name ?? '—',
          r.worker?.full_name   ?? '—',
          r.price ?? 0,
          r.spare_parts_total ?? 0,
          (r.price ?? 0) + (r.spare_parts_total ?? 0),
          r.payment_method === 'electronic' ? 'إلكتروني' : 'نقدي',
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txRows), 'سجل المدفوعات');

      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }),
        `تمام-مدفوعات-${new Date().toLocaleDateString('en-US').replace(/\//g,'-')}.xlsx`);
    } finally { setExporting(null); }
  };

  const exportWord = async () => {
    setExporting('word');
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: 'سجل المدفوعات — منصة تمام', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `التاريخ: ${new Date().toLocaleDateString('en-US')}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'ملخص مالي', heading: HeadingLevel.HEADING_2 }),
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
                  ['إجمالي الإيرادات', `${fmt(metrics.revenue)} د.ع`],
                  ['الخصومات', `${fmt(metrics.totalDiscount)} د.ع`],
                  ['صافي الدخل', `${fmt(metrics.netRevenue)} د.ع`],
                  ['متوسط الطلب', `${fmt(Math.round(metrics.avgOrder))} د.ع`],
                ]).map(([k, v]) => new TableRow({ children: [
                  new TableCell({ children: [new Paragraph(k)] }),
                  new TableCell({ children: [new Paragraph(v)] }),
                ]})),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({ text: 'تفاصيل المدفوعات', heading: HeadingLevel.HEADING_2 }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: ['التاريخ','العميل','الإجمالي','الدفع'].map(h =>
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
                )}),
                ...completed.map(r =>
                  new TableRow({ children: [
                    new TableCell({ children: [new Paragraph(new Date(r.created_at).toLocaleDateString('en-US'))] }),
                    new TableCell({ children: [new Paragraph(r.customer?.full_name ?? '—')] }),
                    new TableCell({ children: [new Paragraph(`${fmt((r.price||0)+(r.spare_parts_total||0))} د.ع`)] }),
                    new TableCell({ children: [new Paragraph(r.payment_method === 'electronic' ? 'إلكتروني' : 'نقدي')] }),
                  ]})
                ),
              ],
            }),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `تمام-مدفوعات-${new Date().toLocaleDateString('en-US').replace(/\//g,'-')}.docx`);
    } finally { setExporting(null); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analytics')}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowRight size={18} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-foreground">سجل المدفوعات</h1>
            <p className="text-slate-500 text-sm mt-0.5">كل المعاملات المالية المكتملة مع خيار التصدير</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportExcel} disabled={!!exporting || loading}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-60"
          >
            <FileSpreadsheet size={15}/> {exporting === 'excel' ? 'جاري...' : 'Excel'}
          </button>
          <button
            onClick={exportWord} disabled={!!exporting || loading}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-60"
          >
            <FileDown size={15}/> {exporting === 'word' ? 'جاري...' : 'Word'}
          </button>
        </div>
      </div>

      <DateRangeBar value={dateRange} onChange={setDateRange} />

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الإيرادات', value: `${fmt(metrics.revenue)} د.ع`, color: 'text-emerald-600' },
          { label: 'الخصومات الممنوحة', value: `${fmt(metrics.totalDiscount)} د.ع`, color: 'text-amber-600' },
          { label: 'صافي الدخل',        value: `${fmt(metrics.netRevenue)} د.ع`, color: 'text-blue-600' },
          { label: 'عدد العمليات',      value: String(metrics.completed),          color: 'text-foreground' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm text-center">
            <p className={`text-xl font-black ${s.color}`}>{loading ? '...' : s.value}</p>
            <p className="text-xs text-slate-400 font-bold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold border-b border-slate-200 dark:border-slate-700">
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
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">جاري التحميل...</td></tr>
              ) : completed.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">لا توجد مدفوعات في هذه الفترة</td></tr>
              ) : (
                completed.map((r, i) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">{new Date(r.created_at).toLocaleDateString('en-US')}</td>
                    <td className="py-3 px-4 font-bold text-foreground">{r.customer?.full_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 hidden md:table-cell">{r.worker?.full_name || '—'}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{r.price ? `${fmt(r.price)} د.ع` : '—'}</td>
                    <td className="py-3 px-4 text-purple-600 font-bold hidden md:table-cell">{r.spare_parts_total ? `${fmt(r.spare_parts_total)} د.ع` : '—'}</td>
                    <td className="py-3 px-4 font-black text-foreground">{fmt((r.price||0)+(r.spare_parts_total||0))} د.ع</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${r.payment_method === 'electronic' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.payment_method === 'electronic' ? '💳 إلكتروني' : '💵 نقدي'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        {metrics.completed > 0 && !loading && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-wrap gap-4 justify-end text-sm font-bold">
            <span className="text-slate-500">الإجمالي:</span>
            <span className="text-emerald-600">{fmt(metrics.serviceRevenue)} د.ع خدمات</span>
            <span className="text-purple-600">+ {fmt(metrics.spareParts)} د.ع قطع</span>
            <span className="text-foreground border-r border-slate-300 pr-4 mr-2">= {fmt(metrics.revenue)} د.ع</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsTable;
