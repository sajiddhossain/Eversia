import React from "react";
import { useAuth } from "../../../hooks/useAuth";
import { BulkClassManager } from "../BulkClassManager";
import { FileText, ArrowRight, CheckCircle2, XCircle, Download, Upload } from "lucide-react";

interface BulkClassTabProps {}

// ── Mini visual example of a CSV row ─────────────────────────
const CsvRowExample: React.FC<{
    email: string;
    className: string;
    status: "valid" | "invalid" | "applied";
}> = ({ email, className, status }) => {
    const cfg = {
        valid:   { label: "Valida",      cls: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10", dot: "bg-emerald-400" },
        invalid: { label: "Non trovata", cls: "text-red-400 border-red-500/20 bg-red-500/10",             dot: "bg-red-400" },
        applied: { label: "Applicata",   cls: "text-primary border-primary/20 bg-primary/10",             dot: "bg-primary" },
    }[status];

    return (
        <div className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border text-xs font-mono ${
            status === "valid" ? "bg-white/[0.01] border-white/5" :
            status === "applied" ? "bg-primary/[0.02] border-primary/10" :
            "bg-red-500/[0.02] border-red-500/10"
        }`}>
            <span className="text-white/50 truncate">{email}</span>
            <span className="text-white/80 font-black shrink-0">{className}</span>
            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 ${cfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
            </span>
        </div>
    );
};

export const BulkClassTab: React.FC<BulkClassTabProps> = () => {
    const { userProfile } = useAuth();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── Explainer Card ───────────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">

                {/* Header strip */}
                <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-start gap-5">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shrink-0">
                        <FileText className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white">
                            Import Classi via CSV
                        </h2>
                        <p className="text-[11px] text-white/40 font-medium mt-1 leading-relaxed max-w-xl">
                            Assegna la classe scolastica a centinaia di studenti in una sola operazione, caricando un semplice file di testo.
                            Nessuna modifica manuale account per account.
                        </p>
                    </div>
                </div>

                {/* How it works — 3 steps */}
                <div className="px-8 py-6 border-b border-white/5 space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30 mb-4">Come funziona</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {
                                step: "01",
                                icon: <FileText className="w-5 h-5 text-emerald-400" />,
                                title: "Prepara il CSV",
                                desc: "Crea un file di testo con una riga per studente nel formato email,classe. Puoi usare Excel, Google Sheets o un qualsiasi editor di testo.",
                                color: "emerald"
                            },
                            {
                                step: "02",
                                icon: <Upload className="w-5 h-5 text-blue-400" />,
                                title: "Importa & Valida",
                                desc: "Carica il file — il sistema lo analizza istantaneamente e mostra una preview con lo stato di ogni riga prima di toccare il database.",
                                color: "blue"
                            },
                            {
                                step: "03",
                                icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
                                title: "Applica",
                                desc: "Clicca \"Applica modifiche\" — vengono aggiornate solo le righe valide. Le righe con errori vengono saltate e puoi esportarle per riprovarci.",
                                color: "primary"
                            }
                        ].map(({ step, icon, title, desc, color }) => (
                            <div key={step} className={`p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3`}>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                        color === "emerald" ? "text-emerald-400/60" :
                                        color === "blue" ? "text-blue-400/60" : "text-primary/60"
                                    }`}>Passo {step}</span>
                                </div>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                    color === "emerald" ? "bg-emerald-500/10 border-emerald-500/20" :
                                    color === "blue" ? "bg-blue-500/10 border-blue-500/20" :
                                    "bg-primary/10 border-primary/20"
                                }`}>
                                    {icon}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white/90">{title}</h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-relaxed font-medium">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CSV Format visual example */}
                <div className="px-8 py-6 border-b border-white/5 space-y-4">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Formato file</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Raw CSV */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                                📄 Il file CSV che carichi
                            </span>
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-xs space-y-1">
                                <div className="text-white/20 text-[10px] pb-2 border-b border-white/5 mb-2">email,classe</div>
                                <div className="text-white/60">mario.rossi@liceoagnesi.edu.it,<span className="text-emerald-400">5BS</span></div>
                                <div className="text-white/60">andrea.vigano@liceoagnesi.edu.it,<span className="text-emerald-400">3AS</span></div>
                                <div className="text-white/60">ghost@gmail.com,<span className="text-red-400">2CS</span></div>
                                <div className="text-white/60">sara.bianchi@liceoagnesi.edu.it,<span className="text-emerald-400">4BI</span></div>
                            </div>
                            <p className="text-[9px] text-white/20 font-medium">
                                Separatore: <span className="font-mono text-white/40">,</span> o <span className="font-mono text-white/40">;</span> · L'intestazione viene ignorata
                            </p>
                        </div>

                        {/* Preview result */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                                👁 Preview dopo l'import
                            </span>
                            <div className="space-y-1.5">
                                <CsvRowExample email="mario.rossi@liceoagnesi.edu.it" className="5BS" status="valid" />
                                <CsvRowExample email="andrea.vigano@liceoagnesi.edu.it" className="3AS" status="valid" />
                                <CsvRowExample email="ghost@gmail.com" className="2CS" status="invalid" />
                                <CsvRowExample email="sara.bianchi@liceoagnesi.edu.it" className="4BI" status="applied" />
                            </div>
                            <p className="text-[9px] text-white/20 font-medium">
                                <span className="text-red-400">ghost@gmail.com</span> viene saltato — non è un account registrato su Eversia
                            </p>
                        </div>
                    </div>
                </div>

                {/* Failed rows export note */}
                <div className="px-8 py-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <Download className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-black text-white/60 uppercase tracking-wider">Export automatico dei falliti</p>
                            <p className="text-[10px] text-white/30 font-medium mt-0.5 leading-relaxed">
                                Le righe non trovate o con errori di scrittura vengono esportabili come CSV separato,
                                già nel formato corretto per essere reimportate una volta corrette (es. quando lo studente si iscrive alla piattaforma).
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl shrink-0">
                        <XCircle className="w-3.5 h-3.5 text-amber-400" />
                        <ArrowRight className="w-3 h-3 text-amber-400/50" />
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 ml-1">non_trovati.csv</span>
                    </div>
                </div>
            </div>

            {/* ── The actual manager ───────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden" style={{ height: '620px' }}>
                <BulkClassManager
                    currentUserProfile={userProfile}
                    onClose={() => {}} // noop — embedded, no modal to close
                />
            </div>
        </div>
    );
};
