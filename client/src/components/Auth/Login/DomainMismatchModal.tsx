import React from 'react';
import { ShieldAlert, LogOut, ArrowRight, XCircle } from 'lucide-react';

interface DomainMismatchModalProps {
    onClose: () => void;
}

const DomainMismatchModal: React.FC<DomainMismatchModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-500" />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#09090b]/95 border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-500">
                {/* Decorative Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-[100px]" />

                <div className="p-8 sm:p-12 space-y-10 text-center">
                    {/* Icon */}
                    <div className="relative inline-flex">
                        <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex items-center justify-center">
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                        <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
                            Accesso negato
                        </h2>
                        <div className="space-y-3">
                            <p className="text-sm sm:text-base text-white/60 font-medium leading-relaxed font-display">
                                L'accesso a questo portale è riservato esclusivamente agli studenti e al personale del <span className="text-white font-bold underline decoration-red-500/50">Liceo M.G. Agnesi</span>.
                            </p>
                            <div className="flex flex-col gap-2 px-4 py-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-xs font-display font-semibold text-red-400">@liceoagnesi.edu.it</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-60">
                                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-xs font-display font-semibold text-red-400">@liceoagnesi.gov.it</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                        <p className="text-xs font-display font-semibold text-white/30">Cosa fare ora?</p>
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-3 text-xs text-white/50 font-medium font-display">
                                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                <span>Disconnetti l'account attuale</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-white/50 font-medium font-display">
                                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                <span>Accedi con l'email istituzionale fornita dalla scuola</span>
                            </div>
                        </div>
                    </div>

                    {/* Action */}
                    <button
                        onClick={onClose}
                        className="w-full h-16 bg-white text-black rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-3 transition-colors hover:bg-neutral-200 active:scale-[0.98] shadow-[0_10px_40px_rgba(255,255,255,0.05)]"
                    >
                        <LogOut className="w-4 h-4" />
                        Ho capito, riprova
                    </button>

                    <p className="text-[10px] font-display font-semibold text-white/20">
                        Security Enforcement eversia v4.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DomainMismatchModal;
