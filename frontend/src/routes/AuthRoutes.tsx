import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';

const WelcomePage = React.lazy(() => import('../pages/auth/WelcomePage'));
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'));
const SignUpPage = React.lazy(() => import('../pages/auth/SignUpPage'));

const AuthRoutes: React.FC = () => {
    const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);

    // Redirect to home if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-bg">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        }>
            <Routes>
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="*" element={<Navigate to="/welcome" replace />} />
            </Routes>
        </Suspense>
    );
};

export default AuthRoutes;
