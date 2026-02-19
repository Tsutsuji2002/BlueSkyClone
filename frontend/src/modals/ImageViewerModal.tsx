import React, { useEffect, useCallback } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { closeImageViewer, setImageViewerIndex } from '../redux/slices/modalsSlice';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { API_BASE_URL } from '../constants';

import { RootState } from '../redux/store';

const ImageViewerModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { isOpen, images, currentIndex } = useAppSelector((state: RootState) => state.modals.imageViewer);

    const resolveUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${API_BASE_URL.replace('/api', '')}${url}`;
    };

    const handleClose = useCallback(() => {
        dispatch(closeImageViewer());
    }, [dispatch]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            dispatch(setImageViewerIndex(currentIndex - 1));
        }
    }, [currentIndex, dispatch]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < images.length - 1) {
            dispatch(setImageViewerIndex(currentIndex + 1));
        }
    }, [currentIndex, images.length, dispatch]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') handleClose();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose, handlePrev, handleNext]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity duration-300"
            onClick={handleClose}
        >
            {/* Close Button */}
            <button
                onClick={handleClose}
                className="fixed top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[110]"
                aria-label={t('common.close')}
            >
                <FiX size={28} />
            </button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className={cn(
                            "fixed left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[110]",
                            currentIndex === 0 && "opacity-0 cursor-default"
                        )}
                        aria-label="Previous image"
                    >
                        <FiChevronLeft size={32} />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === images.length - 1}
                        className={cn(
                            "fixed right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[110]",
                            currentIndex === images.length - 1 && "opacity-0 cursor-default"
                        )}
                        aria-label="Next image"
                    >
                        <FiChevronRight size={32} />
                    </button>
                </>
            )}

            {/* Content Container */}
            <div
                className="relative w-full h-full flex items-center justify-center p-4 md:p-12"
                onClick={(e) => e.stopPropagation()}
            >
                {images[currentIndex]?.url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) ? (
                    <video
                        src={resolveUrl(images[currentIndex].url)}
                        className="max-w-full max-h-full object-contain animate-in fade-in zoom-in duration-300"
                        controls
                        autoPlay
                    />
                ) : (
                    <div className="relative flex flex-col items-center max-w-full max-h-full group">
                        <img
                            src={resolveUrl(images[currentIndex].url)}
                            alt={images[currentIndex].altText || t('common.viewed', { defaultValue: 'Viewed content' })}
                            className="max-w-full max-h-full object-contain select-none animate-in fade-in zoom-in duration-300 shadow-2xl"
                        />
                        {images[currentIndex].altText && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md p-3 bg-black/70 backdrop-blur-md rounded-xl text-white text-sm leading-snug border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('post.alt_text')}</div>
                                {images[currentIndex].altText}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Counter */}
            {images.length > 1 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium z-[110]">
                    {currentIndex + 1} / {images.length}
                </div>
            )}
        </div>
    );
};

export default ImageViewerModal;
