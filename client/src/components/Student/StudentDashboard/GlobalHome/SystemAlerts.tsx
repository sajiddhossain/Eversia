import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SystemAlert {
    id: string;
    type: 'info' | 'warning' | 'urgent';
    message: string;
    icon: LucideIcon;
}

interface SystemAlertsProps {
    alerts: SystemAlert[];
}

const SystemAlerts: React.FC<SystemAlertsProps> = ({ alerts }) => {
    if (alerts.length === 0) return null;

    return (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-700">
            {alerts.map(alert => (
                <div
                    key={alert.id}
                    className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl md:rounded-3xl border backdrop-blur-xl ${alert.type === 'urgent'
                        ? 'bg-red-500/10 border-red-500/30 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
                        : alert.type === 'warning'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                            : 'bg-primary/10 border-primary/30 text-white'
                        }`}
                >
                    <div className={`p-2 rounded-xl ${alert.type === 'urgent' ? 'bg-red-500/20' : alert.type === 'warning' ? 'bg-amber-500/20' : 'bg-primary/20'
                        }`}>
                        <alert.icon className={`w-5 h-5 ${alert.type === 'urgent' ? 'text-red-400' : alert.type === 'warning' ? 'text-amber-400' : 'text-primary'
                            }`} />
                    </div>
                    <p className="flex-1 text-sm font-semibold tracking-tight">{alert.message}</p>
                </div>
            ))}
        </div>
    );
};

export default SystemAlerts;
