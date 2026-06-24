<div align="center">

  # Eversia 🧬

  **L'evoluzione intelligente delle assemblee scolastiche.**  
  *Una piattaforma serverless open-source progettata per digitalizzare la pianificazione delle attività, blindare il controllo delle presenze in tempo reale e garantire la massima sicurezza logistica.*

  [![Licenza](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
  [![Stack](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20Firebase-FFCA28.svg)]()
  [![Compliance](https://img.shields.io/badge/Privacy-GDPR_europe--west8-success.svg)]()
  
  [Guida all'Installazione Istituzionale](./ADOPT.md) · [Segnala un Bug / Richiedi Supporto](mailto:sajid.hossain2009@gmail.com)

</div>

<br/>

> **Eversia** risolve in modo elegante i problemi storici legati all'organizzazione delle attività e dei gruppi di studio durante le assemblee d'istituto nelle scuole secondarie di secondo grado: stop ai fogli di carta per gli appelli, stop ad aule sovraffollate oltre i limiti di sicurezza e controllo dei flussi nei corridoi.

---

## ✨ Perché le Scuole Scelgono Eversia

Eversia sostituisce i processi manuali con un'architettura Cloud Native moderna, un'interfaccia utente immersiva e un'esperienza ottimizzata per gli studenti e per il corpo docenti.

> ⚠️ **Development Status: Active Refactoring**  
> Eversia è stato sviluppato e testato con successo sul campo in un contesto istituzionale reale. La codebase è attualmente in fase di refactoring per ottimizzare l'architettura serverless, migliorare la modularità dei componenti e predisporre la piattaforma a una distribuzione su larga scala.

### 👥 1. Per gli Studenti: Partecipazione Trasparente e Intuitiva
Abbiamo unito la produttività di una **Agenda Digitale Real-Time** con dinamiche strutturate per incentivare il coinvolgimento:
* 📅 **Prenotazione Istantanea**: Selezione rapida delle stanze a tema e dei dibattiti dell'assemblea prima dell'evento.
* 🔥 **Monitoraggio Badge**: Visualizzazione dei traguardi di partecipazione all'interno del proprio profilo studente.
* ⭐ **Feedback Loop**: Gli studenti valutano la qualità delle attività proposte, fornendo dati preziosi ai rappresentanti per migliorare le assemblee future.

### 🛡️ 2. Per i Docenti (Room Manager): Controllo e Sicurezza Totale
La piattaforma rispetta rigorosamente le direttive sull'uso dei dispositivi personali, centralizzando l'autorità nei profili dello staff.
* 📵 **Zero Distrazioni**: Gli studenti utilizzano l'applicazione esclusivamente per la fase di prenotazione autonoma. L'appello e il check-in iniziale vengono gestiti dallo staff scolastico.
* 🚫 **Prevenzione Overbooking Atomica**: Algoritmi transazionali (ACID) bloccano le iscrizioni non appena viene raggiunta la capienza massima fisica dell'aula impostata dall'amministratore (D.Lgs. 81/08).

### 📊 3. Per la Dirigenza: Analisi e Monitoraggio in Tempo Reale
La **Dashboard di Controllo** fornisce al Dirigente Scolastico e al Responsabile della Sicurezza una panoramica istantanea dell'evento:
* 📍 **Mappatura Flussi**: Controllo in tempo reale della saturazione delle singole aule per ragioni di sicurezza antincendio ed evacuazione.
* 📈 **Efficienza Cloud-Native**: Sviluppata con un'architettura ottimizzata che abbatte del 75% le letture/scritture ridondanti sul database, riducendo a zero l'impatto infrastrutturale.

---

## 🔒 Sicurezza & Compliance GDPR

Eversia è costruita seguendo i principi di *Privacy by Design* per tutelare i dati della popolazione scolastica.

*   **Google Workspace Authentication**: Accesso consentito esclusivamente tramite protocollo OAuth 2.0 con i domini istituzionali della scuola (`@istituto.edu.it`).
*   **Privacy By Design (Shared PC)**: Gestione delle sessioni tramite Session Storage per prevenire la persistenza dei dati d'accesso su computer condivisi nei laboratori.
*   **Data Residency Italiana**: Tutti i dati risiedono ed小姐vengono trattati esclusivamente nella region Google Cloud **`europe-west8` (Milano, Italia)**, in totale conformità con le direttive del Garante Privacy e del GDPR.

---

## 💻 Open Source & Implementazione (AGPLv3)
Eversia è un software libero rilasciato sotto licenza **GNU Affero General Public License v3**. L'istituto scolastico può scaricare, installare e configurare in autonomia la piattaforma sul proprio spazio cloud d'istituto a costo zero, mantenendo il controllo totale e sovrano sui dati trattati.

👉 **Consulta la documentazione tecnica:** **[Guida all'Installazione Istituzionale](./ADOPT.md)** · **[Hub della Documentazione (docs/README.md)](./docs/README.md)**

*Sviluppato con passione da Sajid Hossain per ridefinire la partecipazione studentesca.*
