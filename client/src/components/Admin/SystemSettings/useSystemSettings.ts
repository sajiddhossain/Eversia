import { useState, useEffect, useMemo } from "react";
import { db, functions } from "../../../firebase";
import { collection, onSnapshot, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where, orderBy, limit, getCountFromServer } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { AppConfig, Assembly, AdminUser, UserProfile } from "../../../types";
import { useAuth } from '../../../hooks/useAuth';
import { logAudit } from "../../../utils/auditLogger";

const DEVELOPER_EMAIL = "sajd.hossain@liceoagnesi.edu.it";

export type SettingsTab = 'OVERVIEW' | 'ROLES' | 'USERS' | 'DEBUG' | 'AUDIT' | 'EMAIL' | 'BULK_CLASS';


export const useSystemSettings = () => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('OVERVIEW');

    // Data states
    const [assemblies, setAssemblies] = useState<Assembly[]>([]);
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
    const [configPub, setConfigPub] = useState<AppConfig | null>(null);
    const [configSec, setConfigSec] = useState<any>(null);

    const config = useMemo(() => {
        if (!configPub) return null;
        return { ...configPub, ...configSec } as AppConfig;
    }, [configPub, configSec]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [totalStudentsCount, setTotalStudentsCount] = useState(0);

    // Roles Tab State
    const [roleSearch, setRoleSearch] = useState("");

    // Users Tab State
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [totalUsersCount, setTotalUsersCount] = useState(0);

    // Add Admin State
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Security Guard State
    const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; action: string; onVerified: (pin?: string) => void; forceSettingMode?: boolean }>({
        isOpen: false,
        action: "",
        onVerified: () => { },
        forceSettingMode: false
    });

    // User Logs State
    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Terminal State
    const [terminalHistory, setTerminalHistory] = useState<{ type: 'input' | 'output' | 'error' | 'success', text: string }[]>([
        { type: 'output', text: 'eversia system terminal v1.0.0-emergency' },
        { type: 'output', text: 'Digitare "help" per la lista dei comandi.' }
    ]);

    useEffect(() => {
        const unsubAssemblies = onSnapshot(collection(db, "assemblies"), (snap) => {
            setAssemblies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assembly)));
        });

        const unsubAdmins = onSnapshot(collection(db, "admins"), (snap) => {
            setAdminUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminUser)));
        });

        const unsubConfig = onSnapshot(doc(db, "config", "main"), (snap) => {
            if (snap.exists()) setConfigPub(snap.data() as AppConfig);
        });

        // SECURITY: Carica le configurazioni sensibili (accessibili solo agli admin)
        const unsubConfigSecrets = onSnapshot(doc(db, "config_secrets", "main"), (snap) => {
            if (snap.exists()) setConfigSec(snap.data());
        });

        const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
            setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const fetchInitialCountsAndUsers = async () => {
            try {
                const countUsersSnap = await getCountFromServer(collection(db, "users"));
                setTotalUsersCount(countUsersSnap.data().count);

                const countStudentsSnap = await getCountFromServer(collection(db, "students"));
                setTotalStudentsCount(countStudentsSnap.data().count);

                const usersSnap = await getDocs(query(collection(db, "users"), limit(50)));
                setRegisteredUsers(usersSnap.docs.map(doc => doc.data() as UserProfile));
            } catch (err) {
                console.error("Error fetching initial counts and users in useSystemSettings:", err);
            }
        };

        fetchInitialCountsAndUsers();

        return () => {
            unsubAssemblies();
            unsubAdmins();
            unsubConfig();
            unsubConfigSecrets();
            unsubRooms();
        };
    }, []);

    // Debounced search via cloud function
    useEffect(() => {
        const activeRef = { current: true };
        const term = userSearch.trim();
        if (term.length < 3) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const searchUsersFn = httpsCallable(functions, 'searchUsers');
                const res = await searchUsersFn({ queryText: term });
                if (!activeRef.current) return;
                setSearchResults(res.data as UserProfile[]);
            } catch (err) {
                console.error("Error searching users in System Settings:", err);
            } finally {
                if (activeRef.current) setSearchLoading(false);
            }
        }, 500);

        return () => {
            activeRef.current = false;
            clearTimeout(timer);
        };
    }, [userSearch]);

    // Admin display list
    const adminDisplayList = useMemo(() => {
        const list: { email: string; isDeveloper: boolean; addedAt?: number }[] = [];
        list.push({ email: DEVELOPER_EMAIL, isDeveloper: true });
        adminUsers
            .filter(a => a.role === 'ADMIN' && a.email.toLowerCase() !== DEVELOPER_EMAIL)
            .sort((a, b) => a.email.localeCompare(b.email))
            .forEach(a => list.push({ email: a.email, isDeveloper: false, addedAt: a.addedAt }));
        return list;
    }, [adminUsers]);

    const filteredAdmins = adminDisplayList.filter(r =>
        r.email.toLowerCase().includes(roleSearch.toLowerCase())
    );

    // Users tab filtering
    const filteredUsers = useMemo(() => {
        const term = userSearch.toLowerCase().trim();
        const baseList = term.length >= 3 ? searchResults : registeredUsers;
        
        return baseList.filter(u => {
            const matchSearch = term.length >= 3 ? true : (!term ||
                u.email.toLowerCase().includes(term) ||
                u.displayName?.toLowerCase().includes(term));
            const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
            return matchSearch && matchRole;
        }).sort((a, b) => a.email.localeCompare(b.email));
    }, [registeredUsers, searchResults, userSearch, userRoleFilter]);

    // Fetch user logs when selectedUser changes
    useEffect(() => {
        if (!selectedUser) {
            setUserLogs([]);
            return;
        }

        const fetchLogs = async () => {
            setLoadingLogs(true);
            try {
                const qLogs = query(
                    collection(db, "event_log"),
                    where("studentEmail", "==", selectedUser.email),
                    orderBy("timestamp", "desc"),
                    limit(10)
                );
                const snap = await getDocs(qLogs);
                setUserLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Error fetching user logs:", err);
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchLogs();
    }, [selectedUser]);

    // ── Handlers ──

    const handleSetSecurityPin = async (newPin: string) => {
        try {
            await setDoc(doc(db, "config_secrets", "main"), { security_pin: newPin }, { merge: true });
        } catch (error) {
            console.error("Error setting security pin:", error);
            throw error;
        }
    };

    const confirmDeleteUser = (user: UserProfile) => {
        setSecurityModal({
            isOpen: true,
            action: `Eliminazione definitiva account: ${user.email}`,
            onVerified: async () => {
                try {
                    await deleteDoc(doc(db, "users", user.uid));
                    await logAudit('ADMIN_REMOVED', userProfile?.email || 'System', `Eliminato account utente registrato: ${user.email}`);
                    setRegisteredUsers(prev => prev.filter(u => u.uid !== user.uid));
                    setSearchResults(prev => prev.filter(u => u.uid !== user.uid));
                    setTotalUsersCount(prev => Math.max(0, prev - 1));
                    setSelectedUser(null);
                    alert("Account eliminato con successo.");
                } catch (error) {
                    console.error("Error deleting user:", error);
                    alert("Errore durante l'eliminazione.");
                }
            }
        });
    };

    const handleUpdateEmailConfig = (field: 'email_bridge_url' | 'email_api_key') => {
        const fieldName = field === 'email_bridge_url' ? 'URL Web App' : 'API Key';
        const currentValue = config?.[field] || "";
        
        const newValue = prompt(`Inserisci il nuovo valore per ${fieldName}:`, currentValue);
        if (newValue === null || newValue === currentValue) return;

        setSecurityModal({
            isOpen: true,
            action: `Modifica configurazione di sistema: Bridge Email (${fieldName})`,
            onVerified: async () => {
                try {
                    await setDoc(doc(db, "config_secrets", "main"), { [field]: newValue }, { merge: true });
                    await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', `Aggiornamento configurazione Email Bridge: ${fieldName}`);
                } catch (error) {
                    console.error("Error updating email config:", error);
                    alert(`Errore durante l'aggiornamento di ${fieldName}.`);
                }
            }
        });
    };

    const handleToggleMaintenanceMode = (enabled: boolean) => {
        setSecurityModal({
            isOpen: true,
            action: `${enabled ? 'ATTIVAZIONE' : 'DISATTIVAZIONE'} MODALITÀ MANUTENZIONE (LOCKDOWN SITO)`,
            onVerified: async () => {
                try {
                    await updateDoc(doc(db, "config", "main"), { maintenance_mode: enabled });
                    await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', `${enabled ? 'Attivata' : 'Disattivata'} modalità manutenzione globale.`);
                } catch (error) {
                    console.error("Error updating maintenance mode:", error);
                    alert("Errore durante l'aggiornamento dello stato del sistema.");
                }
            }
        });
    };

    const handleWipeDatabase = () => {
        setSecurityModal({
            isOpen: true,
            action: `⚠ WIPE TOTALE DATABASE ⚠\nQuesta operazione eliminerà TUTTI i dati (utenti, assemblee, log...). È IRREVERSIBILE.`,
            onVerified: async (pin?: string) => {
                if (!pin) {
                    alert("PIN non fornito per l'autorizzazione.");
                    return;
                }

                const confirmFinal = confirm("SICURO AL 100%? Tutti i dati verranno persi ora.");
                if (!confirmFinal) return;

                setIsSaving(true);
                setTerminalHistory(prev => [...prev, { type: 'output', text: '> Invio richiesta di wipe database al server...' }]);
                try {
                    const wipeDbFn = httpsCallable<{ pin: string }, { success: boolean, message: string }>(functions, 'wipeDatabase');
                    const res = await wipeDbFn({ pin });
                    
                    setTerminalHistory(prev => [...prev, { type: 'success', text: res.data.message || 'Wipe completato con successo.' }]);
                    alert("Database resettato completamente. Il sistema ripartirà dal primo login.");
                    window.location.reload();
                } catch (err: any) {
                    console.error("Wipe failed:", err);
                    const errMsg = err.message || err;
                    setTerminalHistory(prev => [...prev, { type: 'error', text: `Errore wipe: ${errMsg}` }]);
                    alert(`Errore durante il wipe: ${errMsg}`);
                } finally {
                    setIsSaving(false);
                }
            }
        });
    };

    // ── Terminal Commands ──

    const addLog = (text: string, type: 'input' | 'output' | 'error' | 'success' = 'output') => {
        setTerminalHistory(prev => [...prev, { type, text }]);
    };

    const repairAssemblyStats = async (assemblyId: string) => {
        addLog(`Avvio riparazione contatori per assemblea: ${assemblyId}...`, 'output');
        try {
            // Find all students with bookings for this assembly
            const qStudents = query(collection(db, "students"), where("assemblyId", "==", assemblyId));
            const studentSnap = await getDocs(qStudents);
            const students = studentSnap.docs.map(d => d.data());
            
            // Map to store counts: activityId_turnId -> count
            const countsMap: Record<string, number> = {};
            
            students.forEach((student: any) => {
                if (student.scheduled_turns) {
                    Object.entries(student.scheduled_turns).forEach(([turnId, activityId]) => {
                        if (activityId) {
                            const key = `${activityId}_${turnId}`;
                            countsMap[key] = (countsMap[key] || 0) + 1;
                        }
                    });
                }
            });

            // Update all activities for this assembly
            const qActivities = query(collection(db, "rooms"), where("assemblyId", "==", assemblyId));
            const activitySnap = await getDocs(qActivities);
            
            let updatedCount = 0;
            for (const activityDoc of activitySnap.docs) {
                const data = activityDoc.data();
                const newCounts: Record<string, number> = {};
                
                (data.turn_ids || []).forEach((tid: string) => {
                    newCounts[tid] = countsMap[`${activityDoc.id}_${tid}`] || 0;
                });

                await updateDoc(activityDoc.ref, { counts_by_turn: newCounts });
                updatedCount++;
            }

            addLog(`Ripristino completato! ${updatedCount} attività aggiornate correttamente.`, 'success');
            await logAudit('CONFIG_CHANGED', userProfile?.email || 'System', `Riparazione forzata contatori assemblea: ${assemblyId}`);
        } catch (err) {
            addLog(`Errore durante la riparazione: ${err}`, 'error');
        }
    };

    const processTerminalCommand = async (input: string) => {
        const parts = input.trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        addLog(input, 'input');

        switch (command) {
            case 'help':
                addLog('Comandi disponibili:');
                addLog('- help: Mostra questa lista');
                addLog('- clear: Pulisce il terminale');
                addLog('- maintenance [on|off]: Attiva/Disattiva lockdown');
                addLog('- repair-stats [id]: Rincronizza contatori attività');
                addLog('- sys-info: Mostra stato diagnostico completo');
                addLog('- get-user [email]: Dettagli tecnici utente');
                addLog('- wipe-db: Reset totale del sistema (attenzione!)');
                break;
            
            case 'clear':
                setTerminalHistory([]);
                break;

            case 'maintenance':
                if (args[0] === 'on') {
                    await handleToggleMaintenanceMode(true);
                    addLog('Richiesta attivazione manutenzione inviata...', 'output');
                } else if (args[0] === 'off') {
                    await handleToggleMaintenanceMode(false);
                    addLog('Richiesta disattivazione manutenzione inviata...', 'output');
                } else {
                    addLog('Utilizzo: maintenance [on|off]', 'error');
                }
                break;

            case 'repair-stats':
                if (!args[0]) {
                    addLog('Utilizzo: repair-stats [id_assemblea]', 'error');
                } else {
                    await repairAssemblyStats(args[0]);
                }
                break;

            case 'sys-info':
                addLog(`Uptime Sessione: ${Math.floor(performance.now() / 1000)}s`);
                addLog(`Assemblee in DB: ${assemblies.length}`);
                addLog(`Utenti Registrati: ${registeredUsers.length}`);
                addLog(`Studenti Totali: ${totalStudentsCount}`);
                addLog(`Maintenance Mode: ${config?.maintenance_mode ? 'ATTIVO' : 'DISATTIVO'}`);
                addLog(`Sync Status: Online`, 'success');
                break;

            case 'get-user':
                if (!args[0]) {
                    addLog('Utilizzo: get-user [email]', 'error');
                } else {
                    const user = registeredUsers.find(u => u.email === args[0]);
                    if (user) {
                        addLog(`UID: ${user.uid}`);
                        addLog(`Username: ${user.username}`);
                        addLog(`Role: ${user.role}`);
                        addLog(`Created At: ${new Date(user.createdAt).toLocaleString()}`);
                    } else {
                        addLog(`Utente ${args[0]} non trovato.`, 'error');
                    }
                }
                break;

            case 'wipe-db':
                handleWipeDatabase();
                break;

            default:
                addLog(`Comando non riconosciuto: "${command}". Digita "help" per assistenza.`, 'error');
        }
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAdminEmail) return;
        setIsSaving(true);
        const emailToSave = newAdminEmail.toLowerCase().trim();

        const existing = adminUsers.find(a => a.email.toLowerCase() === emailToSave);
        if (existing) {
            alert(`L'email ${emailToSave} è già autorizzata con ruolo ${existing.role}.`);
            setIsSaving(false);
            return;
        }

        try {
            await setDoc(doc(db, "admins", emailToSave), {
                email: emailToSave,
                role: 'ADMIN',
                addedAt: Date.now()
            });

            // PROACTIVE PROMOTION: Update the user document if they are already registered
            const existingUser = registeredUsers.find(u => u.email.toLowerCase() === emailToSave);
            if (existingUser && existingUser.role === 'STUDENT') {
                await updateDoc(doc(db, "users", existingUser.uid), { role: 'ADMIN' });
            }

            await logAudit('ADMIN_ADDED', userProfile?.email || 'System', `Aggiunto nuovo amministratore globale: ${emailToSave}`);
            setNewAdminEmail("");
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding global admin:", error);
            alert("Errore durante l'aggiunta dell'amministratore. Verifica i tuoi permessi.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveAdmin = async (adminEmail: string) => {
        if (adminEmail.toLowerCase() === DEVELOPER_EMAIL) {
            alert("Non è possibile rimuovere lo sviluppatore del sistema.");
            return;
        }
        if (confirm(`Revocare accesso admin a ${adminEmail}?`)) {
            try {
                await deleteDoc(doc(db, "admins", adminEmail));

                // PROACTIVE DEMOTION: Update the user document if they are registered
                const userToDemote = registeredUsers.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());
                if (userToDemote && userToDemote.role === 'ADMIN') {
                    await updateDoc(doc(db, "users", userToDemote.uid), { role: 'STUDENT' });
                }

                await logAudit('ADMIN_REMOVED', userProfile?.email || 'System', `Rimosso amministratore globale: ${adminEmail}`);
            } catch (error) {
                console.error("Error removing admin:", error);
                alert("Errore durante la rimozione. Verifica i tuoi permessi.");
            }
        }
    };

    const getRoleBadge = (role: string) => {
        const map: Record<string, string> = {
            'SVILUPPATORE': 'bg-purple-500/20 text-purple-400',
            'ADMIN': 'bg-primary/20 text-primary',
            'ROOM_MANAGER': 'bg-blue-500/20 text-blue-400',
            'SECURITY': 'bg-orange-500/20 text-orange-400',
            'STUDENT': 'bg-white/10 text-white/50',
        };
        return map[role] || 'bg-white/10 text-white/50';
    };

    return {
        // Auth
        userProfile, DEVELOPER_EMAIL,
        // Tab
        activeTab, setActiveTab,
        // Data
        assemblies, adminUsers, registeredUsers, config, rooms, totalStudentsCount, totalUsersCount,
        // Roles
        roleSearch, setRoleSearch, filteredAdmins, showAddForm, setShowAddForm,
        newAdminEmail, setNewAdminEmail, isSaving, adminDisplayList,
        // Users
        userSearch, setUserSearch, userRoleFilter, setUserRoleFilter,
        selectedUser, setSelectedUser, filteredUsers, userLogs, loadingLogs, searchLoading,
        // Security
        securityModal, setSecurityModal,
        // Terminal
        terminalHistory, processTerminalCommand,
        // Handlers
        handleSetSecurityPin, confirmDeleteUser, handleUpdateEmailConfig,
        handleAddAdmin, handleRemoveAdmin, getRoleBadge, handleToggleMaintenanceMode,
        handleWipeDatabase
    };
};
