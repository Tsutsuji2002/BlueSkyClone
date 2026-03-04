import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX, FiLoader } from 'react-icons/fi';
import { cn } from '../../utils/classNames';

interface GifPickerProps {
    onSelect: (url: string) => void;
    onClose: () => void;
}

// GIPHY API configuration
const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY || 'pwI6O1p3H7m5C3K3pY7vY8R3n8H1z2N4'; // Use a demo key for testing if not provided
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchGifs = async (query?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const endpoint = query
                ? `${GIPHY_BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
                : `${GIPHY_BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.data) {
                setGifs(data.data);
            } else {
                setGifs([]);
            }
        } catch (err) {
            console.error('Error fetching GIPHY GIFs:', err);
            setError(t('common.failed_to_load', 'Failed to load GIFs'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGifs();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchGifs(search);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-surface animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 dark:border-dark-border flex items-center gap-2">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('post.search_gifs', 'Search GIPHY GIFs')}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-hover rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all dark:text-dark-text"
                        autoFocus
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); fetchGifs(); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text"
                        >
                            <FiX size={14} />
                        </button>
                    )}
                </form>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                >
                    <FiX size={20} className="text-gray-500" />
                </button>
            </div>

            {/* Results */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-2"
            >
                {isLoading && gifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <FiLoader className="animate-spin text-primary-500" size={24} />
                        <span className="text-sm text-gray-500">{t('common.loading')}</span>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500 text-sm font-medium">
                        {error}
                    </div>
                ) : gifs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        {t('post.no_gifs_found', 'No GIFs found')}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {gifs.map((gif) => (
                            <button
                                key={gif.id}
                                onClick={() => onSelect(gif.images.fixed_height.url)}
                                className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-hover group transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <img
                                    src={gif.images.fixed_height_small.url}
                                    alt={gif.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Attribution */}
            <div className="p-2 flex justify-center border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-hover/30">
                <img
                    src="https://raw.githubusercontent.com/Giphy/giphy-ios-sdk-ui-example/master/GiphySDK/Assets.xcassets/Poweredby_640px-White_VertText.imageset/Poweredby_640px-White_VertText.png"
                    alt="Powered by GIPHY"
                    className="h-8 object-contain dark:invert opacity-70"
                />
            </div>
        </div>
    );
};

export default GifPicker;
