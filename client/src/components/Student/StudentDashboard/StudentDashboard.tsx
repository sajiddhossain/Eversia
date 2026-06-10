import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Assembly, Activity } from '../../../types';
import { 
    AlertTriangle,
    RotateCcw,
    Sparkles,
    XCircle
} from 'lucide-react';

// Hooks
import { useStudentDashboard } from './useStudentDashboard';

// Modular Components
import Hero from './GlobalHome/Hero';
import SystemAlerts from './GlobalHome/SystemAlerts';
import AgendaList from './GlobalHome/AgendaList';
import NextUpWidget from './GlobalHome/NextUpWidget';
import AssemblyGrid from './GlobalHome/AssemblyGrid';
import DashboardHeader from './AssemblyView/DashboardHeader';
import SummaryCard from './AssemblyView/SummaryCard';
import TimelineView from './AssemblyView/TimelineView';
import ActivityCatalog from './AssemblyView/ActivityCatalog';
import SupportWidget from './GlobalHome/SupportWidget';

// New Shared Components
import { LoadingState } from './Common/LoadingState';
import { GuestLoginModal } from './Common/GuestLoginModal';
import { RegistrationControls } from './AssemblyView/RegistrationControls';
import { ActivityDetailModal } from './Common/ActivityDetailModal';

/**
 * StudentDashboard Entry Point
 * 
 * Orchestrates the transition between Global Home and Assembly View.
 * Logic is encapsulated in the useStudentDashboard hook.
 */
export const StudentDashboard: React.FC = () => {
    const {
        userProfile, selectedAssembly, setSelectedAssembly, navigate,
        openAssemblies, allStudentDocs, activities, studentData, 
        isGuest, isGlobalLoading, loadingAssembly, bookingInProgress, error, successMsg,
        activeTab, setActiveTab, showLoginPrompt, setShowLoginPrompt,
        allTurnIds, bookedCount, formatTurn, missionControl,
        smartNextActivity, activeSystemAlerts, canBook, isInProgress, isArchived, displayAssembly,
        handleBook, handleSwap, handleShare, handleFinalize, handleUnlock, handleReset, handleRate,
        handleBack, setError, fetchAssemblies, turnTimestamps, currentTime, scrollToTurn
    } = useStudentDashboard();

    const [mobileDashboardTab, setMobileDashboardTab] = useState<'AGENDA' | 'EXPLORE'>('AGENDA');
    const [selectedActivityForInfo, setSelectedActivityForInfo] = useState<Activity | null>(null);
    const [infoAssembly, setInfoAssembly] = useState<Assembly | null>(null);
    const themeColor = selectedAssembly?.themeColor || '#E2F33C';

    const handleSetTab = (tab: 'AGENDA' | 'EXPLORE') => {
        if (!document.startViewTransition) {
            setMobileDashboardTab(tab);
        } else {
            document.startViewTransition(() => {
                setMobileDashboardTab(tab);
            });
        }
    };

    // 1. Handle Global Loading
    if (!selectedAssembly && isGlobalLoading) {
        return <LoadingState type="GLOBAL" />;
    }

    // 2. Handle Global Home View
    if (!selectedAssembly) {
        const activeList = openAssemblies.filter((a: Assembly) => a.status !== 'ARCHIVIATA');
        const archivedList = openAssemblies.filter((a: Assembly) => a.status === 'ARCHIVIATA');
        const joinedAssemblyIds = new Set<string>(allStudentDocs.map((d: any) => d.assemblyId));

        return (
            <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white selection:bg-primary/30 overflow-x-hidden -mt-20 pt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-24 space-y-10 md:space-y-24 relative">
                    <Hero schoolName="Liceo Agnesi" isGuest={isGuest} />
                    
                    {/* Desktop Refresh Button */}
                    <div className="hidden lg:flex justify-end lg:-mt-16 relative z-20">
                        <button 
                            onClick={fetchAssemblies}
                            className="flex btn-press items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all group"
                        >
                            <RotateCcw className={`w-3 h-3 ${loadingAssembly ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            Aggiorna Assemblee
                        </button>
                    </div>



                    {/* Mobile Navigation Segmented Controller */}
                    <div className="flex lg:hidden items-center gap-3 max-w-md mx-auto relative z-20">
                        <div className="flex-1 flex p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl relative">
                            <button
                                onClick={() => handleSetTab('AGENDA')}
                                className={`flex-1 py-3 text-center rounded-xl text-xs font-semibold relative transition-all duration-300 btn-press ${
                                    mobileDashboardTab === 'AGENDA' 
                                        ? 'text-black z-10' 
                                        : 'text-white/40 hover:text-white'
                                }`}
                            >
                                {mobileDashboardTab === 'AGENDA' && (
                                    <motion.div
                                        layoutId="mobile-dashboard-tab-indicator"
                                        className="absolute inset-0 bg-white rounded-xl -z-10"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                La mia agenda
                            </button>
                            <button
                                onClick={() => handleSetTab('EXPLORE')}
                                className={`flex-1 py-3 text-center rounded-xl text-xs font-semibold relative transition-all duration-300 btn-press ${
                                    mobileDashboardTab === 'EXPLORE' 
                                        ? 'text-black z-10' 
                                        : 'text-white/40 hover:text-white'
                                }`}
                            >
                                {mobileDashboardTab === 'EXPLORE' && (
                                    <motion.div
                                        layoutId="mobile-dashboard-tab-indicator"
                                        className="absolute inset-0 bg-white rounded-xl -z-10"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                Esplora
                            </button>
                        </div>
                        <button 
                            onClick={fetchAssemblies}
                            className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all btn-press shrink-0 flex items-center justify-center"
                            title="Aggiorna"
                        >
                            <RotateCcw className={`w-4 h-4 ${loadingAssembly ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <SystemAlerts alerts={activeSystemAlerts} />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10">
                        {/* Left column: Agenda & Next Up (Symmetric 6/12) */}
                        <div className={`lg:col-span-6 space-y-6 md:space-y-12 ${mobileDashboardTab === 'AGENDA' ? 'block' : 'hidden lg:block'}`}>
                            <AgendaList 
                                groupedAgenda={missionControl.groupedAgenda} 
                                onSelectTurn={(turnId) => {
                                    // Navigate to specific turn
                                    const item = missionControl.agenda.find(i => i.turnId === turnId);
                                    if (item) {
                                        setSelectedAssembly(item.assembly);
                                        setTimeout(() => scrollToTurn(turnId), 500);
                                    }
                                }}
                                onViewActivityInfo={(activity, assembly) => {
                                    setInfoAssembly(assembly);
                                    setSelectedActivityForInfo(activity);
                                }}
                            />
                            {smartNextActivity && (
                                <NextUpWidget nextActivity={smartNextActivity} formatTurn={formatTurn} />
                            )}
                        </div>

                        {/* Right column: Assembly Explorer & Support (Symmetric 6/12) */}
                        <div className={`lg:col-span-6 space-y-6 md:space-y-12 ${mobileDashboardTab === 'EXPLORE' ? 'block' : 'hidden lg:block'}`}>
                            <AssemblyGrid 
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                activeList={activeList}
                                archivedList={archivedList}
                                onSelectAssembly={setSelectedAssembly}
                                joinedAssemblyIds={joinedAssemblyIds}
                            />
                            <SupportWidget />
                        </div>
                    </div>
                </div>
                {selectedActivityForInfo && infoAssembly && (
                    <ActivityDetailModal
                        isOpen={!!selectedActivityForInfo}
                        onClose={() => {
                            setSelectedActivityForInfo(null);
                            setInfoAssembly(null);
                        }}
                        activity={selectedActivityForInfo}
                        assembly={infoAssembly}
                        studentData={allStudentDocs.find(d => d.assemblyId === infoAssembly.id) || null}
                        userProfile={userProfile}
                    />
                )}
            </div>
        );
    }

    // 3. Handle Assembly Loading
    if (loadingAssembly) {
        return <LoadingState type="ASSEMBLY" />;
    }

    // 4. Handle Assembly View (Desktop optimized 2-column layout)
    return (
        <div className="min-h-[calc(100vh+80px)] bg-[#09090b] text-white pb-28 selection:bg-primary/30 overflow-x-hidden -mt-20 pt-20">
            <DashboardHeader 
                selectedAssembly={selectedAssembly}
                onBack={handleBack}
                onShare={handleShare}
                canBook={canBook}
                isInProgress={isInProgress}
                isArchived={isArchived}
                displayAssembly={displayAssembly!}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left side: Summary Card & Registration Controls (Sticky sidebar on desktop) */}
                    <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-24">

                        <SummaryCard 
                            isGuest={isGuest}
                            allTurnIds={allTurnIds as string[]}
                            bookedCount={bookedCount}
                            studentData={studentData}
                            activities={activities}
                            formatTurn={formatTurn}
                            selectedAssembly={selectedAssembly}
                            canBook={canBook}
                            isInProgress={isInProgress}
                            isArchived={isArchived}
                        />

                        {!isGuest && canBook && (
                            <RegistrationControls 
                                studentData={studentData}
                                bookedCount={bookedCount}
                                totalTurns={allTurnIds.length}
                                bookingInProgress={bookingInProgress}
                                onFinalize={handleFinalize}
                                onUnlock={handleUnlock}
                                onReset={handleReset}
                            />
                        )}
                    </div>

                    {/* Right side: Warnings, Guest banner, Timeline / Catalog */}
                    <div className="lg:col-span-6 space-y-6">
                        {isGuest && (
                            <div className="bg-white/[0.01] border border-white/5 rounded-3xl md:rounded-[2rem] p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: themeColor }} />
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-3">
                                        <div 
                                            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border transition-colors cursor-default"
                                            style={{ color: themeColor, borderColor: `${themeColor}20`, backgroundColor: `${themeColor}10` }}
                                        >
                                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                            Modalità ospite
                                        </div>
                                        <h2 className="text-2xl font-bold italic tracking-tight font-display text-white">Esplora l'assemblea</h2>
                                        <p className="text-xs text-white/40 font-medium leading-relaxed max-w-sm">
                                            Stai visualizzando i dettagli in modalità anteprima. Effettua l'accesso col tuo account istituzionale per poter prenotare i laboratori e salvare la tua agenda.
                                        </p>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate('/login')}
                                        className="px-6 py-3.5 bg-white text-black hover:bg-neutral-100 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap flex items-center gap-3 shadow-lg"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Accedi per prenotare
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
                                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <div className="flex-1 text-sm text-red-300 font-medium">{error}</div>
                                <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400"><XCircle className="w-4 h-4" /></button>
                            </div>
                        )}
                        {successMsg && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
                                <RotateCcw className="w-5 h-5 text-emerald-400 shrink-0 animate-spin" />
                                <p className="text-sm text-emerald-300 font-medium">{successMsg}</p>
                            </div>
                        )}

                        {!canBook ? (
                            <TimelineView 
                                allTurnIds={allTurnIds as string[]}
                                studentData={studentData}
                                activities={activities}
                                turnTimestamps={turnTimestamps}
                                currentTime={currentTime}
                                onRate={handleRate}
                                onViewInfo={(activity) => {
                                    setInfoAssembly(selectedAssembly);
                                    setSelectedActivityForInfo(activity);
                                }}
                            />
                        ) : (
                            <ActivityCatalog 
                                allTurnIds={allTurnIds as string[]}
                                activities={activities}
                                studentData={studentData}
                                turnTimestamps={turnTimestamps}
                                canBook={canBook}
                                isArchived={isArchived}
                                bookingInProgress={bookingInProgress}
                                handleSwap={handleSwap}
                                handleBook={handleBook}
                                onViewInfo={(activity) => {
                                    setInfoAssembly(selectedAssembly);
                                    setSelectedActivityForInfo(activity);
                                }}
                            />
                        )}
                    </div>
                </div>
            </main>

            {showLoginPrompt && (
                <GuestLoginModal 
                    onClose={() => setShowLoginPrompt(false)} 
                    onLogin={() => navigate('/login')} 
                />
            )}

            {selectedActivityForInfo && infoAssembly && (
                <ActivityDetailModal
                    isOpen={!!selectedActivityForInfo}
                    onClose={() => {
                        setSelectedActivityForInfo(null);
                        setInfoAssembly(null);
                    }}
                    activity={selectedActivityForInfo}
                    assembly={infoAssembly}
                    studentData={allStudentDocs.find(d => d.assemblyId === infoAssembly.id) || null}
                    userProfile={userProfile}
                />
            )}
        </div>
    );
};
