import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import type { Activity } from '../../../../types';

interface NextUpActivity {
    status: 'URGENT' | 'IN_PROGRESS' | 'UPCOMING';
    minsLeft?: number;
    activity: Activity | null;
    turnId: string;
}

interface NextUpWidgetProps {
    nextActivity: NextUpActivity;
    formatTurn: (t: string) => string;
}

const NextUpWidget: React.FC<NextUpWidgetProps> = ({ nextActivity, formatTurn }) => {
    const statusConfig = {
        URGENT: {
            container: 'bg-red-950/10 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.05)] hover:border-red-500/40',
            glow: 'bg-red-500/5',
            label: 'text-red-400 font-semibold tracking-wider flex items-center gap-2 text-xs',
            badge: 'border-red-500/20 text-red-200 bg-red-950/20',
            iconColor: 'text-red-400'
        },
        IN_PROGRESS: {
            container: 'bg-emerald-950/10 border-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:border-emerald-500/30',
            glow: 'bg-emerald-500/5',
            label: 'text-emerald-400 font-semibold tracking-wider flex items-center gap-2 text-xs',
            badge: 'border-emerald-500/20 text-emerald-200 bg-emerald-950/20',
            iconColor: 'text-emerald-400'
        },
        UPCOMING: {
            container: 'bg-white/[0.02] border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.2)] hover:border-brand-lime/20',
            glow: 'bg-brand-lime/5',
            label: 'text-brand-lime font-semibold tracking-wider flex items-center gap-2 text-xs',
            badge: 'border-white/5 text-white/80 bg-black/20',
            iconColor: 'text-brand-lime'
        }
    };

    const cfg = statusConfig[nextActivity.status] || statusConfig.UPCOMING;

    return (
        <motion.div 
            whileHover={{ scale: 1.005 }}
            className={`relative p-6 md:p-8 border rounded-3xl md:rounded-[2.5rem] overflow-hidden group transition-all duration-500 backdrop-blur-xl ${cfg.container}`}
        >
            {/* Soft Radial Glow */}
            <div className="absolute top-0 right-0 p-5 md:p-8 pointer-events-none">
                <div className={`w-36 h-36 rounded-full blur-3xl transition-all duration-700 ${cfg.glow} group-hover:scale-110`} />
            </div>

            <div className="relative z-10 space-y-5">
                {/* Status Indicator Bar */}
                <div className="flex items-center justify-between">
                    <p className={cfg.label}>
                        {nextActivity.status === 'URGENT' && <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />}
                        {nextActivity.status === 'IN_PROGRESS' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                        {nextActivity.status === 'IN_PROGRESS' ? 'Attività corrente' : 'Prossimo turno'}
                    </p>
                    {nextActivity.status === 'URGENT' && (
                        <span className="text-[10px] font-semibold text-red-400/90 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                            Inizia subito!
                        </span>
                    )}
                </div>

                {/* Activity Title */}
                <h3 className="text-2xl md:text-3xl font-bold font-display text-white italic leading-tight tracking-tight group-hover:text-brand-lime transition-colors duration-300">
                    {nextActivity.activity ? nextActivity.activity.name : 'Nessuna attività prenotata'}
                </h3>

                {/* Quick Info Badges */}
                <div className="flex flex-wrap gap-2.5">
                    {nextActivity.activity && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-xs tracking-wide transition-all ${cfg.badge}`}>
                            <MapPin className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                            <span>
                                {nextActivity.activity.room_name || nextActivity.activity.location_name}
                                {(nextActivity.activity.location_floor || nextActivity.activity.location_number) && ` (${[
                                    nextActivity.activity.location_floor && `Piano ${nextActivity.activity.location_floor}`,
                                    nextActivity.activity.location_number && `Aula ${nextActivity.activity.location_number}`
                                ].filter(Boolean).join(' • ')})`}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/2 border border-white/5 rounded-xl font-semibold text-xs tracking-wide text-white/50">
                        <Clock className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                        <span>{formatTurn(nextActivity.turnId)}</span>
                    </div>
                </div>

                {/* Contextual Action Notification Banner */}
                {!nextActivity.activity ? (
                    <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-pulse">
                        <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-red-200 leading-normal">
                            Non hai prenotato questo turno! Scegli un laboratorio per assicurarti il posto.
                        </p>
                    </div>
                ) : nextActivity.status === 'URGENT' ? (
                    <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/15 border border-red-500/25 rounded-2xl">
                        <ExternalLink className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                        <p className="text-xs font-semibold text-red-200 leading-relaxed">
                            Mancano <span className="text-red-400 font-bold underline">{nextActivity.minsLeft} minuti</span>! Recati immediatamente presso l'aula <span className="text-white underline underline-offset-2">
                                {nextActivity.activity.room_name || nextActivity.activity.location_name}
                                {(nextActivity.activity.location_floor || nextActivity.activity.location_number) && ` (${[
                                    nextActivity.activity.location_floor && `Piano ${nextActivity.activity.location_floor}`,
                                    nextActivity.activity.location_number && `Aula ${nextActivity.activity.location_number}`
                                ].filter(Boolean).join(' • ')})`}
                            </span>.
                        </p>
                    </div>
                ) : nextActivity.status === 'IN_PROGRESS' ? (
                    <div className="mt-6 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                        <CheckCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-300">
                            Sei all'interno dell'aula? Check-in rilevato con successo.
                        </span>
                    </div>
                ) : (
                    <p className="mt-6 text-xs font-semibold text-white/20 italic group-hover:text-white/30 transition-colors">
                        Tieniti pronto per lo spostamento.
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export default NextUpWidget;
