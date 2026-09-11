import re

with open('index.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        m = re.search(r'id=["\'](tab-[a-zA-Z0-9_-]+)["\']', line)
        if m:
            print(f"Line {i:5d}: {m.group(1)} -> {line.strip()[:80]}")
