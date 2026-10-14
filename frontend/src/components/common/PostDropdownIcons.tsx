import React from 'react';

export const PostTranslateIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M5.002 17.036V5h14v12.036h-3.986a1 1 0 0 0-.639.23l-2.375 1.968-2.344-1.965a1 1 0 0 0-.643-.233H5.002ZM20.002 3h-16a1 1 0 0 0-1 1v14.036a1 1 0 0 0 1 1h4.65l2.704 2.266a1 1 0 0 0 1.28.004l2.74-2.27h4.626a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Zm-7.878 3.663c-1.39 0-2.5 1.135-2.5 2.515a1 1 0 0 0 2 0c0-.294.232-.515.5-.515a.507.507 0 0 1 .489.6.174.174 0 0 1-.027.048 1.1 1.1 0 0 1-.267.226c-.508.345-1.128.923-1.286 1.978a1 1 0 1 0 1.978.297.762.762 0 0 1 .14-.359c.063-.086.155-.169.293-.262.436-.297 1.18-.885 1.18-2.013 0-1.38-1.11-2.515-2.5-2.515ZM12 15.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
    </svg>
);

export const PostCopyTextIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M8.17 4A3.001 3.001 0 0 1 11 2h2c1.306 0 2.418.835 2.83 2H17a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1.17ZM8 6H7a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6Zm6 0V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1h4Z" />
    </svg>
);

export const PostMuteThreadIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M20.707 3.293a1 1 0 0 1 0 1.414l-16 16a1 1 0 0 1-1.414-1.414l2.616-2.616A1.998 1.998 0 0 1 5 15V9a2 2 0 0 1 2-2h2.697l5.748-3.832A1 1 0 0 1 17 4v1.586l2.293-2.293a1 1 0 0 1 1.414 0ZM15 7.586 7.586 15H7V9h2.697a2 2 0 0 0 1.11-.336L15 5.87v1.717Zm2 3.657-2 2v4.888l-2.933-1.955-1.442 1.442 4.82 3.214A1 1 0 0 0 17 20v-8.757Z" />
    </svg>
);

export const PostMuteAccountIcon = PostMuteThreadIcon;

export const PostMuteWordsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v4a1 1 0 0 1-.293.707L15 14.414V20a1 1 0 0 1-.758.97l-4 1A1 1 0 0 1 9 21v-6.586L3.293 8.707A1 1 0 0 1 3 8V4Zm2 1v2.586l5.707 5.707A1 1 0 0 1 11 14v5.72l2-.5V14a1 1 0 0 1 .293-.707L19 7.586V5H5Z" />
    </svg>
);

export const PostHideIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M2.293 2.293a1 1 0 0 1 1.414 0L7.335 5.92l.03.03 3.22 3.222 4.243 4.242 3.22 3.22.03.03 3.63 3.629a1 1 0 0 1-1.415 1.414l-3.09-3.09c-2.65 1.478-5.625 1.778-8.421.869-3.039-.987-5.779-3.37-7.67-7.027a1 1 0 0 1 0-.918c1.086-2.1 2.452-3.78 3.996-5.019L2.293 3.707a1 1 0 0 1 0-1.414Zm4.24 5.654 2.021 2.021a4 4 0 0 0 5.478 5.478l1.688 1.688c-2.042.982-4.246 1.124-6.32.45-2.34-.76-4.594-2.586-6.265-5.584.97-1.739 2.135-3.083 3.398-4.053Zm3.535 3.535 2.45 2.45a2 2 0 0 1-2.45-2.45Zm.81-5.405c3.573-.49 7.45 1.369 9.987 5.923a14.797 14.797 0 0 1-1.347 2.02 1 1 0 1 0 1.564 1.247 17.078 17.078 0 0 0 1.806-2.808 1 1 0 0 0 0-.918c-2.833-5.479-7.584-8.088-12.281-7.446a1 1 0 0 0 .271 1.982Z" />
    </svg>
);

export const PostBlockAccountIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M12 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM7.5 6.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM5.679 19c.709-2.902 3.079-5 6.321-5 .302 0 .595.018.878.053a1 1 0 0 0 .243-1.985A9.235 9.235 0 0 0 12 12c-4.3 0-7.447 2.884-8.304 6.696-.29 1.29.767 2.304 1.902 2.304H12a1 1 0 1 0 0-2H5.679Zm9.614-3.707a1 1 0 0 1 1.414 0L18 16.586l1.293-1.293a1 1 0 0 1 1.414 1.414L19.414 18l1.293 1.293a1 1 0 0 1-1.414 1.414L18 19.414l-1.293 1.293a1 1 0 0 1-1.414-1.414L16.586 18l-1.293-1.293a1 1 0 0 1 0-1.414Z" />
    </svg>
);

export const PostReportIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M11.14 4.494a.995.995 0 0 1 1.72 0l7.001 12.008a.996.996 0 0 1-.86 1.498H4.999a.996.996 0 0 1-.86-1.498L11.14 4.494Zm3.447-1.007c-1.155-1.983-4.019-1.983-5.174 0L2.41 15.494C1.247 17.491 2.686 20 4.998 20h14.004c2.312 0 3.751-2.509 2.587-4.506L14.587 3.487ZM13 9.019a1 1 0 1 0-2 0v2.994a1 1 0 1 0 2 0V9.02Zm-1 4.731a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
    </svg>
);

export const PostPinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M16 3a1 1 0 0 1 1 1v5.586l1.707 1.707A1 1 0 0 1 19 12v1a1 1 0 0 1-1 1h-5v7a1 1 0 0 1-2 0v-7H6a1 1 0 0 1-1-1v-1a1 1 0 0 1 .293-.707L7 9.586V4a1 1 0 0 1 1-1h8Zm-1 2H9v5a1 1 0 0 1-.293.707L7.414 12h9.172l-1.293-1.293A1 1 0 0 1 15 10V5Z" />
    </svg>
);

export const PostDeleteIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className={className}>
        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M9 3a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v12a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V7h1a1 1 0 1 0 0-2h-4V4a1 1 0 0 0-1-1H9Zm6 2V5H9v0h6ZM7 7h10v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7Zm3 3a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" />
    </svg>
);

export const ThreadOptionsIcon = ({ className = "w-[18px] h-[18px]" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="18" height="18" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M7 3a1 1 0 0 1 1 1v1.126a4 4 0 0 1 0 7.748V20a1 1 0 1 1-2 0v-7.126a4 4 0 0 1 0-7.748V4a1 1 0 0 1 1-1Zm10 0a1 1 0 0 1 1 1v9.126a4 4 0 1 1-2 0V4a1 1 0 0 1 1-1ZM7 7a2 2 0 1 0 0 4 2 2 0 1 0 0-4Zm10 8a2 2 0 1 0 0 4 2 2 0 1 0 0-4Z" />
    </svg>
);

export const PostBackIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg fill="none" viewBox="0 0 24 24" width="24" height="24" className={className}>
        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M3 12a1 1 0 0 1 .293-.707l6-6a1 1 0 0 1 1.414 1.414L6.414 11H20a1 1 0 1 1 0 2H6.414l4.293 4.293a1 1 0 0 1-1.414 1.414l-6-6A1 1 0 0 1 3 12Z" />
    </svg>
);

