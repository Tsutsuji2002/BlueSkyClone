import React from 'react';
import { Link } from 'react-router-dom';

interface RichTextProps {
    content: string;
    className?: string;
}

const RichText: React.FC<RichTextProps> = ({ content, className }) => {
    if (!content) return null;

    // Unified regex for mentions and URLs
    const mentionRegex = /@([a-zA-Z0-9.-]+)/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const elements: (React.ReactNode | string)[] = [];

    // We'll split the text and then map over it to handle different types
    const parts = content.split(/(@[a-zA-Z0-9.-]+)|(https?:\/\/[^\s]+)/g).filter(Boolean);

    parts.forEach((part, index) => {
        if (part.startsWith('@')) {
            const handle = part.substring(1);
            elements.push(
                <Link
                    key={index}
                    to={`/profile/${handle}`}
                    className="text-primary-500 hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </Link>
            );
        } else if (part.startsWith('http')) {
            elements.push(
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part.length > 40 ? part.substring(0, 37) + '...' : part}
                </a>
            );
        } else {
            elements.push(part);
        }
    });

    return (
        <p className={className}>
            {elements.map((el, i) => (
                <React.Fragment key={i}>{el}</React.Fragment>
            ))}
        </p>
    );
};

export default RichText;
