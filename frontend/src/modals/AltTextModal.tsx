import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import Button from '../components/common/Button';
import { useTranslation } from 'react-i18next';

interface AltTextModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    initialAlt: string;
    onSave: (alt: string) => void;
}

const AltTextModal: React.FC<AltTextModalProps> = ({ isOpen, onClose, imageUrl, initialAlt, onSave }) => {
    const { t } = useTranslation();
    const [alt, setAlt] = useState(initialAlt);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('post.add_alt_text', { defaultValue: 'Thêm văn bản thay thế' })}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors">
                        <FiX size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {/* Image Preview */}
                    <div className="mb-6 rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-bg flex items-center justify-center min-h-[300px]">
                        <img src={imageUrl} alt="Preview" className="max-w-full max-h-[400px] object-contain" />
                    </div>

                    {/* Input Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            {t('post.alt_text_description', { defaultValue: 'Văn bản thay thế mô tả' })}
                        </label>
                        <textarea
                            value={alt}
                            onChange={(e) => setAlt(e.target.value)}
                            placeholder={t('post.alt_text_placeholder', { defaultValue: 'Văn bản thay thế' })}
                            className="w-full min-h-[120px] p-4 text-[17px] bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-gray-900 dark:text-dark-text"
                            maxLength={2000}
                        />
                        <div className="flex justify-between items-center text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-[10px]">
                                    {2000 - alt.length <= 20 && (2000 - alt.length)}
                                </div>
                                <span>2000</span>
                            </div>
                        </div>
                    </div>

                    <p className="mt-4 text-[15px] text-gray-500 dark:text-dark-text-secondary leading-relaxed">
                        {t('post.alt_text_help', { defaultValue: 'Văn bản thay thế mô tả hình ảnh cho người khiếm thị hoặc thị lực yếu, giúp bổ sung ngữ cảnh.' })}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border">
                    <Button
                        variant="primary"
                        fullWidth
                        onClick={() => onSave(alt)}
                        className="rounded-full py-3 font-bold text-lg"
                    >
                        {t('common.save', { defaultValue: 'Lưu' })}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AltTextModal;
