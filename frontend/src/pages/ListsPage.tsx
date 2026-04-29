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
    const [activeTab, setActiveTab] = useState<'my' | 'joined'>('my');

    useEffect(() => {
        dispatch(fetchMyLists());
        dispatch(fetchListsIAmOn());
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
                                <FiArrowLeft size={22} className="text-gray-700 dark:text-dark-text" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('lists.title')}
                            </h1>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-dark-surface dark:hover:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                        >
                            <FiPlus size={16} />
                            {t('lists.create_new')}
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-gray-200 dark:border-dark-border">
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`flex-1 py-4 text-center font-bold text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${activeTab === 'my' ? 'border-b-2 border-primary-500 text-gray-900 dark:text-white' : 'text-gray-500'}`}
                    >
                        {t('lists.my_lists')}
                    </button>
                    <button
                        onClick={() => setActiveTab('joined')}
                        className={`flex-1 py-4 text-center font-bold text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${activeTab === 'joined' ? 'border-b-2 border-primary-500 text-gray-900 dark:text-white' : 'text-gray-500'}`}
                    >
                        {t('lists.joined_lists')}
                    </button>
                </div>

                {/* Debug Error Reporting */}
                {error && (
                    <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <h2 className="text-red-600 dark:text-red-400 font-bold mb-2">Backend Fetch Failed</h2>
                        <pre className="text-xs text-red-500 dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
                            {error}
                        </pre>
                    </div>
                )}

                {
                    (isLoading && myLists.length === 0 && listsIAmOn.length === 0) ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                        </div>
                    ) : (activeTab === 'my' ? myLists : listsIAmOn).length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="mb-4 text-gray-400">
                                <div className="flex gap-2 justify-center mb-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                    <span className="w-6 h-2 rounded-full bg-gray-300"></span>
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                    <span className="w-6 h-2 rounded-full bg-gray-300"></span>
                                </div>
                            </div>
                            <p className="text-gray-500 max-w-xs mx-auto">
                                {activeTab === 'my' ? t('lists.create_desc') : t('lists.no_joined_lists')}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-dark-border">
                            {(activeTab === 'my' ? myLists : listsIAmOn).map(list => (
                                <Link
                                    key={list.id}
                                    to={`/lists/${list.id}`}
                                    className="block p-4 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                                >
                                    <div className="flex flex-col" style={{ gap: '8px', width: '100%' }}>
                                        {/* Top Row: Avatar + Names */}
                                        <div className="flex flex-row items-center" style={{ gap: '8px' }}>
                                            <div className="shrink-0" style={{ width: '40px', height: '40px' }}>
                                                <ListAvatar src={list.avatarUrl} alt={list.name} size="lg" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold truncate" style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '20px' }}>
                                                    {list.name}
                                                </h3>
                                                <div className="truncate" style={{ fontSize: '13.1px', color: 'var(--text-secondary)', lineHeight: '17px' }}>
                                                    {list.owner && (
                                                        <span>
                                                            {t('lists.list_by', { handle: list.owner.handle })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Bottom Row: Description (Precisely like Pic 2) */}
                                        {list.description && (
                                            <div className="line-clamp-2" style={{ fontSize: '13.1px', color: 'var(--text-primary)', lineHeight: '17px' }}>
                                                {list.description}
                                            </div>
                                        )}
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
