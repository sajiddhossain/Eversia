import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, Mail, ShieldQuestion } from 'lucide-react';

const faqs = [
    {
        question: "Come posso prenotare un'attività?",
        answer: "Naviga nella sezione 'Esplora', seleziona un'assemblea attiva e scegli l'attività che preferisci per ogni turno disponibile. Una volta confermata, apparirà nella tua agenda."
    },
    {
        question: "Cosa succede se arrivo in ritardo?",
        answer: "Il sistema monitora le presenze in tempo reale. Se arrivi in ritardo, recati direttamente nell'aula assegnata e segnalalo al Room Manager per il check-in manuale."
    },
    {
        question: "Posso cambiare attività all'ultimo minuto?",
        answer: "Sì, se ci sono ancora posti disponibili nell'attività di destinazione. Il sistema aggiornerà automaticamente la tua posizione e libererà il posto precedente."
    },
    {
        question: "Il mio check-in risulta errato, cosa fare?",
        answer: "Se visualizzi l'avviso 'Imprevisto' nella tua timeline, significa che sei stato registrato in un'aula diversa da quella prenotata. Contatta il personale di sicurezza per regolarizzare la posizione."
    }
];

const SupportWidget: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl md:rounded-[2.5rem] overflow-hidden backdrop-blur-3xl group">
            {/* Header */}
            <div className="p-5 md:p-8 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                        <HelpCircle className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold italic tracking-tight font-display text-white">Supporto & FAQ</h2>
                </div>
                <p className="text-[10px] font-semibold text-white/30 tracking-wider ml-11 uppercase">Centro assistenza eversia</p>
            </div>

            {/* FAQ Accordion */}
            <div className="p-4 space-y-2">
                {faqs.map((faq, index) => (
                    <div 
                        key={index}
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                            openIndex === index 
                            ? 'bg-white/[0.05] border-white/20' 
                            : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                        }`}
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            className="w-full p-4 flex items-center justify-between text-left"
                        >
                            <span className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
                                {faq.question}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-white/20 transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-primary' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                            {openIndex === index && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4">
                                        <p className="text-xs font-medium text-white/40 leading-relaxed border-t border-white/5 pt-3">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Support Contacts */}
            <div className="p-4 md:p-6 bg-brand-lime/[0.02] border-t border-white/5 mt-2">
                <p className="text-xs font-semibold text-white/30 tracking-wider mb-4 ml-2 uppercase">Contatti rapidi</p>
                <div className="grid grid-cols-1 gap-3">
                    <motion.a 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        href="mailto:assemblee@liceoagnesi.edu.it"
                        className="flex items-center gap-3 p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-primary/40 hover:bg-black/60 transition-all group/link btn-press"
                    >
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 group-hover/link:text-primary transition-colors">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 group-hover/link:text-white transition-colors">Email support</span>
                            <span className="text-[9px] font-medium text-white/20">Risposta entro 24h</span>
                        </div>
                    </motion.a>
                </div>
            </div>

            {/* Footer Tag */}
            <div className="px-5 md:px-8 py-4 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldQuestion className="w-3 h-3 text-brand-lime/40" />
                    <span className="text-[8px] font-semibold uppercase tracking-wider text-white/10 italic">Secure Support Module v2.0</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse" />
            </div>
        </div>
    );
};

export default SupportWidget;
