import * as LucideIcons from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout = () => {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('tamam-theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [moreOpen, setMoreOpen] = useState(false);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('tamam-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    // Primary nav items (always visible)
    const mainNav = [
        { label: 'الرئيسية', icon: LucideIcons.LayoutDashboard, path: '/overview', from: '#72e3ad', to: '#34d399' },
        { label: 'العملاء', icon: LucideIcons.Users, path: '/users', from: '#60a5fa', to: '#3b82f6' },
        { label: 'الفنيين', icon: LucideIcons.UserCog, path: '/workers', from: '#a78bfa', to: '#8b5cf6' },
        { label: 'الطلبات', icon: LucideIcons.Wrench, path: '/requests', from: '#fb923c', to: '#f97316' },
        { label: 'الخدمات', icon: LucideIcons.Settings2, path: '/services', from: '#f472b6', to: '#ec4899' },
    ];

    // Secondary nav items (in "more" dropdown)
    const moreNav = [
        { label: 'الإشعارات', icon: LucideIcons.Bell, path: '/notifications', from: '#fbbf24', to: '#f59e0b' },
        { label: 'المتجر', icon: LucideIcons.Package, path: '/store', from: '#2dd4bf', to: '#14b8a6' },
        { label: 'التسعير', icon: LucideIcons.Tags, path: '/pricing', from: '#e879f9', to: '#d946ef' },
        { label: 'التسعير الذكي', icon: LucideIcons.TrendingUp, path: '/dynamic-pricing', from: '#72e3ad', to: '#06b6d4' },
        { label: 'الاشتراكات', icon: LucideIcons.CreditCard, path: '/subscriptions', from: '#8b5cf6', to: '#6d28d9' },
        { label: 'التحليلات المالية', icon: LucideIcons.BarChart3, path: '/analytics', from: '#f59e0b', to: '#ef4444' },
    ];

    const isMoreActive = moreNav.some(n => location.pathname === n.path);

    const currentPage = [...mainNav, ...moreNav].find(n => location.pathname === n.path);

    return (
        <div className="flex flex-col bg-background text-foreground min-h-screen font-sans transition-colors duration-300">

            {/* ═══ Top Navbar ═══════════════════════════════════════════════════ */}
            <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 h-14">
                    <h1 className="text-lg font-black text-primary">تمام</h1>
                    <div className="flex items-center gap-2">
                        {/* Theme toggle */}
                        <button
                            onClick={() => setIsDark(d => !d)}
                            className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                            title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
                        >
                            {isDark ? <LucideIcons.Sun size={18} /> : <LucideIcons.Moon size={18} />}
                        </button>
                        {/* Sign out */}
                        <button
                            onClick={handleSignOut}
                            className="p-2 rounded-xl hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="تسجيل خروج"
                        >
                            <LucideIcons.LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Gradient Nav Bar */}
                <div className="px-4 pb-3 pt-1">
                    <nav className="flex items-center justify-center gap-2 relative" dir="rtl">
                        {mainNav.map(item => {
                            const isActive = location.pathname === item.path;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    style={{ '--gf': item.from, '--gt': item.to } as React.CSSProperties}
                                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all duration-300 overflow-hidden group
                                        ${isActive
                                            ? 'text-white shadow-lg min-w-[120px] justify-center'
                                            : 'text-muted-foreground hover:text-foreground bg-accent/50 hover:bg-accent min-w-[44px] justify-center'
                                        }`}
                                >
                                    {/* Gradient BG */}
                                    <span className={`absolute inset-0 rounded-full bg-[linear-gradient(135deg,var(--gf),var(--gt))] transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                    {/* Glow */}
                                    <span className={`absolute top-2 inset-x-2 h-full rounded-full bg-[linear-gradient(135deg,var(--gf),var(--gt))] blur-xl transition-opacity duration-300 -z-10 ${isActive ? 'opacity-40' : 'opacity-0'}`} />
                                    
                                    <item.icon size={18} className="relative z-10 flex-shrink-0" />
                                    {isActive && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
                                </NavLink>
                            );
                        })}

                        {/* More dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setMoreOpen(v => !v)}
                                style={{ '--gf': '#94a3b8', '--gt': '#64748b' } as React.CSSProperties}
                                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all duration-300 overflow-hidden group
                                    ${isMoreActive
                                        ? 'text-white shadow-lg min-w-[100px] justify-center'
                                        : 'text-muted-foreground hover:text-foreground bg-accent/50 hover:bg-accent min-w-[44px] justify-center'
                                    }`}
                            >
                                <span className={`absolute inset-0 rounded-full bg-[linear-gradient(135deg,var(--gf),var(--gt))] transition-opacity duration-300 ${isMoreActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                <LucideIcons.MoreHorizontal size={18} className="relative z-10" />
                                {isMoreActive && <span className="relative z-10 whitespace-nowrap">المزيد</span>}
                            </button>

                            {moreOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                                    <div className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-2xl p-2 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                                        {moreNav.map(item => (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setMoreOpen(false)}
                                                style={{ '--gf': item.from, '--gt': item.to } as React.CSSProperties}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group relative overflow-hidden
                                                    ${isActive ? 'text-white' : 'text-foreground hover:bg-accent'}`
                                                }
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        <span className={`absolute inset-0 rounded-xl bg-[linear-gradient(135deg,var(--gf),var(--gt))] transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                                        <item.icon size={18} className="relative z-10" />
                                                        <span className="relative z-10">{item.label}</span>
                                                    </>
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            </header>

            {/* ═══ Page Content ══════════════════════════════════════════════════ */}
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                <Outlet />
            </main>

            {/* ═══ Bottom bar (mobile page title) ═══════════════════════════════ */}
            <footer className="h-10 bg-card border-t border-border flex items-center justify-center px-6 text-xs text-muted-foreground font-bold">
                {currentPage?.label || 'تمام'} — لوحة التحكم
            </footer>
        </div>
    );
};

export default DashboardLayout;
