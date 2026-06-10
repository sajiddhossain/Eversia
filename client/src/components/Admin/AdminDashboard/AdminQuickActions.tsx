import React from "react";
import { useNavigate } from "react-router-dom";
import { Database, Layers, ShieldCheck, Award } from "lucide-react";

interface AdminQuickActionsProps {
    activeAssemblyId?: string;
    onOpenStaff: () => void;
    onOpenBadges: () => void;
}

export const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({
    activeAssemblyId,
    onOpenStaff,
    onOpenBadges
}) => {
    const navigate = useNavigate();

    if (!activeAssemblyId) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            <button
                onClick={() => navigate(`/admin/assembly/${activeAssemblyId}?tab=activities`)}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-primary/30 p-6 md:p-8 rounded-3xl flex items-center gap-6 md:gap-8 transition-all group hover:bg-white/[0.04] active:scale-95 shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-[60px] group-hover:bg-primary/10 transition-all duration-500" />
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-inner">
                    <Database className="w-8 h-8" />
                </div>
                <div className="text-left relative z-10 flex flex-col justify-center">
                    <h3 className="text-xl font-extrabold tracking-tight group-hover:text-primary transition-colors leading-none">Attività</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2 group-hover:text-white/60 transition-colors">Gestione Catalogo</p>
                </div>
            </button>

            <button
                onClick={() => navigate(`/admin/assembly/${activeAssemblyId}?tab=logistics`)}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-blue-500/30 p-6 md:p-8 rounded-3xl flex items-center gap-6 md:gap-8 transition-all group hover:bg-white/[0.04] active:scale-95 shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-[60px] group-hover:bg-blue-500/10 transition-all duration-500" />
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 shadow-inner">
                    <Layers className="w-8 h-8" />
                </div>
                <div className="text-left relative z-10 flex flex-col justify-center">
                    <h3 className="text-xl font-extrabold tracking-tight group-hover:text-blue-400 transition-colors leading-none">Logistica</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2 group-hover:text-white/60 transition-colors">Mappatura Aule</p>
                </div>
            </button>

            <button
                onClick={onOpenStaff}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-amber-500/30 p-6 md:p-8 rounded-3xl flex items-center gap-6 md:gap-8 transition-all group hover:bg-white/[0.04] active:scale-95 shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-[60px] group-hover:bg-amber-500/10 transition-all duration-500" />
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-inner">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="text-left relative z-10 flex flex-col justify-center">
                    <h3 className="text-xl font-extrabold tracking-tight group-hover:text-amber-500 transition-colors leading-none">Staff</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2 group-hover:text-white/60 transition-colors">Permessi & Ruoli</p>
                </div>
            </button>

            <button
                onClick={onOpenBadges}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-purple-500/30 p-6 md:p-8 rounded-3xl flex items-center gap-6 md:gap-8 transition-all group hover:bg-white/[0.04] active:scale-95 shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 blur-[60px] group-hover:bg-purple-500/10 transition-all duration-500" />
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-300 shadow-inner">
                    <Award className="w-8 h-8" />
                </div>
                <div className="text-left relative z-10 flex flex-col justify-center">
                    <h3 className="text-xl font-extrabold tracking-tight group-hover:text-purple-400 transition-colors leading-none">Badge</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2 group-hover:text-white/60 transition-colors">Premi & Gamification</p>
                </div>
            </button>
        </div>
    );
};
