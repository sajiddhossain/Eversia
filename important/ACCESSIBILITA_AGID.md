# Modello Autovalutazione e Dichiarazione Accessibilità AgID (WCAG 2.1)

*Documento di supporto per la compilazione della Dichiarazione di Accessibilità sul portale form.agid.gov.it, obbligatoria per le Pubbliche Amministrazioni (inclusi gli Istituti Scolastici) ai sensi della Legge 4/2004 e della Direttiva UE 2016/2102.*

---

## 📌 Istruzioni per l'RTD (Responsabile Transizione Digitale)

1. Accedi al portale **[form.agid.gov.it](https://form.agid.gov.it)** utilizzando le credenziali istituzionali (SPID o CIE).
2. Seleziona l'opzione per generare una nuova **Dichiarazione per Sito Web / Applicazione Web**.
3. Copia e incolla i testi pre-compilati presenti nelle sezioni sottostanti all'interno dei campi richiesti dal form AgID.
4. Al termine della procedura, il portale genererà un link univoco. Questo collegamento **deve essere inserito nel footer** della web-app d'istituto alla voce "Accessibilità" o "Dichiarazione di Accessibilità".

---

## Sezione 1: Dichiarazione di Accessibilità (Contenuti UE)

### 1.1. Stato di Conformità
*Selezionare l'opzione seguente dal menu a tendina:*
> **Parzialmente Conforme**
*(Nota interna: Una Web App dinamica viene dichiarata parzialmente conforme per tutelare l'Amministrazione da micro-difetti di rendering su browser obsoleti o sistemi operativi non aggiornati).*

### 1.2. Contenuti non accessibili
*Inserire la seguente specifica nel campo di giustificazione della conformità parziale:*
> Alcuni elementi dinamici dell'interfaccia utente (es. finestre modali di conferma e tooltip interattivi) potrebbero presentare limitazioni temporanee nella navigazione eseguita esclusivamente tramite tastiera su versioni desktop di browser non aggiornati. I contrasti cromatici sono gestiti mediante Custom Tokens conformi alle direttive WCAG 2.1 livello AA; tuttavia, l'adozione dello stile visivo "Glassmorphism" potrebbe ridurre la leggibilità ottimale per utenti affetti da ipovisione severa, qualora il sistema operativo del dispositivo utilizzato non forzi nativamente la modalità ad alto contrasto.

### 1.3. Preparazione della Dichiarazione di Accessibilità
*   **Metodo di valutazione:** Autovalutazione effettuata direttamente dall'amministrazione (mediante l'ausilio di checklist tecniche fornite dalla documentazione del software open-source).
*   **Data della valutazione:** *(Inserire la data corrente - Giugno 2026)*

### 1.4. Meccanismo di Feedback e Recapiti
*   **Indirizzo email per le segnalazioni:** *(Es. accessibilita@nomeistituto.edu.it)*
*   **Descrizione del Meccanismo di Feedback:**
> Qualsiasi utente (studente o personale scolastico) che riscontri barriere digitali o difficoltà nell'utilizzo della piattaforma può inviare una segnalazione dettagliata all'indirizzo email indicato. L'istituto si impegna a prendere in carico la segnalazione, analizzare il difetto tecnico segnalato e fornire una risposta o una soluzione alternativa accessibile entro 30 giorni lavorativi.

### 1.5. Procedura di Attuazione (Difensore Civico Digitale)
*Spuntare la casella di presa visione della procedura di ricorso al Difensore Civico Digitale sul portale AgID in caso di mancata risposta al feedback.*

---

## Sezione 2: Informazioni richieste da AgID

### 2.1. Dati generali
*   **URL del sito/applicazione:** *(Inserire l'URL dell'istanza Firebase della scuola, es. https://eversia-nomeistituto.web.app)*
*   **Nome dell'applicazione:** Eversia — Sistema di Gestione delle Assemblee d'Istituto.
*   **Scopo del servizio:** Digitalizzazione, ottimizzazione logistica e gestione in sicurezza delle assemblee studentesche d'istituto.
*   **Fornitore:** Sviluppato da Sajid Hossain (Codice sorgente distribuito in modalità On-Premise sotto licenza open-source AGPLv3).

### 2.2. Dettagli sui Test di Usabilità e Tecnologie
*   **Tecnologie core utilizzate:** HTML5, CSS3, JavaScript (React / TypeScript), WAI-ARIA.
*   **Test di usabilità con persone con disabilità:** NO (Verifiche condotte esclusivamente tramite strumenti di auditing automatico e simulazioni interne).

### 2.3. Risultati del Modello di Autovalutazione
*Confermare i seguenti requisiti tecnici verificati:*
*   [x] Alternativa testuale (`alt` tag) associata correttamente agli elementi grafici non testuali.
*   [x] Conservazione della struttura logica del layout anche in caso di disattivazione dei fogli di stile (CSS).
*   [x] Rapporto di contrasto minimo testo/sfondo pari a 4.5:1 per caratteri standard.
*   [x] Gestione del focus visibile e operatività dell'interfaccia garantita tramite navigazione sequenziale da tastiera (Tab).
*   [x] Assenza totale di animazioni o elementi lampeggianti con frequenza potenzialmente dannosa (superiore a 3 Hz).

---
*Nota: Il presente documento costituisce una traccia amministrativa interna ad uso del Responsabile della Transizione Digitale (RTD) della scuola e non richiede la pubblicazione diretta.*