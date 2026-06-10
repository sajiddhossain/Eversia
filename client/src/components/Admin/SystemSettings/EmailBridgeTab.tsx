import React from 'react';
import { Mail, Key, Globe, Shield } from "lucide-react";
import type { AppConfig, UserProfile } from "../../../types";

interface EmailBridgeTabProps {
    config: AppConfig | null;
    userProfile: UserProfile | null;
    handleUpdateEmailConfig: (field: 'email_bridge_url' | 'email_api_key') => void;
}

export const EmailBridgeTab: React.FC<EmailBridgeTabProps> = ({ config, userProfile, handleUpdateEmailConfig }) => {
    const isDeveloper = userProfile?.role === 'SVILUPPATORE';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/2 border border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-8">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-primary/20 rounded-2xl text-primary">
                        <Mail className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-widest italic">Configurazione Bridge Email</h3>
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Invia notifiche automatiche via Google Apps Script</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> URL Web App (Google Apps Script)
                                </div>
                                {isDeveloper && (
                                    <button 
                                        onClick={() => handleUpdateEmailConfig('email_bridge_url')}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] text-white/50 hover:text-white transition-colors"
                                    >
                                        Modifica
                                    </button>
                                )}
                            </label>
                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold font-mono text-white/50 truncate cursor-not-allowed">
                                {config?.email_bridge_url || "Non configurato"}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Key className="w-3 h-3" /> API Key (Segreta)
                                </div>
                                {isDeveloper && (
                                    <button 
                                        onClick={() => handleUpdateEmailConfig('email_api_key')}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] text-white/50 hover:text-white transition-colors"
                                    >
                                        Modifica
                                    </button>
                                )}
                            </label>
                            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold font-mono text-white/50 truncate cursor-not-allowed">
                                {config?.email_api_key ? '••••••••••••••••••••••••' : "Non configurato"}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] text-amber-500/80 font-bold uppercase tracking-widest bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                            <Shield className="w-4 h-4 shrink-0" /> {isDeveloper ? "Le modifiche richiedono il Security PIN" : "Solo gli sviluppatori possono modificare le chiavi API del sistema"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
