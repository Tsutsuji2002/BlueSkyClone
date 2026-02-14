import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/classNames';

export interface DropdownItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    hasDivider?: boolean;
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
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
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
        <div className={cn("inline-block", className)} ref={dropdownRef}>
            <div className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    style={getAlignmentStyles()}
                    className={cn(
                        'bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-xl py-1 transition-all',
                        'max-h-[min(480px,80vh)] overflow-y-auto scrollbar-hide'
                    )}
                >
                    {items.map((item) => (
                        <React.Fragment key={item.id}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    item.onClick();
                                    // Delay closing to ensure the action (like file picker) is triggered
                                    setTimeout(() => setIsOpen(false), 10);
                                }}
                                className={cn(
                                    'w-full px-4 py-3 text-left flex items-center justify-between transition-colors font-semibold text-[15px]',
                                    'hover:bg-gray-50 dark:hover:bg-dark-hover',
                                    item.danger
                                        ? 'text-red-500'
                                        : 'text-gray-900 dark:text-dark-text'
                                )}
                            >
                                <span>{item.label}</span>
                                {item.icon && <span className={cn("text-lg", item.danger ? "text-red-500" : "text-gray-500")}>{item.icon}</span>}
                            </button>
                            {item.hasDivider && (
                                <div className="h-[1px] bg-gray-100 dark:bg-dark-border mx-0" />
                            )}
                        </React.Fragment>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default Dropdown;
