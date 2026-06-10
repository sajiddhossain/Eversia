import React from 'react';
import { ArrowLeft, Shield, Mail, Building, FileText, Database, UserCheck, Lock, CheckCircle2, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();

    const acceptanceDate = React.useMemo(() => {
        if (!userProfile?.privacyAccepted || !userProfile?.privacyAcceptedAt) return null;
        
        // Handle Firestore Timestamp or numeric timestamp
        const timestamp = userProfile.privacyAcceptedAt;
        const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp);
        
        return date.toLocaleDateString('it-IT');
    }, [userProfile?.privacyAccepted, userProfile?.privacyAcceptedAt]);

    return (
        <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white p-5 md:p-12 pb-24 relative overflow-hidden flex justify-center -mt-20 pt-20">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)] pointer-events-none"></div>

            {/* Floating Orbs for "Wow" factor */}
            <div className="absolute top-1/4 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-3xl relative z-10 pt-8 md:pt-20">
                {/* Minimal Breadcrumb Back Link */}
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 text-xs font-display font-semibold text-white/30 hover:text-primary transition-colors cursor-pointer group mb-6 sm:mb-8"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Torna alla Home</span>
                </button>

                {/* Header */}
                <div className="mb-10 md:mb-16 animate-in slide-in-from-bottom-4 duration-700 fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-6 sm:mb-8 text-blue-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="text-xs font-display font-semibold">Security & privacy</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight mb-6 leading-[1.1]">
                        Informativa <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 drop-shadow-[0_0_30px_rgba(0,130,230,0.15)]">dati e privacy.</span>
                    </h1>
                    <p className="text-white/40 font-medium text-sm sm:text-base md:text-lg leading-relaxed mt-4 max-w-2xl border-l-2 border-white/10 pl-5">
                        Documento ufficiale sulla protezione dei dati per l'ecosistema <strong className="text-white/70">Eversia</strong>.
                        Trasparenza e sicurezza per l'istituto Agnesi.
                    </p>

                    {userProfile?.privacyAccepted && (
                        <div className="mt-8 flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-left-4 duration-500">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs font-display font-semibold text-emerald-400 mb-0.5">Stato consenso</p>
                                <p className="text-sm font-bold text-white/80">
                                    Hai confermato l'informativa privacy in data {acceptanceDate}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Blocks */}
                <div className="space-y-5 md:space-y-8 animate-in slide-in-from-bottom-8 duration-1000 fade-in relative">
                    <div className="absolute -left-[38px] top-0 bottom-0 w-px bg-gradient-to-b from-primary via-blue-500/20 to-transparent hidden md:block"></div>

                    {/* Section 1 */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-primary/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-primary shadow-[0_0_15px_rgba(0,130,230,0.4)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Building className="w-5 h-5 md:w-6 md:h-6 text-white/70" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">1. Ambito di utilizzo</h2>
                                <p className="text-brand-lime/80 text-xs font-display font-semibold mt-0.5">Accesso istituzionale</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium">
                            Il Sistema è una piattaforma software open-source (rilasciata con licenza GNU AGPLv3) e configurata per l'uso interno del <strong className="text-white/90">Liceo M.G. Agnesi</strong>.
                            L'accesso è consentito unicamente tramite il dominio scolastico <code className="bg-white/10 px-2 py-0.5 rounded text-primary font-bold">@liceoagnesi.edu.it</code>.
                            Utenze esterne non autorizzate vengono automaticamente respinte dalla sandbox di autenticazione.
                            <br /><br />
                            Seguiamo rigorosi protocolli di <strong className="text-primary tracking-wide italic">Privacy by Design</strong> e <strong className="text-primary tracking-wide italic">Data Minimization</strong> per limitare la raccolta dati allo stretto indispensabile.
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-blue-500/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Database className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">2. Dati raccolti</h2>
                                <p className="text-blue-400/80 text-xs font-display font-semibold mt-0.5">Informazioni e metriche</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium mb-6">
                            Processiamo esclusivamente i dati necessari alla logistica delle assemblee:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                "Email Google Workspace (@liceoagnesi.edu.it)",
                                "Profilo (Nome/Cognome, Username, Bio)",
                                "Dati Social (Amici e Richieste)",
                                "Gamification (XP, Livello, Badge guadagnati)",
                                "Log delle Prenotazioni e Check-in in aula",
                                "Valutazioni e Feedback attività"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl transition-all hover:bg-white/10 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)] group-hover:scale-125 transition-transform" />
                                    <span className="text-xs font-display font-semibold text-white/50 leading-none">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-purple-500/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Scale className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">3. Framework normativo</h2>
                                <p className="text-purple-400/80 text-xs font-display font-semibold mt-0.5">Conformità legale e GDPR</p>
                            </div>
                        </div>
                        
                        <div className="space-y-6 text-white/50 text-sm md:text-base leading-relaxed font-medium">
                            <p>
                                L'implementazione di una solution digitale in ambito scolastico richiede il rigoroso rispetto delle normative nazionali ed europee. Eversia è stata sviluppata seguendo il principio di <strong className="text-white/80">Compliance by Design</strong>, garantendo che la sicurezza e la protezione dei dati siano integrate nell'architettura stessa del software.
                            </p>

                            {/* Subsection 3.1 */}
                            <div className="border-t border-white/[0.05] pt-5 mt-4 space-y-3">
                                <h3 className="text-sm font-display font-bold text-purple-300">3.1 D.Lgs. 81/08: Sicurezza e Gestione delle Emergenze</h3>
                                <p className="text-xs leading-relaxed text-white/40">
                                    Il D.Lgs. 81/2008 impone il rispetto stringente delle capienze massime per i locali, in funzione delle vie di esodo e del carico d'incendio. L'attuale gestione basata su strumenti non transazionali (moduli web generici o fogli di calcolo) espone l'Istituto a rischi di sovraffollamento, poiché tali sistemi non sono in grado di gestire la concorrenza in tempo reale.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                        <h4 className="text-xs font-display font-bold text-red-400 mb-1">Analisi del Rischio</h4>
                                        <p className="text-[11px] leading-relaxed text-white/55 font-medium">
                                            I sistemi legacy permettono la sovrascrittura o l'aggiramento dei contatori, rendendo possibile il superamento della capienza massima omologata. Tale eventualità configura una criticità in termini di responsabilità civile e penale per la Dirigenza in caso di emergenza.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-[#e2f33c]/5 border border-[#e2f33c]/10 rounded-2xl">
                                        <h4 className="text-xs font-display font-bold text-brand-lime mb-1">Mitigazione Tecnica</h4>
                                        <p className="text-[11px] leading-relaxed text-white/55 font-medium">
                                            Eversia implementa un motore transazionale che impedisce matematicamente l'overbooking. Ogni richiesta di prenotazione viene validata server-side con latenze nell'ordine dei microsecondi. Il sistema garantisce che, una volta raggiunta la soglia di sicurezza di un ambiente, ogni ulteriore tentativo di accesso venga bloccato.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Subsection 3.2 */}
                            <div className="border-t border-white/[0.05] pt-5 space-y-3">
                                <h3 className="text-sm font-display font-bold text-purple-300">3.2 GDPR (Regolamento UE 2016/679): Protezione dei Dati Personali</h3>
                                <p className="text-xs leading-relaxed text-white/40">
                                    Il trattamento dei dati personali degli studenti è gestito secondo i principi di necessità e proporzionalità, in linea con il GDPR.
                                </p>
                                <div className="space-y-2.5 mt-2">
                                    <div className="flex gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                                        <div>
                                            <strong className="text-xs font-display font-bold text-white/80 block">Minimizzazione del Dato (Art. 5, par. 1, lett. c)</strong>
                                            <span className="text-[11px] text-white/45 block mt-0.5">Il sistema acquisisce esclusivamente i dati strettamente necessari all'identificazione (Nome, Cognome, email istituzionale). Non vengono raccolti dati sensibili, recapiti telefonici o informazioni non pertinenti.</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                                        <div>
                                            <strong className="text-xs font-display font-bold text-white/80 block">Consenso e Trasparenza</strong>
                                            <span className="text-[11px] text-white/45 block mt-0.5">L'accesso alla piattaforma è subordinato all'accettazione esplicita della Privacy Policy d'Istituto, registrata tramite timestamp digitale in fase di primo accesso (onboarding).</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                                        <div>
                                            <strong className="text-xs font-display font-bold text-white/80 block">Data Retention e Diritto all'Oblio</strong>
                                            <span className="text-[11px] text-white/45 block mt-0.5">L'architettura prevede procedure automatizzate di Wipe sicuro al termine di ogni anno scolastico, garantendo la cancellazione definitiva di tutte le anagrafiche.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 4 */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-emerald-500/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">4. Trattamento</h2>
                                <p className="text-emerald-400/80 text-xs font-display font-semibold mt-0.5">Finalità istituzionale</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium">
                            I dati vengono usati per la gestione dei ruoli, la rendicontazione delle presenze e per alimentare le funzioni social e di gamification (classifiche e badge).
                            <br /><br />
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-display font-semibold text-emerald-400">
                                <Shield className="w-3.5 h-3.5" /> Trasparenza Community: Il tuo profilo (Nome, Badges, Livello) è visibile agli altri studenti autenticati del Liceo.
                            </span>
                        </p>
                    </div>

                    {/* Section 5 - Lockdown & Maintenance */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-red-500/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Lock className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">5. Sicurezza e logs</h2>
                                <p className="text-red-400/80 text-xs font-display font-semibold mt-0.5">Audit e tracciamento</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium">
                            Per ragioni di sicurezza e integrità del sistema, registriamo i tentativi di accesso alle aree amministrative e le attivazioni della <strong>Modalità Manutenzione (Lockdown)</strong>. 
                            Questi log servono a prevenire intrusioni e sono conservati nel database Firebase protetto.
                        </p>
                    </div>

                    {/* Section 6 (Supporto) */}
                    <div className="bg-primary/10 border border-primary/20 hover:border-primary/40 hover:bg-primary/[0.12] rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-[0_0_80px_-20px_rgba(0,130,230,0.15)] relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] hidden md:block group-hover:scale-150 transition-transform z-20"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6 md:mb-8">
                                <div className="w-11 h-11 md:w-12 md:h-12 bg-black/40 rounded-[1rem] flex items-center justify-center shrink-0 border border-primary/20">
                                    <Mail className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-display font-bold text-primary leading-tight">Supporto</h2>
                                    <p className="text-primary/80 text-xs font-display font-semibold mt-0.5">DPO e contatti sviluppatore</p>
                                </div>
                            </div>
                            <p className="text-white/60 text-sm md:text-base leading-relaxed font-medium mb-8">
                                Per segnalazioni di privacy o malfunzionamenti tecnici, contatta il responsabile:
                            </p>
                            <a
                                href="mailto:assemblee@liceoagnesi.edu.it"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black hover:bg-primary hover:text-black rounded-2xl font-display font-bold text-xs transition-colors shadow-2xl relative overflow-hidden group btn-press"
                            >
                                <Mail className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                                assemblee@liceoagnesi.edu.it
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Back to Home Action */}
                <div className="mt-16 md:mt-24 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl font-display font-bold text-xs shadow-[0_20px_40px_rgba(0,130,230,0.15)] group cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Torna alla Home
                    </button>
                </div>

                {/* Footer Signature */}
                <div className="mt-12 md:mt-16 pt-10 border-t border-white/10 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 delay-500">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                        <FileText className="w-5 h-5 text-white/30" />
                    </div>
                    <p className="text-[10px] font-display font-semibold text-white/20 leading-loose tracking-wider">
                        Versione 2.6 • Aggiornamento Maggio 2026<br />
                        <span className="text-white/10 font-normal">Liceo Scientifico e Linguistico Statale M.G. Agnesi</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
