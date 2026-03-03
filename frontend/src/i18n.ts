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
import an from './locales/an.json';
import ast from './locales/ast.json';
import enGB from './locales/en-GB.json';
import eo from './locales/eo.json';
import eu from './locales/eu.json';
import fy from './locales/fy.json';
import ga from './locales/ga.json';
import gd from './locales/gd.json';
import gl from './locales/gl.json';
import ia from './locales/ia.json';
import km from './locales/km.json';
import ne from './locales/ne.json';
import af from './locales/af.json';
import sq from './locales/sq.json';
import hy from './locales/hy.json';
import be from './locales/be.json';
import bg from './locales/bg.json';
import bn from './locales/bn.json';
import my from './locales/my.json';
import et from './locales/et.json';
import hr from './locales/hr.json';
import is from './locales/is.json';
import ka from './locales/ka.json';
import kk from './locales/kk.json';
import aa from './locales/aa.json';
import ab from './locales/ab.json';
import ak from './locales/ak.json';
import am from './locales/am.json';
import asLocale from './locales/as.json';
import av from './locales/av.json';
import ae from './locales/ae.json';
import ay from './locales/ay.json';
import az from './locales/az.json';
import ba from './locales/ba.json';
import bm from './locales/bm.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ky from './locales/ky.json';
import la from './locales/la.json';
import lv from './locales/lv.json';
import lt from './locales/lt.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import pa from './locales/pa.json';
import fa from './locales/fa.json';
import sl from './locales/sl.json';
import sw from './locales/sw.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import ur from './locales/ur.json';
import uz from './locales/uz.json';

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
    an: { translation: an },
    ast: { translation: ast },
    "en-GB": { translation: enGB },
    eo: { translation: eo },
    eu: { translation: eu },
    fy: { translation: fy },
    ga: { translation: ga },
    gd: { translation: gd },
    gl: { translation: gl },
    ia: { translation: ia },
    km: { translation: km },
    ne: { translation: ne },
    af: { translation: af },
    sq: { translation: sq },
    hy: { translation: hy },
    be: { translation: be },
    bg: { translation: bg },
    bn: { translation: bn },
    my: { translation: my },
    et: { translation: et },
    hr: { translation: hr },
    is: { translation: is },
    ka: { translation: ka },
    kk: { translation: kk },
    aa: { translation: aa },
    ab: { translation: ab },
    ak: { translation: ak },
    am: { translation: am },
    as: { translation: asLocale },
    av: { translation: av },
    ae: { translation: ae },
    ay: { translation: ay },
    az: { translation: az },
    ba: { translation: ba },
    bm: { translation: bm },
    gu: { translation: gu },
    kn: { translation: kn },
    ky: { translation: ky },
    la: { translation: la },
    lv: { translation: lv },
    lt: { translation: lt },
    ml: { translation: ml },
    mr: { translation: mr },
    pa: { translation: pa },
    fa: { translation: fa },
    sl: { translation: sl },
    sw: { translation: sw },
    ta: { translation: ta },
    te: { translation: te },
    ur: { translation: ur },
    uz: { translation: uz },
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
