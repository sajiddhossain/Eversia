import React, { useState } from "react";
import { useAdminDashboard } from "./useAdminDashboard";
import { useNavigate } from "react-router-dom";
import { Award, Plus, Settings, Calendar, Layout, Loader2, ArrowRight, Users } from "lucide-react";
import { BadgeManager } from "../BadgeManager/BadgeManager";
import { AssemblyCreator } from "../AssemblyCreator";
import { AccountManager } from "../AccountManager/AccountManager";
import { useAuth } from "../../../hooks/useAuth";

export const AdminDashboard: React.FC = () => {
    const dashboardState = useAdminDashboard();
    const {
        assemblies,
        loading,
        setAssembly
    } = dashboardState;

    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [showAssemblyCreator, setShowAssemblyCreator] = useState(false);
    const [showBadgeManager, setShowBadgeManager] = useState(false);
    const [showAccountManager, setShowAccountManager] = useState(false);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary/30 relative overflow-hidden -mt-20 pt-36 pb-32">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-6xl mx-auto px-6 lg:px-8 space-y-16 relative z-10 animate-in fade-in duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
                    <div>
                        <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-[0.25em] text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Pannello Amministrazione Globale
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mt-1">EVERSIA CONTROL</h1>
                        <p className="text-xs text-white/40 mt-1 font-medium">Gestione dei moduli, dei badge e delle assemblee studentesche.</p>
                    </div>
                </div>

                {/* Global Controls & Tools */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Badge Manager Card */}
                    <button 
                        onClick={() => setShowBadgeManager(true)}
                        className="p-6 bg-white/[0.02] border border-white/5 hover:border-purple-500/20 rounded-[2rem] hover:bg-purple-500/[0.02] transition-all text-left flex items-start gap-5 group shadow-xl active:scale-[0.99] w-full"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-wider text-white/95">Catalogo Badge</h3>
                            <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Crea, modifica e monitora i criteri di sblocco dei badge automatici e manuali.</p>
                        </div>
                    </button>

                    {/* Account Manager Card */}
                    <button 
                        onClick={() => setShowAccountManager(true)}
                        className="p-6 bg-white/[0.02] border border-white/5 hover:border-fuchsia-500/20 rounded-[2rem] hover:bg-fuchsia-500/[0.02] transition-all text-left flex items-start gap-5 group shadow-xl active:scale-[0.99] w-full"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 group-hover:scale-110 transition-transform shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-wider text-white/95">Gestione Utenti</h3>
                            <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Modifica nomi, username, bio, ruoli e classi di tutti gli account registrati.</p>
                        </div>
                    </button>

                    {/* System Settings Card */}
                    <button 
                        onClick={() => navigate('/admin/system')}
                        className="p-6 bg-white/[0.02] border border-white/5 hover:border-blue-500/20 rounded-[2rem] hover:bg-blue-500/[0.02] transition-all text-left flex items-start gap-5 group shadow-xl active:scale-[0.99] w-full"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-wider text-white/95">Impostazioni</h3>
                            <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Configura chiavi di sicurezza, ruoli, import CSV classi e parametri generali del server.</p>
                        </div>
                    </button>
                </div>

                {/* Assemblies Section */}
                <div className="space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                        <Layout className="w-4 h-4 text-primary" />
                        Seleziona un'Assemblea per Gestirla
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assemblies.map(assembly => {
                            const dateStr = assembly.date || "Nessuna data";
                            
                            const statusStyles: Record<string, string> = {
                                'ISCRIZIONI_APERTE': 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
                                'ATTIVA': 'text-primary border-primary/25 bg-primary/10 shadow-[0_0_10px_rgba(226,243,60,0.15)]',
                                'ARCHIVIATA': 'text-amber-400 border-amber-500/25 bg-amber-500/10',
                                'CHIUSO': 'text-white/30 border-white/5 bg-white/5'
                            };
                            
                            const statusLabels: Record<string, string> = {
                                'ISCRIZIONI_APERTE': 'Iscrizioni Aperte',
                                'ATTIVA': 'Live Event',
                                'ARCHIVIATA': 'Archiviata',
                                'CHIUSO': 'In Preparazione'
                            };

                            const themeColor = assembly.themeColor || '#E2F33C';

                            return (
                                <div 
                                    key={assembly.id}
                                    onClick={() => navigate(`/admin/assembly/${assembly.id}`)}
                                    className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-[2rem] p-6 hover:scale-[1.02] active:scale-[0.99] transition-all relative overflow-hidden group shadow-xl flex flex-col justify-between min-h-[200px] cursor-pointer"
                                >
                                    {/* Left Accent line */}
                                    <div 
                                        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
                                        style={{ backgroundColor: themeColor }}
                                    />
                                    
                                    <div className="space-y-4 pl-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${statusStyles[assembly.status] || statusStyles.CHIUSO}`}>
                                                {statusLabels[assembly.status] || 'In Preparazione'}
                                            </span>
                                            <div className="flex items-center gap-1 text-[9px] text-white/30 font-bold font-mono">
                                                <Calendar className="w-3.5 h-3.5 text-white/20" />
                                                {dateStr}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="font-black text-lg text-white group-hover:text-primary transition-colors line-clamp-1">{assembly.name}</h3>
                                            <p className="text-[10px] text-white/40 mt-1 line-clamp-2 leading-relaxed">{assembly.description || 'Nessuna descrizione.'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 pl-2 border-t border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 group-hover:text-primary transition-colors flex items-center gap-1.5">
                                            Gestisci Assemblea
                                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Dashed Create Card */}
                        <button
                            onClick={() => setShowAssemblyCreator(true)}
                            className="border border-dashed border-white/10 hover:border-primary/30 flex flex-col items-center justify-center text-center p-8 bg-white/[0.01] hover:bg-primary/[0.01] rounded-[2rem] min-h-[200px] cursor-pointer transition-all group space-y-3 w-full"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 group-hover:text-primary group-hover:border-primary/20 transition-all">
                                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-wider text-white/60 group-hover:text-primary transition-colors">Nuova Assemblea</h3>
                                <p className="text-[9px] text-white/20 mt-1 uppercase tracking-wider font-bold">Crea un nuovo evento</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Assembly Creator Modal */}
            {showAssemblyCreator && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="max-w-2xl w-full relative">
                        <AssemblyCreator
                            onComplete={(id) => {
                                setShowAssemblyCreator(false);
                                setAssembly(id);
                                navigate(`/admin/assembly/${id}`);
                            }}
                            onClose={() => setShowAssemblyCreator(false)}
                        />
                    </div>
                </div>
            )}

            {/* Badge Manager Modal */}
            {showBadgeManager && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl relative">
                        <BadgeManager 
                            onClose={() => setShowBadgeManager(false)} 
                        />
                    </div>
                </div>
            )}

            {/* Account Manager Modal */}
            {showAccountManager && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
                    <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl relative">
                        <AccountManager 
                            currentUserProfile={userProfile}
                            onClose={() => setShowAccountManager(false)} 
                        />
                    </div>
                </div>
            )}

        </div>
    );
};
