import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, doc, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import type { AssemblyTemplate, Activity } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { logAudit } from "../../utils/auditLogger";
import { X, Save, Trash2, FileText, Loader2, Download } from "lucide-react";

interface Props {
    assemblyId?: string; // If provided, enables "Save as Template"
    onApplyTemplate?: (template: AssemblyTemplate) => void;
    onClose: () => void;
}

export const AssemblyTemplates: React.FC<Props> = ({ assemblyId, onApplyTemplate, onClose }) => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<AssemblyTemplate[]>([]);
    const [saving, setSaving] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [showSaveForm, setShowSaveForm] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "assembly_templates"), (snap) => {
            setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssemblyTemplate)).sort((a, b) => b.createdAt - a.createdAt));
        });
        return () => unsub();
    }, []);

    const saveCurrentAsTemplate = async () => {
        if (!assemblyId || !templateName.trim()) return;
        setSaving(true);

        try {
            const activitiesSnap = await getDocs(query(collection(db, "rooms"), where("assemblyId", "==", assemblyId)));
            const activities = activitiesSnap.docs.map(d => {
                const a = d.data() as Activity;
                return {
                    name: a.name,
                    location_name: a.location_name,
                    turn_ids: a.turn_ids || [],
                    max_capacity: a.max_capacity,
                };
            });

            const template: Omit<AssemblyTemplate, 'id'> = {
                name: templateName.trim(),
                activities,
                createdBy: user?.email || "unknown",
                createdAt: Date.now(),
            };

            await addDoc(collection(db, "assembly_templates"), template);
            await logAudit('TEMPLATE_SAVED', user?.email || '', `Template "${templateName}" salvato con ${activities.length} attività`, assemblyId);
            setShowSaveForm(false);
            setTemplateName("");
        } catch (e) {
            console.error("Error saving template:", e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (templateId: string) => {
        if (confirm("Eliminare questo template?")) {
            const templateToDelete = templates.find(t => t.id === templateId);
            await deleteDoc(doc(db, "assembly_templates", templateId));
            await logAudit('TEMPLATE_DELETED', user?.email || '', `Eliminato template "${templateToDelete?.name || templateId}"`, assemblyId);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl"><FileText className="w-6 h-6 text-primary" /></div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest">Template Assemblee</h2>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{templates.length} template salvati</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Save Form */}
                    {assemblyId && (
                        <div className="mb-6">
                            {showSaveForm ? (
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-primary">Salva Assemblea Corrente come Template</h4>
                                    <input
                                        type="text"
                                        placeholder="Nome del template (es. Assemblea Standard 2 Turni)"
                                        className="w-full bg-black/40 border-2 border-white/5 rounded-xl py-3 px-4 outline-none focus:border-primary/50 transition-all font-bold"
                                        value={templateName}
                                        onChange={e => setTemplateName(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setShowSaveForm(false)} className="px-4 py-2 text-white/40 hover:text-white text-sm font-bold transition-all">Annulla</button>
                                        <button
                                            onClick={saveCurrentAsTemplate}
                                            disabled={saving || !templateName.trim()}
                                            className="px-6 py-2 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-30 flex items-center gap-2"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Salva Template
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowSaveForm(true)}
                                    className="w-full p-4 border-2 border-dashed border-primary/20 rounded-2xl text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Salva Assemblea Corrente come Template
                                </button>
                            )}
                        </div>
                    )}

                    {templates.length === 0 ? (
                        <div className="text-center py-16 text-white/20">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-bold">Nessun template salvato</p>
                            <p className="text-xs mt-1">Salva un'assemblea come template per riutilizzarla in futuro</p>
                        </div>
                    ) : (
                        templates.map(t => (
                            <div key={t.id} className="bg-white/2 border border-white/5 rounded-2xl p-6 hover:bg-white/5 transition-all group">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-black text-lg">{t.name}</h3>
                                        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                                            {t.activities?.length || 0} attività • Creato da {t.createdBy?.split('@')[0]} • {new Date(t.createdAt).toLocaleDateString("it-IT")}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        {onApplyTemplate && (
                                            <button
                                                onClick={() => onApplyTemplate(t)}
                                                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                                            >
                                                <Download className="w-3 h-3" /> Usa
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(t.id!)}
                                            className="p-2 hover:bg-red-500/10 text-red-500/40 hover:text-red-400 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {(t.activities || []).slice(0, 6).map((a, i) => (
                                        <span key={i} className="px-2 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-white/40">
                                            {a.name} ({a.turn_ids?.map(t => `T${t}`).join(',')})
                                        </span>
                                    ))}
                                    {(t.activities?.length || 0) > 6 && <span className="text-[9px] text-white/20 self-center">+{(t.activities?.length || 0) - 6} altre</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
