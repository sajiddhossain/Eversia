import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

interface TurnModalProps {
    isOpen: boolean;
    activityId: string;
    activityName: string;
    availableTurns: string[];
    onClose: () => void;
    onNavigate: (activityId: string, turnId: string) => void;
}

export const TurnModal: React.FC<TurnModalProps> = ({
    isOpen,
    activityId,
    activityName,
    availableTurns,
    onClose,
    onNavigate
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
                        onClick={onClose} 
                    />

                    {/* Modal container */}
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                        className="relative w-full max-w-md bg-[#09090b]/95 border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-[0_24px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Decorative background glows inside modal */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10 flex-shrink-0 flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-1.5 leading-tight truncate max-w-[280px]">
                                    {activityName}
                                </h3>
                                <p className="text-[10px] font-display font-semibold text-brand-lime">
                                    Seleziona turno da gestire
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>
                        </div>

                        <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide space-y-3.5 pr-1">
                            {availableTurns.map(turnId => (
                                <button
                                    key={turnId}
                                    onClick={() => onNavigate(activityId, turnId)}
                                    className="w-full relative group bg-white/[0.03] hover:bg-brand-lime/10 border border-white/5 hover:border-brand-lime/40 rounded-xl p-5 flex items-center justify-between transition-all duration-300 overflow-hidden text-left"
                                >
                                    <div>
                                        <h4 className="text-2xl font-display font-bold text-white group-hover:text-brand-lime transition-colors">
                                            Turno {turnId}
                                        </h4>
                                        <p className="text-[10px] font-display font-medium text-white/30 mt-0.5">Gestisci presenze aule</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 group-hover:bg-brand-lime group-hover:border-brand-lime/40 flex items-center justify-center transition-all duration-300">
                                        <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-black transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
