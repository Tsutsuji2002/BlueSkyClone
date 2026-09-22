import React, { useState, useEffect } from 'react';
import { FiX, FiCopy, FiCheck, FiGlobe, FiMonitor, FiCpu, FiClock, FiUser, FiActivity, FiMapPin, FiCompass } from 'react-icons/fi';
import { AccessLog } from '../../types/admin';
import { fetchIpGeoLocation, IpGeoLocation } from '../../services/ipGeoService';

interface AccessLogDetailModalProps {
    log: AccessLog | null;
    dark: boolean;
    onClose: () => void;
}

function parseUserAgent(ua?: string): { browser: string; os: string; isBot: boolean } {
    if (!ua) return { browser: 'Unknown Browser', os: 'Unknown OS', isBot: false };

    const lower = ua.toLowerCase();
    const isBot = lower.includes('bot') || lower.includes('crawler') || lower.includes('spider') || lower.includes('palo alto') || lower.includes('libredtail') || lower.includes('curl') || lower.includes('python');

    let os = 'Unknown OS';
    if (lower.includes('windows nt 10.0')) os = 'Windows 10 / 11';
    else if (lower.includes('windows nt 6.1')) os = 'Windows 7';
    else if (lower.includes('android')) os = 'Android';
    else if (lower.includes('iphone') || lower.includes('ipad')) os = 'iOS';
    else if (lower.includes('mac os x')) os = 'macOS';
    else if (lower.includes('linux')) os = 'Linux';

    let browser = 'Unknown Browser';
    if (lower.includes('edg/')) browser = 'Microsoft Edge';
    else if (lower.includes('chrome/')) browser = 'Google Chrome';
    else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Apple Safari';
    else if (lower.includes('firefox/')) browser = 'Mozilla Firefox';
    else if (isBot) browser = 'Automated Scanner / Bot';

    return { browser, os, isBot };
}

const AccessLogDetailModal: React.FC<AccessLogDetailModalProps> = ({ log, dark, onClose }) => {
    const [copiedIp, setCopiedIp] = useState(false);
    const [copiedUa, setCopiedUa] = useState(false);
    const [geo, setGeo] = useState<IpGeoLocation | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);

    useEffect(() => {
        if (log?.ipAddress) {
            setGeoLoading(true);
            fetchIpGeoLocation(log.ipAddress)
                .then(res => setGeo(res))
                .finally(() => setGeoLoading(false));
        }
    }, [log?.ipAddress]);

    if (!log) return null;

    const { browser, os, isBot } = parseUserAgent(log.userAgent);
    const dateObj = new Date(log.createdAt);

    const handleCopyIp = () => {
        navigator.clipboard.writeText(log.ipAddress);
        setCopiedIp(true);
        setTimeout(() => setCopiedIp(false), 2000);
    };

    const handleCopyUa = () => {
        if (log.userAgent) {
            navigator.clipboard.writeText(log.userAgent);
            setCopiedUa(true);
            setTimeout(() => setCopiedUa(false), 2000);
        }
    };

    const cardBg = dark ? 'bg-dark-bg border-dark-border text-dark-text' : 'bg-white border-gray-200 text-gray-900';
    const subText = dark ? 'text-dark-text-secondary' : 'text-gray-500';
    const sectionBg = dark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-100';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className={`relative w-full max-w-xl border rounded-2xl shadow-2xl p-6 overflow-hidden ${cardBg}`}>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <FiActivity size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Access Log Details</h2>
                            <p className={`text-xs ${subText}`}>ID: {log.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-dark-surface ${subText}`}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                    {/* Identity & Action */}
                    <div className={`p-4 rounded-xl border grid grid-cols-2 gap-4 ${sectionBg}`}>
                        <div>
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${subText}`}>
                                <FiUser size={13} /> User / Identity
                            </span>
                            <p className="text-sm font-semibold mt-1">
                                {log.handle === 'Guest' ? (
                                    <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                        Guest User
                                    </span>
                                ) : (
                                    log.handle || '—'
                                )}
                            </p>
                        </div>
                        <div>
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${subText}`}>
                                <FiActivity size={13} /> Action Type
                            </span>
                            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                {log.action}
                            </span>
                        </div>
                    </div>

                    {/* Network & IP Address */}
                    <div className={`p-4 rounded-xl border ${sectionBg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${subText}`}>
                                <FiGlobe size={13} /> Client IP Address
                            </span>
                            <button
                                onClick={handleCopyIp}
                                className="flex items-center gap-1 text-xs text-indigo-500 hover:underline"
                            >
                                {copiedIp ? <FiCheck size={12} className="text-green-500" /> : <FiCopy size={12} />}
                                {copiedIp ? 'Copied!' : 'Copy IP'}
                            </button>
                        </div>
                        <p className="font-mono text-sm font-semibold tracking-wide bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg inline-block">
                            {log.ipAddress}
                        </p>
                    </div>

                    {/* IP Geolocation & Country Lookup */}
                    <div className={`p-4 rounded-xl border ${sectionBg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${subText}`}>
                                <FiMapPin size={13} /> Location & Country
                            </span>
                            {geo?.ip && !geo.isLocal && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(geo.cityName + ' ' + geo.countryName)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
                                >
                                    <FiCompass size={12} /> View Map
                                </a>
                            )}
                        </div>
                        {geoLoading ? (
                            <div className="text-xs text-indigo-500 flex items-center gap-2 py-1">
                                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                Detecting location...
                            </div>
                        ) : geo ? (
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className={subText}>Country:</span>
                                    <p className="font-semibold text-sm mt-0.5 flex items-center gap-2">
                                        <span className="text-xl">{geo.flagEmoji}</span>
                                        {geo.countryName} {geo.countryCode && `(${geo.countryCode})`}
                                    </p>
                                </div>
                                <div>
                                    <span className={subText}>City / Region:</span>
                                    <p className="font-medium mt-1 text-sm">
                                        {[geo.cityName, geo.regionName].filter(Boolean).join(', ') || '—'}
                                    </p>
                                </div>
                                <div className="col-span-2 pt-1 border-t border-gray-100 dark:border-dark-border">
                                    <span className={subText}>ISP / Network:</span>
                                    <p className="font-medium mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
                                        {geo.isp}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Location unavailable</p>
                        )}
                    </div>

                    {/* Environment & Device Detection */}
                    <div className={`p-4 rounded-xl border grid grid-cols-2 gap-4 ${sectionBg}`}>
                        <div>
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${subText}`}>
                                <FiMonitor size={13} /> Browser
                            </span>
                            <p className="text-sm font-medium mt-1">
                                {browser} {isBot && <span className="text-xs text-amber-500 font-semibold">(Bot/Scanner)</span>}
                            </p>
                        </div>
                        <div>
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${subText}`}>
                                <FiCpu size={13} /> Operating System
                            </span>
                            <p className="text-sm font-medium mt-1">{os}</p>
                        </div>
                    </div>

                    {/* Untruncated User-Agent String */}
                    <div className={`p-4 rounded-xl border ${sectionBg}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold ${subText}`}>Full User-Agent String</span>
                            <button
                                onClick={handleCopyUa}
                                className="flex items-center gap-1 text-xs text-indigo-500 hover:underline"
                            >
                                {copiedUa ? <FiCheck size={12} className="text-green-500" /> : <FiCopy size={12} />}
                                {copiedUa ? 'Copied!' : 'Copy String'}
                            </button>
                        </div>
                        <div className={`p-3 rounded-lg text-xs font-mono break-all leading-relaxed ${dark ? 'bg-black/40 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'}`}>
                            {log.userAgent || 'No User-Agent provided'}
                        </div>
                    </div>

                    {/* Timestamp Details */}
                    <div className={`p-4 rounded-xl border ${sectionBg}`}>
                        <span className={`text-xs font-semibold flex items-center gap-1.5 mb-2 ${subText}`}>
                            <FiClock size={13} /> Event Timestamp
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className={subText}>Local Time:</span>
                                <p className="font-semibold text-sm mt-0.5">{dateObj.toLocaleString()}</p>
                            </div>
                            <div>
                                <span className={subText}>UTC Timestamp:</span>
                                <p className="font-mono text-xs mt-1">{dateObj.toISOString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-dark-border flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessLogDetailModal;
