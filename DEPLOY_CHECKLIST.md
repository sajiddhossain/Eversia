# 🚀 Eversia — Lista di Controllo Pre-Deploy (Deployment Checklist)

Questo documento contiene i passaggi di configurazione obbligatori da eseguire **PRIMA** di effettuare il deploy in produzione dell'applicazione Eversia.

---

## 📌 1. Firebase App Check & reCAPTCHA v3 (OBBLIGATORIO)
Per proteggere il database e le Cloud Functions da abusi esterni, App Check richiede le chiavi reCAPTCHA v3.

1. **Registra il sito su Google reCAPTCHA v3**:
   * Vai su [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
   * Registra un nuovo sito selezionando **reCAPTCHA v3 (Classic)**.
   * Aggiungi i domini di produzione (es. `mga-assembly-manager.firebaseapp.com`, `mga-assembly-manager.web.app` e l'eventuale dominio scolastico).
   * Copia la **Chiave del sito (Site Key)** e la **Chiave segreta (Secret Key)**.

2. **Configura Firebase Console**:
   * Vai alla console Firebase del tuo progetto > **App Check** > scheda **App**.
   * Seleziona l'app web e clicca su **Registra** sotto la voce **reCAPTCHA v3**.
   * Incolla la **Chiave segreta (Secret Key)** e salva.

3. **Configura il Frontend**:
   * Nella cartella `client/` del progetto, crea il file `.env` (puoi copiare `.env.example`).
   * Imposta la chiave pubblica del sito:
     ```env
     VITE_RECAPTCHA_SITE_KEY=INCOLLA_QUI_LA_TUA_CHIAVE_DEL_SITO
     ```

---

## 📧 2. Configurazione Google Apps Script (Email Bridge)
L'Email Bridge per l'invio delle circolari non deve utilizzare chiavi cablate nel codice.

1. Apri il tuo script su Google Apps Script.
2. Vai in **Impostazioni progetto** (icona a forma di ingranaggio a sinistra).
3. Sotto **Proprietà script**, aggiungi le seguenti chiavi:
   * `API_KEY`: Imposta una chiave di sicurezza forte (es. `Agnesi_Secret_2026_MGA` o una stringa casuale).
   * `HMAC_SECRET`: Inserisci un codice segreto per la firma crittografica HMAC.
4. Assicurati che lo script sia pubblicato come Web App con accesso impostato su *"Chiunque"*.

---

## 🔒 3. Gestione Credenziali e File Sensibili
* **`service-account.json`**:
  * Assicurati che il file `service-account.json` (nella cartella radice) **non** venga mai aggiunto all'indice di un eventuale repository Git (`.gitignore` lo esclude già, ma verifica sempre prima di fare commit).
  * In produzione su Google Cloud, prediligi l'uso dei ruoli IAM nativi (Application Default Credentials).

---

## 🛠️ 4. Deploy del Progetto
Una volta completate le configurazioni sopra descritte, esegui i comandi di deploy standard dalla cartella principale del progetto:

```bash
# 1. Deploy delle regole di sicurezza Firestore
npx firebase-tools deploy --only firestore:rules --project mga-assembly-manager

# 2. Deploy delle Cloud Functions
npx firebase-tools deploy --only functions --project mga-assembly-manager

# 3. Compilazione e deploy del Frontend (Firebase Hosting)
cd client
npm run build
npx firebase-tools deploy --only hosting --project mga-assembly-manager
```
