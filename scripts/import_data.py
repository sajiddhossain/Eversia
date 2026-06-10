import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import os
import random
import string
import uuid # Per creare ID univoci più robusti

# --- CONFIGURAZIONE INIZIALE ---
SERVICE_ACCOUNT_PATH = "service-account.json"
CSV_PATH = "data_sample.csv" # Assicurati che il tuo file CSV si chiami così o modificalo

def generate_pin():
    """Genera un codice PIN numerico casuale di 6 cifre per l'accesso all'aula (SECURITY FIX M10)."""
    return ''.join(random.choices(string.digits, k=6))

def import_and_setup_firebase():
    """
    Importa il CSV, crea i profili studenti e configura le sessioni/aule iniziali su Firestore.
    """
    print("--- Avvio Configurazione eversia ---")
    
    # 1. Inizializzazione Firebase
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        print(f"\nERRORE: File '{SERVICE_ACCOUNT_PATH}' non trovato.")
        print("Scarica le credenziali dal Firebase Console (Project Settings > Service accounts) e rinominale.")
        return

    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase inizializzato con successo.")
    except Exception as e:
        print(f"Errore durante l'inizializzazione di Firebase: {e}")
        return

    # Recupera ID assemblea attiva o di fallback (H-04)
    assembly_id = None
    try:
        config_snap = db.collection('config').document('main').get()
        if config_snap.exists:
            assembly_id = config_snap.to_dict().get('activeAssemblyId')
        
        if not assembly_id:
            assemblies = list(db.collection('assemblies').limit(1).stream())
            if assemblies:
                assembly_id = assemblies[0].id
            else:
                assembly_id = "default_assembly"
    except Exception as e:
        print(f"Avviso durante il recupero dell'assemblyId: {e}. Usato fallback 'default_assembly'.")
        assembly_id = "default_assembly"

    print(f"ID Assemblea Target: {assembly_id}")

    # 2. Importazione e Pulizia CSV
    if not os.path.exists(CSV_PATH):
        print(f"\nERRORE: File CSV '{CSV_PATH}' non trovato. Assicurati che esista.")
        return
        
    try:
        df = pd.read_csv(CSV_PATH)
        print(f"CSV importato. Trovate {len(df)} righe.")
    except Exception as e:
        print(f"Errore durante la lettura del CSV: {e}")
        return

    # Set per tracciare le attività univoche per creare le stanze una sola volta
    unique_activities = {} # Chiave: (Nome Attività, Turno) -> ID_Stanza

    for index, row in df.iterrows():
        email = str(row['Indirizzo email']).strip().lower()
        
        # Tenta di estrarre nome e cognome dall'email (LOGICA DA AFFINARE IN BASE AI NOMI REALI)
        try:
            email_base = email.split('@')[0]
            # Nel tuo esempio, sembra esserci il formato nome.cognome o simile.
            # Useremo questa logica come base, ma va testata sui dati reali.
            parts = email_base.split('.')
            first_name = parts[0].capitalize()
            last_name = parts[1].capitalize() if len(parts) > 1 else "NomeSconosciuto"
        except Exception:
            first_name = "Studente"
            last_name = f"Anonimo_{index}"

        # 3. Dati dello Studente: Stato Iniziale (Non in aula, Non ancora in presenza)
        scheduled_turns = {
            '1': str(row['PRIMO TURNO']).strip() if pd.notna(row['PRIMO TURNO']) and str(row['PRIMO TURNO']).strip() else None,
            '2': str(row['SECONDO TURNO']).strip() if pd.notna(row['SECONDO TURNO']) and str(row['SECONDO TURNO']).strip() else None,
            '3': str(row['TERZO TURNO']).strip() if pd.notna(row['TERZO TURNO']) and str(row['TERZO TURNO']).strip() else None
        }
        
        student_data = {
            'email': email,
            'firstName': first_name,
            'lastName': last_name,
            'assemblyId': assembly_id,
            'scheduled_turns': scheduled_turns,
            'actual_location': None # { 'room_id': '...', 'checked_in': True/False }
        }
        
        # Salva/Aggiorna Studente (H-04 FIX: Usa {assemblyId}_{email})
        student_id = f"{assembly_id}_{email}"
        db.collection('students').document(student_id).set(student_data)
        
        # 4. Configurazione delle Sessioni/Aule (Rooms)
        for turn_id, activity_name in scheduled_turns.items():
            if activity_name:
                # Creazione di un ID unico per la sessione: nome_pulito_turn
                safe_name = activity_name.replace("'", "").replace(":", "").replace("/", "").replace(" ", "_").lower()
                room_id = f"T{turn_id}_{safe_name}"
                
                if (activity_name, turn_id) not in unique_activities:
                    
                    # Genera il PIN solo al momento della creazione della sessione
                    pin = generate_pin() 
                    
                    unique_activities[(activity_name, turn_id)] = room_id

                    # Crea la sessione nella collezione 'rooms'
                    db.collection('rooms').document(room_id).set({
                        'activity_name': activity_name,
                        'turn_id': turn_id,
                        'room_name': "DA ASSEGNARE", # Questo sarà impostato manualmente dai Rappresentanti nel pannello Admin
                        'max_capacity': 30,         # CAPACITÀ DI DEFAULT
                        'current_count': 0,
                        'access_pin': pin,
                        'assemblyId': assembly_id   # Aggiunto assemblyId anche qui
                    })
                    print(f"  -> Sessione/Aula creata: {room_id} (PIN per relatori: {pin})")

    print("\n--- Setup COMPLETATO ---")
    print("Dati studenti e Sessioni Aule caricati su Firestore.")
    print("PROSSIMO PASSO: Configurare manualmente le 'room_name' e verificare le 'max_capacity' nel pannello Admin.")


if __name__ == "__main__":
    import_and_setup_firebase()