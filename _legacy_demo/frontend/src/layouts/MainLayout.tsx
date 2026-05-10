import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    ArrowLeftRight,
    CreditCard,
    FileText,
    Shield,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Building2,
} from 'lucide-react';

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
    { path: '/cards', icon: CreditCard, label: 'Cards' },
    { path: '/statements', icon: FileText, label: 'Statements' },
];

const adminItems = [
    { path: '/admin', icon: Shield, label: 'Admin Panel' },
];

export default function MainLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const items = user?.role === 'ADMIN' ? [...navItems, ...adminItems] : navItems;

    return (
        <div className="flex min-h-screen">
            {/* Sidebar Overlay (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64
          bg-[var(--bg-secondary)] border-r border-[var(--border)]
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--border)]">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold gradient-text">SecureBank</h1>
                        <p className="text-xs text-[var(--text-muted)]">Online Banking</p>
                    </div>
                    <button
                        className="lg:hidden ml-auto text-[var(--text-secondary)] hover:text-white"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive
                                        ? 'gradient-bg text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                                    }
                `}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-white">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm
              text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 flex items-center h-16 px-6 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
                    <button
                        className="lg:hidden mr-4 text-[var(--text-secondary)] hover:text-white"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <div className={`w-2 h-2 rounded-full ${user?.mfaEnabled ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        <span>{user?.mfaEnabled ? 'MFA Active' : 'MFA Inactive'}</span>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
