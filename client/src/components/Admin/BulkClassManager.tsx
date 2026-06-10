import React, { useState, useRef, useMemo } from "react";
import { db } from "../../firebase";
import { doc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import type { UserProfile } from "../../types";
import {
    X, Upload, Users, CheckCircle2, XCircle, AlertCircle,
    Loader2, FileText, Search, ChevronDown, GraduationCap, Trash2, Download
} from "lucide-react";
import { logAudit } from "../../utils/auditLogger";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type RowStatus = "pending" | "valid" | "invalid" | "applied" | "error";

interface CsvRow {
    email: string;
    className: string;
    status: RowStatus;
    message: string;
    uid?: string;
}

interface BulkClassManagerProps {
    currentUserProfile: UserProfile | null;
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// CSV Parser (pure JS — no external deps)
// ─────────────────────────────────────────────────────────────
function parseCsv(raw: string): Array<{ email: string; className: string }> {
    const lines = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    const result: Array<{ email: string; className: string }> = [];

    for (const line of lines) {
        // Skip header rows
        if (/^(email|e-?mail)/i.test(line)) continue;

        // Support comma or semicolon separators
        const sep = line.includes(";") ? ";" : ",";
        const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ""));

        if (parts.length >= 2) {
            const email = parts[0].toLowerCase();
            const className = parts[1].toUpperCase();
            if (email && className) {
                result.push({ email, className });
            }
        }
    }
    return result;
}

// ─────────────────────────────────────────────────────────────
// Batch writer — Firestore limit is 500 ops per batch
// ─────────────────────────────────────────────────────────────
const BATCH_LIMIT = 499;

async function applyBatches(
    rows: CsvRow[],
    onProgress: (applied: number) => void
): Promise<{ successes: string[]; failures: string[] }> {
    const validRows = rows.filter(r => r.status === "valid" && r.uid);
    const successes: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < validRows.length; i += BATCH_LIMIT) {
        const chunk = validRows.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);

        for (const row of chunk) {
            if (!row.uid) continue;
            const userRef = doc(db, "users", row.uid);
            batch.update(userRef, { className: row.className });
        }

        try {
            await batch.commit();
            chunk.forEach(r => successes.push(r.email));
        } catch (err) {
            console.error("Batch commit error:", err);
            chunk.forEach(r => failures.push(r.email));
        }

        onProgress(i + chunk.length);
    }

    return { successes, failures };
}

// ─────────────────────────────────────────────────────────────
// CSV Exporter — downloads failed/invalid rows as a retry file
// ─────────────────────────────────────────────────────────────
function downloadFailedCsv(rows: CsvRow[], filename: string = "da_riprovare.csv") {
    const header = "email,classe";
    const lines = rows
        .filter(r => r.status === "invalid" || r.status === "error")
        .map(r => `${r.email},${r.className}`);

    if (lines.length === 0) return;

    const content = [header, ...lines].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export const BulkClassManager: React.FC<BulkClassManagerProps> = ({
    currentUserProfile,
    onClose
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [rows, setRows] = useState<CsvRow[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [applied, setApplied] = useState(0);
    const [done, setDone] = useState(false);
    const [filterStatus, setFilterStatus] = useState<RowStatus | "all">("all");
    const [searchTerm, setSearchTerm] = useState("");

    const stats = useMemo(() => ({
        total: rows.length,
        valid: rows.filter(r => r.status === "valid").length,
        invalid: rows.filter(r => r.status === "invalid").length,
        applied: rows.filter(r => r.status === "applied").length,
        error: rows.filter(r => r.status === "error").length,
    }), [rows]);

    const filteredRows = useMemo(() => {
        let list = rows;
        if (filterStatus !== "all") list = list.filter(r => r.status === filterStatus);
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(r =>
                r.email.toLowerCase().includes(term) ||
                r.className.toLowerCase().includes(term)
            );
        }
        return list;
    }, [rows, filterStatus, searchTerm]);

    // ── File Upload ──────────────────────────────────────────
    const handleFileUpload = async (file: File) => {
        setIsValidating(true);
        setDone(false);
        setRows([]);

        try {
            const text = await file.text();
            const parsed = parseCsv(text);

            if (parsed.length === 0) {
                alert("Nessuna riga valida trovata nel CSV. Formato richiesto: email,classe (una per riga).");
                return;
            }

            // Extract unique emails to query them from Firestore
            const uniqueEmails = Array.from(new Set(parsed.map(p => p.email.toLowerCase())));
            const foundUsersMap = new Map<string, UserProfile>();
            
            // Fetch users in chunks of 30
            const CHUNK_SIZE = 30;
            for (let i = 0; i < uniqueEmails.length; i += CHUNK_SIZE) {
                const chunk = uniqueEmails.slice(i, i + CHUNK_SIZE);
                const q = query(collection(db, "users"), where("email", "in", chunk));
                const snap = await getDocs(q);
                snap.docs.forEach(doc => {
                    const data = doc.data() as UserProfile;
                    if (data.email) {
                        foundUsersMap.set(data.email.toLowerCase(), data);
                    }
                });
            }

            // Validate each row against the queried users
            const validated: CsvRow[] = parsed.map(({ email, className }) => {
                const user = foundUsersMap.get(email.toLowerCase());
                if (!user) {
                    return {
                        email,
                        className,
                        status: "invalid",
                        message: "Utente non trovato nel sistema"
                    };
                }
                if (!className || className.length > 6) {
                    return {
                        email,
                        className,
                        status: "invalid",
                        message: "Classe non valida (max 6 caratteri)",
                        uid: user.uid
                    };
                }
                return {
                    email,
                    className,
                    status: "valid",
                    message: `Attuale: ${user.className || "–"} → ${className}`,
                    uid: user.uid
                };
            });

            setRows(validated);
        } catch (err) {
            console.error("CSV parse error:", err);
            alert("Errore durante la lettura del file. Assicurati che sia un CSV valido.");
        } finally {
            setIsValidating(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    // ── Apply Changes ────────────────────────────────────────
    const handleApply = async () => {
        const validCount = stats.valid;
        if (validCount === 0) return;

        const confirmed = confirm(
            `Stai per aggiornare la classe di ${validCount} utenti. Vuoi continuare?`
        );
        if (!confirmed) return;

        setIsApplying(true);
        setApplied(0);

        try {
            const { successes, failures } = await applyBatches(rows, setApplied);

            // Mark rows as applied or error
            setRows(prev => prev.map(r => {
                if (r.status !== "valid") return r;
                if (successes.includes(r.email)) return { ...r, status: "applied", message: "✅ Aggiornata" };
                if (failures.includes(r.email)) return { ...r, status: "error", message: "❌ Errore scrittura" };
                return r;
            }));

            // Log audit event
            const details = `Aggiornamento classi massivo: ${successes.length} successi, ${failures.length} errori. Eseguito da ${currentUserProfile?.email || "Admin"}.`;
            await logAudit("CONFIG_CHANGED", currentUserProfile?.email || "System", details);

            setDone(true);
        } catch (err) {
            console.error("Apply error:", err);
            alert("Si è verificato un errore durante l'aggiornamento.");
        } finally {
            setIsApplying(false);
        }
    };

    // ── Clear ────────────────────────────────────────────────
    const handleClear = () => {
        setRows([]);
        setDone(false);
        setApplied(0);
        setSearchTerm("");
        setFilterStatus("all");
    };

    // ── Status badge helpers ─────────────────────────────────
    const statusConfig: Record<RowStatus, { label: string; icon: React.ReactNode; cls: string }> = {
        pending:  { label: "In Attesa",   icon: <AlertCircle className="w-3.5 h-3.5" />,   cls: "text-white/40 border-white/10 bg-white/5" },
        valid:    { label: "Valida",      icon: <CheckCircle2 className="w-3.5 h-3.5" />,  cls: "text-emerald-400 border-emerald-500/25 bg-emerald-500/10" },
        invalid:  { label: "Non Valida", icon: <XCircle className="w-3.5 h-3.5" />,        cls: "text-red-400 border-red-500/25 bg-red-500/10" },
        applied:  { label: "Applicata",  icon: <CheckCircle2 className="w-3.5 h-3.5" />,  cls: "text-primary border-primary/25 bg-primary/10" },
        error:    { label: "Errore",     icon: <XCircle className="w-3.5 h-3.5" />,        cls: "text-red-400 border-red-500/25 bg-red-500/10" },
    };

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────
    return (
        <div className="w-full h-full flex flex-col animate-in fade-in duration-300">

            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <GraduationCap className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest italic">
                            Classi in Massa
                        </h2>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                            Importa CSV per assegnare le classi a più studenti in una volta
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all active:scale-95">
                    <X className="w-6 h-6 text-white/30 hover:text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">

                {/* Upload Zone + Stats */}
                <div className="p-6 border-b border-white/5 bg-black/10 shrink-0 space-y-5">

                    {/* CSV Format hint */}
                    <div className="flex items-start gap-3 p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] font-bold text-white/40 leading-relaxed">
                        <FileText className="w-4 h-4 text-white/20 shrink-0 mt-0.5" />
                        <span>
                            Formato CSV: <span className="font-mono text-white/60">email,classe</span> — una riga per studente.
                            La prima riga può essere un'intestazione e verrà ignorata.
                            Separatore: virgola <span className="font-mono">(,)</span> o punto e virgola <span className="font-mono">(;)</span>.
                            <br />
                            Esempio: <span className="font-mono text-emerald-400/70">mario.rossi@liceoagnesi.edu.it,5BS</span>
                        </span>
                    </div>

                    {/* Upload Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,text/csv,text/plain"
                            className="hidden"
                            onChange={handleFilePick}
                            id="csv-upload-input"
                        />
                        <label
                            htmlFor="csv-upload-input"
                            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] cursor-pointer transition-all border active:scale-95 ${
                                isValidating
                                    ? "bg-white/5 border-white/5 text-white/20 pointer-events-none"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/40"
                            }`}
                        >
                            {isValidating
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Upload className="w-4 h-4" />
                            }
                            {isValidating ? "Analisi..." : rows.length > 0 ? "Ricarica CSV" : "Importa CSV"}
                        </label>

                        {rows.length > 0 && !isApplying && !done && (
                            <button
                                onClick={handleClear}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/5 bg-white/[0.02] text-white/30 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all active:scale-95"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Cancella
                            </button>
                        )}

                        {/* Stats Chips */}
                        {rows.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 ml-auto">
                                <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-white/10 bg-white/5 text-white/40">
                                    {stats.total} righe
                                </span>
                                {stats.valid > 0 && (
                                    <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                                        ✅ {stats.valid} valide
                                    </span>
                                )}
                                {stats.invalid > 0 && (
                                    <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-red-500/25 bg-red-500/10 text-red-400">
                                        ❌ {stats.invalid} non valide
                                    </span>
                                )}
                                {stats.applied > 0 && (
                                    <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-primary/25 bg-primary/10 text-primary">
                                        ⚡ {stats.applied} applicate
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Progress bar during apply */}
                    {isApplying && stats.valid > 0 && (
                        <div className="space-y-1.5">
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                    style={{ width: `${(applied / stats.valid) * 100}%` }}
                                />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 text-right">
                                {applied} / {stats.valid} utenti aggiornati…
                            </p>
                        </div>
                    )}
                </div>

                {/* Filters + Table */}
                {rows.length > 0 && (
                    <div className="flex-1 overflow-hidden flex flex-col">

                        {/* Filter bar */}
                        <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center gap-3 bg-black/5 shrink-0">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                                <input
                                    type="text"
                                    placeholder="Cerca email o classe..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/30 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold outline-none focus:border-emerald-500/30 transition-all placeholder:text-white/10"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value as RowStatus | "all")}
                                    className="appearance-none bg-black/40 border border-white/5 rounded-xl py-2.5 pl-3.5 pr-8 text-[10px] font-black uppercase tracking-wider outline-none focus:border-emerald-500/30 transition-all cursor-pointer text-white/60"
                                >
                                    <option value="all">Tutte le righe</option>
                                    <option value="valid">Solo valide</option>
                                    <option value="invalid">Solo non valide</option>
                                    <option value="applied">Solo applicate</option>
                                    <option value="error">Solo errori</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                            </div>

                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-auto">
                                {filteredRows.length} righe
                            </span>
                        </div>

                        {/* Rows Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Table Header */}
                            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur grid grid-cols-[1fr_120px_180px_auto] gap-4 px-6 py-3 text-[8px] font-black uppercase tracking-widest text-white/20 border-b border-white/5">
                                <span>Email</span>
                                <span>Classe</span>
                                <span>Stato</span>
                                <span className="text-right">Info</span>
                            </div>

                            <div className="divide-y divide-white/[0.03]">
                                {filteredRows.map((row, i) => {
                                    const cfg = statusConfig[row.status];
                                    return (
                                        <div
                                            key={`${row.email}-${i}`}
                                            className={`grid grid-cols-[1fr_120px_180px_auto] gap-4 items-center px-6 py-3.5 text-xs transition-colors ${
                                                row.status === "applied" ? "bg-primary/[0.02]" :
                                                row.status === "invalid" || row.status === "error" ? "bg-red-500/[0.02]" :
                                                "hover:bg-white/[0.01]"
                                            }`}
                                        >
                                            {/* Email */}
                                            <span className="font-mono text-[11px] text-white/70 truncate" title={row.email}>
                                                {row.email}
                                            </span>

                                            {/* Class */}
                                            <span className="font-black text-sm text-white/90 uppercase tracking-wider">
                                                {row.className}
                                            </span>

                                            {/* Status badge */}
                                            <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${cfg.cls}`}>
                                                {cfg.icon}
                                                {cfg.label}
                                            </span>

                                            {/* Message */}
                                            <span className="text-[10px] text-white/30 font-bold text-right whitespace-nowrap truncate max-w-[200px]" title={row.message}>
                                                {row.message}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Apply Button Footer */}
                        {!done && (
                            <div className="p-6 border-t border-white/5 bg-black/20 shrink-0 space-y-3">
                                <button
                                    onClick={handleApply}
                                    disabled={isApplying || stats.valid === 0}
                                    className="w-full bg-emerald-500 text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 btn-press"
                                >
                                    {isApplying ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Applicazione in corso…
                                        </>
                                    ) : (
                                        <>
                                            <Users className="w-4 h-4" />
                                            Applica modifiche ({stats.valid} {stats.valid === 1 ? "utente" : "utenti"})
                                        </>
                                    )}
                                </button>
                                {stats.invalid > 0 && (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">
                                            Le {stats.invalid} righe non valide verranno ignorate.
                                        </p>
                                        <button
                                            onClick={() => downloadFailedCsv(rows, "non_trovati.csv")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 transition-all active:scale-95 shrink-0"
                                        >
                                            <Download className="w-3 h-3" />
                                            Esporta non trovati
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Done Banner */}
                        {done && (
                            <div className="p-6 border-t border-white/5 bg-black/20 shrink-0">
                                <div className="flex flex-col items-center gap-3 py-4">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                    <p className="text-sm font-black uppercase tracking-widest text-emerald-400">
                                        Completato!
                                    </p>
                                    <p className="text-[10px] text-white/40 font-bold">
                                        {stats.applied} classi aggiornate · {stats.error > 0 ? `${stats.error} errori` : "Nessun errore"}
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                                        {/* Export failed rows if any write errors occurred */}
                                        {stats.error > 0 && (
                                            <button
                                                onClick={() => downloadFailedCsv(rows, "errori_scrittura.csv")}
                                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 transition-all active:scale-95"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Esporta {stats.error} errori CSV
                                            </button>
                                        )}
                                        {/* Export non-registered rows if there were invalids */}
                                        {stats.invalid > 0 && (
                                            <button
                                                onClick={() => downloadFailedCsv(rows, "non_trovati.csv")}
                                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Esporta {stats.invalid} non trovati
                                            </button>
                                        )}
                                        <button
                                            onClick={handleClear}
                                            className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all active:scale-95"
                                        >
                                            Nuovo Import
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {rows.length === 0 && !isValidating && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-white/20 gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
                            <Upload className="w-7 h-7 text-emerald-500/30" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                Nessun file caricato
                            </p>
                            <p className="text-[9px] text-white/15 font-bold mt-1">
                                Importa un CSV per iniziare
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
