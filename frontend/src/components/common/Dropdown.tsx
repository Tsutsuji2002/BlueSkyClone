import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/classNames';

export interface DropdownItem {
    id?: string;
    testId?: string;
    label?: string;
    content?: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
    hasDivider?: boolean;
    type?: 'default' | 'radio' | 'header';
    selected?: boolean;
    h?: boolean; // divider shorthand
    disabled?: boolean;
}

interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    align?: 'left' | 'right' | 'center';
    className?: string; // For adding custom classes like z-index
}

const Dropdown: React.FC<DropdownProps> = ({
    trigger,
    items,
    align = 'right',
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [openUpwards, setOpenUpwards] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const updateCoords = React.useCallback(() => {
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            });

            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const estimatedHeight = items.length * 52 + 20;

            if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
                setOpenUpwards(true);
            } else {
                setOpenUpwards(false);
            }
        }
    }, [items.length]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                dropdownRef.current && !dropdownRef.current.contains(target) &&
                menuRef.current && !menuRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
            
            // Lock body scroll
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            
            return () => {
                window.removeEventListener('resize', updateCoords);
                window.removeEventListener('scroll', updateCoords, true);
                document.body.style.overflow = originalStyle;
            };
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, updateCoords]);

    const getAlignmentStyles = (): React.CSSProperties => {
        const menuWidth = 256; // Matching 'w-64'
        const styles: React.CSSProperties = {
            position: 'fixed', // Changed to fixed for better portal stability
            width: `${menuWidth}px`,
            left: coords.left,
            zIndex: 9999,
        };

        const triggerRect = dropdownRef.current?.getBoundingClientRect();
        if (!triggerRect) return styles;

        if (openUpwards) {
            styles.bottom = window.innerHeight - triggerRect.top + 8;
        } else {
            styles.top = triggerRect.bottom + 8;
        }

        if (align === 'right') {
            styles.left = triggerRect.left + triggerRect.width - menuWidth;
        } else if (align === 'center') {
            styles.left = triggerRect.left + (triggerRect.width / 2) - (menuWidth / 2);
        } else {
            styles.left = triggerRect.left;
        }

        // Clamp to screen
        if (styles.left && (styles.left as number) < 8) styles.left = 8;
        if (styles.left && (styles.left as number) + menuWidth > window.innerWidth - 8) {
            styles.left = window.innerWidth - menuWidth - 8;
        }

        return styles;
    };

    return (
        <div className={cn("relative inline-block", className)} ref={dropdownRef}>
            <div className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {isOpen && createPortal(
                <>
                    {/* Transparent backdrop to catch clicks and lock background UI */}
                    <div 
                        className="fixed inset-0 z-[9998] bg-transparent cursor-default pointer-events-auto touch-none"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    />
                    <div
                        ref={menuRef}
                        style={getAlignmentStyles()}
                        className={cn(
                            'bg-white dark:bg-dark-surface border border-[#DCE2EA] dark:border-dark-border rounded-lg shadow-xl p-1 transition-all',
                            'max-h-[min(480px,80vh)] overflow-y-auto scrollbar-hide'
                        )}
                    >
                        {items.map((item, idx) => (
                            <React.Fragment key={item.id || `divider-${idx}`}>
                                {item.type === 'header' ? (
                                    <div
                                        dir="auto"
                                        className="text-[13.1px] tracking-[0.25px] text-[#8798B0] dark:text-[#8798B0] leading-[17px] font-semibold px-[10px] py-2 select-none text-left"
                                    >
                                        {item.label}
                                    </div>
                                ) : (
                                    (item.label || item.content) && (
                                        <button
                                            type="button"
                                            role="menuitem"
                                            tabIndex={-1}
                                            aria-label={item.label}
                                            data-testid={item.testId}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                item.onClick?.();
                                                // Delay closing to ensure the action (like file picker) is triggered
                                                if (!item.content || item.onClick) {
                                                    setTimeout(() => setIsOpen(false), 10);
                                                }
                                            }}
                                            className={cn(
                                                'w-full px-[10px] py-2 text-left flex items-center justify-between transition-colors font-semibold text-[13.1px] tracking-[0.25px] rounded-[4px] min-h-[32px] outline-none',
                                                'hover:bg-gray-100 dark:hover:bg-dark-hover',
                                                item.danger
                                                    ? 'text-red-500'
                                                    : 'text-[#232E3E] dark:text-dark-text',
                                                item.content ? 'p-0 h-auto' : ''
                                            )}
                                        >
                                            {item.content ? (
                                                item.content
                                            ) : (
                                                <>
                                                    <div dir="auto" className="text-[13.1px] tracking-[0.25px] leading-[17px] flex-1 font-semibold truncate text-left">
                                                        {item.label}
                                                    </div>
                                                    {item.type === 'radio' ? (
                                                        <div className="w-5 h-5 rounded-full border border-[#A5B2C5] dark:border-dark-border flex items-center justify-center flex-shrink-0 ml-3 relative">
                                                            {item.selected && (
                                                                <div className="w-[14px] h-[14px] rounded-full bg-[#006AFF]" />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        item.icon && (
                                                            <div className={cn("mr-[-2px] ml-3 flex-shrink-0", item.danger ? "text-red-500" : "text-[#405168] dark:text-[#8798B0]")}>
                                                                {item.icon}
                                                            </div>
                                                        )
                                                    )}
                                                </>
                                            )}
                                        </button>
                                    )
                                )}
                                {(item.hasDivider || item.h) && (
                                    <div role="separator" aria-orientation="horizontal" className="my-1 bg-[#DCE2EA] dark:bg-dark-border h-[1px] flex-shrink-0" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default Dropdown;
