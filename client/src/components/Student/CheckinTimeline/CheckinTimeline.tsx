import React, { useMemo } from "react";
import type { Student } from '../../../types';
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { Clock, X, HelpCircle } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
    students: Student[];
    currentTurn: string;
    onClose: () => void;
}

export const CheckinTimeline: React.FC<Props> = ({ students, currentTurn, onClose }) => {
    const [intervalMinutes, setIntervalMinutes] = React.useState(5);
    const [timeWindow, setTimeWindow] = React.useState<'ALL' | '30M' | '1H' | '2H'>('ALL');
    const [showInfo, setShowInfo] = React.useState(false);

    // Stato di "tick" per forzare il ricalcolo del grafico ogni minuto (mantiene il grafico "Live")
    const [lastTick, setLastTick] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => {
            setLastTick(new Date());
        }, 60000); // 1 minuto
        return () => clearInterval(timer);
    }, []);

    const timelineData = useMemo(() => {
        // 1. Raccolta di tutti i timestamp dei check-in (filtrati per turno se necessario)
        // NOTA: Il traffico è ottimizzato perché riceviamo solo i delta tramite onSnapshot nel componente padre.
        const allTimestamps: number[] = [];
        students.forEach(s => {
            const hasStudentLoc = !!s.actual_location;
            const hasStaffLoc = !!s.staff_actual_location;
            if (!hasStudentLoc && !hasStaffLoc) return;

            const turnsSet = new Set<string>();
            if (hasStudentLoc) Object.keys(s.actual_location!).forEach(t => turnsSet.add(t.replace('T', '')));
            if (hasStaffLoc) Object.keys(s.staff_actual_location!).forEach(t => turnsSet.add(t.replace('T', '')));

            const turns = currentTurn === 'ALL' ? Array.from(turnsSet) : [currentTurn.replace('T', '')];
            turns.forEach(turnId => {
                const loc = (s.actual_location as any)?.[turnId] || 
                            (s.actual_location as any)?.[`T${turnId}`] || 
                            (s.staff_actual_location as any)?.[turnId] || 
                            (s.staff_actual_location as any)?.[`T${turnId}`];
                if (loc?.checked_in && loc?.markedAt) {
                    allTimestamps.push(new Date(loc.markedAt).getTime());
                }
            });
        });

        if (allTimestamps.length === 0) return null;
        allTimestamps.sort((a, b) => a - b);

        // 2. Filtro per Range Temporale (Finestra Temporale)
        const now = lastTick.getTime();
        const filteredTimestamps = timeWindow === 'ALL'
            ? allTimestamps
            : allTimestamps.filter(ts => {
                const windowMs = (timeWindow === '30M' ? 30 : timeWindow === '1H' ? 60 : 120) * 60 * 1000;
                return ts >= now - windowMs;
            });

        if (filteredTimestamps.length === 0 && timeWindow !== 'ALL') return [];

        // 3. Definizione dei limiti del grafico
        const minTime = timeWindow === 'ALL'
            ? allTimestamps[0]
            : now - (timeWindow === '30M' ? 30 : timeWindow === '1H' ? 60 : 120) * 60 * 1000;
        const maxTime = Math.max(now, allTimestamps[allTimestamps.length - 1]);
        const intervalMs = intervalMinutes * 60 * 1000;

        // 4. Raggruppamento in bucket (Granularità)
        const buckets: { label: string; count: number; cumulative: number; timeRange: string }[] = [];
        let cumulative = allTimestamps.filter(ts => ts < minTime).length;

        for (let t = minTime; t <= maxTime; t += intervalMs) {
            const count = allTimestamps.filter(ts => ts >= t && ts < t + intervalMs).length;
            cumulative += count;
            const startTime = new Date(t);
            const endTime = new Date(t + intervalMs);

            buckets.push({
                label: startTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
                timeRange: `${startTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} - ${endTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
                count,
                cumulative,
            });
        }

        return buckets;
    }, [students, currentTurn, intervalMinutes, timeWindow, lastTick]);

    if (!timelineData || (timelineData.length === 0 && timeWindow === 'ALL')) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="bg-surface border border-white/10 rounded-[2.5rem] p-12 text-center shadow-2xl max-w-md">
                    <Clock className="w-14 h-14 text-white/10 mx-auto mb-6" />
                    <h2 className="text-xl font-black uppercase mb-2">Nessun Dato</h2>
                    <p className="text-white/30 text-sm">Non ci sono check-in nel periodo selezionato.</p>
                    <button onClick={onClose} className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Chiudi</button>
                </div>
            </div>
        );
    }

    const chartData = {
        labels: timelineData.map(b => b.label),
        datasets: [
            {
                label: "Totale Studenti (Giallo)",
                data: timelineData.map(b => b.cumulative),
                borderColor: "#E2F33C",
                backgroundColor: "rgba(226, 243, 60, 0.05)",
                fill: true,
                tension: 0.4,
                pointRadius: intervalMinutes < 5 ? 0 : 3,
                borderWidth: 3,
            },
            {
                label: "Nuovi Arrivi (Blu)",
                data: timelineData.map(b => b.count),
                borderColor: "rgba(59, 130, 246, 0.8)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: intervalMinutes < 5 ? 0 : 2,
                borderDash: [5, 5],
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: "rgba(255,255,255,0.03)" },
                ticks: {
                    color: "rgba(255,255,255,0.3)",
                    font: { size: 10 },
                    precision: 0
                },
            },
            x: {
                grid: { display: false },
                ticks: {
                    color: "rgba(255,255,255,0.3)",
                    font: { size: 9 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12
                },
            },
        },
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                align: 'end' as const,
                labels: { color: "rgba(255,255,255,0.5)", font: { size: 10 }, usePointStyle: true, boxWidth: 6 },
            },
            tooltip: {
                backgroundColor: "#1a1a1a",
                titleColor: "#fff",
                bodyColor: "#ccc",
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                padding: 12,
                intersect: false,
                mode: 'index' as const,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) label += context.parsed.y;

                        if (context.datasetIndex === 1) { // Nuovi Arrivi
                            label += " entrati in questo slot";
                        } else {
                            label += " studenti totali presenti";
                        }
                        return label;
                    }
                }
            },
        },
    };

    const peakInterval = timelineData.reduce((max, b) => b.count > max.count ? b : max, timelineData[0] || { count: 0 });
    const totalCheckins = timelineData.length > 0 ? timelineData[timelineData.length - 1].cumulative : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl"><Clock className="w-6 h-6 text-primary" /></div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black uppercase tracking-widest italic">Timeline Check-in</h2>
                                <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-1.5 animate-pulse">
                                    <div className="w-1 h-1 bg-green-500 rounded-full" />
                                    <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">Live</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                                <span>{currentTurn === 'ALL' ? 'Tutti i turni' : `Turno ${currentTurn}`}</span>
                                <button
                                    onClick={() => setShowInfo(!showInfo)}
                                    className="ml-2 px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded-full text-[8px] text-white/40 hover:text-white transition-all flex items-center gap-1 border border-white/5"
                                >
                                    <HelpCircle className="w-2.5 h-2.5" /> {showInfo ? 'Nascondi Guida' : 'Guida Grafico'}
                                </button>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Finestra Temporale (Range) */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Finestra Temporale</span>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                {[
                                    { id: 'ALL', label: 'Tutto' },
                                    { id: '2H', label: '2h' },
                                    { id: '1H', label: '1h' },
                                    { id: '30M', label: '30m' }
                                ].map(w => (
                                    <button
                                        key={w.id}
                                        onClick={() => setTimeWindow(w.id as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${timeWindow === w.id ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                                    >
                                        {w.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Granularità (Precisione) */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Granularità (Precisione)</span>
                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                                {[1, 5, 10, 30].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setIntervalMinutes(m)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${intervalMinutes === m ? 'bg-primary text-black' : 'text-white/20 hover:text-white/40'}`}
                                    >
                                        {m}m
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white mt-4 md:mt-0">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Info Section */}
                    {showInfo && (
                        <div className="px-8 pt-8 animate-in slide-in-from-top-4 duration-500">
                            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col md:flex-row gap-8">
                                <div className="flex-1">
                                    <h4 className="text-primary text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        Totale Studenti (Giallo)
                                    </h4>
                                    <p className="text-white/40 text-[11px] leading-relaxed">
                                        Indica quanti studenti sono entrati <b>dall'inizio dell'assemblea ad ora</b>. La linea sale man mano che il Personale di Gestione fa i check-in e ti dà il numero complessivo delle presenze.
                                    </p>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                                        Nuovi Arrivi (Blu)
                                    </h4>
                                    <p className="text-white/40 text-[11px] leading-relaxed">
                                        Ti dice quanti studenti sono entrati <b>esclusivamente</b> in quel particolare intervallo (es: "negli ultimi 5 minuti"). Ti fa capire quando c'è stato più affollamento all'ingresso.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-8">
                        <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Totale Analizzato</div>
                            <div className="text-4xl font-black text-white">{totalCheckins}</div>
                        </div>
                        <div className="bg-black/20 p-6 rounded-3xl border border-white/5 md:col-span-2 flex items-center justify-between">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1 italic">Picco di Rilevazione</div>
                                <div className="text-4xl font-black text-blue-400">{peakInterval.count} <span className="text-sm font-medium text-white/20">Check-in</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-white/40 uppercase">Intervallo di Picco</div>
                                <div className="text-lg font-bold">dalle {peakInterval.timeRange || peakInterval.label}</div>
                            </div>
                        </div>
                        <div className="bg-black/20 p-6 rounded-3xl border border-white/5 text-center flex flex-col justify-center">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Ultimo Aggiornamento</div>
                            <div className="text-xs font-bold text-white/60">{lastTick.toLocaleTimeString()}</div>
                            <div className="text-[7px] text-white/20 mt-1 uppercase font-bold tracking-widest">Sincronizzazione Real-time</div>
                        </div>
                    </div>

                    <div className="px-8 pb-8">
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 h-[400px]">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
