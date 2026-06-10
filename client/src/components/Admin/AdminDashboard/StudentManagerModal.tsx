import React, { useState } from "react";
import { Search, Download, X, MapPin, UserCheck, UserMinus, AlertTriangle, Fingerprint } from "lucide-react";
import Papa from "papaparse";
import type { Student } from "../../../types";

type TabType = 'PRESENTI' | 'ASSENTI' | 'NON_ISCRITTI' | 'IMBUCATI';

interface StudentManagerModalProps {
    presentList: Student[];
    absentList: Student[];
    nonEnrolledList: Student[];
    imbucatiList: Student[];
    initialTab?: TabType;
    onClose: () => void;
}

export const StudentManagerModal: React.FC<StudentManagerModalProps> = ({
    presentList,
    absentList,
    nonEnrolledList,
    imbucatiList,
    initialTab = 'NON_ISCRITTI',
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [searchTerm, setSearchTerm] = useState("");

    const getActiveList = () => {
        switch (activeTab) {
            case 'PRESENTI': return presentList;
            case 'ASSENTI': return absentList;
            case 'IMBUCATI': return imbucatiList;
            case 'NON_ISCRITTI':
            default: return nonEnrolledList;
        }
    };

    const handleExport = () => {
        const list = getActiveList();
        const csvData = list.filter(s => {
            const search = searchTerm.toLowerCase();
            return s.firstName?.toLowerCase().includes(search) || 
                   s.lastName?.toLowerCase().includes(search) || 
                   s.email?.toLowerCase().includes(search);
        }).map(s => ({
            "Cognome": s.lastName,
            "Nome": s.firstName,
            "Email": s.email
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Studenti_${activeTab}_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sourceList = getActiveList();
    const filtered = sourceList.filter(s => {
        const search = searchTerm.toLowerCase();
        return s.firstName?.toLowerCase().includes(search) || 
               s.lastName?.toLowerCase().includes(search) || 
               s.email?.toLowerCase().includes(search);
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="bg-[#09090b] border border-white/10 rounded-[3rem] w-full max-w-6xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh] relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none" />
                
                {/* Header */}
                <div className="p-8 md:p-12 border-b border-white/5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white/[0.02] relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Fingerprint className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Archivio Digitale Studenti</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">Anagrafica<br className="md:hidden" /> Sessione</h2>
                    </div>

                    <div className="flex flex-wrap bg-black/40 p-2 rounded-[2rem] border border-white/10 backdrop-blur-xl shrink-0 gap-1.5 shadow-inner">
                        {[
                            { id: 'PRESENTI', label: 'Presenti', count: presentList.length, color: 'bg-primary text-black', icon: UserCheck },
                            { id: 'ASSENTI', label: 'Assenti', count: absentList.length, color: 'bg-red-500 text-white', icon: UserMinus },
                            { id: 'NON_ISCRITTI', label: 'Non Iscritti', count: nonEnrolledList.length, color: 'bg-amber-500 text-white', icon: AlertTriangle },
                            { id: 'IMBUCATI', label: 'Inattesi', count: imbucatiList.length, color: 'bg-purple-500 text-white', icon: Fingerprint }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.1em] transition-all flex items-center gap-3 active:scale-95 ${activeTab === tab.id ? tab.color : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
                            >
                                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'opacity-100' : 'opacity-20'}`} />
                                {tab.label} <span className={`opacity-40 font-bold ${activeTab === tab.id ? 'text-black/60' : ''}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                    
                    <button onClick={onClose} className="p-4 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-white active:scale-90 bg-white/5 border border-white/5 shadow-xl xl:self-center">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Sub-Header / Search */}
                <div className="p-8 md:px-12 md:py-8 border-b border-white/5 flex flex-col md:flex-row gap-6 items-center bg-white/[0.01] relative z-10">
                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-primary transition-all duration-300" />
                        <input
                            type="text"
                            placeholder="FILTRA PER NOME, COGNOME O EMAIL..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 focus:border-primary/50 focus:bg-white/[0.06] rounded-[1.5rem] py-5 pl-16 pr-8 text-xs font-bold uppercase tracking-widest outline-none transition-all placeholder:text-white/5"
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-3 px-8 py-5 bg-white/5 border border-white/5 hover:border-primary/40 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-white/10 active:scale-95 shadow-xl"
                    >
                        <Download className="w-4 h-4 text-primary" /> Esporta CSV
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-none relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.length === 0 ? (
                            <div className="col-span-full text-center py-32 opacity-20">
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-10 border border-white/5">
                                    <Search className="w-12 h-12" />
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-[0.2em] italic">No Records Found</h3>
                                <p className="text-[10px] mt-4 uppercase font-black tracking-[0.4em]">Affina i parametri di ricerca</p>
                            </div>
                        ) : (
                            filtered.map(s => (
                                <div key={s.id} className="bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between hover:bg-white/[0.06] hover:border-white/20 group/card transition-all relative overflow-hidden shadow-xl hover:-translate-y-1 duration-500">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/1 rounded-full -mr-12 -mt-12 blur-2xl group-hover/card:bg-primary/5 transition-all duration-700" />
                                    
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 font-black text-xl uppercase group-hover/card:bg-primary/20 group-hover/card:text-primary transition-all duration-500 border border-white/5 shadow-inner leading-none">
                                            {(s.firstName?.[0] || "")}{(s.lastName?.[0] || "")}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-xl uppercase tracking-tighter italic truncate group-hover/card:text-primary transition-colors leading-none">{s.firstName || "Unknown"} {s.lastName || ""}</div>
                                            <div className="text-[9px] text-white/20 font-black uppercase tracking-[0.1em] mt-2 truncate group-hover/card:text-white/40 transition-colors">{s.email}</div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                                        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-inner ${
                                            activeTab === 'PRESENTI' ? 'bg-green-500/10 text-green-500' :
                                            activeTab === 'ASSENTI' ? 'bg-red-500/10 text-red-500' :
                                            activeTab === 'NON_ISCRITTI' ? 'bg-amber-500/10 text-amber-500' :
                                            'bg-purple-500/10 text-purple-500'
                                        }`}>
                                            {activeTab === 'IMBUCATI' ? 'INATTESO' : activeTab.replace('_', ' ')}
                                        </div>
                                        {((s.actual_location && Object.keys(s.actual_location).length > 0) || ((s as any).staff_actual_location && Object.keys((s as any).staff_actual_location).length > 0)) && (
                                            <div className="text-[9px] text-white/10 font-black uppercase tracking-[0.2em] flex items-center gap-2 group-hover/card:text-white/30 transition-colors">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {Object.values(s.actual_location || {}).length + Object.values((s as any).staff_actual_location || {}).length} Check-in
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
