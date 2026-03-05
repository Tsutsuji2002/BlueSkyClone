/**
 * A lightweight language detector for post content based on Unicode ranges
 * and common keyword heuristics.
 */

const VIETNAMESE_ACCENTS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const JAPANESE_SCRIPTS = /[\u3040-\u30ff\uff66-\uff9f]/; // Hiragana and Katakana
const CHINESE_SCRIPTS = /[\u4e00-\u9faf\u3400-\u4dbf]/; // CJK Unified Ideographs
const KOREAN_SCRIPTS = /[\uac00-\ud7af\u1100-\u11ff]/; // Hangul
const ARABIC_SCRIPTS = /[\u0600-\u06ff\u0750-\u077f]/;
const THAI_SCRIPTS = /[\u0e00-\u0e7f]/;
const CYRILLIC_SCRIPTS = /[\u0400-\u04ff]/;
const GREEK_SCRIPTS = /[\u0370-\u03ff]/;

export interface DetectedLanguage {
    code: string;
    confidence: number;
}

export const detectLanguage = (text: string): string => {
    if (!text || text.trim().length === 0) return 'en';

    // 1. Check for Japanese (Hiragana/Katakana are unique, Kanji is shared)
    if (JAPANESE_SCRIPTS.test(text)) return 'ja';

    // 2. Check for Korean (Hangul is unique)
    if (KOREAN_SCRIPTS.test(text)) return 'ko';

    // 3. Check for Vietnamese specific characters
    if (VIETNAMESE_ACCENTS.test(text)) return 'vi';

    // 4. Check for Chinese (Hanzi) - after Japanese/Korean checks
    if (CHINESE_SCRIPTS.test(text)) return 'zh';

    // 5. Check for Thai
    if (THAI_SCRIPTS.test(text)) return 'th';

    // 6. Check for Arabic/Persian
    if (ARABIC_SCRIPTS.test(text)) return 'ar';

    // 7. Check for Cyrillic (Russian, etc.)
    if (CYRILLIC_SCRIPTS.test(text)) return 'ru';

    // 8. Check for Greek
    if (GREEK_SCRIPTS.test(text)) return 'el';

    // Default to 'en' for other Latin-based or unidentified text
    return 'en';
};
