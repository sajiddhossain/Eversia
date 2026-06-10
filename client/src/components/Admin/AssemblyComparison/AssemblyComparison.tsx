import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Assembly, Activity, Student } from '../../../types';
import { Bar } from "react-chartjs-2";
import { X, GitCompare, Loader2 } from "lucide-react";

interface Props {
    assemblies: Assembly[];
    onClose: () => void;
}

interface AssemblyStats {
    assembly: Assembly;
    totalStudents: number;
    presentStudents: number;
    totalActivities: number;
    avgSaturation: number;
    nonEnrolled: number;
}

export const AssemblyComparison: React.FC<Props> = ({ assemblies, onClose }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [stats, setStats] = useState<AssemblyStats[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
        );
    };

    const loadStats = async () => {
        if (selectedIds.length < 2) return;
        setLoading(true);
        const results: AssemblyStats[] = [];

        for (const id of selectedIds) {
            const assembly = assemblies.find(a => a.id === id)!;

            const [activitiesSnap, studentsSnap] = await Promise.all([
                getDocs(query(collection(db, "rooms"), where("assemblyId", "==", id))),
                getDocs(query(collection(db, "students"), where("assemblyId", "==", id))),
            ]);

            const acts = activitiesSnap.docs.map(d => d.data() as Activity);
            const studs = studentsSnap.docs.map(d => d.data() as Student);

            const presentStudents = studs.filter(s => {
                const locValues = Object.values(s.actual_location || {});
                return locValues.some((loc: any) => loc?.checked_in === true);
            }).length;

            const totalCap = acts.reduce((sum, a) => sum + a.max_capacity * (a.turn_ids?.length || 1), 0);
            const totalOccupied = acts.reduce((sum, a) => sum + Object.values(a.counts_by_turn || {}).reduce((s, c) => s + c, 0), 0);

            results.push({
                assembly,
                totalStudents: studs.length,
                presentStudents,
                totalActivities: acts.length,
                avgSaturation: totalCap > 0 ? (totalOccupied / totalCap) * 100 : 0,
                nonEnrolled: studs.length - presentStudents,
            });
        }

        setStats(results);
        setLoading(false);
    };

    useEffect(() => {
        if (selectedIds.length >= 2) loadStats();
        else setStats([]);
    }, [selectedIds]);

    const chartData = useMemo(() => {
        if (stats.length === 0) return null;
        const colors = ['rgba(226, 243, 60, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(168, 85, 247, 0.8)'];

        return {
            labels: ['Partecipazione %', 'Occupazione Aule %', 'Non Iscritti'],
            datasets: stats.map((s, i) => ({
                label: s.assembly.name,
                data: [
                    s.totalStudents > 0 ? (s.presentStudents / s.totalStudents) * 100 : 0,
                    s.avgSaturation,
                    s.nonEnrolled,
                ],
                backgroundColor: colors[i],
                borderRadius: 8,
            })),
        };
    }, [stats]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl"><GitCompare className="w-6 h-6 text-purple-400" /></div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest">Confronto Assemblee</h2>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Seleziona 2-4 assemblee da confrontare</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Selection */}
                    <div className="flex flex-wrap gap-2">
                        {assemblies.map(a => (
                            <button
                                key={a.id}
                                onClick={() => toggleSelection(a.id)}
                                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${selectedIds.includes(a.id)
                                    ? 'bg-primary text-black border-primary'
                                    : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {a.name}
                            </button>
                        ))}
                    </div>

                    {loading && (
                        <div className="py-10 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Stats Table */}
                    {stats.length >= 2 && !loading && (
                        <>
                            <div className="bg-white/2 border border-white/5 rounded-[2rem] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-white/30">
                                            <th className="px-6 py-4 text-left">Assemblea</th>
                                            <th className="px-6 py-4 text-center">Studenti</th>
                                            <th className="px-6 py-4 text-center">Presenti</th>
                                            <th className="px-6 py-4 text-center">Partecipazione</th>
                                            <th className="px-6 py-4 text-center">Attività</th>
                                            <th className="px-6 py-4 text-center">Occupazione</th>
                                            <th className="px-6 py-4 text-center">Non Iscritti</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {stats.map(s => (
                                            <tr key={s.assembly.id} className="hover:bg-white/5">
                                                <td className="px-6 py-4 font-bold">{s.assembly.name}</td>
                                                <td className="px-6 py-4 text-center">{s.totalStudents}</td>
                                                <td className="px-6 py-4 text-center text-green-400 font-bold">{s.presentStudents}</td>
                                                <td className="px-6 py-4 text-center font-black">{s.totalStudents > 0 ? Math.round((s.presentStudents / s.totalStudents) * 100) : 0}%</td>
                                                <td className="px-6 py-4 text-center">{s.totalActivities}</td>
                                                <td className="px-6 py-4 text-center font-bold text-amber-400">{Math.round(s.avgSaturation)}%</td>
                                                <td className="px-6 py-4 text-center text-red-400 font-bold">{s.nonEnrolled}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Chart */}
                            {chartData && (
                                <div className="bg-white/2 border border-white/5 rounded-[2rem] p-8">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white/30 mb-6">Confronto Visuale</h3>
                                    <div className="h-[300px]">
                                        <Bar
                                            data={chartData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                scales: {
                                                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)' } },
                                                    x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)' } },
                                                },
                                                plugins: {
                                                    legend: { labels: { color: 'rgba(255,255,255,0.6)', usePointStyle: true } },
                                                    tooltip: { backgroundColor: '#1a1a1a', titleColor: '#fff', bodyColor: '#ccc' },
                                                },
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
