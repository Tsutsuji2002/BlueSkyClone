import React from 'react';
import { Link } from 'react-router-dom';

interface RichTextProps {
    content: string;
    className?: string;
}

const RichText: React.FC<RichTextProps> = ({ content, className }) => {
    if (!content) return null;

    // Regex for mentions: @ followed by alpha-numeric, dot or hyphen
    // We want to ensure it's not preceded by a character that makes it look like an email
    // or followed by a character that isn't part of a handle.
    const universalMentionRegex = /@([a-zA-Z0-9.-]+)/g;

    const elements: (React.ReactNode | string)[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex index
    universalMentionRegex.lastIndex = 0;

    while ((match = universalMentionRegex.exec(content)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
            elements.push(content.substring(lastIndex, match.index));
        }

        const fullMention = match[0];
        const handle = match[1];

        // Add the mention as a Link
        elements.push(
            <Link
                key={match.index}
                to={`/profile/${handle}`}
                className="text-primary-500 hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
            >
                {fullMention}
            </Link>
        );

        lastIndex = universalMentionRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        elements.push(content.substring(lastIndex));
    }

    return (
        <p className={className}>
            {elements.map((el, i) => (
                <React.Fragment key={i}>{el}</React.Fragment>
            ))}
        </p>
    );
};

export default RichText;
