export interface Student {
    id: string; // assemblyId_email
    email: string;
    firstName: string;
    lastName: string;
    assemblyId: string;
    scheduled_turns: {
        [key: string]: string | null; // turnId: activity_id
    };
    actual_location: {
        [key: string]: {
            activity_id: string;
            checked_in: boolean;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            timestamp?: any;
            markedBy?: string;
            markedAt?: string;
            rating?: number; // 1-5 stars
            gatecrasher?: boolean;
        } | null;
    } | null;
    staff_actual_location?: {
        [key: string]: {
            activity_id: string;
            checked_in: boolean;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            timestamp?: any;
            markedBy?: string;
            markedAt?: string;
        } | null;
    } | null;
    className?: string;
    is_finalized?: boolean;
    last_booking_at?: number;
}

export interface Activity {
    id: string; // roomId or activityId
    assemblyId: string;
    name: string; // Will act as Educational Activity Name
    room_name?: string; // e.g., "Aula 101"
    room_manager_email?: string;
    turn_id?: string; // Legacy
    turn_ids: string[]; // New: support multiple turns
    location_name: string;
    max_capacity: number;
    current_count?: number; // Legacy global count, will be phased out
    counts_by_turn?: { [turnId: string]: number }; // New: track bookings per turn
    access_pin: string;
    description?: string;
    rating_stats?: {
        average: number;
        count: number;
        sum: number;
    };
    location_floor?: string;
    location_number?: string;
}

export interface Assembly {
    id: string;
    name: string;
    date?: string;
    description?: string;
    themeColor?: string;
    status: 'CHIUSO' | 'ISCRIZIONI_APERTE' | 'ATTIVA' | 'ARCHIVIATA';
    createdAt: number;
    tags?: string[];
    turn_schedules?: { [turnId: string]: { start: string; end: string } };
    maxStudents?: number;
    bannerMessage?: string;
    bannerActive?: boolean;
    bannerImageUrl?: string;
    internalNotes?: string;
    turn_ids?: string[];
}

export interface Room {
    id: string; // assemblyId_roomName
    assemblyId: string;
    name: string;
    capacity: number;
    notes?: string;
    isAccessible?: boolean;
    floor?: string;
    room_number?: string;
}

export interface AdminUser {
    id: string; // uid
    email: string;
    role: 'ADMIN' | 'SVILUPPATORE';
    addedAt: number;
}

export interface AssemblyRole {
    id: string; // assemblyId_emailPrefix
    assemblyId: string;
    email: string;
    role: 'SECURITY' | 'ROOM_MANAGER';
    activityId?: string; // Only for ROOM_MANAGER
    assignedAt: number;
}

export interface AppConfig {
    currentTurn: string;
    activeAssemblyId?: string;
    cancellation_deadline_minutes?: number;
    email_bridge_url?: string;
    maintenance_mode?: boolean;
    lock_registrations?: boolean;
    registration_throttle_ms?: number;
    security_pin?: string;
    email_api_key?: string;
}

// SECURITY: Campi sensibili separati dal config pubblico.
// Accessibili solo tramite la collezione config_secrets (regole: isAdmin()).
export interface SecretConfig {
    security_pin?: string;
    email_api_key?: string;
}

export type UserRole = 'SVILUPPATORE' | 'ADMIN' | 'ROOM_MANAGER' | 'SECURITY' | 'STUDENT';

export type BadgeRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type BadgeCategory = 'SOCIAL' | 'PARTICIPATION' | 'ACHIEVEMENT' | 'SPECIAL' | 'STAFF' | 'SECURITY';
export type BadgeCriteriaType = 'XP_THRESHOLD' | 'ASSEMBLY_COUNT' | 'STREAK' | 'FRIEND_COUNT' | 'CHECKIN_COUNT' | 'SECURITY_INSPECTIONS' | 'STAFF_ASSEMBLIES_COUNT' | 'MANUAL';

export interface BadgeTemplate {
    id: string;
    name: string;
    description: string;
    iconName: string; // Lucide icon reference
    emoji?: string | null; // Emoji fallback
    rarity: BadgeRarity;
    category: BadgeCategory;
    isAssemblySpecific: boolean;
    linkedAssemblyId?: string | null;
    criteria?: {
        type: BadgeCriteriaType;
        value?: number;
    };
    maxSupply?: number | null; // null = unlimited
    currentSupply?: number;
    colorScheme: {
        text: string;
        background: string;
        border: string;
    };
    createdAt: number;
    createdBy: string;
}

export interface FriendRequest {
    from: string; // uid
    to: string;   // uid
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: number;
    isSpamFlagged?: boolean;
}

export interface EarnedBadge {
    badgeId: string;
    awardedAt: number;
    awardedBy: string; // admin uid
    assemblyId?: string | null; // linked to event if isAssemblySpecific is true
    customMessage?: string | null;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    className?: string; // e.g. "4A", "5B"
    blockedUsers?: string[];
    role: UserRole;
    
    // Identity & Customization
    username: string; // e.g. @sajid.hossain.2403
    bio?: string;
    birthday?: number;
    themeAccent?: string;
    coverColor?: string; // Gradient preset key
    
    // Username Logic
    usernameLastChanged?: number;
    canChangeUsernameAt?: number;
    isFirstUsernameChange: boolean;

    // Display Name Logic
    displayNameLastChanged?: number;
    canChangeDisplayNameAt?: number;
    isFirstDisplayNameChange?: boolean;

    // Privacy Controls
    isPrivate?: boolean;
    showBirthday?: boolean;
    showEmail?: boolean;
    privacyAccepted?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    privacyAcceptedAt?: any; // Can be number or Firestore Timestamp

    // Permissions & Performance
    delegatedRooms?: string[]; 

    // Gamification Engine
    xp: number;
    level: number;
    streak: number;
    lastStreakDate?: number;
    totalAssemblies: number;
    totalCheckIns: number;
    pinnedBadges?: string[]; // Up to 3 badge IDs to showcase
    securityInspections?: number;
    staffAssemblies?: string[];
    staffAssembliesCount?: number;

    // Social
    friends: string[];
    friendCount: number;
    earnedBadges: EarnedBadge[];
    
    // Timestamps
    lastLogin: number;
    createdAt: number;
}

// ── XP & Gamification ──

export type XPSource = 'CHECK_IN' | 'BADGE_EARNED' | 'STREAK_BONUS' | 'ADMIN_GRANT' | 'FRIEND_ADDED' | 'ASSEMBLY_COMPLETED' | 'DAILY_LOGIN';

export interface XPEvent {
    id?: string;
    uid: string;
    amount: number;
    reason: string;
    source: XPSource;
    assemblyId?: string;
    timestamp: number;
}

// ── New Feature Types ──

export type EventType = 'CHECK_IN' | 'CHECK_OUT' | 'TRANSFER' | 'GATECRASHER_DETECTED' | 'FORCED_ENTRY';

export interface EventLogEntry {
    id?: string;
    assemblyId: string;
    type: EventType;
    studentName: string;
    studentEmail: string;
    activityName: string;
    activityId: string;
    turnId: string;
    markedBy: string;
    previousActivity?: string;
    timestamp: number;
}

export type AuditAction =
    | 'ASSEMBLY_CREATED' | 'ASSEMBLY_UPDATED' | 'ASSEMBLY_DELETED'
    | 'ACTIVITY_CREATED' | 'ACTIVITY_UPDATED' | 'ACTIVITY_DELETED'
    | 'ROLE_ASSIGNED' | 'ROLE_REMOVED'
    | 'ADMIN_ADDED' | 'ADMIN_REMOVED'
    | 'ANNOUNCEMENT_SENT' | 'TEMPLATE_SAVED'
    | 'PHASE_CHANGED' | 'CONFIG_CHANGED'
    | 'BULK_IMPORT'
    | 'INTEGRITY_COMMAND_syncRoomCounts'
    | 'INTEGRITY_COMMAND_purgeGhostUsers'
    | 'INTEGRITY_COMMAND_forceResetTurn'
    | 'INTEGRITY_COMMAND_emergencyEject'
    | 'INTEGRITY_COMMAND_recalculateGamificationStats'
    | 'BADGE_CREATED' | 'BADGE_DELETED' | 'BADGE_AWARDED' | 'BADGE_REVOKED'
    | 'TEMPLATE_DELETED' | 'WIPE_DATABASE' | 'STAFF_CHECKIN' | 'STAFF_CHECKOUT';

export interface AuditLogEntry {
    id?: string;
    action: AuditAction;
    actor: string; // email of who performed the action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: any;
    assemblyId?: string;
    targetId?: string;
    timestamp: number;
}

export interface Announcement {
    id?: string;
    assemblyId: string;
    message: string;
    priority: 'info' | 'warning' | 'urgent';
    createdBy: string;
    createdAt: number;
    active: boolean;
}

export interface AssemblyTemplate {
    id?: string;
    name: string;
    description?: string;
    activities: Array<{
        name: string;
        location_name: string;
        turn_ids: string[];
        max_capacity: number;
    }>;
    createdBy: string;
    createdAt: number;
}

export interface AssemblySchedule {
    enrollmentOpen?: string;  // ISO datetime
    assemblyStart?: string;   // ISO datetime
    assemblyEnd?: string;     // ISO datetime
}
