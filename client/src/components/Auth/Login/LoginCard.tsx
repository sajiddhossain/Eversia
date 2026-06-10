import React from 'react';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';

interface LoginCardProps {
    errorMsg: string | null;
    loading: boolean;
    onLogin: () => void;
    authTimeout?: boolean;
}

const LoginCard: React.FC<LoginCardProps> = ({ 
    errorMsg, 
    loading, 
    onLogin,
    authTimeout = false
}) => {
    return (
        <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-700 pointer-events-none" />

            <div className="relative z-10 space-y-8">
                {/* Status / Error */}
                {authTimeout ? (
                    <div className="flex items-start gap-4 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in slide-in-from-top-4 duration-500">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-display font-semibold text-amber-400">Attesa risposta Firebase</p>
                            <p className="text-xs text-amber-200/70 font-medium leading-relaxed">
                                Il motore di accesso sta impiegando più tempo del previsto. Se hai effettuato un logout di recente, **chiudi TUTTE le schede aperte su questo sito** e riaprine una nuova per sbloccare il browser, altrimenti verifica la tua connessione internet.
                            </p>
                        </div>
                    </div>
                ) : errorMsg ? (
                    <div className="flex items-start gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in slide-in-from-top-4 duration-500">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-display font-semibold text-red-400">Attenzione</p>
                            <p className="text-xs text-red-200/70 font-medium leading-relaxed">{errorMsg}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <LogIn className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-display font-semibold text-white/30">Accesso studenti</p>
                            <p className="text-xs text-white/60 font-medium font-display">Usa @liceoagnesi.edu.it</p>
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="space-y-4">
                    <button
                        onClick={onLogin}
                        disabled={loading || authTimeout}
                        className="w-full h-16 bg-white text-black rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-3 transition-all hover:bg-white/90 active:scale-95 shadow-[0_10px_40px_rgba(255,255,255,0.05)] disabled:opacity-50 group/btn"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Accedi con Google
                            </>
                        )}
                    </button>

                    <div className="flex flex-col items-center gap-2">
                        <p className="text-center text-[11px] font-display font-medium text-white/20">
                            Eversia Software &copy; {new Date().getFullYear()}
                        </p>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-display font-semibold text-white/30">
                                Accesso protetto • OAuth 2.0 crittografato
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginCard;
