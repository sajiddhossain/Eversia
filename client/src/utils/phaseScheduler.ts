import { useEffect, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { Assembly } from "../types";
import { logAudit } from "./auditLogger";
import { useAuth } from "../hooks/useAuth";

/**
 * Custom hook that checks assembly schedule every 30 seconds and
 * transitions phases automatically based on configured times.
 *
 * Usage in a component:
 *   usePhaseScheduler(assemblyId);
 *
 * Assembly document should have optional fields:
 *   schedule: { enrollmentOpen?: string, assemblyStart?: string, assemblyEnd?: string }
 */
export const usePhaseScheduler = (assemblyId: string | undefined) => {
    const { userProfile } = useAuth();

    const checkAndTransition = useCallback(async () => {
        if (!assemblyId) return;

        try {
            const snap = await getDoc(doc(db, "assemblies", assemblyId));
            if (!snap.exists()) return;

            const assembly = snap.data() as Assembly & { 
                schedule?: { 
                    enrollmentOpen?: string; 
                    assemblyStart?: string; 
                    assemblyEnd?: string; 
                }; 
            };
            const schedule = assembly.schedule;
            if (!schedule) return;

            const now = new Date();
            const currentStatus = assembly.status;
            const actor = userProfile?.email || "SISTEMA";

            // Check transitions in order
            if (schedule.assemblyEnd && currentStatus === 'ATTIVA') {
                const endTime = new Date(schedule.assemblyEnd);
                if (now >= endTime) {
                    await updateDoc(doc(db, "assemblies", assemblyId), { status: 'ARCHIVIATA' });
                    await logAudit('PHASE_CHANGED', actor, `Fase automatica: ATTIVA → ARCHIVIATA (orario fine: ${schedule.assemblyEnd})`, assemblyId);
                    return;
                }
            }

            if (schedule.assemblyStart && currentStatus === 'ISCRIZIONI_APERTE') {
                const startTime = new Date(schedule.assemblyStart);
                if (now >= startTime) {
                    await updateDoc(doc(db, "assemblies", assemblyId), { status: 'ATTIVA' });
                    await logAudit('PHASE_CHANGED', actor, `Fase automatica: ISCRIZIONI_APERTE → ATTIVA (orario inizio: ${schedule.assemblyStart})`, assemblyId);
                    return;
                }
            }

            if (schedule.enrollmentOpen && currentStatus === 'CHIUSO') {
                const enrollTime = new Date(schedule.enrollmentOpen);
                if (now >= enrollTime) {
                    await updateDoc(doc(db, "assemblies", assemblyId), { status: 'ISCRIZIONI_APERTE' });
                    await logAudit('PHASE_CHANGED', actor, `Fase automatica: CHIUSO → ISCRIZIONI_APERTE (orario apertura: ${schedule.enrollmentOpen})`, assemblyId);
                    return;
                }
            }
        } catch (e) {
            console.error("[PhaseScheduler] Error:", e);
        }
    }, [assemblyId, userProfile]);

    useEffect(() => {
        if (!assemblyId) return;

        // Check immediately on mount
        checkAndTransition();

        // Then check every 30 seconds
        const interval = setInterval(checkAndTransition, 30000);
        return () => clearInterval(interval);
    }, [assemblyId, checkAndTransition]);
};
