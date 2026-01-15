/// <reference types="react-scripts" />

declare module 'emoji-picker-react' {
    import * as React from 'react';

    export interface EmojiClickData {
        activeSkinTone: string;
        unified: string;
        unifiedWithoutSkinTone: string;
        emoji: string;
        names: string[];
        getImageUrl: (emojiStyle: string) => string;
    }

    export enum Theme {
        DARK = 'dark',
        LIGHT = 'light',
        AUTO = 'auto',
    }

    export interface Props {
        onEmojiClick?: (emojiData: EmojiClickData, event: MouseEvent) => void;
        theme?: Theme;
        [key: string]: any;
    }

    const EmojiPicker: React.FC<Props>;
    export default EmojiPicker;
}
