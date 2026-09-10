import os
import re
import json
import glob
from pathlib import Path

def run_scanner():
    root = Path(".")
    issues = []

    print("=" * 60)
    print("MDSYNC & HUB STITCH PROGRAMMING ERROR SCANNER")
    print("=" * 60)

    # 1. SW.JS ASSET INTEGRITY
    print("\n[1] Checando integridade do Service Worker (sw.js)...")
    sw_path = root / "sw.js"
    if sw_path.exists():
        content = sw_path.read_text(encoding="utf-8")
        # Find array of cached assets
        asset_matches = re.findall(r"['\"]([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)['\"]", content)
        for asset in sorted(set(asset_matches)):
            if asset.startswith("http") or asset.startswith("data:"):
                continue
            clean_path = asset.lstrip("./")
            # If path has query or fragment, strip
            clean_path = clean_path.split("?")[0].split("#")[0]
            if not (root / clean_path).exists():
                issues.append({
                    "severity": "HIGH",
                    "file": "sw.js",
                    "type": "SW_MISSING_CACHE_ASSET",
                    "detail": f"Arquivo no cache do Service Worker não existe: {clean_path}"
                })
                print(f"  [AVISO] Arquivo no sw.js inexistente: {clean_path}")
    else:
        print("  sw.js não encontrado na raiz.")

    # 2. CHECK BRACKETS / PARENS / BRACES in ALL JS FILES
    print("\n[2] Checando sintaxe léxica (chaves, colchetes, parênteses) em arquivos .js...")
    js_files = list(root.glob("**/*.js"))
    for js_file in js_files:
        # ignore node_modules or .git if any
        if ".git" in str(js_file) or "__pycache__" in str(js_file):
            continue
        try:
            code = js_file.read_text(encoding="utf-8")
        except Exception as e:
            issues.append({
                "severity": "CRITICAL",
                "file": str(js_file),
                "type": "ENCODING_ERROR",
                "detail": f"Erro de leitura: {e}"
            })
            continue

        # Simple lexer stripping comments and strings
        pos = 0
        n = len(code)
        stack = []
        line_num = 1
        col_num = 1

        in_line_comment = False
        in_block_comment = False
        in_str = None
        in_regex = False
        escaped = False

        while pos < n:
            ch = code[pos]
            next_ch = code[pos+1] if pos+1 < n else ""

            if ch == '\n':
                line_num += 1
                col_num = 1
                if in_line_comment:
                    in_line_comment = False
                pos += 1
                continue
            else:
                col_num += 1

            if in_line_comment:
                pos += 1
                continue

            if in_block_comment:
                if ch == '*' and next_ch == '/':
                    in_block_comment = False
                    pos += 2
                    continue
                pos += 1
                continue

            if in_str:
                if escaped:
                    escaped = False
                elif ch == '\\':
                    escaped = True
                elif ch == in_str:
                    in_str = None
                pos += 1
                continue

            # Check comments
            if ch == '/' and next_ch == '/':
                in_line_comment = True
                pos += 2
                continue
            if ch == '/' and next_ch == '*':
                in_block_comment = True
                pos += 2
                continue

            # Strings & template literals
            if ch in ('"', "'", '`'):
                in_str = ch
                escaped = False
                pos += 1
                continue

            # Stack tracking for delimiters
            if ch in ('{', '(', '['):
                stack.append((ch, line_num, col_num))
            elif ch in ('}', ')', ']'):
                expected = {'}': '{', ')': '(', ']': '['}[ch]
                if not stack:
                    issues.append({
                        "severity": "CRITICAL",
                        "file": str(js_file),
                        "type": "UNMATCHED_CLOSING_DELIMITER",
                        "detail": f"Fechamento '{ch}' inesperado na linha {line_num}:{col_num}"
                    })
                else:
                    top, top_line, top_col = stack.pop()
                    if top != expected:
                        issues.append({
                            "severity": "CRITICAL",
                            "file": str(js_file),
                            "type": "MISMATCHED_DELIMITER",
                            "detail": f"Esperava fechar '{top}' (aberto em {top_line}:{top_col}), mas encontrou '{ch}' na linha {line_num}:{col_num}"
                        })
            pos += 1

        if stack:
            for top, top_line, top_col in stack[:5]:
                issues.append({
                    "severity": "CRITICAL",
                    "file": str(js_file),
                    "type": "UNCLOSED_DELIMITER",
                    "detail": f"Delimitador '{top}' aberto na linha {top_line}:{top_col} não foi fechado."
                })
            print(f"  [ERRO SINTAXE] {js_file}: {len(stack)} delimitadores abertos!")
        else:
            # OK
            pass

    # 3. CHECK HTML INLINE ONCLICK / ONCHANGE HANDLERS
    print("\n[3] Checando funções chamadas nos atributos onclick/onchange nos HTMLs...")
    # Collect all globally defined function names in JS files
    defined_functions = set()
    for js_file in js_files:
        if ".git" in str(js_file) or "vendor" in str(js_file):
            continue
        try:
            content = js_file.read_text(encoding="utf-8")
        except:
            continue
        # regex for function declaration
        funcs = re.findall(r"(?:function\s+([a-zA-Z0-9_$]+)|(?:window\.)([a-zA-Z0-9_$]+)\s*=|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\()", content)
        for f1, f2, f3 in funcs:
            if f1: defined_functions.add(f1)
            if f2: defined_functions.add(f2)
            if f3: defined_functions.add(f3)

    html_files = list(root.glob("*.html")) + list(root.glob("stitch/**/*.html"))
    for html_file in html_files:
        if ".git" in str(html_file): continue
        content = html_file.read_text(encoding="utf-8")
        # find event handlers: onclick="func(...)", onchange="..."
        handlers = re.findall(r"\bon[a-z]+\s*=\s*[\"']\s*([a-zA-Z0-9_$]+)\s*\(", content)
        for h in set(handlers):
            # some standard or common JS methods
            if h in ("alert", "confirm", "prompt", "console", "event", "stopPropagation", "preventDefault", "history", "window", "location"):
                continue
            if h not in defined_functions:
                # check if defined in script tag in that html
                if f"function {h}" not in content and f"{h} =" not in content and f"{h}=" not in content:
                    issues.append({
                        "severity": "MEDIUM",
                        "file": str(html_file),
                        "type": "UNDEFINED_EVENT_HANDLER",
                        "detail": f"Função '{h}()' referenciada em evento HTML mas não encontrada no escopo JS."
                    })

    # 4. CHECK DOM IDs ACCESSED IN JS VS HTML
    print("\n[4] Checando IDs manipulados no JS vs existentes no index.html...")
    index_html = (root / "index.html").read_text(encoding="utf-8")
    existing_ids = set(re.findall(r'\bid=["\']([a-zA-Z0-9_\-]+)["\']', index_html))
    app_js = (root / "app.js").read_text(encoding="utf-8")

    # getElementById
    accessed_ids = set(re.findall(r"getElementById\s*\(\s*['\"]([a-zA-Z0-9_\-]+)['\"]\s*\)", app_js))
    # querySelector('#...')
    qs_ids = set(re.findall(r"querySelector(?:All)?\s*\(\s*['\"]#([a-zA-Z0-9_\-]+)['\"]\s*\)", app_js))
    all_accessed = accessed_ids | qs_ids

    missing_in_dom = all_accessed - existing_ids
    print(f"  Total de IDs buscados em app.js: {len(all_accessed)}")
    print(f"  Total de IDs existentes em index.html: {len(existing_ids)}")
    print(f"  IDs buscados mas NÃO encontrados no index.html: {len(missing_in_dom)}")

    # Check which missing IDs are accessed without null-checks (e.g. document.getElementById('x').innerHTML or .addEventListener)
    unsafe_access = []
    for mid in missing_in_dom:
        # check pattern: getElementById('mid').something
        pattern = rf"getElementById\s*\(\s*['\"]{re.escape(mid)}['\"]\s*\)\s*\."
        matches = list(re.finditer(pattern, app_js))
        if matches:
            for m in matches:
                # find line number
                line_no = app_js[:m.start()].count('\n') + 1
                unsafe_access.append((mid, line_no, m.group(0)))

    for mid, line_no, snippet in unsafe_access:
        issues.append({
            "severity": "HIGH",
            "file": "app.js",
            "type": "UNSAFE_DOM_ACCESS",
            "detail": f"Acesso direto encadeado ao ID inexistente '{mid}' na linha {line_no} ({snippet})"
        })
        print(f"  [UNSAFE DOM ACCESS] ID '{mid}' na linha {line_no}: {snippet}")

    # 5. CHECK JSON FILES SYNTAX & INTEGRITY
    print("\n[5] Checando sintaxe e integridade de arquivos JSON...")
    json_files = list(root.glob("data/**/*.json")) + list(root.glob("*.json"))
    for jf in json_files:
        try:
            json.loads(jf.read_text(encoding="utf-8"))
        except Exception as e:
            issues.append({
                "severity": "CRITICAL",
                "file": str(jf),
                "type": "INVALID_JSON",
                "detail": f"Erro de sintaxe JSON: {e}"
            })
            print(f"  [JSON CORRUPTO] {jf}: {e}")

    # 6. CHECK SCRIPT AND LINK TAGS IN ALL HTML FILES
    print("\n[6] Checando se scripts e stylesheets referenciados nos HTMLs existem fisicamente...")
    for html_file in html_files:
        content = html_file.read_text(encoding="utf-8")
        srcs = re.findall(r'<script\s+[^>]*src=["\']([^"\']+)["\']', content)
        hrefs = re.findall(r'<link\s+[^>]*href=["\']([^"\']+)["\']', content)

        parent_dir = html_file.parent
        for src in srcs:
            if src.startswith("http") or src.startswith("//") or src.startswith("data:"):
                continue
            clean_src = src.split("?")[0].split("#")[0]
            target = (parent_dir / clean_src).resolve()
            if not target.exists():
                issues.append({
                    "severity": "HIGH",
                    "file": str(html_file),
                    "type": "BROKEN_SCRIPT_SRC",
                    "detail": f"<script src='{src}'> aponta para arquivo inexistente: {target}"
                })
                print(f"  [BROKEN SCRIPT] em {html_file.name}: {src}")

        for href in hrefs:
            if href.startswith("http") or href.startswith("//") or href.startswith("data:") or "stylesheet" not in content:
                continue
            clean_href = href.split("?")[0].split("#")[0]
            target = (parent_dir / clean_href).resolve()
            if not target.exists():
                issues.append({
                    "severity": "HIGH",
                    "file": str(html_file),
                    "type": "BROKEN_LINK_HREF",
                    "detail": f"<link href='{href}'> aponta para arquivo inexistente: {target}"
                })
                print(f"  [BROKEN LINK] em {html_file.name}: {href}")

    # Summary
    print("\n" + "=" * 60)
    print(f"VARREDURA FINALIZADA: {len(issues)} possíveis problemas identificados.")
    print("=" * 60)
    crit = [i for i in issues if i["severity"] == "CRITICAL"]
    high = [i for i in issues if i["severity"] == "HIGH"]
    med = [i for i in issues if i["severity"] == "MEDIUM"]
    print(f"Críticos: {len(crit)} | Altos: {len(high)} | Médios: {len(med)}")

    with open("tools/scan_report.json", "w", encoding="utf-8") as rf:
        json.dump(issues, rf, indent=2, ensure_ascii=False)
    print("Relatório detalhado salvo em tools/scan_report.json")

if __name__ == "__main__":
    run_scanner()
