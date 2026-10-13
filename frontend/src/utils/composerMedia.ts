let pendingComposerFiles: File[] = [];

export const setPendingComposerFiles = (files: File[]) => {
    pendingComposerFiles = [...files];
};

export const consumePendingComposerFiles = (): File[] => {
    const files = [...pendingComposerFiles];
    pendingComposerFiles = [];
    return files;
};

export const dispatchComposerMedia = (files: File[]) => {
    setPendingComposerFiles(files);
    window.dispatchEvent(
        new CustomEvent('bsky:add-composer-media', {
            detail: { files },
        })
    );
};
