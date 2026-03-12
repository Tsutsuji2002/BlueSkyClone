import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCandidatePosts, addListPost, clearCandidatePosts, fetchListFeed } from '../../redux/slices/listsSlice';
import { FiX, FiVideo } from 'react-icons/fi';
import { Post } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { API_BASE_URL } from '../../constants';

interface AddPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    listId: string;
}

const AddPostModal: React.FC<AddPostModalProps> = ({ isOpen, onClose, listId }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { candidatePosts, activeListFeed, isLoading } = useAppSelector(state => state.lists);
    const { user: currentUser } = useAppSelector(state => state.auth);

    const [addingMap, setAddingMap] = useState<Record<string, boolean>>({});
    const [addedPostIds, setAddedPostIds] = useState<Set<string>>(new Set());
    const [offset, setOffset] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasFetchedCandidate, setHasFetchedCandidate] = useState(false);

    // Filter out posts already in the list and posts just added in this session
    const filteredCandidatePosts = useMemo(() => {
        const existingPostIds = new Set(activeListFeed.map(p => p.id));
        return candidatePosts.filter(post =>
            !existingPostIds.has(post.id) && !addedPostIds.has(post.id)
        );
    }, [candidatePosts, activeListFeed, addedPostIds]);

    useEffect(() => {
        if (isOpen && currentUser) {
            const loadData = async () => {
                setOffset(0);
                setAddedPostIds(new Set()); // Reset added posts when modal opens
                setIsProcessing(false);
                setHasFetchedCandidate(false);
                dispatch(clearCandidatePosts());
                try {
                    await dispatch(fetchCandidatePosts({ listId, userId: currentUser.id, limit: 10, offset: 0 })).unwrap();
                } finally {
                    setHasFetchedCandidate(true);
                }
            };
            loadData();
        }
    }, [isOpen, currentUser, dispatch, listId]);

    const handleLoadMore = () => {
        if (!currentUser) return;
        const newOffset = offset + 10;
        setOffset(newOffset);
        dispatch(fetchCandidatePosts({ listId, userId: currentUser.id, limit: 10, offset: newOffset }));
    };

    const handleAddPost = async (post: Post) => {
        setAddingMap(prev => ({ ...prev, [post.id]: true }));
        setIsProcessing(true);
        try {
            await dispatch(addListPost({ listId, postId: post.id })).unwrap();

            // Show "Adding..." state in the button but don't close immediately
            // Reload the list feed and WAIT for it to complete
            await dispatch(fetchListFeed(listId)).unwrap();

            // Smaller artificial delay to ensure UI has time to process
            await new Promise(resolve => setTimeout(resolve, 500));

            setIsProcessing(false);
            onClose();
        } catch (err) {
            setAddingMap(prev => ({ ...prev, [post.id]: false }));
            setIsProcessing(false);
        }
    };

    const resolveUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${API_BASE_URL.replace(/\/api$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const renderPostPreview = (post: Post) => {
        let caption = post.content || '';
        if (caption) {
            const parts = caption.split(/[.!?]/);
            caption = parts[0];
            if (caption.length > 50) caption = caption.substring(0, 50) + '...';
        } else if (post.linkPreview) {
            caption = post.linkPreview.title || post.linkPreview.url;
        }

        // Determine if post has media to show
        const hasImages = (post.images?.length || 0) > 0;
        const hasVideo = post.video || (post.videoUrl && post.videoUrl.length > 0);

        const isVideoFile = (url: string) => {
            if (!url) return false;
            const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
            const urlWithoutQuery = url.split('?')[0].toLowerCase();
            return videoExtensions.some(ext => urlWithoutQuery.endsWith(ext));
        };

        // Try to get a thumbnail: first from images, then from video object
        // Safety: ensure images[0] is not actually a video file
        let thumbnailSrc = (hasImages && !isVideoFile(post.images![0]?.url)) ? post.images![0]?.url : null;
        if (!thumbnailSrc && post.video?.thumbnail) {
            thumbnailSrc = post.video.thumbnail;
        }

        // If still no thumbnail but has video, use video URL itself as thumbnail if it's a video file (browser might handle it)
        // or just let the FiVideo icon handle it.
        const isThumbnailActuallyVideo = thumbnailSrc ? isVideoFile(thumbnailSrc) : false;
        if (isThumbnailActuallyVideo) thumbnailSrc = null;

        return (
            <div key={post.id} className={`p-3 border rounded-lg border-gray-200 dark:border-dark-border mb-2 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                        <div className="font-medium italic mb-1">"{caption}"</div>
                        <div className="text-xs text-gray-400">{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ''}</div>
                    </div>
                    <button
                        onClick={() => handleAddPost(post)}
                        disabled={addingMap[post.id] || isProcessing}
                        className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-full text-xs font-bold transition-colors disabled:opacity-50"
                    >
                        {addingMap[post.id] ? (
                            <div className="animate-spin w-3 h-3 border-2 border-white rounded-full border-t-transparent" />
                        ) : (
                            t('lists.add')
                        )}
                    </button>
                </div>

                {/* Show thumbnail if available */}
                {thumbnailSrc ? (
                    <div className="relative mt-2 h-16 w-16 rounded overflow-hidden">
                        <img
                            src={resolveUrl(thumbnailSrc)}
                            alt=""
                            className="w-full h-full object-cover bg-gray-100 border border-gray-100 dark:border-dark-border"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                        {hasVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <FiVideo size={12} className="text-white drop-shadow-md" />
                            </div>
                        )}
                    </div>
                ) : hasVideo ? (
                    /* Show generic video indicator if no thumbnail */
                    <div className="mt-2 h-16 w-16 bg-gray-200 dark:bg-dark-hover rounded flex items-center justify-center border border-gray-100 dark:border-dark-border">
                        <FiVideo size={24} className="text-gray-500" />
                    </div>
                ) : null}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-dark-elem w-full max-w-md rounded-xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col relative">
                {isProcessing && (
                    <div className="absolute inset-0 z-10 bg-white/50 dark:bg-dark-elem/50 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 rounded-full border-t-transparent" />
                        <span className="font-bold text-gray-900 dark:text-dark-text">{t('common.adding')}</span>
                    </div>
                )}

                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                            {t('lists.select_post')}
                        </h2>
                        {isLoading && !isProcessing && (
                            <div className="animate-spin w-4 h-4 border-2 border-primary-500 rounded-full border-t-transparent" />
                        )}
                    </div>
                    <button onClick={onClose} disabled={isProcessing} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full disabled:opacity-30">
                        <FiX size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {!hasFetchedCandidate ? (
                        <div className="py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin w-6 h-6 border-2 border-primary-500 rounded-full border-t-transparent" />
                                <span>{t('lists.loading_posts')}</span>
                            </div>
                        </div>
                    ) : filteredCandidatePosts.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 rounded-full border-t-transparent" />
                                    <span>{t('lists.loading_posts')}</span>
                                </div>
                            ) : (
                                t('lists.no_posts_available')
                            )}
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">{t('lists.your_recent_posts')}</p>
                            {filteredCandidatePosts.map(post => renderPostPreview(post))}
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading || isProcessing}
                                className="w-full py-2 mt-2 text-sm text-primary-500 hover:bg-gray-50 dark:hover:bg-dark-border rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoading ? t('common.loading') : t('common.show_more')}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddPostModal;
