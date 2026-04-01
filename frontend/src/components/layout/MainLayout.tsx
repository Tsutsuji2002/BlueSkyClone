import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import LoadingIndicator from '../common/LoadingIndicator';
import Sidebar from './Sidebar';
import GuestSidebar from './GuestSidebar';
import RightSidebar from './RightSidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import MobileCreateButton from './MobileCreateButton';
import MobileMenu from './MobileMenu';
import { cn } from '../../utils/classNames';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

interface MainLayoutProps {
    children?: React.ReactNode;
    hideTopBar?: boolean;
    hideBottomNav?: boolean;
    title?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, hideTopBar = false, hideBottomNav = false, title }) => {
    useDocumentTitle(title || '');
    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg">
            {/* Mobile Top Bar */}
            {!hideTopBar && <TopBar />}

            <div className="flex justify-center min-h-screen">
                <div className="flex w-full max-w-[1200px] justify-center px-2 lg:px-4">
                    {/* Left Sidebar - Desktop only */}
                    <div className={cn("hidden lg:block flex-shrink-0", isAuthenticated ? "w-20 xl:w-[280px]" : "w-64 xl:w-[280px]")}>
                        {isAuthenticated ? <Sidebar /> : <GuestSidebar />}
                    </div>

                    {/* Main Content */}
                    <main className={cn(
                        "w-full max-w-[600px] min-w-0 border-x border-gray-100 dark:border-dark-border lg:pb-0",
                        hideBottomNav ? "pb-0" : "pb-16"
                    )}>
                        {children || (
                            <Suspense fallback={null}>
                                <Outlet />
                            </Suspense>
                        )}
                    </main>

                    {/* Right Sidebar - Desktop only */}
                    <div className="hidden xl:block w-72 flex-shrink-0">
                        <RightSidebar />
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            {!hideBottomNav && <BottomNav />}

            {/* Mobile Floating Create Button */}
            <MobileCreateButton />

            {/* Mobile Navigation Sidebar */}
            <MobileMenu />
        </div>
    );
};

export default MainLayout;
