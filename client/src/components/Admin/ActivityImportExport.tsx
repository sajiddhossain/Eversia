import React, { useState, useRef } from "react";
import { db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import type { Activity } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { logAudit } from "../../utils/auditLogger";
import Papa from "papaparse";
import { X, Upload, Download, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
    assemblyId: string;
    activities: Activity[];
    onClose: () => void;
}

interface ImportRow {
    name: string;
    location_name: string;
    turn_ids: string;
    max_capacity: string;
}

export const ActivityImportExport: React.FC<Props> = ({ assemblyId, activities, onClose }) => {
    const { user } = useAuth();
    const [importing, setImporting] = useState(false);
    const [previewData, setPreviewData] = useState<ImportRow[] | null>(null);
    const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const exportActivities = () => {
        const data = activities.map(a => ({
            "Nome": a.name,
            "Ubicazione": a.location_name || "",
            "Turni": (a.turn_ids || []).join(","),
            "Capienza Max": a.max_capacity,
            "PIN Accesso": a.access_pin,
        }));
        const csv = Papa.unparse(data);
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `attivita_${assemblyId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data.map((row: any) => ({
                    name: row["Nome"] || row["name"] || "",
                    location_name: row["Ubicazione"] || row["location_name"] || "",
                    turn_ids: row["Turni"] || row["turn_ids"] || "1",
                    max_capacity: row["Capienza Max"] || row["max_capacity"] || "40",
                }));
                setPreviewData(rows.filter((r: ImportRow) => r.name.trim()));
            },
        });
    };

    const executeImport = async () => {
        if (!previewData) return;
        setImporting(true);
        const errors: string[] = [];
        let success = 0;

        for (const row of previewData) {
            try {
                const safeName = row.name.replace(/\s+/g, '-').toLowerCase();
                const turnIds = row.turn_ids.split(",").map(t => t.trim());
                const primaryTurn = turnIds[0] || "1";
                const activityId = `${assemblyId}_T${primaryTurn}_${safeName}_${Math.random().toString(36).substring(2, 5)}`;
                const accessPin = Math.floor(1000 + Math.random() * 9000).toString();

                const activityData: Activity = {
                    id: activityId,
                    assemblyId,
                    name: row.name.trim(),
                    turn_ids: turnIds,
                    location_name: row.location_name.trim(),
                    max_capacity: parseInt(row.max_capacity) || 40,
                    counts_by_turn: {},
                    access_pin: accessPin,
                };

                await setDoc(doc(db, "rooms", activityId), activityData);
                success++;
            } catch (e: any) {
                errors.push(`${row.name}: ${e.message}`);
            }
        }

        await logAudit('BULK_IMPORT', user?.email || '', `Importate ${success} attività${errors.length > 0 ? `, ${errors.length} errori` : ''}`, assemblyId);
        setImportResult({ success, errors });
        setPreviewData(null);
        setImporting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl"><FileSpreadsheet className="w-6 h-6 text-emerald-400" /></div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest">Import / Export Attività</h2>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{activities.length} attività nell'assemblea</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Export */}
                    <div className="bg-white/2 border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Esporta Attività</h3>
                        <p className="text-white/40 text-sm mb-4">Scarica tutte le attività dell'assemblea corrente in formato CSV.</p>
                        <button
                            onClick={exportActivities}
                            className="px-6 py-3 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:brightness-110 transition-all"
                        >
                            <Download className="w-4 h-4" /> Esporta CSV
                        </button>
                    </div>

                    {/* Import */}
                    <div className="bg-white/2 border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest mb-4">Importa Attività</h3>
                        <p className="text-white/40 text-sm mb-4">
                            Carica un file CSV con colonne: <code className="text-primary/60 text-xs">Nome, Ubicazione, Turni (separati da virgola), Capienza Max</code>
                        </p>
                        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all border border-white/10"
                        >
                            <Upload className="w-4 h-4" /> Seleziona File CSV
                        </button>
                    </div>

                    {/* Preview */}
                    {previewData && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
                            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-4">Anteprima Import ({previewData.length} attività)</h3>
                            <div className="max-h-[200px] overflow-y-auto space-y-1 mb-4">
                                {previewData.map((row, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm py-1">
                                        <span className="text-white/20 text-xs w-6">#{i + 1}</span>
                                        <span className="font-bold flex-1">{row.name}</span>
                                        <span className="text-white/30 text-xs">{row.location_name}</span>
                                        <span className="text-primary/50 text-xs">T{row.turn_ids}</span>
                                        <span className="text-white/20 text-xs">Cap: {row.max_capacity}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setPreviewData(null)} className="px-4 py-2 text-white/40 hover:text-white font-bold text-sm transition-all">Annulla</button>
                                <button
                                    onClick={executeImport}
                                    disabled={importing}
                                    className="px-6 py-2 bg-emerald-500 text-black rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                                >
                                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                    Importa {previewData.length} Attività
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {importResult && (
                        <div className={`border rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-300 ${importResult.errors.length > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                {importResult.errors.length > 0 ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                                <h3 className="font-black uppercase tracking-widest text-sm">
                                    Importazione Completata: {importResult.success} create
                                </h3>
                            </div>
                            {importResult.errors.length > 0 && (
                                <div className="mt-2 text-sm text-amber-400/70">
                                    {importResult.errors.map((e, i) => <div key={i}>• {e}</div>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
