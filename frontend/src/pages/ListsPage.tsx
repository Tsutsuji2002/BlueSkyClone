import React, { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchMyLists, createList } from '../redux/slices/listsSlice';
import CreateListModal from '../components/lists/CreateListModal';
import { Link } from 'react-router-dom';
import { FiPlus, FiUsers, FiLock, FiGlobe } from 'react-icons/fi';
import { CreateListDto } from '../types';

const ListsPage: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { myLists, isLoading } = useAppSelector(state => state.lists);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchMyLists());
    }, [dispatch]);

    const handleCreateList = async (data: CreateListDto) => {
        await dispatch(createList(data)).unwrap();
    };

    return (
        <MainLayout>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* <BackButton/> If needed */}
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('lists.title')}
                            </h1>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-dark-elem dark:hover:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                        >
                            <FiPlus size={16} />
                            {t('lists.create_new')}
                        </button>
                    </div>
                </div>

                {isLoading && myLists.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : myLists.length === 0 ? (
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
                            {t('lists.create_desc')}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-dark-border">
                        {myLists.map(list => (
                            <Link
                                key={list.id}
                                to={`/lists/${list.id}`}
                                className="block p-4 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                            >
                                <div className="flex gap-4">
                                    <div className="shrink-0">
                                        {list.avatarUrl ? (
                                            <img
                                                src={list.avatarUrl.startsWith('http') ? list.avatarUrl : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${list.avatarUrl}`}
                                                alt={list.name}
                                                className="w-12 h-12 rounded-lg object-cover"
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    target.style.display = 'none';
                                                    const fallback = document.createElement('div');
                                                    fallback.className = 'w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white';
                                                    fallback.innerHTML = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>';
                                                    target.parentElement?.appendChild(fallback);
                                                }}
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                                                <FiUsers size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-dark-text truncate">
                                                {list.name}
                                            </h3>
                                            {/* Status logic if needed */}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {list.description || `List by @${list.owner.handle}`}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <CreateListModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateList}
            />
        </MainLayout>
    );
};

export default ListsPage;
