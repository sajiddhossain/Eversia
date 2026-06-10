import { useMemo } from 'react';
import { Clock, MapPin, type LucideIcon } from 'lucide-react';
import type { Assembly, Activity } from '../../../../types';
import { ASSEMBLY_STATUS } from '../../../../constants';

export const useSystemAlerts = (
    selectedAssembly: Assembly | null,
    currentTime: Date,
    missionControl: { agenda: { assembly: Assembly, turnId: string, activity: Activity | null }[] },
    allTurnIds: string[],
    turnTimestamps: Record<string, { start: number, end: number }>
) => {
    const activeSystemAlerts = useMemo(() => {
        const alerts: { id: string, type: 'info' | 'warning' | 'urgent', message: string, icon: LucideIcon }[] = [];
        if (!selectedAssembly) return alerts;

        const now = currentTime.getTime();
        
        // Enrollment closing alerts
        if (selectedAssembly.status === ASSEMBLY_STATUS.ISCRIZIONI_APERTE) {
            const ts = turnTimestamps[allTurnIds[0]];
            if (ts) {
                const hours = (ts.start - now) / 3600000;
                if (hours > 0 && hours <= 2) {
                    alerts.push({
                        id: 'enrollment_closing',
                        type: 'warning',
                        message: `Le iscrizioni chiudono tra meno di ${Math.ceil(hours * 60)} minuti! Completa le tue scelte.`,
                        icon: Clock
                    });
                }
            }
        }

        // Transition alerts
        missionControl.agenda.forEach(item => {
            const ts = turnTimestamps[item.turnId];
            if (ts) {
                const mins = (now - ts.end) / 60000;
                if (mins > 0 && mins <= 15) {
                    alerts.push({
                        id: `transition_${item.turnId}`,
                        type: 'info',
                        message: `${item.turnId.replace(/_/g, ' ')} terminato. Hai ${Math.ceil(15 - mins)} minuti per spostarti.`,
                        icon: MapPin
                    });
                }
            }
        });

        return alerts;
    }, [selectedAssembly, currentTime, missionControl.agenda, allTurnIds, turnTimestamps]);

    return activeSystemAlerts;
};
