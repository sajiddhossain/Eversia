import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Search } from 'lucide-react';

// Components
import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { AssignmentCard } from './AssignmentCard';
import { TurnModal } from './TurnModal';

// Hooks & Utils
import { useStaffDashboard } from './useStaffDashboard';

export const StaffDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [selectedTurn, setSelectedTurn] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Unified Hook for all Firebase data
    const { assignments, activeAssemblies, rooms, loading } = useStaffDashboard(selectedTurn);

    // Turn Selection Modal State
    const [turnModal, setTurnModal] = useState<{
        isOpen: boolean;
        activityId: string;
        activityName: string;
        availableTurns: string[];
    }>({
        isOpen: false,
        activityId: '',
        activityName: '',
        availableTurns: []
    });

    // Filtered assignments based on selected turn and search term
    const filteredAssignments = (selectedTurn === 'ALL'
        ? Array.from(new Map(assignments.map(as => [`${as.activityId || 'unknown'}_${as.role || 'no-role'}`, as])).values())
        : assignments.filter(as => as.turn_id === selectedTurn))
        .filter(as => 
            (as.activityName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (as.activityId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (as.role || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

    // Get unique turns available for the current perspective
    const availableTurns = Array.from(new Set(assignments.map(as => as.turn_id))).sort();

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-white/5 border-t-brand-lime animate-spin" />
                <p className="text-xs font-display font-semibold text-white/40">Caricamento dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface text-white p-6 md:p-12 relative overflow-hidden -mt-20 pt-40 md:pt-44 animate-in fade-in duration-700">
            {/* Background Aesthetics */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,rgba(0,130,230,0.06)_0%,transparent_60%)] pointer-events-none" />
            <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-brand-lime/[0.04] rounded-full blur-[140px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-[#34d399]/[0.03] rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-8 pb-36">
                <Header />



                {/* Unified Control Row (Filters + Search) - Glassmorphic design, matches filters */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white/[0.01] backdrop-blur-md border border-white/5 p-5 rounded-2xl shadow-xl">
                    <FilterBar 
                        assignments={assignments}
                        availableTurns={availableTurns}
                        selectedTurn={selectedTurn}
                        setSelectedTurn={setSelectedTurn}
                    />

                    <div className="relative group flex-1 max-w-sm">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-brand-lime transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Cerca attività o ruolo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/[0.02] border border-white/5 focus:border-brand-lime/30 rounded-xl py-3 pl-12 pr-4 text-xs font-display font-semibold text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.04] focus:shadow-[0_0_20px_rgba(226,243,60,0.05)] transition-all"
                        />
                    </div>
                </div>

                {/* Incarichi List */}
                <div className="space-y-8 w-full">
                    {filteredAssignments.length === 0 ? (
                        <div className="bg-white/[0.01] border border-dashed border-white/5 rounded-2xl p-12 text-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-white/20">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-display font-semibold text-white/40">Nessuna attività assegnata</h3>
                                <p className="text-xs font-display font-medium text-white/20">
                                    {searchTerm ? `La ricerca "${searchTerm}" non ha prodotto risultati` : "Non ci sono attività assegnate per questo turno"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* 1. ROOM MANAGEMENT / ACTIVITIES */}
                            {filteredAssignments.some(as => as.role === 'ROOM_MANAGER' || as.role === 'ADMIN_ACCESS') && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-brand-lime/10 flex items-center justify-center text-brand-lime">
                                            <Layout className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg md:text-xl font-display font-bold tracking-tight flex items-center gap-3">
                                                Gestione attività
                                                {selectedTurn === 'ALL' && (
                                                    <span className="text-[10px] font-display font-semibold bg-white/5 text-white/60 px-2.5 py-0.5 rounded-full border border-white/5">
                                                        Vista unificata
                                                    </span>
                                                )}
                                            </h2>
                                            <p className="text-xs font-display font-medium text-white/40">
                                                {selectedTurn === 'ALL'
                                                    ? "Punto d'accesso unico per le attività su più turni"
                                                    : "Coordinamento e afflusso aule per il turno corrente"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid gap-4">
                                        {filteredAssignments
                                            .filter(as => as.role === 'ROOM_MANAGER' || as.role === 'ADMIN_ACCESS')
                                            .map((as) => (
                                                <AssignmentCard
                                                    key={as.id}
                                                    as={as}
                                                    room={rooms[as.activityId]}
                                                    navigate={navigate}
                                                    selectedTurn={selectedTurn}
                                                    assignments={assignments}
                                                    assembly={activeAssemblies.find(a => a.id === as.assemblyId)}
                                                    onOpenTurnModal={(activityId, activityName, turns) => setTurnModal({ isOpen: true, activityId, activityName, availableTurns: turns })}
                                                />
                                            ))}
                                    </div>
                                </section>
                            )}

                            {/* 2. SECURITY / OVERSIGHT */}
                            {filteredAssignments.some(as => as.role === 'SECURITY') && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                            <Layout className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg md:text-xl font-display font-bold tracking-tight text-white/80">Sicurezza e supervisione</h2>
                                            <p className="text-xs font-display font-medium text-white/40">Monitoraggio corridoi e varchi</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-4">
                                        {filteredAssignments
                                            .filter(as => as.role === 'SECURITY')
                                            .map((as) => (
                                                <AssignmentCard
                                                    key={as.id}
                                                    as={as}
                                                    room={rooms[as.activityId]}
                                                    navigate={navigate}
                                                    selectedTurn={selectedTurn}
                                                    assignments={assignments}
                                                    assembly={activeAssemblies.find(a => a.id === as.assemblyId)}
                                                    onOpenTurnModal={(activityId, activityName, turns) => setTurnModal({ isOpen: true, activityId, activityName, availableTurns: turns })}
                                                />
                                            ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <TurnModal 
                isOpen={turnModal.isOpen}
                activityId={turnModal.activityId}
                activityName={turnModal.activityName}
                availableTurns={turnModal.availableTurns}
                onClose={() => setTurnModal({ ...turnModal, isOpen: false })}
                onNavigate={(actId, turnId) => navigate(`/room/${actId}/${turnId}`)}
            />
        </div>
    );
};
