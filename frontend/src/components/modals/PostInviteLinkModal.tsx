import React, { useState } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { createPost } from '../../redux/slices/postsSlice';
import { showToast } from '../../redux/slices/toastSlice';
import { FiX, FiImage, FiSmile, FiMoreHorizontal } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Avatar from '../common/Avatar';
import InvitePreviewCard from '../messages/InvitePreviewCard';
import { User } from '../../types';

interface PostInviteLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    inviteLink: string;
    participants: User[];
    convoName?: string;
    memberCount?: number;
}

const PostInviteLinkModal: React.FC<PostInviteLinkModalProps> = ({
    isOpen,
    onClose,
    inviteLink,
    participants,
    convoName,
    memberCount
}) => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const user = useAppSelector((state) => state.auth.user);
    const isPostLoading = useAppSelector((state) => state.posts.isLoading);
    
    // Pre-fill content with the link
    const [content, setContent] = useState(inviteLink);

    const handleSubmit = async () => {
        if (isPostLoading || !content.trim() || !user) return;

        try {
            await dispatch(createPost({
                content,
                // We'll rely on the link detection in createPost/backend 
                // to create facets for the link.
            })).unwrap();
            
            dispatch(showToast({ message: t('post.created_success'), type: 'success' }));
            onClose();
        } catch (error: any) {
            dispatch(showToast({ message: error.message || t('common.failed_to_create'), type: 'error' }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 lg:p-4 bg-black/80 animate-fadeIn">
            <div 
                className="bg-white dark:bg-black w-full max-w-[600px] h-full lg:h-auto lg:max-h-[85vh] lg:rounded-2xl border border-gray-200 dark:border-dark-border flex flex-col shadow-2xl animate-zoomIn"
            >
                {/* Header */}
                <div className="flex flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border/30">
                    <button 
                        onClick={onClose}
                        className="text-[#006AFF] font-medium text-[15px] hover:bg-blue-50 dark:hover:bg-white/5 px-3 py-1 rounded-full transition-colors"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    
                    <div className="flex-1"></div>
                    
                    <div className="flex items-center gap-4">
                        <button className="text-[#006AFF] font-medium text-[15px] hover:bg-blue-50 dark:hover:bg-white/5 px-3 py-1 rounded-full transition-colors">
                            {t('common.drafts', 'Drafts')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isPostLoading || !content.trim()}
                            className="bg-[#006AFF] hover:bg-[#0052cc] text-white font-bold text-[15px] px-6 py-1.5 rounded-full transition-all disabled:opacity-50"
                        >
                            {isPostLoading ? t('common.posting', 'Post...') : t('common.post_verb', 'Post')}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6 no-scrollbar">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <Avatar src={user?.avatar} alt={user?.displayName || 'User'} size="lg" />
                        </div>
                        
                        <div className="flex-1 flex flex-col min-w-0">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write something..."
                                className="w-full min-h-[80px] bg-transparent border-none resize-none focus:outline-none text-[18px] text-black dark:text-white placeholder-gray-400"
                                autoFocus
                            />

                            <div className="mt-4">
                                <InvitePreviewCard 
                                    participants={participants}
                                    name={convoName}
                                    creator={user || undefined}
                                    memberCount={memberCount}
                                    inviteLink={inviteLink}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Toolbar */}
                <div className="p-2 border-t border-gray-100 dark:border-dark-border/30 flex flex-row items-center justify-between bg-white dark:bg-black">
                    <div className="flex flex-row items-center gap-1">
                        <button className="p-2.5 rounded-full text-[#006AFF] hover:bg-blue-50 dark:hover:bg-white/5">
                            <FiImage size={24} />
                        </button>
                        <button className="p-2.5 rounded-full text-[#006AFF] hover:bg-blue-50 dark:hover:bg-white/5 font-bold text-[14px]">
                            GIF
                        </button>
                        <button className="p-2.5 rounded-full text-[#006AFF] hover:bg-blue-50 dark:hover:bg-white/5">
                            <FiSmile size={24} />
                        </button>
                        <button className="p-2.5 rounded-full text-[#006AFF] hover:bg-blue-50 dark:hover:bg-white/5">
                            <FiMoreHorizontal size={24} />
                        </button>
                    </div>
                    
                    <div className="flex flex-row items-center gap-4 pr-4">
                        <span className="text-[#006AFF] font-bold text-[13px] bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                            Vietnamese
                        </span>
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-dark-border flex items-center justify-center">
                            <span className="text-[10px] font-bold text-gray-400">279</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostInviteLinkModal;
