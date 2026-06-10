# eversia: Architettura Tecnica e Sicurezza della Piattaforma

## 1. Gestione degli Account Istituzionali (Identity & Access Management)
La piattaforma adotta un sistema di autenticazione certificato che si appoggia a **Firebase Authentication** con protocollo OAuth 2.0 (OpenID Connect). 
L'accesso è tecnicamente bloccato a livello di sistema: le *Firestore Security Rules* (le regole di sicurezza che proteggono il database) impongono un controllo rigoroso tramite Regex, consentendo l'accesso **esclusivamente agli indirizzi email terminanti in `@liceoagnesi.edu.it` o `@liceoagnesi.gov.it`**. 

I dati personali (Limitati a Nome, Cognome ed Email Istituzionale) sono salvati nel database Cloud Firestore in due formati sicuri: un profilo utente ed un'anagrafica specifica per l'assemblea (formato ID: `assemblyId_email`).
- **Protezione Inviolabile del Dato:** Le *Security Rules* impediscono a qualunque utente, persino al creatore dell'account, di modificare campi sensibili. Ad esempio, uno studente ha il permesso di modificare esclusivamente la propria bio o il proprio blocco estetico, mentre campi come `role` (ruolo), `xp` (esperienza), `badges`, e dati di `check-in` vengono interamente blindati dal lato server. Questo annulla totalmente le possibilità di bypass o alterazione (Client-Side Spoofing).

---

## 2. Funzionamento del Gestore e Controllo Accessi
Tutta la rete operativa è sorvegliata da una gerarchia di permessi (RBAC — Role-Based Access Control) inserita profondamente nelle regole back-end:

- **Amministratore (`ADMIN`, `SVILUPPATORE`):** Ha diritti globali diretti e indiretti su documenti di configurazione (`/config`), controllo globale dell'assemblea (`/assemblies`), e gestione massiva degli utenti e log degli eventi (`/event_log`). 
- **Room Manager (Gestore Attività):** L'utente assegnato alla custodia di un'aula. A livello di database, questa figura possiede permessi limitati e chirurghi: è tecnicamente l'unica autorizzata ad agire sull' `actual_location` (ovvero sul parametro del check-in reale) degli studenti.
- **Addetto alla Security:** Supervisiona i flussi e individua le mancate autorizzazioni nei corridoi. Si interfaccia con un *Student Locator* in grado di recuperare lo storico e i turni prenotati per controllare i movimenti non consoni.
- **Studente (`STUDENT`):** Legge solamente le attività in chiaro e si prenota aggiornando esclusivamente il parametro `scheduled_turns` sulla propria anagrafica documentale. Non può in alcun modo "forzare" un accesso se la capienza è raggiunta.

---

## 3. Gestione Sicurezza Antincendio ed Evacuazione
Il sistema impedisce tecnicamente il collasso logistico in fase d'iscrizione attraverso una struttura che isola gli aggiornamenti della capienza: 
- Un limitatore controlla direttamente l'aggiornamento del parametro `counts_by_turn` all'interno della raccolta Firestore `/rooms/{roomId}`. 
- Questo previene in maniera assoluta l'overbooking e garantisce che **in nessuna aula si superi la capienza massima autorizzata**. In caso di evacuazione o allarme, i dirigenti avranno sulla propria *Security Dashboard* valori precisi e in tempo reale per verificare che le vie di fuga e i punti di raccolta dei singoli locali siano correttamente coperti rispetto ai volumi calcolati dal sistema.

---

## 4. Email Bridge System (Sistema Avanzato di Comunicazione)
Un elemento di particolare innovazione tecnica implementato in eversia è **l'Email Bridge**.
Invece di affidarsi a gateway esterni incerti, il sistema si collega ad una infrastruttura Google Apps Script configurata dal backend.
- **Invia Comunicazioni via Google Workspace:** L'infrastruttura backend invia le notifiche istituzionali (es. apertura iscrizioni "*📣 Iscrizioni Aperte*") sfruttando i server sicuri di Google mediante API.
- **Sicurezza nel Trasferimento:** Il Bridge è validato da una configurazione di sicurezza definita nel database Firestore, tramite URL WebApp e un'**API Key crittografata** (`email_api_key`), accessibile nel client unicamente dagli account autorizzati muniti di "Security PIN" dedicato. Le email, scritte in Markdown via pannello Admin e formattate in HTML, arrivano ufficialmente nelle caselle degli studenti senza intercettazioni.

---

## 5. Trasparenza Amministrativa e Audit Log
eversia assicura una completa trasparenza scolastica a fronte della dismissione dei moduli cartacei:

- **Generazione Report Certificati:** Le esportazioni massicce, regolate unicamente dall'interfaccia *MasterExport* e *AttendanceExport*, compilano l'appello esatto del momento (xlsx) leggendo e analizzando tutti i documenti definitivi.
- **Il Sistema `event_log`:** Oltre ai report finali, il sistema traccia meticolosamente le azioni degli staffer in uno spazio dedicato (`/event_log`). Qualsiasi aggiornamento eccezionale – un check-in forzato in loco da un Room Manager, o un cambio drastico dei permessi di sistema da parte di uno sviluppatore – viene iscritto irrevocabilmente nel registro. Questa trasparenza costituisce un argine totale contro le negligenze informatiche e l'opacità delle gestioni decentralizzate.
