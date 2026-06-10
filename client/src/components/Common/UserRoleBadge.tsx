import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCheck, X, Sparkles } from 'lucide-react';

interface UserRoleBadgeProps {
    role: string;
    className?: string;
    interactive?: boolean;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role, className = "", interactive = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; offset: number }>({ top: 0, left: 0, offset: 0 });
    const triggerRef = useRef<HTMLSpanElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current && isOpen) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const popoverWidth = Math.min(viewportWidth - 32, 320); // Responsive width estimate
            const halfWidth = popoverWidth / 2;
            
            const triggerCenter = rect.left + (rect.width / 2);
            let left = triggerCenter;
            let offset = 0;

            // Clamp horizontal position
            const margin = 16;
            if (triggerCenter - halfWidth < margin) {
                left = halfWidth + margin;
                offset = triggerCenter - left;
            } else if (triggerCenter + halfWidth > viewportWidth - margin) {
                left = viewportWidth - margin - halfWidth;
                offset = triggerCenter - left;
            }

            setCoords({
                top: rect.top + window.scrollY,
                left: left + window.scrollX,
                offset: offset
            });
        }
    };

    useLayoutEffect(() => {
        if (isOpen) updatePosition();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && 
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    if (!['SVILUPPATORE', 'ADMIN'].includes(role)) return null;

    const isDev = role === 'SVILUPPATORE';
    const Icon = isDev ? BadgeCheck : BadgeCheck; // Using BadgeCheck for both but different colors
    
    const config = {
        title: isDev ? "Sviluppatore Ufficiale" : "Staff Amministrativo",
        badgeLabel: isDev ? "Verified Dev" : "Staff",
        description: isDev 
            ? "Questo utente è lo sviluppatore ufficiale di eversia. Gestisce l'architettura tecnica, i server e la sicurezza globale della piattaforma."
            : "Questo utente fa parte dello staff di amministrazione. Gestisce le assemblee, la moderazione dei contenuti e garantisce il corretto svolgimento delle attività.",
        color: isDev ? "text-amber-400" : "text-sky-400",
        bg: isDev ? "bg-amber-500/10 border-amber-500/20" : "bg-sky-500/10 border-sky-500/20",
        glow: isDev ? "from-amber-500/20" : "from-sky-500/20",
        iconClass: isDev ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
    };

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            <span
                ref={triggerRef}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                onClick={(e) => {
                    if (!interactive) return;
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                onKeyDown={(e) => {
                    if (!interactive) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }
                }}
                className={`p-0.5 rounded-full transition-all ${interactive ? 'hover:scale-110 active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary' : 'cursor-default'} group/badge relative`}
                title={config.title}
            >
                {/* Subtle outer ring */}
                <div className={`absolute -inset-0.5 rounded-full blur-[2px] opacity-0 group-hover/badge:opacity-50 transition-opacity ${isDev ? 'bg-amber-500' : 'bg-sky-500'}`} />
                <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${config.color} ${config.iconClass} relative z-10`} />
            </span>

            {isOpen && interactive && createPortal(
                <div 
                    ref={popoverRef}
                    style={{ 
                        position: 'absolute',
                        top: `${coords.top}px`,
                        left: `${coords.left}px`,
                        transform: 'translate(-50%, -100%)',
                        marginTop: '-12px'
                    }}
                    className="w-[280px] sm:w-[320px] z-[9999] animate-in zoom-in-95 fade-in slide-in-from-bottom-2 duration-300 origin-bottom pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-[#09090b] border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden relative">
                        {/* Glow Accent */}
                        <div className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b ${config.glow} to-transparent opacity-30`} />
                        
                        <div className="p-5 relative z-10">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center border border-white/5`}>
                                        <Icon className={`w-5 h-5 ${config.color}`} />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.1em] text-white leading-none mb-1">
                                            {config.title}
                                        </h4>
                                        <div className="flex items-center gap-1.5">
                                            <Sparkles className="w-2.5 h-2.5 text-primary opacity-50" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                                                Utente Verificato
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsOpen(false)} 
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/5 rounded-lg transition-colors border border-white/5"
                                >
                                    <X className="w-3.5 h-3.5 text-white/20" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 mb-4">
                                <p className="text-[11px] font-medium text-white/40 leading-relaxed italic">
                                    "{config.description}"
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDev ? 'bg-amber-400' : 'bg-sky-400'}`} />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                                        Verified eversia Network
                                    </span>
                                </div>
                                <div className={`text-[8px] font-black px-2 py-0.5 rounded-md border ${config.bg} ${config.color}`}>
                                    {config.badgeLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Shadow Arrow */}
                    <div 
                        className="absolute top-full -mt-1 w-4 h-2 overflow-hidden pointer-events-none"
                        style={{ 
                            left: `calc(50% + ${coords.offset}px)`,
                            transform: 'translateX(-50%)' 
                        }}
                    >
                        <div className="w-2 h-2 bg-[#09090b] border-r border-b border-white/10 rotate-45 transform origin-top-left -mt-1 ml-1" />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
