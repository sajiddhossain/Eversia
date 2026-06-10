import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Assembly, Activity } from '../../../../types';
import { ASSEMBLY_STATUS } from '../../../../constants';

/**
 * SCALABILITY OPTIMIZATION:
 * Replaced onSnapshot listeners on the `rooms` collection with polling (getDocs).
 * 
 * WHY: With 1300 concurrent users, each onSnapshot on rooms creates a persistent
 * WebSocket connection. Every booking (write to counts_by_turn) triggers a broadcast
 * to ALL 1300 clients simultaneously, causing ~52,000 reads/minute at peak.
 * 
 * With polling every 8 seconds, each client only reads when it polls.
 * Cost drops from O(writes × listeners) to O(clients × polls_per_minute).
 * 
 * The student's OWN document still uses onSnapshot (in useStudentAgenda) for
 * instant feedback on their bookings. Activity counts are the only "eventually consistent"
 * data, with a max lag of 8 seconds — acceptable for a capacity indicator.
 */

const POLL_INTERVAL_MS = 8000; // 8 seconds

export const useAssemblyEnrollment = (
    selectedAssembly: Assembly | null, 
    joinId: string | null,
    isFinalized?: boolean
) => {
    const [openAssemblies, setOpenAssemblies] = useState<Assembly[]>([]);
    const [allActivities, setAllActivities] = useState<Activity[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loadingAssembly, setLoadingAssembly] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAllActivitiesLoading, setIsAllActivitiesLoading] = useState(false);

    // Refs to track polling intervals for cleanup
    const assemblyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchAssemblies = async (): Promise<Assembly[]> => {
        if (!navigator.onLine) {
            const cached = sessionStorage.getItem('eversia_open_assemblies');
            if (cached) {
                try {
                    const list = JSON.parse(cached);
                    setOpenAssemblies(list);
                    return list;
                } catch (e) {
                    console.warn("Parse cached open assemblies failed:", e);
                }
            }
            return [];
        }
        try {
            setLoadingAssembly(true);
            const q = query(
                collection(db, 'assemblies'),
                where('status', 'in', [
                    ASSEMBLY_STATUS.ISCRIZIONI_APERTE,
                    ASSEMBLY_STATUS.ATTIVA,
                    ASSEMBLY_STATUS.ARCHIVIATA
                ])
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assembly));
            setOpenAssemblies(list);
            try {
                sessionStorage.setItem('eversia_open_assemblies', JSON.stringify(list));
            } catch (e) {
                console.warn("Cache open assemblies failed:", e);
            }
            return list;
        } catch (err) {
            console.error('Assemblies global fetch error', err);
            const cached = sessionStorage.getItem('eversia_open_assemblies');
            if (cached) {
                try {
                    const list = JSON.parse(cached);
                    setOpenAssemblies(list);
                    return list;
                } catch (e) {
                    console.warn("Parse cached open assemblies failed:", e);
                }
            }
            setError("Impossibile caricare l'elenco delle assemblee.");
            return [];
        } finally {
            setLoadingAssembly(false);
        }
    };

    useEffect(() => {
        fetchAssemblies();
    }, [joinId]);

    // Pre-load open assemblies from cache on mount
    useEffect(() => {
        const cached = sessionStorage.getItem('eversia_open_assemblies');
        if (cached) {
            try {
                setOpenAssemblies(JSON.parse(cached));
            } catch (e) {
                console.warn("Parse cached open assemblies failed:", e);
            }
        }
    }, []);

    // ── Global Activities Polling (for Mission Control) ──
    const fetchAllActivities = useCallback(async (activeIds: string[]) => {
        if (!navigator.onLine) {
            const cached = sessionStorage.getItem('eversia_all_activities');
            if (cached) {
                try {
                    setAllActivities(JSON.parse(cached));
                } catch (e) {
                    console.warn("Parse cached all activities failed:", e);
                }
            }
            return;
        }
        if (activeIds.length === 0) {
            setAllActivities([]);
            return;
        }

        try {
            // Firestore 'in' queries support max 30 values (as of 2024)
            const chunks: string[][] = [];
            for (let i = 0; i < activeIds.length; i += 10) chunks.push(activeIds.slice(i, i + 10));

            const allDocs: Activity[] = [];
            for (const chunk of chunks) {
                const q = query(
                    collection(db, 'rooms'),
                    where('assemblyId', 'in', chunk)
                );
                const snap = await getDocs(q);
                allDocs.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
            }
            setAllActivities(allDocs);
            try {
                sessionStorage.setItem('eversia_all_activities', JSON.stringify(allDocs));
            } catch (e) {
                console.warn("Cache all activities failed:", e);
            }
        } catch (err) {
            console.error('AllActivities poll error:', err);
            const cached = sessionStorage.getItem('eversia_all_activities');
            if (cached) {
                try {
                    setAllActivities(JSON.parse(cached));
                } catch (e) {
                    console.warn("Parse cached all activities failed:", e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (selectedAssembly) return;

        const activeIds = openAssemblies
            .filter(a => a.status !== ASSEMBLY_STATUS.ARCHIVIATA)
            .map(a => a.id);

        if (activeIds.length === 0) {
            setAllActivities([]);
            return;
        }

        // Initial fetch only - no polling required on the global screen!
        setIsAllActivitiesLoading(true);
        fetchAllActivities(activeIds).finally(() => setIsAllActivitiesLoading(false));
    }, [openAssemblies, !!selectedAssembly, fetchAllActivities]);

    // Pre-load all activities from cache on mount
    useEffect(() => {
        const cached = sessionStorage.getItem('eversia_all_activities');
        if (cached) {
            try {
                setAllActivities(JSON.parse(cached));
            } catch (e) {
                console.warn("Parse cached all activities failed:", e);
            }
        }
    }, []);

    // ── Specific Assembly Activities Polling ──
    const fetchAssemblyActivities = useCallback(async (assemblyId: string) => {
        if (!navigator.onLine) {
            const cached = sessionStorage.getItem(`eversia_activities_${assemblyId}`);
            if (cached) {
                try {
                    setActivities(JSON.parse(cached));
                } catch (e) {
                    console.warn("Parse cached activities failed:", e);
                }
            }
            return;
        }
        try {
            const qAct = query(collection(db, 'rooms'), where('assemblyId', '==', assemblyId));
            const snap = await getDocs(qAct);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setActivities(list);
            try {
                sessionStorage.setItem(`eversia_activities_${assemblyId}`, JSON.stringify(list));
            } catch (e) {
                console.warn("Cache activities failed:", e);
            }
        } catch (err) {
            console.error('Assembly activities poll error:', err);
            const cached = sessionStorage.getItem(`eversia_activities_${assemblyId}`);
            if (cached) {
                try {
                    setActivities(JSON.parse(cached));
                } catch (e) {
                    console.warn("Parse cached activities failed:", e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (!selectedAssembly) return;

        const sync = () => {
            fetchAssemblyActivities(selectedAssembly.id);
        };

        // Initial fetch
        sync();

        // Polling: ONLY if registrations are open AND user has not finalized!
        const shouldPoll = selectedAssembly.status === ASSEMBLY_STATUS.ISCRIZIONI_APERTE && !isFinalized;

        if (shouldPoll) {
            assemblyPollRef.current = setInterval(sync, POLL_INTERVAL_MS);
        }

        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible' && shouldPoll) {
                sync();
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        return () => {
            if (assemblyPollRef.current) {
                clearInterval(assemblyPollRef.current);
                assemblyPollRef.current = null;
            }
            window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
        };
    }, [selectedAssembly, fetchAssemblyActivities, isFinalized]);

    // Pre-load selected assembly's activities from cache
    useEffect(() => {
        if (!selectedAssembly) return;
        const cached = sessionStorage.getItem(`eversia_activities_${selectedAssembly.id}`);
        if (cached) {
            try {
                setActivities(JSON.parse(cached));
            } catch (e) {
                console.warn("Parse cached activities failed:", e);
            }
        }
    }, [selectedAssembly]);

    // ── Manual Refresh (called after booking for immediate UI update) ──
    const refreshActivities = useCallback(() => {
        if (selectedAssembly) {
            fetchAssemblyActivities(selectedAssembly.id);
        }
    }, [selectedAssembly, fetchAssemblyActivities]);

    return { 
        openAssemblies, allActivities, activities, loadingAssembly, 
        isAllActivitiesLoading, error, setError, fetchAssemblies, setActivities,
        refreshActivities
    };
};
