import React from 'react';
import type { FriendRequest, UserProfile } from '../../../types';
import { User, UserCheck, UserX, Loader2, UserPlus, Clock, X } from 'lucide-react';
import { UserRoleBadge } from '../../Common/UserRoleBadge';

interface FriendRequestsPanelProps {
    incoming: (FriendRequest & { id: string; fromUser?: UserProfile })[];
    outgoing: (FriendRequest & { id: string; toUser?: UserProfile })[];
    loading: boolean;
    onAccept: (requestId: string, fromUid: string) => void;
    onReject: (requestId: string) => void;
    onCancelSent: (requestId: string) => void;
}

export const FriendRequestsPanel: React.FC<FriendRequestsPanelProps> = ({ 
    incoming, 
    outgoing, 
    loading, 
    onAccept, 
    onReject,
    onCancelSent
}) => {
    if (incoming.length === 0 && outgoing.length === 0 && !loading) {
        return (
            <div className="py-20 text-center opacity-20 space-y-4">
                <Clock className="w-12 h-12 mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest text-white">Nessuna richiesta in sospeso</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Incoming Requests */}
            {incoming.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
                            Richieste Ricevute ({incoming.length})
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {incoming.map((req) => (
                            <div
                                key={req.id}
                                className="bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 flex flex-row items-center justify-between gap-3 h-[72px] hover:bg-white/[0.04] transition-all"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 aspect-square rounded-xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        <User className="w-5 h-5 text-white/10" />
                                    </div>
                                    <div className="min-w-0 flex-1 py-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-[11px] sm:text-xs md:text-sm font-black text-white leading-none truncate">{req.fromUser?.displayName || 'Utente'}</p>
                                            <UserRoleBadge role={req.fromUser?.role || ""} />
                                        </div>
                                        <p className="text-[8px] sm:text-[9px] text-white/30 font-bold truncate mt-1">{req.fromUser?.username}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => onReject(req.id)}
                                        className="w-9 h-9 rounded-full bg-white/5 text-white/40 border border-white/10 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                                        title="Rifiuta"
                                    >
                                        <UserX className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onAccept(req.id, req.from)}
                                        className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                                        title="Accetta"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Outgoing Requests */}
            {outgoing.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                            Richieste Inviate ({outgoing.length})
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {outgoing.map((req) => (
                            <div
                                key={req.id}
                                className="bg-white/[0.01] border border-white/5 rounded-2xl p-3.5 flex flex-row items-center justify-between gap-3 h-[72px] opacity-60 hover:opacity-100 transition-all"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 aspect-square rounded-xl bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        <User className="w-5 h-5 text-white/10" />
                                    </div>
                                    <div className="min-w-0 flex-1 py-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-[11px] sm:text-xs md:text-sm font-bold text-white truncate leading-none">{req.toUser?.displayName || 'In attesa...'}</p>
                                            <UserRoleBadge role={req.toUser?.role || ""} />
                                        </div>
                                        <p className="text-[8px] sm:text-[9px] text-white/20 font-bold truncate mt-1">{req.toUser?.username}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onCancelSent(req.id)}
                                    className="w-9 h-9 rounded-full bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400 border border-white/10 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                                    title="Annulla Richiesta"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
            )}
        </div>
    );
};
