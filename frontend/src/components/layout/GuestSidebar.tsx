import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { FiChevronDown } from 'react-icons/fi';
import ButterflyLogo from '../common/ButterflyLogo';

const GuestSidebar: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const appLanguage = useAppSelector((state) => state.language.appLanguage);

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
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
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                    <option value="en">English – English</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es">español – Spanish</option>
                    <option value="fr">français – French</option>
                    <option value="de">Deutsch – German</option>
                    <option value="ja">日本語 – Japanese</option>
                    <option value="ko">한국어 – Korean</option>
                    <option value="vi">Tiếng Việt – Vietnamese</option>
                    <option value="zh-CN">简体中文 – Simplified Chinese</option>
                    <option value="zh-TW">繁體中文 – Traditional Chinese</option>
                    <option value="pt-BR">português do Brasil – Brazilian Portuguese</option>
                    <option value="pt-PT">português europeu – European Portuguese</option>
                    <option value="it">italiano – Italian</option>
                    <option value="ru">русский – Russian</option>
                    <option value="uk">українська – Ukrainian</option>
                    <option value="hi">हिंदी – Hindi</option>
                    <option value="id">Bahasa Indonesia – Indonesian</option>
                    <option value="th">ภาษาไทย – Thai</option>
                    <option value="tr">Türkçe – Turkish</option>
                    <option value="pl">polski – Polish</option>
                    <option value="nl">Nederlands – Dutch</option>
                    <option value="sv">svenska – Swedish</option>
                    <option value="fi">suomi – Finnish</option>
                    <option value="el">Ελληνικά – Greek</option>
                    <option value="hu">magyar – Hungarian</option>
                    <option value="ro">română – Romanian</option>
                    <option value="ca">català – Catalan</option>
                    <option value="eu">euskara – Basque</option>
                    <option value="gl">galego – Galician</option>
                    <option value="ast">asturianu – Asturian</option>
                    <option value="an">aragonés – Aragonese</option>
                    <option value="cy">Cymraeg – Welsh</option>
                    <option value="da">dansk – Danish</option>
                    <option value="eo">Esperanto – Esperanto</option>
                    <option value="fy">Frysk – West Frisian</option>
                    <option value="ga">Gaeilge – Irish</option>
                    <option value="gd">Gàidhlig – Scottish Gaelic</option>
                    <option value="ia">Interlingua – Interlingua</option>
                    <option value="km">ภาษาเขมร – Khmer</option>
                    <option value="ne">नेपाली – Nepali</option>
                    <option value="yue">粵文 – Cantonese</option>
                </select>
            </div>
        </div>
    );
};

export default GuestSidebar;
