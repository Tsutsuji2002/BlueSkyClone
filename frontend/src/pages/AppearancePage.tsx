import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setColorMode, setDarkVariant, setFontFamily, setFontSize } from '../redux/slices/themeSlice';
import { useTranslation } from 'react-i18next';
import {
    FiArrowLeft, FiTablet, FiMoon, FiType, FiMaximize2
} from 'react-icons/fi';
import { cn } from '../utils/classNames';

const AppearancePage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { colorMode, darkVariant, fontFamily, fontSize } = useAppSelector((state) => state.theme);

    const SegmentedControl = ({
        options,
        value,
        onChange
    }: {
        options: { label: string; value: string }[],
        value: string,
        onChange: (val: any) => void
    }) => (
        <div className="flex bg-gray-100 dark:bg-dark-surface p-1 rounded-xl w-full">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                        value === opt.value
                            ? "bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text shadow-sm"
                            : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );

    return (
        <MainLayout>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('appearance.title')}
                    </h1>
                </div>

                <div className="p-4 space-y-8">
                    {/* Chế độ màu */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold">
                            <FiTablet size={18} />
                            <span>{t('appearance.color_mode')}</span>
                        </div>
                        <SegmentedControl
                            options={[
                                { label: t('appearance.system'), value: 'system' },
                                { label: t('appearance.light'), value: 'light' },
                                { label: t('appearance.dark'), value: 'dark' },
                            ]}
                            value={colorMode}
                            onChange={(val) => dispatch(setColorMode(val))}
                        />
                    </section>

                    {/* Chế độ tối */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold">
                            <FiMoon size={18} />
                            <span>{t('appearance.dark_variant')}</span>
                        </div>
                        <SegmentedControl
                            options={[
                                { label: t('appearance.dim'), value: 'dim' },
                                { label: t('appearance.dark'), value: 'dark' },
                            ]}
                            value={darkVariant}
                            onChange={(val) => dispatch(setDarkVariant(val))}
                        />
                    </section>

                    <div className="h-px bg-gray-100 dark:bg-dark-border my-6" />

                    {/* Phông chữ */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold">
                            <FiType size={18} />
                            <span>{t('appearance.font_family')}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary leading-snug px-1">
                            {t('appearance.font_family_desc')}
                        </p>
                        <SegmentedControl
                            options={[
                                { label: t('appearance.system'), value: 'system' },
                                { label: t('appearance.ui_font'), value: 'ui' },
                            ]}
                            value={fontFamily}
                            onChange={(val) => dispatch(setFontFamily(val))}
                        />
                    </section>

                    {/* Kích cỡ phông chữ */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold">
                            <FiMaximize2 size={18} />
                            <span>{t('appearance.font_size')}</span>
                        </div>
                        <SegmentedControl
                            options={[
                                { label: t('appearance.smaller'), value: 'sm' },
                                { label: t('appearance.default'), value: 'md' },
                                { label: t('appearance.larger'), value: 'lg' },
                            ]}
                            value={fontSize}
                            onChange={(val) => dispatch(setFontSize(val))}
                        />
                    </section>
                </div>
            </div>
        </MainLayout>
    );
};

export default AppearancePage;
