import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../../firebase';
import { 
    doc, onSnapshot, collection, query, where, 
} from 'firebase/firestore';
import type { Student, Assembly, UserProfile } from '../../../../types';

export const useStudentAgenda = (userProfile: UserProfile | null, selectedAssembly: Assembly | null) => {
    // Lazy state initialization for allStudentDocs
    const [allStudentDocs, setAllStudentDocs] = useState<Student[]>(() => {
        if (!userProfile) return [];
        try {
            const cached = sessionStorage.getItem(`eversia_all_student_docs_${userProfile.email}`);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    // Lazy state initialization for isGlobalLoading
    const [isGlobalLoading, setIsGlobalLoading] = useState(() => {
        if (!userProfile) return false;
        try {
            const cached = sessionStorage.getItem(`eversia_all_student_docs_${userProfile.email}`);
            return !cached;
        } catch {
            return true;
        }
    });

    // Reactive cache dictionary for studentData of different assemblies
    const [studentDataMap, setStudentDataMap] = useState<Record<string, Student>>({});
    const [isStudentDataLoading, setIsStudentDataLoading] = useState(false);
    const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const studentId = (selectedAssembly && userProfile) ? `${selectedAssembly.id}_${userProfile.email}` : null;

    // Derived studentData: checks the reactive map, otherwise falls back to sessionStorage cache
    const studentData = studentId ? (studentDataMap[studentId] || (() => {
        try {
            const cached = sessionStorage.getItem(`eversia_student_data_${studentId}`);
            return cached ? JSON.parse(cached) as Student : null;
        } catch {
            return null;
        }
    })()) : null;

    // Adjust loading state during render when studentId changes to prevent cascading effect updates
    const [prevStudentId, setPrevStudentId] = useState<string | null>(null);
    if (studentId !== prevStudentId) {
        setPrevStudentId(studentId);
        setIsStudentDataLoading(!!studentId);
    }

    // Callback to update studentData map (compat with original setStudentData hook return)
    const setStudentData = useCallback((val: Student | null | ((prev: Student | null) => Student | null)) => {
        if (!studentId) return;
        setStudentDataMap(prev => {
            const current = prev[studentId] || null;
            const updated = typeof val === 'function' ? val(current) : val;
            if (updated === null) {
                const next = { ...prev };
                delete next[studentId];
                return next;
            }
            return { ...prev, [studentId]: updated };
        });
    }, [studentId]);

    // Global Students Listener
    useEffect(() => {
        if (!userProfile) {
            return;
        }
        const q = query(
            collection(db, 'students'),
            where('email', '==', userProfile.email.toLowerCase())
        );

        const unsub = onSnapshot(q, snap => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
            setAllStudentDocs(docs);
            setIsGlobalLoading(false);
            try {
                sessionStorage.setItem(`eversia_all_student_docs_${userProfile.email}`, JSON.stringify(docs));
            } catch (e) { console.warn("Cache failed:", e); }
        }, err => {
            console.error('AllStudentDocs error:', err);
            setIsGlobalLoading(false);
        });

        return unsub;
    }, [userProfile]);

    // Selected Assembly Student Listener
    useEffect(() => {
        if (!selectedAssembly || !userProfile || !studentId) {
            return;
        }
        const unsubStudent = onSnapshot(doc(db, 'students', studentId), snap => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() } as Student;
                setStudentDataMap(prev => ({ ...prev, [studentId]: data }));
                try {
                    sessionStorage.setItem(`eversia_student_data_${studentId}`, JSON.stringify(data));
                } catch (e) {
                    console.warn("Cache studentData failed:", e);
                }
            } else {
                setStudentDataMap(prev => {
                    const next = { ...prev };
                    delete next[studentId];
                    return next;
                });
            }
            setIsStudentDataLoading(false);
        }, err => {
            console.error('Student fetch error', err);
            setError("Impossibile caricare i tuoi dati per questa assemblea.");
            setIsStudentDataLoading(false);
        });
        return unsubStudent;
    }, [selectedAssembly, userProfile, studentId]);

    return { 
        allStudentDocs, studentData, 
        isGlobalLoading, setIsGlobalLoading,
        isStudentDataLoading,
        bookingInProgress, setBookingInProgress,
        error, setError, setStudentData
    };
};
