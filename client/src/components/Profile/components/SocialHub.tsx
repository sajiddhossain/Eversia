import React, { useState } from 'react';
import { Users, Search, Bell } from 'lucide-react';
import { FriendsListPanel } from './FriendsListPanel';
import { UserDiscovery } from './UserDiscovery.tsx';
import { FriendRequestsPanel } from './FriendRequestsPanel';
import type { FriendRequest, UserProfile } from '../../../types';

interface SocialHubProps {
    userProfile: UserProfile;
    incomingRequests: (FriendRequest & { id: string; fromUser?: UserProfile })[];
    outgoingRequests: (FriendRequest & { id: string; toUser?: UserProfile })[];
    loading: boolean;
    onAccept: (requestId: string, fromUid: string) => void;
    onReject: (requestId: string) => void;
    onCancelSent: (requestId: string) => void;
}

type SocialTab = 'FRIENDS' | 'DISCOVER' | 'REQUESTS';

export const SocialHub: React.FC<SocialHubProps> = ({ 
    userProfile, 
    incomingRequests, 
    outgoingRequests,
    loading, 
    onAccept, 
    onReject,
    onCancelSent
}) => {
    const [activeTab, setActiveTab] = useState<SocialTab>('FRIENDS');

    const tabs = [
        { id: 'FRIENDS' as SocialTab, label: 'Contatti', icon: Users, badge: userProfile.friends?.length || 0 },
        { id: 'DISCOVER' as SocialTab, label: 'Scopri', icon: Search },
        { id: 'REQUESTS' as SocialTab, label: 'Richieste', icon: Bell, badge: incomingRequests.length > 0 ? incomingRequests.length : undefined },
    ];

    return (
        <div className="space-y-6">
            {/* Sub-Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === tab.id
                                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                                activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-primary text-black'
                            }`}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'FRIENDS' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/20 px-2">I Tuoi Contatti</h3>
                        </div>
                        <FriendsListPanel friendUids={userProfile.friends || []} isOwnProfile={true} />
                    </div>
                )}

                {activeTab === 'DISCOVER' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white/20 px-2">Esplora la Community</h3>
                        </div>
                        <UserDiscovery />
                    </div>
                )}

                {activeTab === 'REQUESTS' && (
                    <div className="space-y-8">
                        <FriendRequestsPanel
                            incoming={incomingRequests}
                            outgoing={outgoingRequests}
                            loading={loading}
                            onAccept={onAccept}
                            onReject={onReject}
                            onCancelSent={onCancelSent}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

