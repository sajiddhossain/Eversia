import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCheck, RotateCcw, Trash2 } from 'lucide-react';
import type { Student } from '../../../../types';

interface RegistrationControlsProps {
    studentData: Student | null;
    bookedCount: number;
    totalTurns: number;
    bookingInProgress: string | null;
    onFinalize: () => void;
    onUnlock: () => void;
    onReset: () => void;
}

export const RegistrationControls: React.FC<RegistrationControlsProps> = ({
    studentData,
    bookedCount,
    totalTurns,
    bookingInProgress,
    onFinalize,
    onUnlock,
    onReset
}) => {
    return (
        <div id="registration-controls" className="mt-8 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5 shadow-2xl backdrop-blur-xl scroll-mt-24">
            <div className="text-center space-y-1">
                <h3 className="text-sm font-semibold text-white font-display">
                    {studentData?.is_finalized ? 'Prenotazione confermata' : 'Conferma la tua agenda'}
                </h3>
                <p className="text-xs text-white/35 font-medium leading-relaxed max-w-md mx-auto">
                    {studentData?.is_finalized
                        ? 'La tua prenotazione è confermata. Sblocca se desideri apportare modifiche.'
                        : bookedCount === totalTurns
                            ? 'Hai completato tutti i turni. Conferma per garantire i tuoi posti.'
                            : `Completa i ${totalTurns - bookedCount} turni rimanenti per poter confermare.`
                    }
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {bookedCount === totalTurns && !studentData?.is_finalized ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onFinalize}
                        disabled={!!bookingInProgress}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-brand-lime text-black hover:bg-brand-lime/90 rounded-xl font-semibold text-xs transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(226,243,60,0.15)] hover:shadow-[0_0_30px_rgba(226,243,60,0.3)] btn-press cursor-pointer"
                    >
                        {bookingInProgress === 'FINALIZE' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                        Conferma prenotazione
                    </motion.button>
                ) : studentData?.is_finalized ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onUnlock}
                        disabled={!!bookingInProgress}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-semibold text-xs transition-all btn-press cursor-pointer"
                    >
                        {bookingInProgress === 'UNLOCK' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Sblocca agenda
                    </motion.button>
                ) : (
                    <div className="px-6 py-3.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-[10px] font-semibold uppercase tracking-wider text-white/20">
                        Prenota tutti i turni per confermare
                    </div>
                )}

                {bookedCount > 0 && !studentData?.is_finalized && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onReset}
                        disabled={!!bookingInProgress}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl font-semibold text-xs transition-all btn-press cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4" />
                        Svuota agenda
                    </motion.button>
                )}
            </div>
        </div>
    );
};
