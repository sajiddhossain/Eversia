import React from "react";
import type { Student } from "../../../types";
import { Search, UserPlus, SearchX, X, RefreshCw, MoveHorizontal, UserCheck } from "lucide-react";

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    activityId: string;
    turnId: string;
    isProcessing: boolean;
    isCreatingStudent: boolean;
    setIsCreatingStudent: (val: boolean) => void;
    modalSearchText: string;
    setModalSearchText: (val: string) => void;
    loadingModal: boolean;
    modalResults: Student[];
    newStudentData: { firstName: string; lastName: string; email: string };
    setNewStudentData: (val: { firstName: string; lastName: string; email: string }) => void;
    performCheckIn: (student: Student, activityId: string) => void;
    handleCreateStudent: (e: React.FormEvent) => void;
    fetchAssemblyStudents: (force?: boolean) => void;
    onStudentClick: (student: Student) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
    isOpen, onClose, activityId, turnId, isProcessing,
    isCreatingStudent, setIsCreatingStudent, modalSearchText, setModalSearchText,
    loadingModal, modalResults, newStudentData, setNewStudentData,
    performCheckIn, handleCreateStudent, fetchAssemblyStudents,
    onStudentClick
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            
            {/* Modal Body */}
            <div className="relative w-full max-w-lg bg-[#09090b]/95 border border-white/10 rounded-[2rem] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                {/* Background decorative glows */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/5 rounded-full blur-[70px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between mb-6 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-white leading-tight">Aggiungi Studente</h3>
                        <p className="text-[9px] font-black text-brand-lime uppercase tracking-widest mt-1">Registrazione Rapida & Imbucati</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isCreatingStudent && (
                            <button 
                                onClick={() => fetchAssemblyStudents(true)} 
                                className="p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-full transition-colors group"
                                title="Forza Sincronizzazione"
                            >
                                <RefreshCw className={`w-4 h-4 text-white/50 group-hover:text-white ${loadingModal ? 'animate-spin text-brand-lime' : 'transition-all'}`} />
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-white/60" />
                        </button>
                    </div>
                </div>

                {isCreatingStudent ? (
                    <form onSubmit={handleCreateStudent} className="relative z-10 space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-hide">
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl">
                            ⚠️ Lo studente non ha ancora effettuato l'accesso ad Eversia. Registrandolo con l'email scolastica corretta (<span className="text-white underline">@studenti.istituto</span>), troverà la presenza sincronizzata in tempo reale.
                        </p>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Nome</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-brand-lime/40 focus:bg-white/[0.04] transition-all font-semibold text-sm text-white placeholder:text-white/20"
                                value={newStudentData.firstName} 
                                onChange={(e) => setNewStudentData({ ...newStudentData, firstName: e.target.value })} 
                                placeholder="Es. Mario" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Cognome</label>
                            <input 
                                required 
                                type="text" 
                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-brand-lime/40 focus:bg-white/[0.04] transition-all font-semibold text-sm text-white placeholder:text-white/20"
                                value={newStudentData.lastName} 
                                onChange={(e) => setNewStudentData({ ...newStudentData, lastName: e.target.value })} 
                                placeholder="Es. Rossi" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Email Scolastica</label>
                            <input 
                                required 
                                type="email" 
                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-brand-lime/40 focus:bg-white/[0.04] transition-all font-semibold text-sm text-white placeholder:text-white/20"
                                value={newStudentData.email} 
                                onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value.toLowerCase().trim() })} 
                                placeholder="mario.rossi@studenti.istituto.it" 
                            />
                        </div>
                        <div className="pt-4 flex gap-3 flex-shrink-0">
                            <button 
                                type="button" 
                                onClick={() => setIsCreatingStudent(false)} 
                                className="flex-1 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/5 transition-all text-white/60 hover:text-white"
                            >
                                Annulla
                            </button>
                            <button 
                                type="submit" 
                                disabled={isProcessing} 
                                className="flex-1 py-3.5 bg-brand-lime text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:shadow-[0_0_20px_rgba(226,243,60,0.4)] transition-all disabled:opacity-50 btn-press"
                            >
                                {isProcessing ? 'Registrando...' : 'Registra & Entra'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        {/* Search Input Box */}
                        <div className="relative mb-5 flex-shrink-0 z-10">
                            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/30" />
                            <input
                                type="text"
                                placeholder="Cerca cognome o nome..."
                                className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-brand-lime/30 focus:bg-white/[0.04] focus:shadow-[0_0_20px_rgba(226,243,60,0.05)] transition-all font-semibold text-base text-white placeholder:text-white/10"
                                value={modalSearchText}
                                onChange={(e) => setModalSearchText(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Search Results list container */}
                        <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide space-y-2.5 pr-0.5">
                            {loadingModal ? (
                                <div className="h-[200px] flex flex-col items-center justify-center text-white/30 text-[10px] font-black uppercase tracking-widest gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-lime"></div>
                                    Caricamento Archivio...
                                </div>
                            ) : modalResults.length === 0 ? (
                                <div className="h-[200px] flex flex-col items-center justify-center text-center py-6">
                                    <SearchX className="w-9 h-9 mb-2.5 text-white/20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3.5">Nessuno Studente Trovato</p>
                                    <button
                                        onClick={() => setIsCreatingStudent(true)}
                                        className="px-5 py-3 bg-[#E2F33C]/10 hover:bg-[#E2F33C]/20 border border-[#E2F33C]/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#E2F33C] transition-all shadow-lg hover:shadow-[#E2F33C]/10"
                                    >
                                        Registra Nuovo Studente
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {modalResults.map(s => {
                                        const expectedActivity = s.scheduled_turns?.[turnId];
                                        const isScheduledHere = expectedActivity === activityId;
                                        
                                        const isCheckedInHere = s.actual_location?.[turnId]?.checked_in && s.actual_location[turnId].activity_id === activityId;
                                        const isCheckedInElsewhere = s.actual_location?.[turnId]?.checked_in && s.actual_location[turnId].activity_id !== activityId;

                                        // Determina lo stato grafico dell'utente
                                        let btnText = "Registra";
                                        let badgeText = "Libero";
                                        let badgeColor = "bg-white/5 border-white/10 text-white/40";
                                        let btnStyle = "bg-brand-lime text-black shadow-lg shadow-brand-lime/10 hover:brightness-110 hover:shadow-brand-lime/20";
                                        let btnIcon = <UserPlus className="w-4.5 h-4.5" />;
                                        
                                        if (isCheckedInHere) {
                                            btnText = "Già Presente";
                                            badgeText = isScheduledHere ? "In Lista" : "Imbucato";
                                            badgeColor = isScheduledHere ? "bg-brand-lime/10 border-brand-lime/20 text-brand-lime" : "bg-purple-500/10 border-purple-500/20 text-purple-400";
                                            btnStyle = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-not-allowed opacity-80";
                                            btnIcon = <UserCheck className="w-4.5 h-4.5 text-emerald-400" />;
                                        } else if (isCheckedInElsewhere) {
                                            btnText = "Trasferisci";
                                            badgeText = "Altrove";
                                            badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-500";
                                            btnStyle = "bg-amber-500 text-black shadow-lg shadow-amber-500/10 hover:brightness-110 hover:shadow-amber-500/20";
                                            btnIcon = <MoveHorizontal className="w-4.5 h-4.5" />;
                                        } else if (isScheduledHere) {
                                            btnText = "Registra";
                                            badgeText = "In Lista";
                                            badgeColor = "bg-blue-500/10 border-blue-500/20 text-blue-400";
                                            btnStyle = "bg-primary text-white shadow-lg shadow-primary/10 hover:brightness-110 hover:shadow-primary/20";
                                            btnIcon = <UserPlus className="w-4.5 h-4.5 text-white" />;
                                        } else if (expectedActivity) {
                                            btnText = "Imbuca";
                                            badgeText = "Imbucato";
                                            badgeColor = "bg-purple-500/10 border-purple-500/20 text-purple-400";
                                            btnStyle = "bg-purple-500 text-white shadow-lg shadow-purple-500/10 hover:brightness-110 hover:shadow-purple-500/20";
                                            btnIcon = <UserPlus className="w-4.5 h-4.5 text-white" />;
                                        }

                                        return (
                                            <div
                                                key={s.id}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                                    isCheckedInHere
                                                        ? 'bg-emerald-500/[0.02] border-emerald-500/15'
                                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <div 
                                                    className="min-w-0 pr-3 cursor-pointer group"
                                                    onClick={() => onStudentClick(s)}
                                                >
                                                    <h4 className="font-black text-sm uppercase tracking-tight text-white group-hover:text-brand-lime transition-colors truncate">
                                                        {s.lastName} {s.firstName}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className="text-[9px] font-bold text-white/30 tracking-wide break-all truncate max-w-[150px] sm:max-w-[200px]">{s.email}</span>
                                                        <span className={`text-[7.5px] font-black uppercase italic px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
                                                            {badgeText}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        if (!isProcessing && !isCheckedInHere) {
                                                            performCheckIn(s, activityId);
                                                        }
                                                    }}
                                                    disabled={isProcessing || isCheckedInHere}
                                                    className={`w-28 py-2.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 shrink-0 select-none btn-press ${btnStyle}`}
                                                >
                                                    {isProcessing ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-current border-b-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            {btnIcon}
                                                            {btnText}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}

                                    <div className="mt-5 border-t border-white/10 pt-5 flex-shrink-0">
                                        <p className="text-center text-[9px] font-bold text-amber-500/80 uppercase tracking-widest mb-3 leading-normal">
                                            Lo studente cercato non è in lista o ha un'email diversa?
                                        </p>
                                        <button
                                            onClick={() => setIsCreatingStudent(true)}
                                            className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#E2F33C] hover:text-[#E2F33C] transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <UserPlus className="w-4 h-4 text-brand-lime" />
                                            Registra Nuovo Account Studente
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
