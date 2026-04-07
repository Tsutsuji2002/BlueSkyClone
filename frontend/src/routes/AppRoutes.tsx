import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';
import AdminLayout from '../components/layout/AdminLayout';
import MainLayout from '../components/layout/MainLayout';
import LoadingIndicator from '../components/common/LoadingIndicator';
import LazyErrorBoundary from '../components/common/LazyErrorBoundary';
import ProtectedRoute from '../components/auth/ProtectedRoute';

import HomePage from '../pages/HomePage';

// Lazy Load Pages
const WelcomePage = React.lazy(() => import('../pages/auth/WelcomePage'));
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'));
const SignUpPage = React.lazy(() => import('../pages/auth/SignUpPage'));
const OAuthCallbackPage = React.lazy(() => import('../pages/auth/OAuthCallbackPage'));

const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
const FollowersPage = React.lazy(() => import('../pages/FollowersPage'));
const FollowingPage = React.lazy(() => import('../pages/FollowingPage'));
const NotificationsPage = React.lazy(() => import('../pages/NotificationsPage'));
const ExplorePage = React.lazy(() => import('../pages/ExplorePage'));
const MessagesPage = React.lazy(() => import('../pages/MessagesPage'));
const ChatPage = React.lazy(() => import('../pages/ChatPage'));
const FeedsPage = React.lazy(() => import('../pages/FeedsPage'));
const ManageFeedsPage = React.lazy(() => import('../pages/ManageFeedsPage'));
const FeedDetailPage = React.lazy(() => import('../pages/FeedDetailPage'));
const ListsPage = React.lazy(() => import('../pages/ListsPage'));
const ListDetailPage = React.lazy(() => import('../pages/ListDetailPage'));
const SavedPage = React.lazy(() => import('../pages/SavedPage'));
const SearchPage = React.lazy(() => import('../pages/SearchPage'));
const MediaViewerPage = React.lazy(() => import('../pages/MediaViewerPage'));

// Settings Pages
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));
const AccountSettingsPage = React.lazy(() => import('../pages/AccountSettingsPage'));
const PrivacySettingsPage = React.lazy(() => import('../pages/PrivacySettingsPage'));
const AppPasswordsPage = React.lazy(() => import('../pages/AppPasswordsPage'));
const PostNotificationSettingsPage = React.lazy(() => import('../pages/PostNotificationSettingsPage'));
const NotificationSettingsPage = React.lazy(() => import('../pages/NotificationSettingsPage'));
const NotificationTypeSettingsPage = React.lazy(() => import('../pages/NotificationTypeSettingsPage'));
const AppearancePage = React.lazy(() => import('../pages/AppearancePage'));
const LanguagePage = React.lazy(() => import('../pages/LanguagePage'));
const AboutPage = React.lazy(() => import('../pages/AboutPage'));
const AccessibilityPage = React.lazy(() => import('../pages/AccessibilityPage'));
const MyInterestsPage = React.lazy(() => import('../pages/InterestsPage'));
const ContentSettingsPage = React.lazy(() => import('../pages/ContentSettingsPage'));
const DiscussionSettingsPage = React.lazy(() => import('../pages/DiscussionSettingsPage'));
const FollowingFeedSettingsPage = React.lazy(() => import('../pages/FollowingFeedSettingsPage'));
const ExternalMediaPage = React.lazy(() => import('../pages/ExternalMediaPage'));

// Moderation Pages
const ModerationSettingsPage = React.lazy(() => import('../pages/ModerationSettingsPage'));
const ModerationInteractionPage = React.lazy(() => import('../pages/ModerationInteractionPage'));
const MutedWordsPage = React.lazy(() => import('../pages/MutedWordsPage'));
const ModerationListsPage = React.lazy(() => import('../pages/ModerationListsPage'));
const MutedAccountsPage = React.lazy(() => import('../pages/MutedAccountsPage'));
const BlockedAccountsPage = React.lazy(() => import('../pages/BlockedAccountsPage'));
const VerificationSettingsPage = React.lazy(() => import('../pages/VerificationSettingsPage'));

const PostDetailPage = React.lazy(() => import('../pages/PostDetailPage'));
const TagPage = React.lazy(() => import('../pages/TagPage'));
const SubmitRequestPage = React.lazy(() => import('../pages/SubmitRequestPage'));

// Admin Pages
const AdminDashboardPage = React.lazy(() => import('../pages/admin/AdminDashboardPage'));
const UserManagementPage = React.lazy(() => import('../pages/admin/UserManagementPage'));
const PostManagementPage = React.lazy(() => import('../pages/admin/PostManagementPage'));
const FeedManagementPage = React.lazy(() => import('../pages/admin/FeedManagementPage'));
const InterestManagementPage = React.lazy(() => import('../pages/admin/InterestManagementPage'));
const HashtagManagementPage = React.lazy(() => import('../pages/admin/HashtagManagementPage'));
const ListManagementPage = React.lazy(() => import('../pages/admin/ListManagementPage'));
const ConversationManagementPage = React.lazy(() => import('../pages/admin/ConversationManagementPage'));
const ModerationPage = React.lazy(() => import('../pages/admin/ModerationPage'));
const NotificationManagementPage = React.lazy(() => import('../pages/admin/NotificationManagementPage'));
const SupportManagementPage = React.lazy(() => import('../pages/admin/SupportManagementPage'));
const PageContentManagementPage = React.lazy(() => import('../pages/admin/PageContentManagementPage'));
const PrivacyPolicyPage = React.lazy(() => import('../pages/about/PrivacyPolicyPage'));

const AppRoutes: React.FC = () => {
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    return (
        <LazyErrorBoundary>
            <Routes>
                <Route path="/" element={<MainLayout hideTopBar={true} />}>
                    <Route index element={<HomePage />} />
                    <Route path="profile/:handle" element={<ProfilePage />} />
                    <Route path="profile/user/:handle" element={<ProfilePage />} />
                    <Route path="profile/:handle/followers" element={<FollowersPage />} />
                    <Route path="profile/:handle/following" element={<FollowingPage />} />
                    <Route path="profile/:handle/following" element={<FollowingPage />} />
                    <Route path="notifications" element={
                        <ProtectedRoute>
                            <NotificationsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="explore" element={<ExplorePage />} />
                    <Route path="messages" element={
                        <ProtectedRoute>
                            <MessagesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="feeds" element={<FeedsPage />} />
                    <Route path="feeds/settings" element={
                        <ProtectedRoute>
                            <ManageFeedsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="feeds/:feedId" element={<FeedDetailPage />} />
                    <Route path="lists" element={<ListsPage />} />
                    <Route path="lists/:id" element={<ListDetailPage />} />
                    <Route path="saved" element={
                        <ProtectedRoute>
                            <SavedPage />
                        </ProtectedRoute>
                    } />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="interests" element={
                        <ProtectedRoute>
                            <MyInterestsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="tag/:tag" element={<TagPage />} />
                    <Route path="profile/:handle/post/:postId" element={<PostDetailPage />} />
                    <Route path="profile/:handle/post/:postId/media/:index" element={<MediaViewerPage />} />
                    <Route path="settings" element={
                        <ProtectedRoute>
                            <SettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/account" element={
                        <ProtectedRoute>
                            <AccountSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/privacy" element={
                        <ProtectedRoute>
                            <PrivacySettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/privacy/app-passwords" element={
                        <ProtectedRoute>
                            <AppPasswordsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/privacy/post-notifications" element={
                        <ProtectedRoute>
                            <PostNotificationSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/moderation" element={
                        <ProtectedRoute>
                            <ModerationSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/moderation/interaction" element={
                        <ProtectedRoute>
                            <ModerationInteractionPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/moderation/muted-words" element={
                        <ProtectedRoute>
                            <MutedWordsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/moderation/lists" element={
                        <ProtectedRoute>
                            <ModerationListsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/moderation/muted-accounts" element={
                        <ProtectedRoute>
                            <MutedAccountsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/moderation/blocked-accounts" element={
                        <ProtectedRoute>
                            <BlockedAccountsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/moderation/verification" element={
                        <ProtectedRoute>
                            <VerificationSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/notifications" element={
                        <ProtectedRoute>
                            <NotificationSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/notifications/:type" element={
                        <ProtectedRoute>
                            <NotificationTypeSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/appearance" element={
                        <ProtectedRoute>
                            <AppearancePage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/language" element={
                        <ProtectedRoute>
                            <LanguagePage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/about" element={
                        <ProtectedRoute>
                            <AboutPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/accessibility" element={
                        <ProtectedRoute>
                            <AccessibilityPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/content" element={
                        <ProtectedRoute>
                            <ContentSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/content/discussion" element={
                        <ProtectedRoute>
                            <DiscussionSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/content/following-feed" element={
                        <ProtectedRoute>
                            <FollowingFeedSettingsPage />
                        </ProtectedRoute>
                    } />
                    <Route path="settings/content/external-media" element={
                        <ProtectedRoute>
                            <ExternalMediaPage />
                        </ProtectedRoute>
                    } />
                </Route>

                {/* Non-Layout Pages */}
                <Route path="/about/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/profile" element={<Navigate to={`/profile/${currentUser?.handle || 'unknown'}`} replace />} />
                <Route path="/support" element={<SubmitRequestPage />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboardPage />} />
                    <Route path="users" element={<UserManagementPage />} />
                    <Route path="posts" element={<PostManagementPage />} />
                    <Route path="feeds" element={<FeedManagementPage />} />
                    <Route path="interests" element={<InterestManagementPage />} />
                    <Route path="hashtags" element={<HashtagManagementPage />} />
                    <Route path="lists" element={<ListManagementPage />} />
                    <Route path="conversations" element={<ConversationManagementPage />} />
                    <Route path="moderation" element={<ModerationPage />} />
                    <Route path="notifications" element={<NotificationManagementPage />} />
                    <Route path="support" element={<SupportManagementPage />} />
                    <Route path="pages" element={<PageContentManagementPage />} />
                </Route>

                {/* Auth Routes reachable via MainLayout or standalone */}
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

                {/* Chat Page - No Bottom Nav on mobile */}
                <Route path="/messages/:conversationId" element={
                    <MainLayout hideTopBar={true} hideBottomNav={true}>
                        <ChatPage />
                    </MainLayout>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </LazyErrorBoundary>
    );
};

export default AppRoutes;
