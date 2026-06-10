import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export const StaffGuard: React.FC = () => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { roomId } = useParams();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            if (authLoading) return;
            if (!user || !userProfile) {
                setIsAuthorized(false);
                setChecking(false);
                return;
            }

            // Admins have universal access
            if (userProfile.role === 'SVILUPPATORE' || userProfile.role === 'ADMIN') {
                setIsAuthorized(true);
                setChecking(false);
                return;
            }

            // Check if user has ANY staff role for any active assembly
            try {
                const rolesRef = collection(db, 'assembly_roles');
                let q = query(
                    rolesRef,
                    where('email', '==', user.email?.toLowerCase() || ''),
                    limit(1)
                );

                // If a specific roomId is present, we could potentially scope it here,
                // but for now any staff member can see the staff dashboard.
                // The RoomManager component itself will handle more granular checks if needed.

                const querySnapshot = await getDocs(q);
                setIsAuthorized(!querySnapshot.empty);
            } catch (error) {
                console.error("Error checking staff role:", error);
                setIsAuthorized(false);
            } finally {
                setChecking(false);
            }
        };

        checkAccess();
    }, [user, userProfile, authLoading, roomId]);

    if (authLoading || checking) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
