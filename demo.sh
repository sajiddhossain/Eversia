#!/bin/bash
# ========================================================
# EVERSIA - Demo & Presentation Environment
# ========================================================

echo "🚀 Inizializzazione Ambiente Sicuro Serverless (MGA Presentation Mode)..."
echo "------------------------------------------------------------------"

# 1. Carica le credenziali super-admin dal file Service Account segreto ignorato da git
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account.json"
echo "✅ Credenziali Master di Google caricate nel sistema."

# 2. Assicuriamoci che il backend abbia tutte le dipendenze
echo "📦 Verifica e compilazione del Backend (Cloud Functions)..."
cd functions
npm install --silent
npm run build --silent
cd ..

# 3. Determina l'indirizzo IP locale per la connessione da smartphone
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

# 4. Avvia l'emulatore Cloud Functions in background (aprendo l'host a 0.0.0.0 per la LAN)
echo "☁️  Lancio Motore Cloud Functions Locale (Bypass Server Google)..."
cd functions
npx firebase-tools emulators:start --only functions &
EMULATOR_PID=$!
cd ..

# 5. Compila e avvia l'interfaccia React in modalità Preview
echo "⚛️  Compilazione dell'interfaccia Utente (React)..."
cd client
VITE_USE_EMULATOR=true npm run build --silent
echo "🚀 Avvio del server di presentazione (Preview)..."
npm run preview &
CLIENT_PID=$!
cd ..

echo "------------------------------------------------------------------"
echo "🎯 SISTEMA PRONTO E IN ESECUZIONE!"
echo "💻 Da questo computer: http://localhost:5173"
if [ ! -z "$LOCAL_IP" ]; then
    echo "📱 Da smartphone/tablet (stessa rete Wi-Fi): http://$LOCAL_IP:5173"
fi
echo ""
echo "💡 NOTA: Le Cloud Functions e il database locale sono accessibili tramite il proxy di Vite su una sola porta!"
echo "🛑 Premi CTRL+C in questa finestra per spegnere tutti i server in sicurezza."
echo "------------------------------------------------------------------"

# La funzione 'trap' prende il CTRL+C dell'utente e spegne tutti i processi attivi
trap "echo -e '\n🛑 Spegnimento dei motori in corso...'; kill $EMULATOR_PID $CLIENT_PID 2>/dev/null; exit" INT TERM
wait