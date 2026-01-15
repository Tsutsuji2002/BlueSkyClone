import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';
import HomePage from '../pages/HomePage';
import ProfilePage from '../pages/ProfilePage';
import SampleProfilePage from '../pages/SampleProfilePage';
import FollowersPage from '../pages/FollowersPage';
import FollowingPage from '../pages/FollowingPage';
import NotificationsPage from '../pages/NotificationsPage';
import ExplorePage from '../pages/ExplorePage';
import MessagesPage from '../pages/MessagesPage';
import ChatPage from '../pages/ChatPage';
import FeedsPage from '../pages/FeedsPage';
import ManageFeedsPage from '../pages/ManageFeedsPage';
import FeedDetailPage from '../pages/FeedDetailPage';
import ListsPage from '../pages/ListsPage';
import ListDetailPage from '../pages/ListDetailPage';
import SavedPage from '../pages/SavedPage';

// Settings Pages
import SettingsPage from '../pages/SettingsPage';
import AccountSettingsPage from '../pages/AccountSettingsPage';
import PrivacySettingsPage from '../pages/PrivacySettingsPage';
import AppPasswordsPage from '../pages/AppPasswordsPage';
import PostNotificationSettingsPage from '../pages/PostNotificationSettingsPage';
import NotificationSettingsPage from '../pages/NotificationSettingsPage';
import NotificationTypeSettingsPage from '../pages/NotificationTypeSettingsPage';
import AppearancePage from '../pages/AppearancePage';
import LanguagePage from '../pages/LanguagePage';
import AboutPage from '../pages/AboutPage';
import AccessibilityPage from '../pages/AccessibilityPage';
import MyInterestsPage from '../pages/InterestsPage';
import ContentSettingsPage from '../pages/ContentSettingsPage';
import DiscussionSettingsPage from '../pages/DiscussionSettingsPage';
import FollowingFeedSettingsPage from '../pages/FollowingFeedSettingsPage';
import ExternalMediaPage from '../pages/ExternalMediaPage';

// Moderation Pages
import ModerationSettingsPage from '../pages/ModerationSettingsPage';
import ModerationInteractionPage from '../pages/ModerationInteractionPage';
import MutedWordsPage from '../pages/MutedWordsPage';
import ModerationListsPage from '../pages/ModerationListsPage';
import MutedAccountsPage from '../pages/MutedAccountsPage';
import BlockedAccountsPage from '../pages/BlockedAccountsPage';
import VerificationSettingsPage from '../pages/VerificationSettingsPage';

import TrendingPage from '../pages/TrendingPage';
import PostDetailPage from '../pages/PostDetailPage';
import SubmitRequestPage from '../pages/SubmitRequestPage';
import AdminLayout from '../components/layout/AdminLayout';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import PostManagementPage from '../pages/admin/PostManagementPage';
import FeedManagementPage from '../pages/admin/FeedManagementPage';
import InterestManagementPage from '../pages/admin/InterestManagementPage';

const AppRoutes: React.FC = () => {
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<Navigate to={`/profile/${currentUser?.handle || 'unknown'}`} replace />} />
            <Route path="/profile/:handle" element={<ProfilePage />} />
            <Route path="/profile/user/:userId" element={<SampleProfilePage />} />
            <Route path="/profile/user/:userId/followers" element={<FollowersPage />} />
            <Route path="/profile/user/:userId/following" element={<FollowingPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<ChatPage />} />
            <Route path="/feeds" element={<FeedsPage />} />
            <Route path="/feeds/settings" element={<ManageFeedsPage />} />
            <Route path="/feeds/:feedId" element={<FeedDetailPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/lists/:id" element={<ListDetailPage />} />
            <Route path="/saved" element={<SavedPage />} />

            {/* Settings Routes */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/account" element={<AccountSettingsPage />} />
            <Route path="/settings/privacy" element={<PrivacySettingsPage />} />
            <Route path="/settings/privacy/app-passwords" element={<AppPasswordsPage />} />
            <Route path="/settings/privacy/post-notifications" element={<PostNotificationSettingsPage />} />

            <Route path="/settings/moderation" element={<ModerationSettingsPage />} />
            <Route path="/settings/moderation/interaction" element={<ModerationInteractionPage />} />
            <Route path="/settings/moderation/muted-words" element={<MutedWordsPage />} />
            <Route path="/settings/moderation/lists" element={<ModerationListsPage />} />
            <Route path="/settings/moderation/muted-accounts" element={<MutedAccountsPage />} />
            <Route path="/settings/moderation/blocked-accounts" element={<BlockedAccountsPage />} />
            <Route path="/settings/moderation/verification" element={<VerificationSettingsPage />} />

            <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
            <Route path="/settings/notifications/:type" element={<NotificationTypeSettingsPage />} />
            <Route path="/settings/appearance" element={<AppearancePage />} />
            <Route path="/settings/language" element={<LanguagePage />} />
            <Route path="/settings/about" element={<AboutPage />} />
            <Route path="/settings/accessibility" element={<AccessibilityPage />} />

            <Route path="/settings/content" element={<ContentSettingsPage />} />
            <Route path="/settings/content/discussion" element={<DiscussionSettingsPage />} />
            <Route path="/settings/content/following-feed" element={<FollowingFeedSettingsPage />} />
            <Route path="/settings/content/external-media" element={<ExternalMediaPage />} />

            <Route path="/interests" element={<MyInterestsPage />} />
            <Route path="/trending/:topic" element={<TrendingPage />} />
            <Route path="/profile/:handle/post/:postId" element={<PostDetailPage />} />
            <Route path="/support" element={<SubmitRequestPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="users" element={<UserManagementPage />} />
                <Route path="posts" element={<PostManagementPage />} />
                <Route path="feeds" element={<FeedManagementPage />} />
                <Route path="interests" element={<InterestManagementPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
