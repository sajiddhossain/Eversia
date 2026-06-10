import admin from 'firebase-admin';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const serviceAccount = require("../service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
    console.log("Checking activities...");
    const activities = await db.collection('activities').get();
    console.log(`Found ${activities.size} activities.`);
    activities.forEach(doc => console.log(doc.id, doc.data()));

    console.log("\nChecking students...");
    const students = await db.collection('students').limit(5).get();
    console.log(`Found ${students.size} students (sample).`);
    students.forEach(doc => console.log(doc.id, doc.data()));

    process.exit(0);
}

checkData();
