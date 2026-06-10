# 🛡️ Secure Coding & Architecture Guidelines

Questo documento riassume i principi fondamentali di **Cybersecurity Industriale** e **Secure Coding** applicati nell'architettura software di **Eversia** (MGA Assembly Manager). Le linee guida descritte garantiscono un'infrastruttura conforme alle raccomandazioni OWASP e ai requisiti DPO delle istituzioni scolastiche.

---

## 1. Sicurezza dei Client moderni: Prevenzione XSS in React

React adotta per impostazione predefinita una strategia difensiva robusta per limitare gli attacchi di tipo Cross-Site Scripting (XSS).

*   **Auto-Escaping nel Rendering**: React esegue automaticamente l'escaping di tutti i valori inseriti all'interno di elementi JSX prima di effettuarne il rendering nel DOM. Qualsiasi stringa di input viene forzata a testo semplice, prevenendo l'esecuzione di script non autorizzati:
    ```javascript
    // Anche se userInput contiene markup o tag script, React lo gestisce in modo sicuro come testo semplice
    const userInput = "<script>alert('xss')</script>";
    return <div>{userInput}</div>;
    ```
*   **La Scappatoia Pericolosa (`dangerouslySetInnerHTML`)**: Qualora fosse necessario stampare contenuti HTML complessi (es. formattazione editor), si deve evitare la stampa diretta. L'input deve essere precedentemente pulito sul client tramite una libreria di sanitizzazione come **DOMPurify** prima del rendering:
    ```javascript
    import DOMPurify from 'dompurify';
    
    const cleanHTML = DOMPurify.sanitize(dirtyUserInput);
    return <div dangerouslySetInnerHTML={{ __html: cleanHTML }} />;
    ```

---

## 2. Sicurezza lato Server: Firestore Security Rules (Zero Trust)

In un'applicazione serverless in cui il client comunica direttamente con il database, la sicurezza non si affida mai a controlli lato client (facilmente aggirabili). Ogni operazione di lettura e scrittura viene validata ed autorizzata in tempo reale dal backend di Firebase tramite regole dichiarative.

*   **Filtro per Document ID (Ottimizzato)**: 
    Firestore esegue le regole come validazioni logiche e non come filtri di ricerca. Il modo più sicuro e performante per strutturare i dati consiste nell'identificare ciascun record direttamente tramite l'ID utente univoco di Firebase (`uid`). 
    La regola confronta l'ID del documento con la sessione crittografata del chiamante senza scansionare i campi interni del documento:
    ```javascript
    match /students/{studentId} {
      // Regola istantanea e blindata: lo studente legge solo il suo record identificato da UID
      allow read: if request.auth != null && request.auth.uid == studentId;
    }
    ```
*   **Controllo dei Ruoli (RBAC)**: I privilegi amministrativi sono convalidati lato server leggendo il documento del chiamante all'interno della collezione protetta `/users`:
    ```javascript
    match /rooms/{roomId} {
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
    ```

---

## 3. Validazione degli Input lato Server: Zod nelle Cloud Functions

Per prevenire attacchi di iniezione di tipi non conformi (Type Pollution / Parameter Tampering) e per garantire l'integrità dei parametri passati dal client alle Cloud Functions, viene utilizzato un motore di validazione schema (Zod).

*   **Validazione Schema Zod**: Definisce in modo rigido i tipi di dato accettati, bloccando qualsiasi payload anomalo o non autorizzato:
    ```typescript
    import { z } from 'zod';
    
    // Schema rigoroso per la prenotazione di una stanza
    const BookRoomSchema = z.object({
        targetActivityId: z.string().min(1).max(200),
        turnId: z.string().min(1).max(50),
        assemblyId: z.string().min(1).max(200),
    });
    
    // Convalida dell'input all'ingresso della funzione
    const parseResult = BookRoomSchema.safeParse(data);
    if (!parseResult.success) {
        throw new Error("Parametri non validi.");
    }
    const { targetActivityId, turnId, assemblyId } = parseResult.data;
    ```

---

## 4. Gestione delle Sessioni e Cookie di Sicurezza

La persistenza delle sessioni segue gli standard moderni di hardening:
*   **HttpOnly**: I cookie di sessione non sono accessibili via JavaScript, azzerando il rischio di furto del token tramite un eventuale XSS.
*   **Secure**: I cookie vengono trasmessi esclusivamente su connessioni cifrate HTTPS.
*   **SameSite**: Impostato su `Lax` o `Strict` per mitigare i rischi di Cross-Site Request Forgery (CSRF).

---

## 5. Security Headers Consigliati per il Web Server (Hosting)

Per rinforzare le difese del browser, il server di hosting invia sempre i seguenti parametri nella risposta HTTP:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://apis.google.com; frame-src 'self' https://accounts.google.com;
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
```
