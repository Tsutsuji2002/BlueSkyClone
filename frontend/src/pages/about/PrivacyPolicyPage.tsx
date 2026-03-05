import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FiGithub } from 'react-icons/fi';
import api from '../../utils/api';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ButterflyLogo from '../../components/common/ButterflyLogo';

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
            <div className="min-h-screen bg-[#0085ff] flex justify-center items-center">
                <LoadingIndicator size="lg" />
            </div>
        );
    }

    if (!pageData) {
        return (
            <div className="min-h-screen bg-[#0085ff] flex justify-center items-center text-white">
                <p>Privacy policy not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans selection:bg-primary-500/30 flex flex-col bg-[#0085ff]">
            {/* Blue Navbar */}
            <header className="sticky top-0 z-50 bg-[#0085ff]">
                <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Left: Logo Text */}
                    <Link to="/" className="text-white font-bold text-2xl tracking-tight">
                        Bluesky
                    </Link>

                    {/* Center: Butterfly (Hidden on mobile) */}
                    <div className="hidden md:flex text-white absolute left-1/2 transform -translate-x-1/2">
                        <ButterflyLogo size={28} />
                    </div>

                    {/* Right: Nav Pills */}
                    <div className="hidden lg:flex items-center gap-2 bg-white rounded-full p-1 shadow-sm">
                        <a href="#" className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors">Company</a>
                        <a href="#" className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors">Blog</a>
                        <a href="#" className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors">AT Protocol</a>
                        <a href="#" className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors">App</a>
                        <a href="#" className="p-1.5 text-gray-700 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
                            <FiGithub size={20} />
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content Area (White Box) */}
            <main className="flex-grow px-2 sm:px-4 md:px-8 pb-8 flex justify-center relative z-10">
                <div className="bg-white w-full max-w-[1240px] rounded-[32px] overflow-hidden shadow-sm flex flex-col min-h-[80vh]">

                    {/* Breadcrumbs */}
                    <div className="px-8 py-6 text-sm text-gray-500 border-b border-gray-100">
                        <span className="hover:underline cursor-pointer">Support</span> &rsaquo; {pageData.title}
                    </div>

                    {/* Title Section */}
                    <div className="py-16 md:py-24 px-6 text-center border-b border-gray-100">
                        <h1 className="text-5xl md:text-6xl text-[#1f2937] tracking-tight" style={{ fontWeight: 400 }}>
                            {pageData.title}
                        </h1>
                    </div>

                    {/* Formatted Content */}
                    <div className="px-6 py-12 md:py-16 mx-auto w-full max-w-[800px]">
                        <style>
                            {`
                            /* Hard overrides to mimic Bluesky static styling perfectly */
                            .bsky-static-content { color: #4B5563; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                            .bsky-static-content h1, .bsky-static-content h2, .bsky-static-content h3, .bsky-static-content h4, .bsky-static-content h5, .bsky-static-content h6, .bsky-static-content p, .bsky-static-content span, .bsky-static-content div, .bsky-static-content li {
                                font-size: 16px !important;
                                line-height: 1.6 !important;
                                font-weight: 400 !important;
                                font-family: inherit !important;
                            }
                            
                            .bsky-static-content h1, .bsky-static-content h2, .bsky-static-content h3 {
                                font-weight: 600 !important;
                                color: #1f2937 !important;
                            }

                            .bsky-static-content h1 { font-size: 24px !important; margin-bottom: 24px !important; margin-top: 40px !important; }
                            .bsky-static-content h2 { font-size: 20px !important; margin-bottom: 16px !important; margin-top: 32px !important; }
                            .bsky-static-content h3 { font-size: 18px !important; margin-bottom: 12px !important; margin-top: 24px !important; }
                            
                            .bsky-static-content p { margin-bottom: 24px !important; }
                            
                            .bsky-static-content ul { list-style-type: disc !important; padding-left: 24px !important; margin-bottom: 24px !important; }
                            .bsky-static-content ol { list-style-type: decimal !important; padding-left: 24px !important; margin-bottom: 24px !important; }
                            .bsky-static-content li { margin-bottom: 8px !important; }
                            
                            .bsky-static-content strong, .bsky-static-content b { font-weight: 600 !important; color: #1f2937 !important; }
                            
                            .bsky-static-content a { color: #0085ff !important; text-decoration: underline !important; }
                            .bsky-static-content a:hover { color: #006ce6 !important; }
                            `}
                        </style>
                        <div
                            className="bsky-static-content"
                            dangerouslySetInnerHTML={{ __html: pageData.content }}
                        />
                    </div>
                </div>
            </main>

            {/* Blue Footer */}
            <footer className="bg-[#4eb2ff] mt-auto">
                <div className="max-w-[1240px] mx-auto px-8 py-16 flex flex-col md:flex-row justify-between text-white">
                    {/* Left: Logo */}
                    <div className="mb-12 md:mb-0">
                        <ButterflyLogo size={32} />
                    </div>

                    {/* Columns */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-24">
                        <div>
                            <h3 className="font-bold mb-4 text-[#111827]">Bluesky</h3>
                            <ul className="space-y-3">
                                <li><a href="#" className="hover:underline">User FAQ</a></li>
                                <li><a href="#" className="hover:underline">Press</a></li>
                                <li><a href="#" className="hover:underline">Support</a></li>
                                <li><a href="#" className="hover:underline">Jobs</a></li>
                                <li><a href="#" className="hover:underline">RSS</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold mb-4 text-[#111827]">Links</h3>
                            <ul className="space-y-3">
                                <li><a href="#" className="hover:underline">AT Protocol</a></li>
                                <li><a href="#" className="hover:underline">Bluesky App</a></li>
                            </ul>
                        </div>
                        <div className="col-span-2 md:col-span-1 border-t border-white/20 pt-8 md:pt-0 md:border-t-0">
                            <h3 className="font-bold mb-4 text-[#111827]">Connect</h3>
                            <ul className="space-y-3">
                                <li><a href="mailto:press@blueskyweb.xyz" className="hover:underline">press@blueskyweb.xyz</a></li>
                                <li><a href="mailto:support@bsky.app" className="hover:underline">support@bsky.app</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicyPage;
