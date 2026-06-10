import React, { useState } from 'react';
import { Shield, Lock, FileText, CheckCircle2, ChevronRight, Scale, Info } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';

export const PrivacyModal: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAccept = async () => {
        if (!user || !accepted) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                privacyAccepted: true,
                privacyAcceptedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Failed to accept privacy:", error);
            alert("Errore durante il salvataggio. Riprova.");
        } finally {
            setLoading(false);
        }
    };

    // Attende che le informazioni del profilo utente siano caricate dal database.
    // Previene la comparsa breve (flash) del popup ad ogni login o refresh di sessione.
    if (!user || !userProfile || userProfile.privacyAccepted) return null;


    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 backdrop-blur-2xl bg-black/60 overflow-y-auto">
            <div className="w-full max-w-2xl bg-[#0d0d0f] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_-20px_rgba(226,243,60,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-500">
                
                {/* Header */}
                <div className="p-8 md:p-10 border-b border-white/5 relative bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(226,243,60,0.2)]">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">
                                Privacy <span className="text-primary">Policy.</span>
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Consenso Obbligatorio • V2.5</p>
                        </div>
                    </div>
                    
                    <p className="text-white/50 text-sm font-medium leading-relaxed">
                        Per continuare a utilizzare la piattaforma <strong className="text-white">eversia</strong>, è necessario leggere e accettare l'informativa sul trattamento dei dati personali.
                    </p>
                </div>

                {/* Content Box (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="prose prose-invert max-w-none">
                        
                        <div className="flex gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl mb-8">
                            <Info className="w-5 h-5 text-primary shrink-0" />
                            <p className="text-xs text-white/60 leading-relaxed font-medium">
                                Applichiamo rigorosi principi di <strong className="text-primary">Privacy by Design</strong> e <strong className="text-primary">Data Minimization</strong> per garantire che solo le informazioni strettamente necessarie vengano elaborate.
                            </p>
                        </div>

                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-white/80 font-black uppercase tracking-widest text-xs">
                                <Scale className="w-4 h-4 text-primary" />
                                1. Finalità del Trattamento
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed">
                                I dati raccolti (email istituzionale, nome, cognome, classe) sono utilizzati esclusivamente per la gestione delle prenotazioni alle assemblee studentesche, la sicurezza degli spazi scolastici e le funzioni social interne garantite dal Liceo Agnesi.
                            </p>
                        </section>

                        <section className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-white/80 font-black uppercase tracking-widest text-xs">
                                <Lock className="w-4 h-4 text-blue-400" />
                                2. Sicurezza e Accesso
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed">
                                L'accesso è riservato ai soli possessori di account <code className="bg-white/5 px-2 py-0.5 rounded text-primary">@liceoagnesi.edu.it</code>. I dati non vengono mai ceduti a terzi e sono conservati su server protetti tramite crittografia end-to-end e standard di sicurezza enterprise.
                            </p>
                        </section>

                        <section className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-white/80 font-black uppercase tracking-widest text-xs">
                                <FileText className="w-4 h-4 text-emerald-400" />
                                3. Diritti dell'Utente
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed">
                                Hai il diritto di accedere ai tuoi dati, richiederne la rettifica o la cancellazione contattando il DPO d'istituto o tramite le impostazioni del profilo nel sistema.
                            </p>
                        </section>

                        <div className="pt-8 text-[10px] text-white/20 uppercase tracking-[0.2em] text-center font-bold">
                            L'accettazione è vincolante per l'uso dell'applicativo.
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 md:p-10 bg-white/[0.02] border-t border-white/5">
                    <label className="flex items-start gap-4 mb-8 cursor-pointer group">
                        <div className="relative flex items-center pt-0.5">
                            <input 
                                type="checkbox"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className="peer appearance-none w-6 h-6 rounded-lg bg-white/5 border-2 border-white/10 checked:bg-primary checked:border-primary transition-all duration-300 cursor-pointer"
                            />
                            <CheckCircle2 className="absolute w-4 h-4 text-black scale-0 peer-checked:scale-100 left-1 transition-transform duration-300 pointer-events-none" />
                        </div>
                        <span className="text-xs md:text-sm text-white/50 group-hover:text-white/70 transition-colors font-medium leading-relaxed pt-0.5">
                            Ho letto e accetto l'<strong>informativa sulla privacy</strong> e le condizioni d'uso della piattaforma eversia.
                        </span>
                    </label>

                    <button
                        onClick={handleAccept}
                        disabled={!accepted || loading}
                        className={`w-full group relative flex items-center justify-center gap-3 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.3em] transition-all duration-500 ${
                            accepted && !loading
                                ? 'bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:bg-primary hover:text-black hover:shadow-[0_0_50px_rgba(226,243,60,0.3)]'
                                : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                Accedi
                                <ChevronRight className={`w-4 h-4 transition-transform duration-500 ${accepted ? 'group-hover:translate-x-1.5' : ''}`} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
