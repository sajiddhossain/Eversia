# eversia STRESS TEST ENGINE

Questo script genera 1500 studenti finti nelle collezioni Firestore per testare le performance della dashboard.

## Requisiti
- Node.js installato.
- Account di servizio Firebase (`service-account.json`) nella root del progetto.

## Procedura d'uso

### 1. Preparazione Ambiente
Assicurati di avere `firebase-admin` installato. Puoi installarlo globalmente o localmente:

```bash
# In una cartella temporanea o nella root (se vuoi sporcare il package.json)
npm install firebase-admin
```

Alternativamente, se hai già fatto `npm install` nella cartella `server`, lo script può essere lanciato usando i loro moduli (consigliato).

### 2. Lancio dello Script

Assicurati di essere nella cartella corretta per far sì che Node trovi i moduli.

**Opzione A: Dalla cartella `server` (Consigliato, ha già le dipendenze)**
```bash
# Vai nella cartella server
cd /Users/sajid/Documents/mga_assembly-manager/server
# Lancia il comando
node ../scripts/stressTest.js
```

**Opzione B: Dalla cartella `client` (Se hai installato firebase-admin lì)**
```bash
# Vai nella cartella client
cd /Users/sajid/Documents/mga_assembly-manager/client
# Lancia il comando (usando il percorso relativo)
node ../scripts/stressTest.js
```
*Nota: Se ricevi ancora `MODULE_NOT_FOUND`, è perché Node cerca le dipendenze partendo dalla posizione dello script. In tal caso, installa firebase-admin nella root del progetto.*

**Opzione C: Dalla ROOT (Consigliato se vuoi uno script indipendente)**
```bash
cd /Users/sajid/Documents/mga_assembly-manager
npm install firebase-admin
node scripts/stressTest.js
```

## Cosa fa lo script:
1. Identifica l'assemblea attiva (da `config/main` o prendendo la prima disponibile).
2. Recupera fino a 40 aule associate.
3. Crea 1500 documenti in `students` con:
   - Nomi e email casuali.
   - Turni 1, 2, 3 assegnati casualmente alle aule trovate.
   - **Check-in automatico per il 70%** degli studenti per il Turno 1.

## Note
- Lo script usa batch da 400 documenti per rispettare i limiti di Firestore.
- Se vuoi resettare i dati, dovrai cancellare manualmente i documenti con ID che iniziano per `mock_student_`.
