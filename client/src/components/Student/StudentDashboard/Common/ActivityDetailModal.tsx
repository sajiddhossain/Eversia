import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, Lock, CheckCircle, Users, Sparkles, ChevronDown, ChevronUp, Loader2, Shield } from 'lucide-react';
import { db } from '../../../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Activity, Assembly, Student, UserProfile } from '../../../../types';
import { formatDateToISO } from '../../../../utils/dateUtils';

interface ActivityDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: Activity;
    assembly: Assembly;
    studentData: Student | null;
    userProfile: UserProfile | null;
}

interface FriendBooking {
    displayName: string;
    email: string;
    className?: string;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
    isOpen,
    onClose,
    activity,
    assembly,
    studentData,
    userProfile
}) => {
    const [friendsBooked, setFriendsBooked] = useState<Record<string, FriendBooking[]>>({});
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [hasLoadedFriends, setHasLoadedFriends] = useState(false);
    const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({});

    // Compute turn timestamps for this assembly internally
    const turnTimestamps = React.useMemo(() => {
        if (!assembly?.turn_schedules || !assembly.date) return {};
        const isoDate = formatDateToISO(assembly.date);
        const result: Record<string, { start: number, end: number }> = {};
        
        Object.entries(assembly.turn_schedules).forEach(([tid, schedRaw]) => {
            const sched = schedRaw as { start?: string; end?: string };
            if (sched?.start && sched?.end) {
                const startTime = new Date(`${isoDate}T${sched.start}`).getTime();
                const endTime = new Date(`${isoDate}T${sched.end}`).getTime();
                if (!isNaN(startTime) && !isNaN(endTime)) result[tid] = { start: startTime, end: endTime };
            }
        });
        return result;
    }, [assembly?.turn_schedules, assembly?.date]);

    // Reset friends loaded state when modal opens or activity changes
    useEffect(() => {
        if (isOpen) {
            setFriendsBooked({});
            setHasLoadedFriends(false);
            setLoadingFriends(false);
            setExpandedTurns({});
        }
    }, [isOpen, activity.id]);

    const fetchFriendsBookings = async () => {
        if (!userProfile?.friends || userProfile.friends.length === 0) {
            setFriendsBooked({});
            setHasLoadedFriends(true);
            return;
        }
        setLoadingFriends(true);
        try {
            const friendsData: FriendBooking[] = [];
            // 1. Fetch friend profiles to get their emails
            await Promise.all(userProfile.friends.map(async (friendUid) => {
                const userSnap = await getDoc(doc(db, 'users', friendUid));
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    friendsData.push({
                        displayName: data.displayName || 'Studente',
                        email: data.email.toLowerCase(),
                        className: data.className
                    });
                }
            }));

            // 2. Fetch their student booking document for this assembly
            const turnBookings: Record<string, FriendBooking[]> = {};
            
            await Promise.all(friendsData.map(async (friend) => {
                const studentSnap = await getDoc(doc(db, 'students', `${assembly.id}_${friend.email}`));
                if (studentSnap.exists()) {
                    const studentBooking = studentSnap.data();
                    
                    if (activity.id === 'STAFF') {
                        const staffLoc = studentBooking.staff_actual_location || {};
                        const legacyLoc = studentBooking.actual_location || {};
                        const turnsList = assembly.turn_ids && assembly.turn_ids.length > 0 ? assembly.turn_ids : ['1', '2', '3'];
                        
                        turnsList.forEach(tId => {
                            const cleanId = tId.replace('T', '');
                            const legacyId = `T${cleanId}`;
                            const loc = staffLoc[cleanId] || staffLoc[legacyId] || legacyLoc[cleanId] || legacyLoc[legacyId];
                            
                            if (loc?.checked_in && loc?.activity_id === 'STAFF') {
                                if (!turnBookings[cleanId]) {
                                    turnBookings[cleanId] = [];
                                }
                                const exists = turnBookings[cleanId].some(f => f.email === friend.email);
                                if (!exists) {
                                    turnBookings[cleanId].push(friend);
                                }
                            }
                        });
                    } else {
                        const scheduledTurns = studentBooking.scheduled_turns || {};
                        
                        Object.entries(scheduledTurns).forEach(([turnId, activityId]) => {
                            const cleanTurnId = turnId.replace('T', '');
                            if (activityId === activity.id) {
                                if (!turnBookings[cleanTurnId]) {
                                    turnBookings[cleanTurnId] = [];
                                }
                                const exists = turnBookings[cleanTurnId].some(f => f.email === friend.email);
                                if (!exists) {
                                    turnBookings[cleanTurnId].push(friend);
                                }
                            }
                        });
                    }
                }
            }));

            setFriendsBooked(turnBookings);
            setHasLoadedFriends(true);
        } catch (err) {
            console.error("Error loading friends bookings:", err);
        } finally {
            setLoadingFriends(false);
        }
    };

    const handleToggleTurn = async (turnId: string) => {
        const isExpanding = !expandedTurns[turnId];
        setExpandedTurns(prev => ({ ...prev, [turnId]: isExpanding }));
        
        if (isExpanding && !hasLoadedFriends && !loadingFriends) {
            await fetchFriendsBookings();
        }
    };

    if (!isOpen) return null;

    const themeColor = assembly.themeColor || '#E2F33C';

    // Format assembly date in Italian format (correctly handling DD-MM-YYYY strings)
    const isoDate = assembly.date ? formatDateToISO(assembly.date) : null;
    const formattedDate = isoDate
        ? new Date(isoDate).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
          })
        : assembly.date || null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none opacity-20" style={{ backgroundColor: themeColor }} />

            {/* Main Modal Container */}
            <div className="relative bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-white/[0.08] flex items-start justify-between gap-4 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span 
                                className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border"
                                style={{ color: themeColor, borderColor: `${themeColor}20`, backgroundColor: `${themeColor}05` }}
                            >
                                <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                                Dettagli Attività
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-white pr-6 leading-tight">
                            {activity.name}
                        </h2>
                        <div className="flex items-center gap-2 text-white/40">
                            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
                                {activity.room_name || activity.location_name || 'Aula da definire'}
                                {(activity.location_floor || activity.location_number) && ` (${[
                                    activity.location_floor && `Piano ${activity.location_floor}`,
                                    activity.location_number && `Aula ${activity.location_number}`
                                ].filter(Boolean).join(' • ')})`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 relative z-10 custom-scrollbar">
                    
                    {/* Description */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Descrizione</h4>
                        <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-5">
                            <p className="text-xs sm:text-sm text-white/70 font-medium leading-relaxed whitespace-pre-line">
                                {activity.description || "Nessuna descrizione fornita per questa attività."}
                            </p>
                        </div>
                    </div>

                    {/* Assembly Context Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.08] shrink-0">
                                <Sparkles className="w-5 h-5 text-white/40" />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[9px] font-black text-white/20 uppercase tracking-wider">Assemblea</span>
                                <span className="block text-xs font-bold text-white/75 truncate">{assembly.name}</span>
                            </div>
                        </div>

                        <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.08] shrink-0">
                                <Calendar className="w-5 h-5 text-white/40" />
                            </div>
                            <div className="min-w-0">
                                <span className="block text-[9px] font-black text-white/20 uppercase tracking-wider">Data Assemblea</span>
                                <span className="block text-xs font-bold text-white/75">{formattedDate || 'Nessuna data'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Hours and Turn Occupancy */}
                    {activity.id !== 'STAFF' ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Disponibilità & Turni</h4>
                                {loadingFriends && (
                                    <div className="flex items-center gap-1.5 text-[9px] text-white/30 font-black uppercase tracking-widest animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin text-brand-lime" />
                                        Caricamento amici...
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                {activity.turn_ids.map((turnId) => {
                                    const ts = turnTimestamps[turnId];
                                    const timeRange = ts && !isNaN(ts.start) && !isNaN(ts.end)
                                        ? `${new Date(ts.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(ts.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : null;

                                    const currentCount = activity.counts_by_turn?.[turnId] || 0;
                                    const isFull = currentCount >= activity.max_capacity;
                                    const fillPercent = Math.min(100, (currentCount / activity.max_capacity) * 100);
                                    const isUserBooked = studentData?.scheduled_turns?.[turnId] === activity.id;
                                    const friendsInTurn = friendsBooked[turnId] || [];
                                    const isExpanded = !!expandedTurns[turnId];

                                    return (
                                        <div 
                                            key={turnId}
                                            className={`border rounded-2xl p-4 flex flex-col transition-all duration-300 ${
                                                isUserBooked 
                                                    ? 'bg-brand-lime/[0.04] border-brand-lime/20 shadow-[0_0_20px_rgba(226,243,60,0.03)]'
                                                    : isFull 
                                                        ? 'bg-black/20 border-white/[0.03] opacity-50' 
                                                        : 'bg-white/[0.01] border-white/[0.05]'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                                                        isUserBooked 
                                                            ? 'bg-brand-lime text-black border-brand-lime'
                                                            : 'bg-white/5 text-white/40 border-white/10'
                                                    }`}>
                                                        {turnId}°
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-bold text-white uppercase tracking-tight">
                                                            {turnId}° Turno
                                                        </span>
                                                        {timeRange && (
                                                            <span className="flex items-center gap-1 text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">
                                                                <Clock className="w-3.5 h-3.5 text-white/20" />
                                                                {timeRange}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:items-end gap-1.5 shrink-0 min-w-[120px]">
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold">
                                                            <Users className="w-3.5 h-3.5 text-white/20" />
                                                            <span className={`tabular-nums ${isFull ? 'text-red-500/80' : fillPercent > 80 ? 'text-amber-500/80' : ''}`}>
                                                                {currentCount}
                                                            </span>
                                                            <span>/</span>
                                                            <span>{activity.max_capacity}</span>
                                                            <span className="text-white/30 text-[9px] font-normal normal-case">iscritti</span>
                                                        </div>
                                                        {isUserBooked ? (
                                                            <span className="text-[9px] font-black text-brand-lime uppercase tracking-[0.2em] italic flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" /> Scelta
                                                            </span>
                                                        ) : isFull ? (
                                                            <span className="text-[9px] font-black text-red-500/60 uppercase tracking-[0.2em] italic flex items-center gap-1">
                                                                <Lock className="w-3 h-3" /> Pieno
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                                                                Disponibile
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Progress Bar */}
                                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${
                                                                isFull ? 'bg-red-500/40' : fillPercent > 80 ? 'bg-amber-500/60' : 'bg-brand-lime/40'
                                                            }`}
                                                            style={{ width: `${fillPercent}%`, backgroundColor: isUserBooked ? themeColor : undefined }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dropdown for friends registered in this activity turn */}
                                            <div className="mt-3 pt-3 border-t border-white/[0.05] relative z-10">
                                                <button
                                                    onClick={() => handleToggleTurn(turnId)}
                                                    className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-brand-lime/80 hover:text-brand-lime transition-colors cursor-pointer"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5" />
                                                        {hasLoadedFriends ? (
                                                            `${friendsInTurn.length} ${friendsInTurn.length === 1 ? 'amico iscritto' : 'amici iscritti'}`
                                                        ) : (
                                                            'Amici iscritti'
                                                        )}
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-3.5 h-3.5 animate-in fade-in" />
                                                    ) : (
                                                        <ChevronDown className="w-3.5 h-3.5 animate-in fade-in" />
                                                    )}
                                                </button>
                                                {isExpanded && (
                                                    <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar bg-white/[0.02] border border-white/5 rounded-xl p-2.5 animate-in slide-in-from-top-2 duration-300">
                                                        {loadingFriends ? (
                                                            <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold py-1">
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-lime" />
                                                                Caricamento...
                                                            </div>
                                                        ) : friendsInTurn.length > 0 ? (
                                                            friendsInTurn.map((friend) => (
                                                                <div key={friend.email} className="flex items-center justify-between text-[11px] font-bold text-white/70">
                                                                    <span>{friend.displayName}</span>
                                                                    {friend.className && (
                                                                        <span className="text-[9px] font-black uppercase text-brand-lime bg-brand-lime/10 px-1.5 py-0.5 rounded border border-brand-lime/20 shrink-0">
                                                                            {friend.className}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-[10px] text-white/30 font-bold italic py-1">
                                                                Nessun amico iscritto a questo turno
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-4 border border-blue-500/10 bg-blue-500/5 p-6 rounded-2xl">
                                <div className="flex items-center gap-3 text-blue-400">
                                    <Shield className="w-5 h-5 animate-pulse" />
                                    <h5 className="font-black uppercase tracking-widest text-xs">Servizio di Supporto Staff</h5>
                                </div>
                                <p className="text-xs text-white/60 font-medium leading-relaxed">
                                    Questo turno è dedicato allo svolgimento delle mansioni di Staff o Sicurezza per l'assemblea corrente. 
                                    Non presenta prenotazioni standard, orari di disponibilità dinamici o limiti di capienza aule.
                                </p>
                            </div>

                            {/* Hours and Staff Turns / Friends in Service */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Colleghi Staff in Servizio</h4>
                                </div>
                                <div className="space-y-3">
                                    {(assembly.turn_ids && assembly.turn_ids.length > 0 ? assembly.turn_ids : ['1', '2', '3']).map((turnId) => {
                                        const cleanTurn = turnId.replace('T', '');
                                        const ts = turnTimestamps[cleanTurn] || turnTimestamps[`T${cleanTurn}`];
                                        const timeRange = ts && !isNaN(ts.start) && !isNaN(ts.end)
                                            ? `${new Date(ts.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(ts.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            : null;

                                        const friendsInTurn = friendsBooked[cleanTurn] || [];
                                        const isExpanded = !!expandedTurns[cleanTurn];
                                        
                                        const isUserCheckedInHere = studentData?.staff_actual_location?.[cleanTurn]?.checked_in || 
                                                                   studentData?.staff_actual_location?.[`T${cleanTurn}`]?.checked_in ||
                                                                   studentData?.actual_location?.[cleanTurn]?.checked_in || 
                                                                   studentData?.actual_location?.[`T${cleanTurn}`]?.checked_in;

                                        return (
                                            <div 
                                                key={cleanTurn}
                                                className={`border rounded-2xl p-4 flex flex-col transition-all duration-300 ${
                                                    isUserCheckedInHere 
                                                        ? 'bg-blue-500/[0.04] border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.03)]'
                                                        : 'bg-white/[0.01] border-white/[0.05]'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                                                            isUserCheckedInHere 
                                                                ? 'bg-blue-500 text-white border-blue-500'
                                                                : 'bg-white/5 text-white/40 border-white/10'
                                                        }`}>
                                                            {cleanTurn}°
                                                        </div>
                                                        <div>
                                                            <span className="block text-xs font-bold text-white uppercase tracking-tight">
                                                                {cleanTurn}° Turno Staff
                                                            </span>
                                                            {timeRange && (
                                                                <span className="flex items-center gap-1 text-[10px] text-white/30 font-bold uppercase tracking-wider mt-0.5">
                                                                    <Clock className="w-3.5 h-3.5 text-white/20" />
                                                                    {timeRange}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                                                        {isUserCheckedInHere ? (
                                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] italic flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" /> In Servizio
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                                                                Fuori Servizio
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Dropdown for friends registered in this staff turn */}
                                                <div className="mt-3 pt-3 border-t border-white/[0.05] relative z-10">
                                                    <button
                                                        onClick={() => handleToggleTurn(cleanTurn)}
                                                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-blue-400/80 hover:text-blue-400 transition-colors cursor-pointer"
                                                    >
                                                        <span className="flex items-center gap-1.5">
                                                            <Users className="w-3.5 h-3.5" />
                                                            {hasLoadedFriends ? (
                                                                `${friendsInTurn.length} ${friendsInTurn.length === 1 ? 'amico in servizio' : 'amici in servizio'}`
                                                            ) : (
                                                                'Amici in servizio'
                                                            )}
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-3.5 h-3.5 animate-in fade-in" />
                                                        ) : (
                                                            <ChevronDown className="w-3.5 h-3.5 animate-in fade-in" />
                                                        )}
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar bg-white/[0.02] border border-white/5 rounded-xl p-2.5 animate-in slide-in-from-top-2 duration-300">
                                                            {loadingFriends ? (
                                                                <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold py-1">
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                                                    Caricamento...
                                                                </div>
                                                            ) : friendsInTurn.length > 0 ? (
                                                                friendsInTurn.map((friend) => (
                                                                    <div key={friend.email} className="flex items-center justify-between text-[11px] font-bold text-white/70">
                                                                        <span>{friend.displayName}</span>
                                                                        {friend.className && (
                                                                            <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">
                                                                                {friend.className}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-[10px] text-white/30 font-bold italic py-1">
                                                                    Nessun amico in servizio in questo turno
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 sm:px-8 border-t border-white/[0.08] flex justify-end shrink-0 relative z-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-3.5 bg-white text-black hover:bg-white/90 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-102 active:scale-98 w-full sm:w-auto text-center"
                    >
                        Ho capito
                    </button>
                </div>
            </div>
        </div>
    );
};
