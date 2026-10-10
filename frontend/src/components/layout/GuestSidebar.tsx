import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import { FiChevronDown, FiGlobe } from 'react-icons/fi';
import ButterflyLogo from '../common/ButterflyLogo';

const GuestSidebar: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const appLanguage = useAppSelector((state) => state.language.appLanguage);

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        dispatch(setAppLanguage(lang));
    };

    const getDisplayLangName = (lang: string) => {
        const raw = t(`language.${lang}`);
        if (!raw || raw.startsWith('language.')) return lang;
        return raw.split('–')[0].trim();
    };

    return (
        <nav role="navigation" className="sticky top-0 p-[16px] w-[245px] flex flex-col items-start select-none">
            <div className="pt-[20px] w-full max-w-[245px]">
                {/* Logo */}
                <a
                    href="/"
                    aria-label="Bluesky - Home"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate('/');
                    }}
                    className="flex flex-row items-center justify-start cursor-pointer"
                >
                    <svg fill="none" viewBox="0 0 64 57" width="32" height="28.5" style={{ width: '32px', height: '28.5px' }}>
                        <path fill="#006AFF" d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805ZM50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745Z" />
                    </svg>
                </a>

                {/* Title: Join the conversation */}
                <div className="pt-[16px]">
                    <div className="text-[24.3px] tracking-[0px] text-black dark:text-white leading-[24.3px] font-[700]">
                        {t('auth.welcome.title', { defaultValue: 'Join the conversation' })}
                    </div>
                </div>

                {/* Buttons Area - Create account & Sign in */}
                <div className="flex flex-wrap gap-[8px] pt-[12px]">
                    <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        aria-label="Create account"
                        className="flex flex-row items-center justify-center bg-[#006AFF] hover:bg-[#0058d4] text-white rounded-[999px] px-[14px] py-[8px] gap-[5px] transition-colors cursor-pointer"
                    >
                        <div className="text-[13.1px] tracking-[0px] text-white leading-[17px] text-center font-[500] whitespace-nowrap">
                            {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        aria-label="Sign in"
                        className="flex flex-row items-center justify-center bg-[#EFF2F6] dark:bg-[#1e293b] hover:bg-[#e2e7ee] dark:hover:bg-[#283548] rounded-[999px] px-[14px] py-[8px] gap-[5px] transition-colors cursor-pointer"
                    >
                        <div className="text-[13.1px] tracking-[0px] text-[#405168] dark:text-[#dce2ea] leading-[17px] text-center font-[500] whitespace-nowrap">
                            {t('auth.login.hero_title', { defaultValue: 'Sign in' })}
                        </div>
                    </button>
                </div>

                {/* Language Selector */}
                <div className="mt-[12px] w-full h-[32px] relative flex items-center">
                    <div className="flex flex-row items-center justify-center bg-white dark:bg-black hover:bg-gray-100/60 dark:hover:bg-white/5 px-[8px] pl-[8px] pr-[4px] py-[5px] rounded-[6px] self-start gap-[8px] cursor-pointer transition-colors w-fit">
                        <div className="z-20 w-[15px] h-[15px] relative flex items-center justify-center flex-shrink-0">
                            <svg fill="none" width="18" height="18" viewBox="0 0 24 24" className="text-[#526580] pointer-events-none flex-shrink-0">
                                <path fill="#526580" fillRule="evenodd" clipRule="evenodd" d="M4.4 9.493C4.14 10.28 4 11.124 4 12a8 8 0 1 0 10.899-7.459l-.67 2.679a2.95 2.95 0 0 1-2.14 2.142l-2.173.547a.32.32 0 0 0-.205.164 2.316 2.316 0 0 1-3.457.81L4.4 9.493Zm.883-1.84 2.171 1.63a.315.315 0 0 0 .471-.11c.303-.6.851-1.04 1.503-1.204l2.174-.546a.95.95 0 0 0 .687-.688l.97.242-.97-.242.67-2.678a7.993 7.993 0 0 0-7.676 3.597ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm8.048.543a2.2 2.2 0 0 1 1.69-.636l.827.053c.52.033 1.023.204 1.456.495l1.37.921a2.453 2.453 0 0 1-1.367 4.489h-.98a2.95 2.95 0 0 1-2.45-1.312L9.77 15.32a2.2 2.2 0 0 1 .278-2.776Zm1.563 1.36a.197.197 0 0 0-.177.306l.823 1.235c.176.263.471.42.787.42h.98a.453.453 0 0 0 .252-.828l-1.37-.921a.95.95 0 0 0-.468-.159l-.827-.053Z" />
                            </svg>
                        </div>
                        <div className="text-[13.1px] tracking-[0px] text-black dark:text-white leading-[17px] font-[400] whitespace-nowrap">
                            {getDisplayLangName(appLanguage)}
                        </div>
                        <svg fill="none" viewBox="0 0 24 24" width="12" height="12" className="text-[#405168] dark:text-[#8798B0] flex-shrink-0">
                            <path fill="#405168" fillRule="evenodd" clipRule="evenodd" d="M3.293 8.293a1 1 0 0 1 1.414 0L12 15.586l7.293-7.293a1 1 0 1 1 1.414 1.414l-8 8a1 1 0 0 1-1.414 0l-8-8a1 1 0 0 1 0-1.414Z" />
                        </svg>
                    </div>
                
                <select
                    value={appLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-black bg-white dark:text-dark-text dark:bg-dark-bg"
                >
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="en">English – English</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="en-GB">English (UK)</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="es">español – Spanish</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="fr">français – French</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="de">Deutsch – German</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ja">日本語 – Japanese</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ko">한국어 – Korean</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="vi">Tiếng Việt – Vietnamese</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="zh-CN">简体中文 – Simplified Chinese</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="zh-TW">繁體中文 – Traditional Chinese</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="pt-BR">português do Brasil – Brazilian Portuguese</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="pt-PT">português europeu – European Portuguese</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="it">italiano – Italian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ru">русский – Russian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="uk">українська – Ukrainian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="hi">हिंदी – Hindi</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="id">Bahasa Indonesia – Indonesian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="th">ภาษาไทย – Thai</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="tr">Türkçe – Turkish</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="pl">polski – Polish</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="nl">Nederlands – Dutch</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="sv">svenska – Swedish</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="fi">suomi – Finnish</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="el">Ελληνικά – Greek</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="hu">magyar – Hungarian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ro">română – Romanian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ca">català – Catalan</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="eu">euskara – Basque</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="gl">galego – Galician</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ast">asturianu – Asturian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="an">aragonés – Aragonese</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="cy">Cymraeg – Welsh</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="da">dansk – Danish</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="eo">Esperanto – Esperanto</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="fy">Frysk – West Frisian</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ga">Gaeilge – Irish</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="gd">Gàidhlig – Scottish Gaelic</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ia">Interlingua – Interlingua</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="km">ภาษาเขมร – Khmer</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="ne">नेपाली – Nepali</option>
                    <option className="text-black bg-white dark:text-dark-text dark:bg-dark-bg" value="yue">粵文 – Cantonese</option>
                </select>
            </div>
            </div>
        </nav>
    );
};

export default GuestSidebar;
