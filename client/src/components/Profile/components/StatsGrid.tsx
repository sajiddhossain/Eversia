import React from 'react';
import { motion } from 'framer-motion';
import type { UserProfile } from '../../../types';
import { Flame, Trophy, Users } from 'lucide-react';

interface StatsGridProps {
    profile: UserProfile;
    onStatClick?: (label: 'BADGES' | 'SOCIAL') => void;
    isLocked?: boolean;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ profile, onStatClick, isLocked }) => {
    const stats = [
        {
            id: 'STREAK' as const,
            value: isLocked ? '—' : String(profile.streak || 0),
            label: 'Streak',
            icon: Flame,
            iconClass: 'text-orange-500 group-hover:animate-pulse group-hover:scale-110 duration-300',
            cardStyle: 'hover:border-orange-500/30 hover:bg-orange-500/[0.02] hover:shadow-[0_8px_20px_rgba(249,115,22,0.1)]',
        },
        {
            id: 'BADGES' as const,
            value: isLocked ? '🔒' : String(profile.earnedBadges?.length || 0),
            label: 'Badge',
            icon: Trophy,
            iconClass: 'text-amber-400 group-hover:rotate-12 transition-transform duration-300',
            cardStyle: 'hover:border-amber-400/30 hover:bg-amber-400/[0.02] hover:shadow-[0_8px_20px_rgba(234,179,8,0.1)]',
        },
        {
            id: 'SOCIAL' as const,
            value: isLocked ? '🔒' : String(profile.friends?.length ?? profile.friendCount ?? 0),
            label: 'Amici',
            icon: Users,
            iconClass: 'text-cyan-400 group-hover:scale-110 transition-transform duration-300',
            cardStyle: 'hover:border-cyan-400/30 hover:bg-cyan-400/[0.02] hover:shadow-[0_8px_20px_rgba(6,182,212,0.1)]',
        },
    ];

    return (
        <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 py-2 w-full select-none">
            {stats.map((stat, i) => {
                const isClickable = !isLocked && onStatClick && stat.id !== 'STREAK';
                const Icon = stat.icon;
                const baseClass = `flex-1 flex flex-col items-center group transition-all duration-300 bg-white/[0.02] border border-white/5 rounded-2xl py-3 px-2 md:px-6 shadow-inner backdrop-blur-md min-w-[75px] md:min-w-[110px] ${
                    isClickable 
                        ? `cursor-pointer ${stat.cardStyle}` 
                        : `cursor-default ${stat.id === 'STREAK' && !isLocked ? stat.cardStyle : ''}`
                }`;

                const innerContent = (
                    <>
                        <Icon className={`w-5 h-5 mb-1.5 transition-all ${stat.iconClass}`} />
                        <span className="text-lg md:text-xl font-mono font-bold tracking-tight text-white tabular-nums">
                            {stat.value}
                        </span>
                        <span className="text-[10px] font-semibold font-display tracking-wide text-white/30 mt-1.5 group-hover:text-white/50 transition-colors">
                            {stat.label}
                        </span>
                    </>
                );

                if (isClickable) {
                    return (
                        <motion.button
                            key={i}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onStatClick?.(stat.id as any)}
                            className={baseClass}
                        >
                            {innerContent}
                        </motion.button>
                    );
                }

                return (
                    <motion.div
                        key={i}
                        whileHover={stat.id === 'STREAK' && !isLocked ? { scale: 1.03, y: -2 } : undefined}
                        className={baseClass}
                    >
                        {innerContent}
                    </motion.div>
                );
            })}
        </div>
    );
};
