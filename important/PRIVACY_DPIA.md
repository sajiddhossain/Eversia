# Valutazione d'Impatto sulla Protezione dei Dati (DPIA) — Linee Guida Eversia

Documento di supporto tecnico-legale redatto per agevolare il Responsabile della Protezione dei Dati (RPD/DPO) e il Dirigente Scolastico nell'adozione della piattaforma Eversia, ai sensi dell'Art. 35 del Regolamento UE 2016/679 (GDPR).

## 1. Premessa e Scopo del Documento

L'introduzione di soluzioni digitali nel contesto scolastico — in particolare per la gestione di eventi collettivi che coinvolgono minorenni — richiede un'attenta analisi dei rischi. L'Articolo 35 del GDPR impone ai Titolari del Trattamento (le istituzioni scolastiche) di effettuare una Valutazione d'Impatto sulla Protezione dei Dati (DPIA) qualora il trattamento possa presentare un rischio per i diritti e le libertà delle persone.

Questo documento illustra le misure tecniche e organizzative integrate nativamente nell'architettura di Eversia per garantire la conformità al GDPR (Art. 32), minimizzando i rischi informatici e sollevando la scuola da oneri sistemistici complessi.

---

## 2. Architettura Cloud e Localizzazione dei Dati (Data Residency)

Il trattamento dei dati avviene interamente in ambiente Cloud serverless. Al fine di evitare la dispersione geografica delle informazioni o il trasferimento transfrontaliero extracomunitario, la piattaforma è configurata come segue:

* **Localizzazione:** L'infrastruttura (Database Firestore, Cloud Functions e sistemi di autenticazione) è allocata ed eseguita esclusivamente all'interno dello Spazio Economico Europeo (SEE).
* **Region Specifica:** La persistenza dei dati è stabilita rigorosamente nella region **`europe-west8` (Milano, Italia)**.
* **Conformità:** Nessun dato personale varca i confini nazionali ed europei, garantendo la piena aderenza al Capo V del GDPR.

> 💡 **Similitudine per non tecnici:** Immaginate che i dati degli studenti siano fascicoli cartacei. Anziché spedire questi fascicoli in un archivio oltreoceano senza garanzie legali, Eversia affitta una cassetta di sicurezza corazzata situata fisicamente sul territorio di Milano, soggetta alle medesime leggi italiane in materia di privacy.

---

## 3. Sicurezza del Trattamento (Art. 32 GDPR)

Eversia implementa misure tecniche adeguate a garantire un livello di sicurezza proporzionato al rischio di accessi non autorizzati o distruzione accidentale dei dati.

### 3.1. Crittografia in Transito (Encryption in Transit)

Ogni comunicazione tra il dispositivo dell'utente (smartphone dello studente, PC del docente) e l'infrastruttura cloud avviene esclusivamente tramite protocolli sicuri **HTTPS crittografati con TLS 1.2 o superiore**.

* 💡 **Similitudine:** Inviare un dato su Internet è come spedire una cartolina: chiunque lungo il percorso potrebbe leggerla. L'HTTPS inserisce quella cartolina in un furgone portavalori blindato: chi intercetta il veicolo lungo la strada vedrà solo l'esterno blindato, senza alcuna possibilità di accedere al contenuto.

### 3.2. Crittografia a Riposo (Encryption at Rest)

Tutti i dati memorizzati nel database Cloud Firestore vengono crittografati automaticamente a livello di blocco logico prima di essere scritti fisicamente sui dischi dei data center.

* 💡 **Similitudine:** Se un malintenzionato riuscisse ipoteticamente a sottrarre i supporti fisici del server, non troverebbe un elenco di nomi e cognomi leggibili, ma una sequenza incomprensibile di caratteri alfanumerici cifrati. Senza le chiavi di decrittazione, gestite centralmente in modo sicuro, quei dati sono totalmente inutilizzabili.

---

## 4. Architettura Zero-Trust e Minimizzazione dei Dati

### 4.1. Inventario Rigido dei Dati Trattati (Art. 5 GDPR)

In ossequio al principio di minimizzazione, Eversia non raccoglie dati sensibili, biometrici, di geolocalizzazione o relativi alle opinioni politiche/sindacali degli utenti. I dati trattati sono esclusivamente di natura comune e strettamente necessari alla logistica organizzativa:

* **Per gli Studenti:** Nome, Cognome, Indirizzo Email istituzionale, Classe di appartenenza, Aula/Assemblea prenotata.
* **Per lo Staff/Admin:** Nome, Cognome, Email istituzionale, Log delle azioni amministrative (creazione aule, modifiche capienze).

### 4.2. Cloud Functions e Firestore Security Rules

Eversia adotta un approccio **Zero-Trust**: nessun client (dispositivo utente) è considerato attendibile a priori e non possiede permessi di scrittura diretta sul database.

* Le operazioni critiche (es. la prenotazione di un posto in assemblea) vengono delegate a **Cloud Functions** isolate. La funzione valida centralmente l'identità dell'utente tramite token JWT firmati e verifica i vincoli di capienza in tempo reale prima di convalidare l'azione.
* Il database applica regole granulari stringenti a livello di configurazione (`allow read, write: if false;`), impedendo qualsiasi tentativo di manipolazione o interrogazione diretta tramite console browser, neutralizzando all'origine attacchi di tipo IDOR (Insecure Direct Object Reference).

> 💡 **Similitudine:** Invece di lasciare le chiavi dell'archivio (database) a tutti gli studenti, la stanza dell'archivio rimane sbarrata. Davanti alla porta risiede un portinaio inflessibile (la Cloud Function). Lo studente mostra il proprio badge (Token JWT) e fa la sua richiesta; il portinaio entra da solo, esegue l'operazione sui registri, esce e comunica l'esito. Nessun utente esterno tocca mai direttamente i faldoni.

### 4.3. Prevenzione della Persistenza su PC Condivisi

Considerando l'utilizzo frequente di postazioni d'istituto o PC condivisi nei laboratori, la piattaforma gestisce i token di sessione esclusivamente tramite **Session Storage** del browser anziché Local Storage.

* **Risultato:** Al momento della chiusura della scheda del browser o del programma di navigazione, i token di accesso vengono distrutti istantaneamente. Non vi è alcun rischio che l'utente successivo possa accedere alla sessione del precedente utilizzatore.

---

## 5. Modello di Deploy e Ruoli Legali (Art. 28 GDPR)

Eversia è rilasciata come software open-source sotto licenza AGPLv3. Per azzerare le complessità burocratiche e fiscali di intermediari esterni, la piattaforma viene adottata secondo il modello **On-Premise Cloud / Autonoma**.

* **L'Istituzione Scolastica (Titolare del Trattamento - Data Controller):** La scuola effettua il deploy del codice sorgente all'interno del proprio spazio istituzionale Google Firebase. La scuola mantiene la proprietà esclusiva, il controllo totale e la responsabilità giuridica dei dati trattati.
* **Fornitore Cloud - Google (Responsabile del Trattamento - Data Processor):** Fornisce l'infrastruttura fisica e logica crittografata (Firebase), agendo per conto della scuola in conformità con i *Google Cloud Data Processing Addendum (DPA)* già sottoscritti dall'istituto per i servizi Education.
* **Sviluppatore / Team Tecnico:** Lo sviluppatore fornisce esclusivamente il codice sorgente e l'assistenza tecnica applicativa sotto la diretta autorità e autorizzazione del Dirigente Scolastico, senza avere accesso amministrativo esterno ai dati dei minori se non esplicitamente autorizzato per iscritto per fini di manutenzione straordinaria.

### 5.1. Ciclo di Vita dei Dati e Ritenzione (Diritto all'Oblio - Art. 17 GDPR)

I dati relativi alle assemblee e alle preferenze di prenotazione degli studenti hanno una persistenza limitata nel tempo. I database d'istituto sono configurati per subire un processo di wipe (cancellazione permanente e irreversibile) al termine delle attività didattiche, ed **entro e non oltre il 30 giugno di ogni anno scolastico**, garantendo nativamente il rispetto del Diritto all'Oblio.

---

## 6. L'Ecosistema Google Workspace for Education

L'accesso alla piattaforma Eversia è vincolato all'autenticazione sicura tramite **OAuth 2.0**, utilizzando esclusivamente gli account Google istituzionali della scuola (es. `@nomeistituto.edu.it`).

* Questo sistema agisce come un perimetro chiuso (*Walled Garden*): non viene richiesta la creazione di nuove credenziali o password deboli sulla piattaforma.
* Qualsiasi tentativo di accesso da parte di account esterni al dominio della scuola (es. account personali `@gmail.com`) viene respinto automaticamente a livello infrastrutturale, impedendo intrusioni esterne.