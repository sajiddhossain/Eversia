import React from 'react';
import { AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import type { UserProfile } from "../../../types";
import { SystemTerminal } from './components/SystemTerminal';

interface DebugTabProps {
    userProfile: UserProfile | null;
    terminalHistory: { type: 'input' | 'output' | 'error' | 'success', text: string }[];
    onCommand: (input: string) => void;
    onWipeDatabase: () => void;
}

export const DebugTab: React.FC<DebugTabProps> = ({ 
    userProfile, 
    terminalHistory, 
    onCommand, 
    onWipeDatabase 
}) => {
    const isDeveloper = userProfile?.role === 'SVILUPPATORE';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* MGA CLI Terminal */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Terminal Interactive Console</h3>
                    </div>
                    {isDeveloper && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                            Developer Session Active
                        </span>
                    )}
                </div>
                
                <SystemTerminal 
                    history={terminalHistory} 
                    onCommand={onCommand} 
                    isDeveloper={isDeveloper} 
                />
            </div>

            {/* DANGER ZONE (Developer Only) */}
            {isDeveloper && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-8 md:p-12 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity -rotate-12">
                        <Trash2 className="w-48 h-48 text-red-500" />
                    </div>

                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                            <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Zona Pericolo</h3>
                            <p className="text-xs font-bold text-red-500/60 uppercase tracking-widest mt-0.5">Developer Only • Riservato Hossain</p>
                        </div>
                    </div>

                    <div className="max-w-xl space-y-6 relative z-10">
                        <p className="text-white/40 text-sm font-medium leading-relaxed">
                            Questa sezione contiene strumenti distruttivi per la manutenzione straordinaria del sistema. 
                            L'utilizzo del Wipe Database cancellerà **ogni singolo dato** presente su Firestore, riportando l'istanza allo stato vergine.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={onWipeDatabase}
                                className="group/wipe flex items-center gap-4 px-8 py-5 bg-red-500 text-black rounded-[1.5rem] font-black uppercase tracking-tighter text-sm transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_20px_40px_rgba(239,68,68,0.3)] shadow-lg"
                            >
                                <Trash2 className="w-5 h-5 transition-transform group-hover/wipe:rotate-12" />
                                Wipe Totale Database (Reset Zero)
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-red-500/10 flex items-center gap-3 text-red-500/30 text-[10px] font-black uppercase tracking-widest relative z-10">
                        <span>L'azione richiede autenticazione PIN secondaria</span>
                        <div className="h-px flex-1 bg-red-500/10" />
                    </div>
                </div>
            )}

            {!isDeveloper && (
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 text-center space-y-4">
                    <ShieldAlert className="w-16 h-16 text-white/10 mx-auto" />
                    <h3 className="text-xl font-black text-white/40 uppercase tracking-widest">Accesso Riservato</h3>
                    <p className="text-white/20 text-sm max-w-sm mx-auto">
                        Le funzioni di debug e diagnostica sono accessibili solo allo sviluppatore di sistema autorizzato.
                    </p>
                </div>
            )}
        </div>
    );
};
