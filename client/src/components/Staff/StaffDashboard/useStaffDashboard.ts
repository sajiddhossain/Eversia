import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import type { Assignment } from './types';
import type { Assembly } from '../../../types';

export interface RoomData {
    id: string;
    name: string;
    assemblyId: string;
    max_capacity: number;
    counts_by_turn: Record<string, number>;
    registered_by_turn?: Record<string, number>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useStaffDashboard = (_selectedTurn: string) => {
    const { user, userProfile } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [activeAssemblies, setActiveAssemblies] = useState<Assembly[]>([]);
    const [rooms, setRooms] = useState<Record<string, RoomData>>({});
    const [config, setConfig] = useState<any>(null);
    const [studentDoc, setStudentDoc] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!user?.email || !userProfile) return;

        const configRef = doc(db, 'config', 'main');
        const unsubscribeConfig = onSnapshot(configRef, (configSnap) => {
            if (configSnap.exists()) {
                setConfig(configSnap.data());
            }
        });

        const isAdmin = userProfile.role === 'SVILUPPATORE' || userProfile.role === 'ADMIN';
        let unsubscribeRooms: (() => void) | undefined;
        let unsubscribeAssemblies: (() => void) | undefined;
        let unsubscribeRoles: (() => void) | undefined;

        if (isAdmin) {
            const assembliesQuery = query(
                collection(db, 'assemblies'),
                where('status', '!=', 'ARCHIVIATA')
            );

            unsubscribeAssemblies = onSnapshot(assembliesQuery, (assemblySnapshot) => {
                const assemblies = assemblySnapshot.docs.map(doc => ({
                    ...(doc.data() as Assembly),
                    id: doc.id
                }));
                setActiveAssemblies(assemblies);
                const activeAssemblyIds = assemblies.map(a => a.id);

                if (assemblies.length === 0) {
                    setAssignments([]);
                    setRooms({});
                    setLoading(false);
                    return;
                }

                const roomsRef = collection(db, 'rooms');
                unsubscribeRooms = onSnapshot(roomsRef, (roomSnapshot) => {
                    const roomsMap: Record<string, RoomData> = {};
                    const adminAssignments: Assignment[] = [];

                    roomSnapshot.docs.forEach(doc => {
                        const data = doc.data();
                        if (activeAssemblyIds.includes(data.assemblyId)) {
                            roomsMap[doc.id] = { id: doc.id, ...data } as RoomData;
                            
                            const assembly = assemblies.find(a => a.id === data.assemblyId);
                            const turns = data.turn_ids || ['1'];
                            
                            turns.forEach((tId: string) => {
                                adminAssignments.push({
                                    id: `${doc.id}_${tId}`,
                                    assemblyId: data.assemblyId,
                                    turn_id: tId,
                                    activityId: doc.id,
                                    role: 'ADMIN_ACCESS',
                                    activityName: data.name,
                                    assemblyName: assembly?.name || 'Assemblea Attiva'
                                });
                            });
                        }
                    });

                    setRooms(roomsMap);
                    setAssignments(adminAssignments);
                    setLoading(false);
                }, (err) => {
                    console.error("[StaffDashboard] Admin rooms listener error:", err);
                    setLoading(false);
                });
            }, (err) => {
                console.error("[StaffDashboard] Admin assemblies listener error:", err);
                setLoading(false);
            });
        } else {
            const rolesRef = collection(db, 'assembly_roles');
            const q = query(rolesRef, where('email', '==', user.email?.toLowerCase() || ''));

            unsubscribeRoles = onSnapshot(q, (snapshot) => {
                const rawAssignments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Assignment));

                const assemblyIds = Array.from(new Set(rawAssignments.map(a => a.assemblyId)));
                if (assemblyIds.length > 0) {
                    const assembliesRef = collection(db, 'assemblies');
                    const assemblyQuery = query(assembliesRef, where('__name__', 'in', assemblyIds));
                    
                    // Listen to assemblies to enrich names
                    onSnapshot(assemblyQuery, (asSnap) => {
                        const assemblies = asSnap.docs.map(d => ({ ...(d.data() as Assembly), id: d.id }));
                        setActiveAssemblies(assemblies);

                        // Enrich assignments with names
                        const enriched = rawAssignments.map(as => {
                            const asm = assemblies.find(a => a.id === as.assemblyId);
                            return {
                                ...as,
                                assemblyName: asm?.name || as.assemblyName || 'Assemblea'
                            };
                        });
                        setAssignments(enriched);
                        setLoading(false);
                    }, (err) => {
                        console.error("[StaffDashboard] Assemblies enrich listener error:", err);
                    });

                    const roomsRef = collection(db, 'rooms');
                    const roomsQuery = query(roomsRef, where('assemblyId', 'in', assemblyIds));
                    unsubscribeRooms = onSnapshot(roomsQuery, (roomSnap) => {
                        const roomsMap: Record<string, RoomData> = {};
                        roomSnap.docs.forEach(d => {
                            roomsMap[d.id] = { id: d.id, ...d.data() } as RoomData;
                        });
                        setRooms(roomsMap);

                        // Also enrich assignments with activity names if rooms are available
                        setAssignments(prev => prev.map(as => {
                            const room = roomsMap[as.activityId || ''];
                            return {
                                ...as,
                                activityName: room?.name || as.activityName
                            };
                        }));
                        setLoading(false);
                    }, (err) => {
                        console.error("[StaffDashboard] Rooms listener error:", err);
                        setLoading(false);
                    });
                } else {
                    setAssignments([]);
                    setLoading(false);
                }
            }, (err) => {
                console.error("[StaffDashboard] Roles listener error:", err);
                setLoading(false);
            });
        }

        return () => {
            unsubscribeRooms?.();
            unsubscribeAssemblies?.();
            unsubscribeRoles?.();
            unsubscribeConfig();
        };
    }, [user?.email, userProfile]);

    useEffect(() => {
        if (!user?.email || !config?.activeAssemblyId) {
            setStudentDoc(null);
            return;
        }

        const studentDocId = `${config.activeAssemblyId}_${user.email.toLowerCase().trim()}`;
        const studentRef = doc(db, 'students', studentDocId);

        const unsubscribeStudent = onSnapshot(studentRef, (snap) => {
            if (snap.exists()) {
                setStudentDoc(snap.data());
            } else {
                setStudentDoc(null);
            }
        });

        return () => unsubscribeStudent();
    }, [user?.email, config?.activeAssemblyId]);

    return { assignments, activeAssemblies, rooms, loading, config, studentDoc };
};
