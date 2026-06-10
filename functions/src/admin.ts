import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";
import { HttpsError } from "firebase-functions/v2/https";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";


const db = admin.firestore();

/**
 * Firestore trigger on document changes in `admins/{email}`.
 * Automatically synchronizes Firebase Auth Custom Claims and updates the user's role field in Firestore.
 */
export const onAdminConfigWritten = onDocumentWritten({
    document: "admins/{email}",
    region: "europe-west1"
}, async (event) => {
    const email = event.params.email.toLowerCase();
    const after = event.data?.after;
    
    // Default to STUDENT if document was deleted or doesn't specify a role
    const role = after?.exists ? (after.data()?.role || "ADMIN") : "STUDENT";

    try {
        const authUser = await admin.auth().getUserByEmail(email);
        const uid = authUser.uid;

        // Update Firebase Auth JWT Custom Claims
        await admin.auth().setCustomUserClaims(uid, { role });

        // Update corresponding users document in Firestore
        const userRef = db.doc(`users/${uid}`);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
            await userRef.update({ role });
        }
        
        console.log(`[Admin Trigger] Synchronized role '${role}' for email '${email}' (UID: ${uid})`);
    } catch (error: any) {
        if (error.code === "auth/user-not-found") {
            console.log(`[Admin Trigger] Email '${email}' not yet registered in Auth. Claims will be assigned on signup.`);
        } else {
            console.error(`[Admin Trigger] Error syncing claims for '${email}':`, error);
        }
    }
});

/**
 * Authentication background trigger on new user signups (v1 post-creation lifecycle event).
 * Checks if the user is listed in the `admins` collection and assigns the appropriate claims immediately.
 */
export const onNewUserCreated = functionsV1.region("europe-west1").auth.user().onCreate(async (user) => {
    if (!user || !user.email) return;

    const emailLower = user.email.toLowerCase();
    const uid = user.uid;

    try {
        const adminRef = db.doc(`admins/${emailLower}`);
        const adminSnap = await adminRef.get();

        let role = "STUDENT";
        if (adminSnap.exists) {
            role = adminSnap.data()?.role || "ADMIN";
        }

        // Set JWT Custom Claims
        await admin.auth().setCustomUserClaims(uid, { role });

        // Sync Firestore profile document role
        const userRef = db.doc(`users/${uid}`);
        await userRef.set({ role }, { merge: true });

        console.log(`[Identity Trigger] Initialized new user '${emailLower}' (UID: ${uid}) with role '${role}'`);
    } catch (error) {
        console.error(`[Identity Trigger] Error assigning initial role to user '${emailLower}':`, error);
    }
});

// ─── AUTH BLOCKING TRIGGERS (V2) ───

const ALLOWED_DOMAINS = ["@liceoagnesi.edu.it", "@liceoagnesi.gov.it"];

/**
 * Helper to check if an email is institutional or is a registered admin.
 */
async function isEmailAuthorized(email: string): Promise<boolean> {
    const emailLower = email.toLowerCase().trim();
    
    // 1. Check if email belongs to allowed institutional domains
    if (ALLOWED_DOMAINS.some(domain => emailLower.endsWith(domain))) {
        return true;
    }
    
    // 2. Check if email exists in the admins register collection in Firestore
    try {
        const adminSnap = await db.doc(`admins/${emailLower}`).get();
        if (adminSnap.exists) {
            return true;
        }
    } catch (e) {
        console.error("[Auth Check] Error reading admins register:", e);
    }
    
    return false;
}

/**
 * Blocking trigger executed BEFORE a new user is created in Firebase Auth.
 * Enforces institutional email domains, with exception for registered admins.
 */
export const beforecreated = beforeUserCreated({ region: "europe-west1" }, async (event) => {
    const user = event.data;
    const email = user?.email;

    if (!email) {
        throw new HttpsError(
            "invalid-argument",
            "Indirizzo email mancante. Accesso negato."
        );
    }

    const authorized = await isEmailAuthorized(email);
    if (!authorized) {
        throw new HttpsError(
            "invalid-argument",
            "La registrazione su Eversia è limitata esclusivamente alle email istituzionali (@liceoagnesi.edu.it)."
        );
    }
});

/**
 * Blocking trigger executed BEFORE a user attempts to sign in.
 * Enforces institutional email domains at login time.
 */
export const beforesignedin = beforeUserSignedIn({ region: "europe-west1" }, async (event) => {
    const user = event.data;
    const email = user?.email;

    if (!email) {
        throw new HttpsError(
            "invalid-argument",
            "Indirizzo email mancante. Accesso negato."
        );
    }

    const authorized = await isEmailAuthorized(email);
    if (!authorized) {
        throw new HttpsError(
            "invalid-argument",
            "L'accesso su Eversia è limitato esclusivamente alle email istituzionali (@liceoagnesi.edu.it)."
        );
    }
});

