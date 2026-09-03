from pathlib import Path
import re

html = Path("index.html").read_text(encoding="utf-8")
css = Path("styles.css").read_text(encoding="utf-8")

# Check all script sources exist
scripts = re.findall(r'<script\s+src="([^"?]+)', html)
print("=== Verificando Scripts ===")
for src in scripts:
    path = Path(src)
    exists = path.exists()
    print(f"  [{'OK' if exists else 'FALHA'}] {src} -> {exists}")

# Check all css stylesheets exist
links = re.findall(r'<link\s+rel="stylesheet"\s+href="([^"?]+)', html)
print("\n=== Verificando Stylesheets ===")
for href in links:
    path = Path(href)
    exists = path.exists()
    print(f"  [{'OK' if exists else 'FALHA'}] {href} -> {exists}")

# Check for unclosed major section tags
sections_open = len(re.findall(r'<section\b', html))
sections_close = len(re.findall(r'</section>', html))
divs_open = len(re.findall(r'<div\b', html))
divs_close = len(re.findall(r'</div>', html))
print(f"\n=== Balanceamento de Tags HTML ===")
print(f"  Sections: open={sections_open}, close={sections_close}")
print(f"  Divs: open={divs_open}, close={divs_close}")

print("\n=== Validação de CSS ===")
print(f"  Tamanho do CSS: {len(css)} bytes, {len(css.splitlines())} linhas")
print(f"  Chaves: {css.count('{')} abertas, {css.count('}')} fechadas")
