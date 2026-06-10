import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, ArrowRight } from 'lucide-react';

interface AuthBarrierProps {
    title?: string;
    message?: string;
    fullPage?: boolean;
}

export const AuthBarrier: React.FC<AuthBarrierProps> = ({ 
    title = "Area Riservata", 
    message = "Inserisci le tue credenziali @liceoagnesi.edu.it per esplorare la community, sbloccare badge e scalare la classifica.",
    fullPage = false
}) => {
    const navigate = useNavigate();

    const Content = (
        <div className={`relative group overflow-hidden bg-white/[0.02] border border-white/5 rounded-[2.5rem] ${fullPage ? 'p-12 md:p-20 max-w-2xl' : 'p-12'} text-center space-y-8 transition-all hover:bg-white/[0.03] hover:border-white/10 shadow-2xl`}>
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full opacity-50 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
                <div className={`w-20 h-20 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
                    <Lock className="w-8 h-8 text-primary shadow-[0_0_20px_rgba(226,243,60,0.5)]" />
                </div>

                <div className="space-y-4">
                    <h3 className={`font-black tracking-tight text-white leading-none ${fullPage ? 'text-4xl md:text-5xl' : 'text-2xl'}`}>{title}</h3>
                    <p className={`text-white/30 mx-auto leading-relaxed font-medium ${fullPage ? 'text-base md:text-lg max-w-md' : 'text-sm max-w-xs'}`}>
                        {message}
                    </p>
                </div>

                <div className="pt-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="group/btn flex items-center gap-3 px-10 py-5 bg-primary text-black rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] mx-auto transition-all active:scale-95 shadow-[0_20px_40px_rgba(226,243,60,0.2)] hover:shadow-primary/40 hover:-translate-y-1"
                    >
                        <LogIn className="w-4 h-4" />
                        Accedi con Agnesi
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
                
                {fullPage && (
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 pt-4">
                        eversia
                    </p>
                )}
            </div>

            {/* Decorative dots grid */}
            <div className="absolute bottom-10 left-10 grid grid-cols-3 gap-1.5 opacity-20 hidden md:grid">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-white shadow-[0_0_5px_white]" />
                ))}
            </div>
            
            <div className="absolute top-10 right-10 opacity-5 pointer-events-none">
                <LogIn className="w-32 h-32 text-white -rotate-12" />
            </div>
        </div>
    );

    if (fullPage) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center py-12 px-6">
                {Content}
            </div>
        );
    }

    return Content;
};
