import React, { useState } from "react";
import { db } from "../../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { Calendar, Type, Palette, Layout, Save, X } from "lucide-react";
import type { Assembly } from '../../../types';
import { formatDateToIT } from "../../../utils/dateUtils";
import { logAudit } from "../../../utils/auditLogger";
import { useAuth } from '../../../hooks/useAuth';

interface AssemblyCreatorProps {
    onComplete: (assemblyId: string) => void;
    onClose: () => void;
}

const THEME_COLORS = [
    { name: "Emerald", value: "#10b981" },
    { name: "Sapphire", value: "#3b82f6" },
    { name: "Ruby", value: "#ef4444" },
    { name: "Amethyst", value: "#a855f7" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Slate", value: "#64748b" },
];

export const AssemblyCreator: React.FC<AssemblyCreatorProps> = ({ onComplete, onClose }) => {
    const { userProfile } = useAuth();
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [themeColor, setThemeColor] = useState(THEME_COLORS[0].value);
    const [tags, setTags] = useState("");
    const [loading, setLoading] = useState(false); // Added loading state

    const handleSubmit = async (e: React.FormEvent) => { // Wrapped in handleSubmit function
        e.preventDefault();
        if (!name || !date) return;
        const dateObj = new Date(date);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const year = dateObj.getFullYear();
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const assemblyId = `${year}${mm}${dd}${randomDigits}`;

        const assembly: Assembly = {
            id: assemblyId,
            name,
            date: formatDateToIT(date),
            description,
            themeColor,
            status: 'CHIUSO',
            createdAt: Date.now(),
            tags: tags.split(",").map(t => t.trim()).filter(t => t !== "")
        };

        try {
            await setDoc(doc(db, "assemblies", assemblyId), assembly);
            await logAudit('ASSEMBLY_CREATED', userProfile?.email || 'System', `Creata nuova assemblea: ${name}`, assemblyId);
            onComplete(assemblyId);
        } catch (error) {
            console.error("Error creating assembly:", error);
            alert("Errore durante la creazione dell'assemblea.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/2 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                        <Layout className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest">Nuova Assemblea</h2>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Configura i dettagli dell'evento</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 flex-1 overflow-y-auto min-h-0">
                <div className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
                            <Type className="w-3 h-3" /> Titolo dell'Assemblea
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="es. Assemblea d'Istituto - Marzo"
                            className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-primary/5 transition-all font-bold"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
                            <Calendar className="w-3 h-3" /> Data Evento
                        </label>
                        <input
                            type="date"
                            required
                            className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-primary/5 transition-all font-bold text-white [color-scheme:dark]"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {/* Theme Color */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">
                            <Palette className="w-3 h-3" /> Tema Colore
                        </label>
                        <div className="flex flex-wrap gap-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                            {THEME_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setThemeColor(c.value)}
                                    className={`w-10 h-10 rounded-full transition-all border-4 ${themeColor === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Descrizione / Note (Opzionale)</label>
                        <textarea
                            rows={3}
                            placeholder="Descrivi brevemente l'assemblea o aggiungi note per i responsabili..."
                            className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-primary/5 transition-all text-sm font-medium"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Tags (Separati da virgola)</label>
                        <input
                            type="text"
                            placeholder="es. Politica, Cultura, 2024"
                            className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 px-6 outline-none focus:border-primary/50 focus:bg-primary/5 transition-all text-sm font-medium"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-4 mt-auto shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-white/5 hover:bg-white/10 py-4 md:py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !name || !date}
                        className="flex-[2] bg-primary text-primary-foreground py-4 md:py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                    >
                        {loading ? "Creazione..." : <><Save className="w-4 h-4" /> Crea Assemblea</>}
                    </button>
                </div>
            </form>
        </div>
    );
};
