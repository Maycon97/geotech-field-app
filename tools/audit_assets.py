import os
import re

def audit_assets():
    html_files = []
    for root, dirs, files in os.walk('.'):
        if any(ignored in root for ignored in ['.git', 'node_modules', '.gemini', 'scratch']):
            continue
        for f in files:
            if f.endswith('.html'):
                html_files.append(os.path.join(root, f))

    print(f"Auditando assets em {len(html_files)} arquivos HTML...")
    
    missing_images = []
    missing_scripts = []
    missing_css = []
    external_cdns = set()

    for hf in sorted(html_files):
        base_dir = os.path.dirname(hf)
        with open(hf, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Checar <img>
        imgs = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', content)
        for img in imgs:
            if img.startswith('data:') or img.startswith('${'):
                continue
            if img.startswith('http://') or img.startswith('https://'):
                external_cdns.add(img)
            else:
                img_clean = img.split('?')[0].split('#')[0]
                resolved = os.path.normpath(os.path.join(base_dir, img_clean))
                if not os.path.exists(resolved):
                    missing_images.append((hf, img, resolved))

        # Checar <script src="...">
        scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', content)
        for sc in scripts:
            if sc.startswith('http://') or sc.startswith('https://') or sc.startswith('//'):
                external_cdns.add(sc)
            else:
                sc_clean = sc.split('?')[0].split('#')[0]
                resolved = os.path.normpath(os.path.join(base_dir, sc_clean))
                if not os.path.exists(resolved):
                    missing_scripts.append((hf, sc, resolved))

        # Checar <link rel="stylesheet" href="...">
        links = re.findall(r'<link[^>]+href=["\']([^"\']+)["\']', content)
        for lk in links:
            if 'stylesheet' in lk or lk.endswith('.css'):
                if lk.startswith('http://') or lk.startswith('https://') or lk.startswith('//'):
                    external_cdns.add(lk)
                else:
                    lk_clean = lk.split('?')[0].split('#')[0]
                    resolved = os.path.normpath(os.path.join(base_dir, lk_clean))
                    if not os.path.exists(resolved):
                        missing_css.append((hf, lk, resolved))

    print(f"\n--- IMAGENS QUEBRADAS ({len(missing_images)}) ---")
    for hf, img, res in missing_images:
        print(f"  Em {hf}:\n    src='{img}' -> Inexistente em {res}")

    print(f"\n--- SCRIPTS LOCAIS QUEBRADOS ({len(missing_scripts)}) ---")
    for hf, sc, res in missing_scripts:
        print(f"  Em {hf}:\n    src='{sc}' -> Inexistente em {res}")

    print(f"\n--- FOLHAS DE ESTILO CSS QUEBRADAS ({len(missing_css)}) ---")
    for hf, lk, res in missing_css:
        print(f"  Em {hf}:\n    href='{lk}' -> Inexistente em {res}")

    print(f"\n--- DEPENDENCIAS EXTERNAS DE REDE (CDNs) ({len(external_cdns)}) ---")
    for cdn in sorted(external_cdns):
        print(f"  - {cdn}")

if __name__ == '__main__':
    audit_assets()
