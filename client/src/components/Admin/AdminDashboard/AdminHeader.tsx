import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ShieldAlert, Server, RefreshCw } from "lucide-react";
import type { Assembly } from "../../../types";

interface AdminHeaderProps {
    activeAssembly?: Assembly;
    isRefreshing: boolean;
    onRefresh: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
    activeAssembly,
    isRefreshing,
    onRefresh
}) => {
    const navigate = useNavigate();

    return (
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 border-b border-white/5 pb-10 md:pb-16 animate-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full xl:w-auto">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shrink-0 shadow-xl shadow-primary/10">
                        <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Amministrazione Centrale</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white uppercase leading-none italic">
                            Panorama<br className="md:hidden" /> Assemblea
                        </h1>
                        <div className="flex items-center gap-3 mt-3">
                            <p className="text-white/30 text-xs md:text-sm font-bold uppercase tracking-widest">Pannello di Monitoraggio Live</p>
                            {activeAssembly && (
                                <div className="flex items-center gap-2">
                                    <span className="text-white/10 mx-1">/</span>
                                    <span
                                        className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/5 backdrop-blur-md"
                                        style={{ backgroundColor: `${activeAssembly.themeColor}15`, color: activeAssembly.themeColor }}
                                    >
                                        {activeAssembly.date}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/system')}
                    className="bg-white/5 hover:bg-white/10 text-white/50 hover:text-white px-5 py-3 rounded-2xl border border-white/5 transition-all group flex items-center gap-3 active:scale-95 shadow-xl"
                >
                    <Server className="w-4 h-4 group-hover:text-primary transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-widest">Sistema</span>
                </button>
                <button
                    onClick={onRefresh}
                    className="p-3 bg-primary text-black hover:bg-primary/90 rounded-2xl transition-all shadow-lg shadow-primary/20 active:rotate-180 duration-500 group"
                    title="Aggiorna Dati"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                </button>
            </div>
        </header>
    );
};
