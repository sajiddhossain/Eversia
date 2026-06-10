import React from 'react';
import { Sparkles } from 'lucide-react';

interface HeroProps {
    schoolName: string;
    isGuest?: boolean;
}

const Hero: React.FC<HeroProps> = ({ schoolName, isGuest }) => {
    return (
        <div className="relative">
            {/* Ambient Animated Glows */}
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-brand-lime/10 rounded-full blur-[160px] animate-pulse pointer-events-none" />
            <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
            
            {/* Fine Background Dot Matrix (CSS Pattern) */}
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[3rem]"
                style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
                <div className="space-y-6">
                    {/* Role / School Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.02] border border-white/5 rounded-full text-white/65 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-xl shadow-2xl hover:border-brand-lime/20 transition-colors group cursor-default">
                        <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse shadow-[0_0_10px_rgba(226,243,60,0.8)]" />
                        <Sparkles className="w-3 h-3 text-brand-lime/40 group-hover:rotate-45 transition-transform" />
                        <span>{isGuest ? 'Accesso Visitatori' : 'Area Studenti'}</span>
                        <span className="text-white/20">•</span>
                        <span className="text-white/40">{schoolName}</span>
                    </div>

                    {/* Big Bold Typography with gradient-text */}
                    <div className="space-y-2">
                        <h1 className="text-4xl xs:text-5xl sm:text-6xl md:text-8xl font-black italic tracking-tighter leading-[0.9] select-none font-display">
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-lime to-emerald-400 drop-shadow-[0_0_40px_rgba(226,243,60,0.2)]">
                                {isGuest ? 'Scopri' : 'Dashboard'}
                            </span>
                            <span className="block text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                {isGuest ? 'Assemblee' : 'Studenti'}
                            </span>
                        </h1>
                    </div>

                    {/* Description subtitle */}
                    <p className="text-white/50 font-semibold text-sm md:text-lg max-w-md tracking-tight leading-relaxed">
                        {isGuest 
                            ? "Esplora le attività in corso e scopri i temi dell'assemblea. Accedi per prenotare il tuo posto."
                            : "Gestisci le tue prenotazioni e segui l'agenda dell'assemblea in tempo reale."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Hero;
