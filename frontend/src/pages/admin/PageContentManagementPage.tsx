import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiSave, FiEye } from 'react-icons/fi';

const PageContentManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const slug = 'privacy-policy';

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await api.pageContent.get(slug);
                setTitle(response.title);
                setContent(response.htmlContent);
            } catch (error) {
                console.error('Failed to fetch page content:', error);
                toast.error('Failed to load page content');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error('Title and content are required');
            return;
        }

        setSaving(true);
        try {
            await api.pageContent.update(slug, {
                title,
                htmlContent: content
            });
            toast.success('Privacy policy updated successfully');
        } catch (error) {
            console.error('Failed to update page content:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Legal Pages</h1>
                    <p className="text-gray-500 dark:text-dark-text-secondary">Manage dynamic content for your legal and about pages.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.open('/about/privacy-policy', '_blank')}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text transition-colors"
                    >
                        <FiEye size={18} />
                        View Page
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        <FiSave size={18} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-2">
                            Page Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-shadow"
                            placeholder="Enter page title..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-2">
                            Content (HTML)
                        </label>
                        <div className="dark-quill-container">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                modules={quillModules}
                                className="h-[500px] mb-12 dark:text-dark-text"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageContentManagementPage;
