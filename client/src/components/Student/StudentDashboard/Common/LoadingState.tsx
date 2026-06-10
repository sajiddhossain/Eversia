import React from 'react';

export const LoadingState: React.FC<{ type: 'GLOBAL' | 'ASSEMBLY' }> = ({ type }) => {
    if (type === 'GLOBAL') {
        return (
            <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12 overflow-x-hidden">
                <style>{`
                    @keyframes skeleton-pulse {
                        0% { border-color: rgba(255,255,255,0.05); background-color: rgba(255,255,255,0.02); }
                        50% { border-color: rgba(255,255,255,0.1); background-color: rgba(255,255,255,0.05); }
                        100% { border-color: rgba(255,255,255,0.05); background-color: rgba(255,255,255,0.02); }
                    }
                    .skeleton {
                        animation: skeleton-pulse 1.8s ease-in-out infinite;
                        border: 1px solid rgba(255,255,255,0.05);
                        background-color: rgba(255,255,255,0.02);
                    }
                `}</style>
                <div className="max-w-5xl mx-auto space-y-16">
                    <div className="flex flex-col md:flex-row justify-between gap-10">
                        <div className="space-y-6 flex-1">
                            <div className="w-32 h-8 skeleton rounded-full" />
                            <div className="space-y-3">
                                <div className="w-full max-w-lg h-20 skeleton rounded-3xl" />
                                <div className="w-2/3 h-20 skeleton rounded-3xl" />
                            </div>
                            <div className="w-80 h-4 skeleton rounded-lg" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 skeleton rounded-[2.5rem]" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white">
            <style>{`
                @keyframes skeleton-pulse {
                    0% { border-color: rgba(255,255,255,0.05); background-color: rgba(255,255,255,0.02); }
                    50% { border-color: rgba(255,255,255,0.1); background-color: rgba(255,255,255,0.05); }
                    100% { border-color: rgba(255,255,255,0.05); background-color: rgba(255,255,255,0.02); }
                }
                .skeleton {
                    animation: skeleton-pulse 1.8s ease-in-out infinite;
                    border: 1px solid rgba(255,255,255,0.05);
                    background-color: rgba(255,255,255,0.02);
                }
            `}</style>
            <header className="px-5 py-4 border-b border-white/[0.05] bg-black/40 backdrop-blur-2xl">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <div className="w-10 h-10 skeleton rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="w-24 h-2 skeleton rounded-full" />
                        <div className="w-48 h-4 skeleton rounded-lg" />
                    </div>
                </div>
            </header>
            <div className="max-w-3xl mx-auto p-5 space-y-10 mt-10">
                <div className="w-full h-40 skeleton rounded-[2.5rem]" />
                <div className="w-full h-64 skeleton rounded-[2rem]" />
                <div className="space-y-6">
                    <div className="w-48 h-8 skeleton rounded-full" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-56 skeleton rounded-[1.5rem]" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
