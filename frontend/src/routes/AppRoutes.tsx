import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';
import AdminLayout from '../components/layout/AdminLayout';
import MainLayout from '../components/layout/MainLayout';
import LoadingIndicator from '../components/common/LoadingIndicator';
import LazyErrorBoundary from '../components/common/LazyErrorBoundary';

// Lazy Load Pages
const HomePage = React.lazy(() => import('../pages/HomePage'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
const SampleProfilePage = React.lazy(() => import('../pages/SampleProfilePage'));
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
                    <Route path="/" element={
                        <Suspense fallback={null}>
                            <MainLayout hideTopBar={true} />
                        </Suspense>
                    }>
                        <Route index element={<HomePage />} />
                        <Route path="profile/:handle" element={<ProfilePage />} />
                        <Route path="profile/:handle/followers" element={<FollowersPage />} />
                        <Route path="profile/:handle/following" element={<FollowingPage />} />
                        <Route path="profile/user/:userId" element={<SampleProfilePage />} />
                        <Route path="profile/user/:userId/followers" element={<FollowersPage />} />
                        <Route path="profile/user/:userId/following" element={<FollowingPage />} />
                        <Route path="notifications" element={<NotificationsPage />} />
                        <Route path="explore" element={<ExplorePage />} />
                        <Route path="messages" element={<MessagesPage />} />
                        <Route path="messages/:conversationId" element={<ChatPage />} />
                        <Route path="feeds" element={<FeedsPage />} />
                        <Route path="feeds/settings" element={<ManageFeedsPage />} />
                        <Route path="feeds/:feedId" element={<FeedDetailPage />} />
                        <Route path="lists" element={<ListsPage />} />
                        <Route path="lists/:id" element={<ListDetailPage />} />
                        <Route path="saved" element={<SavedPage />} />
                        <Route path="search" element={<SearchPage />} />
                        <Route path="interests" element={<MyInterestsPage />} />
                        <Route path="tag/:tag" element={<TagPage />} />
                        <Route path="profile/:handle/post/:postId" element={<PostDetailPage />} />
                        <Route path="profile/:handle/post/:postId/media/:index" element={<MediaViewerPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="settings/account" element={<AccountSettingsPage />} />
                        <Route path="settings/privacy" element={<PrivacySettingsPage />} />
                        <Route path="settings/privacy/app-passwords" element={<AppPasswordsPage />} />
                        <Route path="settings/privacy/post-notifications" element={<PostNotificationSettingsPage />} />
                        <Route path="settings/moderation" element={<ModerationSettingsPage />} />
                        <Route path="settings/moderation/interaction" element={<ModerationInteractionPage />} />
                        <Route path="settings/moderation/muted-words" element={<MutedWordsPage />} />
                        <Route path="settings/moderation/lists" element={<ModerationListsPage />} />
                        <Route path="settings/moderation/muted-accounts" element={<MutedAccountsPage />} />
                        <Route path="settings/moderation/blocked-accounts" element={<BlockedAccountsPage />} />
                        <Route path="settings/moderation/verification" element={<VerificationSettingsPage />} />
                        <Route path="settings/notifications" element={<NotificationSettingsPage />} />
                        <Route path="settings/notifications/:type" element={<NotificationTypeSettingsPage />} />
                        <Route path="settings/appearance" element={<AppearancePage />} />
                        <Route path="settings/language" element={<LanguagePage />} />
                        <Route path="settings/about" element={<AboutPage />} />
                        <Route path="settings/accessibility" element={<AccessibilityPage />} />
                        <Route path="settings/content" element={<ContentSettingsPage />} />
                        <Route path="settings/content/discussion" element={<DiscussionSettingsPage />} />
                        <Route path="settings/content/following-feed" element={<FollowingFeedSettingsPage />} />
                        <Route path="settings/content/external-media" element={<ExternalMediaPage />} />
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
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
        </LazyErrorBoundary>
    );
};

export default AppRoutes;
