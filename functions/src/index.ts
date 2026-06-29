import * as admin from "firebase-admin";
admin.initializeApp();
import { FieldValue } from "firebase-admin/firestore";


import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import * as crypto from "crypto";
import { checkRateLimit } from "./rateLimiter";

const db = admin.firestore();

import { resolveAuth } from "./authHelper";
import { evaluateAndAwardBadges } from "./gamification";

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const enforceAppCheck = !isEmulator;



// ─── V-006 FIX: Schema di validazione input con Zod ───
// Previene injection di tipi non-stringa (numeri, array, oggetti) da client malevoli.
const BookRoomSchema = z.object({
    targetActivityId: z.string().min(1).max(200),
    turnId: z.string().min(1).max(50),
    assemblyId: z.string().min(1).max(200),
});

// Allowed institutional email domains
const ALLOWED_DOMAINS = ["@liceoagnesi.edu.it", "@liceoagnesi.gov.it"] as const;

/**
 * bookRoom — Transazione ACID per prenotazione aula.
 */
export const bookRoom = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);
    // ─── 1. VERIFICA AUTENTICAZIONE (Zero Trust Barrier) ───
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }

    const email = auth.token.email?.toLowerCase();
    if (!email || !ALLOWED_DOMAINS.some(domain => email.endsWith(domain))) {
        throw new HttpsError("permission-denied", "Accesso consentito solo tramite email d'istituto.");
    }

    // ─── 2. VALIDAZIONE INPUT CON SCHEMA (V-006 FIX) ───
    const parseResult = BookRoomSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError(
            "invalid-argument",
            `Parametri non validi: ${parseResult.error.issues.map(i => i.message).join(', ')}`
        );
    }
    const { targetActivityId, turnId, assemblyId } = parseResult.data;

    // ─── 3. RIFERIMENTI DATABASE ───
    const studentId = `${assemblyId}_${email}`;
    const studentRef = db.doc(`students/${studentId}`);
    const activityRef = db.doc(`rooms/${targetActivityId}`);
    const configRef = db.doc(`config/main`);
    const assemblyRef = db.doc(`assemblies/${assemblyId}`);

    try {
        // ─── 4. TRANSAZIONE ACID DISTRIBUITA ───
        const result = await db.runTransaction(async (tx) => {
            // Letture transazionali: tutte PRIMA delle scritture (Firestore requirement)
            const [actSnap, stuSnap, cfgSnap, assembSnap] = await Promise.all([
                tx.get(activityRef),
                tx.get(studentRef),
                tx.get(configRef),
                tx.get(assemblyRef)
            ]);

            // ─── 4a. PRECONDIZIONI DI SICUREZZA ───
            if (cfgSnap.exists && cfgSnap.data()?.lock_registrations) {
                throw new HttpsError("failed-precondition", "Sistema bloccato dall'amministratore.");
            }
            if (!assembSnap.exists || assembSnap.data()?.status !== "ISCRIZIONI_APERTE") {
                throw new HttpsError("failed-precondition", "Le iscrizioni sono chiuse.");
            }

            // ─── 4b. VERIFICA ATTIVITÀ ───
            if (!actSnap.exists) {
                throw new HttpsError("not-found", "L'attività non è stata trovata.");
            }
            const actData = actSnap.data()!;
            
            // SECURITY HARDENING: Verify activity belongs to requested assembly
            if (actData.assemblyId !== assemblyId) {
                throw new HttpsError("failed-precondition", "L'attività non appartiene a questa assemblea.");
            }

            // SECURITY HARDENING: Verify turnId is valid for this activity
            if (!actData.turn_ids || !Array.isArray(actData.turn_ids) || !actData.turn_ids.includes(turnId)) {
                throw new HttpsError("failed-precondition", "Il turno specificato non è disponibile per questa attività.");
            }

            const currentCount: number = actData.counts_by_turn?.[turnId] ?? 0;
            const maxCapacity: number = actData.max_capacity ?? 0;

            // ─── 4c. VARIABILI DI RICONCILIAZIONE ───
            let isPhysicallyHere = false;
            const now = Date.now();
            let scheduledTurns: Record<string, string> = {};

            if (stuSnap.exists) {
                const stuData = stuSnap.data()!;

                // SECURITY HARDENING: Prevent changes if booking is finalized
                if (stuData.is_finalized) {
                    throw new HttpsError("failed-precondition", "La tua prenotazione è finalizzata. Sbloccala prima di apportare modifiche.");
                }

                // Rate limiting: impedisce click compulsivi
                const throttleMs: number = cfgSnap.data()?.registration_throttle_ms ?? 2000;
                const lastBooking: number = stuData.last_booking_at ?? 0;

                if (now - lastBooking < throttleMs) {
                    throw new HttpsError(
                        "resource-exhausted",
                        "Sei troppo veloce, attendi il timeout di sicurezza."
                    );
                }

                scheduledTurns = stuData.scheduled_turns ?? {};

                // Controlla prenotazione duplicata
                if (scheduledTurns[turnId] === targetActivityId) {
                    throw new HttpsError("already-exists", "Sei già iscritto a questo turno.");
                }

                // ─── RECONCILIATION ENGINE (Gatecrasher Detection) ───
                isPhysicallyHere =
                    stuData.actual_location?.[turnId]?.activity_id === targetActivityId &&
                    stuData.actual_location?.[turnId]?.checked_in === true;

                // ─── GESTIONE SWAP ATOMICO ───
                const oldActivityId: string | undefined = scheduledTurns[turnId];
                if (oldActivityId && oldActivityId !== targetActivityId) {
                    const oldActRef = db.doc(`rooms/${oldActivityId}`);
                    const oldActSnap = await tx.get(oldActRef);
                    if (oldActSnap.exists) {
                        const oldActData = oldActSnap.data()!;
                        
                        // SECURITY HARDENING: Verify old activity also belongs to this assembly
                        if (oldActData.assemblyId !== assemblyId) {
                            throw new HttpsError("failed-precondition", "L'attività precedente non appartiene a questa assemblea.");
                        }

                        const oldCount: number = oldActData.counts_by_turn?.[turnId] ?? 0;
                        tx.update(oldActRef, {
                            [`counts_by_turn.${turnId}`]: Math.max(0, oldCount - 1)
                        });
                    }
                }
            } else {
                // Creazione record studente se non esiste
                tx.set(studentRef, {
                    id: studentId,
                    email: email,
                    assemblyId: assemblyId,
                    scheduled_turns: {},
                    actual_location: {},
                    last_booking_at: now
                }, { merge: true });
            }

            // ─── 4d. VERIFICA CAPIENZA CON RECONCILIATION ───
            const countModifier = isPhysicallyHere ? 0 : 1;
            if (countModifier > 0 && currentCount >= maxCapacity) {
                throw new HttpsError(
                    "resource-exhausted",
                    "Spiacenti, l'aula si è riempita in questo istante."
                );
            }

            // ─── 4e. SCRITTURE ATOMICHE ───
            if (countModifier > 0) {
                tx.update(activityRef, {
                    [`counts_by_turn.${turnId}`]: currentCount + countModifier
                });
            }

            tx.update(studentRef, {
                [`scheduled_turns.${turnId}`]: targetActivityId,
                last_booking_at: now
            });

            return { isPhysicallyHere };
        });

        const message = result.isPhysicallyHere
            ? "Prenotazione confermata (eri già presente fisicamente — contatore invariato)."
            : "Prenotazione confermata in sicurezza.";

        return { success: true, message };

    } catch (error: unknown) {
        if (error instanceof HttpsError) {
            throw error;
        }
        // H-04 FIX: Non esporre dettagli interni di Firestore al client
        console.error("Transazione fallita per eccezione sconosciuta:", error);
        throw new HttpsError("internal", "Si è verificato un errore durante la prenotazione. Riprova.");
    }
});

// ─── SECURITY FIX H4: Wipe Database sicuro lato server ───
const WipeDatabaseSchema = z.object({
    pin: z.string().min(1).max(50),
});

export const wipeDatabase = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);
    // 1. VERIFICA AUTENTICAZIONE
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }
    const email = auth.token.email?.toLowerCase();
    if (!email) {
        throw new HttpsError("permission-denied", "Email mancante.");
    }

    // 2. VALIDAZIONE INPUT
    const parseResult = WipeDatabaseSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "PIN non valido.");
    }
    const { pin } = parseResult.data;

    // 3. VERIFICA RUOLO SVILUPPATORE
    const userRef = db.doc(`users/${auth.uid}`);
    const userSnap = await userRef.get();
    const isUserDev = userSnap.exists && userSnap.data()?.role === 'SVILUPPATORE';

    if (!isUserDev) {
        throw new HttpsError("permission-denied", "Operazione consentita solo allo sviluppatore di sistema.");
    }

    // 4. VERIFICA PIN DI SICUREZZA LATO SERVER (M-03 FIX: Timing-safe comparison)
    const configSecRef = db.doc("config_secrets/main");
    const configSecSnap = await configSecRef.get();
    if (!configSecSnap.exists) {
        throw new HttpsError("failed-precondition", "PIN di sicurezza non configurato nel database.");
    }
    const storedPin = configSecSnap.data()?.security_pin;
    
    if (!storedPin || typeof storedPin !== 'string') {
        throw new HttpsError("permission-denied", "PIN di sicurezza non valido o non configurato.");
    }
    
    // Hash SHA-256 di entrambi i PIN prima del confronto.
    // Questo normalizza la lunghezza dei buffer, eliminando il timing oracle
    // sulla lunghezza che si creerebbe confrontando le lunghezze prima di timingSafeEqual.
    const storedPinHash = crypto.createHash('sha256').update(storedPin).digest();
    const providedPinHash = crypto.createHash('sha256').update(pin).digest();
    
    if (!crypto.timingSafeEqual(storedPinHash, providedPinHash)) {
        throw new HttpsError("permission-denied", "PIN di sicurezza errato.");
    }

    // M-04 FIX: Scrittura in audit_log PRIMA di eseguire operazioni distruttive
    await db.collection('audit_log').add({
        action: 'WIPE_DATABASE',
        actor: email,
        timestamp: FieldValue.serverTimestamp(),
        ip: request.rawRequest?.ip || 'unknown',
        details: "Reset completo del database"
    });

    // 5. ESECUZIONE RESET TOTALE IN BATCH
    // H-05 FIX: Esclusi 'config_secrets' e 'admins' dal wipe per prevenire:
    // - Perdita del PIN di sicurezza (impossibilità di fare wipe futuri)
    // - Auto-promozione primo utente (ora che C-02 è fixata, serve almeno un admin)
    const collections = [
        'users', 'usernames', 'assemblies', 'rooms', 
        'students', 'friendRequests', 'event_logs', 'event_log', 
        'notifications', 'assembly_roles', 'badges', 'activity_ranking',
        'activity_comparison', 'activity_roles', 'activity_sessions'
    ];

    try {
        for (const colName of collections) {
            const colRef = db.collection(colName);
            while (true) {
                const snapshot = await colRef.limit(500).get();
                if (snapshot.empty) {
                    break;
                }
                const batch = db.batch();
                for (const doc of snapshot.docs) {
                    batch.delete(doc.ref);
                }
                await batch.commit();
            }
        }

        // Reset configurazione pubblica
        await db.doc("config/main").delete();

        return { success: true, message: "Database resettato completamente con successo." };
    } catch (error: unknown) {
        // H-04 FIX: Non esporre dettagli interni al client
        console.error("Wipe fallito:", error);
        throw new HttpsError("internal", "Si è verificato un errore durante il reset del database.");
    }
});

// ─── SECURITY FIX M8: Integrity Engine lato server ───
// H-08 FIX: Schema Zod specifici per ogni command (no z.any())
const SyncRoomCountsArgs = z.object({ force: z.boolean().optional().default(false) });
const PurgeGhostUsersArgs = z.object({ assemblyId: z.string().min(1).max(200) });
const ForceResetTurnArgs = z.object({ 
    turnId: z.string().min(1).max(50),
    assemblyId: z.string().min(1).max(200) // H-06 FIX: assembly scope obbligatorio
});
const EmergencyEjectArgs = z.object({ 
    roomId: z.string().min(1).max(200),
    assemblyId: z.string().min(1).max(200) // H-06 FIX: assembly scope obbligatorio
});

const IntegrityCommandSchema = z.object({
    command: z.enum(['syncRoomCounts', 'purgeGhostUsers', 'forceResetTurn', 'emergencyEject', 'recalculateGamificationStats']),
    args: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional()
});

export const runIntegrityCommand = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);
    // 1. VERIFICA AUTENTICAZIONE
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }
    const email = auth.token.email?.toLowerCase();
    if (!email) {
        throw new HttpsError("permission-denied", "Email mancante.");
    }

    // 2. VERIFICA RUOLO SVILUPPATORE
    const userRef = db.doc(`users/${auth.uid}`);
    const userSnap = await userRef.get();
    const isUserDev = userSnap.exists && userSnap.data()?.role === 'SVILUPPATORE';

    if (!isUserDev) {
        throw new HttpsError("permission-denied", "Solo lo sviluppatore può eseguire comandi di integrità.");
    }

    // 3. VALIDAZIONE INPUT
    const parseResult = IntegrityCommandSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "Parametri comando non validi.");
    }
    const { command, args = {} } = parseResult.data;

    // M-04 FIX: Scrittura in audit_log PRIMA di eseguire comandi di integrità
    const auditAssemblyId = (args && typeof args.assemblyId === 'string') ? args.assemblyId : null;
    await db.collection('audit_log').add({
        action: `INTEGRITY_COMMAND_${command}`,
        actor: email,
        timestamp: FieldValue.serverTimestamp(),
        ip: request.rawRequest?.ip || 'unknown',
        details: args,
        assemblyId: auditAssemblyId
    });

    try {
        if (command === 'syncRoomCounts') {
            // H-08 FIX: Validazione specifica degli argomenti
            const parsed = SyncRoomCountsArgs.safeParse(args);
            const force = parsed.success ? parsed.data.force : false;

            const assembliesSnap = await db.collection("assemblies").get();
            const activeAssemblies = assembliesSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((a: any) => a.status === 'ATTIVA' || force);

            let updatedTotal = 0;
            for (const assembly of activeAssemblies) {
                const activitiesSnap = await db.collection("rooms").where("assemblyId", "==", assembly.id).get();
                const activities = activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                const studentsSnap = await db.collection("students").where("assemblyId", "==", assembly.id).get();
                const students = studentsSnap.docs.map(d => d.data());

                let batch = db.batch();
                let correctionsCount = 0;
                let batchOperations = 0;

                for (const activity of activities as any[]) {
                    const actualCounts: Record<string, number> = {};
                    (activity.turn_ids || []).forEach((t: string) => actualCounts[t] = 0);

                    students.forEach((student: any) => {
                        Object.entries(student.scheduled_turns || {}).forEach(([turnId, activityId]) => {
                            if (activityId === activity.id) {
                                actualCounts[turnId] = (actualCounts[turnId] || 0) + 1;
                            }
                        });
                    });

                    const currentCounts = activity.counts_by_turn || {};
                    const needsUpdate = Object.keys(actualCounts).some(
                        t => actualCounts[t] !== currentCounts[t]
                    );

                    if (needsUpdate || force) {
                        batch.update(db.doc(`rooms/${activity.id}`), {
                            counts_by_turn: actualCounts
                        });
                        correctionsCount++;
                        batchOperations++;

                        if (batchOperations >= 400) {
                            await batch.commit();
                            batch = db.batch();
                            batchOperations = 0;
                        }
                    }
                }

                if (batchOperations > 0) {
                    await batch.commit();
                }
                updatedTotal += correctionsCount;
            }
            return { success: true, message: `Sincronizzazione completata. ${updatedTotal} attività aggiornate.` };
        }

        if (command === 'purgeGhostUsers') {
            const parsed = PurgeGhostUsersArgs.safeParse(args);
            if (!parsed.success) throw new HttpsError("invalid-argument", "assemblyId mancante o non valido.");
            const { assemblyId } = parsed.data;

            const snap = await db.collection("students").where("assemblyId", "==", assemblyId).get();
            let batch = db.batch();
            let purgedCount = 0;
            let batchOperations = 0;

            for (const docSnap of snap.docs) {
                const data = docSnap.data() as any;
                const hasNoBookings = !data.scheduled_turns || Object.keys(data.scheduled_turns).length === 0;
                const hasNoCheckIn = !data.actual_location || Object.keys(data.actual_location).length === 0;

                if (hasNoBookings && hasNoCheckIn) {
                    batch.delete(docSnap.ref);
                    purgedCount++;
                    batchOperations++;

                    if (batchOperations >= 400) {
                        await batch.commit();
                        batch = db.batch();
                        batchOperations = 0;
                    }
                }
            }

            if (batchOperations > 0) {
                await batch.commit();
            }
            return { success: true, message: `Rimozione completata. Rimosso/i ${purgedCount} utente/i fantasma.` };
        }

        if (command === 'forceResetTurn') {
            // H-06/H-08 FIX: Validazione specifica e assembly scope obbligatorio
            const parsed = ForceResetTurnArgs.safeParse(args);
            if (!parsed.success) throw new HttpsError("invalid-argument", "turnId e assemblyId sono obbligatori.");
            const { turnId, assemblyId } = parsed.data;

            // H-06 FIX: Filtra solo le stanze dell'assemblea specificata
            const activitiesSnap = await db.collection("rooms").where("assemblyId", "==", assemblyId).get();
            let batch = db.batch();
            let count = 0;
            
            for (const docSnap of activitiesSnap.docs) {
                const data = docSnap.data() as any;
                if (data.counts_by_turn && data.counts_by_turn[turnId]) {
                    batch.update(docSnap.ref, {
                        [`counts_by_turn.${turnId}`]: 0
                    });
                    count++;
                    if (count >= 500) {
                        await batch.commit();
                        batch = db.batch();
                        count = 0;
                    }
                }
            }
            if (count > 0) await batch.commit();

            // H-06 FIX: Filtra solo gli studenti dell'assemblea specificata
            const studentsSnap = await db.collection("students").where("assemblyId", "==", assemblyId).get();
            batch = db.batch();
            count = 0;
            for (const docSnap of studentsSnap.docs) {
                const data = docSnap.data() as any;
                if (data.actual_location && data.actual_location[turnId]) {
                    batch.update(docSnap.ref, {
                        [`actual_location.${turnId}`]: null
                    });
                    count++;
                    if (count >= 500) {
                        await batch.commit();
                        batch = db.batch();
                        count = 0;
                    }
                }
            }
            if (count > 0) await batch.commit();

            return { success: true, message: `Reset turno ${turnId} per assemblea ${assemblyId} completato.` };
        }

        if (command === 'emergencyEject') {
            // H-06/H-08 FIX: Validazione specifica e assembly scope obbligatorio
            const parsed = EmergencyEjectArgs.safeParse(args);
            if (!parsed.success) throw new HttpsError("invalid-argument", "roomId e assemblyId sono obbligatori.");
            const { roomId, assemblyId } = parsed.data;

            // H-06 FIX: Filtra solo gli studenti dell'assemblea specificata
            const studentsSnap = await db.collection("students").where("assemblyId", "==", assemblyId).get();
            let batch = db.batch();
            let evictedCount = 0;
            let count = 0;

            for (const docSnap of studentsSnap.docs) {
                const data = docSnap.data() as any;
                let updated = false;
                if (data.actual_location) {
                    const newLoc = { ...data.actual_location };
                    Object.entries(newLoc).forEach(([turnId, loc]: [string, any]) => {
                        if (loc?.activity_id === roomId) {
                            newLoc[turnId] = null;
                            updated = true;
                            evictedCount++;
                        }
                    });
                    if (updated) {
                        batch.update(docSnap.ref, { actual_location: newLoc });
                        count++;
                        if (count >= 500) {
                            await batch.commit();
                            batch = db.batch();
                            count = 0;
                        }
                    }
                }
            }
            if (count > 0) await batch.commit();
            return { success: true, message: `Eject completato. Rimosso/i ${evictedCount} studente/i dall'aula ${roomId}.` };
        }

        if (command === 'recalculateGamificationStats') {
            const usersSnap = await db.collection("users").get();
            const badgesSnap = await db.collection("badges").get();
            const badgeTemplates: Record<string, any> = {};
            badgesSnap.forEach(docSnap => {
                badgeTemplates[docSnap.id] = docSnap.data();
            });

            // Pre-fetch archived assemblies once
            const assembliesSnap = await db.collection("assemblies").where("status", "==", "ARCHIVIATA").get();
            const archivedAssemblies = new Set(assembliesSnap.docs.map(doc => doc.id));

            // Pre-fetch all assembly roles and group by email in-memory
            const rolesSnap = await db.collection("assembly_roles").get();
            const rolesByEmail = new Map<string, any[]>();
            rolesSnap.docs.forEach(docSnap => {
                const rData = docSnap.data();
                const rEmail = rData.email?.toLowerCase().trim();
                if (rEmail) {
                    if (!rolesByEmail.has(rEmail)) {
                        rolesByEmail.set(rEmail, []);
                    }
                    rolesByEmail.get(rEmail)!.push(rData);
                }
            });

            const RARITY_XP: Record<string, number> = {
                'COMMON': 100,
                'UNCOMMON': 200,
                'RARE': 400,
                'EPIC': 800,
                'LEGENDARY': 1500
            };

            let updatedCount = 0;

            for (const userDoc of usersSnap.docs) {
                const userId = userDoc.id;
                const userData = userDoc.data();
                const email = userData.email?.toLowerCase()?.trim();
                if (!email) continue;

                // 1. Recalculate friendCount from friends array
                const friendsList = userData.friends || [];
                const correctFriendCount = friendsList.length;

                // 2. Fetch all student documents for this user across all assemblies
                const studentDocs = await db.collection("students").where("email", "==", email).get();
                const studentDocsByAssembly = new Map<string, any>();
                let actualCheckIns = 0;
                let actualAssemblies = 0;
                let fullAttendanceCount = 0;

                studentDocs.docs.forEach(docSnap => {
                    const sData = docSnap.data();
                    studentDocsByAssembly.set(sData.assemblyId, sData);
                    const actualLocation = sData.actual_location || {};
                    const checkedInTurns = Object.values(actualLocation).filter((loc: any) => loc && loc.checked_in === true && loc.activity_id !== 'STAFF').length;
                    
                    const staffActualLocation = sData.staff_actual_location || {};
                    const staffCheckedInTurns = Object.values(staffActualLocation).filter((loc: any) => loc && loc.checked_in === true).length;

                    actualCheckIns += checkedInTurns;
                    if (checkedInTurns > 0 || staffCheckedInTurns > 0) {
                        actualAssemblies++;
                    }
                    if (checkedInTurns === 3) {
                        fullAttendanceCount++;
                    }
                });

                // 3. Compare stats and recalculate XP retroactively
                // Daily Check-ins = totalCheckIns - turnCheckIns
                const currentTotalCheckIns = userData.totalCheckIns || 0;
                const dailyCheckIns = Math.max(0, currentTotalCheckIns - actualCheckIns);

                // Badge XP reward sum
                let badgeXp = 0;
                const earnedBadges = userData.earnedBadges || [];
                earnedBadges.forEach((eb: any) => {
                    const template = badgeTemplates[eb.badgeId];
                    if (template) {
                        const rarity = template.rarity || 'COMMON';
                        badgeXp += RARITY_XP[rarity] || 50;
                    }
                });

                // Calculate staff assemblies and XP dynamically based on roles
                const userRoles = rolesByEmail.get(email) || [];
                const uniqueAssemblies = new Set<string>();
                const assemblyToRoles: Record<string, string[]> = {};

                userRoles.forEach(r => {
                    if (r.assemblyId && ['SECURITY', 'ROOM_MANAGER'].includes(r.role) && archivedAssemblies.has(r.assemblyId)) {
                        const sData = studentDocsByAssembly.get(r.assemblyId);
                        const isStaffLocPresent = sData?.staff_actual_location && Object.values(sData.staff_actual_location).some((loc: any) => loc && loc.checked_in === true);
                        const isOldStaffLocPresent = sData?.actual_location && Object.values(sData.actual_location).some((loc: any) => loc && loc.checked_in === true && loc.activity_id === 'STAFF');
                        const isPresent = isStaffLocPresent || isOldStaffLocPresent;
                        if (isPresent) {
                            uniqueAssemblies.add(r.assemblyId);
                            if (!assemblyToRoles[r.assemblyId]) {
                                assemblyToRoles[r.assemblyId] = [];
                            }
                            assemblyToRoles[r.assemblyId].push(r.role);
                        }
                    }
                });

                const staffAssembliesCount = uniqueAssemblies.size;
                const staffAssemblies = Array.from(uniqueAssemblies);

                let staffXp = 0;
                staffAssemblies.forEach(asmId => {
                    const roles = assemblyToRoles[asmId] || [];
                    let maxRoleXp = 0;
                    roles.forEach(role => {
                        const xp = role === 'ROOM_MANAGER' ? 1200 : 1000;
                        if (xp > maxRoleXp) maxRoleXp = xp;
                    });
                    staffXp += maxRoleXp;
                });

                // Rebalanced Retroactive XP Formula (Decisive Scheme)
                const newXP = (dailyCheckIns * 3) + (actualCheckIns * 250) + (fullAttendanceCount * 250) + staffXp + badgeXp;
                const newLevel = Math.max(1, Math.floor(Math.sqrt(newXP / 100)));

                const currentXP = userData.xp || 0;
                const currentLevel = userData.level || 1;
                const currentFriendCount = userData.friendCount || 0;
                const currentAssemblies = userData.totalAssemblies || 0;

                const currentStaffAssemblies = userData.staffAssemblies || [];
                const currentStaffCount = userData.staffAssembliesCount || 0;
                const currentStaffXp = userData.staffXp || 0;

                const hasStaffChanges = staffAssembliesCount !== currentStaffCount ||
                                       currentStaffXp !== staffXp ||
                                       JSON.stringify(staffAssemblies.sort()) !== JSON.stringify([...currentStaffAssemblies].sort());

                // We update if level, xp, totalCheckIns, totalAssemblies, friendCount, or staff stats is out of sync
                const hasChanges = newXP !== currentXP || 
                                   newLevel !== currentLevel || 
                                   correctFriendCount !== currentFriendCount || 
                                   (actualCheckIns + dailyCheckIns) !== currentTotalCheckIns || 
                                   actualAssemblies !== currentAssemblies ||
                                   hasStaffChanges;

                let latestUserData = userData;
                if (hasChanges) {
                    const updates = {
                        totalCheckIns: actualCheckIns + dailyCheckIns,
                        totalAssemblies: actualAssemblies,
                        friendCount: correctFriendCount,
                        xp: newXP,
                        level: newLevel,
                        staffAssemblies,
                        staffAssembliesCount,
                        staffXp
                    };

                    await db.doc(`users/${userId}`).update(updates);
                    latestUserData = { ...userData, ...updates };
                    updatedCount++;
                }

                // Force evaluation and award of missing/revoked badges
                await evaluateAndAwardBadges(userId, latestUserData);
            }

            return { success: true, message: `Ricalcolo completato con successo. Aggiornati/Riallineati ${updatedCount} profili utente.` };
        }
        throw new HttpsError("unimplemented", "Comando non implementato.");
    } catch (error: unknown) {
        console.error("Integrity command failed:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Si è verificato un errore durante l'esecuzione del comando.");
    }
});

const AssemblyScopeSchema = z.object({
    assemblyId: z.string().min(1).max(200),
});

const SearchUsersSchema = z.object({
    queryText: z.string().min(1).max(100),
});

export const searchUsers = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);

    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }
    
    // Global Rate Limiting (1s cooldown)
    await checkRateLimit(auth.uid, "search_users", 1000);

    const parseResult = SearchUsersSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "queryText non valido.");
    }
    const { queryText } = parseResult.data;
    const term = queryText.trim();
    const searchLower = term.toLowerCase();

    // Determine if caller is staff or admin
    const callerUid = auth.uid;
    const callerEmail = auth.token.email?.toLowerCase();
    let isStaffOrAdmin = false;

    const callerRoleFromToken = auth.token.role || 'STUDENT';

    if (['ADMIN', 'SVILUPPATORE', 'ROOM_MANAGER', 'SECURITY', 'STAFF'].includes(callerRoleFromToken)) {
        isStaffOrAdmin = true;
    } else {
        const callerSnap = await db.doc(`users/${callerUid}`).get();
        if (callerSnap.exists) {
            const callerData = callerSnap.data();
            const role = callerData?.role || 'STUDENT';
            const hasDelegated = (callerData?.delegatedRooms || []).length > 0;
            if (['ADMIN', 'SVILUPPATORE', 'ROOM_MANAGER', 'SECURITY', 'STAFF'].includes(role) || hasDelegated) {
                isStaffOrAdmin = true;
            }
        }
    }

    if (!isStaffOrAdmin && callerEmail) {
        const rolesSnap = await db.collection('assembly_roles').where('email', '==', callerEmail).limit(1).get();
        if (!rolesSnap.empty) {
            isStaffOrAdmin = true;
        }
    }

    const usersRef = db.collection('users');

    const queries = [
        usersRef.where('email', '>=', searchLower).where('email', '<=', searchLower + '\uf8ff').limit(10).get(),
        usersRef.where('username', '==', searchLower.startsWith('@') ? searchLower : `@${searchLower}`).limit(5).get(),
        usersRef.where('displayName', '>=', term).where('displayName', '<=', term + '\uf8ff').limit(10).get()
    ];

    if (term[0] !== term[0].toUpperCase()) {
        const capitalized = term.charAt(0).toUpperCase() + term.slice(1);
        queries.push(usersRef.where('displayName', '>=', capitalized).where('displayName', '<=', capitalized + '\uf8ff').limit(10).get());
    }

    const snaps = await Promise.all(queries);
    const resultsMap = new Map<string, any>();

    snaps.forEach(snap => {
        snap.forEach(docSnap => {
            const userData = docSnap.data();
            const uid = docSnap.id;
            if (uid !== auth.uid) {
                // Security Fix #7: rimosso il campo 'friends' per non esporre
                // la lista amici di terzi a chiunque esegua una ricerca.
                const mappedUser: any = {
                    uid: uid,
                    displayName: userData.displayName || 'Utente eversia',
                    username: userData.username || '',
                    role: userData.role || 'STUDENT',
                    className: userData.className || '',
                };
                if (isStaffOrAdmin && userData.email) {
                    mappedUser.email = userData.email;
                }
                resultsMap.set(uid, mappedUser);
            }
        });
    });

    return Array.from(resultsMap.values());
});

export const finalizeBooking = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }
    const email = auth.token.email?.toLowerCase();
    if (!email || !ALLOWED_DOMAINS.some(domain => email.endsWith(domain))) {
        throw new HttpsError("permission-denied", "Accesso consentito solo tramite email d'istituto.");
    }
    const parseResult = AssemblyScopeSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "assemblyId non valido.");
    }
    const { assemblyId } = parseResult.data;

    const studentId = `${assemblyId}_${email}`;
    const studentRef = db.doc(`students/${studentId}`);
    const assemblyRef = db.doc(`assemblies/${assemblyId}`);

    try {
        await db.runTransaction(async (tx) => {
            const [assembSnap, stuSnap] = await Promise.all([
                tx.get(assemblyRef),
                tx.get(studentRef)
            ]);

            if (!assembSnap.exists || assembSnap.data()?.status !== "ISCRIZIONI_APERTE") {
                throw new HttpsError("failed-precondition", "Le iscrizioni sono chiuse.");
            }
            if (!stuSnap.exists) {
                throw new HttpsError("not-found", "Profilo studente non trovato.");
            }

            const assemblyData = assembSnap.data()!;
            const studentData = stuSnap.data()!;
            
            const requiredTurns = Object.keys(assemblyData.turn_schedules || {});
            const bookedTurns = studentData.scheduled_turns || {};

            const incomplete = requiredTurns.some(turnId => !bookedTurns[turnId]);
            if (incomplete) {
                throw new HttpsError("failed-precondition", "Devi scegliere un'attività per ogni turno prima di poter confermare la prenotazione.");
            }

            tx.update(studentRef, { is_finalized: true });
        });
        return { success: true, message: "Prenotazione confermata con successo." };
    } catch (error: unknown) {
        if (error instanceof HttpsError) throw error;
        console.error("Finalizzazione fallita:", error);
        throw new HttpsError("internal", "Si è verificato un errore durante la conferma.");
    }
});

export const unlockBooking = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }
    const email = auth.token.email?.toLowerCase();
    if (!email || !ALLOWED_DOMAINS.some(domain => email.endsWith(domain))) {
        throw new HttpsError("permission-denied", "Accesso consentito solo tramite email d'istituto.");
    }
    const parseResult = AssemblyScopeSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "assemblyId non valido.");
    }
    const { assemblyId } = parseResult.data;

    const studentId = `${assemblyId}_${email}`;
    const studentRef = db.doc(`students/${studentId}`);
    const assemblyRef = db.doc(`assemblies/${assemblyId}`);

    try {
        await db.runTransaction(async (tx) => {
            const [assembSnap, stuSnap] = await Promise.all([
                tx.get(assemblyRef),
                tx.get(studentRef)
            ]);

            if (!assembSnap.exists || assembSnap.data()?.status !== "ISCRIZIONI_APERTE") {
                throw new HttpsError("failed-precondition", "Le iscrizioni sono chiuse.");
            }
            if (!stuSnap.exists) {
                throw new HttpsError("not-found", "Profilo studente non trovato.");
            }

            tx.update(studentRef, { is_finalized: false });
        });
        return { success: true, message: "Modifiche abilitate con successo." };
    } catch (error: unknown) {
        if (error instanceof HttpsError) throw error;
        console.error("Sblocco fallito:", error);
        throw new HttpsError("internal", "Si è verificato un errore durante lo sblocco.");
    }
});

export const resetBooking = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }
    const email = auth.token.email?.toLowerCase();
    if (!email || !ALLOWED_DOMAINS.some(domain => email.endsWith(domain))) {
        throw new HttpsError("permission-denied", "Accesso consentito solo tramite email d'istituto.");
    }
    const parseResult = AssemblyScopeSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "assemblyId non valido.");
    }
    const { assemblyId } = parseResult.data;

    const studentId = `${assemblyId}_${email}`;
    const studentRef = db.doc(`students/${studentId}`);
    const assemblyRef = db.doc(`assemblies/${assemblyId}`);

    try {
        await db.runTransaction(async (tx) => {
            const [assembSnap, stuSnap] = await Promise.all([
                tx.get(assemblyRef),
                tx.get(studentRef)
            ]);

            if (!assembSnap.exists || assembSnap.data()?.status !== "ISCRIZIONI_APERTE") {
                throw new HttpsError("failed-precondition", "Le iscrizioni sono chiuse.");
            }
            if (!stuSnap.exists) return;

            const stuData = stuSnap.data()!;
            if (stuData.is_finalized) {
                throw new HttpsError("failed-precondition", "La tua prenotazione è finalizzata. Sbloccala prima.");
            }

            const scheduledTurns = stuData.scheduled_turns ?? {};
            const toRelease = Object.entries(scheduledTurns).filter(([_, actId]) => !!actId) as [string, string][];

            const uniqueActIds = Array.from(new Set(toRelease.map(([_, actId]) => actId)));
            const actRefs = uniqueActIds.map(actId => db.doc(`rooms/${actId}`));
            const actSnaps = await Promise.all(actRefs.map(ref => tx.get(ref)));

            const actSnapMap = new Map<string, admin.firestore.DocumentSnapshot>();
            for (let i = 0; i < uniqueActIds.length; i++) {
                actSnapMap.set(uniqueActIds[i], actSnaps[i]);
            }

            const roomUpdates = new Map<string, Record<string, number>>();

            for (const [turnId, actId] of toRelease) {
                const actSnap = actSnapMap.get(actId);
                if (actSnap && actSnap.exists) {
                    const oldCount = actSnap.data()?.counts_by_turn?.[turnId] ?? 0;
                    if (!roomUpdates.has(actId)) {
                        roomUpdates.set(actId, {});
                    }
                    const updates = roomUpdates.get(actId)!;
                    updates[`counts_by_turn.${turnId}`] = Math.max(0, oldCount - 1);
                }
            }

            for (const [actId, updates] of roomUpdates.entries()) {
                const actRef = db.doc(`rooms/${actId}`);
                tx.update(actRef, updates);
            }

            tx.update(studentRef, {
                scheduled_turns: {},
                is_finalized: false,
                last_booking_at: Date.now()
            });
        });
        return { success: true, message: "Agenda resettata con successo." };
    } catch (error: unknown) {
        if (error instanceof HttpsError) throw error;
        console.error("Reset fallito:", error);
        throw new HttpsError("internal", "Si è verificato un errore durante il reset dell'agenda.");
    }
});

const RecordRoomInspectionSchema = z.object({
    assemblyId: z.string().min(1),
    turnId: z.string().min(1),
    roomId: z.string().min(1),
    roomName: z.string().min(1),
    status: z.enum(['OK', 'ISSUES']),
    notes: z.string().max(300).optional(),
});

export const recordRoomInspection = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }

    const parseResult = RecordRoomInspectionSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "Dati ispezione non validi.");
    }

    const { assemblyId, turnId, roomId, roomName, status, notes = '' } = parseResult.data;
    const callerUid = auth.uid;

    // Rate limiting: 2s cooldown for recordRoomInspection
    await checkRateLimit(callerUid, "record_inspection", 2000);

    // Verify assembly exists and is currently active ('ATTIVA')
    const assemblySnap = await db.doc(`assemblies/${assemblyId}`).get();
    if (!assemblySnap.exists) {
        throw new HttpsError("not-found", "Assemblea non trovata.");
    }
    if (assemblySnap.data()?.status !== 'ATTIVA') {
        throw new HttpsError("failed-precondition", "L'ispezione può essere registrata solo durante un'assemblea attiva (Live Event).");
    }

    // Verify caller role (must be Admin/Dev, or specifically assigned as staff for this assembly)
    const callerEmail = auth.token.email?.toLowerCase();
    let isAuthorized = false;
    const callerRoleFromToken = auth.token.role || 'STUDENT';

    if (['ADMIN', 'SVILUPPATORE'].includes(callerRoleFromToken)) {
        isAuthorized = true;
    } else {
        const callerSnap = await db.doc(`users/${callerUid}`).get();
        if (callerSnap.exists) {
            const role = callerSnap.data()?.role || 'STUDENT';
            if (['ADMIN', 'SVILUPPATORE'].includes(role)) {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized && callerEmail) {
        const roleId = `${assemblyId}_${callerEmail.replace(/[.@]/g, '_')}`;
        const roleSnap = await db.doc(`assembly_roles/${roleId}`).get();
        if (roleSnap.exists) {
            const rData = roleSnap.data();
            if (rData && ['SECURITY', 'ROOM_MANAGER'].includes(rData.role)) {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        throw new HttpsError("permission-denied", "Non hai i permessi per registrare ispezioni per questa assemblea.");
    }

    const inspectionKey = `${assemblyId}_${turnId}_${roomId}_${callerUid}`;
    const inspectionRef = db.doc(`inspections/${inspectionKey}`);
    const userRef = db.doc(`users/${callerUid}`);

    let xpEarned = 0;
    try {
        await db.runTransaction(async (tx) => {
            const insSnap = await tx.get(inspectionRef);
            const userSnap = await tx.get(userRef);

            if (!userSnap.exists) {
                throw new HttpsError("not-found", "Profilo utente non trovato.");
            }

            const userData = userSnap.data()!;
            const firstTime = !insSnap.exists;

            const inspectedByName = userData.displayName || callerEmail?.split('@')[0] || 'Security Monitor';

            // Write inspection log doc
            tx.set(inspectionRef, {
                assemblyId,
                turnId,
                roomId,
                roomName,
                inspectedByUid: callerUid,
                inspectedByEmail: callerEmail || '',
                inspectedByName,
                inspectedAt: Date.now(),
                status,
                notes
            });

            if (firstTime) {
                xpEarned = 20;
                tx.update(userRef, {
                    securityInspections: FieldValue.increment(1),
                    xp: FieldValue.increment(xpEarned)
                });
            }
        });

        // Add event to event log
        await db.collection("event_log").add({
            assemblyId,
            type: "SECURITY_INSPECTION",
            details: `Ispezione: ${roomName} (Turno ${turnId}) - Stato: ${status === 'OK' ? 'Regolare' : 'Anomalie'}${notes ? ' - Note: ' + notes : ''}`,
            timestamp: Date.now(),
            userId: callerUid
        });

        return { success: true, xpEarned };
    } catch (e) {
        console.error("Errore durante la registrazione dell'ispezione:", e);
        if (e instanceof HttpsError) throw e;
        throw new HttpsError("internal", "Impossibile salvare l'ispezione.");
    }
});

// ─── NEW BACKEND FEATURES (Social & Gamification) ───
export * from "./social";
export * from "./gamification";
export * from "./admin";

