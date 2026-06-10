import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { checkRateLimit } from "./rateLimiter";
import { resolveAuth } from "./authHelper";

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const enforceAppCheck = !isEmulator;


const db = admin.firestore();

// Input Validation Schemas
const SendRequestSchema = z.object({
    toUid: z.string().min(1).max(200)
});

const AcceptRequestSchema = z.object({
    requestId: z.string().min(1).max(200),
    fromUid: z.string().min(1).max(200)
});

const RemoveFriendSchema = z.object({
    friendUid: z.string().min(1).max(200)
});

export const sendFriendRequest = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);

    // 1. Authentication Check
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }

    // 2. Input Validation
    const parseResult = SendRequestSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "Parametri non validi.");
    }
    const { toUid } = parseResult.data;
    const fromUid = auth.uid;

    if (fromUid === toUid) {
        throw new HttpsError("invalid-argument", "Non puoi inviare una richiesta a te stesso.");
    }

    // 3. Global Rate Limiting (5s cooldown)
    await checkRateLimit(fromUid, "send_friend_request", 5000);

    // 3.1 Daily Rate Limiting (max 15 requests in the last 24 hours)
    const twentyFourHoursAgo = Date.now() - 86400000;
    const recentRequestsSnap = await db.collection('friendRequests')
        .where('from', '==', fromUid)
        .where('createdAt', '>', twentyFourHoursAgo)
        .count()
        .get();

    if (recentRequestsSnap.data().count >= 15) {
        throw new HttpsError("resource-exhausted", "Hai raggiunto il limite di 15 richieste d'amicizia inviate nelle ultime 24 ore.");
    }

    const requestId = `${fromUid}_${toUid}`;
    const reqDocRef = db.doc(`friendRequests/${requestId}`);
    const reverseReqDocRef = db.doc(`friendRequests/${toUid}_${fromUid}`);

    try {
        await db.runTransaction(async (tx) => {
            const [reqSnap, revReqSnap, fromUserSnap, toUserSnap] = await Promise.all([
                tx.get(reqDocRef),
                tx.get(reverseReqDocRef),
                tx.get(db.doc(`users/${fromUid}`)),
                tx.get(db.doc(`users/${toUid}`))
            ]);

            if (!fromUserSnap.exists || !toUserSnap.exists) {
                throw new HttpsError("not-found", "Utente non trovato.");
            }

            const fromFriends = fromUserSnap.data()?.friends || [];
            if (fromFriends.includes(toUid)) {
                throw new HttpsError("already-exists", "Siete già amici.");
            }

            if (reqSnap.exists) {
                throw new HttpsError("already-exists", "Richiesta d'amicizia già inviata.");
            }

            if (revReqSnap.exists && revReqSnap.data()?.status === "PENDING") {
                throw new HttpsError("failed-precondition", "Hai già una richiesta di amicizia in sospeso da questo utente. Accettala invece.");
            }

            const fromData = fromUserSnap.data() || {};
            const toData = toUserSnap.data() || {};

            const fromUserData = {
                displayName: fromData.displayName || "Utente eversia",
                username: fromData.username || "",
                photoURL: fromData.photoURL || null
            };

            const toUserData = {
                displayName: toData.displayName || "Utente eversia",
                username: toData.username || "",
                photoURL: toData.photoURL || null
            };

            tx.set(reqDocRef, {
                from: fromUid,
                to: toUid,
                status: 'PENDING',
                createdAt: Date.now(),
                fromUserData,
                toUserData
            });
        });

        return { success: true, message: "Richiesta d'amicizia inviata." };
    } catch (error: unknown) {
        console.error("Errore sendFriendRequest:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Si è verificato un errore durante l'invio della richiesta.");
    }
});

export const acceptFriendRequest = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);

    // 1. Authentication Check
    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }

    // 2. Input Validation
    const parseResult = AcceptRequestSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "Parametri non validi.");
    }
    const { requestId, fromUid } = parseResult.data;

    const myUid = auth.uid;

    // 3. Global Rate Limiting (2s cooldown)
    await checkRateLimit(myUid, "accept_friend_request", 2000);

    const reqDocRef = db.doc(`friendRequests/${requestId}`);
    const meDocRef = db.doc(`users/${myUid}`);
    const themDocRef = db.doc(`users/${fromUid}`);

    try {
        await db.runTransaction(async (tx) => {
            const reqSnap = await tx.get(reqDocRef);

            if (!reqSnap.exists) {
                throw new HttpsError("not-found", "Richiesta non trovata.");
            }

            const reqData = reqSnap.data()!;
            if (reqData.to !== myUid) {
                throw new HttpsError("permission-denied", "Non sei il destinatario di questa richiesta.");
            }
            if (reqData.status === 'ACCEPTED') {
                throw new HttpsError("failed-precondition", "Richiesta già accettata.");
            }

            // Write operations
            tx.update(reqDocRef, { status: 'ACCEPTED', updatedAt: Date.now() });
            
            tx.update(meDocRef, {
                friends: FieldValue.arrayUnion(fromUid),
                friendCount: FieldValue.increment(1)
            });

            tx.update(themDocRef, {
                friends: FieldValue.arrayUnion(myUid),
                friendCount: FieldValue.increment(1)
            });
        });

        // Cleanup request after successful transaction (optional, but Eversia does this)
        await reqDocRef.delete();

        return { success: true, message: "Amicizia accettata." };
    } catch (error: unknown) {
        console.error("Errore acceptFriendRequest:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Si è verificato un errore durante l'accettazione dell'amicizia.");
    }
});

export const removeFriend = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const { data } = request;
    const auth = await resolveAuth(request);

    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }

    const parseResult = RemoveFriendSchema.safeParse(data);
    if (!parseResult.success) {
        throw new HttpsError("invalid-argument", "Parametri non validi.");
    }
    const { friendUid } = parseResult.data;

    const myUid = auth.uid;

    // Global Rate Limiting (2s cooldown)
    await checkRateLimit(myUid, "remove_friend", 2000);

    const meDocRef = db.doc(`users/${myUid}`);
    const themDocRef = db.doc(`users/${friendUid}`);

    try {
        await db.runTransaction(async (tx) => {
            const [meSnap, themSnap] = await Promise.all([
                tx.get(meDocRef),
                tx.get(themDocRef)
            ]);

            if (!meSnap.exists || !themSnap.exists) {
                throw new HttpsError("not-found", "Utente non trovato.");
            }

            const myFriends = meSnap.data()?.friends || [];
            if (!myFriends.includes(friendUid)) {
                throw new HttpsError("failed-precondition", "Non siete amici.");
            }

            // Write operations
            tx.update(meDocRef, {
                friends: FieldValue.arrayRemove(friendUid),
                friendCount: FieldValue.increment(-1)
            });

            tx.update(themDocRef, {
                friends: FieldValue.arrayRemove(myUid),
                friendCount: FieldValue.increment(-1)
            });
        });

        return { success: true, message: "Amicizia rimossa." };
    } catch (error: unknown) {
        console.error("Errore removeFriend:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Si è verificato un errore durante la rimozione dell'amicizia.");
    }
});

export const getFriendSuggestions = onCall({ region: 'europe-west1', enforceAppCheck }, async (request) => {
    const auth = await resolveAuth(request);

    if (!auth) {
        throw new HttpsError("unauthenticated", "Devi effettuare l'accesso.");
    }

    const myUid = auth.uid;

    // Rate limiting: 1s cooldown
    await checkRateLimit(myUid, "get_friend_suggestions", 1000);

    try {
        const myUserDoc = await db.doc(`users/${myUid}`).get();
        if (!myUserDoc.exists) {
            throw new HttpsError("not-found", "Profilo utente non trovato.");
        }
        const myData = myUserDoc.data() || {};
        const myFriends = myData.friends || [];
        const myClass = myData.className || "";

        // 1. Fetch pending requests (both sent and received) to exclude them
        const [sentSnap, receivedSnap] = await Promise.all([
            db.collection('friendRequests').where('from', '==', myUid).where('status', '==', 'PENDING').get(),
            db.collection('friendRequests').where('to', '==', myUid).where('status', '==', 'PENDING').get()
        ]);

        const excludedUids = new Set<string>([myUid, ...myFriends]);
        sentSnap.forEach(d => excludedUids.add(d.data().to));
        receivedSnap.forEach(d => excludedUids.add(d.data().from));

        const candidatesMap = new Map<string, any>();

        // 2. Fetch classmates
        if (myClass) {
            const snapClass = await db.collection('users')
                .where('className', '==', myClass)
                .limit(30)
                .get();
            snapClass.forEach(d => {
                if (!excludedUids.has(d.id)) {
                    candidatesMap.set(d.id, { ...d.data(), uid: d.id });
                }
            });

            // 3. Fetch students of the same year (e.g. "3BSA" -> year is "3")
            const yearMatch = myClass.match(/^(\d+)/);
            if (yearMatch) {
                const yearPrefix = yearMatch[1];
                const snapYear = await db.collection('users')
                    .where('className', '>=', yearPrefix)
                    .where('className', '<=', yearPrefix + '\uf8ff')
                    .limit(30)
                    .get();
                snapYear.forEach(d => {
                    if (!excludedUids.has(d.id)) {
                        candidatesMap.set(d.id, { ...d.data(), uid: d.id });
                    }
                });
            }
        }

        // 4. Fetch friends of friends (Mutual Friends Algorithm)
        if (myFriends.length > 0) {
            const friendRefs = myFriends.slice(0, 30).map((fUid: string) => db.doc(`users/${fUid}`));
            const friendsSnap = await db.getAll(...friendRefs);
            
            const friendsOfFriendsUids = new Set<string>();
            friendsSnap.forEach(d => {
                if (d.exists) {
                    const fData = d.data() || {};
                    const fFriends = fData.friends || [];
                    fFriends.forEach((fofUid: string) => {
                        if (!excludedUids.has(fofUid)) {
                            friendsOfFriendsUids.add(fofUid);
                        }
                    });
                }
            });

            if (friendsOfFriendsUids.size > 0) {
                const fofUidsArray = Array.from(friendsOfFriendsUids).slice(0, 30);
                const fofRefs = fofUidsArray.map((fofUid: string) => db.doc(`users/${fofUid}`));
                const fofSnap = await db.getAll(...fofRefs);
                fofSnap.forEach(d => {
                    if (d.exists) {
                        candidatesMap.set(d.id, { ...d.data(), uid: d.id });
                    }
                });
            }
        }

        // 5. Fallback: Fetch top XP users
        if (candidatesMap.size < 15) {
            const snapTop = await db.collection('users')
                .orderBy('xp', 'desc')
                .limit(30)
                .get();
            snapTop.forEach(d => {
                if (!excludedUids.has(d.id)) {
                    candidatesMap.set(d.id, { ...d.data(), uid: d.id });
                }
            });
        }

        // 6. Score and Sort Candidates
        const myFriendsSet = new Set(myFriends);
        const scoredCandidates = Array.from(candidatesMap.values()).map(u => {
            const userFriends = u.friends || [];
            const mutuals = userFriends.filter((f: string) => myFriendsSet.has(f)).length;
            
            let score = mutuals * 5;
            
            if (myClass && u.className === myClass) {
                score += 30;
            } else if (myClass && u.className) {
                const yearMatchMe = myClass.match(/^(\d+)/);
                const yearMatchThem = u.className.match(/^(\d+)/);
                if (yearMatchMe && yearMatchThem && yearMatchMe[1] === yearMatchThem[1]) {
                    score += 10;
                }
            }

            score += Math.log10(Math.max(1, u.xp || 0));

            return {
                uid: u.uid,
                displayName: u.displayName || 'Utente eversia',
                username: u.username || '',
                role: u.role || 'STUDENT',
                className: u.className || '',
                xp: u.xp || 0,
                mutualFriends: mutuals,
                score
            };
        });

        scoredCandidates.sort((a, b) => b.score - a.score);

        return scoredCandidates.slice(0, 15);
    } catch (error) {
        console.error("Errore getFriendSuggestions:", error);
        throw new HttpsError("internal", "Si è verificato un errore durante il recupero dei consigli di amicizia.");
    }
});

