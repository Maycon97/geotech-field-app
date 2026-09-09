import re

def audit():
    with open('app.js', 'r', encoding='utf-8', errors='ignore') as f:
        js = f.read()

    with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()

    # Procurar chamadas a document.getElementById('...') em app.js
    ids_in_js = set(re.findall(r'document\.getElementById\(["\']([^"\']+)["\']\)', js))
    print(f"Total de IDs buscados via getElementById em app.js: {len(ids_in_js)}")

    # Procurar quais desses IDs NAO existem em index.html
    missing_ids = []
    for elem_id in ids_in_js:
        # Se id="..." nao estiver em html
        if not re.search(r'id=["\']' + re.escape(elem_id) + r'["\']', html):
            missing_ids.append(elem_id)

    print(f"\nIDs buscados no JS que NAO existem no index.html: {len(missing_ids)}")
    
    # Agora verificar onde esses IDs faltantes sao chamados com .addEventListener ou .value ou .innerHTML sem checagem de null!
    critical_missing = []
    for mid in sorted(missing_ids):
        # Procurar no JS trechos como document.getElementById('mid').algo
        patterns = [
            r'document\.getElementById\(["\']' + re.escape(mid) + r'["\']\)\.(addEventListener|value|innerHTML|textContent|style|classList|focus|click|checked|disabled|dataset)',
            r'const\s+(\w+)\s*=\s*document\.getElementById\(["\']' + re.escape(mid) + r'["\']\);\s*\n\s*\1\.'
        ]
        is_crit = False
        for pat in patterns:
            m = re.search(pat, js)
            if m:
                critical_missing.append((mid, m.group(0)[:80]))
                is_crit = True
                break

    print(f"\nCRITICOS (causam TypeError e travam a renderização): {len(critical_missing)}")
    for mid, snippet in critical_missing:
        print(f"  [ERRO CRITICO DE RENDERIZACAO] ID '{mid}':\n    Snippet: {snippet.strip()}")

if __name__ == '__main__':
    audit()
