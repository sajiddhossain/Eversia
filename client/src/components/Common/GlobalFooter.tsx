import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, HelpCircle, Users } from 'lucide-react';
import { BrandName } from './BrandName';

export const GlobalFooter: React.FC = () => {
    const navigate = useNavigate();

    return (
        <footer className="mt-12 pt-6 pb-36 md:pb-8 border-t border-white/5 relative overflow-hidden bg-[radial-gradient(circle_at_bottom,rgba(0,130,230,0.01)_0%,transparent_60%)]">
            <div className="absolute inset-0 bg-primary/[0.002] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                {/* Desktop Layout */}
                <div className="hidden md:flex items-center justify-between gap-4 text-xs font-display font-semibold text-white/30">
                    {/* Left: Brand */}
                    <div className="flex items-center gap-1.5">
                        <BrandName className="text-xs font-display font-bold" variant="footer" />
                        <span className="text-white/10">•</span>
                        <span>© {new Date().getFullYear()} Eversia Software</span>
                    </div>

                    {/* Right: Actions & Security */}
                    <div className="flex items-center gap-6">
                        <nav className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/chi-siamo')}
                                className="flex btn-press items-center gap-1.5 text-white/50 hover:text-white transition-colors cursor-pointer group"
                            >
                                <Users className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 transition-colors" />
                                Chi siamo
                            </button>
                            <button
                                onClick={() => navigate('/privacy')}
                                className="flex btn-press items-center gap-1.5 text-white/50 hover:text-white transition-colors cursor-pointer group"
                            >
                                <FileText className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 transition-colors" />
                                Privacy policy
                            </button>
                            <button
                                onClick={() => navigate('/assistenza')}
                                className="flex btn-press items-center gap-1.5 text-white/50 hover:text-white transition-colors cursor-pointer group"
                            >
                                <HelpCircle className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 transition-colors" />
                                Assistenza
                            </button>
                        </nav>
                        <span className="text-white/10">|</span>
                        <div className="flex items-center gap-1.5 text-white/20">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/40" />
                            <span>MGA Engine V3</span>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden flex flex-col items-center justify-center gap-3 text-center text-[10px] font-display font-semibold text-white/30">
                    {/* Brand */}
                    <div className="flex items-center justify-center gap-2">
                        <BrandName className="text-xs font-display font-bold" variant="footer" />
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/chi-siamo')}
                            className="flex btn-press items-center gap-1 text-white/55 hover:text-white transition-colors cursor-pointer"
                        >
                            Chi siamo
                        </button>
                        <span className="text-white/10">•</span>
                        <button
                            onClick={() => navigate('/privacy')}
                            className="flex btn-press items-center gap-1 text-white/55 hover:text-white transition-colors cursor-pointer"
                        >
                            Privacy
                        </button>
                        <span className="text-white/10">•</span>
                        <button
                            onClick={() => navigate('/assistenza')}
                            className="flex btn-press items-center gap-1 text-white/55 hover:text-white transition-colors cursor-pointer"
                        >
                            Assistenza
                        </button>
                    </div>

                    {/* Copyright & Engine */}
                    <div className="pt-2 border-t border-white/[0.03] w-full max-w-[220px] text-[10px] font-display font-medium text-white/20 flex flex-col gap-1">
                        <span>© {new Date().getFullYear()} Eversia Software</span>
                        <span className="flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-500/35" />
                            MGA Engine V3 • Secure
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
