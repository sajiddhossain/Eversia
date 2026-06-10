# Framework Legale Eversia: DPA, SLA e Termini di Servizio

*Questo documento definisce il framework contrattuale standard per la fornitura della piattaforma Eversia in modalità SaaS Gestito (Software as a Service) alle istituzioni scolastiche, in conformità al GDPR e alle linee guida AgID.*

> [!WARNING]
> **Disclaimer Legale:** Il presente documento costituisce una bozza tecnica di supporto logistico. Prima della sottoscrizione formale con un Istituto Scolastico, il testo deve essere sottoposto alla revisione del Responsabile della Protezione dei Dati (RPD/DPO) della scuola o di un legale specializzato in contrattualistica della Pubblica Amministrazione (PA).

---

## 1. DPA (Data Processing Agreement) — Nomina a Responsabile del Trattamento
*Contratto obbligatorio ai sensi dell'Art. 28 del Regolamento UE 2016/679 (GDPR). La validità giuridica del trattamento dei dati degli studenti è subordinata alla firma del presente atto.*

**Oggetto:** Il Titolare del Trattamento (l'Istituzione Scolastica) nomina il Fornitore (Eversia Software di Sajid Hossain) quale Responsabile Esterno del Trattamento per l'erogazione dei servizi cloud della piattaforma "Eversia".

**Clausole Vincolanti:**
*   **Finalità del Trattamento:** Il Responsabile tratterà i dati personali comuni (Nome, Cognome, Email istituzionale, Classe, record di presenza) al solo fine di consentire la pianificazione, la prenotazione e il monitoraggio logistico delle assemblee d'istituto.
*   **Divieto Assoluto di Profilazione:** È fatto divieto al Responsabile di utilizzare i dati per finalità commerciali, marketing o cessione a terze parti. I meccanismi di "Gamification" (XP, livelli, badge) sono confinati all'interno del database isolato della scuola e finalizzati unicamente a scopi didattici e di incentivo alla partecipazione.
*   **Sub-Responsabili Autorizzati (Sub-Processors):** Il Titolare autorizza il Responsabile ad avvalersi di Google Ireland Limited (Google Cloud / Firebase) per i servizi di hosting, persistenza dati e computazione serverless. I dati saranno allocati esclusivamente all'interno della region **`europe-west8` (Milano, Italia)**.
*   **Restituzione e Cancellazione dei Dati (Exit Strategy):** Alla risoluzione o alla naturale scadenza del contratto d'abbonamento, il Responsabile si impegna a restituire al Titolare i dati in formato standard (CSV/JSON) e a procedere al wipe (cancellazione sicura e irreversibile) di ogni copia residua sui server cloud entro 30 giorni lavorativi.

---

## 2. SLA (Service Level Agreement) — Livelli di Servizio Garantiti
*Sezione volta a definire i parametri di efficienza tecnica del software e a limitare i profili di rischio economico in caso di downtime.*

**Metriche di Disponibilità (Uptime):**
*   Il Fornitore garantisce una disponibilità operativa della piattaforma (Uptime) pari al **99,5%** su base mensile. Sono escluse dal calcolo le finestre di manutenzione ordinaria programmata, che verranno comunicate alla scuola con un preavviso minimo di 48 ore e pianificate al di fuori dell'orario scolastico (es. fascia notturna o festiva).

**Penali e Crediti di Servizio (Liquidated Damages):**
*   Qualora la disponibilità della piattaforma scenda al di sotto della soglia del 99,5% durante lo svolgimento delle attività assembleari (fascia oraria 08:00 - 14:00), l'unico indennizzo applicabile a favore dell'Istituto consisterà nell'erogazione di **Crediti di Servizio** (stornati dal canone di rinnovo dell'anno successivo) calcolati in misura proporzionale alle ore di effettivo disservizio.
*   **Esclusione di Responsabilità:** Il Fornitore non risponde di mancate prestazioni o interruzioni causate da anomalie infrastrutturali di Google Cloud Platform, attacchi informatici di tipo DDoS di intensità superiore alle barriere standard di mitigazione di Firebase Hosting, o interruzioni generalizzate della rete connettiva della scuola.

---

## 3. Limitazione di Responsabilità e Termini di Servizio (ToS)
*Clausole di salvaguardia economica volte a perimetrare il rischio d'impresa entro i limiti consentiti dall'Art. 1229 del Codice Civile italiano.*

**Modello a Responsabilità Condivisa:**
*   **Oneri del Fornitore:** Il Fornitore risponde dell'integrità del codice sorgente, della corretta esecuzione delle Cloud Functions, dell'applicazione delle regole di sicurezza del database (Firestore Security Rules) e della cifratura dei dati in transito e a riposo.
*   **Oneri della Scuola:** L'Istituto risponde dell'esclusiva custodia delle credenziali amministrative dello staff. Il Fornitore non potrà essere ritenuto responsabile per la cancellazione accidentale di dati, l'alterazione delle capienze delle aule o accessi impropri derivanti da negligenza nell'amministrazione dei profili *Admin* da parte del personale scolastico o dei rappresentanti.

**Massimale di Risarcimento (Cap on Liability):**
*   Fatta eccezione per i soli casi di dolo o colpa grave accertata, la massima responsabilità economica complessiva del Fornitore per qualsiasi controversia, danno diretto o indiretto (inclusa l'eventuale perdita temporanea di dati o contestazioni sull'ordine pubblico interno) derivante dall'uso o dal malfunzionamento di Eversia, **non potrà in nessun caso superare l'importo complessivo effettivamente corrisposto dall'Istituto Scolastico a titolo di canone nei 12 mesi antecedenti l'evento contestato**.

**Destinazione d'Uso Esclusiva:**
*   La piattaforma è fornita "così com'è" (*As-Is*) ed è progettata per l'uso esclusivo all'interno del perimetro organizzativo scolastico. Il Fornitore non rilascia garanzie in merito all'adeguatezza del software per scopi differenti, quali la gestione di eventi commerciali, aziendali o manifestazioni pubbliche esterne all'istituto.