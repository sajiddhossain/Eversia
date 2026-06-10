import React from 'react';
import { ArrowLeft, Share2, Lock } from 'lucide-react';
import type { Assembly } from '../../../../types';

interface DashboardHeaderProps {
    selectedAssembly: Assembly;
    onBack: () => void;
    onShare: () => void;
    canBook: boolean;
    isInProgress: boolean;
    isArchived: boolean;
    displayAssembly: Assembly;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    selectedAssembly,
    onBack,
    onShare,
    isArchived,
    displayAssembly
}) => {
    return (
        <>
            <header className="sticky top-0 z-40 bg-[#09090b]/40 backdrop-blur-3xl border-b border-white/[0.05] px-4 sm:px-6 py-4 transition-all">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            onClick={onBack}
                            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/10 transition-all shrink-0 text-white/40 hover:text-white hover:scale-105 active:scale-95 shadow-2xl"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-2xl font-display font-bold tracking-tight text-white leading-tight break-words drop-shadow-2xl">
                                {selectedAssembly.name}
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Assembly View</span>
                            </div>
                        </div>
                    </div>


                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onShare}
                            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/10 transition-all text-white/40 hover:text-white hover:scale-105 active:scale-95 shadow-2xl"
                            title="Condividi"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {isArchived && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-4 text-center sticky top-[52px] z-40 backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center justify-center gap-2">
                        <Lock className="w-3 h-3" />
                        Modalità sola lettura — Storico Assemblea
                    </p>
                </div>
            )}

            {displayAssembly.bannerActive && displayAssembly.bannerImageUrl && (
                <div className="sticky z-40 backdrop-blur-md border-b border-white/[0.05]" style={{ top: isArchived ? '88px' : '52px' }}>
                    <div className="w-full h-28 md:h-40 overflow-hidden bg-black/40">
                        <img
                            src={displayAssembly.bannerImageUrl}
                            alt="Assembly Banner"
                            className="w-full h-full object-cover opacity-80"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default DashboardHeader;
