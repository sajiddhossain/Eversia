import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import type { UserProfile } from '../../types';
import { 
    User, 
    ArrowLeft, 
    Save, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    Type, 
    Sparkles, 
    Users, 
    Palette,
    LogOut,
    RefreshCw,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { COVER_PRESETS } from '../../utils/gamification';

export const SettingsView: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile, logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(userProfile);
    
    // Form States
    const [bio, setBio] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newDisplayName, setNewDisplayName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [coverColor, setCoverColor] = useState('midnight');
    const [className, setClassName] = useState('');
    
    // Status States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setProfile(userProfile);
            setBio(userProfile.bio || '');
            setNewUsername(userProfile.username || '');
            setNewDisplayName(userProfile.displayName || '');
            setBirthday(userProfile.birthday ? new Date(userProfile.birthday).toISOString().split('T')[0] : '');
            setCoverColor(userProfile.coverColor || 'midnight');
            setClassName(userProfile.className || '');
        }
    }, [userProfile]);

    const isDirty = (
        bio !== (userProfile?.bio || '') ||
        newUsername !== (userProfile?.username || '') ||
        newDisplayName !== (userProfile?.displayName || '') ||
        birthday !== (userProfile?.birthday ? new Date(userProfile?.birthday).toISOString().split('T')[0] : '') ||
        coverColor !== (userProfile?.coverColor || 'midnight')
    );

    // Prompt before closing tab
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    if (!profile) return null;

    const canChangeUsername = profile.isFirstUsernameChange ||
        (profile.canChangeUsernameAt ? Date.now() > profile.canChangeUsernameAt : true);

    const timeDiff = profile.canChangeUsernameAt ? profile.canChangeUsernameAt - Date.now() : 0;
    const daysUntilChange = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
    const hoursUntilChange = Math.max(0, Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

    const canChangeDisplayName = profile.isFirstDisplayNameChange !== false ||
        (profile.canChangeDisplayNameAt ? Date.now() > profile.canChangeDisplayNameAt : true);

    const nameTimeDiff = profile.canChangeDisplayNameAt ? profile.canChangeDisplayNameAt - Date.now() : 0;
    const nameDaysUntil = Math.max(0, Math.floor(nameTimeDiff / (1000 * 60 * 60 * 24)));
    const nameHoursUntil = Math.max(0, Math.floor((nameTimeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

    const handleBack = () => {
        if (isDirty) {
            if (confirm("Hai delle modifiche non salvate. Sei sicuro di voler uscire?")) {
                navigate(-1);
            }
        } else {
            navigate(-1);
        }
    };

    const handleReset = () => {
        if (userProfile) {
            setBio(userProfile.bio || '');
            setNewUsername(userProfile.username || '');
            setNewDisplayName(userProfile.displayName || '');
            setBirthday(userProfile.birthday ? new Date(userProfile.birthday).toISOString().split('T')[0] : '');
            setCoverColor(userProfile.coverColor || 'midnight');
            setClassName(userProfile.className || '');
        }
    };

    const handleSaveIdentity = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // Security: Use the UID directly from useAuth (authenticated), not the state
            if (!userProfile?.uid) throw new Error("Utente non autenticato.");
            const userRef = doc(db, 'users', userProfile.uid);
            
            // Security: Whitelist - Only these fields can be updated by the student
            const updates: Record<string, any> = {
                bio: bio.slice(0, 160),
                coverColor,
            };

            // Display Name change logic
            if (newDisplayName !== profile.displayName) {
                if (!canChangeDisplayName) {
                    throw new Error(`Devi aspettare ${nameDaysUntil} giorni per cambiare nome.`);
                }
                if (newDisplayName.trim().length < 3) {
                    throw new Error("Il nome deve avere almeno 3 caratteri.");
                }
                
                const now = Date.now();
                const nameCooldown = 3 * 24 * 60 * 60 * 1000; // 3 days
                
                updates.displayName = newDisplayName.trim();
                updates.isFirstDisplayNameChange = false;
                updates.displayNameLastChanged = now;
                updates.canChangeDisplayNameAt = now + nameCooldown;
            }

            // Username change logic
            if (newUsername !== profile.username) {
                if (!canChangeUsername) {
                    throw new Error(`Devi aspettare ${daysUntilChange} giorni per cambiare username.`);
                }
                const clean = newUsername.toLowerCase().replace(/[^a-z0-9._]/g, '');
                const formatted = clean.startsWith('@') ? clean : `@${clean}`;

                if (formatted.length < 4) throw new Error("L'username deve avere almeno 4 caratteri.");
                
                await runTransaction(db, async (transaction) => {
                    const usernameRef = doc(db, 'usernames', formatted);
                    const oldUsernameRef = doc(db, 'usernames', profile.username);
                    const usernameSnap = await transaction.get(usernameRef);

                    if (usernameSnap.exists()) throw new Error("Questo username è già stato preso.");

                    const now = Date.now();
                    const cooldown = 7 * 24 * 60 * 60 * 1000;

                    transaction.set(usernameRef, { uid: profile.uid, email: profile.email });
                    transaction.delete(oldUsernameRef);

                    updates.username = formatted;
                    updates.isFirstUsernameChange = false;
                    updates.usernameLastChanged = now;
                    updates.canChangeUsernameAt = now + cooldown;
                });
            }

            await updateDoc(userRef, updates);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || "Errore durante il salvataggio.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (confirm("Sei sicuro di voler uscire?")) {
            await logout();
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen pb-32 animate-in fade-in duration-700 bg-[#050505]">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-12 space-y-8 md:space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 select-none">
                    <div className="space-y-1">
                        <button 
                            onClick={handleBack}
                            className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-semibold font-display tracking-wider transition-all hover:gap-2.5 group mb-2.5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform stroke-[2.5]" /> 
                            Torna al profilo
                        </button>
                        <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white">Impostazioni</h1>
                        <p className="text-xs font-semibold font-display tracking-wide text-white/30">Centro gestione account</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/[0.03] border border-red-500/10 rounded-xl text-red-400 text-xs md:text-sm font-semibold font-display flex items-center gap-3 md:gap-4 animate-in slide-in-from-top-4 select-none">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                        </div>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl text-emerald-400 text-xs md:text-sm font-semibold font-display flex items-center gap-3 md:gap-4 animate-in slide-in-from-top-4 select-none">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        Aggiornamento completato!
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12">
                    {/* Sidebar Style sections */}
                    <div className="lg:col-span-3 space-y-16">
                        <Section icon={User} title="Profilo Visibile">
                            <div className="space-y-8">
                                {/* Bio */}
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold font-display text-white/40 flex items-center gap-2 select-none">
                                        <Type className="w-3.5 h-3.5 text-brand-lime" /> Descrizione biografica
                                        <span className={`text-[10px] font-mono font-medium ml-auto tabular-nums ${bio.length >= 160 ? 'text-red-400 font-bold' : 'text-white/20'}`}>{bio.length}/160</span>
                                    </label>
                                    <div className="relative group">
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value.slice(0, 160))}
                                            placeholder="Racconta chi sei..."
                                            className="w-full bg-white/[0.01] hover:bg-white/[0.02] focus:bg-white/[0.02] border border-white/5 focus:border-brand-lime/30 rounded-xl p-4 pr-14 text-white text-sm leading-relaxed transition-all duration-300 outline-none resize-none h-32 shadow-inner"
                                        />
                                        <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white/30 transition-colors pointer-events-none">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Real Name */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold font-display text-white/40 flex items-center gap-2 select-none">
                                            <User className="w-3.5 h-3.5 text-brand-lime" /> Nome e cognome
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={newDisplayName}
                                                onChange={(e) => setNewDisplayName(e.target.value)}
                                                disabled={!canChangeDisplayName}
                                                placeholder="es. Mario Luigi Rossi"
                                                className={`w-full bg-white/[0.01] border border-white/5 rounded-xl p-3 px-4 text-white text-sm font-semibold font-display transition-all duration-300 outline-none leading-none ${
                                                    !canChangeDisplayName ? 'opacity-30 cursor-not-allowed border-red-500/10' : 'hover:bg-white/[0.02] focus:bg-white/[0.02] focus:border-brand-lime/30'
                                                }`}
                                            />
                                            {canChangeDisplayName ? (
                                                <p className="mt-2 text-[10px] font-medium font-display text-white/30 leading-normal select-none">
                                                    Inserisci il tuo nome completo. Puoi includere più nomi o cognomi separati da spazi.
                                                </p>
                                            ) : (
                                                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold font-display text-red-400 select-none tabular-nums">
                                                    <Lock className="w-3 h-3 stroke-[2.5]" />
                                                    Cambio bloccato per {nameDaysUntil}g {nameHoursUntil}h
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Username */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold font-display text-white/40 flex items-center gap-2 select-none">
                                            <Sparkles className="w-3.5 h-3.5 text-brand-lime" /> Username
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={newUsername}
                                                onChange={(e) => {
                                                    let val = e.target.value.toLowerCase().replace(/[^a-z0-9._@]/g, '');
                                                    if (!val.startsWith('@')) val = '@' + val;
                                                    setNewUsername(val);
                                                }}
                                                disabled={!canChangeUsername}
                                                className={`w-full bg-white/[0.01] border border-white/5 rounded-xl p-3 px-4 text-white text-sm font-semibold font-display transition-all duration-300 outline-none leading-none ${
                                                    !canChangeUsername ? 'opacity-30 cursor-not-allowed border-red-500/10' : 'hover:bg-white/[0.02] focus:bg-white/[0.02] focus:border-brand-lime/30'
                                                }`}
                                            />
                                            {!canChangeUsername && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold font-display text-red-400 select-none tabular-nums">
                                                    <Lock className="w-3 h-3 stroke-[2.5]" />
                                                    Disponibile tra {daysUntilChange}g {hoursUntilChange}h
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Class/School */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold font-display text-white/40 flex items-center gap-2 select-none">
                                            <Users className="w-3.5 h-3.5 text-brand-lime" /> Classe / sezione
                                        </label>
                                        <div className="relative">
                                            <input
                                                readOnly
                                                type="text"
                                                value={className || "NON ASSEGNATA"}
                                                className="w-full bg-white/[0.005] border border-white/5 border-dashed rounded-xl p-3 px-4 text-sm text-white/20 cursor-not-allowed outline-none select-none font-semibold font-display"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <p className="mt-1.5 text-[10px] font-medium font-display text-white/20 leading-normal select-none">
                                            La classe/sezione può essere modificata solo dagli amministratori.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Section>

                        <Section icon={Palette} title="Aspetto & stile">
                            <div className="space-y-4">
                                <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
                                    {COVER_PRESETS.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => setCoverColor(preset.id)}
                                            className={`aspect-square rounded-xl bg-gradient-to-br ${preset.gradient} transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg relative ${
                                                coverColor === preset.id 
                                                    ? 'ring-2 ring-brand-lime ring-offset-[3px] ring-offset-[#0d0d11] scale-[1.03] z-10 opacity-100' 
                                                    : 'opacity-40 hover:opacity-100'
                                            }`}
                                            title={preset.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </Section>
                    </div>

                    {/* Right Side: Account and Privacy */}
                    <div className="lg:col-span-2 space-y-12 lg:sticky lg:top-8 self-start">
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 md:p-6 space-y-6 shadow-xl backdrop-blur-md">
                            <div className="flex items-center gap-3 select-none">
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                                    <LogOut className="w-4.5 h-4.5 text-red-400/50" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-semibold font-display text-white/40">Gestione accesso</h3>
                                    <p className="text-[10px] font-medium font-display text-white/10 mt-0.5">Sicurezza account</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-semibold font-display text-white/20 select-none">Email associata</span>
                                    <span className="text-xs font-bold font-mono text-white/60 truncate select-all">{profile.email}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/10 hover:border-red-500/20 rounded-xl text-xs font-semibold font-display transition-all duration-300 btn-press flex items-center justify-center gap-2 group select-none"
                                >
                                    <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                                    Disconnetti account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Save Bar (Floating Bottom) */}
            <AnimatePresence>
                {isDirty && (
                    <motion.div 
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-6 z-50 select-none"
                    >
                        <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 md:p-5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 md:gap-4">
                            <div className="flex flex-col ml-2 animate-in fade-in duration-300">
                                <span className="text-xs font-semibold font-display text-brand-lime leading-none">Modifiche attive</span>
                                <span className="text-[10px] font-medium font-display text-white/40 hidden xs:block mt-1.5 leading-none">Premi salva per applicare i cambiamenti.</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="px-4 py-3 btn-press rounded-xl text-xs font-semibold font-display text-white/40 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Annulla</span>
                                </button>
                                <button
                                    onClick={handleSaveIdentity}
                                    disabled={loading}
                                    className="px-6 py-3 bg-brand-lime text-black btn-press rounded-xl text-xs font-bold font-display shadow-[0_0_20px_rgba(226,243,60,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Salva
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Section: React.FC<{ icon: any, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
    <div className="space-y-4 select-none">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-brand-lime/60 shadow-inner group">
                <Icon className="w-4.5 h-4.5 transition-transform group-hover:scale-105" />
            </div>
            <h2 className="text-sm font-semibold font-display tracking-wide text-white/50">{title}</h2>
        </div>
        <div className="p-5 md:p-6 bg-white/[0.01] border border-white/5 rounded-2xl backdrop-blur-md">
            {children}
        </div>
    </div>
);
