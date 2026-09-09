import re
import os

def analyze():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    tabs = re.findall(r'<section[^>]*id=["\'](tab-[^"\']+)["\']', content)
    print("Abas (<section id='tab-...'>) em index.html:")
    for t in tabs:
        print(f"  - {t}")

    nav_links = re.findall(r'href=["\']#(tab-[^"\']+)["\']', content)
    print("\nLinks no menu/nav para abas:")
    for nl in set(nav_links):
        print(f"  - {nl}")

    # Verificar cada aba se tem classe 'active' ou 'hidden' ou display:none
    print("\nStatus inicial das abas:")
    for t in tabs:
        m = re.search(r'<section[^>]*id=["\']' + t + r'["\'][^>]*class=["\']([^"\']*)["\']', content)
        cls = m.group(1) if m else "SEM CLASSE"
        print(f"  - {t}: classes='{cls}'")

if __name__ == '__main__':
    analyze()
