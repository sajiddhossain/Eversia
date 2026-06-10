import React, { useState, useRef, useEffect } from "react";
import { Shield, Lock, X, AlertTriangle, CheckCircle2, Fingerprint } from "lucide-react";

interface SecurityGuardProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: (pin?: string) => void;
    currentPin?: string;
    onSetPin?: (newPin: string) => Promise<void>;
    actionName: string;
    forceSettingMode?: boolean;
}

export const SecurityGuard: React.FC<SecurityGuardProps> = ({
    isOpen,
    onClose,
    onVerified,
    currentPin,
    onSetPin,
    actionName,
    forceSettingMode
}) => {
    const [digits, setDigits] = useState(["", "", "", ""]);
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSettingMode, setIsSettingMode] = useState(forceSettingMode || !currentPin);
    const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    useEffect(() => {
        if (isOpen) {
            setIsSettingMode(forceSettingMode || !currentPin);
            setDigits(["", "", "", ""]);
            setError("");
            setTimeout(() => inputRefs[0].current?.focus(), 100);
        }
    }, [isOpen, forceSettingMode, currentPin]);

    if (!isOpen) return null;

    const fullPin = digits.join("");

    const handleDigitChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1); // only last digit
        if (!/^\d*$/.test(value)) return;

        const newDigits = [...digits];
        newDigits[index] = value;
        setDigits(newDigits);
        setError("");

        // Auto focus next
        if (value && index < 3) {
            inputRefs[index + 1].current?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
        if (e.key === "Enter" && fullPin.length === 4) {
            handleSubmit();
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (fullPin.length < 4) return;

        setError("");
        setIsProcessing(true);

        try {
            if (isSettingMode) {
                if (onSetPin) {
                    await onSetPin(fullPin);
                    setIsSettingMode(false);
                    setDigits(["", "", "", ""]);
                    alert("PIN di sicurezza impostato con successo!");
                }
            } else {
                if (fullPin === currentPin) {
                    onVerified(fullPin);
                    onClose();
                    setDigits(["", "", "", ""]);
                } else {
                    setError("PIN errato. Riprova.");
                    setDigits(["", "", "", ""]);
                    inputRefs[0].current?.focus();
                }
            }
        } catch (err) {
            setError("Si è verificato un errore.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
            {/* Ambient Background Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] ${isSettingMode ? 'bg-amber-500/10' : 'bg-primary/10'} rounded-full blur-[120px] pointer-events-none animate-pulse`} />

            <div className={`bg-surface border border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 relative z-10 ${error ? 'animate-shake' : ''}`}>
                <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/2 relative overflow-hidden">
                    <div className="flex items-center gap-5 relative z-10">
                        <div className={`p-4 ${isSettingMode ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'} rounded-3xl shadow-xl border border-white/5`}>
                            {isSettingMode ? <Fingerprint className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black uppercase tracking-widest italic leading-none ${isSettingMode ? 'text-amber-400' : 'text-primary'}`}>
                                {isSettingMode ? "Core Access" : "Verify PIN"}
                            </h2>
                            <div className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                                <div className={`w-1 h-1 rounded-full ${isSettingMode ? 'bg-amber-500' : 'bg-primary'} animate-ping`} />
                                Operazione: {actionName}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-all group">
                        <X className="w-6 h-6 text-white/20 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                    </button>

                    {/* Subtle aesthetic pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rotate-45 translate-x-1/2 -translate-y-1/2 rounded-3xl" />
                </div>

                <div className="p-10 space-y-8">
                    <div className="bg-black/40 border border-white/5 p-5 rounded-3xl flex items-start gap-4 shadow-inner">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-white/50 leading-relaxed font-bold uppercase tracking-wider">
                            {isSettingMode
                                ? "Criptazione del sistema in corso. Imposta un codice di accesso univoco per abilitare le funzioni amministrative."
                                : "Accesso all'area ristretta richiede l'immissione del codice di sicurezza a 4 cifre."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-center gap-4">
                            {digits.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={inputRefs[idx]}
                                    type="password"
                                    maxLength={1}
                                    inputMode="numeric"
                                    className={`w-16 h-20 bg-black/60 border-2 border-white/10 rounded-2xl text-center text-3xl font-black transition-all outline-none ${digit ? (isSettingMode ? 'border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-primary/50 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]') : 'focus:border-white/30 text-white'
                                        } focus:bg-white/5 focus:scale-105`}
                                    value={digit}
                                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                />
                            ))}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10 text-center">Codice Temporale Crittografato</p>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 py-3 px-4 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest text-center shadow-lg">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || fullPin.length < 4}
                        className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${isSettingMode
                            ? 'bg-amber-500 text-black hover:shadow-[0_0_40px_rgba(245,158,11,0.4)]'
                            : 'bg-primary text-black hover:shadow-[0_0_40px_rgba(242,1,85,0.4)] shadow-lg shadow-primary/20'
                            } disabled:opacity-30 disabled:grayscale`}
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        {isProcessing ? (
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                <span>Verifica in corso</span>
                            </div>
                        ) : (
                            <>
                                {isSettingMode ? <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                <span className="relative z-10">{isSettingMode ? "Initialize System" : "Authorize Access"}</span>
                            </>
                        )}
                    </button>

                    {!isSettingMode && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-px w-12 bg-white/10" />
                            <p className="text-[9px] text-center text-white/20 font-bold uppercase tracking-widest leading-loose">
                                Se hai dimenticato il codice,<br />contatta il responsabile sicurezza.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Global styles for the shake animation */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};
