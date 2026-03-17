import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

export type DateRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

export interface AnalyticsData {
  requests: any[];
  discountUsage: any[];
}

export interface AnalyticsMetrics {
  total: number;
  completed: number;
  canceled: number;
  revenue: number;
  spareParts: number;
  serviceRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  avgOrder: number;
  cancelRate: number;
  completeRate: number;
  electronic: number;
  cash: number;
}

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  week: 'أسبوع', month: 'شهر', '3months': '3 أشهر',
  '6months': '6 أشهر', year: 'سنة', all: 'الكل',
};

export const MONTH_LABELS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export const fmt = (n: number) => n.toLocaleString('en-US');

const getStartDate = (range: DateRange): Date | null => {
  if (range === 'all') return null;
  const days: Record<DateRange, number> = {
    week: 7, month: 30, '3months': 90, '6months': 180, year: 365, all: 0,
  };
  const d = new Date();
  d.setDate(d.getDate() - days[range]);
  return d;
};

export const useAnalyticsData = (dateRange: DateRange) => {
  const [data, setData] = useState<AnalyticsData>({ requests: [], discountUsage: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(dateRange);

      let reqQuery = supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (startDate) reqQuery = reqQuery.gte('created_at', startDate.toISOString());

      const [{ data: requests }, { data: discountUsage }, { data: profiles }] = await Promise.all([
        reqQuery,
        supabase.from('discount_usage').select('discount_amount, created_at, request_id'),
        supabase.from('profiles').select('id, user_id, full_name, phone'),
      ]);

      const profilesMap: Record<string, any> = (profiles || []).reduce(
        (acc: any, p: any) => {
          // customer_id / worker_id in maintenance_requests = auth.users.id = profiles.user_id
          if (p.user_id) acc[p.user_id] = p;
          // Also map by profiles.id as fallback
          acc[p.id] = p;
          return acc;
        }, {}
      );
      const mappedRequests = (requests || []).map((r: any) => ({
        ...r,
        customer: profilesMap[r.customer_id] || null,
        worker: profilesMap[r.worker_id] || null,
      }));

      setData({ requests: mappedRequests, discountUsage: discountUsage || [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dateRange]);

  const metrics = useMemo((): AnalyticsMetrics => {
    const completed = data.requests.filter(r => r.status === 'completed');
    const canceled  = data.requests.filter(r => ['canceled','cancelled'].includes(r.status));
    const total     = data.requests.length;
    const revenue   = completed.reduce((s, r) => s + (r.price || 0) + (r.spare_parts_total || 0), 0);
    const spareParts = completed.reduce((s, r) => s + (r.spare_parts_total || 0), 0);
    const serviceRevenue = completed.reduce((s, r) => s + (r.price || 0), 0);
    const totalDiscount  = data.discountUsage.reduce((s, u) => s + (u.discount_amount || 0), 0);
    return {
      total, completed: completed.length, canceled: canceled.length,
      revenue, spareParts, serviceRevenue,
      totalDiscount, netRevenue: revenue - totalDiscount,
      avgOrder: completed.length > 0 ? revenue / completed.length : 0,
      cancelRate:   total > 0 ? (canceled.length  / total) * 100 : 0,
      completeRate: total > 0 ? (completed.length / total) * 100 : 0,
      electronic: completed.filter(r => r.payment_method === 'electronic').length,
      cash:       completed.filter(r => r.payment_method !== 'electronic').length,
    };
  }, [data]);

  return { data, loading, metrics, refetch: fetchData };
};


