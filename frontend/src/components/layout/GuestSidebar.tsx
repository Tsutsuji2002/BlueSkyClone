import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { FiChevronDown } from 'react-icons/fi';
import Button from '../common/Button';
import ButterflyLogo from '../common/ButterflyLogo';

const GuestSidebar: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const appLanguage = useAppSelector((state) => state.language.appLanguage);

    const handleLanguageChange = (lang: string) => {
        // dispatch(setAppLanguage(lang)); // If you have a slice for it, keep it.
        i18n.changeLanguage(lang);
    };

    return (
        <div className="h-screen sticky top-0 flex flex-col items-start px-2 py-5 lg:py-8 lg:px-4">
            {/* Logo */}
            <div className="mb-6 cursor-pointer" onClick={() => navigate('/')}>
                <ButterflyLogo className="w-[42px] h-[38px] text-[#0085FF]" />
            </div>

            {/* Content Area - Roughly Centered Vertically */}
            <div className="flex-1 flex flex-col justify-center py-10">
                <h1 className="text-[32px] font-black leading-tight text-gray-900 dark:text-dark-text mb-8">
                    {t('auth.welcome.title', { defaultValue: 'Join the conversation' })}
                </h1>

                <div className="space-y-3 w-full max-w-[280px]">
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/signup')}
                        className="rounded-full font-bold text-[17px] h-[52px] bg-[#0085FF] hover:bg-[#0074e0] border-none"
                    >
                        {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                    </Button>

                    <Button
                        variant="ghost"
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/login')}
                        className="rounded-full font-bold text-[17px] h-[52px] bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-900 dark:text-dark-text border-none"
                    >
                        {t('auth.welcome.login', { defaultValue: 'Sign in' })}
                    </Button>
                </div>
            </div>

            {/* Language Selector */}
            <div className="mt-auto relative group">
                <div className="flex items-center gap-1 text-[15px] text-gray-500 dark:text-dark-text-secondary hover:underline cursor-pointer py-2">
                    <span>{t(`language.${appLanguage}`)}</span>
                    <FiChevronDown size={14} />
                </div>
                {/* Full list of 40+ languages matching bsky.app */}
                <select
                    value={appLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                    <option value="en">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es">español (Spanish)</option>
                    <option value="fr">français (French)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="ja">日本語 (Japanese)</option>
                    <option value="ko">한국어 (Korean)</option>
                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                    <option value="zh-CN">简体中文 (Simplified Chinese)</option>
                    <option value="zh-TW">繁體中文 (Traditional Chinese)</option>
                    <option value="pt-BR">português do Brasil (Brazilian Portuguese)</option>
                    <option value="pt-PT">português europeu (European Portuguese)</option>
                    <option value="it">italiano (Italian)</option>
                    <option value="ru">русский (Russian)</option>
                    <option value="uk">українська (Ukrainian)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="id">Bahasa Indonesia (Indonesian)</option>
                    <option value="th">ภาษาไทย (Thai)</option>
                    <option value="tr">Türkçe (Turkish)</option>
                    <option value="pl">polski (Polish)</option>
                    <option value="nl">Nederlands (Dutch)</option>
                    <option value="sv">svenska (Swedish)</option>
                    <option value="fi">suomi (Finnish)</option>
                    <option value="el">Ελληνικά (Greek)</option>
                    <option value="hu">magyar (Hungarian)</option>
                    <option value="ro">română (Romanian)</option>
                    <option value="ca">català (Catalan)</option>
                    <option value="eu">euskara (Basque)</option>
                    <option value="gl">galego (Galician)</option>
                    <option value="ast">asturianu (Asturian)</option>
                    <option value="an">aragonés (Aragonese)</option>
                    <option value="cy">Cymraeg (Welsh)</option>
                    <option value="da">dansk (Danish)</option>
                    <option value="eo">Esperanto</option>
                    <option value="fy">Frysk (West Frisian)</option>
                    <option value="ga">Gaeilge (Irish)</option>
                    <option value="gd">Gàidhlig (Scottish Gaelic)</option>
                    <option value="ia">Interlingua</option>
                    <option value="km">ภาษาเขมr (Khmer)</option>
                    <option value="ne">नेपाली (Nepali)</option>
                    <option value="yue">粵文 (Cantonese)</option>
                </select>
            </div>
        </div>
    );
};

export default GuestSidebar;
