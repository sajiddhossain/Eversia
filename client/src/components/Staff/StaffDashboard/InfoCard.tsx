import React from 'react';
import { Database } from 'lucide-react';

export const InfoCard: React.FC = () => {
    return (
        <div className="bg-[#09090b]/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 flex gap-5 items-start shadow-xl">
            <div className="p-3.5 bg-brand-lime/10 rounded-xl text-brand-lime flex-shrink-0 border border-brand-lime/10">
                <Database className="w-5 h-5" />
            </div>
            <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-brand-lime mb-1.5">Accesso Autorizzato</h4>
                <p className="text-white/50 text-xs leading-relaxed">
                    I tuoi permessi di gestione sono attivi in tempo reale.
                    Ogni azione di check-in o monitoraggio viene loggata per garantire la sicurezza dell'istituto.
                </p>
            </div>
        </div>
    );
};
