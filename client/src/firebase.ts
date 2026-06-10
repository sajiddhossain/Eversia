import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Security Fix #1: La configurazione Firebase viene letta da variabili d'ambiente VITE_*
// invece di essere hardcodata nel sorgente. Copia .env.example in .env.local e
// compila i valori — non committare mai .env.local nel repository.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'europe-west1');

// Security Fix #8: Il rilevamento dell'emulatore non si basa più su pattern
// nell'hostname (ngrok, localtunnel, ecc.) che potrebbe attivarsi accidentalmente
// su deployment pubblici. Ora si usa esclusivamente una variabile d'ambiente esplicita.
// Per abilitare l'emulatore in locale: VITE_USE_EMULATOR=true nel tuo .env.local
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';

if (useEmulator) {
    const isStandardLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isStandardLocal) {
        connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    } else {
        // CORREZIONE BUG PORTA: L'emulatore delle Cloud Functions è in ascolto sulla porta 5001,
        // non sulla porta del client web (che solitamente è 5173). Usiamo sempre 5001.
        connectFunctionsEmulator(functions, window.location.hostname, 5001);
    }
}

// ─── SECURITY FIX M9: Configurazione Firebase App Check ───
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Inizializza App Check solo se la siteKey è configurata (evita blocchi 403 locali se non registrato in Firebase Console)
if (siteKey) {
    if (isLocal) {
        // Abilita il token di debug locale (copia il token generato in console e registralo su Firebase Console > App Check)
        (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: true
        });
    } catch (err) {
        console.warn("[AppCheck] Impossibile inizializzare App Check:", err);
    }
} else {
    console.log("[AppCheck] App Check disattivato in locale (nessun VITE_RECAPTCHA_SITE_KEY trovato).");
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

