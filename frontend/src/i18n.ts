import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import pl from './locales/pl.json';
import it from './locales/it.json';
import ptBR from './locales/pt-BR.json';
import nl from './locales/nl.json';
import tr from './locales/tr.json';
import uk from './locales/uk.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import ar from './locales/ar.json';
import el from './locales/el.json';
import he from './locales/he.json';
import da from './locales/da.json';
import sv from './locales/sv.json';
import fi from './locales/fi.json';
import hu from './locales/hu.json';
import ro from './locales/ro.json';
import ptPT from './locales/pt-PT.json';
import zhTW from './locales/zh-TW.json';
import zhCN from './locales/zh-CN.json';
import zhHK from './locales/zh-HK.json';
import no from './locales/no.json';
import cs from './locales/cs.json';
import sk from './locales/sk.json';
import ca from './locales/ca.json';
import cy from './locales/cy.json';

const resources = {
    en: { translation: en },
    vi: { translation: vi },
    ja: { translation: ja },
    zh: { translation: zh },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    ko: { translation: ko },
    ru: { translation: ru },
    th: { translation: th },
    pl: { translation: pl },
    it: { translation: it },
    "pt-BR": { translation: ptBR },
    nl: { translation: nl },
    tr: { translation: tr },
    uk: { translation: uk },
    hi: { translation: hi },
    id: { translation: id },
    ar: { translation: ar },
    el: { translation: el },
    he: { translation: he },
    da: { translation: da },
    sv: { translation: sv },
    fi: { translation: fi },
    hu: { translation: hu },
    ro: { translation: ro },
    "pt-PT": { translation: ptPT },
    "zh-TW": { translation: zhTW },
    "zh-CN": { translation: zhCN },
    "zh-HK": { translation: zhHK },
    no: { translation: no },
    cs: { translation: cs },
    sk: { translation: sk },
    ca: { translation: ca },
    cy: { translation: cy },
    // Registering other requested codes (fallback to en/vi for now as they are placeholder for UI)
    an: { translation: en },
    ast: { translation: en },
    "en-GB": { translation: en },
    eo: { translation: en },
    eu: { translation: en },
    fy: { translation: en },
    ga: { translation: en },
    gd: { translation: en },
    gl: { translation: en },
    ia: { translation: en },
    km: { translation: en },
    ne: { translation: en },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
