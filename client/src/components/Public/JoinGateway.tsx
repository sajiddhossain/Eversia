import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import {
    LogIn, Loader2, Sparkles,
    ArrowRight, Calendar,
    Atom, Globe, Search, Users
} from 'lucide-react';
import type { Assembly, Activity } from '../../types';

export const JoinGateway: React.FC = () => {
    const { assemblyId } = useParams<{ assemblyId: string }>();
    const { loginWithGoogle, userProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // 2026 Cursor spotlight hover tracker
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    const [assembly, setAssembly] = useState<Assembly | null>(null);
    const [loadingAssembly, setLoadingAssembly] = useState(true);
    const [loginInProgress, setLoginInProgress] = useState(false);

    // Guest preview states
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTurnFilter, setSelectedTurnFilter] = useState('');
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
    const [searchFocused, setSearchFocused] = useState(false);
    const [hoveredActId, setHoveredActId] = useState<string | null>(null);

    useEffect(() => {
        if (!assemblyId) return;

        const unsub = onSnapshot(doc(db, 'assemblies', assemblyId), (snap) => {
            if (snap.exists()) {
                setAssembly({ id: snap.id, ...snap.data() } as Assembly);
            }
            setLoadingAssembly(false);
        }, (err) => {
            console.error('JoinGateway fetch error', err);
            setLoadingAssembly(false);
        });

        return unsub;
    }, [assemblyId]);

    // Fetch activities for the preview
    useEffect(() => {
        if (!assemblyId) return;

        setLoadingActivities(true);
        const q = query(collection(db, 'rooms'), where('assemblyId', '==', assemblyId));
        getDocs(q).then((snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setActivities(list);
            setLoadingActivities(false);
        }).catch((err) => {
            console.error('JoinGateway activities fetch error', err);
            setLoadingActivities(false);
        });
    }, [assemblyId]);

    // Countdown logic to the assembly
    useEffect(() => {
        if (!assembly?.date) return;
        
        let dateStr = assembly.date;
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        
        let startTimeStr = "08:30";
        if (assembly.turn_schedules) {
            const starts = Object.values(assembly.turn_schedules)
                .map(s => s.start)
                .filter(Boolean)
                .sort();
            if (starts.length > 0) startTimeStr = starts[0];
        }

        const targetDate = new Date(`${dateStr}T${startTimeStr}`);
        if (isNaN(targetDate.getTime())) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = targetDate.getTime() - now;

            if (difference <= 0) {
                setTimeLeft(null);
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [assembly]);

    // Parse turn IDs from activities
    const allTurnIds = useMemo(() => {
        const turns = new Set<string>();
        activities.forEach(act => {
            (act.turn_ids || []).forEach(t => turns.add(t));
        });
        return Array.from(turns).sort();
    }, [activities]);

    // Calculate average capacity per turn dynamically
    const seatsPerTurn = useMemo(() => {
        if (allTurnIds.length === 0) return 0;
        const turnCapacities = allTurnIds.map(tid => {
            return activities
                .filter(act => (act.turn_ids || []).includes(tid))
                .reduce((sum, act) => sum + (act.max_capacity || 0), 0);
        });
        const sum = turnCapacities.reduce((a, b) => a + b, 0);
        return Math.round(sum / allTurnIds.length);
    }, [activities, allTurnIds]);

    // Select the first turn automatically when they load
    useEffect(() => {
        if (allTurnIds.length > 0 && !selectedTurnFilter) {
            setSelectedTurnFilter(allTurnIds[0]);
        }
    }, [allTurnIds, selectedTurnFilter]);

    // Filter activities based on search and turn filters
    const filteredActivities = useMemo(() => {
        return activities.filter(act => {
            const matchesSearch = act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (act.room_name || act.location_name || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesTurn = !selectedTurnFilter || (act.turn_ids || []).includes(selectedTurnFilter);

            return matchesSearch && matchesTurn;
        });
    }, [activities, searchQuery, selectedTurnFilter]);

    useEffect(() => {
        if (userProfile && assemblyId) {
            navigate(`/student/${assemblyId}`, { replace: true });
        }
    }, [userProfile, assemblyId, navigate]);

    const handleJoin = async () => {
        setLoginInProgress(true);
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Login failed:", error);
            setLoginInProgress(false);
        }
    };

    if (loadingAssembly || authLoading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!assembly) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center mb-8">
                    <Atom className="w-12 h-12 text-white/10" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight mb-3">Link Non Valido</h1>
                <p className="text-white/40 max-w-sm mb-8 font-medium text-sm leading-relaxed">
                    L'assemblea richiesta non esiste oppure il link è scaduto. Chiedi un nuovo invito all'organizzatore.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-white/90 active:scale-95"
                >
                    Torna alla Home
                </button>
            </div>
        );
    }

    const themeColor = assembly.themeColor || '#E2F33C';

    return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden selection:bg-primary/30 py-10 sm:py-24">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-20" style={{ backgroundColor: themeColor }} />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="max-w-xl md:max-w-4xl w-full space-y-6 sm:space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* School Branding */}
                <div className="flex flex-col items-center gap-6 mb-4">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white/40 text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                        <Atom className="w-3.5 h-3.5" style={{ color: themeColor }} />
                        Liceo M.G. Agnesi
                    </div>
                </div>

                {/* Main Card */}
                <div 
                    onMouseMove={handleMouseMove}
                    className="bg-white/[0.01] border border-white/5 rounded-3xl p-1 shadow-2xl backdrop-blur-md relative overflow-hidden spotlight-card"
                >
                    <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-10" style={{ backgroundColor: themeColor }} />

                    <div className="bg-[#09090b]/40 rounded-[22px] p-5 sm:p-8 md:p-12 space-y-8 sm:space-y-10">
                        {/* Assembly Info */}
                        <div className="text-center space-y-4">
                            <h1 className={`font-black tracking-tighter uppercase italic leading-tight break-words max-w-full mx-auto ${
                                assembly.name.length > 25 
                                    ? 'text-2xl sm:text-3xl md:text-5xl' 
                                    : 'text-3xl sm:text-4xl md:text-6xl'
                            }`}>
                                {assembly.name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {assembly.date && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                                        <Calendar className="w-3 h-3" />
                                        {assembly.date}
                                    </div>
                                )}
                                <div 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest bg-white/5"
                                    style={{ color: themeColor, borderColor: `${themeColor}20` }}
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: themeColor }} />
                                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: themeColor }} />
                                    </span>
                                    Invito Attivo
                                </div>
                                {!loadingActivities && activities.length > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40">
                                        <Users className="w-3 h-3" style={{ color: themeColor }} />
                                        {seatsPerTurn} Posti / Turno
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Countdown Timer */}
                        {timeLeft && (
                            <div className="flex items-center justify-center gap-2.5 sm:gap-4 py-6 border-y border-white/5">
                                {[
                                    { val: timeLeft.days, label: 'Giorni' },
                                    { val: timeLeft.hours, label: 'Ore' },
                                    { val: timeLeft.minutes, label: 'Minuti' },
                                    { val: timeLeft.seconds, label: 'Secondi' }
                                ].map((unit, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 sm:p-4 min-w-[65px] sm:min-w-[85px] flex flex-col items-center justify-center backdrop-blur-sm relative overflow-hidden shadow-lg group/timer hover:border-white/10 transition-colors"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                                        <span 
                                            className="text-2xl sm:text-4xl font-black tabular-nums tracking-tight animate-pulse relative z-10" 
                                            style={{ 
                                                color: themeColor,
                                                textShadow: `0 0 15px ${themeColor}30`
                                            }}
                                        >
                                            {String(unit.val).padStart(2, '0')}
                                        </span>
                                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-white/30 mt-1 relative z-10">{unit.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Banner if available */}
                        {assembly.bannerActive && assembly.bannerImageUrl && (
                            <div className="w-full rounded-2xl overflow-hidden border border-white/10 aspect-[21/9] shadow-inner">
                                <img
                                    src={assembly.bannerImageUrl}
                                    alt="Assembly Banner"
                                    className="w-full h-full object-cover opacity-80"
                                />
                            </div>
                        )}

                        {/* Dual Action Section */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Option 1: Full Access */}
                            <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4 hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-md group">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                                    <LogIn className="w-5 h-5" style={{ color: themeColor }} />
                                </div>
                                <div className="space-y-1 text-left">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Studente</h3>
                                    <p className="text-[10px] text-white/35 font-medium leading-relaxed">Accedi col tuo account scolastico per prenotare le attività.</p>
                                </div>
                                <button
                                    onClick={handleJoin}
                                    disabled={loginInProgress}
                                    className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] flex items-center justify-center gap-2 mt-auto transition-all active:scale-[0.98] disabled:opacity-50 text-black hover:opacity-90 shadow-lg cursor-pointer"
                                    style={{ 
                                        backgroundColor: themeColor,
                                        boxShadow: `0 8px 30px ${themeColor}15`
                                    }}
                                >
                                    {loginInProgress ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Accedi'}
                                    <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            {/* Option 2: Guest Mode */}
                            <div className="flex flex-col bg-white/[0.01] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4 hover:bg-white/[0.02] hover:border-white/10 transition-all shadow-md group/guest">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-2">
                                    <Globe className="w-5 h-5 text-white/40 group-hover/guest:text-white transition-colors" />
                                </div>
                                <div className="space-y-1 text-left">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Ospite</h3>
                                    <p className="text-[10px] text-white/20 font-medium leading-relaxed">Sfoglia il catalogo delle attività senza effettuare l'accesso.</p>
                                </div>
                                <button
                                    onClick={() => navigate(`/student/${assemblyId}`)}
                                    className="w-full h-14 border rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] flex items-center justify-center gap-2 mt-auto transition-all hover:bg-white/5 active:scale-[0.98] cursor-pointer"
                                    style={{ 
                                        borderColor: `${themeColor}20`,
                                        color: themeColor
                                    }}
                                >
                                    <span>Esplora</span>
                                    <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover/guest:opacity-100 group-hover/guest:translate-x-1 group-hover/guest:ml-0 transition-all duration-300" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activities Preview Section */}
                {!loadingActivities && activities.length > 0 && (
                    <div 
                        onMouseMove={handleMouseMove}
                        className="bg-white/[0.01] border border-white/5 rounded-3xl p-1 shadow-2xl backdrop-blur-md relative overflow-hidden spotlight-card animate-in fade-in slide-in-from-top-4 duration-700 delay-150"
                    >
                        <div className="bg-[#09090b]/40 rounded-[22px] p-5 sm:p-8 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                                <div className="space-y-1 text-left">
                                    <h2 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2 text-white">
                                        <Sparkles className="w-5 h-5" style={{ color: themeColor }} />
                                        Anteprima dei Laboratori ({filteredActivities.length})
                                    </h2>
                                    <p className="text-[10px] text-white/30 font-medium">Sfoglia le attività disponibili per questa assemblea</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    {/* Search Bar */}
                                    <div className="relative flex items-center w-full sm:w-auto">
                                        <Search className="w-3.5 h-3.5 text-white/25 absolute left-3 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Cerca attività o aula..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setSearchFocused(true)}
                                            onBlur={() => setSearchFocused(false)}
                                            className="w-full sm:w-60 h-10 pl-9 pr-4 bg-white/5 border rounded-xl text-xs text-white placeholder-white/25 focus:outline-none transition-all font-medium"
                                            style={{ 
                                                borderColor: searchFocused ? themeColor : 'rgba(255, 255, 255, 0.1)',
                                                boxShadow: searchFocused ? `0 0 10px ${themeColor}20` : 'none'
                                            }}
                                        />
                                    </div>
                                    {/* Turn Filters */}
                                    {allTurnIds.length > 0 && (
                                        <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl max-w-max self-start sm:self-auto">
                                            {allTurnIds.map(tid => (
                                                <button
                                                    key={tid}
                                                    onClick={() => setSelectedTurnFilter(tid)}
                                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                                                        selectedTurnFilter === tid 
                                                            ? 'text-black' 
                                                            : 'text-white/40 hover:bg-white/5 hover:text-white/80'
                                                    }`}
                                                    style={selectedTurnFilter === tid ? {
                                                        backgroundColor: themeColor,
                                                    } : {}}
                                                >
                                                    {tid}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {filteredActivities.length === 0 ? (
                                <div className="py-12 text-center text-white/20 font-black uppercase tracking-widest text-xs">
                                    Nessuna attività corrisponde ai filtri
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar soft-scroll-fade">
                                    {filteredActivities.map((act) => {
                                        const counts = act.counts_by_turn || {};
                                        const currentBooked = counts[selectedTurnFilter] || 0;
                                        const totalCapacity = act.max_capacity;
                                        const percentBooked = Math.min(100, Math.round((currentBooked / totalCapacity) * 100));
                                        const isFull = percentBooked >= 100;
                                        const isActHovered = hoveredActId === act.id;

                                        return (
                                            <div 
                                                key={act.id} 
                                                onMouseEnter={() => setHoveredActId(act.id)}
                                                onMouseLeave={() => setHoveredActId(null)}
                                                className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/[0.04] transition-all duration-300 group"
                                                style={{
                                                    borderColor: isActHovered ? `${themeColor}30` : 'rgba(255, 255, 255, 0.05)',
                                                    boxShadow: isActHovered ? `0 4px 20px ${themeColor}05` : 'none'
                                                }}
                                            >
                                                <div className="space-y-2 text-left">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                                                            {act.room_name || act.location_name || 'Aula da definire'}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {[...(act.turn_ids || [])].sort().map(t => {
                                                                const isActiveTurn = selectedTurnFilter === t;
                                                                return (
                                                                    <span 
                                                                        key={t}
                                                                        className={`px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider uppercase border border-transparent ${
                                                                            isActiveTurn 
                                                                                ? '' 
                                                                                : 'bg-white/5 text-white/40'
                                                                        }`}
                                                                        style={isActiveTurn ? {
                                                                            backgroundColor: `${themeColor}20`,
                                                                            color: themeColor,
                                                                            borderColor: `${themeColor}25`
                                                                        } : {}}
                                                                    >
                                                                        {t}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <h4 
                                                        className="text-sm font-black uppercase leading-snug transition-colors duration-300"
                                                        style={{ color: isActHovered ? themeColor : '#ffffff' }}
                                                    >
                                                        {act.name}
                                                    </h4>
                                                    {act.description && (
                                                        <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">
                                                            {act.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-white/[0.03] space-y-1.5">
                                                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                                                        <span className="text-white/30">Posti Occupati</span>
                                                        <span 
                                                            className="transition-colors duration-300"
                                                            style={{ color: isFull ? '#ef4444' : themeColor }}
                                                        >
                                                            {currentBooked} / {totalCapacity} ({percentBooked}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500`}
                                                            style={{ 
                                                                width: `${percentBooked}%`,
                                                                backgroundColor: isFull ? '#ef4444' : themeColor,
                                                                boxShadow: isFull ? '0 0 10px rgba(239, 68, 68, 0.5)' : `0 0 10px ${themeColor}50`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer Reference */}
                <div className="text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/5">
                        Eversia Software &bull; Assembly System &bull; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
};
