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
                <div
                    className="prose prose-lg dark:prose-invert max-w-none 
                               prose-headings:font-bold prose-headings:tracking-tight
                               prose-h1:text-4xl sm:prose-h1:text-5xl prose-h1:mb-8 prose-h1:text-black dark:prose-h1:text-white
                               prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                               prose-p:text-[17px] prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300
                               prose-li:text-[17px] prose-li:text-gray-700 dark:prose-li:text-gray-300
                               prose-strong:text-black dark:prose-strong:text-white
                               prose-a:text-primary-500 prose-a:no-underline hover:prose-a:underline
                               marker:text-gray-400 dark:marker:text-gray-500"
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
