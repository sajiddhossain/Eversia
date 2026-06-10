import React from 'react';
import { Shield, Construction, Lock, Power } from "lucide-react";
import type { AppConfig, Assembly } from "../../../types";

interface OverviewTabProps {
    assemblies: Assembly[];
    rooms: any[];
    adminDisplayList: { email: string; isDeveloper: boolean; addedAt?: number }[];
    registeredUsersCount: number;
    totalStudentsCount: number;
    config: AppConfig | null;
    setSecurityModal: (val: any) => void;
    handleToggleMaintenanceMode: (enabled: boolean) => void;
}

const COLOR_CLASSES: Record<string, {
    borderHover: string;
    bgBlur: string;
    bgBlurHover: string;
    dotBg: string;
    textHover: string;
    textVal: string;
}> = {
    'primary': {
        borderHover: 'hover:border-primary/30',
        bgBlur: 'bg-primary/10',
        bgBlurHover: 'group-hover:bg-primary/20',
        dotBg: 'bg-primary',
        textHover: 'group-hover:text-primary',
        textVal: 'text-primary'
    },
    'blue-500': {
        borderHover: 'hover:border-blue-500/30',
        bgBlur: 'bg-blue-500/10',
        bgBlurHover: 'group-hover:bg-blue-500/20',
        dotBg: 'bg-blue-500',
        textHover: 'group-hover:text-blue-500',
        textVal: 'text-blue-500'
    },
    'rose-500': {
        borderHover: 'hover:border-rose-500/30',
        bgBlur: 'bg-rose-500/10',
        bgBlurHover: 'group-hover:bg-rose-500/20',
        dotBg: 'bg-rose-500',
        textHover: 'group-hover:text-rose-500',
        textVal: 'text-rose-500'
    },
    'cyan-500': {
        borderHover: 'hover:border-cyan-500/30',
        bgBlur: 'bg-cyan-500/10',
        bgBlurHover: 'group-hover:bg-cyan-500/20',
        dotBg: 'bg-cyan-500',
        textHover: 'group-hover:text-cyan-500',
        textVal: 'text-cyan-500'
    },
    'violet-500': {
        borderHover: 'hover:border-violet-500/30',
        bgBlur: 'bg-violet-500/10',
        bgBlurHover: 'group-hover:bg-violet-500/20',
        dotBg: 'bg-violet-500',
        textHover: 'group-hover:text-violet-500',
        textVal: 'text-violet-500'
    },
    'amber-500': {
        borderHover: 'hover:border-amber-500/30',
        bgBlur: 'bg-amber-500/10',
        bgBlurHover: 'group-hover:bg-amber-500/20',
        dotBg: 'bg-amber-500',
        textHover: 'group-hover:text-amber-500',
        textVal: 'text-amber-500'
    },
    'emerald-500': {
        borderHover: 'hover:border-emerald-500/30',
        bgBlur: 'bg-emerald-500/10',
        bgBlurHover: 'group-hover:bg-emerald-500/20',
        dotBg: 'bg-emerald-500',
        textHover: 'group-hover:text-emerald-500',
        textVal: 'text-emerald-500'
    },
    'slate-400': {
        borderHover: 'hover:border-slate-400/30',
        bgBlur: 'bg-slate-400/10',
        bgBlurHover: 'group-hover:bg-slate-400/20',
        dotBg: 'bg-slate-400',
        textHover: 'group-hover:text-slate-400',
        textVal: 'text-slate-400'
    }
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
    assemblies, rooms, adminDisplayList, registeredUsersCount, totalStudentsCount,
    config, setSecurityModal, handleToggleMaintenanceMode
}) => {
    const stats = [
        { label: 'Assemblee Attive', value: assemblies.filter(a => a.status === 'ATTIVA').length, color: 'primary' },
        { label: 'Assemblee Create', value: assemblies.length, color: 'blue-500' },
        { label: 'Capienza Complessiva', value: rooms.reduce((acc, r) => acc + (r.max_capacity || 0), 0), color: 'rose-500' },
        {
            label: 'Check-in Effettuati',
            value: rooms.reduce((acc, r) => {
                const counts = Object.values(r.counts_by_turn || {}) as number[];
                return acc + counts.reduce((a, b) => a + b, 0);
            }, 0),
            color: 'cyan-500'
        },
        { label: 'Admin Registrati', value: adminDisplayList.length, color: 'violet-500' },
        { label: 'Staff di Sistema', value: registeredUsersCount, color: 'amber-500' },
        { label: 'Studenti Mappati', value: totalStudentsCount, color: 'emerald-500' },
        { label: 'Aule Monitorate', value: rooms.length, color: 'slate-400' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {stats.map((card, i) => {
                const styles = COLOR_CLASSES[card.color] || COLOR_CLASSES.primary;
                return (
                    <div key={i} className={`bg-white/2 border border-white/5 rounded-[2rem] p-8 relative overflow-hidden group transition-all duration-500 ${styles.borderHover}`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] -translate-y-1/3 translate-x-1/3 transition-all duration-500 ${styles.bgBlur} ${styles.bgBlurHover}`} />
                        <div className="relative z-10">
                            <span className={`text-white/40 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${styles.textHover}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${styles.dotBg}`} />
                                {card.label}
                            </span>
                            <div className={`text-5xl font-black mt-3 drop-shadow-2xl ${styles.textVal}`}>
                                {card.value.toLocaleString('it-IT')}
                            </div>
                        </div>
                    </div>
                );
            })}


            {/* Security PIN Status Card */}
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-[2rem] p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Sicurezza Sistema</span>
                        </div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Security PIN</h3>
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config?.security_pin ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                        {config?.security_pin ? 'Configurato' : 'Non Impostato'}
                    </div>
                </div>
                <p className="text-xs text-white/40 font-medium mt-4 max-w-sm">
                    Il PIN è richiesto per azioni ad alto rischio come l'eliminazione di utenti o modifiche infrastrutturali.
                </p>
                <button
                    onClick={() => {
                        if (!config?.security_pin) {
                            setSecurityModal({
                                isOpen: true,
                                action: "Prima configurazione PIN",
                                onVerified: () => { },
                                forceSettingMode: true
                            });
                        } else {
                            setSecurityModal({
                                isOpen: true,
                                action: "Verifica per cambio PIN",
                                onVerified: () => {
                                    setSecurityModal({
                                        isOpen: true,
                                        action: "Imposta Nuovo PIN",
                                        onVerified: () => { },
                                        forceSettingMode: true
                                    });
                                },
                                forceSettingMode: false
                            });
                        }
                    }}
                    className="mt-6 w-fit px-6 py-2.5 bg-amber-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                >
                    {config?.security_pin ? 'Cambia PIN' : 'Configura Ora'}
                </button>
            </div>

            {/* Maintenance Mode Status Card */}
            <div className={`col-span-1 md:col-span-2 rounded-[2.5rem] p-8 flex flex-col justify-between transition-all duration-500 border ${
                config?.maintenance_mode 
                    ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' 
                    : 'bg-white/5 border-white/10'
            }`}>
                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Construction className={`w-4 h-4 ${config?.maintenance_mode ? 'text-red-500' : 'text-white/40'}`} />
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config?.maintenance_mode ? 'text-red-500' : 'text-white/40'}`}>
                                Stato del Sistema
                            </span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                {config?.maintenance_mode ? 'MODALITÀ LOCKDOWN' : 'SISTEMA ONLINE'}
                                {config?.maintenance_mode && <Lock className="w-5 h-5 text-red-500 animate-pulse" />}
                            </h3>
                            <p className="text-xs text-white/40 font-medium mt-2 max-w-sm leading-relaxed">
                                {config?.maintenance_mode 
                                    ? "Il sito è attualmente chiuso a tutti gli utenti non-admin. Gli studenti visualizzeranno una schermata di blocco."
                                    : "Il sito è accessibile a tutti gli utenti. Attiva il lockdown per manutenzione o emergenze."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-4">
                    <button
                        onClick={() => handleToggleMaintenanceMode(!config?.maintenance_mode)}
                        className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg ${
                            config?.maintenance_mode 
                                ? 'bg-white text-black hover:bg-white/90' 
                                : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                        }`}
                    >
                        <Power className="w-4 h-4" />
                        {config?.maintenance_mode ? 'Ritorna Online' : 'Attiva Manutenzione'}
                    </button>
                    {config?.maintenance_mode && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500">In Corso</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
