import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { X, Phone, MapPin, Calendar, Wrench, ShieldCheck, ShieldBan, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface UserDetailsModalProps {
 user: any;
 onClose: () => void;
 onAction: () => void;
}

export default function UserDetailsModal({ user, onClose, onAction }: UserDetailsModalProps) {
 const [requests, setRequests] = useState<any[]>([]);
 const [loadingRequests, setLoadingRequests] = useState(true);
 const [actionLoading, setActionLoading] = useState(false);

 useEffect(() => {
   if (!user) return;
   fetchUserRequests();
 }, [user]);

 const fetchUserRequests = async () => {
   setLoadingRequests(true);
   try {
     const column = user.role === 'worker' ? 'worker_id' : 'customer_id';
     const { data } = await supabase
       .from('maintenance_requests')
       .select('id, status, created_at, price, address, description')
       .eq(column, user.user_id)
       .order('created_at', { ascending: false })
       .limit(10);
     setRequests(data || []);
   } catch {}
   finally { setLoadingRequests(false); }
 };

 const toggleBan = async () => {
   setActionLoading(true);
   try {
     const isBanned = user.role === 'banned';
     const newRole = isBanned ? 'customer' : 'banned';
     const { error } = await supabase
       .from('profiles')
       .update({ role: newRole })
       .eq('id', user.id);
     if (error) throw error;
     onAction();
   } catch (err: any) {
     alert(err.message || 'حدث خطأ');
   } finally {
     setActionLoading(false);
   }
 };

 if (!user) return null;

 const statusMap: Record<string, { label: string; color: string }> = {
   pending: { label: 'بانتظار', color: 'bg-amber-100 text-amber-700' },
   accepted: { label: 'مقبول', color: 'bg-blue-100 text-blue-700' },
   en_route: { label: 'بالطريق', color: 'bg-indigo-100 text-indigo-700' },
   arrived: { label: 'وصل', color: 'bg-purple-100 text-purple-700' },
   in_progress: { label: 'جاري', color: 'bg-cyan-100 text-cyan-700' },
   completed: { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700' },
   canceled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
   cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
 };

 return (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 animate-in fade-in duration-200" onClick={onClose}>
     <div 
       className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden" 
       onClick={e => e.stopPropagation()}
       dir="rtl"
     >
       {/* Header */}
       <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-200 bg-white">
         <div className="flex items-center gap-3">
           <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black ${
             user.role === 'worker' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
           }`}>
             {user.full_name?.charAt(0) || '?'}
           </div>
           <div>
             <h2 className="text-lg font-black text-slate-800">{user.full_name || 'غير معروف'}</h2>
             <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
               user.role === 'worker' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
             }`}>
               {user.role === 'worker' ? 'فني صيانة' : 'عميل'}
             </span>
           </div>
         </div>
         <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
           <X size={20} className="text-slate-500" />
         </button>
       </div>

       {/* Content */}
       <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">

         {/* Info Grid */}
         <div className="grid grid-cols-2 gap-3">
           <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
               <Phone size={14} className="text-blue-600" />
             </div>
             <div className="min-w-0">
               <p className="text-[10px] font-bold text-slate-400">رقم الهاتف</p>
               <p className="text-xs font-bold text-slate-700 truncate dir-ltr text-right">{user.phone || '---'}</p>
             </div>
           </div>
           <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
               <MapPin size={14} className="text-emerald-600" />
             </div>
             <div className="min-w-0">
               <p className="text-[10px] font-bold text-slate-400">العنوان</p>
               <p className="text-xs font-bold text-slate-700 truncate">{user.address || 'غير محدد'}</p>
             </div>
           </div>
           <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
               <Calendar size={14} className="text-amber-600" />
             </div>
             <div className="min-w-0">
               <p className="text-[10px] font-bold text-slate-400">تاريخ الانضمام</p>
               <p className="text-xs font-bold text-slate-700">{user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: arSA }) : '---'}</p>
             </div>
           </div>
           <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
               <Wrench size={14} className="text-purple-600" />
             </div>
             <div className="min-w-0">
               <p className="text-[10px] font-bold text-slate-400">إجمالي الطلبات</p>
               <p className="text-xs font-bold text-slate-700">{user.total_requests || 0} طلب</p>
             </div>
           </div>
         </div>

         {/* Ban Status */}
         {user.role === 'banned' && (
           <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
             <ShieldBan size={16} className="text-red-600 flex-shrink-0" />
             <p className="text-xs font-bold text-red-700">هذا المستخدم محظور حالياً</p>
           </div>
         )}

         {/* Recent Requests */}
         <div>
           <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
             <Clock size={14} className="text-primary" />
             آخر الطلبات
           </h3>
           {loadingRequests ? (
             <div className="text-center py-6 text-slate-400 text-sm">جاري التحميل...</div>
           ) : requests.length === 0 ? (
             <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-400 text-sm">لا يوجد طلبات لهذا المستخدم</div>
           ) : (
             <div className="space-y-2 max-h-48 overflow-y-auto">
               {requests.map(req => {
                 const st = statusMap[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-600' };
                 return (
                   <div key={req.id} className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-3 flex items-center justify-between gap-2">
                     <div className="min-w-0 flex-1">
                       <p className="text-xs font-bold text-slate-700 truncate">{req.description || req.address || 'بدون وصف'}</p>
                       <p className="text-[10px] text-slate-400 mt-0.5">
                         {req.created_at ? format(new Date(req.created_at), 'dd MMM yyyy', { locale: arSA }) : ''}
                         {req.price ? ` • ${req.price.toLocaleString('en-US')} د.ع` : ''}
                       </p>
                     </div>
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${st.color}`}>
                       {st.label}
                     </span>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       </div>

       {/* Action Footer */}
       <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
         <button
           onClick={toggleBan}
           disabled={actionLoading}
           className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
             user.role === 'banned' 
               ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
               : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
           }`}
         >
           {user.role === 'banned' ? (
             <><ShieldCheck size={16} /> إلغاء الحظر</>
           ) : (
             <><ShieldBan size={16} /> حظر المستخدم</>
           )}
         </button>
         <button
           onClick={onClose}
           className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
         >
           إغلاق
         </button>
       </div>
     </div>
   </div>
 );
}
