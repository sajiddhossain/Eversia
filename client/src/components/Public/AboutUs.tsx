import React from 'react';
import { ArrowLeft, Users, Target, Code2, Award, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AboutUs: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white p-5 md:p-12 pb-24 relative overflow-hidden flex justify-center -mt-20 pt-20">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)] pointer-events-none"></div>

            {/* Ambient Orbs for Premium Design */}
            <div className="absolute top-1/4 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 mb-6 sm:mb-8 text-primary">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs font-display font-semibold">Chi siamo</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold tracking-tight mb-6 leading-[1.1]">
                        Il progetto <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 drop-shadow-[0_0_30px_rgba(0,130,230,0.15)]">Eversia.</span>
                    </h1>
                    <p className="text-white/40 font-medium text-sm sm:text-base md:text-lg leading-relaxed mt-4 max-w-2xl border-l-2 border-white/10 pl-5">
                        La piattaforma intelligente progettata per digitalizzare, semplificare e arricchire la gestione delle assemblee studentesche al <strong className="text-white/70">Liceo M.G. Agnesi</strong>.
                    </p>
                </div>

                {/* Content Blocks */}
                <div className="space-y-5 md:space-y-8 animate-in slide-in-from-bottom-8 duration-1000 fade-in relative">
                    <div className="absolute -left-[38px] top-0 bottom-0 w-px bg-gradient-to-b from-primary via-emerald-500/20 to-transparent hidden md:block"></div>

                    {/* Mission */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-primary/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-primary shadow-[0_0_15px_rgba(0,130,230,0.4)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Target className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">La nostra missione</h2>
                                <p className="text-brand-lime/80 text-xs font-display font-semibold mt-0.5">Sicurezza ed efficienza</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium">
                            Eversia nasce dall'esigenza concreta di superare i limiti organizzativi delle assemblee d'istituto tradizionali. I vecchi fogli di calcolo o moduli statici esponevano la scuola a rischi di sovraffollamento e disallineamenti di capienza. 
                            <br /><br />
                            Implementando un motore transazionale in tempo reale, Eversia garantisce la piena compliance al <strong className="text-white/80">D.Lgs. 81/08 (Sicurezza sul Lavoro e Gestione Emergenze)</strong>, bloccando preventivamente ogni tentativo di iscrizione oltre la capienza massima omologata per ciascuna aula.
                        </p>
                    </div>

                    {/* Creator & Development */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-emerald-500/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Code2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">Sviluppo e tecnologie</h2>
                                <p className="text-emerald-400/80 text-xs font-display font-semibold mt-0.5">Sajid Hossain • Liceo Agnesi</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium mb-6">
                            L'intero ecosistema software di Eversia è stato concepito, disegnato e sviluppato con passione da <strong className="text-white/80">Sajid Hossain</strong>, studente del Liceo M.G. Agnesi. Il progetto si avvale delle tecnologie più moderne del web per offrire reattività e sicurezza:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                "Frontend in React con TypeScript",
                                "Interfaccia Custom CSS & Glassmorphism",
                                "Gestione DB in tempo reale con Firestore",
                                "Serverless Logic con Firebase Functions",
                                "Transazioni atomiche ACID server-side",
                                "MGA Engine V3 (Sicurezza & Appello)"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl transition-all hover:bg-white/10 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)] group-hover:scale-125 transition-transform" />
                                    <span className="text-xs font-display font-semibold text-white/50 leading-none">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gamification */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-blue-500/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Award className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">Gamification e community</h2>
                                <p className="text-blue-400/80 text-xs font-display font-semibold mt-0.5">Esperienza e crescita</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium">
                            La partecipazione attiva degli studenti è incentivata attraverso un sistema di gamification integrato:
                            <br /><br />
                            Ogni attività completata fa guadagnare <strong className="text-white/80">Punti Esperienza (XP)</strong> per avanzare di livello. Le partecipazioni consecutive mantengono attiva la <strong className="text-white/80">Streak</strong> giornaliera, e il completamento di specifici percorsi sblocca <strong className="text-white/80">Badge</strong> esclusivi sul proprio profilo pubblico condivisibile con gli amici.
                        </p>
                    </div>

                    {/* AGPLv3 Open Source */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-red-500/30 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative group overflow-hidden transition-all duration-300 scroll-reveal-item">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute top-10 md:-left-[2.75rem] w-3 h-3 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hidden md:block group-hover:scale-150 transition-transform"></div>

                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-[1rem] flex items-center justify-center shrink-0 border border-white/10">
                                <Heart className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-display font-bold text-white leading-tight">Licenza open source</h2>
                                <p className="text-red-400/80 text-xs font-display font-semibold mt-0.5">GNU AGPLv3 • Software libero</p>
                            </div>
                        </div>
                        <p className="text-white/50 text-sm md:text-base leading-relaxed font-medium">
                            Crediamo fermamente nei valori del software libero e della trasparenza. Eversia è distribuita con licenza <strong className="text-white/80">GNU Affero General Public License v3 (AGPLv3)</strong>. 
                            <br /><br />
                            Questo garantisce che chiunque possa ispezionare il codice sorgente per scopi di trasparenza, ospitare un'istanza autonoma o proporre modifiche, con il vincolo legale di rilasciare a propria volta qualsiasi modifica sotto la medesima licenza aperta.
                        </p>
                    </div>
                </div>

                {/* Bottom Back to Home Action */}
                <div className="mt-16 md:mt-24 pt-10 border-t border-white/10 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl font-display font-bold text-xs shadow-[0_20px_40px_rgba(0,130,230,0.15)] group cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Torna alla Home
                    </button>
                </div>
            </div>
        </div>
    );
};
