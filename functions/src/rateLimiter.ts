import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export async function checkRateLimit(uid: string, action: string, limitMs: number): Promise<void> {
    const db = admin.firestore();
    const limitRef = db.doc(`rate_limits/${uid}_${action}`);
    const now = Date.now();

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(limitRef);
        if (snap.exists) {
            const lastTime = snap.data()?.timestamp ?? 0;
            if (now - lastTime < limitMs) {
                throw new HttpsError(
                    "resource-exhausted",
                    "Stai eseguendo troppe operazioni in rapida successione. Riprova tra qualche secondo."
                );
            }
        }
        tx.set(limitRef, { timestamp: now });
    });
}
