import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-red-500/20">
                        <AlertOctagon className="w-12 h-12 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Errore di Sistema</h1>
                    <p className="text-white/50 max-w-md mx-auto mb-8 font-medium">
                        Si è verificato un errore critico durante il rendering dell'interfaccia.
                    </p>

                    <div className="bg-black/40 border border-white/5 p-4 rounded-xl max-w-2xl w-full overflow-auto text-left mb-8">
                        <code className="text-xs text-red-400 font-mono break-all whitespace-pre-wrap">
                            {this.state.error?.message || "Errore sconosciuto"}
                        </code>
                    </div>

                    <button
                        onClick={() => window.location.href = "/"}
                        className="px-8 py-4 bg-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 flex items-center justify-center gap-3"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Ricarica Applicazione
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
