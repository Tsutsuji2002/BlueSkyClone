export const formatHandleText = (handle?: string | null): string => {
    if (!handle) return '';

    const normalized = handle.startsWith('@') ? handle.slice(1) : handle;
    return normalized.startsWith('did:') ? normalized : `@${normalized}`;
};
