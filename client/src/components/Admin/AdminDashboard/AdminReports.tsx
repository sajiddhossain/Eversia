import React from "react";
import { GitCompare, Award, Download } from "lucide-react";

interface AdminReportsProps {
    onOpenComparison: () => void;
    onOpenRMStats: () => void;
    onOpenExport: () => void;
}

export const AdminReports: React.FC<AdminReportsProps> = ({
    onOpenComparison,
    onOpenRMStats,
    onOpenExport
}) => {
    return (
        <div className="space-y-10 pt-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <div className="flex items-center gap-6">
                <div className="h-px flex-1 bg-white/5" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/20 italic text-center px-4">Approfondimenti & Report</h2>
                <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { icon: GitCompare, label: 'Analisi Comparativa', color: 'purple', action: onOpenComparison },
                    { icon: Award, label: 'Performance Modulo', color: 'white', action: onOpenRMStats },
                    { icon: Download, label: 'Export Integrale', color: 'primary', action: onOpenExport }
                ].map((item, idx) => (
                    <button
                        key={idx}
                        onClick={item.action}
                        className={`bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-white/10 p-6 md:p-8 rounded-3xl transition-all group hover:bg-white/[0.04] flex flex-col items-center gap-4 hover:-translate-y-1 shadow-xl active:scale-95`}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner ${
                            item.color === 'purple' ? 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-110' :
                            item.color === 'primary' ? 'bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110' :
                            'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white group-hover:scale-110'
                        }`}>
                            <item.icon className="w-7 h-7" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors text-center mt-2">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
