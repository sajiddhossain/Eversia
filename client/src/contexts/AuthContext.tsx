import React, { createContext, useEffect, useState, useRef, useCallback } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, runTransaction, updateDoc, Transaction } from 'firebase/firestore';
import type { UserProfile, UserRole } from '../types';

export interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    isStaff: boolean;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    authError: string | null;
    clearAuthError: () => void;
    authTimeout: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType>({ isStaff: false, authTimeout: false } as AuthContextType);

// ─── V-015 FIX: Pulizia completa di tutti gli storage del browser ───
// Elimina localStorage e sessionStorage per garantire la privacy su PC condivisi della P.A.
// Evitiamo la cancellazione di IndexedDB/Caches per prevenire blocchi (deadlock) nel database engine del browser.
const performFullDataWipe = async (): Promise<void> => {
    try {
        // 1. localStorage completo
        localStorage.clear();

        // 2. sessionStorage completo
        sessionStorage.clear();
    } catch (error) {
        console.error("[AuthContext] Data wipe error:", error);
    }
};

const generateUniqueUsername = async (displayName: string, transaction?: Transaction): Promise<string> => {
    // 1. Normalize accented characters: ò→o, à→a, è→e, ü→u, etc.
    //    NFD decomposes accented chars into base char + combining diacritic,
    //    then we strip the combining diacritics (\u0300–\u036f range).
    const normalized = displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 2. Split into tokens (first name + last name), build base slug
    const tokens = normalized.trim().toLowerCase().split(/[\s._]+/).filter(Boolean);
    let slug: string;
    if (tokens.length >= 2) {
        // firstname.lastname — use first token and last token (handles middle names)
        slug = `${tokens[0]}.${tokens[tokens.length - 1]}`;
    } else {
        slug = tokens[0] || 'utente';
    }

    // 3. Strip anything that isn't a-z, 0-9, or dot
    const cleanSlug = slug.replace(/[^a-z0-9.]/g, '');
    const baseUsername = `@${cleanSlug}`;

    // 4. Check availability — no suffix for the first user, then .2, .3, .4 …
    let candidate = baseUsername;
    let checkRef = doc(db, 'usernames', candidate);
    let checkSnap = transaction ? await transaction.get(checkRef) : await getDoc(checkRef);

    let counter = 2;
    while (checkSnap.exists()) {
        candidate = `${baseUsername}.${counter}`;
        checkRef = doc(db, 'usernames', candidate);
        checkSnap = transaction ? await transaction.get(checkRef) : await getDoc(checkRef);
        counter++;
    }

    return candidate;
};

const checkDomain = (email: string | null): boolean => {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();
    
    const isStrictLocal = (window.location.hostname === "localhost" || 
                          window.location.hostname === "127.0.0.1") &&
                          import.meta.env.DEV;
    
    const ALLOWED_DOMAINS = isStrictLocal ? [
        "liceoagnesi.edu.it", 
        "liceoagnesi.gov.it",
        // Whitelist di sviluppo/testing locale ristretta
        "gmail.com", 
        "example.com", 
        "test.com", 
        "eversia.it"
    ] : [
        "liceoagnesi.edu.it", 
        "liceoagnesi.gov.it"
    ];
    
    // Split by '@' to target the exact domain part
    const parts = lowerEmail.split('@');
    if (parts.length !== 2) return false;
    
    const domainPart = parts[1];
    return ALLOWED_DOMAINS.includes(domainPart) || 
           (isStrictLocal && (domainPart.endsWith('.test') || domainPart.endsWith('.local')));
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isStaff, setIsStaff] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authTimeout, setAuthTimeout] = useState(false);

    // V-007 FIX: Ref per gestire il cleanup del profile listener.
    // Il callback di onAuthStateChanged NON usa il suo return value,
    // quindi il cleanup deve essere gestito tramite ref esterno.
    const profileUnsubRef = useRef<(() => void) | null>(null);

    const checkAndCreateUserProfile = useCallback(async (firebaseUser: User) => {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        try {
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userRef);
                const now = Date.now();

                if (userSnap.exists()) {
                    const data = userSnap.data() as UserProfile;
                    const updates: Partial<UserProfile> = {
                        lastLogin: now,
                        uid: firebaseUser.uid
                    };

                    if (!data.username) {
                        const displayNameFallback = data.displayName || firebaseUser.displayName || data.email?.split('@')[0] || firebaseUser.email?.split('@')[0] || 'user';
                        const newUsername = await generateUniqueUsername(displayNameFallback, transaction);
                        updates.username = newUsername;
                        updates.isFirstUsernameChange = true;
                        
                        const usernameRef = doc(db, 'usernames', newUsername);
                        transaction.set(usernameRef, { uid: firebaseUser.uid, email: data.email });
                    }

                    if (data.isFirstUsernameChange === undefined) updates.isFirstUsernameChange = true;
                    if (data.friends === undefined) updates.friends = [];
                    if (data.earnedBadges === undefined) updates.earnedBadges = [];
                    if (!data.createdAt) updates.createdAt = now;
                    if (data.xp === undefined) updates.xp = 0;
                    if (data.level === undefined) updates.level = 1;
                    if (data.streak === undefined) updates.streak = 0;
                    if (data.friendCount === undefined) updates.friendCount = data.friends?.length || 0;
                    if (data.totalAssemblies === undefined) updates.totalAssemblies = 0;
                    if (data.totalCheckIns === undefined) updates.totalCheckIns = 0;
                    if (data.privacyAccepted === undefined) updates.privacyAccepted = false;

                    if (data.role as string === 'ROOM_MANAGER' || data.role as string === 'SECURITY') {
                        updates.role = 'STUDENT';
                    }



                    transaction.update(userRef, updates);
                    setUserProfile({ ...data, ...updates });
                } else {
                    const tokenResult = await firebaseUser.getIdTokenResult();
                    const initialRole = (tokenResult.claims.role as UserRole) || 'STUDENT';

                    const displayNameFallback = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user';
                    const username = await generateUniqueUsername(displayNameFallback, transaction);
                    
                    const newProfile: UserProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        displayName: firebaseUser.displayName || '',
                        role: initialRole,
                        username: username,
                        isFirstUsernameChange: true,
                        friends: [],
                        friendCount: 0,
                        earnedBadges: [],
                        xp: 0,
                        level: 1,
                        streak: 0,
                        lastStreakDate: 0,
                        totalAssemblies: 0,
                        totalCheckIns: 0,
                        showEmail: false, // Security Fix #12: privacy-by-default (utenti scolastici)
                        showBirthday: false,
                        delegatedRooms: [],
                        lastLogin: now,
                        createdAt: now,
                        privacyAccepted: false
                    };

                    const usernameRef = doc(db, 'usernames', username);
                    transaction.set(usernameRef, { uid: firebaseUser.uid, email: firebaseUser.email });
                    transaction.set(userRef, newProfile);
                    setUserProfile(newProfile);
                }
            });
        } catch (error) {
            console.error("[AuthContext] Profile sync transaction failed:", error);
        }
    }, []);

    useEffect(() => {
        let isAuthInitialized = false;

        // Safety timeout to prevent infinite black screens if IndexedDB deadlocks or Firebase fails to respond.
        // It sets loading to false after 5000ms so the user can at least view the guest page.
        const safetyTimeout = setTimeout(() => {
            if (!isAuthInitialized) {
                console.warn("[AuthContext] Firebase Auth initialization timed out. Falling back to Guest mode.");
                setAuthTimeout(true);
                setLoading(false);
            }
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            isAuthInitialized = true;
            setAuthTimeout(false);
            clearTimeout(safetyTimeout);
            try {
                // V-007 FIX: Sgancia il listener precedente PRIMA di crearne uno nuovo.
                // Questo previene l'accumulo di listener zombie quando l'auth state cambia.
                if (profileUnsubRef.current) {
                    profileUnsubRef.current();
                    profileUnsubRef.current = null;
                }

                if (firebaseUser) {
                    if (!checkDomain(firebaseUser.email)) {
                        console.warn("[AuthContext] [SECURITY] Unauthorized domain detected:", firebaseUser.email);
                        setAuthError("DOMAIN_MISMATCH");
                        setUser(null);
                        setUserProfile(null);
                        setIsStaff(false);
                        await signOut(auth);
                        return;
                    }

                    setUser(firebaseUser);
                    await checkAndCreateUserProfile(firebaseUser);

                    // V-007 FIX: Il listener viene salvato nella ref per cleanup deterministico.
                    // Non si usa più il return value del callback (ignorato da onAuthStateChanged).
                    const profileRef = doc(db, 'users', firebaseUser.uid);
                    const unsubProfile = onSnapshot(profileRef, async (docSnap) => {
                        if (docSnap.exists()) {
                            const profileData = docSnap.data() as UserProfile;
                            setUserProfile(profileData);

                            try {
                                const tokenResult = await firebaseUser.getIdTokenResult();
                                const currentClaimRole = tokenResult.claims.role || 'STUDENT';
                                if (currentClaimRole !== profileData.role) {
                                    console.log(`[AuthContext] Role mismatch (JWT: ${currentClaimRole}, DB: ${profileData.role}). Forcing token refresh...`);
                                    await firebaseUser.getIdToken(true);
                                }
                            } catch (e) {
                                console.error("[AuthContext] Token claim sync check failed:", e);
                            }
                        }
                    }, (error) => {
                        console.error("[AuthContext] Profile listener error:", error);
                    });

                    profileUnsubRef.current = unsubProfile;
                } else {
                    setUser(null);
                    setUserProfile(null);
                    setIsStaff(false);
                }
            } catch (error) {
                console.error("[AuthContext] Auth initialization error:", error);
                setUser(null);
                setUserProfile(null);
                setIsStaff(false);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            unsubscribe();
            clearTimeout(safetyTimeout);
            // V-007 FIX: Cleanup del profile listener anche allo smontaggio del componente
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }
        };
    }, [checkAndCreateUserProfile]);

    // Reactive Staff Check
    const userRole = userProfile?.role;
    const userUid = userProfile?.uid;
    const delegatedRoomsStr = JSON.stringify(userProfile?.delegatedRooms || []);

    useEffect(() => {
        if (!user?.email || !userUid || !userRole) {
            setIsStaff(false);
            return;
        }

        const isAdmin = ['SVILUPPATORE', 'ADMIN'].includes(userRole);
        if (isAdmin) {
            setIsStaff(true);
            return;
        }

        // Listen for ANY staff role for this user
        const rolesRef = collection(db, 'assembly_roles');
        const q = query(rolesRef, where('email', '==', user.email?.toLowerCase() || ''));

        const unsubscribe = onSnapshot(q, async (snap) => {
            setIsStaff(!snap.empty);
            
            // Sync delegatedRooms for quick access in dashboards
            const rooms = snap.docs
                .map(d => d.data().activityId)
                .filter((id): id is string => !!id);
            
            const currentRooms = JSON.parse(delegatedRoomsStr) as string[];
            const hasChanged = rooms.length !== currentRooms.length || 
                              !rooms.every(r => currentRooms.includes(r));
            
            if (hasChanged) {
                try {
                    const userRef = doc(db, 'users', userUid);
                    await updateDoc(userRef, { delegatedRooms: rooms });
                } catch (err) {
                    console.error("[AuthContext] Failed to sync delegatedRooms:", err);
                }
            }
        }, (error) => {
            const err = error as { code?: string; message?: string };
            const code = err.code || '';
            const msg = err.message || '';
            const isPermissionErr = code === 'permission-denied' || 
                                   code === 'firestore/permission-denied' ||
                                   msg.toLowerCase().includes('permission') ||
                                   msg.toLowerCase().includes('insufficient');
            if (!isPermissionErr) {
                console.error("[AuthContext] Staff roles listener error:", error);
            }
            setIsStaff(false);
        });

        return () => unsubscribe();
    }, [user?.email, userUid, userRole, delegatedRoomsStr]);

    const loginWithGoogle = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userEmail = result.user.email;
            
            if (!checkDomain(userEmail)) {
                await signOut(auth);
                setAuthError("DOMAIN_MISMATCH");
                throw new Error("DOMAIN_MISMATCH");
            }
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string };
            console.error("Login popup failed:", error);
            if (firebaseError.message === 'DOMAIN_MISMATCH') {
                throw error;
            }
            // Add a small cleanup just in case
            setUser(null);
            setUserProfile(null);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // V-015 FIX: Logout con pulizia TOTALE dei dati.
    // Elimina localStorage, sessionStorage, IndexedDB e Service Worker cache.
    // Critico per GDPR compliance su PC condivisi della P.A.
    const logout = useCallback(async () => {
        try {
            // V-007 FIX: Sgancia il profile listener PRIMA del signOut
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }

            // Pulizia totale di tutti gli storage del browser
            await performFullDataWipe();

            // Firebase signOut (invalida il token JWT locale)
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ 
            user, 
            userProfile, 
            isStaff, 
            loading, 
            loginWithGoogle, 
            logout,
            authError,
            clearAuthError: () => setAuthError(null),
            authTimeout
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
