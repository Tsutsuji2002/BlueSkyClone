import json
import os

locale_dir = r"c:\Projects\BlueSky\frontend\src\locales"
en_file = os.path.join(locale_dir, "en.json")

with open(en_file, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

def sync_keys(source, target):
    """Recursively sync keys from source to target, keeping target's values if they exist."""
    changes_made = False
    for key, value in source.items():
        if key not in target:
            target[key] = value
            changes_made = True
        elif isinstance(value, dict) and isinstance(target[key], dict):
            if sync_keys(value, target[key]):
                changes_made = True
    return changes_made

# Get all json files in locale_dir
files = [f for f in os.listdir(locale_dir) if f.endswith('.json') and f != 'en.json']

updated_count = 0
for filename in files:
    file_path = os.path.join(locale_dir, filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if sync_keys(en_data, data):
            # Sort the keys to keep it clean (optional but good)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            updated_count += 1
            print(f"Updated {filename}")
    except Exception as e:
        print(f"Error updating {filename}: {e}")

print(f"Total files updated: {updated_count}")
