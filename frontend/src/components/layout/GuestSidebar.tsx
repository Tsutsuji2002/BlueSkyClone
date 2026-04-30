import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import { FiChevronDown } from 'react-icons/fi';
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

    return (
        <div className="h-screen sticky top-0 flex flex-col items-start px-5 w-full max-w-[245px]">
            {/* Logo */}
            <div className="pt-5 cursor-pointer" onClick={() => navigate('/')}>
                <ButterflyLogo className="w-8 h-[28.5px] text-[#006AFF]" />
            </div>

            {/* Header */}
            <div className="pt-4">
                <h1 className="text-[24.3px] font-bold leading-[24.3px] text-black dark:text-dark-text">
                    {t('auth.welcome.title', { defaultValue: 'Tham gia trò chuyện' })}
                </h1>
            </div>

            {/* Buttons Area */}
            <div className="pt-3 flex flex-wrap gap-2 w-full">
                <button
                    onClick={() => navigate('/signup')}
                    className="flex flex-row items-center justify-center bg-[#006AFF] hover:bg-blue-600 text-white rounded-full px-[14px] py-2 gap-1.25 transition-colors"
                >
                    <span className="text-[13.1px] font-medium leading-[17px] text-center">
                        {t('auth.welcome.create_account', { defaultValue: 'Tạo tài khoản' })}
                    </span>
                </button>

                <button
                    onClick={() => navigate('/login')}
                    className="flex flex-row items-center justify-center bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-[#405168] dark:text-dark-text rounded-full px-[14px] py-2 gap-1.25 transition-colors"
                >
                    <span className="text-[13.1px] font-medium leading-[17px] text-center">
                        {t('auth.welcome.login', { defaultValue: 'Đăng nhập' })}
                    </span>
                </button>
            </div>

            {/* Language Selector */}
            <div className="mt-3 w-full max-w-max relative group">
                <div className="flex items-center gap-2 bg-white dark:bg-dark-bg border border-transparent hover:border-gray-200 dark:hover:border-dark-border py-[5px] pl-2 pr-1 rounded-md cursor-pointer transition-all">
                    <span className="text-[13.1px] text-black dark:text-dark-text leading-[13.1px]">
                        {t(`language.${appLanguage}`)}
                    </span>
                    <FiChevronDown size={12} className="text-[#405168] dark:text-dark-text-secondary" />
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
