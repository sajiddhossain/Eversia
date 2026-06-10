import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, Settings, ChevronDown } from "lucide-react";
import type { Assembly } from "../../../types";

interface AdminControlsProps {
    assemblies: Assembly[];
    activeAssemblyId?: string;
    currentTurn: string;
    onSetAssembly: (id: string) => void;
    onSetTurn: (turn: string) => void;
    onNewAssembly: () => void;
    onExport: () => void;
}

export const AdminControls: React.FC<AdminControlsProps> = ({
    assemblies,
    activeAssemblyId,
    currentTurn,
    onSetAssembly,
    onSetTurn,
    onNewAssembly,
    onExport
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-6 w-full bg-white/[0.02] p-4 md:p-6 rounded-[2rem] border border-white/5 mb-10 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
            {/* Turn Selector Group */}
            <div className="flex items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/10 backdrop-blur-xl w-full md:w-auto overflow-x-auto custom-scrollbar">
                {["1", "2", "3", "ALL"].map(t => (
                    <button
                        key={t}
                        onClick={() => onSetTurn(t)}
                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300 ${currentTurn === t
                            ? 'bg-primary text-black shadow-md shadow-primary/20'
                            : 'text-white/40 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        {t === 'ALL' ? 'Tutti' : `T${t}`}
                    </button>
                ))}
            </div>

            {/* Selection Group */}
            <div className="flex-1 md:flex-none flex items-center relative group min-w-[280px]">
                <select
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 font-bold text-xs uppercase tracking-widest outline-none focus:border-primary/50 transition-all cursor-pointer appearance-none hover:bg-black/60 truncate backdrop-blur-xl text-white/80"
                    value={activeAssemblyId || ""}
                    onChange={(e) => onSetAssembly(e.target.value)}
                >
                    <option value="" disabled className="bg-[#09090b]">Scegli Assemblea...</option>
                    {assemblies.map(a => (
                        <option key={a.id} value={a.id} className="bg-[#09090b]">{a.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-5 w-4 h-4 text-white/40 group-hover:text-primary transition-colors pointer-events-none" />
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <button
                    onClick={onNewAssembly}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/40 hover:text-primary transition-all group active:scale-95"
                    title="Crea Nuova Assemblea"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </button>

                {/* Contextual Action Group */}
                {activeAssemblyId && (
                    <div className="flex gap-3">
                        <button
                            onClick={onExport}
                            className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl flex items-center gap-3 transition-all group border border-white/5 active:scale-95 shadow-md shadow-black/20"
                        >
                            <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-widest hidden lg:inline">Report</span>
                        </button>
                        <button
                            onClick={() => navigate(`/admin/assembly/${activeAssemblyId}`)}
                            className="px-6 py-3 bg-primary text-black hover:bg-primary/90 rounded-xl flex items-center gap-3 transition-all group shadow-lg shadow-primary/20 active:scale-95"
                        >
                            <Settings className="w-4 h-4 transition-transform group-hover:rotate-45" />
                            <span className="text-xs font-bold uppercase tracking-widest">Configura</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
