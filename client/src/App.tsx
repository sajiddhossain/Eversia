import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect, lazy, Suspense } from "react";
import { AssemblyProvider } from "./contexts/AssemblyContext";
import { Login } from "./components/Auth/Login";
import { Landing } from "./components/Public/Landing";
import { StudentDashboard } from "./components/Student/StudentDashboard";
import { StaffGuard } from "./components/Auth/StaffGuard";
import { GlobalNavbar } from "./components/Common/GlobalNavbar";
import { GlobalFooter } from "./components/Common/GlobalFooter";
import { PrivacyPolicy } from "./components/Public/PrivacyPolicy";
import { AboutUs } from "./components/Public/AboutUs";
import { JoinGateway } from "./components/Public/JoinGateway";
import { Loader2, Lock, AlertOctagon, Construction } from "lucide-react";
import ScrollToTop from "./components/Common/ScrollToTop";
import { PrivacyModal } from "./components/Auth/PrivacyModal";
import { MobileBottomNav } from "./components/Common/MobileBottomNav";

// Lazy-loaded components for role-restricted/heavy routes
const AdminDashboard = lazy(() => import("./components/Admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AssemblyConfig = lazy(() => import("./components/Admin/AssemblyConfig").then(m => ({ default: m.AssemblyConfig })));
const SystemSettings = lazy(() => import("./components/Admin/SystemSettings").then(m => ({ default: m.SystemSettings })));
const SecurityDashboard = lazy(() => import("./components/Admin/SecurityDashboard").then(m => ({ default: m.SecurityDashboard })));
const CCOOverlay = lazy(() => import("./components/Admin/CCO/CCOOverlay").then(m => ({ default: m.CCOOverlay })));
const StaffDashboard = lazy(() => import("./components/Staff/StaffDashboard").then(m => ({ default: m.StaffDashboard })));
const RoomManager = lazy(() => import("./components/Staff/RoomManager").then(m => ({ default: m.RoomManager })));
const SocialExplorer = lazy(() => import("./components/Social/SocialExplorer").then(m => ({ default: m.SocialExplorer })));
const PublicProfile = lazy(() => import("./components/Profile/PublicProfile").then(m => ({ default: m.PublicProfile })));
const SettingsView = lazy(() => import("./components/Profile/SettingsView").then(m => ({ default: m.SettingsView })));
const SupportPage = lazy(() => import("./components/Public/SupportPage").then(m => ({ default: m.SupportPage })));
const NotFoundPage = lazy(() => import("./components/Common/NotFoundPage").then(m => ({ default: m.NotFoundPage })));


// Placeholder for Student Dashboard - to be built in Phase 3

const RoomManagerWrapper: React.FC = () => {
  const { roomId, turnId } = useParams();
  return <RoomManager roomId={roomId || "legacy"} turnId={turnId || "1"} />;
};

const RequireAuth: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

const RequireRole: React.FC<{ roles: string[] }> = ({ roles }) => {
  const { userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.includes(userProfile.role)) {
    return <Outlet />;
  }

  // Redirect based on role if they try to access something they shouldn't
  if (userProfile.role === 'STUDENT') return <Navigate to="/student" replace />;
  return <Navigate to="/admin" replace />;
};

// Global routing component to direct logged-in users to their respective dashboards
const RootRedirect: React.FC = () => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!userProfile) return <Navigate to="/" replace />;


  switch (userProfile.role) {
    case 'SVILUPPATORE':
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    case 'STUDENT':
    default:
      return <Navigate to="/student" replace />;
  }
};


const ProfileRedirect: React.FC = () => {
  const { userProfile, loading } = useAuth();
  if (loading) return null;
  if (!userProfile) return <Navigate to="/login" replace />;
  return <Navigate to={`/profile/${userProfile.username}`} replace />;
};

const MaintenanceView: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative w-32 h-32 bg-primary/10 border-2 border-primary/20 rounded-[2.5rem] flex items-center justify-center">
          <Construction className="w-16 h-16 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg border-2 border-surface animate-bounce">
          <Lock className="w-4 h-4" />
        </div>
      </div>
      
      <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4">
        SISTEMA SOTTO <span className="text-primary">LOCKDOWN</span>
      </h1>
      <p className="max-w-md text-white/50 text-sm font-medium leading-relaxed mb-8">
        L'accesso alla piattaforma è temporaneamente limitato per manutenzione programmata o aggiornamenti di sicurezza. Riprova più tardi.
      </p>
      
      <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
        <AlertOctagon className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Accesso riservato agli amministratori</span>
      </div>
      
      <a href="/" className="mt-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-primary transition-colors">
        Torna alla Home
      </a>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { userProfile, user, loading: authLoading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // SECURITY: Config richiede autenticazione — leggiamo solo se l'utente è loggato
    if (!user) {
      setConfigLoading(false);
      return;
    }
    return onSnapshot(doc(db, "config", "main"), (snap) => {
      if (snap.exists()) {
        setMaintenanceMode(!!snap.data().maintenance_mode);
      } else {
        console.warn("[AppContent] Config doc does not exist.");
      }
      setConfigLoading(false);
    }, (error) => {
      const err = error as any;
      const code = err.code || '';
      const msg = err.message || '';
      const isPermissionErr = code === 'permission-denied' || 
                             code === 'firestore/permission-denied' ||
                             msg.toLowerCase().includes('permission') ||
                             msg.toLowerCase().includes('insufficient');
      if (!isPermissionErr) {
        console.error("[AppContent] Config fetch FAILED with error:", error.code, error.message);
      }
      setConfigLoading(false);
    });
  }, [user]);

  const isAdmin = userProfile && ['SVILUPPATORE', 'ADMIN'].includes(userProfile.role);
  const isPublicRoute = ['/', '/login', '/privacy', '/chi-siamo', '/assistenza'].includes(location.pathname) || location.pathname.startsWith('/join/');
  
  const isLocked = maintenanceMode && !isAdmin && !isPublicRoute;


  // CCO trigger logic has been moved to GlobalNavbar (Secret Trigger)

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-surface text-white selection:bg-primary/30 pt-20">
      <GlobalNavbar onSecretTrigger={() => navigate('/admin/terminal')} />
      {isLocked ? (
        <MaintenanceView />
      ) : (
        <Suspense fallback={
          <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-surface">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        }>
          <Routes>
            <Route
              path="/login"
              element={userProfile ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Public Landing & Profile Pages */}
            <Route path="/" element={<Landing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/chi-siamo" element={<AboutUs />} />
            <Route path="/assistenza" element={<SupportPage />} />
            <Route path="/join/:assemblyId" element={<JoinGateway />} />
            <Route path="/profile/uid/:uid" element={<PublicProfile />} />
            <Route path="/profile/:username" element={<PublicProfile />} />

            {/* Public Student Dashboard */}
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/:assemblyId" element={<StudentDashboard />} />

            {/* Profile & Social Routes */}
            <Route path="/profile" element={<ProfileRedirect />} />
            <Route path="/social" element={<SocialExplorer />} />
            <Route path="/social/requests" element={<SocialExplorer />} />
            <Route path="/social/leaderboard" element={<SocialExplorer />} />

            <Route element={<RequireAuth />}>
              {/* Dashboard router based on role */}
              <Route path="/dashboard" element={<RootRedirect />} />

              {/* Admin Routes */}
              <Route element={<RequireRole roles={['SVILUPPATORE', 'ADMIN']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/system" element={<SystemSettings />} />
                <Route path="/admin/assembly/:assemblyId" element={<AssemblyConfig />} />
                <Route path="/admin/terminal" element={<CCOOverlay />} />
              </Route>

              {/* Staff Routes (Dynamic Scoped Roles) */}
              <Route element={<StaffGuard />}>
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/room/:roomId/:turnId" element={<RoomManagerWrapper />} />
                <Route path="/security/:assemblyId/:turnId" element={<SecurityDashboard />} />
              </Route>

              {/* Private Settings */}
              <Route path="/settings" element={<SettingsView />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      )}
      <GlobalFooter />

      {/* Privacy Consent Modal (Global Overlay) */}
      <PrivacyModal />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AssemblyProvider>
        <Router>
          <ScrollToTop />
          <AppContent />
        </Router>
      </AssemblyProvider>
    </AuthProvider>
  );
};

export default App;
