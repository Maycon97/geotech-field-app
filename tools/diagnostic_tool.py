import os
import re

def check_html_file(filepath):
    errors = []
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    abs_paths = re.findall(r'(src|href)=["\'](/[^/"\'\s][^"\'\s]*)["\']', content)
    for attr, p in abs_paths:
        if not p.startswith('//'):
            errors.append(f"Caminho absoluto quebra no GitHub Pages: {attr}='{p}'")

    base_dir = os.path.dirname(filepath)
    local_refs = re.findall(r'(?:src|href)=["\']([^"\'\s:#?]+)["\']', content)
    for ref in local_refs:
        if ref.startswith('http') or ref.startswith('//') or ref.startswith('#') or ref.startswith('mailto:') or ref.startswith('data:'):
            continue
        resolved = os.path.normpath(os.path.join(base_dir, ref))
        if not os.path.exists(resolved):
            errors.append(f"Arquivo referenciado inexistente: '{ref}' (resolvido como '{resolved}')")

    script_tags_open = len(re.findall(r'<script\b', content, re.IGNORECASE))
    script_tags_close = len(re.findall(r'</script>', content, re.IGNORECASE))
    if script_tags_open != script_tags_close:
        errors.append(f"Tags script desbalanceadas: {script_tags_open} vs {script_tags_close}")

    return errors

html_files = []
for root, dirs, files in os.walk('.'):
    if any(ignored in root for ignored in ['.git', 'node_modules', '.gemini', 'scratch']):
        continue
    for f in files:
        if f.endswith('.html'):
            html_files.append(os.path.join(root, f))

total_issues = 0
for hf in sorted(html_files):
    issues = check_html_file(hf)
    if issues:
        print(f"\n[FALHA DE RENDERIZACAO POTENCIAL] {hf}:")
        for iss in issues:
            print(f"  - {iss}")
            total_issues += 1
    else:
        print(f"[OK] {hf}")

print(f"\n=== DIAGNOSTICO CONCLUIDO: {total_issues} problemas encontrados ===")
