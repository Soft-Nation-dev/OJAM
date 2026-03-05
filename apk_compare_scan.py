import zipfile, os
markers = [
    'Lcom/softnation/ojam/MainApplication;',
    'Lcom/softnation/ojam/MainActivity;',
    'Lcom/softnation/ojam/MainApplicationKt;',
    'com.softnation.ojam.MainApplication',
]
apks = [
    ('PREVIEW', r'c:\Users\HP\Desktop\Ojam\temp-preview-latest.apk'),
    ('LOCAL', r'c:\Users\HP\Desktop\Ojam\android\app\build\outputs\apk\release\app-release.apk'),
]
for label, path in apks:
    print('===', label, path)
    print('exists', os.path.exists(path), 'size', os.path.getsize(path) if os.path.exists(path) else -1)
    found = {m: False for m in markers}
    with zipfile.ZipFile(path, 'r') as z:
        dex = [n for n in z.namelist() if n.endswith('.dex')]
        print('dex_count', len(dex))
        for d in dex:
            data = z.read(d)
            for m in markers:
                if (not found[m]) and (m.encode('utf-8') in data):
                    found[m] = True
    for k, v in found.items():
        print(k, ':', v)
    print()
