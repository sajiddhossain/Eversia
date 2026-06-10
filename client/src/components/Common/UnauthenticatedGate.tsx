import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, UserPlus, Search, Trophy, Crown, Plus, Check, BookOpen, Users, Award, ShieldCheck, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface UnauthenticatedGateProps {
    title?: string;
    description?: string;
}

export const UnauthenticatedGate: React.FC<UnauthenticatedGateProps> = ({ 
    title = "Unisciti alla community", 
    description = "Effettua l'accesso per scoprire i profili degli studenti, scalare la classifica e collezionare badge esclusivi dell'Agnesi."
}) => {
    const navigate = useNavigate();
    const [mockAdded, setMockAdded] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [modalTab, setModalTab] = useState<'overview' | 'xp' | 'badges' | 'privacy'>('overview');

    // 2026 Cursor spotlight hover tracker
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    const displayTitle = title === "UNISCITI ALLA COMMUNITY" ? "Unisciti alla community" : title;

    return (
        <div className="max-w-6xl w-full mx-auto flex flex-col min-h-[70vh] justify-between relative animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(5px); opacity: 0; }
                    15% { opacity: 1; }
                    100% { transform: translateY(-30px); opacity: 0; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .tab-content {
                    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {/* Main Grid */}
            <div className="grid md:grid-cols-2 gap-12 items-center text-left py-10 w-full">
                {/* Left Side: Call to Action */}
                <div className="space-y-6 flex flex-col items-start relative z-10">
                    <div className="relative mb-2">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="relative w-16 h-16 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                            <Lock className="w-6 h-6 text-primary" />
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 bg-brand-lime text-black p-1.5 rounded-full shadow-lg border border-[#09090b] animate-bounce">
                            <Sparkles className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight leading-tight max-w-lg">
                        {displayTitle.split(' ').map((word, i) => (
                            <span key={i} className={i === displayTitle.split(' ').length - 1 ? "text-primary" : "text-white"}>
                                {word}{' '}
                            </span>
                        ))}
                    </h2>
                    
                    <p className="max-w-md text-white/45 text-sm md:text-base font-medium leading-relaxed">
                        {description}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
                        <motion.button
                            onClick={() => navigate('/login')}
                            className="group relative w-full sm:w-auto px-8 h-14 bg-primary text-black rounded-2xl font-display font-bold text-sm shadow-[0_0_40px_rgba(0,130,230,0.15)] hover:shadow-[0_0_60px_rgba(0,130,230,0.3)] transition-all flex items-center justify-center gap-3 cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <span>Accedi ora</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                        
                        <motion.button
                            onClick={() => {
                                setModalTab('overview');
                                setShowInfoModal(true);
                            }}
                            className="w-full sm:w-auto px-8 h-14 bg-white/5 border border-white/5 text-white/60 hover:text-white rounded-2xl font-display font-bold text-sm transition-all hover:bg-white/10 flex items-center justify-center gap-3 cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <UserPlus className="w-4 h-4 opacity-45" />
                            <span>Scopri di più</span>
                        </motion.button>
                    </div>
                </div>

                {/* Right Side: High-Fidelity Fake Community Dashboard Preview */}
                <div 
                    onMouseMove={handleMouseMove}
                    className="w-full bg-white/[0.01] border border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-2xl backdrop-blur-md spotlight-card text-left max-w-xl mx-auto"
                >
                    {/* Atmospheric gradient behind preview */}
                    <div className="absolute top-0 right-1/4 w-[250px] h-[250px] bg-primary/5 rounded-full blur-[70px] pointer-events-none group-hover:bg-primary/10 transition-colors z-0" />
                    <div className="absolute bottom-0 left-1/4 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[70px] pointer-events-none z-0" />

                    {/* Simulated Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <span className="text-[10px] font-display font-semibold text-white/25 ml-2 tracking-wide">Eversia social • Preview</span>
                        </div>
                        <div className="px-3 py-1 bg-brand-lime/10 border border-brand-lime/20 rounded-full text-[10px] font-display font-semibold text-brand-lime">
                            Ospite
                        </div>
                    </div>

                    {/* Content Simulation */}
                    <div className="space-y-6 relative z-10">
                        {/* Simulated Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                            <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-display font-semibold text-white/30">
                                Cerca per nome, username...
                            </div>
                        </div>

                        {/* Simulated Leaderboard Widget */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-display font-semibold text-white/40 block">I campioni (Top XP)</span>
                                <span className="text-[10px] font-display font-semibold text-primary block">Classifica</span>
                            </div>

                            <div className="divide-y divide-white/[0.03] bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                                {[
                                    { rank: 1, name: 'Matteo Agnesi', username: '@matteo.agnesi', xp: 1240, lvl: 12, icon: Crown, iconColor: 'text-brand-lime', bgGrad: 'from-orange-500/20 to-red-500/20' },
                                    { rank: 2, name: 'Sofia Bianchi', username: '@sofia_bianchi', xp: 890, lvl: 9, icon: Trophy, iconColor: 'text-slate-300', bgGrad: 'from-purple-500/20 to-pink-500/20' },
                                    { rank: 3, name: 'Sajid Hossain', username: '@sajid', xp: 850, lvl: 8, icon: Trophy, iconColor: 'text-amber-600', bgGrad: 'from-blue-500/20 to-emerald-500/20' }
                                ].map((row) => (
                                    <div 
                                        key={row.rank} 
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-all hover:translate-x-1 duration-300 relative group/row cursor-pointer"
                                    >
                                        {/* Row Hover Strip Indicator */}
                                        <div 
                                            className="absolute inset-y-0 left-0 w-1 scale-y-0 group-hover/row:scale-y-100 transition-transform duration-300 rounded-r"
                                            style={{ backgroundColor: row.rank === 1 ? '#E2F33C' : row.rank === 2 ? '#cbd5e1' : '#d97706' }}
                                        />

                                        <div className="w-5 flex-shrink-0 flex justify-center text-[10px] font-black">
                                            <row.icon className={`w-3.5 h-3.5 ${row.iconColor}`} />
                                        </div>
                                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${row.bgGrad} border border-white/10 flex items-center justify-center font-display font-bold text-xs text-white/90`}>
                                            {row.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-display font-bold text-white/95 truncate leading-none">{row.name}</span>
                                                <span className="text-[9px] font-display font-semibold bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md text-white/40">Lvl {row.lvl}</span>
                                            </div>
                                            <span className="text-[10px] text-white/30 font-display font-semibold block mt-0.5">{row.username}</span>
                                        </div>
                                        <div className="text-right flex-shrink-0 border-l border-white/5 pl-3">
                                            <span className="text-xs font-display font-bold text-white/80 tabular-nums">{row.xp} <span className="text-[10px] text-white/30 font-semibold tracking-normal">XP</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Simulated Discovery Friend Request */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-display font-semibold text-white/40 block px-1">Suggeriti per te</span>
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 relative overflow-hidden">
                                {mockAdded && (
                                    <span 
                                        className="absolute -top-4 right-6 text-xs font-display font-bold text-brand-lime select-none z-20 pointer-events-none"
                                        style={{ animation: 'floatUp 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards' }}
                                    >
                                        +10 XP 🔥
                                    </span>
                                )}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center font-bold text-xs text-brand-lime">
                                        G
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs font-display font-bold text-white/95 truncate block leading-none">Giulia Rossini</span>
                                        <span className="text-[10px] text-brand-lime/80 font-display font-semibold block mt-0.5">5 amici in comune</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setMockAdded(true)}
                                    className={`h-8 px-3.5 rounded-lg font-display font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all duration-300 ${
                                        mockAdded 
                                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                            : 'bg-brand-lime text-black shadow-lg shadow-brand-lime/10 hover:opacity-90 active:scale-95'
                                    }`}
                                >
                                    {mockAdded ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3px]" />
                                            <span>Aggiunto</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5 text-black stroke-[3px]" />
                                            <span>Aggiungi</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showInfoModal && createPortal(
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="absolute inset-0 cursor-pointer" onClick={() => setShowInfoModal(false)} />
                    <div className="relative w-full max-w-xl bg-[#09090b]/95 border border-white/5 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-6 md:p-8 space-y-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col justify-between">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-brand-lime" />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-lg font-display font-bold text-white">Eversia Social Hub</h4>
                                    <span className="text-xs text-brand-lime font-display font-semibold">Dettaglio social e gamification</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Tab Switcher */}
                        <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
                            {[
                                { id: 'overview', label: 'Community', icon: Users },
                                { id: 'xp', label: 'XP & Classifica', icon: Trophy },
                                { id: 'badges', label: 'Badge', icon: Award },
                                { id: 'privacy', label: 'Privacy', icon: ShieldCheck }
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = modalTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setModalTab(tab.id as any)}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-[10px] font-display font-semibold transition-all duration-300 cursor-pointer ${
                                            isActive 
                                                ? 'bg-white/10 text-white shadow-md border border-white/5' 
                                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.01]'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'opacity-60'}`} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content Section with Animation */}
                        <div className="space-y-6 text-left tab-content min-h-[300px] flex flex-col justify-between py-2">
                            {modalTab === 'overview' && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <p className="text-white/70 text-xs leading-relaxed font-medium">
                                            Eversia Social Hub unisce gli studenti del Liceo Agnesi. All'interno potrai vivere le assemblee in modo attivo, scoprendo nuovi amici e collaborando per rendere memorabili le giornate di attività.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-xs font-display font-semibold text-white/40 block px-1">Cosa puoi fare</span>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-start gap-3">
                                                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-display font-bold text-white">Agende condivise</h5>
                                                    <p className="text-[10px] text-white/40 font-medium leading-normal mt-0.5">Scopri a quali laboratori sono registrati i tuoi amici per pianificare la giornata insieme ed evitare di finire in aule separate.</p>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-start gap-3">
                                                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-display font-bold text-white">Profili degli studenti</h5>
                                                    <p className="text-[10px] text-white/40 font-medium leading-normal mt-0.5">Esplora i profili personalizzati dei compagni, guarda il loro livello di esperienza (XP), la classe e i badge sbloccati.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalTab === 'xp' && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <p className="text-white/70 text-xs leading-relaxed font-medium">
                                            Ogni interazione ed azione sul portale Eversia ti premia con punti esperienza (XP). Sali di livello e dimostra il tuo impegno per la community scolastica!
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-xs font-display font-semibold text-white/40 block px-1">Guadagni XP e attività</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { title: "Check-in giornaliero", value: "+1 XP / Giorno", desc: "Streak attivo!" },
                                                { title: "Presenza in aula", value: "+250 XP / Turno", desc: "Partecipa al turno" },
                                                { title: "Nuova amicizia", value: "+10 XP", desc: "Espandi la rete" },
                                                { title: "Sblocco badge", value: "Fino a +1500 XP", desc: "Traguardi rari" }
                                            ].map((item, i) => (
                                                <div key={i} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                                                    <div>
                                                        <span className="text-[10px] font-display font-bold text-brand-lime block">{item.title}</span>
                                                        <p className="text-[9px] text-white/30 font-medium leading-normal mt-0.5">{item.desc}</p>
                                                    </div>
                                                    <span className="text-xs font-display font-bold text-white mt-1.5">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalTab === 'badges' && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <p className="text-white/70 text-xs leading-relaxed font-medium">
                                            Sblocca rari badge digitali completando traguardi reali nell'assemblea. I badge verranno mostrati sul tuo profilo pubblico!
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-xs font-display font-semibold text-white/40 block px-1">Badge disponibili</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { name: "Pioniere", rarity: "Epico", value: "+800 XP", desc: "Primi iscritti del Liceo", glow: "shadow-[0_0_15px_rgba(147,51,234,0.15)] border-purple-500/20 text-purple-400 bg-purple-500/5" },
                                                { name: "Leggenda", rarity: "Leggendario", value: "+1500 XP", desc: "Nessuna assenza nei lab", glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/20 text-amber-400 bg-amber-500/5" },
                                                { name: "Social Star", rarity: "Raro", value: "+400 XP", desc: "Raggiungi 15 amici", glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)] border-emerald-500/20 text-emerald-400 bg-emerald-500/5" },
                                                { name: "Streak Master", rarity: "Epico", value: "+800 XP", desc: "7 giorni di check-in", glow: "shadow-[0_0_15px_rgba(249,115,22,0.15)] border-orange-500/20 text-orange-400 bg-orange-500/5" }
                                            ].map((badge, i) => (
                                                <div key={i} className={`p-3 border rounded-2xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between gap-1 ${badge.glow}`}>
                                                    <div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-display font-bold">{badge.name}</span>
                                                            <span className="text-[8px] font-display font-bold bg-white/5 border border-white/10 px-1 rounded text-white/45">{badge.rarity}</span>
                                                        </div>
                                                        <p className="text-[9px] opacity-60 font-medium leading-normal mt-1">{badge.desc}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                                                        <Crown className="w-3.5 h-3.5 opacity-60" />
                                                        <span className="text-xs font-display font-bold tabular-nums">{badge.value}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalTab === 'privacy' && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex gap-3 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <ShieldCheck className="w-8 h-8 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[10px] font-display font-bold text-white">Privacy di istituto</span>
                                            </div>
                                            <p className="text-xs text-white/50 leading-relaxed font-medium">
                                                La visibilità dei profili, dei badge e dei turni è limitata esclusivamente agli studenti e al personale scolastico autenticato del Liceo Agnesi. Nessun dato personale è accessibile dall'esterno dell'istituto.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-xs font-display font-semibold text-white/40 block px-1">Sicurezza e opzioni</span>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-start gap-3">
                                                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                                                    <Lock className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-display font-bold text-white">Circuito scolastico chiuso</h5>
                                                    <p className="text-[10px] text-white/40 font-medium leading-normal mt-0.5">L'accesso è consentito esclusivamente tramite le credenziali Google istituzionali fornite dalla scuola.</p>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-start gap-3">
                                                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                                                    <EyeOff className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-display font-bold text-white">Controllo invisibilità</h5>
                                                    <p className="text-[10px] text-white/40 font-medium leading-normal mt-0.5">Se preferisci, puoi nascondere in ogni momento la tua presenza dalla classifica e dal motore di ricerca.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="pt-4 border-t border-white/5">
                            <motion.button 
                                onClick={() => setShowInfoModal(false)}
                                className="w-full py-4 bg-primary text-black rounded-2xl font-display font-bold text-sm shadow-[0_15px_30px_rgba(0,130,230,0.15)] text-center cursor-pointer"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                Ho capito
                            </motion.button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};
