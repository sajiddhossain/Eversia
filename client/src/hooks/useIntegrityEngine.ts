import { useState, useCallback } from 'react';
import { db, functions } from '../firebase';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    doc, 
    setDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from './useAuth';
import { logAudit } from '../utils/auditLogger';
import type { DiagnosticLog } from '../types/cco';
import type { Activity } from '../types';

export type { DiagnosticLog };

export const useIntegrityEngine = () => {
    const { userProfile } = useAuth();
    const [logs, setLogs] = useState<DiagnosticLog[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);

    const addLog = useCallback((message: string, type: DiagnosticLog['type'] = 'INFO') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, type, message }]);
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    // Helper per invocare i comandi lato server in sicurezza (SECURITY FIX M8)
    const runServerCommand = async (command: string, args: Record<string, unknown> = {}) => {
        const cmdFn = httpsCallable<{ command: string, args: Record<string, unknown> }, { success: boolean, message: string }>(functions, 'runIntegrityCommand');
        const res = await cmdFn({ command, args });
        return res.data;
    };

    // ─── COMMANDS ───

    const syncRoomCounts = async (force = false) => {
        setIsExecuting(true);
        addLog(`Initiating Room Count Sync (force: ${force}) via Cloud Function...`, 'INFO');
        
        try {
            const res = await runServerCommand('syncRoomCounts', { force });
            addLog(res.message, 'SUCCESS');
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Sync failed: ${errorObj.message || err}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const purgeGhostUsers = async (assemblyId: string) => {
        setIsExecuting(true);
        addLog(`Purging ghost users from assembly ${assemblyId} via Cloud Function...`, 'INFO');
        
        try {
            const res = await runServerCommand('purgeGhostUsers', { assemblyId });
            addLog(res.message, 'SUCCESS');
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Purge failed: ${errorObj.message || err}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const forceResetTurn = async (turnId: string, assemblyId: string) => {
        setIsExecuting(true);
        addLog(`FORCE RESET: Reseting Turn ${turnId} for assembly ${assemblyId} via Cloud Function...`, 'WARN');

        try {
            // H-06 FIX: Passare assemblyId obbligatorio alla Cloud Function
            const res = await runServerCommand('forceResetTurn', { turnId, assemblyId });
            addLog(res.message, 'SUCCESS');
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Reset failed: ${errorObj.message || err}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const emergencyEject = async (roomId: string, assemblyId: string) => {
        setIsExecuting(true);
        addLog(`EMERGENCY EJECT: Evacuating Room ID: ${roomId} for assembly ${assemblyId} via Cloud Function...`, 'WARN');

        try {
            // H-06 FIX: Passare assemblyId obbligatorio alla Cloud Function
            const res = await runServerCommand('emergencyEject', { roomId, assemblyId });
            addLog(res.message, 'SUCCESS');
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Eject failed: ${errorObj.message || err}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const toggleRegistrations = async (enabled: boolean, assemblyId?: string) => {
        setIsExecuting(true);
        addLog(`${enabled ? 'Enabling' : 'Placing Lock on'} System Registrations...`, enabled ? 'SUCCESS' : 'WARN');
        try {
            await setDoc(doc(db, "config", "main"), {
                lock_registrations: !enabled
            }, { merge: true });
            addLog(`System Integrity: Registration flag updated.`, 'INFO');
            await logAudit('PHASE_CHANGED', userProfile?.email || 'System', `${!enabled ? 'Bloccate' : 'Aperte'} nuove registrazioni globali`, assemblyId);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Toggle failed: ${errorObj.message}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const setThrottle = async (ms: number) => {
        setIsExecuting(true);
        addLog(`Setting Global Registration Throttle to ${ms}ms...`, 'INFO');
        try {
            await setDoc(doc(db, "config", "main"), {
                registration_throttle_ms: ms
            }, { merge: true });
            addLog(`Throttle set successfully. Students will experience a ${ms}ms delay.`, 'SUCCESS');
            await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', `CCO: Impostato throttle di registrazione globale a ${ms}ms`);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Throttle update failed: ${errorObj.message}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const verifyInventory = async (assemblyId: string) => {
        setIsExecuting(true);
        addLog(`AUDIT: Verifying capacity inventory for assembly ${assemblyId}...`, 'INFO');
        try {
            const activitiesSnap = await getDocs(query(collection(db, "rooms"), where("assemblyId", "==", assemblyId)));
            const activities = activitiesSnap.docs.map(d => d.data() as Activity);
            
            const studentsSnap = await getDocs(query(collection(db, "students"), where("assemblyId", "==", assemblyId)));
            const totalStudents = studentsSnap.size;

            addLog(`Total Students: ${totalStudents}`, 'INFO');

            // Find all turns
            const turns = new Set<string>();
            activities.forEach((a: Activity) => (a.turn_ids || []).forEach((t: string) => turns.add(t)));

            for (const turnId of Array.from(turns)) {
                const turnCapacity = activities.reduce((acc: number, a: Activity) => {
                    if ((a.turn_ids || []).includes(turnId)) {
                        return acc + (a.max_capacity || 0);
                    }
                    return acc;
                }, 0);

                const status = turnCapacity >= totalStudents ? 'SUCCESS' : 'ERROR';
                addLog(`Turn ${turnId}: Capacity ${turnCapacity} / Needed ${totalStudents}`, status);
                if (turnCapacity < totalStudents) {
                    addLog(`CRITICAL: Deficiency of ${totalStudents - turnCapacity} seats in Turn ${turnId}!`, 'ERROR');
                }
            }

            addLog(`Inventory audit complete.`, 'INFO');
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Audit failed: ${errorObj.message}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const recalculateGamificationStats = async () => {
        setIsExecuting(true);
        addLog(`Initiating Gamification Stats & Level Recalculation for all users via Cloud Function...`, 'INFO');
        
        try {
            const res = await runServerCommand('recalculateGamificationStats');
            addLog(res.message, 'SUCCESS');
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            addLog(`Recalculation failed: ${errorObj.message || err}`, 'ERROR');
        } finally {
            setIsExecuting(false);
        }
    };

    const repairAll = async (assemblyId: string) => {
        addLog(`🚀 INITIATING DEEP REPAIR for assembly ${assemblyId}...`, 'WARN');
        await syncRoomCounts(true);
        await purgeGhostUsers(assemblyId);
        await verifyInventory(assemblyId);
        addLog(`✅ DEEP REPAIR SEQUENCE FINISHED.`, 'SUCCESS');
    };

    return {
        logs,
        isExecuting,
        clearLogs,
        addLog,
        syncRoomCounts,
        purgeGhostUsers,
        forceResetTurn,
        emergencyEject,
        toggleRegistrations,
        setThrottle,
        verifyInventory,
        recalculateGamificationStats,
        repairAll
    };
};
