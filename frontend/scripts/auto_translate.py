import os
import json
import time
from deep_translator import GoogleTranslator

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'locales')
EN_JSON_PATH = os.path.join(LOCALES_DIR, 'en.json')

# Flat list of keys we want to selectively target for auto-translation 
# to save API limits and avoid touching existing unlocalized strings.
TARGET_KEYS = [
    'messages.chat_settings_link',
    'chat_settings.title',
    'chat_settings.allow_messages_from',
    'chat_settings.everyone',
    'chat_settings.followers',
    'chat_settings.none',
    'chat_settings.allow_messages_from_desc',
    'chat_settings.allow_ongoing_desc',
    'settings.system_mode',
    'sidebar.more_feeds',
    'sidebar.search_placeholder',
    'feeds.my_feeds_hint',
    'feeds.liked_by_users',
    'feeds.recommended_for_you',
    'feeds.search_feeds_placeholder',
    'language.modal_title',
    'language.modal_desc',
    'language.add_more',
    'language.search_languages',
    'language.search_languages_placeholder',
    'language.recently_used',
    'language.all_languages',
    'language.no_results',
    'language.done'
]

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        f.write('\n')

def get_flat_val(data, flat_key):
    keys = flat_key.split('.')
    current = data
    for k in keys:
        if k in current:
            current = current[k]
        else:
            return None
    return current

def set_flat_val(data, flat_key, value):
    keys = flat_key.split('.')
    current = data
    for i, k in enumerate(keys):
        if i == len(keys) - 1:
            current[k] = value
        else:
            if k not in current:
                current[k] = {}
            current = current[k]

def run_translation():
    if not os.path.exists(EN_JSON_PATH):
        print("en.json not found.")
        return

    en_data = load_json(EN_JSON_PATH)

    lang_map = {
        'pt-BR': 'pt',
        'pt-PT': 'pt',
        'zh-HK': 'zh-TW',
        'zh': 'zh-CN',
        'eo': 'eo',
        'ast': 'es',
        'an': 'es',
        'ia': 'la',
    }

    try:
        supported_langs = GoogleTranslator().get_supported_languages(as_dict=True)
        supported_codes = set(supported_langs.values())
        print(f"Fetched {len(supported_codes)} supported languages from Google Translate.")
    except Exception as e:
        print("Failed to fetch supported languages:", e)
        supported_codes = set()

    files = [f for f in os.listdir(LOCALES_DIR) if f.endswith('.json') and f not in ('en.json', 'ja.json', 'vi.json')]

    total_translated = 0
    for filename in files:
        lang_code = filename.replace('.json', '')
        file_path = os.path.join(LOCALES_DIR, filename)
        
        target_lang = lang_map.get(lang_code, lang_code.split('-')[0].lower())
        if lang_code.lower() == 'zh-cn': target_lang = 'zh-CN'
        if lang_code.lower() == 'zh-tw': target_lang = 'zh-TW'
        
        if target_lang not in supported_codes and target_lang.lower() not in supported_codes:
            print(f"Skipping {filename} - '{target_lang}' not supported by Google Translate")
            continue

        try:
            lang_data = load_json(file_path)
        except Exception as e:
            continue

        texts_to_translate = []
        keys_to_update = []

        for flat_key in TARGET_KEYS:
            en_val = get_flat_val(en_data, flat_key)
            lang_val = get_flat_val(lang_data, flat_key)
            
            if en_val and isinstance(en_val, str) and lang_val == en_val:
                texts_to_translate.append(en_val)
                keys_to_update.append(flat_key)
        
        if not texts_to_translate:
            continue
            
        print(f"Translating {len(texts_to_translate)} strings roughly to '{target_lang}' for {filename}...")
        try:
            translator = GoogleTranslator(source='en', target=target_lang)
            translations = translator.translate_batch(texts_to_translate)
            
            for i, translated_text in enumerate(translations):
                if translated_text:
                    set_flat_val(lang_data, keys_to_update[i], translated_text)
                    total_translated += 1
            
            save_json(file_path, lang_data)
        except Exception as e:
            print(f"Failed {filename}: {e}")

    print(f"Done! Translated {total_translated} entries across all files.")

if __name__ == '__main__':
    run_translation()
