import { 
  initializeTestEnvironment, 
  assertFails, 
  assertSucceeds, 
  RulesTestEnvironment 
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';
import { serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'demo-eversia-rules-test';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    const rulesPath = path.resolve(__dirname, '../firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  // Helper per ottenere contesto autenticato con email specifica
  function getAuthedDb(uid: string, email: string, role: string = 'STUDENT') {
    return testEnv.authenticatedContext(uid, {
      email: email,
      email_verified: true,
      role: role
    }).firestore();
  }

  // Helper per ottenere contesto anonimo
  function getUnauthedDb() {
    return testEnv.unauthenticatedContext().firestore();
  }

  describe('Global Authentication and Domain Rules', () => {
    it('Dovrebbe consentire la lettura della configurazione ad un utente istituzionale valido', async () => {
      const db = getAuthedDb('user_123', 'sajid@liceoagnesi.edu.it');
      const docRef = db.collection('config').doc('main');
      await assertSucceeds(docRef.get());
    });

    it('Dovrebbe VIETARE la lettura della configurazione ad un utente con dominio email generico', async () => {
      const db = getAuthedDb('user_123', 'sajid@gmail.com');
      const docRef = db.collection('config').doc('main');
      await assertFails(docRef.get());
    });

    it('Dovrebbe VIETARE la lettura della configurazione ad un utente non autenticato', async () => {
      const db = getUnauthedDb();
      const docRef = db.collection('config').doc('main');
      await assertFails(docRef.get());
    });
  });

  describe('Config & Admin Permissions', () => {
    it('Dovrebbe consentire ad un ADMIN di modificare il documento di config', async () => {
      const db = getAuthedDb('admin_user', 'admin@liceoagnesi.edu.it', 'ADMIN');
      const docRef = db.collection('config').doc('main');
      await assertSucceeds(docRef.set({ maintenance_mode: true }));
    });

    it('Dovrebbe VIETARE ad uno studente (STUDENT) di modificare il documento di config', async () => {
      const db = getAuthedDb('student_user', 'student@liceoagnesi.edu.it', 'STUDENT');
      const docRef = db.collection('config').doc('main');
      await assertFails(docRef.set({ maintenance_mode: true }));
    });
  });

  describe('Collection: Students (Anagrafica Studenti)', () => {
    const assemblyId = 'assembly_2026';
    const emailLower = 'sajid.hossain@liceoagnesi.edu.it';
    const studentId = `${assemblyId}_sajid_hossain`;

    it('Dovrebbe consentire allo studente di leggere il proprio anagrafica studente', async () => {
      const db = getAuthedDb('student_sajid', emailLower);
      
      // Prepariamo i dati come admin prima di testare la lettura dello studente
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('students').doc(studentId).set({
          email: emailLower,
          firstName: 'Sajid',
          lastName: 'Hossain',
          assemblyId: assemblyId,
          className: '5A'
        });
      });

      const docRef = db.collection('students').doc(studentId);
      await assertSucceeds(docRef.get());
    });

    it('Dovrebbe VIETARE allo studente di leggere l\'anagrafica di un altro studente', async () => {
      const db = getAuthedDb('student_sajid', emailLower);
      const anotherStudentId = `${assemblyId}_ludovico_rossi`;

      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await adminDb.collection('students').doc(anotherStudentId).set({
          email: 'ludovico.rossi@liceoagnesi.edu.it',
          firstName: 'Ludovico',
          lastName: 'Rossi',
          assemblyId: assemblyId,
          className: '5B'
        });
      });

      const docRef = db.collection('students').doc(anotherStudentId);
      await assertFails(docRef.get());
    });

    it('Dovrebbe consentire allo studente di creare il proprio record anagrafica se non pre-inietta scheduled_turns', async () => {
      const db = getAuthedDb('student_sajid', emailLower);
      const docRef = db.collection('students').doc(studentId);
      
      await assertSucceeds(docRef.set({
        email: emailLower,
        firstName: 'Sajid',
        lastName: 'Hossain',
        assemblyId: assemblyId,
        className: '5A'
      }));
    });

    it('Dovrebbe VIETARE allo studente di creare il proprio record anagrafica se tenta di iniettare scheduled_turns (anti-cheat)', async () => {
      const db = getAuthedDb('student_sajid', emailLower);
      const docRef = db.collection('students').doc(studentId);
      
      await assertFails(docRef.set({
        email: emailLower,
        firstName: 'Sajid',
        lastName: 'Hossain',
        assemblyId: assemblyId,
        className: '5A',
        scheduled_turns: { '1': 'room_gold' } // Trucco vietato
      }));
    });
  });

  describe('Collection: Leads Waiting List (Public Landing Page)', () => {
    it('Dovrebbe consentire a chiunque di registrarsi alla lista di attesa fornendo una mail valida', async () => {
      const db = getUnauthedDb();
      const docRef = db.collection('leads_waiting_list').doc('lead_new');
      
      await assertSucceeds(docRef.set({
        email: 'info@scuolatest.it',
        createdAt: serverTimestamp()
      }, { merge: false }));
    });

    it('Dovrebbe VIETARE la registrazione alla lista di attesa se la mail ha un formato invalido', async () => {
      const db = getUnauthedDb();
      const docRef = db.collection('leads_waiting_list').doc('lead_invalid');
      
      await assertFails(docRef.set({
        email: 'email_non_valida',
        createdAt: serverTimestamp()
      }));
    });

    it('Dovrebbe VIETARE a utenti non autenticati o studenti di listare i leads', async () => {
      const db = getAuthedDb('student_user', 'student@liceoagnesi.edu.it');
      await assertFails(db.collection('leads_waiting_list').get());
    });

    it('Dovrebbe consentire all\'ADMIN di leggere la lista dei leads', async () => {
      const db = getAuthedDb('admin_user', 'admin@liceoagnesi.edu.it', 'ADMIN');
      await assertSucceeds(db.collection('leads_waiting_list').get());
    });
  });

  describe('Collection: Rooms (Stanze & Iscrizioni)', () => {
    const roomId = 'room_aula_magna';

    it('Dovrebbe consentire ad un utente autenticato di leggere le stanze', async () => {
      const db = getAuthedDb('student_user', 'student@liceoagnesi.edu.it');
      const docRef = db.collection('rooms').doc(roomId);
      await assertSucceeds(docRef.get());
    });

    it('Dovrebbe VIETARE ad un utente non autenticato di leggere le stanze', async () => {
      const db = getUnauthedDb();
      const docRef = db.collection('rooms').doc(roomId);
      await assertFails(docRef.get());
    });

    it('Dovrebbe consentire ad un ADMIN di creare una stanza', async () => {
      const db = getAuthedDb('admin_user', 'admin@liceoagnesi.edu.it', 'ADMIN');
      const docRef = db.collection('rooms').doc(roomId);
      await assertSucceeds(docRef.set({
        name: 'Aula Magna',
        capacity: 100,
        assemblyId: 'assembly_2026'
      }));
    });

    it('Dovrebbe VIETARE ad uno studente di creare una stanza', async () => {
      const db = getAuthedDb('student_user', 'student@liceoagnesi.edu.it', 'STUDENT');
      const docRef = db.collection('rooms').doc(roomId);
      await assertFails(docRef.set({
        name: 'Aula Magna',
        capacity: 100,
        assemblyId: 'assembly_2026'
      }));
    });
  });
});
