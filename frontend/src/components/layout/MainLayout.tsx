import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import LoadingIndicator from '../common/LoadingIndicator';
import Sidebar from './Sidebar';
import GuestSidebar from './GuestSidebar';
import RightSidebar from './RightSidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import MobileCreateButton from './MobileCreateButton';
import MobileMenu from './MobileMenu';
import GuestBottomBanner from './GuestBottomBanner';
import { cn } from '../../utils/classNames';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { fetchMutedWords } from '../../redux/slices/userSlice';

interface MainLayoutProps {
    children?: React.ReactNode;
    hideTopBar?: boolean;
    hideBottomNav?: boolean;
    title?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, hideTopBar = false, hideBottomNav = false, title }) => {
    useDocumentTitle(title || '');
    const dispatch = useAppDispatch();
    const location = useLocation();
    const isMessagesPage = location.pathname.startsWith('/messages');
    const isExplorePage = location.pathname === '/explore';
    const { isAuthenticated, isLoading } = useAppSelector((state: RootState) => state.auth);

    // [OPTIMIZATION] Muted words are now hydrated via Handshake on startup.
    // We only fetch here as a fallback if the list hasn't been initialized yet.
    const { mutedWordsInitialized, handshakeSettled } = useAppSelector((state: RootState) => state.user);
    useEffect(() => {
        if (isAuthenticated && !mutedWordsInitialized && handshakeSettled) {
            dispatch(fetchMutedWords());
        }
    }, [isAuthenticated, dispatch, mutedWordsInitialized, handshakeSettled]);

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* Mobile Top Bar */}
            {!hideTopBar && <TopBar />}

            <div className="flex justify-center min-h-screen">
                <div className={cn(
                    "flex w-full justify-center px-2 sm:px-4 transition-all duration-300",
                    isMessagesPage ? "max-w-[1120px] lg:gap-x-0" : "max-w-[1260px] lg:gap-x-4"
                )}>
                    {/* Left Sidebar - Desktop only */}
                    <div className={cn("hidden lg:block flex-shrink-0 transition-all duration-300", (isAuthenticated && isMessagesPage) ? "w-[72px]" : (isAuthenticated ? "w-[240px]" : "w-[260px]"))}>
                        {isAuthenticated ? (
                            <Sidebar />
                        ) : (
                            // Only show guest sidebar if NOT loading
                            !isLoading && <GuestSidebar />
                        )}
                    </div>

                    {/* Main Content */}
                    <main className={cn(
                        "w-full min-w-0 lg:pb-0 self-start bg-white dark:bg-black min-h-screen",
                        !isMessagesPage && "max-w-[600px] border-x border-[#DCE2EA] dark:border-[#232E3E]",
                        hideBottomNav ? "pb-0" : "pb-16"
                    )}>
                        {children || (
                            <Suspense fallback={null}>
                                <Outlet />
                            </Suspense>
                        )}
                    </main>

                    {/* Right Sidebar - Desktop only */}
                    {!isMessagesPage && (
                        <div className="hidden xl:block w-[320px] flex-shrink-0">
                            <RightSidebar />
                        </div>
                    )}
                </div>
            </div>

            {isAuthenticated ? (
                <>
                    {/* Mobile Bottom Navigation */}
                    {!hideBottomNav && <BottomNav />}

                    {/* Mobile Floating Create Button */}
                    <MobileCreateButton />
                </>
            ) : (
                !isLoading && <GuestBottomBanner />
            )}

            {/* Mobile Navigation Sidebar */}
            <MobileMenu />
        </div>
    );
};

export default MainLayout;
