import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import PostCard from './PostCard';
import { Post } from '../../types';
import { FiBookmark } from 'react-icons/fi';

interface FeedProps {
    posts?: Post[]; // Optional prop to override Redux posts
    isLoading?: boolean; // NEW: explicit loading state
}

const Feed: React.FC<FeedProps> = ({ posts: propPosts, isLoading: propLoading }) => {
    const { t } = useTranslation();
    const reduxPosts = useAppSelector((state) => state.posts.posts);
    const reduxLoading = useAppSelector((state) => state.posts.isLoading);
    const currentUser = useAppSelector((state) => state.auth.user);

    const isLoading = propLoading !== undefined ? propLoading : reduxLoading;

    // Use provided posts or fall back to Redux posts, and filter out soft-deleted posts
    const allPosts = propPosts !== undefined ? propPosts : reduxPosts;
    const posts = allPosts.filter(post => !post.isDeleted);

    if (isLoading && posts.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FiBookmark size={48} className="text-gray-300 dark:text-dark-border mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                    {t('feeds.no_posts')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                    {t('feeds.no_posts_desc')}
                </p>
            </div>
        );
    }

    return (
        <div>
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                />
            ))}
        </div>
    );
};

export default Feed;
