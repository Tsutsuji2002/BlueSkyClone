import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiExternalLink, FiMessageSquare, FiSearch } from 'react-icons/fi';
import { API_BASE_URL } from '../../constants';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/common/Avatar';

interface AdminPost {
    id: string;
    tid: string;
    content: string;
    authorHandle: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
    likesCount: number;
    repostsCount: number;
    repliesCount: number;
    createdAt: string;
}

interface PaginatedResult {
    items: AdminPost[];
    total: number;
    skip: number;
    take: number;
}

const PostManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [take] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Observer for infinite scroll
    const observer = useRef<IntersectionObserver | null>(null);
    const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setSkip(prevSkip => prevSkip + take);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, take]);

    const fetchPosts = async (currentSkip: number, isNewSearch: boolean = false) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                skip: currentSkip.toString(),
                take: take.toString(),
                ...(searchQuery && { search: searchQuery })
            });

            const response = await fetch(`${API_BASE_URL}/admin/posts?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data: PaginatedResult = await response.json();
                if (isNewSearch) {
                    setPosts(data.items);
                } else {
                    setPosts(prev => [...prev, ...data.items]);
                }
                setTotal(data.total);
                setHasMore(data.items.length === take && (currentSkip + take) < data.total);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load and search
    useEffect(() => {
        setSkip(0);
        setPosts([]);
        fetchPosts(0, true);
    }, [searchQuery]);

    // Load more when skip changes
    useEffect(() => {
        if (skip > 0) {
            fetchPosts(skip);
        }
    }, [skip]);

    const handleDelete = async (postId: string) => {
        if (!window.confirm(t('admin.posts.delete_confirm'))) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/admin/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Remove from local state
                setPosts(prev => prev.filter(p => p.id !== postId));
                setTotal(prev => prev - 1);
            }
        } catch (error) {
            console.error('Failed to delete post:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">{t('admin.posts.title')}</h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">{t('admin.posts.desc')}</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.posts.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
                {posts.map((post, index) => {
                    const isLastElement = posts.length === index + 1;
                    return (
                        <div
                            key={post.id}
                            ref={isLastElement ? lastPostElementRef : null}
                            className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar src={post.authorAvatarUrl} alt={post.authorHandle} size="md" />
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-dark-text">
                                            {post.authorDisplayName || post.authorHandle}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                            @{post.authorHandle} · {formatDate(post.createdAt)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/profile/${post.authorHandle}/post/${post.tid}`)}
                                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                        title={t('admin.posts.view_post')}
                                    >
                                        <FiExternalLink size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title={t('admin.posts.delete_post')}
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-gray-800 dark:text-dark-text mb-4 whitespace-pre-wrap">
                                {post.content}
                            </p>

                            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-dark-text-secondary">
                                <div className="flex items-center gap-1">
                                    <FiMessageSquare size={16} />
                                    <span>{post.repliesCount}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>❤️</span>
                                    <span>{post.likesCount}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>🔄</span>
                                    <span>{post.repostsCount}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {loading && (
                    <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
                        {t('admin.posts.loading')}
                    </div>
                )}

                {!loading && posts.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-dark-text-secondary">
                        {t('admin.posts.no_posts')}
                    </div>
                )}
            </div>

            {!loading && hasMore && (
                <div className="text-center py-4">
                    <button
                        onClick={() => setSkip(prev => prev + take)}
                        className="text-primary-500 font-medium hover:underline"
                    >
                        {t('admin.posts.load_more')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PostManagementPage;
