# 🌌 eversia V2: Premium Ecosystem Architecture

Questa è l'architettura tecnica definitiva del **Gestore Assemblee d'Istituto** del Liceo M.G. Agnesi. Il sistema è stato trasformato da un semplice registro in un ecosistema digitale **mobile-first**, focalizzato su un'esperienza utente premium ("Agnesi Aesthetic") e un'integrità dei dati transazionale in tempo reale.

---

## 🏗️ 1. Core Stack & Infrastructure

L'applicazione è una **Real-time Single Page Application (SPA)** basata su un'architettura **Serverless Cloud**.

*   **⚡ Engine**: React 18 + TypeScript (Vite) per massime performance e tipizzazione rigorosa.
*   **🎨 UI Framework**: **Agnesi Aesthetic v2** (Tailwind CSS custom).
    *   **Glassmorphism**: Utilizzo intensivo di `backdrop-blur-2xl` e bordi traslucidi.
    *   **Ambient Lighting**: Effetti di luce dinamica basati sullo stato del sistema (Amber per Security, Emerald per Iscrizioni, Primary per Navigazione).
    *   **Mobile-First**: Tutti i componenti (Staff e Studenti) sono ottimizzati per l'uso "on-the-go" con wrapping intelligente del testo (addio `truncate`).
*   **🔥 Real-time Data**: **Google Firebase Ecosystem**.
    *   *Firestore*: Database NoSQL reattivo con listening asincrono su ogni componente.
    *   *Authentication*: Google Workspace OAuth limitato forzatamente al dominio `@liceoagnesi.edu.it`.

---

## 🔐 2. Security & Role Hierarchy

L'accesso è regolato da un sistema di **Ruoli Dinamici** definito nel `AuthContext.tsx`.

1.  **👑 Sviluppatore/Admin**: Accesso totale, configurazione logistica, override di ogni attività e gestione ruoli.
2.  **🛡️ Security**: Vista specializzata dei varchi. Monitoraggio in sola lettura dei flussi di studenti per turno/aula.
3.  **👨‍🏫 Room Manager (Staff)**: Il cuore operativo. Responsabile dell'appello in aula, gestione imbucati e saturazione.
4.  **🎓 Student**: Hub personale per prenotazioni, consultazione orario e storico.

---

## 📱 3. Component Architecture (The Premium Flow)

### 3.1 Unauthenticated Flow (The Join Gateway)
Il punto di ingresso per i nuovi utenti è gestito dal `JoinGateway.tsx`.
*   **Frictionless Onboarding**: Landing page "figa" che spiega i vantaggi del sistema.
*   **Smart Catapult**: Dopo il login, l'utente viene reindirizzato istantaneamente all'assemblea target via query parameter `?join=ID`.

### 3.2 Student Ecosystem (`StudentDashboard`)
Un'interfaccia a schede ad alta fedeltà (iOS Widget Style).
*   **Modalità Attiva**: Prenotazione transazionale (Atomic Updates) che impedisce l'overbooking anche sotto carico elevato.
*   **Modalità Storico**: Accesso in "Sola Lettura" alle assemblee archiviate per consultare la propria cronologia e posizioni passate.
*   **Timeline Dinamica**: Orario personale ricalcolato a ogni cambio turno.

### 3.3 Staff Ecosystem (`StaffDashboard` & `RoomManager`)
Strumenti di monitoraggio ad alta densità per l'uso sul campo.
*   **Staff Guard**: Sistema di protezione delle route che verifica i permessi specifici per singola assemblea/aula.
*   **Registro Digitale Transazionale**: L'appello (`RoomManager`) esegue transazioni doppie: valida la presenza dello studente e aggiorna simultaneamente la capienza dell'aula, garantendo coerenza matematica in tutto l'istituto.
*   **Informativa Imbucati**: Identificazione istantanea di studenti provenienti da altre attività con possibilità di riassegnazione manuale.

---

## 📊 4. Data Model (Firestore Flat-Logic)

Disegnato per zero latenza e alta scalabilità.

*   **`/config/main`**: Il "metronomo" del sistema (Assembly ID attivo, Turno corrente).
*   **`/assemblies/{id}`**: Metadati e stato evolutivo (Configurazione $\rightarrow$ Iscrizioni $\rightarrow$ Attiva $\rightarrow$ Archiviata).
*   **`/rooms/{id}`**: Entità attività. Campi chiave: `max_capacity`, `counts_by_turn` (mappa per gestione multi-turno), `access_pin`.
*   **`/students/{id}`**: Tracking individuale. `scheduled_turns` (dove dovrebbe essere) vs `actual_location` (dove è stato appellato).
*   **`/assembly_roles/{email}`**: Sistema di permessi granulari per Staff e Security.

---

## 🚀 5. Current Maturity Level

Il sistema è in fase di **Release Candidate (RC1)**.

*   ✅ **Interfaccia Premium**: Redesign completo "Apple Style" completato.
*   ✅ **Frictionless Auth**: Sistema di invito e redirect testato.
*   ✅ **Multi-Turno**: Motore logistico pronto per assemblee complesse.
*   ✅ **Mobile Integrity**: Nessun testo troncato, layout ultra-reattivi.

**Next Steps**: Implementazione delle Firebase Security Rules lato server e modulo di esportazione PDF/CSV per i dati di fine evento.

---
*eversia — Progettato per l'eccellenza.*
