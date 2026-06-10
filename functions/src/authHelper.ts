import * as admin from "firebase-admin";

/**
 * Helper per riconciliare l'autenticazione in ambiente di sviluppo locale (emulatore).
 * Se request.auth è assente (mancata decodifica dell'ID token di produzione nell'emulatore),
 * esegue una verifica manuale del token usando l'Admin SDK di produzione.
 */
export async function resolveAuth(request: any) {
    let auth = request.auth;
    if (!auth && request.rawRequest?.headers?.authorization) {
        const authHeader = request.rawRequest.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            try {
                const decodedToken = await admin.auth().verifyIdToken(token);
                auth = {
                    uid: decodedToken.uid,
                    token: decodedToken
                };
            } catch (err) {
                console.error("[resolveAuth] Errore verifica token manuale:", err);
            }
        }
    }
    return auth;
}
