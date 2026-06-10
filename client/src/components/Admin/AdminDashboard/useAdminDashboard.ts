import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../../../firebase";
import { collection, onSnapshot, doc, updateDoc, query, where, setDoc, getDocs } from "firebase/firestore";
import type { Activity, AppConfig, Assembly, Student, UserProfile } from "../../../types";
import { useAuth } from "../../../hooks/useAuth";
import { ROLES } from "../../../constants";

export const useAdminDashboard = () => {
    const { userProfile, loading: authLoading } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [assemblies, setAssemblies] = useState<Assembly[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [config, setConfig] = useState<AppConfig>({ currentTurn: "1" });
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isAdmin = useMemo(() => 
        userProfile && ([ROLES.SVILUPPATORE, ROLES.ADMIN] as string[]).includes(userProfile.role),
    [userProfile]);

    const fetchStudents = useCallback(async () => {
        if (!config.activeAssemblyId) {
            setStudents([]);
            setTotalStudents(0);
            return;
        }
        try {
            const qStudents = query(collection(db, "students"), where("assemblyId", "==", config.activeAssemblyId));
            const snap = await getDocs(qStudents);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
            setStudents(list);
            setTotalStudents(snap.size);
        } catch (error) {
            console.error("Error fetching students statically:", error);
        }
    }, [config.activeAssemblyId]);

    useEffect(() => {
        if (authLoading || !isAdmin) {
            if (!authLoading && !isAdmin) setLoading(false);
            return;
        }

        const unsubscribeConfig = onSnapshot(doc(db, "config", "main"), (doc) => {
            if (doc.exists()) {
                setConfig(prev => ({ ...prev, ...doc.data() }));
            }
        });

        const unsubscribeAssemblies = onSnapshot(collection(db, "assemblies"), (snapshot) => {
            setAssemblies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assembly)));
        });

        // Filter users to fetch only those with staff/admin roles to save database reads
        const qUsers = query(
            collection(db, "users"),
            where("role", "in", [ROLES.ADMIN, ROLES.SVILUPPATORE, ROLES.ROOM_MANAGER, ROLES.SECURITY])
        );
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
        });

        return () => {
            unsubscribeConfig();
            unsubscribeAssemblies();
            unsubscribeUsers();
        };
    }, [authLoading, isAdmin]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!config.activeAssemblyId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            await fetchStudents();
            setLoading(false);
        };
        loadInitialData();
    }, [config.activeAssemblyId, fetchStudents]);

    useEffect(() => {
        if (!config.activeAssemblyId || !config.currentTurn) return;

        const qActivities = config.currentTurn === 'ALL'
            ? query(collection(db, "rooms"), where("assemblyId", "==", config.activeAssemblyId))
            : query(collection(db, "rooms"), where("turn_ids", "array-contains", config.currentTurn), where("assemblyId", "==", config.activeAssemblyId));
            
        const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
            setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
        });

        return () => {
            unsubscribeActivities();
        };
    }, [config.currentTurn, config.activeAssemblyId]);

    const adminEmails = useMemo(() => {
        return new Set(allUsers
            .filter(u => ['ADMIN', 'SVILUPPATORE'].includes(u.role))
            .map(u => u.email?.toLowerCase().trim())
            .filter(Boolean)
        );
    }, [allUsers]);

    const actualStudents = useMemo(() => students.filter(s => {
        const emailClean = s.email.toLowerCase().trim();
        if (adminEmails.has(emailClean)) return false;

        const hasSchedule = Object.keys(s.scheduled_turns || {}).length > 0;
        if (hasSchedule) return true; // Has enrollments = definitely a student
        
        // Exclude if it has staff actual location entries (staff-only)
        const hasStaffPresence = s.staff_actual_location && Object.keys(s.staff_actual_location).length > 0;
        if (hasStaffPresence) return false;
        
        // Backwards compatibility: exclude if ALL locations in actual_location are STAFF
        const locValues = Object.values(s.actual_location || {});
        if (locValues.length > 0) {
            const allStaff = locValues.every((loc: any) => loc?.activity_id === 'STAFF');
            if (allStaff) return false;
        }
        
        return true;
    }), [students, adminEmails]);

    const metrics = useMemo(() => {
        const nonEnrolled: Student[] = [];
        const absents: Student[] = [];
        const presents: Student[] = [];
        const imbucati: Student[] = [];

        actualStudents.forEach(s => {
            const locValues = Object.values(s.actual_location || {});
            const isPresent = locValues.some((loc: any) => loc?.checked_in === true);
            const hasSchedule = Object.keys(s.scheduled_turns || {}).length > 0;

            if (isPresent) {
                presents.push(s);
                const isImbucato = Object.entries(s.actual_location || {}).some(([turnId, loc]: [string, any]) => {
                    if (!loc?.checked_in || !loc?.activity_id || loc.activity_id === 'STAFF') return false;
                    const expectedActivity = s.scheduled_turns?.[turnId];
                    return expectedActivity && loc.activity_id !== expectedActivity;
                });
                if (isImbucato) imbucati.push(s);
            } else if (!hasSchedule) {
                nonEnrolled.push(s);
            } else {
                absents.push(s);
            }
        });

        return { nonEnrolled, absents, presents, imbucati };
    }, [actualStudents]);

    const totalCapacity = useMemo(() => activities.reduce((acc, curr) => {
        if (config.currentTurn === 'ALL') {
            return acc + (curr.max_capacity * (curr.turn_ids?.length || 0));
        }
        return acc + (curr.turn_ids?.includes(config.currentTurn) ? curr.max_capacity : 0);
    }, 0), [activities, config.currentTurn]);

    const actualPresent = useMemo(() => activities.reduce((acc, curr) => {
        if (config.currentTurn === 'ALL') {
            return acc + Object.values(curr.counts_by_turn || {}).reduce((a, b) => a + b, 0);
        }
        return acc + (curr.counts_by_turn?.[config.currentTurn] || 0);
    }, 0), [activities, config.currentTurn]);

    const avgSaturation = totalCapacity > 0 ? (actualPresent / totalCapacity) * 100 : 0;
    const efficiency = actualStudents.length > 0 ? (metrics.presents.length / actualStudents.length) * 100 : 0;
    const pendingTotal = Math.max(0, actualStudents.length - metrics.presents.length);

    const studentsInCurrentTurn = useMemo(() => actualStudents.filter(s => {
        if (config.currentTurn === 'ALL') return Object.keys(s.scheduled_turns || {}).length > 0;
        return s.scheduled_turns && s.scheduled_turns[config.currentTurn];
    }), [actualStudents, config.currentTurn]);
    
    const studentsMissingAssignment = Math.max(0, actualStudents.length - studentsInCurrentTurn.length);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchStudents();
        setIsRefreshing(false);
    }, [fetchStudents]);

    const setAssembly = async (id: string) => {
        try {
            await setDoc(doc(db, "config", "main"), { activeAssemblyId: id }, { merge: true });
        } catch (e) {
            console.error("Error setting active assembly:", e);
        }
    };

    const setTurn = async (turn: string) => {
        try {
            await updateDoc(doc(db, "config", "main"), { currentTurn: turn });
        } catch (e) {
            console.error("Error setting turn:", e);
        }
    };

    return {
        activities,
        assemblies,
        totalStudents,
        config,
        loading,
        students,
        allUsers,
        isRefreshing,
        metrics,
        totalCapacity,
        actualPresent,
        avgSaturation,
        efficiency,
        pendingTotal,
        studentsInCurrentTurn,
        studentsMissingAssignment,
        handleRefresh,
        setAssembly,
        setTurn
    };
};
