import type { BadgeRarity } from '../types';

// ── Level Calculation ──
// Level = floor(sqrt(xp / 100))
// XP for Level N = N² × 100

export const calculateLevel = (xp: number): number => {
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
};

export const xpForLevel = (level: number): number => {
    return level === 1 ? 0 : level * level * 100;
};

export const xpProgress = (xp: number): { current: number; needed: number; percent: number } => {
    const level = calculateLevel(xp);
    const currentLevelXP = xpForLevel(level);
    const nextLevelXP = xpForLevel(level + 1);
    const progress = xp - currentLevelXP;
    const needed = nextLevelXP - currentLevelXP;
    return {
        current: progress,
        needed,
        percent: Math.min(100, Math.round((progress / needed) * 100))
    };
};

// ── Level Names ──
const LEVEL_NAMES: [number, string][] = [
    [50, 'Mitologico'],
    [30, 'Maestro'],
    [20, 'Leggenda'],
    [15, 'Campione'],
    [10, 'Veterano'],
    [7, 'Esperto'],
    [5, 'Esploratore'],
    [3, 'Apprendista'],
    [1, 'Novizio'],
];

export const getLevelName = (level: number): string => {
    for (const [threshold, name] of LEVEL_NAMES) {
        if (level >= threshold) return name;
    }
    return 'Novizio';
};

// ── Level Colors ──
export const getLevelColor = (level: number): string => {
    if (level >= 30) return 'from-yellow-400 via-amber-500 to-orange-600';
    if (level >= 20) return 'from-purple-400 via-fuchsia-500 to-pink-600';
    if (level >= 15) return 'from-rose-400 via-red-500 to-orange-500';
    if (level >= 10) return 'from-blue-400 via-cyan-400 to-teal-400';
    if (level >= 7) return 'from-emerald-400 via-green-400 to-lime-400';
    if (level >= 5) return 'from-sky-400 to-blue-500';
    if (level >= 3) return 'from-slate-300 to-slate-500';
    return 'from-zinc-400 to-zinc-600';
};

// ── Rarity Styles ──
export const RARITY_CONFIG: Record<BadgeRarity, {
    label: string;
    cardClass: string;
    iconClass: string;
    glowClass: string;
    borderGlow: string;
}> = {
    COMMON: {
        label: 'Comune',
        cardClass: 'bg-white/[0.03] border-white/10 text-white/50',
        iconClass: 'text-white/30',
        glowClass: '',
        borderGlow: '',
    },
    UNCOMMON: {
        label: 'Non Comune',
        cardClass: 'bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-400',
        iconClass: 'text-emerald-400/50',
        glowClass: '',
        borderGlow: '',
    },
    RARE: {
        label: 'Raro',
        cardClass: 'bg-blue-500/[0.05] border-blue-500/25 text-blue-400',
        iconClass: 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]',
        glowClass: 'bg-blue-500/5',
        borderGlow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
    },
    EPIC: {
        label: 'Epico',
        cardClass: 'bg-purple-500/[0.06] border-purple-500/30 text-purple-400',
        iconClass: 'text-purple-400 animate-pulse drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]',
        glowClass: 'bg-purple-500/10',
        borderGlow: 'shadow-[0_0_25px_rgba(168,85,247,0.2)]',
    },
    LEGENDARY: {
        label: 'Leggendario',
        cardClass: 'bg-primary/[0.06] border-primary/40 text-primary',
        iconClass: 'text-primary animate-bounce drop-shadow-[0_0_16px_rgba(226,243,60,0.6)]',
        glowClass: 'bg-primary/10',
        borderGlow: 'shadow-[0_0_35px_rgba(226,243,60,0.25)]',
    },
};

// ── XP Economy ──
export const XP_VALUES = {
    CHECK_IN: 250, // XP per turn (assembly)
    ASSEMBLY_COMPLETED: 1000, // full assembly (3 turns * 250 + 250 bonus)
    STREAK_MULTIPLIER: 1, // streak * 1 (max 4 bonus)
    FRIEND_ADDED: 10,
    BADGE_RARE: 400,
    BADGE_EPIC: 800,
    BADGE_LEGENDARY: 1500,
    DAILY_LOGIN: 1, // base daily check-in XP
} as const;

/**
 * Calculates XP earned for a daily streak check-in.
 * Economy: base 1 XP + 1 XP per streak day beyond the first, capped at 4 bonus (max 5 XP/day).
 * Example: day 1 → 1 XP, day 2 → 2 XP, day 5+ → 5 XP.
 */
export const calculateStreakXP = (newStreak: number): number => {
    const base = XP_VALUES.DAILY_LOGIN;           // 1
    const bonus = Math.min(newStreak - 1, 4);     // 0..4
    return base + bonus;                           // 1..5
};

// ── Cover Color Presets ──
export const COVER_PRESETS = [
    { id: 'midnight', gradient: 'from-slate-900 via-blue-950 to-slate-900', label: 'Mezzanotte' },
    { id: 'aurora', gradient: 'from-emerald-900 via-teal-800 to-cyan-900', label: 'Aurora' },
    { id: 'sunset', gradient: 'from-orange-900 via-rose-900 to-purple-950', label: 'Tramonto' },
    { id: 'ocean', gradient: 'from-blue-900 via-indigo-900 to-violet-950', label: 'Oceano' },
    { id: 'forest', gradient: 'from-green-950 via-emerald-900 to-teal-950', label: 'Foresta' },
    { id: 'volcano', gradient: 'from-red-950 via-orange-900 to-amber-950', label: 'Vulcano' },
    { id: 'galaxy', gradient: 'from-violet-950 via-purple-900 to-fuchsia-950', label: 'Galassia' },
    { id: 'arctic', gradient: 'from-cyan-950 via-sky-900 to-blue-950', label: 'Artico' },
    { id: 'noir', gradient: 'from-neutral-950 via-stone-900 to-neutral-950', label: 'Noir' },
    { id: 'lime', gradient: 'from-lime-950 via-green-900 to-emerald-950', label: 'Lime' },
] as const;

export const getCoverGradient = (coverId?: string): string => {
    const preset = COVER_PRESETS.find(p => p.id === coverId);
    return preset?.gradient || COVER_PRESETS[0].gradient;
};

// ── Badge Category Labels ──
export const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
    PARTICIPATION: { label: 'Partecipazione', emoji: '🎯' },
    ACHIEVEMENT: { label: 'Achievement', emoji: '🏆' },
    SOCIAL: { label: 'Social', emoji: '👥' },
    SPECIAL: { label: 'Speciali', emoji: '⭐' },
    STAFF: { label: 'Staff', emoji: '🛡️' },
};
