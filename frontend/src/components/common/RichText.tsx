import React from 'react';
import { Link } from 'react-router-dom';
import { Facet } from '../../types';

interface RichTextProps {
    content: string;
    facets?: Facet[];
    className?: string;
}

const FALLBACK_TOKEN_REGEX = /(@[a-zA-Z0-9._-]+|https?:\/\/[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?|#[a-zA-Z0-9_]+)/g;
const TRAILING_PUNCTUATION_REGEX = /[),.!?:;]+$/;

const splitTrailingPunctuation = (value: string): { core: string; trailing: string } => {
    const match = value.match(TRAILING_PUNCTUATION_REGEX);
    if (!match) return { core: value, trailing: '' };
    const trailing = match[0];
    return {
        core: value.slice(0, value.length - trailing.length),
        trailing,
    };
};

const renderFallbackRichText = (text: string, keyPrefix: string) => {
    const parts = text.split(FALLBACK_TOKEN_REGEX).filter(Boolean);

    return parts.map((part, index) => {
        const { core, trailing } = splitTrailingPunctuation(part);
        const token = core || part;
        const tail = core ? trailing : '';

        if (token.startsWith('@')) {
            const handle = token.substring(1);
            return (
                <React.Fragment key={`${keyPrefix}-${index}`}>
                    <Link
                        to={`/profile/${handle}`}
                        className="text-primary-500 dark:text-primary-400 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {token}
                    </Link>
                    {tail}
                </React.Fragment>
            );
        }

        if (token.startsWith('#')) {
            const tag = token.substring(1);
            return (
                <React.Fragment key={`${keyPrefix}-${index}`}>
                    <Link
                        to={`/tag/${encodeURIComponent(tag)}`}
                        className="text-primary-500 dark:text-primary-400 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {token}
                    </Link>
                    {tail}
                </React.Fragment>
            );
        }

        const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(token);
        const isUrl = /^https?:\/\//i.test(token);
        const isBareDomain = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?$/.test(token);

        if (isEmail || isUrl || isBareDomain) {
            const href = isEmail
                ? `mailto:${token}`
                : isUrl
                    ? token
                    : `https://${token}`;
            return (
                <React.Fragment key={`${keyPrefix}-${index}`}>
                    <a
                        href={href}
                        target={isEmail ? undefined : "_blank"}
                        rel={isEmail ? undefined : "noopener noreferrer"}
                        className="text-primary-500 dark:text-primary-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {token}
                    </a>
                    {tail}
                </React.Fragment>
            );
        }

        return <React.Fragment key={`${keyPrefix}-${index}`}>{part}</React.Fragment>;
    });
};

const RichText: React.FC<RichTextProps> = ({ content, facets, className }) => {
    if (!content) return null;

    if (!facets || facets.length === 0) {
        return <p className={className}>{renderFallbackRichText(content, 'plain')}</p>;
    }

    try {
        const utf8Encoder = new TextEncoder();
        const utf8Decoder = new TextDecoder();
        const bytes = utf8Encoder.encode(content);
        const elements: React.ReactNode[] = [];
        let lastByteOffset = 0;

        // Sort facets by byteStart defensively
        const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

        sortedFacets.forEach((facet, i) => {
            const { byteStart, byteEnd } = facet.index;
            // Guard against invalid ranges
            if (byteStart < lastByteOffset || byteEnd <= byteStart || byteEnd > bytes.length) return;

            if (byteStart > lastByteOffset) {
                const plainTextSegment = utf8Decoder.decode(bytes.slice(lastByteOffset, byteStart));
                elements.push(
                    <React.Fragment key={`text-${i}`}>
                        {renderFallbackRichText(plainTextSegment, `text-${i}`)}
                    </React.Fragment>
                );
            }

            const facetBytes = bytes.slice(byteStart, byteEnd);
            const facetText = utf8Decoder.decode(facetBytes);
            const feature = facet.features?.[0];

            if (feature?.$type === 'app.bsky.richtext.facet#mention') {
                elements.push(
                    <Link
                        key={`facet-${i}`}
                        to={`/profile/${feature.did || facetText.substring(1)}`}
                        className="text-primary-500 dark:text-primary-400 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {facetText}
                    </Link>
                );
            } else if (feature?.$type === 'app.bsky.richtext.facet#link') {
                elements.push(
                    <a
                        key={`facet-${i}`}
                        href={feature.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-500 dark:text-primary-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {facetText.length > 40 ? facetText.substring(0, 37) + '...' : facetText}
                    </a>
                );
            } else if (feature?.$type === 'app.bsky.richtext.facet#tag') {
                elements.push(
                    <Link
                        key={`facet-${i}`}
                        to={`/tag/${feature.tag || facetText.substring(1)}`}
                        className="text-primary-500 dark:text-primary-400 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {facetText}
                    </Link>
                );
            } else {
                elements.push(
                    <React.Fragment key={`facet-${i}`}>
                        {renderFallbackRichText(facetText, `facet-${i}`)}
                    </React.Fragment>
                );
            }

            lastByteOffset = byteEnd;
        });

        if (lastByteOffset < bytes.length) {
            const trailingText = utf8Decoder.decode(bytes.slice(lastByteOffset));
            elements.push(
                <React.Fragment key="text-end">
                    {renderFallbackRichText(trailingText, 'text-end')}
                </React.Fragment>
            );
        }

        return <p className={className}>{elements}</p>;
    } catch {
        // Fallback to plain text if facet processing fails
        return <p className={className}>{content}</p>;
    }
};

export default RichText;
