import React from 'react';
import { ShieldCheck } from 'lucide-react';

const LoginHeader: React.FC = () => {
    return (
        <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white/40 text-xs font-display font-semibold backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Eversia system • Accesso protetto
            </div>

            <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tighter leading-none">
                <span className="brand-eversia px-4 pt-1 pb-3">eversia</span>
            </h1>

            <p className="text-white/30 text-sm font-display font-semibold tracking-tight">
                Accesso sicuro al portale studenti
            </p>
        </div>
    );
};

export default LoginHeader;
