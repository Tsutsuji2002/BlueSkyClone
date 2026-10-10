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
        <div className="h-screen sticky top-0 flex flex-col items-start px-4 sm:px-6 w-full max-w-[280px]">
            {/* Logo */}
            <div className="pt-6 cursor-pointer" onClick={() => navigate('/')}>
                <ButterflyLogo className="w-8 h-[28.5px] text-[#006AFF]" />
            </div>

            {/* Header */}
            <div className="pt-5 pb-4">
                <h1 className="text-[26px] font-extrabold leading-[30px] tracking-tight text-black dark:text-white max-w-[170px]">
                    {t('auth.welcome.title', { defaultValue: 'Join the conversation' })}
                </h1>
            </div>

            {/* Buttons Area - Side by Side */}
            <div className="flex flex-row items-center gap-2 pb-4">
                <button
                    onClick={() => navigate('/signup')}
                    className="flex items-center justify-center bg-[#006AFF] hover:bg-[#0058d4] text-white rounded-full px-4 py-2 transition-colors font-bold text-[14px] whitespace-nowrap"
                >
                    {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                </button>

                <button
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-center bg-[#e2e7ee] dark:bg-[#232e3e] hover:bg-[#d6dde6] dark:hover:bg-[#2c3a4e] text-black dark:text-white rounded-full px-4 py-2 transition-colors font-bold text-[14px] whitespace-nowrap"
                >
                    {t('auth.login.hero_title', { defaultValue: 'Sign in' })}
                </button>
            </div>

            {/* Language Selector */}
            <div className="relative group">
                <div className="flex items-center gap-2 bg-transparent border border-[#DCE2EA] dark:border-[#232E3E] hover:border-gray-400 dark:hover:border-gray-600 py-1.5 px-3 rounded-full cursor-pointer transition-colors">
                    <FiGlobe size={14} className="text-[#405168] dark:text-gray-300" />
                    <span className="text-[13px] font-semibold text-black dark:text-white leading-none">
                        {getDisplayLangName(appLanguage)}
                    </span>
                    <FiChevronDown size={13} className="text-gray-500 dark:text-gray-400 ml-0.5" />
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
    );
};

export default GuestSidebar;
