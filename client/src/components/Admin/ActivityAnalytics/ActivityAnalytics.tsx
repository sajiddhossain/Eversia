import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../../firebase";
import { onSnapshot, doc } from "firebase/firestore";
import type { Activity, Student } from '../../../types';
import { Bar } from "react-chartjs-2";
import { X, Users, MapPin, Clock, CheckCircle2, AlertCircle, TrendingUp, Info } from "lucide-react";
import { motion } from "framer-motion";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface ActivityAnalyticsProps {
    activityId: string;
    currentTurn: string;
    allStudents: Student[];
    onClose: () => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.03
        }
    }
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 350, damping: 25 } }
} as const;

export const ActivityAnalytics: React.FC<ActivityAnalyticsProps> = ({ activityId, currentTurn, allStudents, onClose }) => {
    const [activity, setActivity] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch specific activity
        const unsubscribeActivity = onSnapshot(doc(db, "rooms", activityId), (doc) => {
            if (doc.exists()) {
                setActivity({ id: doc.id, ...doc.data() } as Activity);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeActivity();
        };
    }, [activityId]);

    const students = useMemo(() => {
        return allStudents.filter(s => {
            if (currentTurn === 'ALL') {
                // Check if checked in for any turn in this activity
                const locs = [
                    ...(s.actual_location ? Object.values(s.actual_location) : []),
                    ...(s.staff_actual_location ? Object.values(s.staff_actual_location) : [])
                ];
                return locs.some((loc: any) => loc?.checked_in && loc?.activity_id === activityId);
            } else {
                const turnKey = currentTurn;
                const turnKeyT = `T${currentTurn}`;
                const loc = s.staff_actual_location?.[turnKey] || 
                            s.staff_actual_location?.[turnKeyT] || 
                            s.actual_location?.[turnKey] || 
                            s.actual_location?.[turnKeyT];
                return loc?.checked_in && loc?.activity_id === activityId;
            }
        });
    }, [allStudents, activityId, currentTurn]);

    const stats = useMemo(() => {
        if (!activity) return null;
        const total = students.length;
        const capacity = activity.max_capacity || 1;
        const saturation = (total / capacity) * 100;

        return {
            total,
            capacity,
            saturation: Math.min(100, saturation),
            isFull: total >= capacity
        };
    }, [activity, students]);

    const turnData = {
        labels: ["Turno 1", "Turno 2", "Turno 3"],
        datasets: [
            {
                label: 'Occupazione Previsionale',
                data: ["1", "2", "3"].map(t => {
                    return activity?.counts_by_turn?.[t] || 0;
                }),
                backgroundColor: 'rgba(226, 243, 60, 0.15)',
                borderColor: '#E2F33C',
                borderWidth: 1.5,
                borderRadius: 12,
            }
        ],
    };

    if (loading || !activity) return (
        <div className="p-20 text-center animate-pulse text-primary font-display font-black uppercase tracking-widest">
            Analisi in corso...
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="glass-card bg-[#070b13]/95 border border-white/10 rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[85vh]"
        >
            {/* Left Column: Stats & Charts */}
            <div className="flex-1 p-8 md:p-10 space-y-8 md:space-y-10 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-white/5">
                <div className="flex justify-between items-start">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            <span className="text-[10px] font-display font-black uppercase tracking-[0.3em] text-white/30">Monitoraggio Live</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white leading-tight">{activity.name}</h2>
                        
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[10px] font-display font-bold text-white/50">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                <span>
                                    {activity.location_name}
                                    {activity.location_floor !== undefined && activity.location_floor !== "" ? (
                                        ` (Piano ${activity.location_floor}${activity.location_number ? ` • Aula ${activity.location_number}` : ''})`
                                    ) : ''}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[10px] font-display font-bold text-white/50">
                                <Clock className="w-3.5 h-3.5 text-brand-lime" />
                                <span>Multi-Turno: {activity.turn_ids?.join(", ")}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {/* Card 1: Occupazione Spazi */}
                    <motion.div 
                        whileHover={{ scale: 1.015, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="glass-card bg-white/[0.01] border border-white/5 p-6 rounded-[24px] relative overflow-hidden group shadow-lg"
                    >
                        <div className="relative z-10">
                            <p className="text-[10px] font-display font-black uppercase tracking-wider text-white/30 mb-3">Occupazione Spazi</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-display font-black text-white tracking-tight tabular-nums">{Math.round(stats?.saturation || 0)}%</span>
                            </div>
                            <div className="mt-6 h-2 bg-black/40 rounded-full overflow-hidden p-[1px] border border-white/[0.04]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats?.saturation}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        stats?.isFull 
                                            ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_12px_rgba(239,68,68,0.4)]' 
                                            : 'bg-gradient-to-r from-primary to-brand-lime shadow-[0_0_12px_rgba(0,130,230,0.3)]'
                                    }`}
                                />
                            </div>
                        </div>
                        <TrendingUp className="absolute -bottom-4 -right-4 w-24 h-24 text-white/[0.01] group-hover:text-primary/[0.03] transition-all duration-500" />
                    </motion.div>

                    {/* Card 2: Presenze Attuali */}
                    <motion.div 
                        whileHover={{ scale: 1.015, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="glass-card bg-white/[0.01] border border-white/5 p-6 rounded-[24px] shadow-lg flex flex-col justify-between"
                    >
                        <p className="text-[10px] font-display font-black uppercase tracking-wider text-white/30 mb-3">Presenze Attuali</p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-inner">
                                <Users className="w-5.5 h-5.5 text-primary" />
                            </div>
                            <div className="flex items-baseline">
                                <span className="text-4xl font-display font-black text-white tracking-tight tabular-nums">{stats?.total}</span>
                                <span className="text-white/20 font-display font-bold ml-2 text-sm uppercase">/ {stats?.capacity}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="glass-card bg-black/40 border border-white/[0.04] rounded-[24px] p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-display font-black uppercase tracking-widest text-white/40">Andamento Accessi</h3>
                        <div className="p-2 bg-white/5 rounded-xl border border-white/[0.05]">
                            <Clock className="w-4 h-4 text-white/30" />
                        </div>
                    </div>
                    <div className="h-64">
                        <Bar
                            data={turnData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: { display: false },
                                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10, weight: 'bold', family: "'Outfit', system-ui, sans-serif" } } }
                                },
                                plugins: { 
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: '#070b13',
                                        titleFont: { family: "'Outfit', sans-serif", weight: 'bold' },
                                        bodyFont: { family: "'Inter', sans-serif" },
                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                        borderWidth: 1,
                                        padding: 10,
                                        cornerRadius: 12
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="p-5 bg-white/[0.01] border border-white/[0.05] rounded-2xl flex gap-3.5 items-start">
                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-white/35 leading-relaxed font-medium">
                        I dati di occupazione sono calcolati in tempo reale basandosi sui check-in effettuati dai Room Manager tramite scansione o inserimento manuale.
                    </p>
                </div>
            </div>

            {/* Right Column: Live Student List */}
            <div className="w-full md:w-[380px] bg-black/30 border-t md:border-t-0 md:border-l border-white/[0.06] flex flex-col h-full">
                <div className="p-6 md:p-8 border-b border-white/[0.06] flex justify-between items-center bg-black/10 backdrop-blur-md shrink-0">
                    <div>
                        <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">Studenti Presenti</h3>
                        <p className="text-[9px] font-bold text-white/30 uppercase mt-1">Lista Live ({students.length})</p>
                    </div>
                    <motion.button 
                        onClick={onClose}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 hover:bg-white/5 rounded-full transition-all text-white/40 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </motion.button>
                </div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar"
                >
                    {students.map(s => (
                        <motion.div 
                            key={s.id}
                            variants={itemVariants}
                            className="bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] hover:border-white/10 p-4 rounded-2xl flex justify-between items-center group transition-all duration-300 border-l-2 border-l-transparent hover:border-l-primary"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                {/* Squircle Avatar */}
                                <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-brand-lime/10 border border-white/5 rounded-xl flex items-center justify-center text-[11px] font-display font-black text-white/70 group-hover:from-primary/20 group-hover:to-brand-lime/20 group-hover:text-primary transition-all shrink-0">
                                    {s.firstName?.[0]}{s.lastName?.[0]}
                                </div>
                                <div className="truncate">
                                    <p className="font-semibold text-sm text-white/85 group-hover:text-white transition-colors truncate">{s.firstName} {s.lastName}</p>
                                    <p className="text-[9px] text-white/20 font-black uppercase tracking-wider mt-0.5 truncate">{s.email.split('@')[0]}</p>
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/15 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                        </motion.div>
                    ))}
                    {students.length === 0 && (
                        <div className="py-24 text-center space-y-4 animate-in fade-in duration-350">
                            <div className="w-14 h-14 bg-white/[0.02] border border-white/[0.04] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                <AlertCircle className="w-6 h-6 text-white/10" />
                            </div>
                            <p className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-white/20 italic">Nessun check-in rilevato</p>
                        </div>
                    )}
                </motion.div>

                <div className="p-6 md:p-8 border-t border-white/[0.06] bg-black/20 backdrop-blur-md shrink-0">
                    <motion.button 
                        onClick={onClose} 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 text-white/50 hover:text-white font-display font-black rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-colors"
                    >
                        Torna alla Panoramica
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
