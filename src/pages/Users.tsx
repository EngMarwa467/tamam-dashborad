import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, MapPin, UserCheck, ShieldBan, Eye, Users as UsersIcon, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import UserDetailsModal from '../components/UserDetailsModal';

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, banned: 0, newThisMonth: 0 });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles').select('*').in('role', ['customer', 'banned']).order('created_at', { ascending: false });
      if (pError) throw pError;
      const { data: customerCounts } = await supabase.from('maintenance_requests').select('customer_id');
      const customerCountMap: Record<string, number> = {};
      (customerCounts || []).forEach(r => { customerCountMap[r.customer_id] = (customerCountMap[r.customer_id] || 0) + 1; });
      const enrichedUsers = (profiles || []).map(p => ({ ...p, total_requests: customerCountMap[p.user_id] || 0 }));
      setUsers(enrichedUsers);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStats({
        total: enrichedUsers.length,
        active: enrichedUsers.filter(u => u.role === 'customer').length,
        banned: enrichedUsers.filter(u => u.role === 'banned').length,
        newThisMonth: enrichedUsers.filter(u => new Date(u.created_at) >= monthStart).length,
      });
    } catch {} finally { setLoading(false); }
  };

  const handleBanToggle = async (user: any) => {
    const isBanned = user.role === 'banned';
    if (!window.confirm(`هل أنت متأكد من ${isBanned ? 'إلغاء الحظر عن' : 'حظر'} "${user.full_name}"?`)) return;
    try {
      const { error } = await supabase.from('profiles').update({ role: isBanned ? 'customer' : 'banned' }).eq('id', user.id);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) { alert(err.message || 'حدث خطأ'); }
  };

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || (filter === 'active' && u.role === 'customer') || (filter === 'banned' && u.role === 'banned');
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search);
    return matchesFilter && matchesSearch;
  });

  const kpis = [
    { title: 'إجمالي العملاء', value: stats.total, icon: UsersIcon, from: 'from-blue-500', to: 'to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600' },
    { title: 'النشطين', value: stats.active, icon: UserCheck, from: 'from-emerald-500', to: 'to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
    { title: 'المحظورين', value: stats.banned, icon: ShieldBan, from: 'from-rose-500', to: 'to-red-600', light: 'bg-rose-50', text: 'text-rose-600' },
    { title: 'جدد هذا الشهر', value: stats.newThisMonth, icon: UserPlus, from: 'from-amber-400', to: 'to-orange-500', light: 'bg-amber-50', text: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">

      {/* ── Hero Strip ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-600 to-indigo-700 px-8 py-8 shadow-xl shadow-blue-200/40">
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-pink-400/20 rounded-full translate-y-1/2" />
        <div className="relative">
          <span className="text-blue-200 text-xs font-bold">👥 منصة تمام</span>
          <h1 className="text-3xl font-black text-white mt-1">إدارة العملاء</h1>
          <p className="text-blue-100/80 mt-1 text-sm">متابعة وإدارة عملاء التطبيق</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden p-5">
            <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${k.from} ${k.to}`} />
            <div className={`w-10 h-10 rounded-2xl ${k.light} flex items-center justify-center mb-3`}>
              <k.icon size={20} className={k.text} />
            </div>
            <p className="text-xs font-bold text-slate-400">{k.title}</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">
              {loading ? <span className="inline-block w-10 h-6 bg-slate-100 rounded animate-pulse" /> : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
          {(['all', 'active', 'banned'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === f ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {f === 'all' ? 'الكل' : f === 'active' ? 'النشطين' : 'المحظورين'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="ابحث بالاسم أو الرقم..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 py-2.5 pr-10 pl-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-slate-800" />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs">
              <tr>
                <th className="px-5 py-4 font-bold text-slate-500">المستخدم</th>
                <th className="px-5 py-4 font-bold text-slate-500">الدور</th>
                <th className="px-5 py-4 font-bold text-slate-500 hidden md:table-cell">الموقع</th>
                <th className="px-5 py-4 font-bold text-slate-500 hidden sm:table-cell">الانضمام</th>
                <th className="px-5 py-4 font-bold text-slate-500 text-center">الطلبات</th>
                <th className="px-5 py-4 font-bold text-slate-500 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-14 text-slate-400">جاري التحميل...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-14 text-slate-400">لا يوجد مستخدمين مطابقين.</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className={`hover:bg-slate-50/60 transition-colors ${user.role === 'banned' ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 ${user.role === 'banned' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'}`}>
                        {user.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">
                          {user.full_name || 'غير معروف'}
                          {user.role === 'banned' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold">محظور</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate">{user.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${user.role === 'banned' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
                      {user.role === 'banned' ? 'محظور' : 'عميل'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <MapPin size={12} /><span className="truncate max-w-[120px]">{user.address || 'غير محدد'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs hidden sm:table-cell">
                    {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: arSA }) : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="font-black text-slate-800">{user.total_requests || 0}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => setSelectedUser(user)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"><Eye size={15} /></button>
                      <button onClick={() => handleBanToggle(user)} className={`p-2 rounded-xl transition-colors ${user.role === 'banned' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'}`}>
                        {user.role === 'banned' ? <UserCheck size={15} /> : <ShieldBan size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div className="px-5 py-3 border-t border-slate-100 text-slate-400 text-xs font-bold">عرض {filteredUsers.length} من {users.length} مستخدم</div>}
      </div>

      {selectedUser && (
        <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} onAction={() => { fetchUsers(); setSelectedUser(null); }} />
      )}
    </div>
  );
};

export default Users;
