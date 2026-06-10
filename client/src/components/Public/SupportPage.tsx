import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Mail, BookOpen, ShieldCheck, AlertCircle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
    question: string;
    answer: string;
}

export const SupportPage: React.FC = () => {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqs: FAQItem[] = [
        {
            question: "Come faccio a prenotare un'attività?",
            answer: "Accedi all'area studente con il tuo account istituzionale Google (@liceoagnesi.edu.it), seleziona l'assemblea attiva e scegli l'attività che preferisci per ciascun turno. Ricorda che le prenotazioni avvengono in tempo reale e i posti sono limitati."
        },
        {
            question: "Cosa succede se un'aula è piena?",
            answer: "Al fine di garantire il pieno rispetto delle normative sulla sicurezza (D.Lgs. 81/08), Eversia blocca automaticamente le prenotazioni non appena un'aula raggiunge la capienza massima stabilita. Se l'attività che desideri è al completo, dovrai selezionare un'aula alternativa per quel turno."
        },
        {
            question: "Come vengono protetti i miei dati personali?",
            answer: "Trattiamo solo i dati indispensabili per l'organizzazione delle assemblee (nome, cognome, email istituzionale e log di check-in). Nessuna informazione viene diffusa all'esterno del Liceo Agnesi. Inoltre, tutte le anagrafiche e le metriche social vengono rimosse definitivamente al termine di ogni anno scolastico."
        },
        {
            question: "Posso modificare una prenotazione già effettuata?",
            answer: "Sì. Entrando nella sezione 'La mia agenda' del tuo pannello studente, puoi annullare una prenotazione effettuata e selezionare un'altra attività tra quelle ancora disponibili. Questo è possibile fino al momento dell'inizio del turno."
        },
        {
            question: "Non riesco ad accedere alla piattaforma, come risolvo?",
            answer: "L'accesso ad Eversia è consentito unicamente tramite il login di Google con l'email istituzionale dell'istituto Agnesi. Se visualizzi un errore di autenticazione, assicurati di non aver selezionato un account Google personale (es. @gmail.com) nel browser."
        }
    ];

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    return (
        <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white p-5 md:p-12 pb-24 relative overflow-hidden flex justify-center -mt-20 pt-20">
            {/* Ambient Background & Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)] pointer-events-none"></div>

            {/* Glowing ambient lights */}
            <div className="absolute top-1/4 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-[110px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 -left-24 w-72 h-72 bg-brand-lime/5 rounded-full blur-[110px] pointer-events-none"></div>

            <div className="w-full max-w-3xl relative z-10 pt-8 md:pt-20">
                {/* Back Button */}
                <motion.button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 text-xs font-display font-semibold text-white/30 hover:text-primary transition-colors cursor-pointer group mb-6 sm:mb-8"
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Torna alla Home</span>
                </motion.button>

                {/* Header Section */}
                <div className="mb-10 md:mb-16 animate-in slide-in-from-bottom-4 duration-700 fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 mb-6 sm:mb-8 text-primary">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-display font-semibold">Assistenza & Supporto</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold tracking-tight mb-6 leading-[1.05]">
                        Come possiamo <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-lime drop-shadow-[0_0_30px_rgba(0,130,230,0.15)]">aiutarti?</span>
                    </h1>
                    <p className="text-white/40 font-medium text-sm sm:text-base md:text-lg leading-relaxed mt-4 max-w-2xl border-l-2 border-white/10 pl-5">
                        Trova risposte rapide alle domande più frequenti o contatta direttamente il team di sviluppo di <strong className="text-white/70">Eversia</strong> per segnalazioni.
                    </p>
                </div>

                {/* Bento layout for Support sections */}
                <div className="space-y-6 md:space-y-8">
                    
                    {/* FAQ Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2.5 mb-4 pl-1">
                            <BookOpen className="w-5 h-5 text-primary/80" />
                            <h2 className="text-lg md:text-xl font-display font-bold">Domande frequenti</h2>
                        </div>

                        <div className="space-y-3">
                            {faqs.map((faq, index) => {
                                const isOpen = openFaq === index;
                                return (
                                    <div 
                                        key={index} 
                                        className="bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl"
                                    >
                                        <button
                                            onClick={() => toggleFaq(index)}
                                            className="w-full p-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-white/[0.01]"
                                        >
                                            <span className="text-sm md:text-base font-display font-bold text-white/80 group-hover:text-white">
                                                {faq.question}
                                            </span>
                                            <motion.div
                                                animate={{ rotate: isOpen ? 180 : 0 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0"
                                            >
                                                <ChevronDown className="w-4 h-4 text-white/50" />
                                            </motion.div>
                                        </button>

                                        <AnimatePresence initial={false}>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ type: 'spring', duration: 0.35, bounce: 0.05 }}
                                                >
                                                    <div className="px-5 pb-5 pt-1 border-t border-white/5">
                                                        <p className="text-white/50 text-sm leading-relaxed font-medium">
                                                            {faq.answer}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Contact Bento Box */}
                    <div className="bg-white/[0.01] border border-white/5 hover:border-primary/20 rounded-[2rem] p-6 md:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden transition-all duration-300 group">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-11 h-11 md:w-12 md:h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                    <Mail className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-xl font-display font-bold">Hai ancora dubbi?</h3>
                                    <p className="text-xs font-display font-semibold text-primary">Invia una richiesta di supporto</p>
                                </div>
                            </div>

                            <p className="text-white/50 text-sm leading-relaxed font-medium mb-8 max-w-xl">
                                Per bug tecnici riscontrati nella piattaforma, anomalie con le prenotazioni dei turni o per contattare il Data Protection Officer (DPO) dell'istituto per chiarimenti sulla privacy, inviaci un'email all'indirizzo istituzionale dedicato.
                            </p>

                            <motion.a
                                href="mailto:assemblee@liceoagnesi.edu.it"
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black hover:bg-primary hover:text-black rounded-2xl font-display font-bold text-xs transition-colors shadow-2xl"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Mail className="w-4 h-4" />
                                assemblee@liceoagnesi.edu.it
                            </motion.a>
                        </div>
                    </div>

                    {/* Bottom disclaimer */}
                    <div className="flex gap-3 p-4 bg-white/[0.01] border border-white/5 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-white/30 shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-white/40">
                            <strong>Nota importante:</strong> Eversia è uno strumento di logistica ad uso esclusivo degli studenti e dello staff del Liceo Statale M.G. Agnesi. Qualsiasi tentativo di accesso o manomissione da domini diversi da <code>@liceoagnesi.edu.it</code> viene tracciato ed inibito per ragioni di sicurezza della rete.
                        </p>
                    </div>

                </div>

                {/* Footer Signature */}
                <div className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-6">
                        <ShieldCheck className="w-5 h-5 text-emerald-500/50" />
                    </div>
                    <p className="text-[10px] font-display font-semibold text-white/20 tracking-wider">
                        EVERSIA SYSTEM SUPPORT ENGINE V3<br />
                        <span className="text-white/10 font-normal mt-1 block">Liceo Agnesi • Eversia Software</span>
                    </p>
                </div>

            </div>
        </div>
    );
};
