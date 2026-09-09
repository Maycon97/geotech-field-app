import os
import re

def audit_file(filepath, base_dir='.'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match src or href
    matches = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', content)
    file_dir = os.path.dirname(filepath)
    missing = []
    
    for m in set(matches):
        if m.startswith(('http://', 'https://', '#', 'mailto:', 'tel:', 'javascript:', 'data:')):
            continue
        clean = m.split('?')[0].split('#')[0]
        if not clean:
            continue
        
        target = os.path.normpath(os.path.join(file_dir, clean))
        if not os.path.exists(target):
            missing.append((m, target))
            
    return missing

print("=== AUDIT INDEX.HTML ===")
missing_root = audit_file('index.html')
for orig, resolved in missing_root:
    print(f"MISSING: {orig} (resolved to {resolved})")
if not missing_root:
    print("All local assets in index.html exist!")

print("\n=== AUDIT STITCH/INDEX.HTML ===")
missing_stitch_idx = audit_file('stitch/index.html')
for orig, resolved in missing_stitch_idx:
    print(f"MISSING: {orig} (resolved to {resolved})")
if not missing_stitch_idx:
    print("All local assets in stitch/index.html exist!")

print("\n=== AUDIT REMOTE RESOURCES (SCRIPTS & STYLES) ===")
screens_dir = 'stitch/screens'
for screen in os.listdir(screens_dir):
    if screen.endswith('.html'):
        sc_path = os.path.join(screens_dir, screen)
        with open(sc_path, 'r', encoding='utf-8') as f:
            c = f.read()
        remotes = re.findall(r'(?:src|href)=["\'](https?://[^"\']+)["\']', c)
        clean_remotes = [r for r in remotes if not any(x in r for x in ['chat.whatsapp.com', 'fonts.googleapis.com', 'fonts.gstatic.com'])]
        if clean_remotes:
            print(f"Screen {screen}:")
            for r in clean_remotes:
                print(f"  REMOTE: {r}")

