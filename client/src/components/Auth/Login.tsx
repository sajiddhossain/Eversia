import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Modular Components
import LoginBackground from './Login/LoginBackground';
import LoginHeader from './Login/LoginHeader';
import LoginCard from './Login/LoginCard';
import LoginPills from './Login/LoginPills';
import DomainMismatchModal from './Login/DomainMismatchModal';

export const Login: React.FC = () => {
    const { loginWithGoogle, userProfile, loading, authError, clearAuthError, authTimeout } = useAuth();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    
    const fromLoc = (location.state as any)?.from;
    const from = fromLoc ? (fromLoc.pathname + (fromLoc.search || "")) : "/";


    // Force redirect if profile is detected while on this screen
    React.useEffect(() => {
        if (userProfile) {
            navigate(from, { replace: true });
        }
    }, [userProfile, navigate, from]);

    const handleLogin = async () => {
        try {
            setErrorMsg(null);
            await loginWithGoogle();
        } catch (err: any) {
            console.warn("[LoginContainer] Authentication failed:", err.message || err.code);
            
            // Skip setting general error if it's a domain mismatch (handled by global context modal)
            if (err.message === 'DOMAIN_MISMATCH') {
                return;
            }

            if (err.code === 'auth/popup-closed-by-user') {
                setErrorMsg("Il popup di accesso è stato chiuso inaspettatamente. Riprova.");
            } else if (err.code === 'auth/popup-blocked') {
                setErrorMsg("Popup bloccato dal browser. Consenti i popup per questo sito e riprova.");
            } else if (err.code === 'auth/unauthorized-domain') {
                setErrorMsg("Dominio non autorizzato. Se sei in fase di test, devi aggiungere l'IP locale (es. 192.168.x.x) ai 'Domini Autorizzati' nella console di Firebase.");
            } else {
                setErrorMsg(err.message || "Errore durante l'apertura del login.");
            }
        }
    };

    return (
        <div className="min-h-[calc(100vh+80px)] flex items-center justify-center p-6 bg-[#09090b] text-white relative overflow-hidden selection:bg-primary/30 -mt-20 pt-20">
            {/* Domain Mismatch Modal */}
            {authError === 'DOMAIN_MISMATCH' && (
                <DomainMismatchModal onClose={clearAuthError} />
            )}

            <LoginBackground />

            <div className="max-w-md w-full relative z-10 space-y-10 animate-in fade-in zoom-in-95 duration-700">
                <LoginHeader />

                <LoginCard 
                    errorMsg={errorMsg}
                    loading={loading}
                    onLogin={handleLogin}
                    authTimeout={authTimeout}
                />

                <LoginPills />
            </div>
        </div>
    );
};
