import admin from 'firebase-admin';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const serviceAccount = require("../service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupConfig() {
    console.log("Setting up config/main...");
    await db.collection('config').doc('main').set({
        currentTurn: "1"
    });
    console.log("Done!");
    process.exit(0);
}

setupConfig();
