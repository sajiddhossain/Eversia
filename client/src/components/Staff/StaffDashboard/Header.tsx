import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
    return (
        <div className="relative mb-10 p-6 md:p-8 bg-[#09090b]/40 backdrop-blur-md border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Decorative background glows inside the header */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand-lime/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/5 rounded-full blur-[70px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-full text-white/60 text-xs font-display font-semibold backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse shadow-[0_0_8px_rgba(226,243,60,0.8)]" />
                        <Sparkles className="w-3 h-3 text-brand-lime" />
                        Area staff autorizzata
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight leading-normal py-1">
                        <span className="inline-block px-1.5 text-transparent bg-clip-text bg-gradient-to-r from-brand-lime to-[#fbff7a] drop-shadow-[0_0_30px_rgba(226,243,60,0.2)]">INCARICHI</span>{' '}
                        <span className="inline-block text-white opacity-50 px-1">STAFF</span>
                    </h1>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border-l-2 border-brand-lime/30 pl-5 py-1.5">
                    <div className="space-y-1">
                        <h4 className="text-xs font-display font-semibold text-brand-lime">Accesso autorizzato</h4>
                        <p className="text-white/50 font-semibold text-xs md:text-sm tracking-tight leading-relaxed max-w-xl">
                            I tuoi permessi di gestione sono attivi in tempo reale. Ogni azione di check-in o monitoraggio viene loggata per garantire la sicurezza dell'istituto.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-white/40 text-xs font-display font-semibold bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl shrink-0">
                        <Shield className="w-3.5 h-3.5 text-brand-lime" />
                        Sessione sicura attiva
                    </div>
                </div>
            </div>
        </div>
    );
};
