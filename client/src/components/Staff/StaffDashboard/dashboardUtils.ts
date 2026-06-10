import { formatDateToISO } from '../../../utils/dateUtils';

export type TurnStatus = 'IN_PROGRESS' | 'UPCOMING' | null;

interface TurnSchedule {
    start: string;
    end: string;
}

interface AssemblyData {
    date: any;
    turn_schedules: Record<string, TurnSchedule>;
}

/**
 * Calculates the status of a turn based on the current time.
 * @param turnId The ID of the turn to check
 * @param assembly The assembly data containing date and schedules
 * @param now Current date object (defaults to new Date())
 * @returns 'IN_PROGRESS', 'UPCOMING', or null
 */
export const getTurnStatus = (
    turnId: string, 
    assembly: AssemblyData | null | undefined, 
    now: Date = new Date()
): TurnStatus => {
    if (!assembly?.turn_schedules || !assembly.date) return null;
    
    const isoDate = formatDateToISO(assembly.date);
    const sched = assembly.turn_schedules[turnId];
    if (!sched?.start || !sched?.end) return null;

    const nowTime = now.getTime();
    const start = new Date(`${isoDate}T${sched.start}`).getTime();
    const end = new Date(`${isoDate}T${sched.end}`).getTime();

    if (nowTime >= start && nowTime <= end) return 'IN_PROGRESS';
    // UPCOMING: starts within 15 minutes
    if (nowTime < start && start - nowTime < 15 * 60000) return 'UPCOMING';
    
    return null;
};
