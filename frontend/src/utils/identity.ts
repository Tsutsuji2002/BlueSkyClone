export const truncateIdentityText = (value?: string | null, max = 24): string => {
    if (!value) return '';

    const normalized = value.trim();
    if (normalized.length <= max) return normalized;

    return `${normalized.slice(0, Math.max(1, max - 3)).trimEnd()}...`;
};

export const formatHandleText = (handle?: string | null, max = 24): string => {
    if (!handle) return '';

    const normalized = handle.startsWith('@') ? handle.slice(1) : handle;
    const truncated = truncateIdentityText(normalized, max);

    return truncated.startsWith('did:') ? truncated : `@${truncated}`;
};
