import React from 'react';
import { motion } from 'framer-motion';
import { Users, ExternalLink, Calendar, ChevronRight } from 'lucide-react';
import type { Assembly } from '../../../../types';

interface AssemblyGridProps {
    activeTab: 'ACTIVE' | 'HISTORY';
    setActiveTab: (tab: 'ACTIVE' | 'HISTORY') => void;
    activeList: Assembly[];
    archivedList: Assembly[];
    onSelectAssembly: (assembly: Assembly) => void;
    joinedAssemblyIds: Set<string>;
}

const AssemblyGrid: React.FC<AssemblyGridProps> = ({ 
    activeTab, 
    setActiveTab, 
    activeList, 
    archivedList, 
    onSelectAssembly,
    joinedAssemblyIds
}) => {
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold italic tracking-tight font-display flex items-center gap-3 text-white">
                    <Users className="w-6 h-6 text-primary" />
                    Esplora
                </h2>
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl relative">
                    <button
                        onClick={() => setActiveTab('ACTIVE')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-all duration-300 btn-press ${
                            activeTab === 'ACTIVE' ? 'text-black z-10' : 'text-white/40 hover:text-white'
                        }`}
                    >
                        {activeTab === 'ACTIVE' && (
                            <motion.div
                                layoutId="assembly-grid-tab-indicator"
                                className="absolute inset-0 bg-white rounded-lg -z-10"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                        )}
                        Attive
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold relative transition-all duration-300 btn-press ${
                            activeTab === 'HISTORY' ? 'text-black z-10' : 'text-white/40 hover:text-white'
                        }`}
                    >
                        {activeTab === 'HISTORY' && (
                            <motion.div
                                layoutId="assembly-grid-tab-indicator"
                                className="absolute inset-0 bg-white rounded-lg -z-10"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                        )}
                        Storico
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {activeTab === 'ACTIVE' ? (
                    activeList.length > 0 ? (
                        activeList.map(a => {
                            const isJoined = joinedAssemblyIds.has(a.id);
                            const themeColor = a.themeColor || '#E2F33C';
                            return (
                                <motion.div
                                    key={a.id}
                                    whileHover={{ scale: 1.01, translateY: -2 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => onSelectAssembly(a)}
                                    className="group relative p-5 sm:p-6 pl-7 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-white/10 hover:bg-white/[0.04] transition-all duration-500 cursor-pointer overflow-hidden btn-press shadow-xl"
                                >
                                    {/* Left Accent Theme Line */}
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2.5"
                                        style={{ backgroundColor: themeColor }}
                                    />
                                    
                                    {/* Theme-colored Glow */}
                                    <div 
                                        className="absolute -top-12 -right-12 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-all duration-500 rounded-full pointer-events-none"
                                        style={{ backgroundColor: themeColor }}
                                    />
                                    
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span 
                                                className={`text-[10px] font-semibold tracking-wide px-3 py-1 rounded-full border transition-all ${
                                                    isJoined 
                                                        ? 'shadow-[0_0_12px_rgba(226,243,60,0.1)]' 
                                                        : 'border-white/5 text-white/30'
                                                }`}
                                                style={isJoined ? { 
                                                    color: themeColor, 
                                                    borderColor: `${themeColor}30`, 
                                                    backgroundColor: `${themeColor}10` 
                                                } : undefined}
                                            >
                                                {isJoined ? 'Partecipante' : 'Non iscritto'}
                                            </span>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-semibold tabular-nums text-white/40">{a.date}</span>
                                                <span className="text-[9px] font-semibold text-white/10 uppercase tracking-wider">Data evento</span>
                                            </div>
                                        </div>
                                        <h3 
                                            className="text-xl md:text-2xl font-bold italic text-white leading-none tracking-tight font-display transition-transform group-hover:translate-x-1 duration-300"
                                        >
                                            {a.name}
                                        </h3>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                                            <div className="flex -space-x-1.5 opacity-40 group-hover:opacity-60 transition-opacity">
                                                {/* Squircles instead of pure circles */}
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-5 h-5 rounded-md border border-[#09090b] bg-white/10 rotate-6" />
                                                ))}
                                            </div>
                                            <div 
                                                className="text-[10px] font-semibold tracking-wide flex items-center gap-1.5 transition-all translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                                                style={{ color: themeColor }}
                                            >
                                                Apri dashboard <ExternalLink className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 sm:py-24 px-4 sm:px-8 text-center bg-white/[0.02] border border-white/10 rounded-3xl md:rounded-[2.5rem] backdrop-blur-3xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-8 relative">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                                <Calendar className="w-10 h-10 text-primary relative" />
                            </div>
                            <h3 className="text-xl font-bold font-display italic text-white mb-3">Nessuna assemblea</h3>
                            <p className="text-xs text-white/40 max-w-[280px] font-medium leading-relaxed">
                                Non ci sono assemblee attive in questo momento. Resta sintonizzato per i prossimi eventi del tuo istituto.
                            </p>
                            <div className="mt-8 flex items-center gap-3 px-5 py-2.5 bg-black/40 rounded-full border border-white/10 shadow-2xl">
                                <div className="relative w-2 h-2">
                                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                                    <div className="relative w-2 h-2 bg-emerald-500 rounded-full" />
                                </div>
                                <span className="text-[9px] font-semibold tracking-wider text-white/40 uppercase">eversia monitor attivo</span>
                            </div>
                        </div>
                    )
                ) : (
                    archivedList.length > 0 ? (
                        archivedList.map(a => (
                            <motion.div
                                key={a.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onSelectAssembly(a)}
                                className="group p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.02] hover:border-white/10 transition-all cursor-pointer flex items-center justify-between btn-press"
                            >
                                <div>
                                    <h4 className="font-semibold text-white/60 group-hover:text-white transition-colors">{a.name}</h4>
                                    <p className="text-[10px] font-semibold text-white/20 mt-1 tracking-wider uppercase tabular-nums">{a.date}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5 transition-transform" />
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-6 sm:p-12 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl sm:rounded-[2.5rem]">
                            <p className="text-white/20 text-xs font-semibold uppercase tracking-wider">Storico vuoto</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default AssemblyGrid;
