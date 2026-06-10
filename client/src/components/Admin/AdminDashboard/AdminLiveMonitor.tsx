import React from "react";
import { Search, Clock, Shield, Trophy } from "lucide-react";

interface AdminLiveMonitorProps {
    onOpenStudentLocator: () => void;
    onOpenTimeline: () => void;
    onOpenImbucati: () => void;
    onOpenActivityRanking: () => void;
}

export const AdminLiveMonitor: React.FC<AdminLiveMonitorProps> = ({
    onOpenStudentLocator,
    onOpenTimeline,
    onOpenImbucati,
    onOpenActivityRanking
}) => {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <div className="flex items-center gap-6">
                <div className="h-px flex-1 bg-white/5" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/20 italic text-center px-4">Centro di Monitoraggio Live</h2>
                <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { icon: Search, label: 'Cerca Studente', color: 'blue', action: onOpenStudentLocator },
                    { icon: Clock, label: 'Timeline', color: 'white', action: onOpenTimeline },
                    { icon: Shield, label: 'Fuori Posto', color: 'amber', action: onOpenImbucati },
                    { icon: Trophy, label: 'Classifica', color: 'primary', action: onOpenActivityRanking }
                ].map((item, idx) => (
                    <button
                        key={idx}
                        onClick={item.action}
                        className={`bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-white/10 p-6 md:p-8 rounded-3xl transition-all group hover:bg-white/[0.04] flex flex-col items-center gap-4 hover:-translate-y-1 shadow-xl active:scale-95`}
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner ${
                            item.color === 'blue' ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110' :
                            item.color === 'amber' ? 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 group-hover:scale-110' :
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
