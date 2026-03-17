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

 useEffect(() => {
 fetchUsers();
 }, []);

 const fetchUsers = async () => {
 setLoading(true);
 try {
 const { data: profiles, error: pError } = await supabase
 .from('profiles')
 .select('*')
 .in('role', ['customer', 'banned'])
 .order('created_at', { ascending: false });

 if (pError) throw pError;

 // Fetch request counts for customers
 const { data: customerCounts } = await supabase
 .from('maintenance_requests')
 .select('customer_id');

 const customerCountMap: Record<string, number> = {};
 (customerCounts || []).forEach(r => { customerCountMap[r.customer_id] = (customerCountMap[r.customer_id] || 0) + 1; });

 const enrichedUsers = (profiles || []).map(p => ({
 ...p,
 total_requests: customerCountMap[p.user_id] || 0,
 }));

 setUsers(enrichedUsers);

 // Calculate stats
 const now = new Date();
 const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
 setStats({
 total: enrichedUsers.length,
 active: enrichedUsers.filter(u => u.role === 'customer').length,
 banned: enrichedUsers.filter(u => u.role === 'banned').length,
 newThisMonth: enrichedUsers.filter(u => new Date(u.created_at) >= monthStart).length,
 });
 } catch {}
 finally { setLoading(false); }
 };

 const handleBanToggle = async (user: any) => {
 const isBanned = user.role === 'banned';
 const action = isBanned ? 'إلغاء الحظر عن' : 'حظر';
 if (!window.confirm(`هل أنت متأكد من ${action} "${user.full_name}"؟`)) return;
 
 try {
  if (isBanned) {
   // Unban: restore to customer (default)
   const { error } = await supabase
   .from('profiles')
   .update({ role: 'customer' })
   .eq('id', user.id);
   if (error) throw error;
  } else {
   // Ban: set role to banned
   const { error } = await supabase
   .from('profiles')
   .update({ role: 'banned' })
   .eq('id', user.id);
   if (error) throw error;
  }
  fetchUsers();
 } catch (err: any) {
  alert(err.message || 'حدث خطأ');
 }
 };

 const filteredUsers = users.filter((u) => {
 const matchesFilter = filter === 'all' || (filter === 'active' && u.role === 'customer') || (filter === 'banned' && u.role === 'banned');
 const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
 u.phone?.includes(search);
 return matchesFilter && matchesSearch;
 });

 const StatCard = ({ title, value, icon: Icon, color }: any) => (
 <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm flex items-center gap-4 border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
 <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
 <Icon size={22} />
 </div>
 <div>
 <p className="text-xs font-bold text-slate-400">{title}</p>
 <p className="text-2xl font-black text-slate-800 mt-0.5">{loading ? '...' : value}</p>
 </div>
 </div>
 );

 return (
 <div className="space-y-6 animate-in fade-in duration-500 font-sans RTL">
 
 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
 <div>
 <h1 className="text-3xl sm:text-4xl font-black text-slate-800">إدارة العملاء</h1>
 <p className="text-slate-500 mt-1 font-medium text-sm">متابعة وإدارة عملاء التطبيق</p>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 <StatCard title="إجمالي العملاء" value={stats.total} icon={UsersIcon} color="bg-blue-100 text-blue-600" />
 <StatCard title="النشطين" value={stats.active} icon={UserCheck} color="bg-emerald-100 text-emerald-600" />
 <StatCard title="المحظورين" value={stats.banned} icon={ShieldBan} color="bg-red-100 text-red-600" />
 <StatCard title="الجدد هذا الشهر" value={stats.newThisMonth} icon={UserPlus} color="bg-amber-100 text-amber-600" />
 </div>

 {/* Filters & Search */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
 <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
 {(['all', 'active', 'banned'] as const).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${
 filter === f 
 ? 'bg-primary text-white shadow-sm' 
 : 'text-slate-500 hover:text-slate-800'
 }`}
 >
 {f === 'all' ? 'الكل' : f === 'active' ? 'النشطين' : 'المحظورين'}
 </button>
 ))}
 </div>

 <div className="relative flex-1 sm:max-w-xs">
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
 <input 
 type="text"
 placeholder="ابحث بالاسم أو الرقم..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-white border border-slate-200 py-2.5 pr-10 pl-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all text-slate-800"
 />
 </div>
 </div>

 {/* Users Table */}
 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-right text-sm">
 <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs">
 <tr>
 <th className="px-4 sm:px-6 py-4 font-bold">المستخدم</th>
 <th className="px-4 sm:px-6 py-4 font-bold">الدور</th>
 <th className="px-4 sm:px-6 py-4 font-bold hidden md:table-cell">الموقع</th>
 <th className="px-4 sm:px-6 py-4 font-bold hidden sm:table-cell">الانضمام</th>
 <th className="px-4 sm:px-6 py-4 font-bold text-center">الطلبات</th>
 <th className="px-4 sm:px-6 py-4 font-bold text-center">الإجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {loading ? (
 <tr>
 <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
 جاري تحميل البيانات...
 </td>
 </tr>
 ) : filteredUsers.length === 0 ? (
 <tr>
 <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
 لا يوجد مستخدمين مطابقين للبحث.
 </td>
 </tr>
 ) : (
 filteredUsers.map((user) => (
 <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.role === 'banned' ? 'opacity-50' : ''}`}>
 <td className="px-4 sm:px-6 py-3 sm:py-4">
 <div className="flex items-center gap-3">
 <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm ${
 user.role === 'banned' ? 'bg-red-100 text-red-600' :
 user.role === 'worker' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
 }`}>
 {user.full_name?.charAt(0) || '?'}
 </div>
 <div className="min-w-0">
 <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">
 {user.full_name || 'غير معروف'}
 {user.role === 'banned' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">محظور</span>}
 </div>
 <div className="text-xs text-slate-400 mt-0.5 dir-ltr text-right truncate">{user.phone}</div>
 </div>
 </div>
 </td>
 
 <td className="px-4 sm:px-6 py-3 sm:py-4">
 <span className={`px-2 py-1 rounded-md text-xs font-bold ${
 user.role === 'banned'
 ? 'bg-red-50 text-red-600'
 : user.role === 'worker' 
 ? 'bg-purple-50 text-purple-700' 
 : 'bg-blue-50 text-blue-700'
 }`}>
 {user.role === 'banned' ? 'محظور' : user.role === 'worker' ? 'فني' : 'عميل'}
 </span>
 </td>

 <td className="px-4 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
 <div className="flex items-center gap-1.5 text-slate-400 text-xs">
 <MapPin size={13} />
 <span className="truncate max-w-[120px]">{user.address || 'غير محدد'}</span>
 </div>
 </td>

 <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-400 text-xs hidden sm:table-cell">
 {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: arSA }) : '-'}
 </td>

 <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
 <span className="font-black text-slate-800 text-sm">{user.total_requests || 0}</span>
 </td>

 <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
 <div className="flex items-center justify-center gap-1">
 <button 
 onClick={() => setSelectedUser(user)}
 className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors" 
 title="عرض التفاصيل"
 >
 <Eye size={16} />
 </button>
 <button 
 onClick={() => handleBanToggle(user)}
 className={`p-1.5 rounded-lg transition-colors ${
 user.role === 'banned' 
 ? 'text-emerald-500 hover:bg-emerald-50' 
 : 'text-red-500 hover:bg-red-50'
 }`}
 title={user.role === 'banned' ? 'إلغاء الحظر' : 'حظر'}
 >
 {user.role === 'banned' ? <UserCheck size={16} /> : <ShieldBan size={16} />}
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 
 {/* Results Count */}
 {!loading && (
 <div className="px-4 sm:px-6 py-3 border-t border-slate-100 text-slate-400 text-xs font-bold">
 عرض {filteredUsers.length} من {users.length} مستخدم
 </div>
 )}
 </div>

 {/* User Details Modal */}
 {selectedUser && (
 <UserDetailsModal 
 user={selectedUser} 
 onClose={() => setSelectedUser(null)} 
 onAction={() => { fetchUsers(); setSelectedUser(null); }}
 />
 )}
 
 </div>
 );
};

export default Users;
