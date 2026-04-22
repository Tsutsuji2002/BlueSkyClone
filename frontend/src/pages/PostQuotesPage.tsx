import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchPostById, fetchPostQuotes } from '../redux/slices/postsSlice';
import { RootState } from '../redux/store';
import PostCard from '../components/feed/PostCard';

const INITIAL_LIMIT = 20;
const NEXT_LIMIT = 20;

const PostQuotesPage: React.FC = () => {
    const { handle, postId } = useParams<{ handle: string; postId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const post = useAppSelector((s: RootState) =>
        s.posts.posts.find(p => p.tid === postId || p.id === postId)
    );

    const [quotes, setQuotes] = useState<any[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    const observerTarget = useRef<HTMLDivElement>(null);
    const postUri = post?.uri;

    useDocumentTitle(post ? `${t('post.quotes', 'Quotes')} · ${post.quotesCount} ${t('post.quotes', 'Quotes')}` : t('post.quotes', 'Quotes'));

    // Load the post if we don't have it
    useEffect(() => {
        if (!post && postId) {
            dispatch(fetchPostById({ id: postId }));
        }
    }, [dispatch, post, postId]);

    // Initial fetch once we have the URI
    useEffect(() => {
        if (!postUri || quotes.length > 0) return;
        setLoading(true);
        dispatch(fetchPostQuotes({ postUri, limit: INITIAL_LIMIT }))
            .unwrap()
            .then(({ posts: fetched, cursor: nextCursor, hasMore: more }) => {
                setQuotes(fetched);
                setCursor(nextCursor);
                setHasMore(more);
            })
            .finally(() => setLoading(false));
    }, [dispatch, postUri]);

    // Infinite scroll
    useEffect(() => {
        if (!hasMore || loading || !cursor || !postUri) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setLoading(true);
                    dispatch(fetchPostQuotes({ postUri, cursor, limit: NEXT_LIMIT }))
                        .unwrap()
                        .then(({ posts: fetched, cursor: nextCursor, hasMore: more }) => {
                            setQuotes(prev => {
                                const ids = new Set(prev.map(p => p.id));
                                const unique = fetched.filter(p => !ids.has(p.id));
                                return [...prev, ...unique];
                            });
                            setCursor(nextCursor);
                            setHasMore(more);
                        })
                        .finally(() => setLoading(false));
                }
            },
            { rootMargin: '600px', threshold: 0 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [dispatch, hasMore, loading, cursor, postUri]);

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-4 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    >
                        <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900 dark:text-dark-text">
                            {t('post.quotes', 'Quotes')}
                        </h1>
                        {post && (
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                <FiMessageSquare size={12} className="inline mr-1" />
                                {post.quotesCount} {t('post.quotes', 'quotes')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quotes List */}
            <div className="divide-y divide-gray-100 dark:divide-dark-border/50">
                {quotes.map(quotePost => (
                    <PostCard key={quotePost.id} post={quotePost} />
                ))}

                {/* Loading state placeholders could go here */}
                {loading && (
                    <div className="p-4 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && quotes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-dark-text-secondary">
                        <FiMessageSquare size={40} className="mb-3 opacity-40" />
                        <p className="font-medium">{t('post.no_quotes', 'No quotes yet')}</p>
                    </div>
                )}

                {/* Infinite scroll target */}
                <div ref={observerTarget} className="h-4" />
            </div>
        </div>
    );
};

export default PostQuotesPage;
