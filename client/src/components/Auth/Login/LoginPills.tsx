import React from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';

const LoginPills: React.FC = () => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400/40" />
                <span className="text-xs font-display font-semibold text-white/30">Dati protetti</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center gap-2">
                <LogIn className="w-4 h-4 text-primary/40" />
                <span className="text-xs font-display font-semibold text-white/30">Login rapido</span>
            </div>
        </div>
    );
};

export default LoginPills;
