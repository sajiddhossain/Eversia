import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import type { EventLogEntry, EventType, AuditAction } from "../types";

/**
 * Log a real-time event (check-in, transfer, gatecrasher, etc.)
 * These are displayed in the Live Activity Feed.
 */
export const logEvent = async (entry: Omit<EventLogEntry, 'id' | 'timestamp'>) => {
    try {
        // Strip undefined values to avoid Firebase exceptions
        const cleanEntry = Object.fromEntries(
            Object.entries(entry).filter(([, v]) => v !== undefined)
        );

        await addDoc(collection(db, "event_log"), {
            ...cleanEntry,
            timestamp: Date.now(),
        });
    } catch (e) {
        console.error("[EventLog] Failed to write:", e);
    }
};

/**
 * Log an admin/system action for the audit trail.
 * These are displayed in System Settings > Audit Log.
 */
export const logAudit = async (
    action: AuditAction,
    actor: string,
    details: string,
    assemblyId?: string,
    targetId?: string
) => {
    try {
        await addDoc(collection(db, "audit_log"), {
            action,
            actor,
            details,
            assemblyId: assemblyId || null,
            targetId: targetId || null,
            timestamp: Date.now(),
        });
    } catch (e) {
        console.error("[AuditLog] Failed to write:", e);
    }
};

/** Helper to build event type label in Italian */
export const eventTypeLabel = (type: EventType): string => {
    const map: Record<EventType, string> = {
        CHECK_IN: "Check-in",
        CHECK_OUT: "Uscita",
        TRANSFER: "Trasferimento",
        GATECRASHER_DETECTED: "Imbucato",
        FORCED_ENTRY: "Ingresso Forzato",
    };
    return map[type] || type;
};

/** Helper to build audit action label in Italian */
export const auditActionLabel = (action: AuditAction): string => {
    const map: Record<AuditAction, string> = {
        ASSEMBLY_CREATED: "Assemblea Creata",
        ASSEMBLY_UPDATED: "Assemblea Aggiornata",
        ASSEMBLY_DELETED: "Assemblea Eliminata",
        ACTIVITY_CREATED: "Attività Creata",
        ACTIVITY_UPDATED: "Attività Aggiornata",
        ACTIVITY_DELETED: "Attività Eliminata",
        ROLE_ASSIGNED: "Ruolo Assegnato",
        ROLE_REMOVED: "Ruolo Rimosso",
        ADMIN_ADDED: "Admin Aggiunto",
        ADMIN_REMOVED: "Admin Rimosso",
        ANNOUNCEMENT_SENT: "Annuncio Inviato",
        TEMPLATE_SAVED: "Template Salvato",
        PHASE_CHANGED: "Fase Cambiata",
        CONFIG_CHANGED: "Configurazione Cambiata",
        BULK_IMPORT: "Importazione Massiva",
        INTEGRITY_COMMAND_syncRoomCounts: "Sincronizzazione Conteggi Aule",
        INTEGRITY_COMMAND_purgeGhostUsers: "Rimozione Utenti Fantasma",
        INTEGRITY_COMMAND_forceResetTurn: "Reset Forzato Turno",
        INTEGRITY_COMMAND_emergencyEject: "Espulsione d'Emergenza Aula",
        INTEGRITY_COMMAND_recalculateGamificationStats: "Ricalcolo Gamification Utenti",
        BADGE_CREATED: "Template Badge Creato",
        BADGE_DELETED: "Template Badge Eliminato",
        BADGE_AWARDED: "Badge Assegnato Manualmente",
        BADGE_REVOKED: "Badge Revocato",
        TEMPLATE_DELETED: "Template Assemblea Eliminato",
        WIPE_DATABASE: "Reset Totale Database",
        STAFF_CHECKIN: "Presenza Staff Registrata",
        STAFF_CHECKOUT: "Assenza Staff Registrata",
    };
    return map[action] || action;
};
