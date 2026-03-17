import type { DateRange } from './useAnalyticsData';
import { DATE_RANGE_LABELS } from './useAnalyticsData';

export const DateRangeBar = ({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) => (
  <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-2xl shadow-sm w-full max-w-md">
    {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(r => (
      <button
        key={r}
        onClick={() => onChange(r)}
        className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
          value === r
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-100'
        }`}
      >
        {DATE_RANGE_LABELS[r]}
      </button>
    ))}
  </div>
);
