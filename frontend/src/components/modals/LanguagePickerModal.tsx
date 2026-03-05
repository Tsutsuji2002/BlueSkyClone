import React, { useState, useMemo } from 'react';
import { FiX, FiSearch, FiCheck } from 'react-icons/fi';
import { ALL_LANGUAGES } from '../../constants/languages';
import { cn } from '../../utils/classNames';

interface LanguagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCode: string;
    onSelect: (code: string) => void;
}

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({ isOpen, onClose, selectedCode, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLanguages = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return ALL_LANGUAGES;
        return ALL_LANGUAGES.filter(
            lang => lang.englishName.toLowerCase().includes(query) ||
                lang.nativeName.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-[#000000] border border-gray-800 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-[20px] font-bold text-white tracking-tight">Select language</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 bg-[#000000] sticky top-0 z-10">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search languages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#161618] border-none rounded-2xl pl-11 pr-4 py-3 text-[15px] text-white focus:ring-2 focus:ring-[#0085FF]/20 transition-all outline-none placeholder-gray-500"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                    {filteredLanguages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                onSelect(lang.code);
                                onClose();
                            }}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group",
                                selectedCode === lang.code
                                    ? "bg-[#001933]"
                                    : "hover:bg-[#161618]"
                            )}
                        >
                            <div className="flex flex-col items-start">
                                <span className={cn(
                                    "text-[16px] font-bold transition-colors",
                                    selectedCode === lang.code ? "text-[#0085FF]" : "text-white group-hover:text-white"
                                )}>
                                    {lang.englishName}
                                </span>
                                <span className="text-[13px] text-gray-500">{lang.nativeName}</span>
                            </div>
                            {selectedCode === lang.code && <FiCheck className="text-[#0085FF]" size={20} strokeWidth={3} />}
                        </button>
                    ))}
                    {filteredLanguages.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            No languages found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LanguagePickerModal;
