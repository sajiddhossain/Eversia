import React, { useState, useEffect } from 'react';
import type { EarnedBadge, BadgeTemplate, BadgeCategory, UserProfile } from '../../../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { BadgeItem } from '../BadgeItem';
import { BadgeStats } from './BadgeStats';
import { BadgeDetailModal } from './BadgeDetailModal';
import { CATEGORY_LABELS } from '../../../utils/gamification';
import { Loader2, Pin, Trophy, Plus } from 'lucide-react';

interface BadgeShowcaseProps {
    earnedBadges: EarnedBadge[];
    pinnedBadgeIds?: string[];
    isOwn?: boolean;
    isAdmin?: boolean;
    onPinToggle?: (badgeId: string) => void;
    onRemove?: (badgeId: string) => void;
    variant?: 'DEFAULT' | 'HIGHLIGHT';
    userProfile?: UserProfile;
}

export const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({ 
    earnedBadges, 
    pinnedBadgeIds = [], 
    isOwn, 
    isAdmin,
    onPinToggle,
    onRemove,
    variant = 'DEFAULT',
    userProfile
}) => {
    const [allTemplates, setAllTemplates] = useState<BadgeTemplate[]>([]);
    const [templatesMap, setTemplatesMap] = useState<Record<string, BadgeTemplate>>({});
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<'ALL' | BadgeCategory>('ALL');
    const [selectedBadge, setSelectedBadge] = useState<{ earned: EarnedBadge; template: BadgeTemplate } | null>(null);

    useEffect(() => {
        const fetchAllTemplates = async () => {
            try {
                const snap = await getDocs(collection(db, 'badges'));
                const list: BadgeTemplate[] = [];
                const map: Record<string, BadgeTemplate> = {};
                snap.forEach(docSnap => {
                    const template = { id: docSnap.id, ...docSnap.data() } as BadgeTemplate;
                    list.push(template);
                    map[docSnap.id] = template;
                });
                
                // Sort templates by rarity order
                const rarityOrder: Record<string, number> = {
                    'LEGENDARY': 1,
                    'EPIC': 2,
                    'RARE': 3,
                    'UNCOMMON': 4,
                    'COMMON': 5
                };
                list.sort((a, b) => {
                    const diff = (rarityOrder[a.rarity] || 5) - (rarityOrder[b.rarity] || 5);
                    return diff || a.name.localeCompare(b.name);
                });

                setAllTemplates(list);
                setTemplatesMap(map);
            } catch (err) {
                console.error("Error loading badge templates:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllTemplates();
    }, []);

    if (loading) {
        return (
            <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-white/10 animate-spin" />
            </div>
        );
    }

    if (allTemplates.length === 0) {
        return (
            <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-3xl p-12 text-center space-y-3">
                <div className="text-4xl">🏅</div>
                <p className="text-sm font-bold text-white/20">
                    Nessun badge disponibile nel sistema.
                </p>
            </div>
        );
    }

    // ── HIGHLIGHT VARIANT (Exactly 5 Slots Showcase) ──
    if (variant === 'HIGHLIGHT') {
        const slotsCount = 5;
        const slots = Array.from({ length: slotsCount }).map((_, idx) => {
            const badgeId = pinnedBadgeIds[idx];
            if (!badgeId) return null;
            const earned = earnedBadges.find(b => b.badgeId === badgeId);
            const template = templatesMap[badgeId];
            if (!earned || !template) return null;
            return { earned, template };
        });

        return (
            <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
                    {slots.map((slot, idx) => {
                        if (slot) {
                            const { earned, template } = slot;
                            return (
                                <div key={idx} className="relative group/highlight hover:-translate-y-1 transition-all duration-300">
                                    <div className="absolute -inset-1 rounded-[2.2rem] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent blur-md opacity-0 group-hover/highlight:opacity-100 transition-opacity pointer-events-none" />
                                    
                                    {isOwn && onPinToggle && (
                                        <button 
                                            onClick={() => onPinToggle(earned.badgeId)}
                                            className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center ring-2 ring-surface shadow-lg opacity-0 group-hover/highlight:opacity-100 transition-opacity hover:scale-110 active:scale-95"
                                            title="Rimuovi in evidenza"
                                        >
                                            <Pin className="w-2.5 h-2.5 text-white rotate-45" />
                                        </button>
                                    )}
                                    
                                    <BadgeItem 
                                        earnedBadge={earned} 
                                        template={template} 
                                        userProfile={userProfile}
                                        onClick={() => setSelectedBadge({ earned, template })}
                                    />
                                </div>
                            );
                        } else {
                            // Empty slot placeholder
                            return (
                                <div 
                                    key={idx} 
                                    className="aspect-square rounded-3xl bg-white/[0.01] border-2 border-dashed border-white/5 flex flex-col items-center justify-center p-6 relative overflow-hidden group/empty transition-all duration-500 hover:border-white/10 hover:bg-white/[0.02]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none" />
                                    <Trophy className="w-8 h-8 text-white/5 group-hover/empty:text-white/10 group-hover/empty:scale-110 transition-all duration-500" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/10 mt-3 group-hover/empty:text-white/20 transition-colors">
                                        Vetrina
                                    </span>
                                    {isOwn && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs opacity-0 group-hover/empty:opacity-100 transition-all duration-300">
                                            <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary group-hover/empty:scale-110 transition-transform">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                                <span className="text-[7px] font-black uppercase tracking-wider text-primary/80">Fissa Badge</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    })}
                </div>

                {selectedBadge && (
                    <BadgeDetailModal
                        earnedBadge={selectedBadge.earned.awardedAt === 0 ? undefined : selectedBadge.earned}
                        template={selectedBadge.template}
                        userProfile={userProfile}
                        isOwn={isOwn}
                        isPinned={pinnedBadgeIds.includes(selectedBadge.template.id)}
                        isAdmin={isAdmin}
                        onClose={() => setSelectedBadge(null)}
                        onPinToggle={() => onPinToggle?.(selectedBadge.template.id)}
                        onRemove={() => {
                            onRemove?.(selectedBadge.template.id);
                            setSelectedBadge(null);
                        }}
                    />
                )}
            </div>
        );
    }

    // Group categories present in all templates
    const categoriesSet = new Set<string>();
    allTemplates.forEach(t => {
        categoriesSet.add(t.category || 'SPECIAL');
    });

    const filteredTemplates = activeCategory === 'ALL'
        ? allTemplates
        : allTemplates.filter(t => (t.category || 'SPECIAL') === activeCategory);

    const tabs = [
        { id: 'ALL' as const, label: 'Tutti', emoji: '✨' },
        ...Array.from(categoriesSet).map(c => ({
            id: c as BadgeCategory,
            label: CATEGORY_LABELS[c]?.label || c,
            emoji: CATEGORY_LABELS[c]?.emoji || '🏷️',
        })),
    ];

    const gridClasses = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6";

    return (
        <div className="space-y-8">
            <BadgeStats earnedBadges={earnedBadges} templates={templatesMap} />

            {tabs.length > 2 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveCategory(tab.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeCategory === tab.id
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                            }`}
                        >
                            <span>{tab.emoji}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            <div className={gridClasses}>
                {filteredTemplates.map((template) => {
                    const earned = earnedBadges.find(b => b.badgeId === template.id);
                    const isPinned = pinnedBadgeIds.includes(template.id);
                    const locked = !earned;

                    return (
                        <div key={template.id} className="relative group/grid-item">
                            {isPinned && (
                                <div className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-surface shadow-lg group-hover/grid-item:scale-110 transition-transform">
                                    <Pin className="w-2.5 h-2.5 text-black" />
                                </div>
                            )}
                            <BadgeItem 
                                earnedBadge={earned} 
                                template={template} 
                                locked={locked}
                                userProfile={userProfile}
                                onClick={() => setSelectedBadge({ 
                                    earned: earned || { badgeId: template.id, awardedAt: 0, awardedBy: '' }, 
                                    template 
                                })}
                            />
                        </div>
                    );
                })}
            </div>

            {selectedBadge && (
                <BadgeDetailModal
                    earnedBadge={selectedBadge.earned.awardedAt === 0 ? undefined : selectedBadge.earned}
                    template={selectedBadge.template}
                    userProfile={userProfile}
                    isOwn={isOwn}
                    isPinned={pinnedBadgeIds.includes(selectedBadge.template.id)}
                    isAdmin={isAdmin}
                    onClose={() => setSelectedBadge(null)}
                    onPinToggle={() => onPinToggle?.(selectedBadge.template.id)}
                    onRemove={() => {
                        onRemove?.(selectedBadge.template.id);
                        setSelectedBadge(null);
                    }}
                />
            )}
        </div>
    );
};
