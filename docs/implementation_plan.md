# AgendaList Details Improvement

L'obiettivo è migliorare la visualizzazione dell'agenda nella Global Home del Dashboard Studente, risolvendo la mancanza di informazioni cruciali come la fascia oraria e migliorando la chiarezza del luogo dell'attività.

## Proposed Changes

### Global Home Agenda

#### [MODIFY] [AgendaList.tsx](file:///Users/sajid/Documents/mga_assembly-manager/client/src/components/StudentDashboard/GlobalHome/AgendaList.tsx)
- Correzione del bug "Invalid Date":
    - Combinazione di `assembly.date` (convertita in ISO) con gli orari `start`/`end` del turno.
    - Utilizzo di `formatDateToISO` per garantire la compatibilità con `new Date()`.
- Miglioramento della visualizzazione del luogo:
    - Uso prioritario di `room_name` con fallback su `location_name`.
    - Aggiunta di un'icona e etichetta più chiara.
- Allineamento estetico con il "Mission Control":
    - Uso di `font-black italic uppercase` per i titoli dei turni.
    - Miglioramento della card del turno con bordo e sfondi più definiti.
    - Badge di stato più coerenti.

## Verification Plan

### Manual Verification
- Aprire la dashboard studente (Global Home).
- Verificare che ogni attività nell'agenda mostri correttamente l'orario (fascia oraria).
- Verificare che il luogo sia visualizzato correttamente (e.g. "Aula: Palestra").
- Confermare che lo stile sia coerente con il resto della dashboard.

### Dashboard Core Logic

#### [MODIFY] [StudentDashboard.tsx](file:///Users/sajid/Documents/mga_assembly-manager/client/src/components/StudentDashboard.tsx)
- Correzione del calcolo di `turnTimestamps`:
    - Integrare `selectedAssembly.date` nel parsing delle date dei turni per evitare `NaN`.
    - Questo risolverà anche i countdown e gli stati "Live Now" nella TimelineView.
