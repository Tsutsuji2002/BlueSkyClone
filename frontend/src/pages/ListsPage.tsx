import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchMyLists, fetchListsIAmOn, createList } from '../redux/slices/listsSlice';
import CreateListModal from '../components/lists/CreateListModal';
import { useNavigate, Link } from 'react-router-dom';
import { FiPlus, FiArrowLeft } from 'react-icons/fi';
import { CreateListDto } from '../types';
import ListAvatar from '../components/common/ListAvatar';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ListsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { myLists, listsIAmOn, isLoading, error } = useAppSelector(state => state.lists);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchMyLists());
    }, [dispatch]);

    const handleCreateList = async (data: CreateListDto) => {
        await dispatch(createList(data)).unwrap();
    };

    useDocumentTitle(t('lists.title'));

    return (
        <>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                            >
                                <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('lists.title')}
                            </h1>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-full font-bold text-sm transition-colors"
                        >
                            + {t('common.new')}
                        </button>
                    </div>
                </div>


                {/* Debug Error Reporting */}
                {error && (
                    <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h2 className="text-red-600 dark:text-red-400 font-bold mb-2">Backend Fetch Failed</h2>
                        <div className="text-sm text-red-500 dark:text-red-300">
                             The server is returning an empty result. This usually means the ATProto actor resolution failed or the session expired.
                        </div>
                    </div>
                )}

                {
                    (isLoading && myLists.length === 0) ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                        </div>
                    ) : myLists.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <p className="text-gray-500 max-w-xs mx-auto">
                                No lists found on your Bluesky account.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-dark-border">
                            {myLists.map(list => (
                                <Link
                                    key={list.uri || list.id}
                                    to={list.uri ? `/profile/${list.creator?.handle || list.owner?.handle || 'me'}/lists/${encodeURIComponent(list.uri.split('/').pop() || '')}` : `/lists/${list.id}`}
                                    className="block p-4 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                                >
                                    <div className="flex flex-row items-start gap-3">
                                        <div className="shrink-0" style={{ width: '40px', height: '40px' }}>
                                            <ListAvatar src={list.avatar || list.avatarUrl} alt={list.name} size="lg" />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                            <h3 className="font-bold truncate" style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '20px' }}>
                                                {list.name}
                                            </h3>
                                            <div className="truncate" style={{ fontSize: '13.1px', color: 'var(--text-secondary)', lineHeight: '17px' }}>
                                                {list.creator ? (
                                                    <span>List by @{list.creator.handle || list.creator.displayName}</span>
                                                ) : list.owner && (
                                                    <span>List by @{list.owner.handle}</span>
                                                )}
                                            </div>
                                            {list.description && (
                                                <div className="mt-1 line-clamp-2" style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '20px' }}>
                                                    {list.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                }

            </div >


            <CreateListModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateList}
            />
        </>
    );
};

export default ListsPage;
