import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiBook, FiGlobe, FiSliders, FiTool, FiChevronRight } from 'react-icons/fi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import appVersion from '../version.json';

const AboutPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const aboutItems = [
        { id: 'terms', label: t('about.terms'), icon: <FiBook size={20} />, link: 'https://bsky.social/about/support/tos' },
        { id: 'privacy', label: t('about.privacy'), icon: <FiBook size={20} />, link: '/about/privacy-policy' },
        { id: 'status', label: t('about.status'), icon: <FiGlobe size={20} />, link: 'https://status.bsky.app' },
    ];

    const systemItems = [
        { id: 'system_log', label: t('about.system_log'), icon: <FiSliders size={20} />, link: '/admin/access-logs' },
    ];

    useDocumentTitle(t('about.title'));

    const [versionInfo, setVersionInfo] = React.useState({
        version: appVersion.version,
        commitHash: appVersion.commitHash,
    });

    React.useEffect(() => {
        const CACHE_KEY = 'bluesky_repo_version_info';
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.version && parsed.commitHash) {
                    setVersionInfo({
                        version: parsed.version,
                        commitHash: parsed.commitHash
                    });
                    return;
                }
            }
        } catch {}

        Promise.allSettled([
            fetch('https://api.github.com/repos/Tsutsuji2002/BlueSkyClone/releases/latest').then(r => r.ok ? r.json() : null),
            fetch('https://api.github.com/repos/Tsutsuji2002/BlueSkyClone/commits/main').then(r => r.ok ? r.json() : null)
        ]).then(([releaseResult, commitResult]) => {
            let latestVersion = appVersion.version;
            let latestCommit = appVersion.commitHash;

            if (releaseResult.status === 'fulfilled' && releaseResult.value?.tag_name) {
                latestVersion = releaseResult.value.tag_name.replace(/^v/, '');
            }

            if (commitResult.status === 'fulfilled' && commitResult.value?.sha) {
                latestCommit = commitResult.value.sha.substring(0, 7);
            }

            setVersionInfo({
                version: latestVersion,
                commitHash: latestCommit
            });

            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                    version: latestVersion,
                    commitHash: latestCommit,
                    timestamp: Date.now()
                }));
            } catch {}
        });
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                navigate(-1);
                            } else {
                                navigate('/settings');
                            }
                        }}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('about.title')}
                    </h1>
                </div>

                <div className="flex flex-col">
                    {aboutItems.map((item) => {
                        const isInternal = item.link.startsWith('/');
                        return (
                            <a
                                key={item.id}
                                href={item.link}
                                onClick={isInternal ? (e) => { e.preventDefault(); navigate(item.link); } : undefined}
                                target={isInternal ? undefined : "_blank"}
                                rel={isInternal ? undefined : "noopener noreferrer"}
                                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                            >
                                <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                                    <span className="opacity-80">{item.icon}</span>
                                    <span className="text-[15px] font-medium">{item.label}</span>
                                </div>
                                <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                            </a>
                        );
                    })}

                    <div className="h-px bg-gray-100 dark:bg-dark-border my-0" />

                    {systemItems.map((item) => {
                        const isInternal = item.link.startsWith('/');
                        return (
                            <a
                                key={item.id}
                                href={item.link}
                                onClick={isInternal ? (e) => { e.preventDefault(); navigate(item.link); } : undefined}
                                target={isInternal ? undefined : "_blank"}
                                rel={isInternal ? undefined : "noopener noreferrer"}
                                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                            >
                                <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                                    <span className="opacity-80">{item.icon}</span>
                                    <span className="text-[15px] font-medium">{item.label}</span>
                                </div>
                                <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                            </a>
                        );
                    })}

                    <a
                        href="https://github.com/Tsutsuji2002/BlueSkyClone/releases/latest"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-dark-border/50 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors group cursor-pointer"
                    >
                        <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                            <span className="opacity-80"><FiTool size={20} /></span>
                            <span className="text-[15px] font-medium group-hover:underline">{t('about.version')} {versionInfo.version}</span>
                        </div>
                        <span className="text-sm text-gray-400 dark:text-gray-500 font-mono group-hover:text-blue-500 transition-colors">
                            {versionInfo.commitHash} (prod)
                        </span>
                    </a>

                </div>
            </div>
    );
};

export default AboutPage;
