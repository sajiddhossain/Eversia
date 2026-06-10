import React, { useMemo } from 'react';
import { Shield, Layout, Building2, Users, Database, ArrowRight } from 'lucide-react';

const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
};
import type { NavigateFunction } from 'react-router-dom';
import type { Assignment } from './types';
import { getTurnStatus } from './dashboardUtils';
import type { RoomData } from './useStaffDashboard';
import type { Assembly } from '../../../types';

interface AssignmentCardProps {
    as: Assignment;
    room?: RoomData;
    navigate: NavigateFunction;
    selectedTurn: string;
    assignments: Assignment[];
    assembly?: Assembly;
    onOpenTurnModal: (activityId: string, activityName: string, turns: string[]) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({ 
    as, 
    room,
    navigate, 
    selectedTurn, 
    assignments, 
    assembly,
    onOpenTurnModal 
}) => {
    const isSecurity = as.role === 'SECURITY';

    // Identify all turns this user is assigned to for THIS specific activity
    const activityTurns = useMemo(() => Array.from(new Set(
        assignments.filter(a => a.activityId === as.activityId && a.role === as.role).map(a => a.turn_id)
    )).sort(), [assignments, as.activityId, as.role]);

    const isMultiTurn = activityTurns.length > 1;

    const stats = useMemo(() => {
        if (!room) return null;
        
        const max = room.max_capacity || 0;
        let present = 0;
        let registered = 0;
        
        if (selectedTurn === 'ALL') {
            present = Object.values(room.counts_by_turn || {}).reduce((a, b) => a + b, 0);
            registered = Object.values(room.registered_by_turn || {}).reduce((a, b) => a + b, 0);
        } else {
            present = room.counts_by_turn?.[selectedTurn] || 0;
            registered = room.registered_by_turn?.[selectedTurn] || 0;
        }

        return {
            present,
            max,
            registered
        };
    }, [room, selectedTurn]);

    const handleCardClick = () => {
        const fallbackTurn = activityTurns[0] || "1";
        const targetTurn = (selectedTurn === 'ALL' || as.turn_id === 'undefined') ? fallbackTurn : (as.turn_id || fallbackTurn);
        
        if (isSecurity) {
            const securityTurn = targetTurn === 'ALL' || targetTurn === 'undefined' ? '1' : targetTurn;
            navigate(`/security/${as.assemblyId}/${securityTurn}`);
            return;
        }

        if (selectedTurn === 'ALL' && isMultiTurn) {
            onOpenTurnModal(as.activityId, as.activityName || as.activityId, activityTurns);
        } else {
            navigate(`/room/${as.activityId}/${targetTurn}`);
        }
    };

    const occupancyRate = stats && stats.max > 0 ? (stats.present / stats.max) * 100 : 0;
    const isCrowded = occupancyRate > 90;
    const isFull = occupancyRate >= 100;

    const getCapacityStatus = () => {
        if (!stats || stats.max === 0) return null;
        if (occupancyRate >= 100) return { label: 'Critica: Piena', color: 'text-red-500', bg: 'bg-red-500/10' };
        if (occupancyRate > 90) return { label: 'Quasi piena', color: 'text-amber-500', bg: 'bg-amber-500/10' };
        if (occupancyRate > 50) return { label: 'Ottimale', color: 'text-brand-lime', bg: 'bg-brand-lime/10' };
        return { label: 'Bassa', color: 'text-white/40', bg: 'bg-white/5' };
    };

    const capStatus = getCapacityStatus();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = getTurnStatus(as.turn_id, assembly as any);

    const displayActivityName = as.activityName || as.activityId?.split('_').filter(p => p !== 'T1' && p !== 'T2' && p !== 'T3' && p.length > 4).pop()?.replace(/-/g, ' ') || 'Attività assegnata';
    const formattedActivityName = displayActivityName.charAt(0).toUpperCase() + displayActivityName.slice(1);

    return (
        <button
            onClick={handleCardClick}
            onMouseMove={handleMouseMove}
            className="spotlight-card group relative bg-white/[0.01] backdrop-blur-md border border-white/5 hover:border-brand-lime/30 p-5 md:p-6 rounded-2xl flex flex-col transition-all hover:bg-white/[0.02] text-left overflow-hidden shadow-2xl gap-4 w-full"
        >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between gap-4 relative z-10 w-full">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 shadow-inner border flex-shrink-0 ${isSecurity
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/10'
                        : as.role === 'ADMIN_ACCESS'
                            ? 'bg-brand-lime/10 text-brand-lime border-brand-lime/10'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/10'
                        }`}>
                        {isSecurity ? <Shield className="w-6 h-6" /> : <Layout className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className={`px-2.5 py-0.5 border rounded-lg text-[10px] font-display font-semibold tracking-wide shadow-sm ${as.role === 'ADMIN_ACCESS'
                                ? 'bg-brand-lime/20 border-brand-lime/30 text-brand-lime shadow-[0_0_10px_rgba(226,243,60,0.15)]'
                                : isSecurity
                                    ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                    : 'bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                                }`}>
                                {as.role === 'ADMIN_ACCESS' 
                                    ? 'Controllo completo' 
                                    : as.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                                }
                            </span>

                            {selectedTurn !== 'ALL' && (
                                <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-display font-semibold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'IN_PROGRESS' ? 'bg-red-500 animate-pulse' : 'bg-brand-lime shadow-[0_0_8px_rgba(226,243,60,0.6)]'}`} />
                                    <span>Turno {as.turn_id}</span>
                                    {status === 'IN_PROGRESS' && <span className="text-red-400 ml-0.5 text-[9px] font-medium">Live</span>}
                                    {status === 'UPCOMING' && <span className="text-brand-lime ml-0.5 text-[9px] font-medium">Prossimo</span>}
                                </div>
                            )}

                            {selectedTurn !== 'ALL' && !isSecurity && capStatus && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-display font-semibold tracking-wide ${capStatus.bg} ${capStatus.color} animate-in fade-in duration-500`}>
                                    {capStatus.label}
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg md:text-xl font-display font-bold tracking-tight group-hover:text-brand-lime transition-colors leading-tight mb-0.5 break-words">
                            {formattedActivityName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-display font-medium">
                            <Building2 className="w-3.5 h-3.5 text-white/20" />
                            <span className="truncate">{as.assemblyName || 'Assemblea'}</span>
                        </div>
                    </div>
                </div>

                {/* Status Indicator / Arrow */}
                <div className="flex items-center gap-3 shrink-0">
                    {!isSecurity && selectedTurn !== 'ALL' && stats && (
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                {isFull && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                                <p className={`text-xs md:text-sm font-display font-bold tabular-nums tracking-tight ${isCrowded ? 'text-amber-500' : isFull ? 'text-red-500' : 'text-white'}`}>
                                    {stats.present}/{stats.max}
                                </p>
                            </div>
                            <p className="text-[10px] font-display font-semibold text-white/30">Presenze</p>
                        </div>
                    )}
                    <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center group-hover:border-brand-lime/40 group-hover:bg-brand-lime/10 transition-all shrink-0">
                        <ArrowRight className="w-4.5 h-4.5 text-white/40 group-hover:text-brand-lime transition-all group-hover:translate-x-0.5" />
                    </div>
                </div>
            </div>

            {/* Occupancy Progress Bar (Only in turn view) */}
            {!isSecurity && selectedTurn !== 'ALL' && stats && (
                <div className="space-y-3 relative z-10 w-full">
                    <div className="flex justify-between items-end gap-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-display font-medium text-white/40">
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-white/20" /> <span className="tabular-nums">{stats.present}</span> presenti
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Database className="w-4 h-4 text-white/20" /> <span className="tabular-nums">{stats.registered}</span> iscritti
                            </div>
                        </div>
                        <span className={`text-xs font-display font-bold tabular-nums ${isCrowded ? 'text-amber-500' : 'text-brand-lime/80'}`}>
                            {Math.round(occupancyRate)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                isFull ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse' : isCrowded ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-brand-lime to-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, occupancyRate)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Multi-turn label for Overview */}
            {selectedTurn === 'ALL' && isMultiTurn && (
                <div className="flex items-center gap-2 w-full mt-auto pt-4 border-t border-white/5 relative z-10">
                    <span className="text-[10px] font-display font-semibold text-white/30">Copre i turni:</span>
                    <div className="flex gap-1.5">
                        {activityTurns.map(tid => (
                            <span key={tid} className="text-[10px] font-display font-semibold bg-white/5 px-2.5 py-1 rounded-lg text-white/60 border border-white/5 shadow-sm">
                                Turno {tid}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </button>
    );
};
