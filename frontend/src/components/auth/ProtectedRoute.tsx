import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';

interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectPath?: string;
}

/**
 * A wrapper for routes that require authentication.
 * If not authenticated, redirects to the welcome page (guest view).
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    redirectPath = '/welcome' 
}) => {
    const { isAuthenticated, isLoading } = useAppSelector((state: RootState) => state.auth);
    const location = useLocation();

    if (isLoading) {
        return null; // Or a loading spinner
    }

    if (!isAuthenticated) {
        // Redirect to welcome, but save the location they were trying to go to
        return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
