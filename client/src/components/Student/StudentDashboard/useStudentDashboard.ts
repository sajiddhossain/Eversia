import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from "../../../hooks/useAuth";
import { db, functions } from "../../../firebase";
import { 
    doc, runTransaction, getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Assembly, Activity, Student } from "../../../types";
import { useAssembly } from "../../../contexts/AssemblyContext";
import { formatDateToISO } from "../../../utils/dateUtils";
import { ASSEMBLY_STATUS } from "../../../constants";

// Modular Hooks
import { useAssemblyEnrollment } from './hooks/useAssemblyEnrollment';
import { useStudentAgenda } from './hooks/useStudentAgenda';
import { useSystemAlerts } from './hooks/useSystemAlerts';

export const useStudentDashboard = () => {
    const { userProfile } = useAuth();
    const { selectedAssembly, setSelectedAssembly: setContextAssembly } = useAssembly();
    const navigate = useNavigate();
    const { assemblyId } = useParams<{ assemblyId?: string }>();
    const [searchParams] = useSearchParams();
    const joinId = searchParams.get('join');
    const isGuest = !userProfile;
    const isActionPending = useRef(false);

    const setSelectedAssembly = (assembly: Assembly | null) => {
        if (assembly) {
            navigate(`/student/${assembly.id}`);
        } else {
            navigate('/student');
        }
    };

    /* ── Initialized Modular Hooks ── */
    const { 
        allStudentDocs, studentData, isGlobalLoading: globalLoading, 
        bookingInProgress, setBookingInProgress, 
        error: agendaError, setError: setAgendaError
    } = useStudentAgenda(userProfile, selectedAssembly);

    const { 
        openAssemblies, allActivities, activities, loadingAssembly: loadingAsm, 
        error: asmError, setError: setAsmError, fetchAssemblies, refreshActivities
    } = useAssemblyEnrollment(selectedAssembly, joinId, studentData?.is_finalized);

    // Sync context selectedAssembly with URL route parameter /student/:assemblyId
    useEffect(() => {
        if (assemblyId) {
            if (selectedAssembly?.id !== assemblyId) {
                const found = openAssemblies.find(a => a.id === assemblyId);
                if (found) {
                    setContextAssembly(found);
                } else {
                    // Fetch directly from Firestore if not in openAssemblies list (e.g. guest preview or direct link)
                    const docRef = doc(db, 'assemblies', assemblyId);
                    getDoc(docRef).then((snap) => {
                        if (snap.exists()) {
                            setContextAssembly({ id: snap.id, ...snap.data() } as Assembly);
                        }
                    }).catch((err) => {
                        console.error("[useStudentDashboard] Failed to fetch assembly from route directly:", err);
                    });
                }
            }
        } else {
            if (selectedAssembly !== null) {
                setContextAssembly(null);
            }
        }
    }, [assemblyId, openAssemblies, selectedAssembly, setContextAssembly]);

    // Auto-select assembly if join parameter is present in URL (redirect to clean route)
    useEffect(() => {
        if (joinId) {
            navigate(`/student/${joinId}`, { replace: true });
        }
    }, [joinId, navigate]);

    /* ── UI Local State ── */
    const [activeTab, setActiveTab ] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const error = asmError || agendaError;
    const setError = (msg: string | null) => { setAsmError(null); setAgendaError(msg); };
    const loadingAssembly = loadingAsm;
    const isGlobalLoading = globalLoading;

    /* ── Real-time clock ── */
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    /* ── Session Guard ── */
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const hasUnfinalized = studentData && !studentData.is_finalized && Object.values(studentData.scheduled_turns || {}).some(v => !!v);
            if (hasUnfinalized) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [studentData]);

    const scrollToTurn = (turnId: string) => {
        const element = document.getElementById(`turn-section-${turnId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    /* ── Derived Logic ── */
    const allTurnIds = useMemo(() =>
        Array.from(new Set(activities.flatMap((a: Activity) => a.turn_ids || []))).sort(),
        [activities]
    );

    const bookedCount = useMemo(() => {
        if (!studentData) return 0;
        return Object.values(studentData.scheduled_turns || {}).filter(v => !!v).length;
    }, [studentData]);

    const formatTurn = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const missionControl = useMemo(() => {
        const agenda: { assembly: Assembly, turnId: string, activity: Activity | null }[] = [];
        let totalBookings = 0;

        allStudentDocs.forEach((doc: Student) => {
            const assembly = openAssemblies.find((a: Assembly) => a.id === doc.assemblyId);
            if (!assembly) return;

            Object.entries(doc.scheduled_turns || {}).forEach(([tid, aid]) => {
                if (!aid) return;
                totalBookings++;
                const activity = allActivities.find((act: Activity) => act.id === aid);
                if (activity) agenda.push({ assembly, turnId: tid, activity });
            });
        });

        const assembliesCount = isGuest ? openAssemblies.length : allStudentDocs.length;

        if (selectedAssembly) {
            allTurnIds.forEach(tid => {
                const alreadyInAgenda = agenda.some(item => item.assembly.id === selectedAssembly.id && item.turnId === tid);
                if (!alreadyInAgenda) {
                    const aid = studentData?.scheduled_turns?.[tid] as string | undefined;
                    const activity = aid ? activities.find((act: Activity) => act.id === aid) : null;
                    if (activity) {
                        agenda.push({ assembly: selectedAssembly, turnId: tid, activity });
                    } else if (!aid) {
                        agenda.push({ assembly: selectedAssembly, turnId: tid, activity: null });
                    }
                }
            });
        }

        const groupedAgenda: { assembly: Assembly, turns: { turnId: string, activity: Activity | null }[] }[] = [];
        agenda.forEach(item => {
            let group = groupedAgenda.find(g => g.assembly.id === item.assembly.id);
            if (!group) {
                group = { assembly: item.assembly, turns: [] };
                groupedAgenda.push(group);
            }
            group.turns.push({ turnId: item.turnId, activity: item.activity });
        });
        groupedAgenda.forEach(g => g.turns.sort((a, b) => a.turnId.localeCompare(b.turnId)));

        return { agenda, groupedAgenda, totalBookings, assembliesCount };
    }, [allStudentDocs, allActivities, openAssemblies, isGuest, selectedAssembly, allTurnIds, studentData, activities]);

    const turnTimestamps = useMemo(() => {
        if (!selectedAssembly?.turn_schedules || !selectedAssembly.date) return {};
        const isoDate = formatDateToISO(selectedAssembly.date);
        const result: Record<string, { start: number, end: number }> = {};
        
        Object.entries(selectedAssembly.turn_schedules).forEach(([tid, schedRaw]) => {
            const sched = schedRaw as { start?: string; end?: string };
            if (sched?.start && sched?.end) {
                const startTime = new Date(`${isoDate}T${sched.start}`).getTime();
                const endTime = new Date(`${isoDate}T${sched.end}`).getTime();
                if (!isNaN(startTime) && !isNaN(endTime)) result[tid] = { start: startTime, end: endTime };
            }
        });
        return result;
    }, [selectedAssembly?.turn_schedules, selectedAssembly?.date]);

    const smartNextActivity = useMemo(() => {
        if (missionControl.agenda.length === 0) return null;
        const now = currentTime.getTime();

        const inProgress = missionControl.agenda.find(item => {
            const ts = turnTimestamps[item.turnId];
            return ts && now >= ts.start && now <= ts.end;
        });
        if (inProgress) return { ...inProgress, status: 'IN_PROGRESS' as const };

        const upcoming = missionControl.agenda
            .filter(item => (turnTimestamps[item.turnId]?.start || 0) > now)
            .sort((a, b) => (turnTimestamps[a.turnId]?.start || 0) - (turnTimestamps[b.turnId]?.start || 0))[0];

        if (upcoming) {
            const ts = turnTimestamps[upcoming.turnId];
            const minsLeft = Math.floor((ts!.start - now) / 60000);
            return { 
                ...upcoming, 
                status: (minsLeft <= 10 ? 'URGENT' : 'UPCOMING') as 'URGENT' | 'UPCOMING', 
                minsLeft 
            };
        }
        return null;
    }, [missionControl.agenda, currentTime, turnTimestamps]);

    const activeSystemAlerts = useSystemAlerts(
        selectedAssembly, 
        currentTime, 
        missionControl, 
        allTurnIds, 
        turnTimestamps
    );

    const canBook = selectedAssembly?.status === ASSEMBLY_STATUS.ISCRIZIONI_APERTE;
    const isInProgress = selectedAssembly?.status === ASSEMBLY_STATUS.ATTIVA;
    const isArchived = selectedAssembly?.status === ASSEMBLY_STATUS.ARCHIVIATA;
    const displayAssembly = selectedAssembly ? (openAssemblies.find(a => a.id === selectedAssembly.id) || selectedAssembly) : null;

    const getNextScrollTarget = (currentTurnId: string, currentTurnIndex: number, currentScheduledTurns: Record<string, string | null> | undefined) => {
        const nextUnbooked = allTurnIds.find((tid, idx) => {
            if (tid === currentTurnId) return false;
            return idx > currentTurnIndex && !currentScheduledTurns?.[tid];
        });
        if (nextUnbooked) return { type: 'TURN', id: nextUnbooked };

        const anyUnbooked = allTurnIds.find((tid) => {
            if (tid === currentTurnId) return false;
            return !currentScheduledTurns?.[tid];
        });
        if (anyUnbooked) return { type: 'TURN', id: anyUnbooked };

        return { type: 'CONTROLS', id: 'registration-controls' };
    };

    /* ── Handlers (Forward compat) ── */
    const handleBook = async (activityId: string, turnId: string) => {
        if (isGuest) { setShowLoginPrompt(true); return; }
        if (!selectedAssembly || !userProfile) return;
        if (isActionPending.current) return;
        isActionPending.current = true;
        setBookingInProgress(`${activityId}_${turnId}`);
        setError(null);

        try {
            // ESECUZIONE TRAMITE CLOUD FUNCTION (Secure Backend)
            const bookRoomFn = httpsCallable(functions, 'bookRoom');
            await bookRoomFn({
                targetActivityId: activityId,
                turnId: turnId,
                assemblyId: selectedAssembly.id
            });

            setSuccessMsg(`Iscritto a ${activities.find(a => a.id === activityId)?.name ?? 'attività'}!`);
            refreshActivities(); // Immediately update counts after booking
            const turnIndex = allTurnIds.indexOf(turnId);
            const target = getNextScrollTarget(turnId, turnIndex, studentData?.scheduled_turns);
            if (target.type === 'TURN') {
                setTimeout(() => scrollToTurn(target.id), 800);
            } else {
                setTimeout(() => {
                    const el = document.getElementById(target.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 1000);
            }
            setTimeout(() => setSuccessMsg(null), 10000);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message ?? 'Errore durante la prenotazione.');
        } finally {
            setBookingInProgress(null);
            isActionPending.current = false;
        }
    };

    const handleSwap = async (newActivityId: string, turnId: string) => {
        if (isGuest) { setShowLoginPrompt(true); return; }
        if (!selectedAssembly || !userProfile || !studentData) return;
        if (isActionPending.current) return;
        isActionPending.current = true;
        const oldActivityId = studentData.scheduled_turns?.[turnId];
        if (!oldActivityId) {
            isActionPending.current = false;
            return handleBook(newActivityId, turnId);
        }

        setBookingInProgress(`${newActivityId}_${turnId}`);
        setError(null);

        try {
            // Il backend Cloud Function gestisce autonomamente anche i context di Swap
            const bookRoomFn = httpsCallable(functions, 'bookRoom');
            await bookRoomFn({
                targetActivityId: newActivityId,
                turnId: turnId,
                assemblyId: selectedAssembly.id
            });

            setSuccessMsg(`Cambio effettuato con successo!`);
            refreshActivities(); // Immediately update counts after swap
            const turnIndex = allTurnIds.indexOf(turnId);
            const target = getNextScrollTarget(turnId, turnIndex, studentData?.scheduled_turns);
            if (target.type === 'TURN') {
                setTimeout(() => scrollToTurn(target.id), 800);
            } else {
                setTimeout(() => {
                    const el = document.getElementById(target.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 1000);
            }
            setTimeout(() => setSuccessMsg(null), 10000);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message ?? 'Errore durante il cambio attività.');
        } finally {
            setBookingInProgress(null);
            isActionPending.current = false;
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/join/${selectedAssembly?.id}`;
        navigator.clipboard.writeText(url);
        setSuccessMsg("Link d'invito copiato negli appunti!");
        setTimeout(() => setSuccessMsg(null), 10000);
    };

    const handleFinalize = async () => {
        if (!selectedAssembly || !userProfile) return;
        if (isActionPending.current) return;
        isActionPending.current = true;
        setBookingInProgress('FINALIZE');
        setError(null);
        try {
            const finalizeBookingFn = httpsCallable(functions, 'finalizeBooking');
            await finalizeBookingFn({ assemblyId: selectedAssembly.id });
            setSuccessMsg("Prenotazione confermata con successo!");
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || "Errore durante la conferma.");
        } finally {
            setBookingInProgress(null);
            isActionPending.current = false;
        }
    };

    const handleUnlock = async () => {
        if (!selectedAssembly || !userProfile) return;
        if (isActionPending.current) return;
        isActionPending.current = true;
        setBookingInProgress('UNLOCK');
        setError(null);
        try {
            const unlockBookingFn = httpsCallable(functions, 'unlockBooking');
            await unlockBookingFn({ assemblyId: selectedAssembly.id });
            setSuccessMsg("Modifiche abilitate con successo!");
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || "Errore durante lo sblocco.");
        } finally {
            setBookingInProgress(null);
            isActionPending.current = false;
        }
    };

    const handleReset = async () => {
        if (!selectedAssembly || !userProfile) return;
        if (isActionPending.current) return;
        isActionPending.current = true;
        setBookingInProgress('RESET');
        setError(null);
        try {
            const resetBookingFn = httpsCallable(functions, 'resetBooking');
            await resetBookingFn({ assemblyId: selectedAssembly.id });
            setSuccessMsg("Agenda resettata con successo!");
            refreshActivities();
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || "Errore durante il reset.");
        } finally {
            setBookingInProgress(null);
            isActionPending.current = false;
        }
    };

    const handleRate = async (turnId: string, activityId: string, rating: number) => {
        if (!studentData || !selectedAssembly) return;
        if (isActionPending.current) return;
        isActionPending.current = true;
        setBookingInProgress(`RATE_${turnId}`);
        setError(null);

        try {
            const studentRef = doc(db, 'students', studentData.id);
            const activityRef = doc(db, 'rooms', activityId);

            await runTransaction(db, async (tx) => {
                const [stuSnap, actSnap] = await Promise.all([tx.get(studentRef), tx.get(activityRef)]);
                if (!stuSnap.exists()) throw new Error("Profilo studente non trovato.");
                if (!actSnap.exists()) throw new Error("Attività non trovata.");

                const stu = stuSnap.data() as Student;
                const act = actSnap.data() as Activity;

                if (stu.actual_location?.[turnId]?.rating) {
                    throw new Error("Hai già valutato questa attività.");
                }

                const stats = act.rating_stats || { average: 0, count: 0, sum: 0 };
                const newSum = stats.sum + rating;
                const newCount = stats.count + 1;
                const newAverage = newSum / newCount;

                tx.update(activityRef, {
                    rating_stats: { sum: newSum, count: newCount, average: newAverage }
                });

                tx.update(studentRef, { [`actual_location.${turnId}.rating`]: rating });
            });

            setSuccessMsg("Grazie per il tuo feedback! ⭐");
            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: unknown) {
            const errorObj = err as { message?: string };
            setError(errorObj.message || "Errore durante l'invio della valutazione.");
        } finally {
            setBookingInProgress(null);
            isActionPending.current = false;
        }
    };

    const handleBack = () => {
        const hasUnfinalized = studentData && !studentData.is_finalized && Object.values(studentData.scheduled_turns || {}).some(v => !!v);
        if (hasUnfinalized) {
            const confirm = window.confirm("Hai delle prenotazioni non confermate. Sei sicuro di voler uscire?");
            if (!confirm) return;
        }
        setSelectedAssembly(null);
    };

    return {
        userProfile, selectedAssembly, setSelectedAssembly, navigate,
        openAssemblies, allStudentDocs, allActivities, activities, studentData, 
        isGuest, isGlobalLoading, loadingAssembly, bookingInProgress, error, successMsg,
        activeTab, setActiveTab, currentTime, showLoginPrompt, setShowLoginPrompt,
        allTurnIds, bookedCount, formatTurn, missionControl, turnTimestamps,
        smartNextActivity, activeSystemAlerts, canBook, isInProgress, isArchived, displayAssembly,
        handleBook, handleSwap, handleShare, handleFinalize, handleUnlock, handleReset,
        handleRate, handleBack, setError, setSuccessMsg, fetchAssemblies, scrollToTurn
    };
};
