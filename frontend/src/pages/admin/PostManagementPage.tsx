import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiExternalLink, FiMessageSquare, FiSearch, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/common/Avatar';
import { API_BASE_URL } from '../../constants';
import { AdminPost, PaginatedResult } from '../../types/admin';
import { adminService } from '../../services/adminService';
import ConfirmModal from '../../components/common/ConfirmModal';

const PostManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [skip, setSkip] = useState(0);
    const [take] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all');
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'hide' | 'permanent_delete';
        postId: string;
    }>({ isOpen: false, type: 'hide', postId: '' });

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

    const fetchPosts = useCallback(async (currentSkip: number, isNewSearch: boolean = false) => {
        setLoading(true);
        try {
            const onlyDeleted = filter === 'deleted';
            const includeDeleted = filter === 'all' || onlyDeleted;
            const data = await adminService.getPosts(currentSkip, take, searchQuery, includeDeleted, onlyDeleted);

            const filteredItems = data.items;

            if (isNewSearch) {
                setPosts(filteredItems);
            } else {
                setPosts(prev => [...prev, ...filteredItems]);
            }
            setHasMore(data.items.length === take);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    }, [take, searchQuery, filter]);

    // Initial load and search/filter change
    useEffect(() => {
        setSkip(0);
        setPosts([]);
        fetchPosts(0, true);
    }, [searchQuery, filter, fetchPosts]);

    // Load more when skip changes
    useEffect(() => {
        if (skip > 0) {
            fetchPosts(skip);
        }
    }, [skip, fetchPosts]);

    const handleHide = async () => {
        const postId = confirmModal.postId;
        if (!postId) return;

        try {
            await adminService.hidePost(postId);
            if (filter === 'active') {
                setPosts(prev => prev.filter(p => p.id !== postId));
            } else {
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, isDeleted: true } : p));
            }
        } catch (error) {
            console.error('Failed to hide post:', error);
            alert(t('admin.posts.hide_failed', 'Failed to hide post'));
        }
    };

    const handlePermanentDelete = async () => {
        const postId = confirmModal.postId;
        if (!postId) return;

        try {
            await adminService.deletePostPermanent(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert(t('admin.posts.delete_failed', 'Failed to delete post'));
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

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
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

                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-dark-bg rounded-lg w-fit">
                    {(['active', 'deleted', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filter === f
                                ? 'bg-white dark:bg-dark-surface text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-dark-text'
                                }`}
                        >
                            {t(`admin.posts.filter_${f}`, f.charAt(0).toUpperCase() + f.slice(1))}
                        </button>
                    ))}
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
                            className={`bg-white dark:bg-dark-surface rounded-xl border p-6 hover:shadow-md transition-shadow cursor-pointer ${post.isDeleted ? 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-dark-border'
                                }`}
                            onClick={() => setSelectedPost(post)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar src={post.authorAvatarUrl} alt={post.authorHandle} size="md" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900 dark:text-dark-text">
                                                {post.authorDisplayName || post.authorHandle}
                                            </span>
                                            {post.isDeleted && (
                                                <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded uppercase">
                                                    {t('admin.posts.status_deleted', 'Deleted')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                            @{post.authorHandle} · {formatDate(post.createdAt)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => navigate(`/profile/${post.authorHandle}/post/${post.id}`)}
                                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                        title={t('admin.posts.view_post')}
                                    >
                                        <FiExternalLink size={18} />
                                    </button>

                                    {!post.isDeleted ? (
                                        <button
                                            onClick={() => setConfirmModal({ isOpen: true, type: 'hide', postId: post.id })}
                                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                            title={t('admin.posts.hide_post', 'Hide Post')}
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmModal({ isOpen: true, type: 'permanent_delete', postId: post.id })}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title={t('admin.posts.permanent_delete', 'Delete Permanently')}
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-gray-800 dark:text-dark-text mb-2 whitespace-pre-wrap line-clamp-3">
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
                                {post.mediaUrls && post.mediaUrls.length > 0 && (
                                    <div className="flex items-center gap-1 text-primary-500 font-medium">
                                        <span>🖼️</span>
                                        <span>{post.mediaUrls.length} {t('admin.posts.media', 'Media')}</span>
                                    </div>
                                )}
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

            {/* Post Detail Modal */}
            {selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPost(null)}>
                    <div
                        className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Avatar src={selectedPost.authorAvatarUrl} alt={selectedPost.authorHandle} size="lg" />
                                    <div>
                                        <div className="font-bold text-lg text-gray-900 dark:text-dark-text">
                                            {selectedPost.authorDisplayName || selectedPost.authorHandle}
                                        </div>
                                        <div className="text-gray-500 dark:text-dark-text-secondary">
                                            @{selectedPost.authorHandle} · {formatDate(selectedPost.createdAt)}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-full transition-colors"
                                >
                                    <FiX size={24} />
                                </button>
                            </div>

                            <p className="text-gray-900 dark:text-dark-text text-lg mb-6 whitespace-pre-wrap">
                                {selectedPost.content}
                            </p>

                            {((selectedPost.mediaUrls && selectedPost.mediaUrls.length > 0) || selectedPost.videoUrl) && (
                                <div className="space-y-4 mb-6">
                                    {selectedPost.mediaUrls.map((url, i) => (
                                        <div key={i} className="rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-bg">
                                            <img
                                                src={url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '').replace(/\/$/, '')}/${url.startsWith('/') ? url.slice(1) : url}`}
                                                alt={`Media ${i + 1}`}
                                                className="w-full h-auto max-h-[500px] object-contain"
                                            />
                                        </div>
                                    ))}
                                    {selectedPost.videoUrl && (
                                        <div className="rounded-xl overflow-hidden bg-black aspect-video">
                                            <video
                                                src={selectedPost.videoUrl.startsWith('http') ? selectedPost.videoUrl : `${API_BASE_URL.replace('/api', '').replace(/\/$/, '')}/${selectedPost.videoUrl.startsWith('/') ? selectedPost.videoUrl.slice(1) : selectedPost.videoUrl}`}
                                                controls
                                                className="w-full h-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedPost.linkUrl && (
                                <a
                                    href={selectedPost.linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block mb-6 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                                >
                                    {selectedPost.linkImage && (
                                        <img
                                            src={selectedPost.linkImage.startsWith('http') ? selectedPost.linkImage : `${API_BASE_URL.replace('/api', '').replace(/\/$/, '')}/${selectedPost.linkImage.startsWith('/') ? selectedPost.linkImage.slice(1) : selectedPost.linkImage}`}
                                            alt={selectedPost.linkTitle || ''}
                                            className="w-full h-48 object-cover"
                                        />
                                    )}
                                    <div className="p-4">
                                        <h4 className="font-bold text-gray-900 dark:text-dark-text mb-1 line-clamp-1">{selectedPost.linkTitle}</h4>
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary line-clamp-2">{selectedPost.linkDescription}</p>
                                        <span className="text-xs text-primary-500 mt-2 block truncate">{selectedPost.linkUrl}</span>
                                    </div>
                                </a>
                            )}

                            <div className="flex items-center gap-10 py-4 border-t border-gray-100 dark:border-dark-border text-gray-500 dark:text-dark-text-secondary">
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl mb-1">❤️</span>
                                    <span className="font-bold text-gray-900 dark:text-dark-text">{selectedPost.likesCount}</span>
                                    <span className="text-xs">{t('admin.posts.likes', 'Likes')}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-2xl mb-1">🔄</span>
                                    <span className="font-bold text-gray-900 dark:text-dark-text">{selectedPost.repostsCount}</span>
                                    <span className="text-xs">{t('admin.posts.reposts', 'Reposts')}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <FiMessageSquare size={24} className="mb-1" />
                                    <span className="font-bold text-gray-900 dark:text-dark-text">{selectedPost.repliesCount}</span>
                                    <span className="text-xs">{t('admin.posts.replies', 'Replies')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.type === 'hide' ? handleHide : handlePermanentDelete}
                title={confirmModal.type === 'hide' ? t('admin.posts.hide_confirm_title', 'Hide Post') : t('admin.posts.delete_permanent_title', 'Permanently Delete Post')}
                message={confirmModal.type === 'hide'
                    ? t('admin.posts.hide_confirm', 'Are you sure you want to hide this post?')
                    : t('admin.posts.delete_permanent_confirm', 'Are you sure you want to PERMANENTLY delete this post? This cannot be undone.')
                }
                confirmLabel={confirmModal.type === 'hide' ? t('admin.posts.hide_post', 'Hide Post') : t('common.delete')}
                variant={confirmModal.type === 'hide' ? 'primary' : 'danger'}
            />
        </div>
    );
};

export default PostManagementPage;
