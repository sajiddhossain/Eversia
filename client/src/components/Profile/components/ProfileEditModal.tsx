import React, { useState } from 'react';
import type { UserProfile } from '../../../types';
import { X, Save, AlertCircle, CheckCircle2, Sparkles, Calendar, Type, Palette, Loader2, Users } from 'lucide-react';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../firebase';
import { COVER_PRESETS } from '../../../utils/gamification';

interface ProfileEditModalProps {
    profile: UserProfile;
    onClose: () => void;
    onSave: (updates: Partial<UserProfile>) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ profile, onClose, onSave }) => {
    const [bio, setBio] = useState(profile.bio || '');
    const [newUsername, setNewUsername] = useState(profile.username || '');
    const [birthday, setBirthday] = useState(
        profile.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : ''
    );
    const [coverColor, setCoverColor] = useState(profile.coverColor || 'midnight');
    const [className, setClassName] = useState(profile.className || '');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const canChangeUsername = profile.isFirstUsernameChange ||
        (profile.canChangeUsernameAt ? Date.now() > profile.canChangeUsernameAt : true);

    const timeDiff = profile.canChangeUsernameAt ? profile.canChangeUsernameAt - Date.now() : 0;
    const daysUntilChange = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
    const hoursUntilChange = Math.max(0, Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

    const handleSave = async () => {
        setLoading(true);
        setError(null);

        try {
            const userRef = doc(db, 'users', profile.uid);
            const updates: Record<string, any> = {
                bio: bio.slice(0, 160),
                birthday: birthday ? new Date(birthday).getTime() : null,
                coverColor,
                className: className.toUpperCase().slice(0, 5),
            };

            // Username change logic
            if (newUsername !== profile.username) {
                if (!canChangeUsername) {
                    throw new Error(`Devi aspettare ${daysUntilChange} giorni per cambiare username.`);
                }
                const clean = newUsername.toLowerCase().replace(/[^a-z0-9._]/g, '');
                const formatted = clean.startsWith('@') ? clean : `@${clean}`;

                if (formatted.length < 4) {
                    throw new Error("L'username deve avere almeno 4 caratteri.");
                }
                if (formatted.length > 30) {
                    throw new Error("L'username non può superare 30 caratteri.");
                }

                await runTransaction(db, async (transaction) => {
                    const usernameRef = doc(db, 'usernames', formatted);
                    const oldUsernameRef = doc(db, 'usernames', profile.username);
                    const usernameSnap = await transaction.get(usernameRef);

                    if (usernameSnap.exists()) {
                        throw new Error("Questo username è già stato preso.");
                    }

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
            onSave(updates as Partial<UserProfile>);
            setSuccess(true);
            setTimeout(onClose, 1200);
        } catch (err: any) {
            setError(err.message || "Errore durante il salvataggio.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
                {/* Header */}
                <div className="p-6 pb-0 flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-tight">Modifica Profilo</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Bio */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Type className="w-3 h-3 text-primary" /> Bio
                            <span className="text-white/15 ml-auto">{bio.length}/160</span>
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value.slice(0, 160))}
                            placeholder="Racconta qualcosa di te..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white/80 text-sm focus:border-primary/40 transition-all outline-none resize-none h-20"
                        />
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" /> Username
                        </label>
                        <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => {
                                let val = e.target.value.toLowerCase().replace(/[^a-z0-9._@]/g, '');
                                if (!val.startsWith('@')) val = '@' + val;
                                setNewUsername(val);
                            }}
                            disabled={!canChangeUsername}
                            className={`w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white font-bold tracking-wide transition-all outline-none ${
                                !canChangeUsername ? 'opacity-40 cursor-not-allowed border-red-500/30' : 'focus:border-primary/40'
                            }`}
                        />
                        {!canChangeUsername && timeDiff > 0 && (
                            <p className="text-[10px] text-red-500 font-black tracking-widest uppercase flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                <AlertCircle className="w-3 h-3" />
                                Puoi cambiare il tuo @handle tra {daysUntilChange} giorni, {hoursUntilChange} ore.
                            </p>
                        )}
                        {profile.isFirstUsernameChange && (
                            <p className="text-[9px] text-primary/80 font-bold flex items-center gap-1.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                Il tuo primo cambio username è gratuito!
                            </p>
                        )}
                    </div>
                    
                    {/* Class Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Users className="w-3 h-3 text-primary" /> Classe (es. 4A, 5B)
                        </label>
                        <input
                            type="text"
                            value={className}
                            onChange={(e) => setClassName(e.target.value.toUpperCase().slice(0, 5))}
                            placeholder="Inserisci la tua classe..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white focus:border-primary/40 transition-all outline-none"
                        />
                    </div>

                    {/* Birthday */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-primary" /> Data di Nascita
                        </label>
                        <input
                            type="date"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white focus:border-primary/40 transition-all outline-none"
                        />
                    </div>

                    {/* Cover Color */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                            <Palette className="w-3 h-3 text-primary" /> Copertina Profilo
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {COVER_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setCoverColor(preset.id)}
                                    className={`aspect-square rounded-xl bg-gradient-to-br ${preset.gradient} transition-all hover:scale-105 ${
                                        coverColor === preset.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface scale-105' : 'opacity-60 hover:opacity-100'
                                    }`}
                                    title={preset.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Salvato!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-3.5 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_0_20px_rgba(226,243,60,0.2)] hover:shadow-[0_0_30px_rgba(226,243,60,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading 
                            ? 'Salvataggio...' 
                            : profile.isFirstUsernameChange 
                                ? 'Conferma Username Unico' 
                                : 'Salva Modifiche'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};
