import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchListById, pinList, unpinList, deleteList, updateList, fetchListFeed, fetchListMembers, removeListMember, fetchListsIAmOn, removeListPost } from '../redux/slices/listsSlice';
import { FiArrowLeft, FiMoreHorizontal, FiCopy, FiEdit2, FiTrash2, FiUserPlus, FiLogOut, FiPlus } from 'react-icons/fi';
import CreateListModal from '../components/lists/CreateListModal';
import AddMemberModal from '../components/lists/AddMemberModal';
import AddPostModal from '../components/lists/AddPostModal';
import PostCard from '../components/feed/PostCard';
import Avatar from '../components/common/Avatar';
import { CreateListDto } from '../types';
import ListAvatar from '../components/common/ListAvatar';
import ConfirmModal from '../components/common/ConfirmModal';

const ListDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { activeList, activeListFeed, activeListMembers, listsIAmOn, isLoading } = useAppSelector(state => state.lists);
    const { user: currentUser } = useAppSelector(state => state.auth);
    const [activeTab, setActiveTab] = useState<'posts' | 'people'>('posts');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    // Modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'primary' | 'danger';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (id) {
            dispatch(fetchListById(id));
            if (currentUser) {
                dispatch(fetchListsIAmOn());
            }
        }
    }, [dispatch, id, currentUser]);

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

    const handleLeaveList = () => {
        if (!activeList || !currentUser) return;
        setConfirmModal({
            isOpen: true,
            title: t('lists.leave_list'),
            message: t('lists.confirm_leave'),
            onConfirm: async () => {
                await dispatch(removeListMember({ listId: activeList.id, userId: currentUser.id })).unwrap();
                navigate('/lists');
            },
            variant: 'danger'
        });
    };

    const handleDelete = () => {
        if (!activeList) return;
        setConfirmModal({
            isOpen: true,
            title: t('lists.delete_list'),
            message: t('lists.confirm_delete'),
            onConfirm: async () => {
                await dispatch(deleteList(activeList.id));
                navigate('/lists');
            },
            variant: 'danger'
        });
    };

    const handleUpdate = async (data: CreateListDto) => {
        if (!activeList) return;
        await dispatch(updateList({ id: activeList.id, data })).unwrap();
    };

    const handleRemovePost = async (postId: string) => {
        if (!activeList) return;
        await dispatch(removeListPost({ listId: activeList.id, postId })).unwrap();
    };

    const handleRemoveMember = (userId: string, name: string) => {
        if (!activeList) return;
        setConfirmModal({
            isOpen: true,
            title: t('lists.remove_member'),
            message: t('lists.confirm_remove_member', { name }) || `Remove ${name} from this list?`,
            onConfirm: async () => {
                await dispatch(removeListMember({ listId: activeList.id, userId })).unwrap();
            },
            variant: 'danger'
        });
    };

    const isMember = currentUser && activeList ? listsIAmOn.some(l => l.id === activeList.id) : false;
    const canAddPost = activeList?.isOwner || isMember;

    if (isLoading && !activeList) {
        return (
            <MainLayout>
                <div className="p-8 text-center text-gray-500">{t('lists.loading')}</div>
            </MainLayout>
        );
    }

    if (!activeList) {
        return (
            <MainLayout>
                <div className="p-8 text-center text-gray-500">{t('lists.list_not_found')}</div>
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
                            {canAddPost && activeTab === 'posts' && (
                                <button
                                    onClick={() => setIsAddPostModalOpen(true)}
                                    className="p-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 transition-opacity"
                                    title={t('lists.add_post')}
                                >
                                    <FiPlus size={20} />
                                </button>
                            )}
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
                                        {!activeList.isOwner && listsIAmOn.some(l => l.id === activeList.id) && (
                                            <button
                                                onClick={() => { handleLeaveList(); setIsMenuOpen(false); }}
                                                className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-red-600"
                                            >
                                                <FiLogOut size={18} />
                                                {t('lists.leave_list')}
                                            </button>
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
                        <div className="shrink-0">
                            <ListAvatar src={activeList.avatarUrl} alt={activeList.name} size="xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                {activeList.name}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                                <span>{activeList.isOwner ? t('lists.your_list') : t('lists.list_by', { handle: activeList.owner.handle })}</span>
                                <span>·</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{t('lists.members_count', { count: activeList.membersCount })}</span>
                                <span>·</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{t('lists.posts_count', { count: activeList.postsCount })}</span>
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
                                {activeListFeed.map(post => {
                                    const canRemove = activeList.isOwner || (currentUser && post.addedByUserId === currentUser.id);
                                    return (
                                        <div key={post.id} className="relative z-10 bg-white dark:bg-dark-bg">
                                            {post.parentPost && (
                                                <PostCard
                                                    post={post.parentPost}
                                                    hasBottomLine={true}
                                                    hideBorder={true}
                                                />
                                            )}
                                            <PostCard
                                                post={post}
                                                isOwnPost={currentUser?.id === post.author.id}
                                                isInListContext={true}
                                                onRemoveFromList={canRemove ? () => handleRemovePost(post.id) : undefined}
                                                hasTopLine={!!post.parentPost}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                                <span className="text-4xl mb-4 text-gray-300">#</span>
                                <p className="mb-4">{t('lists.empty_post_tab')}</p>
                                {canAddPost && (
                                    <button
                                        onClick={() => setIsAddPostModalOpen(true)}
                                        className="bg-primary-500 text-white px-6 py-2 rounded-full font-bold hover:bg-primary-600"
                                    >
                                        {t('lists.add_post')}
                                    </button>
                                )}
                            </div>
                        )
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-dark-border">
                            {activeList.isOwner && (
                                <div className="p-4 flex justify-end">
                                    <button
                                        onClick={() => setIsAddMemberModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:opacity-80 transition-opacity"
                                    >
                                        <FiUserPlus size={16} />
                                        {t('lists.add_people')}
                                    </button>
                                </div>
                            )}
                            {activeListMembers && activeListMembers.length > 0 ? activeListMembers.map(member => (
                                <div key={member.userId} className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                                    <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/user/${member.userId}`)}>
                                        <Avatar src={member.user.avatarUrl || member.user.avatar} alt={member.user.displayName} size="md" />
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 dark:text-dark-text truncate">{member.user.displayName}</h3>
                                            <p className="text-sm text-gray-500 truncate">@{member.user.handle}</p>
                                            {member.user.bio && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{member.user.bio}</p>}
                                        </div>
                                    </div>
                                    {activeList.isOwner && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveMember(member.userId, member.user.displayName);
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                            title={t('lists.remove_member')}
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            )) : (

                                <div className="p-12 text-center text-gray-500">
                                    {t('lists.start_adding_people')}
                                    {activeList.isOwner && (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => setIsAddMemberModalOpen(true)}
                                                className="bg-primary-500 text-white px-6 py-2 rounded-full font-bold hover:bg-primary-600"
                                            >
                                                {t('lists.add_people')}
                                            </button>
                                        </div>
                                    )}
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

            <AddMemberModal
                isOpen={isAddMemberModalOpen}
                onClose={() => setIsAddMemberModalOpen(false)}
                listId={activeList.id}
            />

            <AddPostModal
                isOpen={isAddPostModalOpen}
                onClose={() => setIsAddPostModalOpen(false)}
                listId={activeList.id}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />
        </MainLayout >
    );
};

export default ListDetailPage;
