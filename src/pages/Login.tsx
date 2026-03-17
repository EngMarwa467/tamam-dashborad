import { ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
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
    setLoading(true);
    setError('');

    // Remove leading zeros and spaces
    let cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    const fullPhone = `+964${cleanPhone}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
    });

    if (error) {
      setError('حدث خطأ أثناء إرسال الرمز. تأكد من الرقم والمحاولة لاحقاً.');
      setLoading(false);
    } else {
      setStep('otp');
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    const fullPhone = `+964${cleanPhone}`;

    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      setError('الرمز غير صحيح أو منتهي الصلاحية');
      setLoading(false);
    } else {
      // Verify admin role before granting access
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', authUser.id)
          .single();

        let userRole = profile?.role;

        // Auto-upgrade this specific numbers to admin if it isn't already
        const isAdminNumber =
          fullPhone === '+9647713333333' ||
          fullPhone === '+964771333333'  ||
          fullPhone === '+9647700000000' ||
          fullPhone === '+9647713814021'; // للتجريب

        if (isAdminNumber && userRole !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('user_id', authUser.id);
          userRole = 'admin';
        }

        if (userRole === 'admin') {
          navigate('/overview');
        } else {
          setError('هذا الحساب ليس لديه صلاحيات الدخول للوحة التحكم.');
          await supabase.auth.signOut();
          setLoading(false);
        }
      } else {
        setError('حدث خطأ في المصادقة.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary font-sans RTL">

      <div className="w-full max-w-md bg-card p-10 rounded-3xl shadow-xl shadow-border/50 border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold text-foreground">لوحة تحكم (تمام)</h1>
          <p className="text-muted-foreground mt-2">تسجيل الدخول الآمن للمدراء</p>
        </div>

        {error && (
          <div className="mb-6 bg-destructive/10 text-destructive text-sm p-4 rounded-xl border border-destructive/20 text-center font-bold">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground block">رقم الهاتف الافتراضي (العراق)</label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-muted-foreground font-bold dir-ltr w-16 text-center border-r pr-2 border-border/50">+964</div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-20 pr-4 text-left text-foreground font-bold tracking-wider focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dir-ltr"
                  placeholder="770 123 4567"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 8}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 group mt-8 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <span>إرسال رمز الدخول</span>
                  <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center bg-secondary/50 p-4 rounded-xl border border-border mb-6">
              <p className="text-sm text-muted-foreground">تم إرسال الرمز إلى الرقم:</p>
              <p className="font-bold text-foreground mt-1 tracking-wider dir-ltr">+964 {phone.replace(/^0+/, "")}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground block text-center">رمز التحقق (6 أرقام)</label>
              <div className="relative">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  maxLength={6}
                  className="w-full bg-secondary/50 border border-border rounded-xl py-4 text-center text-3xl text-primary font-black tracking-[1em] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="------"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <span>تأكيد الدخول للوحة</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              className="w-full text-muted-foreground hover:text-foreground font-bold text-sm py-2 mt-2 transition-colors"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
