/**
 * Application Roles
 */
export const ROLES = {
    STUDENT: 'STUDENT',
    ADMIN: 'ADMIN',
    SVILUPPATORE: 'SVILUPPATORE',
    ROOM_MANAGER: 'ROOM_MANAGER',
    SECURITY: 'SECURITY',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Assembly Statuses
 */
export const ASSEMBLY_STATUS = {
    CHIUSO: 'CHIUSO',
    ISCRIZIONI_APERTE: 'ISCRIZIONI_APERTE',
    ATTIVA: 'ATTIVA',
    ARCHIVIATA: 'ARCHIVIATA',
} as const;

export type AssemblyStatus = typeof ASSEMBLY_STATUS[keyof typeof ASSEMBLY_STATUS];

/**
 * System Configuration Defaults
 */
export const CONFIG = {
    REQUIRED_DOMAIN: '@liceoagnesi.edu.it',
    DEFAULT_TURN: '1',
} as const;
