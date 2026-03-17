import { AlertCircle, Bell, CheckCircle2, Send, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Notifications = () => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [target, setTarget] = useState<'all' | 'customers' | 'workers' | 'specific'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    // Handle user search for specific targeting
    useEffect(() => {
        if (target !== 'specific' || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const searchUsers = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, user_id, full_name, role, phone, expo_push_token')
                .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
                .limit(10);

            setSearchResults(data || []);
        };

        const debounce = setTimeout(searchUsers, 500);
        return () => clearTimeout(debounce);
    }, [searchQuery, target]);

    const toggleUserSelection = (user: any) => {
        if (selectedUsers.find(u => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
        setSearchQuery('');
    };

    const handleSendNotification = async () => {
        if (!title.trim() || !body.trim()) {
            setStatus({ type: 'error', message: 'يرجى إدخال عنوان ونص الإشعار' });
            return;
        }

        if (target === 'specific' && selectedUsers.length === 0) {
            setStatus({ type: 'error', message: 'يرجى اختيار مستخدم واحد على الأقل' });
            return;
        }

        setLoading(true);
        setStatus({ type: null, message: '' });

        try {
            let tokens: string[] = [];

            // 1. Fetch tokens based on target
            if (target === 'specific') {
                tokens = selectedUsers.map(u => u.expo_push_token).filter(Boolean);
            } else {
                let query = supabase.from('profiles').select('expo_push_token').not('expo_push_token', 'is', null);

                if (target === 'customers') query = query.eq('role', 'customer');
                if (target === 'workers') query = query.eq('role', 'worker');

                const { data, error } = await query;
                if (error) throw error;
                tokens = (data || []).map(p => p.expo_push_token).filter(Boolean);
            }

            if (tokens.length === 0) {
                setStatus({ type: 'error', message: 'لم يتم العثور على أجهزة مسجلة للفئة المحددة' });
                setLoading(false);
                return;
            }

            // 2. Prepare Expo Push API payload (max 100 per request, Chunking)
            const messages = tokens.map(token => ({
                to: token,
                sound: 'default',
                title,
                body,
                data: { screen: 'Notifications' }, // Optional data payload
            }));

            // Expo API recommends chunking by 100
            const CHUNK_SIZE = 100;
            let successCount = 0;

            for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
                const chunk = messages.slice(i, i + CHUNK_SIZE);
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(chunk),
                });

                if (response.ok) {
                    successCount += chunk.length;
                }
            }

            setStatus({ type: 'success', message: `تم إرسال الإشعار بنجاح إلى ${successCount} جهاز 🚀` });

            // Reset form
            setTitle('');
            setBody('');
            if (target === 'specific') setSelectedUsers([]);

        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || 'حدث خطأ أثناء إرسال الإشعارات' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans RTL">

            {/* Header */}
            <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 flex items-center gap-3">
                    الإشعارات <Bell className="text-primary" size={32} />
                </h1>
                <p className="text-slate-500 mt-1 font-medium text-sm">
                    إرسال إشعارات مخصصة لمستخدمي التطبيق وتنبيههم بآخر التحديثات
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-6">محتوى الإشعار</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">عنوان الإشعار</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="مثال: خصم 50% على خدمات السباكة!"
                                    className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all text-slate-800"
                                    maxLength={50}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">نص الإشعار</label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="اكتب التفاصيل هنا..."
                                    rows={4}
                                    className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all text-slate-800 resize-none"
                                    maxLength={150}
                                />
                                <div className="text-left mt-1 text-xs text-slate-400 font-medium">
                                    {body.length}/150
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-6">الجمهور المستهدف</h2>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            {[
                                { id: 'all', label: 'الجميع' },
                                { id: 'customers', label: 'العملاء فقط' },
                                { id: 'workers', label: 'الفنيين فقط' },
                                { id: 'specific', label: 'مستخدم محدد' },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTarget(t.id as any)}
                                    className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${target === t.id
                                            ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-primary/50'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Specific User Search */}
                        {target === 'specific' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="ابحث عن اسم المستخدم أو رقم الهاتف..."
                                        className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all text-slate-800"
                                    />
                                    {searchResults.length > 0 && searchQuery && (
                                        <div className="absolute top-14 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                                            {searchResults.map((user) => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => toggleUserSelection(user)}
                                                    className="w-full text-right px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                            {user.full_name || 'بدون اسم'}
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${user.role === 'worker' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {user.role === 'worker' ? 'فني' : 'عميل'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-400 mt-0.5">{user.phone}</div>
                                                    </div>
                                                    {!user.expo_push_token && (
                                                        <span className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded-md font-bold">لا يملك جهاز</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map(user => (
                                            <div key={user.id} className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                                                {user.full_name}
                                                <button onClick={() => toggleUserSelection(user)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div>
                        {status.type && (
                            <div className={`p-4 rounded-xl mb-4 flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                <span className="font-bold text-sm">{status.message}</span>
                            </div>
                        )}

                        <button
                            onClick={handleSendNotification}
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 shadow-lg transition-all ${loading ? 'bg-slate-400 translate-y-0.5' : 'bg-primary hover:bg-primary/90 hover:-translate-y-0.5 shadow-primary/30'
                                }`}
                        >
                            {loading ? (
                                <span>جاري الإرسال...</span>
                            ) : (
                                <>
                                    <Send size={20} />
                                    إرسال الإشعار الآن
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Sidebar / Preview */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-800 rounded-3xl p-6 shadow-xl sticky top-6">
                        <h3 className="text-white font-bold mb-6 text-center">معاينة على الهاتف</h3>

                        <div className="bg-black/20 rounded-[2.5rem] p-3 shadow-inner mx-auto max-w-[280px] h-[550px] border-4 border-slate-700 relative overflow-hidden">
                            {/* Phone Top Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-700 rounded-b-2xl z-20"></div>

                            <div className="bg-slate-100 w-full h-full rounded-[2rem] overflow-hidden relative">
                                {/* Wallpaper simulation */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-emerald-50 opacity-50"></div>

                                {/* Notification Bubble */}
                                {title || body ? (
                                    <div className="absolute top-12 left-2 right-2 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-4 fade-in duration-300">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                                                    <span className="text-white text-[10px] font-bold">T</span>
                                                </div>
                                                <span className="text-xs font-bold text-slate-800">تطبيق تمام</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400">الآن</span>
                                        </div>
                                        <p className="font-bold text-sm text-slate-800 break-words">{title || 'عنوان الإشعار'}</p>
                                        {body && <p className="text-xs text-slate-600 mt-1 break-words leading-relaxed">{body}</p>}
                                    </div>
                                ) : (
                                    <div className="absolute top-1/2 left-0 right-0 text-center px-4 -translate-y-1/2 opacity-30">
                                        <Bell size={48} className="mx-auto mb-4 text-slate-400" />
                                        <p className="text-sm font-bold text-slate-500">اكتب إشعاراً لرؤية المعاينة هنا</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                            <Users size={14} />
                            <span>يصل للمستخدمين فوراً عند النقر على إرسال</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Notifications;
