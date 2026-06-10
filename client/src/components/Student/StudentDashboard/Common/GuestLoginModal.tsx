import React from 'react';
import { Lock } from 'lucide-react';

interface GuestLoginModalProps {
    onClose: () => void;
    onLogin: () => void;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({ onClose, onLogin }) => {
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <div className="relative bg-surface border border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500">
                <div className="p-10 text-center space-y-8">
                    <div className="w-20 h-20 bg-primary/20 rounded-[2rem] border border-primary/20 flex items-center justify-center mx-auto shadow-2xl relative">
                        <Lock className="w-8 h-8 text-primary" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-surface animate-bounce" />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-2xl font-black uppercase tracking-widest italic">Accesso Richiesto</h3>
                        <p className="text-xs text-white/40 font-medium leading-relaxed">
                            Questa operazione è riservata agli studenti autenticati.<br />
                            Esegui il login per procedere con la prenotazione.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button
                            onClick={onLogin}
                            className="w-full py-5 bg-primary text-black rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] hover:shadow-[0_0_40px_rgba(226,243,60,0.4)] transition-all"
                        >
                            Esegui Login
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 text-white/30 hover:text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
