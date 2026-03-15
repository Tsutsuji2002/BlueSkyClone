import React from 'react';
import { Link } from 'react-router-dom';
import { Facet } from '../../types';

interface RichTextProps {
    content: string;
    facets?: Facet[];
    className?: string;
}

const RichText: React.FC<RichTextProps> = ({ content, facets, className }) => {
    if (!content) return null;

    if (!facets || facets.length === 0) {
        // Fallback to simple regex if no facets provided (e.g. legacy posts)
        const parts = content.split(/(@[a-zA-Z0-9.-]+)|(https?:\/\/[^\s]+)|(#\w+)/g).filter(Boolean);
        return (
            <p className={className}>
                {parts.map((part, index) => {
                    if (part.startsWith('@')) {
                        const handle = part.substring(1);
                        return (
                            <Link key={index} to={`/profile/${handle}`} className="text-primary-500 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                                {part}
                            </Link>
                        );
                    } else if (part.startsWith('#')) {
                        const tag = part.substring(1);
                        return (
                            <Link key={index} to={`/tag/${tag}`} className="text-primary-500 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                                {part}
                            </Link>
                        );
                    } else if (part.startsWith('http')) {
                        return (
                            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                                {part.length > 40 ? part.substring(0, 37) + '...' : part}
                            </a>
                        );
                    }
                    return part;
                })}
            </p>
        );
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
                elements.push(<span key={`text-${i}`}>{utf8Decoder.decode(bytes.slice(lastByteOffset, byteStart))}</span>);
            }

            const facetBytes = bytes.slice(byteStart, byteEnd);
            const facetText = utf8Decoder.decode(facetBytes);
            const feature = facet.features?.[0];

            if (feature?.$type === 'app.bsky.richtext.facet#mention') {
                elements.push(
                    <Link
                        key={`facet-${i}`}
                        to={`/profile/${feature.did || facetText.substring(1)}`}
                        className="text-primary-500 hover:underline font-medium"
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
                        className="text-primary-500 hover:underline"
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
                        className="text-primary-500 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {facetText}
                    </Link>
                );
            } else {
                elements.push(<span key={`facet-${i}`}>{facetText}</span>);
            }

            lastByteOffset = byteEnd;
        });

        if (lastByteOffset < bytes.length) {
            elements.push(<span key="text-end">{utf8Decoder.decode(bytes.slice(lastByteOffset))}</span>);
        }

        return <p className={className}>{elements}</p>;
    } catch {
        // Fallback to plain text if facet processing fails
        return <p className={className}>{content}</p>;
    }
};

export default RichText;
