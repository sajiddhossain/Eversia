import React from 'react';
import {
    Users, ShieldCheck, AlertTriangle, HelpCircle,
    ArrowRightLeft, UserMinus, Activity as ActivityIcon
} from 'lucide-react';
import type { Assembly, Student, Activity } from '../../types';

interface ReportTemplateProps {
    assembly: Assembly;
    date: string;
    activities: Activity[];
    students: Student[];
    stats: {
        participationRate: number;
        vagabondiCount: number;
        transfersCount: number;
        earlyCheckouts: number;
        compliance: 'OK' | 'ALERT';
    };
    chartImage?: string | null;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({
    assembly,
    date,
    stats,
    chartImage
}) => {
    // Styling constants to avoid Tailwind oklch/oklab interpolation
    const colors = {
        surface: '#050c13',
        primary: '#0082e6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        white10: 'rgba(255, 255, 255, 0.1)',
        white05: 'rgba(255, 255, 255, 0.05)',
        white02: 'rgba(255, 255, 255, 0.02)',
        textDim: 'rgba(255, 255, 255, 0.4)',
        textMuted: 'rgba(255, 255, 255, 0.2)',
    };

    return (
        <div className="report-root" style={{ backgroundColor: colors.surface, color: '#f4f9ff', width: '297mm', fontFamily: 'Inter, sans-serif' }}>

            {/* --- PAGE 1: EXECUTIVE SUMMARY --- */}
            <div className="report-page p-20 relative flex flex-col justify-between" style={{ height: '210mm', width: '297mm', overflow: 'hidden', position: 'relative' }}>
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full" style={{ backgroundColor: 'rgba(0, 130, 230, 0.15)', pointerEvents: 'none' }} />

                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-black uppercase italic tracking-tighter" style={{ color: colors.primary }}>Report Esecutivo</h1>
                        <p className="text-xl font-bold uppercase tracking-[0.2em] mt-2" style={{ color: colors.textDim }}>{assembly.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Data Emissione</p>
                        <p className="text-2xl font-bold">{date}</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-8 relative z-10 my-10">
                    <KPICard
                        label="Tasso Partecipazione"
                        value={`${stats.participationRate}%`}
                        icon={<Users className="w-8 h-8" />}
                        color={colors.primary}
                    />
                    <KPICard
                        label="Efficienza Logistica"
                        value="Elevata"
                        icon={<ActivityIcon className="w-8 h-8" />}
                        color={colors.success}
                    />
                    <KPICard
                        label="Conteggio Vagabondi"
                        value={stats.vagabondiCount.toString()}
                        icon={<HelpCircle className="w-8 h-8" />}
                        color={colors.warning}
                    />
                    <ComplianceBadge status={stats.compliance} colors={colors} />
                </div>

                <div className="relative z-10 p-10 rounded-[3rem]" style={{ backgroundColor: colors.white05, border: `1px solid ${colors.white10}`, backdropFilter: 'blur(20px)' }}>
                    <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: colors.textDim }}>Nota Istituizionale</p>
                    <p className="text-lg leading-relaxed italic text-white/80">
                        "Il presente documento certifica il corretto svolgimento delle attività assembleari, attestando la conformità
                        ai protocolli di sicurezza e la gestione centralizzata delle presenze tramite la piattaforma eversia."
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 font-bold uppercase tracking-[0.5em] text-[10px] mt-10" style={{ color: colors.textMuted }}>
                    <div className="h-px flex-1" style={{ backgroundColor: colors.white10 }} />
                    <span>Liceo Agnesi - eversia</span>
                    <div className="h-px flex-1" style={{ backgroundColor: colors.white10 }} />
                </div>
            </div>

            {/* --- PAGE 2: ANALISI DI FLUSSO --- */}
            <div className="report-page p-20 relative flex flex-col" style={{ height: '210mm', width: '297mm', overflow: 'hidden', position: 'relative' }}>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[150px] rounded-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', pointerEvents: 'none' }} />

                <h2 className="text-3xl font-black uppercase italic tracking-tight mb-12 flex items-center gap-4">
                    <span className="w-12 h-px" style={{ backgroundColor: colors.primary }} />
                    Analisi di Flusso e Rischio
                </h2>

                <div className="grid grid-cols-2 gap-12 flex-1">
                    <div className="rounded-[3rem] p-10 flex flex-col items-center justify-center" style={{ backgroundColor: colors.white05, border: `1px solid ${colors.white10}` }}>
                        <p className="text-xs font-black uppercase tracking-widest mb-6 text-center" style={{ color: colors.textDim }}>Distribuzione Presenze per Turno</p>
                        {chartImage ? (
                            <img src={chartImage} alt="Chart" className="w-full h-auto max-h-[300px] object-contain" />
                        ) : (
                            <div className="text-center italic py-20" style={{ color: colors.textMuted }}>Grafico non disponibile</div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <h3 className="text-xl font-black uppercase tracking-widest italic" style={{ color: colors.primary }}>Intervento Operativo</h3>
                        <div className="space-y-4">
                            <OperationalItem
                                label="Trasferimenti Forzati Authorized"
                                value={stats.transfersCount}
                                icon={<ArrowRightLeft className="w-5 h-5" />}
                                colors={colors}
                            />
                            <OperationalItem
                                label="Check-Out Anticipati Registrati"
                                value={stats.earlyCheckouts}
                                icon={<UserMinus className="w-5 h-5" />}
                                colors={colors}
                            />
                        </div>

                        <div className="mt-12 p-8 rounded-3xl" style={{ backgroundColor: 'rgba(0, 130, 230, 0.05)', border: `1px solid rgba(0, 130, 230, 0.1)` }}>
                            <div className="flex items-center gap-3 mb-4" style={{ color: colors.primary }}>
                                <ShieldCheck className="w-6 h-6" />
                                <span className="text-sm font-black uppercase tracking-widest">Protocollo Sicurezza</span>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">
                                Tutte le operazioni di trasferimento e check-out sono monitorate e validate
                                in tempo reale dal personale di sicurezza tramite autenticazione univoca.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textMuted }}>Pagina 02/Audit</p>
                </div>
            </div>
        </div>
    );
};

const KPICard: React.FC<{ label: string, value: string, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
    <div className="p-8 rounded-[2.5rem] flex flex-col gap-4 relative overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="absolute top-0 right-0 w-24 h-24 blur-[60px] rounded-full opacity-20" style={{ backgroundColor: color }} />
        <div className="p-3 w-fit rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.5)' }}>{icon}</div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{label}</p>
            <p className="text-3xl font-black text-white">{value}</p>
        </div>
    </div>
);

const ComplianceBadge: React.FC<{ status: 'OK' | 'ALERT', colors: any }> = ({ status, colors }) => {
    const isOk = status === 'OK';
    const baseColor = isOk ? colors.success : colors.danger;

    return (
        <div className="p-8 border rounded-[2.5rem] flex flex-col justify-center items-center gap-2" style={{ backgroundColor: `${baseColor}1a`, borderColor: `${baseColor}4d`, color: baseColor }}>
            <div className="mb-2">{isOk ? <ShieldCheck className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}</div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Status Compliance</p>
            <p className="text-2xl font-black tracking-widest uppercase italic">{status}</p>
        </div>
    );
};

const OperationalItem: React.FC<{ label: string, value: number, icon: React.ReactNode, colors: any }> = ({ label, value, icon, colors }) => (
    <div className="flex items-center justify-between p-6 border rounded-2xl transition-all" style={{ backgroundColor: colors.white02, border: `1px solid ${colors.white05}` }}>
        <div className="flex items-center gap-4">
            <div style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{icon}</div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{label}</span>
        </div>
        <span className="text-xl font-black text-white">{value}</span>
    </div>
);
