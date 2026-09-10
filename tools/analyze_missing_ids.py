import re
from pathlib import Path

def main():
    html = Path('index.html').read_text(encoding='utf-8')
    html_ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html))

    app_js = Path('app.js').read_text(encoding='utf-8')

    # Find getElementById('...')
    accessed = set(re.findall(r'getElementById\s*\(\s*["\']([^"\']+)["\']\s*\)', app_js))
    missing = accessed - html_ids

    print(f"Total missing IDs: {len(missing)}")
    for m in sorted(missing):
        matches = [m_obj.start() for m_obj in re.finditer(rf'getElementById\s*\(\s*["\']{re.escape(m)}["\']\s*\)', app_js)]
        lines = [app_js[:pos].count('\n') + 1 for pos in matches]
        contexts = []
        for pos in matches:
            start = max(0, pos - 20)
            end = min(len(app_js), pos + 120)
            contexts.append(app_js[start:end].replace('\n', ' '))
        print(f"\nID: {m} (lines {lines})")
        for c in contexts[:2]:
            print(f"   Context: {c}")

if __name__ == '__main__':
    main()
