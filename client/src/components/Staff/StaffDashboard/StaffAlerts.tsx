import React, { useMemo } from 'react';
import { AlertTriangle, ShieldAlert, ArrowRight, Info } from 'lucide-react';
import type { RoomData } from './useStaffDashboard';

interface StaffAlertsProps {
    assemblyId: string;
    managedActivityIds: string[];
    rooms: Record<string, RoomData>;
}

interface Alert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    title: string;
    timestamp: number;
}

export const StaffAlerts: React.FC<StaffAlertsProps> = ({ assemblyId, managedActivityIds, rooms }) => {
    const alerts = useMemo(() => {
        if (!assemblyId || managedActivityIds.length === 0 || Object.keys(rooms).length === 0) {
            return [];
        }

        const newAlerts: Alert[] = [];
        
        Object.values(rooms).forEach(room => {
            if (!managedActivityIds.includes(room.id)) return;

            const max = room.max_capacity || 0;
            const counts = room.counts_by_turn || {};

            Object.entries(counts).forEach(([turnId, count]) => {
                const c = count as number;
                if (max > 0 && c > max) {
                    newAlerts.push({
                        id: `overcapacity_${room.id}_${turnId}`,
                        type: 'warning',
                        title: 'Sovraffollamento Rilevato',
                        message: `L'attività "${room.name}" (Turno ${turnId}) sta superando la capienza massima (${c}/${max}).`,
                        timestamp: Date.now()
                    });
                }
            });
        });

        return newAlerts;
    }, [assemblyId, managedActivityIds, rooms]);

    if (alerts.length === 0) return null;

    return (
        <div className="space-y-4 animate-in slide-in-from-top-10 duration-700">
            {alerts.map(alert => (
                <div 
                    key={alert.id}
                    className={`relative p-5 rounded-2xl border backdrop-blur-md overflow-hidden flex items-start gap-4 transition-all hover:scale-[1.01] ${
                        alert.type === 'critical' 
                            ? 'bg-red-500/10 border-red-500/30 shadow-[0_4px_20px_rgba(239,68,68,0.15)]' 
                            : alert.type === 'info'
                                ? 'bg-blue-500/10 border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.1)]'
                                : 'bg-amber-500/10 border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
                    }`}
                >
                    {/* Decorative inner gradient edge */}
                    <div className={`absolute top-0 bottom-0 left-0 w-[4px] ${
                        alert.type === 'critical' ? 'bg-red-500' : alert.type === 'info' ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />

                    <div className={`mt-0.5 p-2.5 rounded-xl border flex-shrink-0 ${
                        alert.type === 'critical' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/20 animate-pulse' 
                            : alert.type === 'info'
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                    }`}>
                        {alert.type === 'critical' ? <ShieldAlert className="w-5 h-5" /> : alert.type === 'info' ? <Info className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <h4 className={`text-[10px] font-black uppercase tracking-widest ${
                                alert.type === 'critical' ? 'text-red-400' : alert.type === 'info' ? 'text-blue-400' : 'text-amber-400'
                            }`}>
                                {alert.title}
                            </h4>
                            <span className="text-[7.5px] font-bold text-white/20 uppercase whitespace-nowrap bg-white/5 px-2 py-0.5 rounded">Update Live</span>
                        </div>
                        <p className="text-xs font-semibold text-white/80 leading-snug">
                            {alert.message}
                        </p>
                    </div>

                    <div className="self-center flex-shrink-0 ml-2">
                        <ArrowRight className="w-4 h-4 text-white/30" />
                    </div>
                </div>
            ))}
        </div>
    );
};
