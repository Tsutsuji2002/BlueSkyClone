import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Import styles
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { useTranslation } from 'react-i18next';
import { submitSupportRequest, resetSupportStatus } from '../redux/slices/supportSlice';
import { showToast } from '../redux/slices/toastSlice';

const SubmitRequestPage: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state: RootState) => state.auth);
    const { loading, success, error } = useAppSelector((state: RootState) => state.support);
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [description, setDescription] = useState('');
    const [username, setUsername] = useState('');
    const [category, setCategory] = useState('');
    const [deviceType, setDeviceType] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Attachments state
    const [files, setFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const MAX_FILE_SIZE_MB = 10;

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const emailParam = searchParams.get('email');
        const usernameParam = searchParams.get('username');

        if (emailParam) setEmail(emailParam);
        else if (user) setEmail(user.email || '');

        if (usernameParam) setUsername(usernameParam);
        else if (user) setUsername(user.handle);
    }, [location.search, user]);

    useEffect(() => {
        if (success) {
            dispatch(showToast({ message: t('support.submit_success'), type: 'success' }));
            setEmail('');
            setDescription('');
            setCategory('');
            setDeviceType('');
            setFiles([]);
            dispatch(resetSupportStatus());
        }
        if (error) {
            dispatch(showToast({ message: error, type: 'error' }));
            dispatch(resetSupportStatus());
        }
    }, [success, error, dispatch, t]);

    // Custom Toolbar Configuration to match Zendesk style
    const modules = {
        toolbar: [
            [{ 'header': [false] }], // Paragraph dropdown equivalent
            ['bold', 'italic', 'image'],
            ['code-block', 'link', { 'list': 'bullet' }, { 'list': 'ordered' }],
            ['blockquote', 'clean'] // media, quote, undo/redo (clean removes formatting)
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'image',
        'code-block', 'link', 'list', 'bullet',
        'blockquote'
    ];

    // File upload handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (fileList: FileList) => {
        const validFiles: File[] = [];
        let hasError = false;

        Array.from(fileList).forEach(file => {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                hasError = true;
            } else {
                validFiles.push(file);
            }
        });

        if (hasError) {
            alert(t('support.files_skipped_size', { size: MAX_FILE_SIZE_MB }));
        }

        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = async () => {
        if (!email || !description || !category || !deviceType) {
            dispatch(showToast({ message: t('support.fill_required'), type: 'error' }));
            return;
        }

        dispatch(submitSupportRequest({
            email,
            description,
            username,
            category,
            deviceType
        }));
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
            {/* Header */}
            <header className="border-b border-gray-200 bg-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2 text-primary-500">
                            <svg viewBox="0 0 64 64" fill="currentColor" className="w-8 h-8 text-[#0085FF]">
                                <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zm36.254 0C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.579-6.732-13.873-2.745z" />
                            </svg>
                            <span className="text-xl font-semibold text-gray-900">{t('support.submit_request')}</span>
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm">
                        <Link to="/support" className="text-gray-500 hover:text-gray-900 transition-colors">{t('support.submit_request')}</Link>
                        {username ? (
                            <span className="text-primary-600 font-medium">{username}</span>
                        ) : (
                            <Link to="/login" className="text-primary-600 hover:underline">{t('support.sign_in')}</Link>
                        )}
                    </div>

                    <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="md:hidden border-t border-gray-200 px-4 py-2 space-y-2">
                        <Link to="/support" className="block py-2 text-gray-500">{t('support.submit_request')}</Link>
                        <Link to="/login" className="block py-2 text-primary-600">{t('support.sign_in')}</Link>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto w-full px-4 md:px-0 py-12 flex-grow">
                <h1 className="text-[32px] font-bold mb-4 text-gray-900">{t('support.submit_request')}</h1>
                <p className="text-sm text-gray-600 mb-8">{t('support.required_fields')}</p>

                <div className="space-y-6">
                    {/* Email */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">
                            {t('support.email_label')}<span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">
                            {t('support.description_label')}<span className="text-red-500">*</span>
                        </label>
                        <p className="text-sm text-gray-600 mb-2">{t('support.description_info')}</p>

                        {/* React Quill Editor */}
                        <div className="rounded overflow-hidden bg-white react-quill-wrapper">
                            <style>{`
                                .react-quill-wrapper .ql-container {
                                    border-bottom-left-radius: 0.25rem;
                                    border-bottom-right-radius: 0.25rem;
                                    min-height: 200px;
                                    font-family: inherit;
                                    font-size: 14px;
                                }
                                .react-quill-wrapper .ql-toolbar {
                                    border-top-left-radius: 0.25rem;
                                    border-top-right-radius: 0.25rem;
                                    background-color: #f8f9f9;
                                    border-color: #ccc;
                                }
                                .react-quill-wrapper .ql-container.ql-snow {
                                    border-color: #ccc;
                                }
                                /* Focus state styling hack - global focus ring when editor focused */
                                .react-quill-wrapper:focus-within {
                                    box-shadow: 0 0 0 1px #0072EF;
                                    border-radius: 0.25rem;
                                }
                                /* Adjust toolbar icon spacing slightly */
                                .ql-toolbar.ql-snow .ql-formats {
                                    margin-right: 12px;
                                }
                            `}</style>
                            <ReactQuill
                                theme="snow"
                                value={description}
                                onChange={setDescription}
                                modules={modules}
                                formats={formats}
                                className="bg-white"
                            />
                        </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">
                            {t('support.username_label')}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2.5 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">{t('support.category_label')}<span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select
                                className="w-full px-4 py-2.5 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="">-</option>
                                <option value="account">{t('support.category_options.account')}</option>
                                <option value="bug">{t('support.category_options.bug')}</option>
                                <option value="domain">{t('support.category_options.domain')}</option>
                                <option value="feedback">{t('support.category_options.feedback')}</option>
                                <option value="moderation">{t('support.category_options.moderation')}</option>
                                <option value="other">{t('support.category_options.other')}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Device */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">{t('support.device_label')}<span className="text-red-500">*</span></label>
                        <p className="text-sm text-gray-600">{t('support.device_info')}</p>
                        <div className="relative">
                            <select
                                className="w-full px-4 py-2.5 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                                value={deviceType}
                                onChange={(e) => setDeviceType(e.target.value)}
                            >
                                <option value="">-</option>
                                <option value="android">{t('support.device_options.android')}</option>
                                <option value="ios">{t('support.device_options.ios')}</option>
                                <option value="web">{t('support.device_options.web')}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2 mt-6">
                        <label className="block text-sm font-bold text-gray-700">{t('support.attachments')}</label>

                        {/* Hidden Input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleChange}
                            className="hidden"
                        />

                        {/* Drop Zone */}
                        <div
                            className={`border border-dashed rounded p-8 flex flex-col items-center justify-center bg-white transition-colors cursor-pointer text-center group ${dragActive ? 'border-primary-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={triggerFileInput}
                        >
                            <span className="text-sm text-primary-600 group-hover:underline">{t('support.choose_file')}</span>
                            <span className="text-sm text-gray-500 ml-1">{t('support.drag_drop')}</span>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <ul className="mt-2 space-y-2">
                                {files.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded border border-gray-200 text-sm">
                                        <div className="flex items-center truncate">
                                            <span className="font-medium text-gray-700 truncate max-w-[200px]">{file.name}</span>
                                            <span className="text-gray-500 ml-2 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                            title="Remove file"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                </div>

                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`bg-[#0072EF] hover:bg-[#0060cb] text-white font-medium py-2.5 px-6 rounded transition-colors text-sm flex items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {t('support.submitting')}
                            </>
                        ) : t('support.submit')}
                    </button>
                </div>
            </div>

            <footer className="border-t border-gray-200 py-8 px-4">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
                    <div>
                        Bluesky
                    </div>
                    <div className="flex items-center gap-1">
                        <span>{t('support.powered_by')}</span>
                        <a href="https://www.zendesk.com" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-600 hover:underline">Zendesk</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SubmitRequestPage;
