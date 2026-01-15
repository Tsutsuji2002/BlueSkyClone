import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchListById, pinList, unpinList, deleteList, updateList, fetchListFeed, fetchListMembers } from '../redux/slices/listsSlice';
import { FiArrowLeft, FiMoreHorizontal, FiUsers, FiCopy, FiEdit2, FiTrash2 } from 'react-icons/fi';
import CreateListModal from '../components/lists/CreateListModal';
import PostCard from '../components/feed/PostCard';
import Avatar from '../components/common/Avatar';
import { CreateListDto } from '../types';

const ListDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { activeList, activeListFeed, activeListMembers, isLoading } = useAppSelector(state => state.lists);
    const [activeTab, setActiveTab] = useState<'posts' | 'people'>('posts');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    useEffect(() => {
        if (id) {
            dispatch(fetchListById(id));
        }
    }, [dispatch, id]);

    useEffect(() => {
        if (id) {
            if (activeTab === 'posts') {
                dispatch(fetchListFeed(id));
            } else if (activeTab === 'people') {
                dispatch(fetchListMembers(id));
            }
        }
    }, [dispatch, id, activeTab]);

    useEffect(() => {
        if (activeList) {
            setIsPinned(activeList.isPinned);
        }
    }, [activeList]);

    const handlePin = async () => {
        if (!activeList) return;
        if (isPinned) {
            await dispatch(unpinList(activeList.id));
            setIsPinned(false);
        } else {
            await dispatch(pinList(activeList.id));
            setIsPinned(true);
        }
    };

    const handleDelete = async () => {
        if (!activeList || !window.confirm('Are you sure you want to delete this list?')) return;
        await dispatch(deleteList(activeList.id));
        navigate('/lists');
    };

    const handleUpdate = async (data: CreateListDto) => {
        if (!activeList) return;
        await dispatch(updateList({ id: activeList.id, data })).unwrap();
    };

    if (isLoading && !activeList) {
        return (
            <MainLayout>
                <div className="p-8 text-center text-gray-500">Loading...</div>
            </MainLayout>
        );
    }

    if (!activeList) {
        return (
            <MainLayout>
                <div className="p-8 text-center text-gray-500">List not found</div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-elem rounded-full">
                                <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text truncate max-w-[200px]">
                                    {activeList.name}
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('lists.title')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePin}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isPinned
                                    ? 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-dark-elem dark:text-white dark:hover:bg-gray-700'
                                    }`}
                            >
                                {isPinned ? t('feeds.pinned') : t('lists.pin_to_home')}
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-elem rounded-full"
                                >
                                    <FiMoreHorizontal size={20} className="text-gray-900 dark:text-dark-text" />
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-elem rounded-xl shadow-xl border border-gray-200 dark:border-dark-border py-2 z-20">
                                        <button className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-3 text-gray-700 dark:text-gray-200">
                                            <FiCopy size={18} />
                                            {t('lists.copy_link')}
                                        </button>
                                        {activeList.isOwner && (
                                            <>
                                                <button
                                                    onClick={() => { setIsEditModalOpen(true); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-3 text-gray-700 dark:text-gray-200"
                                                >
                                                    <FiEdit2 size={18} />
                                                    {t('lists.edit_list_details')}
                                                </button>
                                                <button
                                                    onClick={() => { handleDelete(); setIsMenuOpen(false); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-red-600"
                                                >
                                                    <FiTrash2 size={18} />
                                                    {t('lists.delete_list')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Info */}
                <div className="p-4 bg-gray-50 dark:bg-dark-hover/10">
                    <div className="flex gap-4 items-start">
                        <div className="w-16 h-16 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 overflow-hidden">
                            {activeList.avatarUrl ? (
                                <img
                                    src={activeList.avatarUrl.startsWith('http') ? activeList.avatarUrl : `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${activeList.avatarUrl}`}
                                    alt={activeList.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement!.innerHTML = '<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>';
                                    }}
                                />
                            ) : (
                                <FiUsers size={32} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                {activeList.name}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400">
                                {activeList.isOwner ? t('lists.your_list') : `List by @${activeList.owner.handle}`}
                            </p>
                            {activeList.description && (
                                <p className="mt-2 text-gray-900 dark:text-dark-text whitespace-pre-wrap">
                                    {activeList.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-dark-border">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-4 text-center font-bold text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${activeTab === 'posts' ? 'border-b-2 border-primary-500 text-gray-900 dark:text-white' : 'text-gray-500'
                            }`}
                    >
                        {t('lists.posts_tab')}
                    </button>
                    <button
                        onClick={() => setActiveTab('people')}
                        className={`flex-1 py-4 text-center font-bold text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${activeTab === 'people' ? 'border-b-2 border-primary-500 text-gray-900 dark:text-white' : 'text-gray-500'
                            }`}
                    >
                        {t('lists.people_tab')}
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-[200px]">
                    {activeTab === 'posts' ? (
                        activeListFeed && activeListFeed.length > 0 ? (
                            <div className="divide-y divide-gray-200 dark:divide-dark-border">
                                {activeListFeed.map(post => <PostCard key={post.id} post={post} />)}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                                <span className="text-4xl mb-4 text-gray-300">#</span>
                                <p className="mb-4">{t('lists.empty_post_tab')}</p>
                                {activeList.isOwner && (
                                    <button className="bg-primary-500 text-white px-6 py-2 rounded-full font-bold hover:bg-primary-600">
                                        {t('lists.start_adding_people')}
                                    </button>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-dark-border">
                            {activeListMembers && activeListMembers.length > 0 ? activeListMembers.map(member => (
                                <div key={member.userId} className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors cursor-pointer" onClick={() => navigate(`/profile/user/${member.userId}`)}>
                                    <Avatar src={member.user.avatarUrl || member.user.avatar} alt={member.user.displayName} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 dark:text-dark-text truncate">{member.user.displayName}</h3>
                                        <p className="text-sm text-gray-500 truncate">@{member.user.handle}</p>
                                        {member.user.bio && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{member.user.bio}</p>}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-12 text-center text-gray-500">
                                    {t('lists.start_adding_people')}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <CreateListModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleUpdate}
                initialData={activeList}
                isEditing={true}
            />
        </MainLayout>
    );
};

export default ListDetailPage;
