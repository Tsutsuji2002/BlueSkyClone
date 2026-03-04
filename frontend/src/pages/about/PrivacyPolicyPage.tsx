import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../../utils/api';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ButterflyLogo from '../../components/common/ButterflyLogo';

const PrivacyPolicyPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [pageData, setPageData] = useState<{ title: string; content: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const slug = 'privacy-policy';

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await api.pageContent.get(slug);
                setPageData({
                    title: response.title,
                    content: response.htmlContent
                });
            } catch (error) {
                console.error('Failed to fetch privacy policy:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex justify-center items-center">
                <LoadingIndicator size="lg" />
            </div>
        );
    }

    if (!pageData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg pt-20 text-center text-gray-500">
                <p>Privacy policy not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#161e27] text-gray-900 dark:text-gray-100 font-sans selection:bg-primary-500/30">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#161e27]/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-bold text-gray-700 dark:text-gray-200"
                    >
                        <FiArrowLeft size={18} />
                        Back
                    </button>
                    <div className="flex items-center gap-2">
                        <ButterflyLogo size={24} />
                        <span className="font-bold tracking-tight hidden sm:inline">Bluesky</span>
                    </div>
                </div>
            </header>

            {/* Content Container */}
            <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
                <style>
                    {`
                    .privacy-content h1 { font-size: 2.25rem; line-height: 2.5rem; font-weight: 700; margin-bottom: 2rem; color: inherit; }
                    .privacy-content h2 { font-size: 1.5rem; line-height: 2rem; font-weight: 700; margin-top: 3rem; margin-bottom: 1rem; color: inherit; }
                    .privacy-content h3 { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: inherit; }
                    .privacy-content p { font-size: 17px; line-height: 1.6; margin-bottom: 1.25rem; color: var(--text-color); }
                    .privacy-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.25rem; }
                    .privacy-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.25rem; }
                    .privacy-content li { font-size: 17px; line-height: 1.6; margin-bottom: 0.5rem; color: var(--text-color); }
                    .privacy-content strong { font-weight: 600; color: inherit; }
                    .privacy-content a { color: #0087ff; text-decoration: none; }
                    .privacy-content a:hover { text-decoration: underline; }
                    
                    /* Dark mode specific variable */
                    .dark .privacy-content { --text-color: #d1d5db; color: #fff; }
                    .privacy-content { --text-color: #374151; color: #000; }
                    `}
                </style>
                <div
                    className="privacy-content"
                    dangerouslySetInnerHTML={{ __html: pageData.content }}
                />
            </main>

            {/* Footer */}
            <footer className="max-w-3xl mx-auto px-6 pb-12">
                <div className="pt-8 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p>&copy; {new Date().getFullYear()} Bluesky Clone Project.</p>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicyPage;
