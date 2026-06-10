import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Server, Database, Users, UserCircle, Terminal, History, Mail, GraduationCap } from "lucide-react";
import { SecurityGuard } from "../../Auth/SecurityGuard";
import { AuditLog } from "../AuditLog";
import { useSystemSettings } from "./useSystemSettings";
import type { SettingsTab } from "./useSystemSettings";
import { OverviewTab } from "./OverviewTab";
import { RolesTab } from "./RolesTab";
import { UsersTab } from "./UsersTab";
import { EmailBridgeTab } from "./EmailBridgeTab";
import { DebugTab } from "./DebugTab";
import { BulkClassTab } from "./BulkClassTab";

interface CategoryItem {
    id: SettingsTab;
    icon: React.ComponentType<any>;
    label: string;
    description: string;
}

interface Category {
    title: string;
    items: CategoryItem[];
}

export const SystemSettings: React.FC = () => {
    const navigate = useNavigate();
    const settings = useSystemSettings();
    const isDeveloper = settings.userProfile?.role === 'SVILUPPATORE';

    const CATEGORIES: Category[] = [
        {
            title: "Sistema",
            items: [
                { id: 'OVERVIEW', icon: Database, label: 'Panoramica', description: 'Stato globale e statistiche' },
                { id: 'AUDIT', icon: History, label: 'Registro Attività', description: 'Tracciamento operazioni admin' },
                ...(isDeveloper ? [{ id: 'DEBUG' as SettingsTab, icon: Terminal, label: 'Debug & Logs', description: 'Terminale e wipe database' }] : []),
            ]
        },
        {
            title: "Sicurezza & Utenti",
            items: [
                { id: 'ROLES', icon: Users, label: 'Amministratori', description: 'Gestione accessi admin' },
                { id: 'USERS', icon: UserCircle, label: 'Utenti Registrati', description: 'Dettagli account registrati' },
                { id: 'BULK_CLASS', icon: GraduationCap, label: 'Classi in Massa', description: 'Import CSV assegnazione classi' },
            ]
        },
        {
            title: "Integrazioni",
            items: [
                { id: 'EMAIL', icon: Mail, label: 'Email Bridge', description: 'Google Apps Script bridge' },
            ]
        }
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate("/admin")}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all group shrink-0"
                    >
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Server className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">eversia system core</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase leading-tight">
                            Impostazioni <br className="md:hidden" /> di Sistema
                        </h1>
                        <p className="text-white/40 text-sm md:text-md mt-2 font-medium">
                            Gestione globale, ruoli, utenti e diagnostica.
                        </p>
                    </div>
                </div>
            </header>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Sidebar Navigation */}
                <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24">
                    {/* Desktop Sidebar: hidden on mobile */}
                    <div className="hidden lg:flex flex-col gap-6 bg-white/[0.01] border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
                        {CATEGORIES.map((category) => (
                            <div key={category.title} className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-3">
                                    {category.title}
                                </h4>
                                <div className="space-y-1">
                                    {category.items.map((tab) => {
                                        const isActive = settings.activeTab === tab.id;
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => settings.setActiveTab(tab.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-300 group relative ${
                                                    isActive
                                                        ? 'bg-primary text-black font-black shadow-lg shadow-primary/10'
                                                        : 'text-white/40 hover:text-white hover:bg-white/5 font-bold'
                                                }`}
                                            >
                                                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                                                    isActive ? 'scale-110' : 'group-hover:scale-110 text-white/30 group-hover:text-white'
                                                }`} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs uppercase tracking-widest truncate">{tab.label}</div>
                                                    <div className={`text-[9px] font-medium leading-none mt-1 truncate ${
                                                        isActive ? 'text-black/60' : 'text-white/20'
                                                    }`}>
                                                        {tab.description}
                                                    </div>
                                                </div>
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-black rounded-full" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Tabs: hidden on desktop */}
                    <div className="lg:hidden flex overflow-x-auto no-scrollbar gap-2 bg-white/2 p-2 rounded-2xl border border-white/5 w-full">
                        {CATEGORIES.flatMap(cat => cat.items).map(tab => {
                            const isActive = settings.activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => settings.setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-primary text-black shadow-lg shadow-primary/20'
                                            : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="lg:col-span-9">
                    {settings.activeTab === 'OVERVIEW' && (
                        <OverviewTab
                            assemblies={settings.assemblies}
                            rooms={settings.rooms}
                            adminDisplayList={settings.adminDisplayList}
                            registeredUsersCount={settings.totalUsersCount}
                            totalStudentsCount={settings.totalStudentsCount}
                            config={settings.config}
                            setSecurityModal={settings.setSecurityModal}
                            handleToggleMaintenanceMode={settings.handleToggleMaintenanceMode}
                        />
                    )}

                    {settings.activeTab === 'ROLES' && (
                        <RolesTab
                            userProfile={settings.userProfile}
                            roleSearch={settings.roleSearch}
                            setRoleSearch={settings.setRoleSearch}
                            filteredAdmins={settings.filteredAdmins}
                            showAddForm={settings.showAddForm}
                            setShowAddForm={settings.setShowAddForm}
                            newAdminEmail={settings.newAdminEmail}
                            setNewAdminEmail={settings.setNewAdminEmail}
                            isSaving={settings.isSaving}
                            handleAddAdmin={settings.handleAddAdmin}
                            handleRemoveAdmin={settings.handleRemoveAdmin}
                        />
                    )}

                    {settings.activeTab === 'USERS' && (
                        <UsersTab
                            registeredUsers={settings.registeredUsers}
                            filteredUsers={settings.filteredUsers}
                            userSearch={settings.userSearch}
                            setUserSearch={settings.setUserSearch}
                            userRoleFilter={settings.userRoleFilter}
                            setUserRoleFilter={settings.setUserRoleFilter}
                            selectedUser={settings.selectedUser}
                            setSelectedUser={settings.setSelectedUser}
                            userLogs={settings.userLogs}
                            loadingLogs={settings.loadingLogs}
                            getRoleBadge={settings.getRoleBadge}
                            confirmDeleteUser={settings.confirmDeleteUser}
                            searchLoading={settings.searchLoading}
                            totalUsersCount={settings.totalUsersCount}
                        />
                    )}

                    {settings.activeTab === 'EMAIL' && (
                        <EmailBridgeTab
                            config={settings.config}
                            userProfile={settings.userProfile}
                            handleUpdateEmailConfig={settings.handleUpdateEmailConfig}
                        />
                    )}

                    {settings.activeTab === 'AUDIT' && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <AuditLog />
                        </div>
                    )}

                    {settings.activeTab === 'DEBUG' && (
                        <DebugTab 
                            userProfile={settings.userProfile}
                            terminalHistory={settings.terminalHistory}
                            onCommand={settings.processTerminalCommand}
                            onWipeDatabase={settings.handleWipeDatabase}
                        />
                    )}

                    {settings.activeTab === 'BULK_CLASS' && (
                        <BulkClassTab />
                    )}
                </main>
            </div>

            {/* Security Guard Modal */}
            <SecurityGuard
                isOpen={settings.securityModal.isOpen}
                onClose={() => settings.setSecurityModal((prev: any) => ({ ...prev, isOpen: false }))}
                onVerified={settings.securityModal.onVerified}
                currentPin={settings.config?.security_pin}
                onSetPin={settings.handleSetSecurityPin}
                actionName={settings.securityModal.action}
                forceSettingMode={settings.securityModal.forceSettingMode}
            />
        </div>
    );
};
