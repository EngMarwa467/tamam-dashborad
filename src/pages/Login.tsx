import { ChevronLeft, Loader2, ShieldCheck, Star, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    let cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+964${cleanPhone}` });
    if (error) { setError('حدث خطأ أثناء إرسال الرمز. تأكد من الرقم والمحاولة لاحقاً.'); setLoading(false); }
    else { setStep('otp'); setLoading(false); }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    let cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    const fullPhone = `+964${cleanPhone}`;
    const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: 'sms' });
    if (error) { setError('الرمز غير صحيح أو منتهي الصلاحية'); setLoading(false); }
    else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', authUser.id).single();
        let userRole = profile?.role;
        const isAdminNumber = ['+9647713333333', '+964771333333', '+9647700000000', '+9647713814021'].includes(fullPhone);
        if (isAdminNumber && userRole !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('user_id', authUser.id);
          userRole = 'admin';
        }
        if (userRole === 'admin') { navigate('/overview'); }
        else { setError('هذا الحساب ليس لديه صلاحيات الدخول للوحة التحكم.'); await supabase.auth.signOut(); setLoading(false); }
      } else { setError('حدث خطأ في المصادقة.'); setLoading(false); }
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950" dir="rtl">

      {/* ── Left: Branding Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 flex-col justify-between p-12">
        {/* Background circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-500/20 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-blue-300/10 rounded-full" />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-white font-black text-xl">تمام</span>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative">
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            لوحة التحكم<br />
            <span className="text-pink-300">الذكية</span> تنتظرك
          </h2>
          <p className="text-blue-100 text-sm leading-relaxed mb-8">
            إدارة الطلبات، الفنيين، العملاء، والأرباح —<br />كل شيء في مكان واحد.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['إدارة الطلبات', 'تحليلات متقدمة', 'إشعارات فورية', 'إدارة الفنيين'].map(f => (
              <span key={f} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                <Star size={10} className="fill-amber-300 text-amber-300" />{f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-blue-200/60 text-xs">© 2026 منصة تمام للصيانة</p>
      </div>

      {/* ── Right: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-primary" />
            </div>
            <span className="text-foreground font-black text-lg">تمام — لوحة التحكم</span>
          </div>

          <div className="bg-card border border-border rounded-3xl shadow-xl shadow-black/5 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-2xl font-black text-foreground">
                {step === 'phone' ? 'تسجيل الدخول' : 'تأكيد الهوية'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {step === 'phone' ? 'دخول آمن للمدراء فقط' : 'أدخل الرمز المُرسل لهاتفك'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 bg-destructive/10 text-destructive text-sm p-4 rounded-2xl border border-destructive/20 text-center font-bold">
                {error}
              </div>
            )}

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground block">رقم الهاتف</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-muted-foreground font-bold text-sm dir-ltr border-l border-border pl-3">+964</div>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                      className="w-full bg-input border border-border rounded-2xl py-3.5 pl-20 pr-4 text-left text-foreground font-bold tracking-wider focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all dir-ltr"
                      placeholder="770 123 4567" />
                  </div>
                </div>
                <button type="submit" disabled={loading || phone.length < 8}
                  className="w-full bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:shadow-none mt-2">
                  {loading ? <Loader2 size={22} className="animate-spin" /> : <>
                    <span>إرسال رمز الدخول</span>
                    <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl text-center">
                  <p className="text-xs text-muted-foreground">تم إرسال الرمز إلى</p>
                  <p className="font-black text-foreground mt-0.5 dir-ltr tracking-wider">+964 {phone.replace(/^0+/, '')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground block text-center">رمز التحقق (6 أرقام)</label>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required
                    maxLength={6} autoFocus
                    className="w-full bg-input border border-border rounded-2xl py-4 text-center text-3xl text-primary font-black tracking-[1em] focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
                    placeholder="——————" />
                </div>
                <button type="submit" disabled={loading || otp.length !== 6}
                  className="w-full bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none">
                  {loading ? <Loader2 size={22} className="animate-spin" /> : <span>تأكيد الدخول للوحة</span>}
                </button>
                <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                  className="w-full text-muted-foreground hover:text-foreground font-bold text-sm py-2 transition-colors">
                  تغيير رقم الهاتف
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
