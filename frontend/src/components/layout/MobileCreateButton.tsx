import React from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { openCreatePost } from '../../redux/slices/modalsSlice';
import { FiEdit } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';

const MobileCreateButton: React.FC = () => {
    const dispatch = useAppDispatch();
    const location = useLocation();

    // Hide on messages page
    if (location.pathname.startsWith('/messages')) return null;

    return (
        <button
            onClick={() => dispatch(openCreatePost())}
            className="lg:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
        >
            <FiEdit size={24} />
        </button>
    );
};

export default MobileCreateButton;
