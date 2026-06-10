import { useState, useEffect } from "react";
import { db, functions } from "../../../firebase";
import { doc, getDoc, collection, query, where, onSnapshot, serverTimestamp, getDocs, runTransaction, deleteField, setDoc, updateDoc, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { Student, Activity, Assembly } from "../../../types";
import { useAuth } from "../../../hooks/useAuth";
import { logEvent } from "../../../utils/auditLogger";

export const useRoomManager = (activityId: string, turnId: string) => {
    const { user, userProfile } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [activity, setActivity] = useState<Activity | null>(null);
    const [activeAssembly, setActiveAssembly] = useState<Assembly | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentTab, setCurrentTab] = useState<'ABSENT' | 'PRESENT'>('ABSENT');
    const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

    // Feature States
    const [filterText, setFilterText] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [allAssemblyStudents, setAllAssemblyStudents] = useState<Student[]>([]);
    const [modalSearchText, setModalSearchText] = useState("");
    const [loadingModal, setLoadingModal] = useState(false);
    const [isCreatingStudent, setIsCreatingStudent] = useState(false);
    const [newStudentData, setNewStudentData] = useState({ firstName: "", lastName: "", email: "" });
    const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    const [staffStudentDoc, setStaffStudentDoc] = useState<any>(null);
    const [isStaffCheckingIn, setIsStaffCheckingIn] = useState(false);

    const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const configRef = doc(db, "config", "main");
        const unsubscribeConfig = onSnapshot(configRef, async (docSnap) => {
            if (docSnap.exists()) {
                const assemblyId = docSnap.data().activeAssemblyId;
                if (assemblyId) {
                    const assemblyRef = doc(db, "assemblies", assemblyId);
                    const assemblyDoc = await getDoc(assemblyRef);
                    if (assemblyDoc.exists()) {
                        setActiveAssembly({ id: assemblyDoc.id, ...assemblyDoc.data() } as Assembly);
                    }
                }
            }
        }, (err) => {
            console.error("[RoomManager] Config listener error:", err);
        });

        const activityRef = doc(db, "rooms", activityId);
        const unsubscribeActivity = onSnapshot(activityRef, (docSnap) => {
            if (docSnap.exists()) {
                setActivity({ id: docSnap.id, ...docSnap.data() } as Activity);
            }
        }, (err) => {
            console.error("[RoomManager] Activity listener error:", err);
        });

        return () => {
            unsubscribeConfig();
            unsubscribeActivity();
        };
    }, [activityId]);

    useEffect(() => {
        if (!user?.email || !activeAssembly?.id) {
            setStaffStudentDoc(null);
            return;
        }

        const studentDocId = `${activeAssembly.id}_${user.email.toLowerCase().trim()}`;
        const studentRef = doc(db, 'students', studentDocId);

        const unsubscribeStaff = onSnapshot(studentRef, (snap) => {
            if (snap.exists()) {
                setStaffStudentDoc(snap.data());
            } else {
                setStaffStudentDoc(null);
            }
        });

        return () => unsubscribeStaff();
    }, [user?.email, activeAssembly?.id]);

    useEffect(() => {
        if (!activeAssembly?.id) return;

        const studentsRef = collection(db, "students");
        const qScheduled = query(
            studentsRef, 
            where("assemblyId", "==", activeAssembly.id),
            where(`scheduled_turns.${turnId}`, "==", activityId)
        );
        const qPresent = query(
            studentsRef, 
            where("assemblyId", "==", activeAssembly.id),
            where(`actual_location.${turnId}.activity_id`, "==", activityId)
        );

        let scheduledList: Student[] = [];
        let presentList: Student[] = [];

        const updateCombinedStudents = () => {
            const combinedMap = new Map<string, Student>();
            scheduledList.forEach(s => combinedMap.set(s.id, s));
            presentList.forEach(s => combinedMap.set(s.id, s));
            setStudents(Array.from(combinedMap.values()));
            setLoading(false);
        };

        const unsubScheduled = onSnapshot(qScheduled, (snapshot) => {
            scheduledList = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Student));
            updateCombinedStudents();
        }, (err) => {
            console.error("[RoomManager] Scheduled list listener error:", err);
        });

        const unsubPresent = onSnapshot(qPresent, (snapshot) => {
            presentList = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Student));
            updateCombinedStudents();
        }, (err) => {
            console.error("[RoomManager] Present list listener error:", err);
        });

        return () => {
            unsubScheduled();
            unsubPresent();
        };
    }, [activeAssembly?.id, activityId, turnId]);

    const performCheckIn = async (student: Student, targetActivityId: string) => {
        if (isProcessing) return;
        setIsProcessing(true);

        const wasCheckedInHere = student.actual_location?.[turnId]?.checked_in && student.actual_location[turnId].activity_id === targetActivityId;

        try {
            await runTransaction(db, async (transaction) => {
                const studentRef = doc(db, "students", student.id);
                const currentActivityRef = doc(db, "rooms", targetActivityId);

                const freshStudentSnap = await transaction.get(studentRef);
                const freshActivitySnap = await transaction.get(currentActivityRef);

                if (!freshActivitySnap.exists()) {
                    throw "Doc missing";
                }

                let freshStudent: Student;
                if (!freshStudentSnap.exists()) {
                    freshStudent = {
                        id: student.id,
                        firstName: student.firstName,
                        lastName: student.lastName,
                        email: student.email,
                        assemblyId: student.assemblyId || activeAssembly?.id || "",
                        scheduled_turns: {},
                        actual_location: {}
                    };
                    transaction.set(studentRef, freshStudent);
                } else {
                    freshStudent = freshStudentSnap.data() as Student;
                }

                const freshActivity = freshActivitySnap.data() as Activity;
                const currentTurnLocation = freshStudent.actual_location?.[turnId];

                let oldActivityRef = null;
                let oldActivitySnap = null;
                if (currentTurnLocation?.checked_in && currentTurnLocation.activity_id !== targetActivityId) {
                    oldActivityRef = doc(db, "rooms", currentTurnLocation.activity_id);
                    oldActivitySnap = await transaction.get(oldActivityRef);
                }

                // ALL WRITES
                if (currentTurnLocation?.checked_in && currentTurnLocation.activity_id !== targetActivityId) {
                    if (oldActivityRef && oldActivitySnap?.exists()) {
                        const oldActData = oldActivitySnap.data() as Activity;
                        const oldTurnCount = oldActData.counts_by_turn?.[turnId] || 0;
                        transaction.update(oldActivityRef, {
                            [`counts_by_turn.${turnId}`]: Math.max(0, oldTurnCount - 1)
                        });
                    }
                    setTimeout(() => showToast(`Trasferito da ${currentTurnLocation.activity_id.split('_').pop()}`, "info"), 0);
                    logEvent({
                        assemblyId: activeAssembly?.id || '',
                        type: 'TRANSFER',
                        studentName: `${freshStudent.firstName} ${freshStudent.lastName}`,
                        studentEmail: freshStudent.email,
                        activityName: freshActivity.name,
                        activityId: targetActivityId,
                        turnId,
                        markedBy: userProfile?.displayName || user?.email || 'unknown',
                        previousActivity: currentTurnLocation.activity_id.split('_').slice(-2, -1)[0] || currentTurnLocation.activity_id,
                    });
                }

                if (currentTurnLocation?.checked_in && currentTurnLocation.activity_id === targetActivityId) {
                    const currentCount = freshActivity.counts_by_turn?.[turnId] || 0;
                    transaction.update(studentRef, { [`actual_location.${turnId}`]: deleteField() });
                    transaction.update(currentActivityRef, {
                        [`counts_by_turn.${turnId}`]: Math.max(0, currentCount - 1)
                    });
                    setTimeout(() => showToast(`${freshStudent.firstName} rimosso.`, "info"), 0);
                    logEvent({
                        assemblyId: activeAssembly?.id || '',
                        type: 'CHECK_OUT',
                        studentName: `${freshStudent.firstName} ${freshStudent.lastName}`,
                        studentEmail: freshStudent.email,
                        activityName: freshActivity.name,
                        activityId: targetActivityId,
                        turnId,
                        markedBy: userProfile?.displayName || user?.email || 'unknown',
                    });
                } else {
                    const currentTurnCount = freshActivity.counts_by_turn?.[turnId] || 0;
                    const isOverCapacity = currentTurnCount >= freshActivity.max_capacity;
                    if (isOverCapacity) {
                        setTimeout(() => showToast("Attenzione: Capienza superata! (Forzato)", "error"), 0);
                    }

                    const scheduledActivity = freshStudent.scheduled_turns?.[turnId];
                    const isGatecrasher = scheduledActivity && scheduledActivity !== targetActivityId;
                    if (isGatecrasher) {
                        setTimeout(() => showToast(`⚠️ IMBUCATO: prenotato per un'altra attività!`, "error"), 0);
                    }

                    transaction.update(studentRef, {
                        [`actual_location.${turnId}`]: {
                            activity_id: targetActivityId,
                            checked_in: true,
                            timestamp: serverTimestamp(),
                            markedBy: userProfile?.displayName || user?.email || "unknown",
                            markedAt: new Date().toISOString()
                        }
                    });
                    // V-008 FIX: Calcolo manuale del contatore dentro la transazione.
                    const currentTurnCountForIncrement = freshActivity.counts_by_turn?.[turnId] ?? 0;
                    transaction.update(currentActivityRef, {
                        [`counts_by_turn.${turnId}`]: currentTurnCountForIncrement + 1
                    });
                    setTimeout(() => showToast(`${freshStudent.firstName} presente!`), 0);

                    const eventType = isGatecrasher ? 'GATECRASHER_DETECTED' : (isOverCapacity ? 'FORCED_ENTRY' : 'CHECK_IN');
                    logEvent({
                        assemblyId: activeAssembly?.id || '',
                        type: eventType,
                        studentName: `${freshStudent.firstName} ${freshStudent.lastName}`,
                        studentEmail: freshStudent.email,
                        activityName: freshActivity.name,
                        activityId: targetActivityId,
                        turnId,
                        markedBy: userProfile?.displayName || user?.email || 'unknown',
                        previousActivity: isGatecrasher ? (scheduledActivity || undefined) : undefined,
                    });
                }
            });

            // Sync with local allAssemblyStudents state for the modal in real-time
            setAllAssemblyStudents(prev => {
                const exists = prev.some(s => s.id === student.id);
                const updatedLocation = { ...student.actual_location };
                if (wasCheckedInHere) {
                    delete updatedLocation[turnId];
                } else {
                    updatedLocation[turnId] = {
                        activity_id: targetActivityId,
                        checked_in: true,
                        markedBy: userProfile?.displayName || user?.email || "unknown",
                        markedAt: new Date().toISOString()
                    };
                }
                const updatedStudent = {
                    ...student,
                    actual_location: updatedLocation
                };
                delete (updatedStudent as any).isGlobalUser;

                if (exists) {
                    return prev.map(s => s.id === student.id ? updatedStudent : s);
                } else {
                    return [...prev, updatedStudent];
                }
            });
        } catch (error: any) {
            console.error("Check-in error:", error);
            const msg = error?.code === 'permission-denied' 
                ? "Errore: Permessi insufficienti." 
                : "Errore durante l'operazione.";
            showToast(msg, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const fetchAssemblyStudents = async (forceRefresh = false) => {
        if (!activeAssembly?.id) return;
        if (allAssemblyStudents.length === 0 || forceRefresh) {
            setLoadingModal(true);
            try {
                const studentsRef = collection(db, "students");
                const q = query(
                    studentsRef, 
                    where("assemblyId", "==", activeAssembly.id),
                    limit(30)
                );
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map((docSnap: any) => ({ id: docSnap.id, ...docSnap.data() } as Student));
                setAllAssemblyStudents(list);
            } catch (e) {
                console.error("Error fetching students:", e);
                showToast("Errore di rete", "error");
            } finally {
                setLoadingModal(false);
            }
        }
    };

    const openAddModal = async () => {
        setIsAddModalOpen(true);
        setIsCreatingStudent(false);
        setModalSearchText("");
        setNewStudentData({ firstName: "", lastName: "", email: "" });
        fetchAssemblyStudents();
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAssembly?.id || !newStudentData.firstName || !newStudentData.lastName || !newStudentData.email) return;

        const email = newStudentData.email.toLowerCase().trim();
        const studentId = `${activeAssembly.id}_${email}`;

        const newStudent: Student = {
            id: studentId,
            firstName: newStudentData.firstName.trim(),
            lastName: newStudentData.lastName.trim(),
            email: email,
            assemblyId: activeAssembly.id,
            scheduled_turns: {},
            actual_location: {}
        };

        setIsProcessing(true);
        try {
            const studentRef = doc(db, "students", studentId);
            const studentDoc = await getDoc(studentRef);

            let finalStudent: Student;

            if (!studentDoc.exists()) {
                finalStudent = newStudent;
                await setDoc(studentRef, finalStudent);
                setAllAssemblyStudents(prev => [...prev, finalStudent]);
            } else {
                finalStudent = { id: studentDoc.id, ...studentDoc.data() } as Student;
                setAllAssemblyStudents(prev => prev.some(s => s.id === finalStudent.id) ? prev : [...prev, finalStudent]);
            }

            await performCheckIn(finalStudent, activityId);

            setIsAddModalOpen(false);
            showToast(studentDoc.exists() ? "Trovato account esistente e aggiunto!" : "Studente creato e aggiunto!", "success");
        } catch (error) {
            console.error("Error creating student:", error);
            showToast("Errore durante la creazione", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const isStaffCheckedIn = staffStudentDoc && staffStudentDoc.staff_actual_location && Object.values(staffStudentDoc.staff_actual_location).some((loc: any) => loc?.checked_in);

    const toggleStaffCheckIn = async () => {
        if (!user?.email || !activeAssembly?.id || isStaffCheckingIn) return;
        setIsStaffCheckingIn(true);
        try {
            const cleanEmail = user.email.toLowerCase().trim();
            const studentDocId = `${activeAssembly.id}_${cleanEmail}`;
            const studentRef = doc(db, 'students', studentDocId);

            const turnsList = activeAssembly.turn_ids || ['T1', 'T2', 'T3'];

            if (isStaffCheckedIn) {
                // Check out
                const actualLocationUpdate: Record<string, any> = {};
                turnsList.forEach(tId => {
                    const cleanId = tId.replace('T', '');
                    const legacyId = `T${cleanId}`;
                    actualLocationUpdate[`staff_actual_location.${cleanId}`] = deleteField();
                    actualLocationUpdate[`staff_actual_location.${legacyId}`] = deleteField();
                });
                await updateDoc(studentRef, actualLocationUpdate);
                showToast("Presenza staff cancellata", "info");
            } else {
                // Check in
                const actualLocationUpdate: Record<string, any> = {};
                turnsList.forEach(tId => {
                    const cleanId = tId.replace('T', '');
                    const legacyId = `T${cleanId}`;
                    const checkinData = {
                        activity_id: 'STAFF',
                        checked_in: true,
                        timestamp: serverTimestamp(),
                        markedBy: 'Self (Room Manager Page)',
                        markedAt: new Date().toISOString()
                    };
                    actualLocationUpdate[`staff_actual_location.${cleanId}`] = checkinData;
                    actualLocationUpdate[`staff_actual_location.${legacyId}`] = checkinData;
                });

                if (!staffStudentDoc) {
                    await setDoc(studentRef, {
                        id: studentDocId,
                        firstName: userProfile?.displayName?.split(' ')[0] || '',
                        lastName: userProfile?.displayName?.split(' ').slice(1).join(' ') || '',
                        email: cleanEmail,
                        assemblyId: activeAssembly.id,
                        scheduled_turns: {},
                        actual_location: {},
                        staff_actual_location: {}
                    });
                }
                await updateDoc(studentRef, actualLocationUpdate);
                showToast("Presenza staff registrata con successo!");
            }
        } catch (err) {
            console.error("Staff check-in toggle failed:", err);
            showToast("Errore durante l'operazione", "error");
        } finally {
            setIsStaffCheckingIn(false);
        }
    };

    // Computed values
    const presentStudents = students.filter(s => s.actual_location?.[turnId]?.checked_in && s.actual_location[turnId].activity_id === activityId);
    const absentStudents = students.filter(s => !s.actual_location?.[turnId] || !s.actual_location[turnId].checked_in || s.actual_location[turnId].activity_id !== activityId);
    const totalScheduled = students.length;
    const attendancePercentage = totalScheduled > 0 ? (presentStudents.length / totalScheduled) * 100 : 0;

    const baseDisplayStudents = currentTab === 'PRESENT' ? presentStudents : absentStudents;
    const displayStudents = filterText
        ? baseDisplayStudents.filter(s =>
            s.firstName.toLowerCase().includes(filterText.toLowerCase()) ||
            s.lastName.toLowerCase().includes(filterText.toLowerCase()) ||
            s.email.toLowerCase().includes(filterText.toLowerCase())
        )
        : baseDisplayStudents;

    // Debounce global search when modalSearchText changes
    useEffect(() => {
        if (!isAddModalOpen) {
            setGlobalSearchResults([]);
            return;
        }

        const term = modalSearchText.trim();
        if (term.length < 3) {
            setGlobalSearchResults([]);
            return;
        }

        setLoadingModal(true);
        const activeRef = { current: true };

        const timer = setTimeout(async () => {
            console.log(`[useRoomManager] Avvio ricerca globale per query: "${term}"`);
            try {
                const searchUsersFn = httpsCallable(functions, "searchUsers");
                const res = await searchUsersFn({ queryText: term });
                console.log(`[useRoomManager] Risultati ricerca globale ricevuti:`, res.data);
                if (activeRef.current) {
                    setGlobalSearchResults(res.data as any[]);
                }
            } catch (err) {
                console.error(`[useRoomManager] Ricerca globale fallita per query "${term}":`, err);
            } finally {
                if (activeRef.current) {
                    setLoadingModal(false);
                }
            }
        }, 500);

        return () => {
            activeRef.current = false;
            clearTimeout(timer);
        };
    }, [modalSearchText, isAddModalOpen]);

    const currentTurnCount = activity?.counts_by_turn?.[turnId] || 0;
    const isFull = activity ? currentTurnCount >= activity.max_capacity : false;

    const modalResults = (() => {
        const term = modalSearchText.trim();
        
        // 1. Local filtered results (students already enrolled in the assembly)
        const localFiltered = term === ""
            ? allAssemblyStudents
            : allAssemblyStudents.filter(s =>
                s.firstName.toLowerCase().includes(term.toLowerCase()) ||
                s.lastName.toLowerCase().includes(term.toLowerCase()) ||
                s.email.toLowerCase().includes(term.toLowerCase())
            );

        // 2. Global filtered results (registered users NOT already enrolled)
        const enrolledEmails = new Set(allAssemblyStudents.map(s => s.email.toLowerCase()));
        
        console.log(`[useRoomManager] Riconciliazione risultati. Term: "${term}", Risultati locali trovati: ${localFiltered.length}, Risultati globali totali: ${globalSearchResults.length}`);
        
        const globalFiltered = globalSearchResults
            .filter(u => {
                const enrolled = enrolledEmails.has(u.email?.toLowerCase());
                if (!u.email) {
                    console.warn(`[useRoomManager] Utente "${u.displayName || u.uid}" escluso dalla ricerca globale perché privo di campo email. Permessi/Ruolo backend non sufficienti per leggerlo?`);
                }
                return u.email && !enrolled;
            })
            .map(u => {
                const email = u.email.toLowerCase().trim();
                const displayName = u.displayName || "";
                
                const emailPrefix = email.split('@')[0];
                const emailParts = emailPrefix.split('.');
                const nameParts = displayName.trim().split(/\s+/);
                
                let matchedFirst: string[] = [];
                let matchedLast: string[] = [];
                
                const isMatch = (nameWord: string, emailWord: string) => {
                    const nw = nameWord.toLowerCase();
                    const ew = emailWord.toLowerCase();
                    return nw.includes(ew) || ew.includes(nw);
                };
                
                nameParts.forEach((part: string) => {
                    if (emailParts[0] && isMatch(part, emailParts[0])) {
                        matchedFirst.push(part);
                    } else if (emailParts.slice(1).some((ep: string) => isMatch(part, ep))) {
                        matchedLast.push(part);
                    }
                });
                
                if (matchedFirst.length === 0 && matchedLast.length === 0) {
                    if (nameParts.length >= 2) {
                        matchedLast = [nameParts[0]];
                        matchedFirst = nameParts.slice(1);
                    } else {
                        matchedFirst = nameParts;
                        matchedLast = [];
                    }
                } else if (matchedFirst.length === 0) {
                    matchedFirst = nameParts.filter((p: string) => !matchedLast.includes(p));
                } else if (matchedLast.length === 0) {
                    matchedLast = nameParts.filter((p: string) => !matchedFirst.includes(p));
                }
                
                const capitalize = (str: string) => str.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
                const firstName = capitalize(matchedFirst.join(" ") || displayName);
                const lastName = capitalize(matchedLast.join(" ") || "Studente");

                const studentId = `${activeAssembly?.id || 'assembly'}_${email}`;

                return {
                    id: studentId,
                    firstName,
                    lastName,
                    email,
                    assemblyId: activeAssembly?.id || '',
                    scheduled_turns: {},
                    actual_location: {},
                    isGlobalUser: true
                } as Student;
            });

        const combined = [...localFiltered, ...globalFiltered];
        return combined.sort((a, b) => a.lastName.localeCompare(b.lastName));
    })();

    return {
        // State
        activity, activeAssembly, loading, isProcessing, currentTab, setCurrentTab,
        toast, filterText, setFilterText, isAddModalOpen, setIsAddModalOpen,
        modalSearchText, setModalSearchText, loadingModal, isCreatingStudent, setIsCreatingStudent,
        newStudentData, setNewStudentData, selectedStudentForDetail, setSelectedStudentForDetail,
        isStaffCheckingIn,
        // Computed
        presentStudents, absentStudents, displayStudents, attendancePercentage,
        currentTurnCount, isFull, modalResults, isStaffCheckedIn,
        // Handlers
        performCheckIn, openAddModal, handleCreateStudent, fetchAssemblyStudents, toggleStaffCheckIn,
    };
};
