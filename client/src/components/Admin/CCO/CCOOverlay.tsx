import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, 
    Activity, 
    Cpu, 
    Zap, 
    ArrowLeft, 
    Lock, 
    Unlock, 
    RefreshCw, 
    Trash2, 
    AlertTriangle, 
    Terminal, 
    Power,
    Sliders
} from 'lucide-react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useIntegrityEngine } from '../../../hooks/useIntegrityEngine';
import { SecurityGuard } from '../../Auth/SecurityGuard';
import type { Assembly, AppConfig } from '../../../types';

export const CCOOverlay: React.FC = () => {
    const navigate = useNavigate();
    const { 
        logs, 
        isExecuting, 
        addLog, 
        syncRoomCounts, 
        purgeGhostUsers, 
        forceResetTurn, 
        emergencyEject, 
        toggleRegistrations,
        setThrottle,
        verifyInventory,
        repairAll,
        clearLogs
    } = useIntegrityEngine();

    const [isBooting, setIsBooting] = useState(false);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [activeAssembly, setActiveAssembly] = useState<Assembly | null>(null);
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [securityPin, setSecurityPin] = useState<string | undefined>(undefined);
    const [securityModal, setSecurityModal] = useState<{
        isOpen: boolean;
        actionName: string;
        onVerified: () => void;
    }>({
        isOpen: false,
        actionName: "",
        onVerified: () => {}
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const bootSequenceStarted = useRef(false);

    // Listen to live configuration, secrets, and active assembly
    useEffect(() => {
        const configRef = doc(db, "config", "main");
        const unsubscribeConfig = onSnapshot(configRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as AppConfig;
                setConfig(data);
                
                if (data.activeAssemblyId) {
                    const assemblyRef = doc(db, "assemblies", data.activeAssemblyId);
                    getDoc(assemblyRef).then((assemSnap) => {
                        if (assemSnap.exists()) {
                            setActiveAssembly({ id: assemSnap.id, ...assemSnap.data() } as Assembly);
                        }
                    });
                }
            }
        });

        const secretsRef = doc(db, "config_secrets", "main");
        const unsubscribeSecrets = onSnapshot(secretsRef, (snapshot) => {
            if (snapshot.exists()) {
                setSecurityPin(snapshot.data().security_pin);
            }
        });
        
        return () => {
            unsubscribeConfig();
            unsubscribeSecrets();
        };
    }, []);

    // Get theme color
    const themeColor = activeAssembly?.themeColor || '#0082e6';

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Boot Sequence
    useEffect(() => {
        if (!bootSequenceStarted.current) {
            bootSequenceStarted.current = true;
            setIsBooting(true);
            clearLogs();
            
            const bootLogs = [
                { m: "INITIALIZING EVERSIA KERNEL v2.5.0...", t: "INFO" },
                { m: "MOUNTING FIREBASE VOLUMES...", t: "INFO" },
                { m: "ESTABLISHING ENCRYPTED LINK...", t: "SUCCESS" },
                { m: "SYSTEM INTEGRITY VERIFICATION ONLINE...", t: "WARN" },
                { m: "CCO ENGINE READY. AUTH_LEVEL: DEV_FULL", t: "SUCCESS" },
                { m: "Digitare 'help' per vedere l'elenco dei comandi d'emergenza.", t: "INFO" }
            ];

            let delay = 0;
            bootLogs.forEach((log, i) => {
                setTimeout(() => {
                    addLog(log.m, log.t as any);
                    if (i === bootLogs.length - 1) {
                        setIsBooting(false);
                        setTimeout(() => inputRef.current?.focus(), 100);
                    }
                }, delay);
                delay += 200 + Math.random() * 400;
            });
        }
    }, []);

    // Focus input after boot
    useEffect(() => {
        if (!isBooting) {
            inputRef.current?.focus();
        }
    }, [isBooting]);

    const handleSetSecurityPin = async (newPin: string) => {
        try {
            await setDoc(doc(db, "config_secrets", "main"), { security_pin: newPin }, { merge: true });
        } catch (error) {
            console.error("Errore salvataggio PIN:", error);
            addLog("Impossibile salvare il PIN di sicurezza.", "ERROR");
        }
    };

    const executeCommandString = async (cmdStr: string) => {
        const cmd = cmdStr.trim();
        if (!cmd) return;

        addLog(`> ${cmd}`, 'INFO');

        const parts = cmd.split(' ');
        const base = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (base) {
            case 'help':
                addLog('Comandi di Emergenza Disponibili:', 'INFO');
                addLog('  sync-room-counts [--force]    Ricalcola i posti occupati in tutte le aule/attività', 'INFO');
                addLog('  purge-ghost-users [id]        Rimuove iscritti che non hanno alcuna prenotazione o presenza', 'INFO');
                addLog('  force-reset-turn [turno_id] [assemb_id]  Resetta prenotazioni e presenze per uno specifico turno', 'INFO');
                addLog('  emergency-eject [room_id] [assemb_id]   Rimuove digitalmente tutti gli studenti da un\'aula', 'INFO');
                addLog('  lock-registrations [on|off]   Blocca o sblocca globalmente le iscrizioni di nuovi studenti', 'INFO');
                addLog('  set-throttle [ms]             Aggiunge un ritardo simulato per scaglionare le registrazioni', 'INFO');
                addLog('  verify-inventory [assemb_id]  Verifica se la capienza aule copre il numero di studenti totali', 'INFO');
                addLog('  repair-all [assemb_id]        Esegue sync + purge + verify in sequenza automatica', 'INFO');
                addLog('  clear                         Pulisce lo schermo del monitor diagnostico', 'INFO');
                addLog('  exit                          Chiude il kernel CCO e torna alla dashboard', 'INFO');
                break;

            case 'sync-room-counts':
                await syncRoomCounts(args.includes('--force'));
                break;

            case 'purge-ghost-users':
                if (!args[0]) addLog('Errore: ID Assemblea obbligatorio', 'ERROR');
                else await purgeGhostUsers(args[0]);
                break;

            case 'force-reset-turn':
                if (!args[0] || !args[1]) addLog('Errore: ID Turno e ID Assemblea richiesti (es. force-reset-turn T1 abc123)', 'ERROR');
                else await forceResetTurn(args[0].toUpperCase(), args[1]);
                break;

            case 'emergency-eject':
                if (!args[0] || !args[1]) addLog('Errore: ID Aula e ID Assemblea richiesti (es. emergency-eject roomXyz abc123)', 'ERROR');
                else await emergencyEject(args[0], args[1]);
                break;

            case 'lock-registrations':
                if (args[0] === 'on') await toggleRegistrations(false);
                else if (args[0] === 'off') await toggleRegistrations(true);
                else addLog('Uso corretto: lock-registrations [on|off]', 'WARN');
                break;

            case 'set-throttle':
                if (!args[0]) addLog('Uso corretto: set-throttle [ms]', 'WARN');
                else await setThrottle(parseInt(args[0]));
                break;

            case 'verify-inventory':
                if (!args[0]) addLog('Errore: ID Assemblea obbligatorio', 'ERROR');
                else await verifyInventory(args[0]);
                break;
            
            case 'repair-all':
                if (!args[0]) addLog('Errore: ID Assemblea obbligatorio', 'ERROR');
                else await repairAll(args[0]);
                break;

            case 'clear':
                clearLogs();
                break;

            case 'exit':
                navigate('/admin');
                break;

            default:
                addLog(`Comando sconosciuto: '${base}'. Digitare 'help' per assistenza.`, 'ERROR');
        }
    };

    const executeCommandWithSecurity = (cmdStr: string) => {
        const cmd = cmdStr.trim();
        if (!cmd) return;

        const parts = cmd.split(' ');
        const base = parts[0].toLowerCase();

        // Non-dangerous commands do not require PIN
        if (['help', 'clear', 'exit'].includes(base)) {
            executeCommandString(cmd);
            return;
        }

        // Dangerous commands prompt for PIN
        setSecurityModal({
            isOpen: true,
            actionName: `Esegui comando: ${cmd}`,
            onVerified: () => {
                executeCommandString(cmd);
            }
        });
    };

    const handleCommand = async (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = input.trim();
        if (!cmd) return;

        // Add to history
        setHistory(prev => {
            if (prev[prev.length - 1] === cmd) return prev;
            return [...prev, cmd];
        });
        setHistoryIndex(-1);

        setInput('');
        executeCommandWithSecurity(cmd);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length === 0) return;
            const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(newIndex);
            setInput(history[newIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (history.length === 0) return;
            if (historyIndex === -1) return;
            if (historyIndex === history.length - 1) {
                setHistoryIndex(-1);
                setInput('');
            } else {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(history[newIndex]);
            }
        }
    };

    const handleTemplateClick = (template: string) => {
        setInput(template);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    // Quick Actions
    const quickActions = [
        {
            name: 'Sync Presenze',
            desc: 'Aggiorna i contatori aule',
            icon: RefreshCw,
            color: 'text-blue-400 border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/15 hover:border-blue-500/30',
            action: () => executeCommandWithSecurity('sync-room-counts')
        },
        {
            name: 'Pulisci Fantasmi',
            desc: 'Elimina utenti orfani',
            icon: Trash2,
            color: 'text-amber-400 border-amber-500/10 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/30',
            disabled: !activeAssembly,
            action: () => activeAssembly && executeCommandWithSecurity(`purge-ghost-users ${activeAssembly.id}`)
        },
        {
            name: 'Resetta Turno',
            desc: 'Resetta iscritti del turno',
            icon: Power,
            color: 'text-rose-400 border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/30',
            disabled: !activeAssembly,
            action: () => {
                if (!activeAssembly) return;
                const turn = prompt("Inserisci l'ID del turno da resettare (es. T1, T2):");
                if (turn) executeCommandWithSecurity(`force-reset-turn ${turn} ${activeAssembly.id}`);
            }
        },
        {
            name: 'Sgombra Aula',
            desc: 'Evacua un\'aula digitalmente',
            icon: AlertTriangle,
            color: 'text-orange-400 border-orange-500/10 bg-orange-500/5 hover:bg-orange-500/15 hover:border-orange-500/30',
            disabled: !activeAssembly,
            action: () => {
                if (!activeAssembly) return;
                const room = prompt("Inserisci l'ID dell'aula da evacuare:");
                if (room) executeCommandWithSecurity(`emergency-eject ${room} ${activeAssembly.id}`);
            }
        },
        {
            name: 'Audit Capienza',
            desc: 'Analizza capienza vs studenti',
            icon: ShieldCheck,
            color: 'text-purple-400 border-purple-500/10 bg-purple-500/5 hover:bg-purple-500/15 hover:border-purple-500/30',
            disabled: !activeAssembly,
            action: () => activeAssembly && executeCommandWithSecurity(`verify-inventory ${activeAssembly.id}`)
        },
        {
            name: 'Riparazione Deep',
            desc: 'Risolvi anomalie di sistema',
            icon: Zap,
            color: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/30',
            disabled: !activeAssembly,
            action: () => activeAssembly && executeCommandWithSecurity(`repair-all ${activeAssembly.id}`)
        },
        {
            name: config?.lock_registrations ? 'Sblocca Iscrizioni' : 'Blocca Iscrizioni',
            desc: config?.lock_registrations ? 'Riapri iscrizioni a nuovi studenti' : 'Sospendi iscrizioni a nuovi studenti',
            icon: config?.lock_registrations ? Unlock : Lock,
            color: config?.lock_registrations 
                ? 'text-green-400 border-green-500/10 bg-green-500/5 hover:bg-green-500/15 hover:border-green-500/30'
                : 'text-red-400 border-red-500/10 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/30',
            action: () => {
                const nextState = !!config?.lock_registrations;
                setSecurityModal({
                    isOpen: true,
                    actionName: nextState ? "Sblocca Iscrizioni di Sistema" : "Blocca Iscrizioni di Sistema",
                    onVerified: () => {
                        toggleRegistrations(nextState);
                    }
                });
            }
        },
        {
            name: 'Imposta Throttle',
            desc: 'Limita traffico di iscrizione',
            icon: Sliders,
            color: 'text-cyan-400 border-cyan-500/10 bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-500/30',
            action: () => {
                const ms = prompt("Inserisci il ritardo di throttle in millisecondi (es. 0, 500, 1000):", config?.registration_throttle_ms?.toString() || "0");
                if (ms !== null) executeCommandWithSecurity(`set-throttle ${ms}`);
            }
        }
    ];

    // Badge suggestion list templates
    const commandTemplates = [
        'help',
        'sync-room-counts',
        activeAssembly ? `purge-ghost-users ${activeAssembly.id}` : 'purge-ghost-users [assemb_id]',
        activeAssembly ? `force-reset-turn T1 ${activeAssembly.id}` : 'force-reset-turn [turn_id] [assemb_id]',
        activeAssembly ? `emergency-eject [room_id] ${activeAssembly.id}` : 'emergency-eject [room_id] [assemb_id]',
        'lock-registrations on',
        'lock-registrations off',
        'set-throttle 1000',
        activeAssembly ? `verify-inventory ${activeAssembly.id}` : 'verify-inventory [assemb_id]',
        activeAssembly ? `repair-all ${activeAssembly.id}` : 'repair-all [assemb_id]',
        'clear'
    ];

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col font-sans bg-[#030303] text-white/90 overflow-hidden">
            {/* Background Gradients & Glows */}
            <div className="absolute inset-0 pointer-events-none opacity-60 transition-all duration-1000"
                style={{ background: `radial-gradient(circle at 50% 30%, ${themeColor}09 0%, transparent 65%)` }} />
            
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[160px] pointer-events-none opacity-[0.06] transition-all duration-1000"
                style={{ backgroundColor: themeColor }} />

            <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />
            
            <div className="absolute inset-0 cco-scanline opacity-10 pointer-events-none z-50" />
            
            {/* Header */}
            <header className="relative px-8 py-5 border-b border-white/5 flex items-center justify-between bg-[#09090b]/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/admin')}
                        className="p-2.5 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-2xl transition-all text-white/40 hover:text-white btn-press cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-1000"
                            style={{ borderColor: `${themeColor}30`, backgroundColor: `${themeColor}0a`, boxShadow: `0 0 15px ${themeColor}15` }}>
                            <Cpu className="w-5 h-5 animate-pulse" style={{ color: themeColor }} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black uppercase tracking-tight italic select-none"
                                style={{ textShadow: `0 0 20px ${themeColor}40, 0 0 2px ${themeColor}`, color: themeColor }}>
                                CCO Emergency Control Center
                            </h1>
                            <div className="flex items-center gap-2 text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full shadow-lg" 
                                    style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}` }} />
                                eversia Kernel v2.5.0 • Live Diagnostics
                            </div>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-white/5 mx-1" />

                    {activeAssembly && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm select-none">
                            <span className="text-[9px] text-white/30 font-black uppercase tracking-wider">Active:</span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: themeColor }}>
                                {activeAssembly.name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-[9px] font-black uppercase tracking-wider text-white/30 bg-white/[0.02] px-3.5 py-2 rounded-xl border border-white/5">
                        SECURE_LINK: <span className="text-emerald-400 font-extrabold">ESTABLISHED</span>
                    </div>
                </div>
            </header>

            {/* Main Interface Content */}
            <main className="relative flex-1 flex flex-col p-8 overflow-hidden z-10 gap-6">
                
                {/* Live System Diagnostics Stats */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 select-none">
                    {[
                        { 
                            label: 'Iscrizioni Studenti', 
                            value: config ? (config.lock_registrations ? 'BLOCCATE' : 'ATTIVE') : 'IN RILEVAMENTO...', 
                            icon: config?.lock_registrations ? Lock : Unlock, 
                            color: config ? (config.lock_registrations ? 'text-rose-400 bg-rose-500/5 border-rose-500/10' : 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10') : 'text-zinc-500 border-white/5 bg-white/[0.01]' 
                        },
                        { 
                            label: 'Throttle Registrazione', 
                            value: config?.registration_throttle_ms !== undefined ? `${config.registration_throttle_ms}ms` : 'N/D', 
                            icon: Sliders, 
                            color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' 
                        },
                        { 
                            label: 'Modalità Manutenzione', 
                            value: config ? (config.maintenance_mode ? 'ATTIVA' : 'DISATTIVATA') : 'IN RILEVAMENTO...', 
                            icon: Activity, 
                            color: config ? (config.maintenance_mode ? 'text-red-400 bg-red-500/5 border-red-500/10' : 'text-blue-400 bg-blue-500/5 border-blue-500/10') : 'text-zinc-500 border-white/5 bg-white/[0.01]' 
                        },
                        { 
                            label: 'Stato Kernel', 
                            value: isExecuting ? 'IN ESECUZIONE' : 'STANDBY PRONTO', 
                            icon: Cpu, 
                            color: isExecuting ? 'text-purple-400 bg-purple-500/5 border-purple-500/10 animate-pulse' : 'text-zinc-400 bg-white/[0.02] border-white/5' 
                        },
                    ].map((stat, i) => (
                        <div key={i} className={`border rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md transition-all ${stat.color}`}>
                            <stat.icon className="w-5 h-5 shrink-0" />
                            <div>
                                <div className="text-[8px] font-black uppercase text-white/20 tracking-wider mb-0.5">{stat.label}</div>
                                <div className="text-xs font-extrabold uppercase tracking-wide">{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Quick Actions Panel */}
                <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-3 px-1">
                        Pannello di Controllo Rapido
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {quickActions.map((action, i) => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={i}
                                    onClick={action.action}
                                    disabled={action.disabled || isExecuting}
                                    className={`w-full text-left p-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 group cursor-pointer transition-all duration-200 btn-press disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none ${action.color}`}
                                >
                                    <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 group-hover:scale-105 transition-transform">
                                        <Icon className="w-4 h-4 shrink-0" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-xs font-extrabold tracking-wide uppercase text-white/80 group-hover:text-white transition-colors">
                                            {action.name}
                                        </div>
                                        <div className="text-[9px] text-white/30 truncate mt-0.5 group-hover:text-white/45 transition-colors">
                                            {action.desc}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Diagnostic Monitor Console */}
                <section className="flex-1 min-h-0 bg-[#09090b]/80 border border-white/5 rounded-3xl p-6 flex flex-col overflow-hidden backdrop-blur-md relative"
                    style={{ boxShadow: `inset 0 0 40px rgba(0,0,0,0.9), 0 0 30px ${themeColor}05`, borderColor: `${themeColor}12` }}>
                    
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 select-none">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 animate-pulse" style={{ color: themeColor }} />
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40">Monitor Diagnostico Kernel</span>
                        </div>
                        {isExecuting && (
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Esecuzione in corso...</span>
                            </div>
                        )}
                    </div>

                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-4 text-[11px] font-mono leading-relaxed"
                    >
                        {logs.length === 0 && (
                            <div className="text-white/10 text-center py-24 italic select-none">
                                Monitor diagnostico pronto. In attesa di comandi di emergenza.
                            </div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-4 group animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="text-white/20 select-none tabular-nums">[{log.timestamp}]</span>
                                <span className={`font-bold w-12 shrink-0 ${
                                    log.type === 'ERROR' ? 'text-red-500' :
                                    log.type === 'WARN' ? 'text-amber-500' :
                                    log.type === 'SUCCESS' ? 'text-emerald-400' : 'text-blue-400'
                                }`}>
                                    {log.type}
                                </span>
                                <span className="text-white/60 group-hover:text-white transition-colors break-all">
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Input Field Form Console */}
                {!isBooting && (
                    <section>
                        <form onSubmit={handleCommand} className="relative transition-all duration-300 rounded-2xl border"
                            style={{ 
                                boxShadow: isFocused ? `0 0 25px ${themeColor}12` : 'none', 
                                borderColor: isFocused ? `${themeColor}40` : 'rgba(255, 255, 255, 0.05)',
                                backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)'
                            }}>
                            <div className="absolute inset-y-0 left-6 flex items-center text-[11px] font-mono select-none pointer-events-none">
                                <span className="font-extrabold text-white/35">eversia_root</span>
                                <span className="text-blue-400/50 mx-1.5">~</span>
                                <span className="animate-pulse" style={{ color: themeColor }}>$</span>
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Digita un comando o clicca sulle pillole sottostanti..."
                                className="w-full bg-transparent py-5 pl-32 pr-28 outline-none text-[11px] font-mono text-white placeholder:text-white/10 transition-all"
                            />
                            <div className="absolute right-6 inset-y-0 flex items-center gap-4 select-none pointer-events-none">
                                <div className="text-[8px] font-black uppercase text-white/20 tracking-wider flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                                    <kbd className="text-white/40">ENTER</kbd>
                                    <span>EXEC</span>
                                </div>
                            </div>
                        </form>

                        {/* Clickable Quick Command Pills */}
                        <div className="flex flex-wrap gap-2 mt-3.5 px-1 select-none">
                            <span className="text-[8px] font-black uppercase tracking-wider text-white/20 flex items-center gap-1 mr-1.5">
                                <Terminal className="w-3.5 h-3.5" />
                                Suggerimenti:
                            </span>
                            {commandTemplates.map((template, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleTemplateClick(template)}
                                    className="px-2.5 py-1 rounded-lg text-[9px] font-mono text-white/45 bg-white/[0.01] border border-white/5 hover:text-white hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer btn-press"
                                >
                                    {template.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Security Verification Modal */}
            <SecurityGuard
                isOpen={securityModal.isOpen}
                onClose={() => setSecurityModal(prev => ({ ...prev, isOpen: false }))}
                onVerified={securityModal.onVerified}
                currentPin={securityPin}
                onSetPin={handleSetSecurityPin}
                actionName={securityModal.actionName}
            />
        </div>
    );
};



