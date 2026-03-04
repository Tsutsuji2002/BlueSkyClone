import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import LoadingIndicator from '../../components/common/LoadingIndicator';

const PrivacyPolicyPage: React.FC = () => {
    const { t } = useTranslation();
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
            <div className="min-h-screen pt-20 flex justify-center">
                <LoadingIndicator size="lg" />
            </div>
        );
    }

    if (!pageData) {
        return (
            <div className="min-h-screen pt-20 text-center text-gray-500">
                <p>Privacy policy not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg">
            <div className="max-w-3xl mx-auto px-6 py-12 lg:py-20">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-dark-text mb-8">
                    {pageData.title}
                </h1>

                <div
                    className="prose prose-lg dark:prose-invert max-w-none 
                               prose-headings:text-gray-900 dark:prose-headings:text-dark-text
                               prose-p:text-gray-600 dark:prose-p:text-dark-text-secondary
                               prose-li:text-gray-600 dark:prose-li:text-dark-text-secondary
                               prose-strong:text-gray-900 dark:prose-strong:text-dark-text
                               prose-a:text-primary-500 hover:prose-a:text-primary-600"
                    dangerouslySetInnerHTML={{ __html: pageData.content }}
                />

                <div className="mt-12 pt-8 border-t border-gray-100 dark:border-dark-border text-sm text-gray-400">
                    <p>Last updated: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
