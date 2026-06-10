# Guida all'Installazione e Configurazione Istituzionale 🧬

Questa guida illustra la procedura tecnica per l'implementazione autonoma (Self-Hosted) di **Eversia** all'interno dell'infrastruttura Cloud Google Firebase del tuo istituto scolastico.

L'adozione di questo modello assicura che la scuola rimanga l'unico **Titolare del Trattamento dei Dati**, escludendo intermediari esterni e garantendo la massima aderenza alle direttive AgID e GDPR.

---

## 🛡️ Modello di Architettura Sovrana

La scuola esegue il deploy dell'applicazione all'interno del proprio perimetro Google Cloud. In questo modo:
1. I dati degli studenti rimangono confinati nell'account Firebase proprietario dell'istituto.
2. I costi di computazione serverless rientrano nei piani standard di Google Workspace for Education già in possesso della scuola.
3. La manutenzione ordinaria può essere delegata internamente al Responsabile della Transizione Digitale (RTD) o agli amministratori IT del plesso.

---

## ⚙️ Requisiti di Sistema
*   Privilegi di Amministratore della console Google Cloud / Firebase d'istituto.
*   Node.js (versione 18+ LTS) e Firebase CLI installati sulla postazione di lavoro.
*   Un dominio Google Workspace for Education attivo (es. `@istituto.edu.it`).

---

## 🚀 Guida Tecnica al Deploy

### 1. Configurazione della Region e del Progetto Firebase
1. Accedi alla [Console Firebase](https://console.firebase.google.com/) con l'account amministrativo della scuola e crea un nuovo progetto.
2. Abilita il database **Cloud Firestore**. Durante la configurazione della geolocalizzazione, seleziona obbligatoriamente la region **`europe-west8` (Milano, Italia)** per garantire il rispetto della sovranità nazionale dei dati (GDPR).
3. Attiva il modulo **Authentication**, abilitando il provider di accesso Google e configurando il blocco stringente per consentire l'accesso al solo dominio email della scuola.
4. Esegui l'upgrade del piano Firebase alla formula **Blaze** (a consumo). *Nota: le soglie gratuite mensili di Google Cloud sono ampiamente sufficienti a coprire i carichi di un'intera giornata di assemblea senza generare costi vivi rilevanti.*

### 2. Implementazione dell'Email Bridge (Google Apps Script)
Al fine di azzerare i costi di infrastruttura per le notifiche e i riepiloghi di prenotazione, Eversia utilizza un bridge serverless interno a costo zero sfruttando le quote di invio istituzionali:
1. Accedi a [Google Apps Script](https://script.google.com/) con un account di servizio scolastico.
2. Implementa il codice sorgente posizionato nella directory `scripts/email-bridge.gs`.
3. Configura nelle proprietà dello script i parametri di sicurezza `API_KEY` e `HMAC_SECRET`.
4. Esegui il deployment come **Applicazione Web** accessibile a livello di sistema e conserva l'URL generato.

### 3. Inizializzazione del Database
In Firestore, inizializza la collezione principale `config` inserendo il documento `main` con i puntamenti strutturali:
```json
{
  "email_bridge_url": "URL_GENERATO_DA_APPS_SCRIPT",
  "activeAssemblyId": "",
  "maintenance_mode": false
}

```

### 4. Compilazione e Deploy CLI

Accedi alla cartella radice del progetto tramite terminale ed esegui i passaggi di compilazione dei moduli:

**Configurazione dell'ambiente Client (`client/`)**:
Inizializza il file `.env.local` inserendo le chiavi SDK fornite dalla console Firebase del tuo progetto.

```bash
cd client
npm install
npm run build

```

**Configurazione delle Cloud Functions Serverless (`functions/`)**:

```bash
cd functions
npm install
npm run build

```

**Deploy Infrastrutturale Finale**:
Esegui l'autenticazione tramite i tool a riga di comando e distribuisci le regole di sicurezza e gli asset compilati:

```bash
npx firebase-tools login
npx firebase-tools use --add ID_PROGETTO_SCOLASTICO
npx firebase-tools deploy --only firestore:rules,firestore:indexes
npx firebase-tools deploy --only functions
npx firebase-tools deploy --only hosting

```

Al termine del processo, l'applicazione sarà pubblicamente raggiungibile sull'istanza sicura HTTPS fornita da Firebase Hosting.