# 🛡️ DDoS Protection & Security Advisory

Il sistema MGA Assembly Manager è basato su Firebase, che offre già una protezione di base a livello infrastrutturale (Google Cloud Armor). Tuttavia, per un'applicazione scolastica esposta pubblicamente, è necessario implementare strati aggiuntivi di sicurezza per evitare abusi di risorse (DDoS) e accessi non autorizzati.

## 🚨 Vulnerabilità Identificate
1. **Accesso Pubblico Firestore**: Le regole correnti permettono letture libere su `/config/` e `/assemblies/`. Un malintenzionato potrebbe scriptare migliaia di letture al secondo, facendo lievitare i costi o rallentando il database.
2. **Client Non Verificati**: Attualmente, qualsiasi script che conosca la `apiKey` di Firebase può tentare di interrogare il database senza passare dall'interfaccia ufficiale del Liceo Agnesi.
3. **Mancanza di Rate Limiting**: Non ci sono limiti di frequenza per operazioni pesanti come la ricerca di studenti o la creazione di prenotazioni.

---

## 🛠️ Azioni Raccomandate

### 1. Firebase App Check (Priorità Alta)
App Check è lo strumento definitivo per le SPA Firebase. Verifica che le richieste arrivino solo dalla tua app ufficiale (Liceo Agnesi Manager) e blocca tutto il resto.
- **Provider**: Utilizzare **reCAPTCHA Enterprise** per il web.
- **Effetto**: Impedisce a bot e script esterni di consumare quote di database e auth.

### 2. Tighten Security Rules (Priorità Media)
Rafforzare le regole in `firestore.rules` per limitare il raggio d'azione:
- **Letture Protte**: Invece di `allow read: if true`, permettere la lettura solo se la richiesta include un ID valido o se l'utente è loggato (dove possibile).
- **Validazione Dati**: Aggiungere controlli sullo schema per evitare che vengano scritti campi non previsti che potrebbero appesantire il database.

### 3. Rate Limiting via Cloud Functions (Opzionale)
Se operazioni come l'esportazione PDF o la ricerca avanzata diventano critiche, dovrebbero essere spostate su Cloud Functions protette da un middleware di rate limiting (es. `express-rate-limit`).

### 4. Monitoraggio e Budget (Amministrazione)
- Impostare **Budget Alerts** nella console Google Cloud per essere avvisati immediatamente se il consumo di risorse Firestore schizza in alto.
- Utilizzare **Cloud Logging** per identificare picchi di traffico da singoli indirizzi IP.

---

## 📈 Prossimi Passi Suggeriti
1. Configurare **Firebase App Check** nella console di progetto.
2. Aggiornare `firebase.ts` per inizializzare App Check.
3. Revisionare le regole di lettura per la collezione `assemblies`.
