import { initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';

const serviceAccountPath = '/Users/sajid/Documents/eversia/service-account.json';

if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Service account not found.");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeAdminApp({
    credential: cert(serviceAccount)
});

const adminAuth = getAdminAuth();

const firebaseConfig = {
    apiKey: "AIzaSyATuFmxIcrASA5Pis83an9OfpMVj6yZnNk",
    authDomain: "mga-assembly-manager.firebaseapp.com",
    projectId: "mga-assembly-manager",
    storageBucket: "mga-assembly-manager.firebasestorage.app",
    messagingSenderId: "276309572821",
    appId: "1:276309572821:web:837996798731dc83a2765c"
};

const clientApp = initializeClientApp(firebaseConfig);
const clientAuth = getClientAuth(clientApp);
const clientDb = getFirestore(clientApp);

async function runTest() {
    try {
        const uid = 'Tf31xDHSH5egCbTgu2fFoXUM12I3';
        const email = 'sajd.hossain@liceoagnesi.edu.it';
        console.log(`Generating custom token for ${email}...`);
        const customToken = await adminAuth.createCustomToken(uid, { email });
        
        console.log("Signing in with custom token on Client SDK...");
        const userCredential = await signInWithCustomToken(clientAuth, customToken);
        console.log("Signed in successfully as:", userCredential.user.email);
        
        console.log("Running query: query(collection(db, 'users'), where('role', '==', 'STUDENT'))...");
        const q = query(collection(clientDb, "users"), where("role", "==", "STUDENT"));
        const snap = await getDocs(q);
        console.log(`Success! Found ${snap.size} students.`);
        snap.docs.slice(0, 5).forEach(doc => {
            console.log(`- ${doc.id}: ${doc.data().email} (${doc.data().role})`);
        });

        const assemblyId = 'ai_0410_ZLKB';
        console.log(`Running query: query(collection(db, 'assembly_roles'), where('assemblyId', '==', '${assemblyId}'))...`);
        const qRoles = query(collection(clientDb, "assembly_roles"), where("assemblyId", "==", assemblyId));
        const rolesSnap = await getDocs(qRoles);
        console.log(`Success! Found ${rolesSnap.size} roles.`);
        rolesSnap.docs.forEach(doc => {
            console.log(`- Role doc ID: ${doc.id}, Email: ${doc.data().email}, Role: ${doc.data().role}`);
        });
    } catch (error) {
        console.error("❌ Test failed with error:", error);
    }
    process.exit(0);
}

runTest();
