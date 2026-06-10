import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, SearchX, CheckCircle2, Info, MapPin, ArrowLeft, X, UserMinus, UserCheck, Loader2 } from "lucide-react";
import { useRoomManager } from "./useRoomManager";
import { StudentDetailModal } from "./StudentDetailModal";
import { AddStudentModal } from "./AddStudentModal";

interface RoomManagerProps {
    roomId: string;
    turnId: string;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ roomId: activityId, turnId: initialTurnId }) => {
    const navigate = useNavigate();
    const turnId = initialTurnId;
    const rm = useRoomManager(activityId, turnId);

    // Auto-redirect if invalid turnId
    React.useEffect(() => {
        if (rm.activity?.turn_ids && rm.activity.turn_ids.length > 0) {
            if (!rm.activity.turn_ids.includes(turnId)) {
                console.warn(`[RoomManager] Invalid turnId "${turnId}". Redirecting to "${rm.activity.turn_ids[0]}"`);
                navigate(`/room/${activityId}/${rm.activity.turn_ids[0]}`, { replace: true });
            }
        }
    }, [rm.activity, turnId, navigate, activityId]);

    if (rm.loading) return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-lime"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-surface text-white p-4 md:p-8 lg:p-12 relative overflow-hidden -mt-20 pt-36 md:pt-40 animate-in fade-in duration-700">
            {/* Background Aesthetics */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_top,rgba(0,130,230,0.06)_0%,transparent_60%)] pointer-events-none" />
            <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-brand-lime/[0.04] rounded-full blur-[140px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-[#34d399]/[0.03] rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-[#09090b]/40 backdrop-blur-md border border-white/10 p-5 md:p-6 rounded-2xl shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/staff")}
                                className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Dashboard</span>
                            </button>
                            
                            {rm.activity?.turn_ids && rm.activity.turn_ids.length > 1 && (
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                    {rm.activity.turn_ids.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => navigate(`/room/${activityId}/${t}`)}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${t === turnId ? 'bg-brand-lime text-black font-black shadow-sm' : 'text-white/40 hover:text-white'}`}
                                        >
                                            T{t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info Live */}
                        <div className="flex items-center gap-2">
                            <div className={`px-3.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/60`}>
                                Turno {turnId}
                            </div>
                            <div className={`px-3.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm ${
                                rm.isFull 
                                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                                    : 'bg-brand-lime/10 border-brand-lime/20 text-brand-lime'
                            }`}>
                                {rm.currentTurnCount} / {rm.activity?.max_capacity} Presenti
                                {rm.isFull && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{rm.activeAssembly?.name || 'Assemblea Attiva'}</span>
                          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-white mt-1">
                              {rm.activity?.name}
                          </h1>
                          <div className="flex items-center gap-1.5 text-white/50 text-[10px] font-bold uppercase tracking-wider mt-2.5">
                              <MapPin className="w-3.5 h-3.5 text-brand-lime" />
                              Aula: <span className="text-white font-black">{rm.activity?.location_name || 'N/A'}</span>
                          </div>
                        </div>
                    </div>
                </div>

                {/* Main responsive grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left columns (2/3 width on PC): Student management list & controls */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Search & Add Tools Row */}
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-brand-lime transition-colors" />
                                <input
                                    type="text"
                                    placeholder={"Cerca in " + (rm.currentTab === 'PRESENT' ? 'Presenti' : 'Da Appellare') + "..."}
                                    className="w-full bg-[#09090b]/40 backdrop-blur-md border border-white/10 rounded-xl py-3.5 pl-12 pr-10 outline-none focus:border-brand-lime/30 focus:bg-white/[0.04] transition-all font-semibold text-sm placeholder:text-white/20"
                                    value={rm.filterText}
                                    onChange={(e) => rm.setFilterText(e.target.value)}
                                />
                                {rm.filterText && (
                                    <button onClick={() => rm.setFilterText("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={rm.openAddModal}
                                className="bg-brand-lime/10 hover:bg-brand-lime/20 text-brand-lime border border-brand-lime/20 p-3.5 rounded-xl transition-all shadow-md active:scale-95 flex-shrink-0"
                                title="Aggiungi Studente / Imbucato"
                            >
                                <UserPlus className="w-5.5 h-5.5" />
                            </button>
                        </div>

                        {/* Tab toggler and list container */}
                        <div className="bg-[#09090b]/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-5">
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                <button
                                    onClick={() => rm.setCurrentTab('ABSENT')}
                                    className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 ${
                                        rm.currentTab === 'ABSENT' 
                                            ? 'bg-white/10 text-white shadow-inner font-black' 
                                            : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    Da Appellare
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] ${rm.currentTab === 'ABSENT' ? 'bg-white/10 text-white/80' : 'bg-white/5 text-white/30'}`}>{rm.absentStudents.length}</span>
                                </button>
                                <button
                                    onClick={() => rm.setCurrentTab('PRESENT')}
                                    className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 ${
                                        rm.currentTab === 'PRESENT' 
                                            ? 'bg-brand-lime/10 text-brand-lime shadow-inner font-black border border-brand-lime/10' 
                                            : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    Presenti
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] ${rm.currentTab === 'PRESENT' ? 'bg-brand-lime/20 text-brand-lime' : 'bg-white/5 text-white/30'}`}>{rm.presentStudents.length}</span>
                                </button>
                            </div>

                            <div className="grid gap-2.5">
                                {rm.displayStudents.length === 0 ? (
                                    <div className="py-16 text-center space-y-3 border border-dashed border-white/10 rounded-xl">
                                        <SearchX className="w-10 h-10 mx-auto text-white/20" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Nessun studente trovato in questa lista</p>
                                    </div>
                                ) : (
                                    rm.displayStudents
                                        .sort((a, b) => a.lastName.localeCompare(b.lastName))
                                        .map(student => {
                                            const loc = student.actual_location?.[turnId];
                                            const isHere = loc?.checked_in && loc.activity_id === activityId;
                                            const isElsewhere = loc?.checked_in && loc.activity_id !== activityId;
                                            const scheduledHere = student.scheduled_turns?.[turnId] === activityId;

                                            return (
                                                <div
                                                    key={student.id}
                                                    className={`relative flex items-center justify-between p-4 rounded-xl border transition-all overflow-hidden group ${
                                                        isHere 
                                                            ? 'bg-[#0082e6]/5 border-primary/20 shadow-[0_0_15px_rgba(0,130,230,0.05)]' 
                                                            : isElsewhere 
                                                                ? 'bg-white/[0.01] border-white/5 opacity-40 hover:opacity-60' 
                                                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <div
                                                        className="flex-1 min-w-0 pr-3 relative z-10 cursor-pointer"
                                                        onClick={() => rm.setSelectedStudentForDetail(student)}
                                                    >
                                                        <h4 className="font-black text-sm uppercase tracking-tight text-white group-hover:text-brand-lime transition-colors truncate">
                                                            {student.lastName} {student.firstName}
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] font-bold text-white/35 truncate max-w-[140px] sm:max-w-none">
                                                                {student.email}
                                                            </span>
                                                            {isElsewhere && (
                                                                <span className="text-[7.5px] font-black text-amber-500/80 uppercase italic bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Altrove</span>
                                                            )}
                                                            {!scheduledHere && !isElsewhere && (
                                                                <span className="text-[7.5px] font-black text-red-400 uppercase italic bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Imbucato</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => !rm.isProcessing && rm.performCheckIn(student, activityId)}
                                                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all relative z-10 active:scale-95 border ${
                                                            isHere 
                                                                ? 'bg-brand-lime text-black border-brand-lime/20 shadow-md shadow-brand-lime/10' 
                                                                : 'bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white'
                                                        }`}
                                                    >
                                                        {isHere ? <UserCheck className="w-5.5 h-5.5 stroke-[2.5]" /> : <UserMinus className="w-5 h-5 text-white/40" />}
                                                    </button>

                                                    {isHere && <div className="absolute inset-0 bg-gradient-to-r from-brand-lime/[0.02] to-transparent pointer-events-none" />}
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1/3 width on PC): Stats and Guidelines HUD */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Staff Check-in Card for Room Manager */}
                        <div className="bg-[#09090b]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-36 h-36 bg-brand-lime/5 rounded-full blur-2xl pointer-events-none" />
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl flex items-center justify-center ${rm.isStaffCheckedIn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'}`}>
                                    <UserCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">La Tua Presenza Staff</h3>
                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Registrazione Servizio</p>
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-white/50 leading-relaxed font-semibold uppercase">
                                {rm.isStaffCheckedIn 
                                    ? "La tua presenza a scuola come Staff (Room Manager) è registrata per questa assemblea." 
                                    : "Registra la tua presenza come Staff (Room Manager) per questa assemblea per comparire nel Master Report."}
                            </p>

                            <button
                                onClick={rm.toggleStaffCheckIn}
                                disabled={rm.isStaffCheckingIn}
                                className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
                                    rm.isStaffCheckedIn 
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' 
                                        : 'bg-brand-lime text-black hover:brightness-110 shadow-lg shadow-brand-lime/10'
                                }`}
                            >
                                {rm.isStaffCheckingIn ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : rm.isStaffCheckedIn ? (
                                    'Cancella Presenza Servizio'
                                ) : (
                                    'Registra Presenza Servizio'
                                )}
                            </button>
                        </div>

                        {/* Gauge Stats Card */}
                        <div className="bg-[#09090b]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-36 h-36 bg-brand-lime/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-brand-lime">Stato Appello Stanza</h3>
                                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Metriche real-time per l'aula</p>
                            </div>

                            <div className="space-y-4">
                                {/* Roll-call progress */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Progresso Appello</span>
                                        <span className="text-xs font-black text-brand-lime">{Math.round(rm.attendancePercentage)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-brand-lime to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(226,243,60,0.5)]"
                                            style={{ width: `${rm.attendancePercentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                        <div className="text-[7.5px] font-black uppercase tracking-widest text-white/30">Presenti</div>
                                        <div className="text-lg font-black text-white">{rm.presentStudents.length}</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                        <div className="text-[7.5px] font-black uppercase tracking-widest text-white/30">Da Appellare</div>
                                        <div className="text-lg font-black text-white/40">{rm.absentStudents.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Instructions Guideline */}
                        <div className="bg-[#09090b]/20 border border-white/5 rounded-2xl p-6 flex gap-4 items-start shadow-md">
                            <Info className="w-5 h-5 text-brand-lime shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-brand-lime mb-1.5">Note Operative</h4>
                                <ul className="text-white/40 text-[10px] leading-relaxed uppercase space-y-1.5 font-bold">
                                    <li>• Clicca sul tasto più per aggiungere assenti, imbucati o registrare nuovi account.</li>
                                    <li>• Tocca il nome di uno studente per aprire la sua scheda oraria completa.</li>
                                    <li>• Il contatore capienza in alto segnala in rosso se superi la capacità massima stabilita.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Float Toast */}
            {rm.toast && (
                <div className="fixed bottom-10 left-6 right-6 z-[60] animate-in slide-in-from-bottom-8 duration-500 max-w-sm mx-auto">
                    <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-2xl border ${rm.toast.type === 'success' ? 'bg-[#0082e6]/10 border-primary/30 text-primary' :
                        rm.toast.type === 'info' ? 'bg-white/5 border-white/20 text-white' :
                            'bg-red-500/10 border-red-500/30 text-red-500'
                        }`}>
                        {rm.toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        <span className="font-black text-xs uppercase tracking-widest">{rm.toast.message}</span>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AddStudentModal
                isOpen={rm.isAddModalOpen}
                onClose={() => rm.setIsAddModalOpen(false)}
                activityId={activityId}
                turnId={turnId}
                isProcessing={rm.isProcessing}
                isCreatingStudent={rm.isCreatingStudent}
                setIsCreatingStudent={rm.setIsCreatingStudent}
                modalSearchText={rm.modalSearchText}
                setModalSearchText={rm.setModalSearchText}
                loadingModal={rm.loadingModal}
                modalResults={rm.modalResults}
                newStudentData={rm.newStudentData}
                setNewStudentData={rm.setNewStudentData}
                performCheckIn={rm.performCheckIn}
                handleCreateStudent={rm.handleCreateStudent}
                fetchAssemblyStudents={rm.fetchAssemblyStudents}
                onStudentClick={rm.setSelectedStudentForDetail}
            />

            {rm.selectedStudentForDetail && (
                <StudentDetailModal
                    isOpen={!!rm.selectedStudentForDetail}
                    onClose={() => rm.setSelectedStudentForDetail(null)}
                    student={rm.selectedStudentForDetail}
                />
            )}
        </div>
    );
};
