import re

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

for m in re.finditer(r'id=["\']tab-[^"\']+["\']', text):
    line_no = text.count('\n', 0, m.start()) + 1
    print(f"Linha {line_no}: {m.group(0)}")
