import React from 'react';
import type { EarnedBadge, BadgeTemplate } from '../../../types';
import { Trophy, Flame } from 'lucide-react';

interface BadgeStatsProps {
    earnedBadges: EarnedBadge[];
    templates: Record<string, BadgeTemplate>;
}

const RARITY_POINTS: Record<string, number> = {
    'COMMON': 1,
    'UNCOMMON': 2,
    'RARE': 5,
    'EPIC': 10,
    'LEGENDARY': 25
};

const RARITY_COLORS: Record<string, string> = {
    'COMMON': 'bg-white/20',
    'UNCOMMON': 'bg-emerald-400',
    'RARE': 'bg-blue-400',
    'EPIC': 'bg-purple-400',
    'LEGENDARY': 'bg-primary'
};

export const BadgeStats: React.FC<BadgeStatsProps> = ({ earnedBadges, templates }) => {
    const totalScore = earnedBadges.reduce((acc, b) => {
        const rarity = templates[b.badgeId]?.rarity || 'COMMON';
        return acc + (RARITY_POINTS[rarity] || 1);
    }, 0);

    const rarityCounts = earnedBadges.reduce((acc, b) => {
        const rarity = templates[b.badgeId]?.rarity || 'COMMON';
        acc[rarity] = (acc[rarity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalCount = earnedBadges.length;
    const systemTotal = Object.keys(templates).length || 1;
    const completionRate = Math.min(100, Math.round((totalCount / systemTotal) * 100));

    let collectorRank = 'Novizio';
    if (completionRate > 90) collectorRank = 'Leggendario';
    else if (completionRate > 60) collectorRank = 'Elite';
    else if (completionRate > 30) collectorRank = 'Veterano';
    else if (completionRate > 10) collectorRank = 'Esploratore';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-in slide-in-from-top-6 duration-700">
            {/* Total Points */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 lg:p-8 flex items-center gap-6 group hover:bg-white/[0.05] transition-all duration-500 shadow-xl hover:shadow-primary/5">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 transition-transform group-hover:scale-110">
                    <Flame className="w-7 h-7 text-primary animate-pulse" />
                </div>
                <div>
                    <p className="text-xs font-semibold font-display text-white/40 mb-0.5">Badge score</p>
                    <p className="text-3xl font-bold font-display text-white tracking-tight tabular-nums">{totalScore.toLocaleString()}</p>
                </div>
            </div>

            {/* Total Count & Completion */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 lg:p-8 flex flex-col justify-between gap-4 group hover:bg-white/[0.05] transition-all duration-500 shadow-xl hover:shadow-blue-500/5">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 transition-transform group-hover:scale-110 flex-shrink-0">
                        <Trophy className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold font-display text-white/40 mb-0.5">
                            Collezione • <span className="text-blue-400">{collectorRank}</span>
                        </p>
                        <p className="text-2xl font-bold font-display text-white tracking-tight tabular-nums">
                            {totalCount} / {systemTotal} <span className="text-xs text-white/40 font-semibold font-display ml-1 select-none">badge</span>
                        </p>
                    </div>
                </div>
                {/* Visual progress bar */}
                <div className="space-y-1.5 w-full">
                    <div className="flex justify-between text-[10px] font-semibold font-display text-white/30">
                        <span>Avanzamento album</span>
                        <span className="text-blue-400 font-bold tabular-nums">{completionRate}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-black/40 border border-white/5 rounded-lg overflow-hidden p-0.5">
                        <div 
                            style={{ width: `${completionRate}%` }}
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-md transition-all duration-1000 delay-300"
                        />
                    </div>
                </div>
            </div>

            {/* Rarity Breakdown */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 lg:p-8 space-y-4.5 group hover:bg-white/[0.05] transition-all duration-500 md:col-span-2 lg:col-span-1 shadow-xl">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold font-display text-white/40">Distribuzione rarità</p>
                    <div className="flex gap-1.5 select-none">
                        {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map(r => (
                            <div key={r} className={`w-2 h-2 rounded-full ${RARITY_COLORS[r]} opacity-30 group-hover:opacity-100 transition-opacity`} />
                        ))}
                    </div>
                </div>
                <div className="h-3 flex rounded-lg overflow-hidden bg-black/40 p-0.5 border border-white/5">
                    {['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'].map(rarity => {
                        const count = rarityCounts[rarity] || 0;
                        if (count === 0) return null;
                        const width = (count / totalCount) * 100;
                        return (
                            <div
                                key={rarity}
                                style={{ width: `${width}%` }}
                                className={`${RARITY_COLORS[rarity]} rounded-md transition-all duration-1000 delay-300`}
                                title={`${rarity}: ${count}`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-[10px] font-semibold font-display text-white/30 select-none">
                    <span className="text-primary/60">Leggendari ({rarityCounts.LEGENDARY || 0})</span>
                    <span>Comuni ({rarityCounts.COMMON || 0})</span>
                </div>
            </div>
        </div>
    );
};
