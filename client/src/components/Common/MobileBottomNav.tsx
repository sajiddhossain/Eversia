import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, GraduationCap, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'framer-motion';

interface NavItem {
    label: string;
    path: string;
    icon: React.ComponentType<any>;
}

export const MobileBottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userProfile } = useAuth();

    // Hide the bottom navigation bar on deep operational pages, forms, and authentication screens.
    const hideOnPaths = ['/settings', '/login', '/privacy', '/admin/terminal', '/admin/system'];
    const shouldHide = hideOnPaths.includes(location.pathname) ||
                       location.pathname.startsWith('/room/') ||
                       location.pathname.startsWith('/security/') ||
                       location.pathname.startsWith('/admin/assembly/') ||
                       location.pathname.startsWith('/join/');

    const navItems: NavItem[] = [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Social', path: '/social', icon: Users },
        { label: 'Student', path: '/student', icon: GraduationCap },
    ];

    if (userProfile) {
        navItems.push({ label: 'Profilo', path: `/profile/${userProfile.username}`, icon: User });
    }

    if (shouldHide) return null;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 pointer-events-none">
            <div className="max-w-md mx-auto relative">
                {/* Bottom Bar */}
                <nav 
                    className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[22px] p-1.5 flex items-center justify-around shadow-2xl pointer-events-auto relative glass-card"
                >
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <motion.button
                                key={item.path}
                                whileTap={{ scale: 0.93 }}
                                onClick={() => navigate(item.path)}
                                className={`relative z-10 flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors duration-200 cursor-pointer ${
                                    isActive ? 'text-black font-bold' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-pill"
                                        className="absolute inset-0 bg-brand-lime rounded-xl -z-10 shadow-[0_0_15px_rgba(226,243,60,0.35)]"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                                <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                            </motion.button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};
