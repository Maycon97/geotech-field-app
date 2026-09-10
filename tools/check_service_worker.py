from pathlib import Path
import re

def check_sw():
    sw_text = Path('service-worker.js').read_text(encoding='utf-8')
    urls = re.findall(r'["\'](\./[^"\']+)["\']', sw_text)
    print(f"Total items in APP_SHELL: {len(urls)}")
    
    missing_on_disk = []
    for u in urls:
        if u == './': continue
        p = Path(u.replace('./', ''))
        if not p.exists():
            missing_on_disk.append(u)
    
    if missing_on_disk:
        print("[!] Arquivos no APP_SHELL que NÃO existem no disco (causam falha no cache.addAll):")
        for m in missing_on_disk:
            print(f"  - {m}")
    else:
        print("[OK] Todos os arquivos do APP_SHELL existem no disco.")

    # Check what index.html loads that is not in APP_SHELL
    index_html = Path('index.html').read_text(encoding='utf-8')
    scripts = re.findall(r'<script\s+[^>]*src=["\']([^"\']+)["\']', index_html)
    csses = re.findall(r'<link\s+[^>]*href=["\']([^"\']+)["\']', index_html)

    all_loaded = []
    for s in scripts:
        clean = s.split('?')[0]
        if not clean.startswith('http'): all_loaded.append(clean)
    for c in csses:
        clean = c.split('?')[0]
        if not clean.startswith('http') and ('css' in clean or 'manifest' in clean): all_loaded.append(clean)

    app_shell_clean = [u.replace('./', '') for u in urls]
    missing_from_cache = [item for item in set(all_loaded) if item not in app_shell_clean]
    
    if missing_from_cache:
        print("\n[!] Arquivos carregados no index.html que NÃO estão no APP_SHELL do Service Worker:")
        for item in sorted(missing_from_cache):
            print(f"  - {item}")
    else:
        print("\n[OK] Todos os scripts e estilos do index.html estão no APP_SHELL.")

if __name__ == '__main__':
    check_sw()
