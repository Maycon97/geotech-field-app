import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all containers that look like lists, tables, charts, or grids
containers = re.findall(r'id=["\']([^"\']*(?:container|grid|table|list|chart|mount|body|view)[^"\']*)["\']', html, re.IGNORECASE)

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

print(f"Total container/chart IDs found in index.html: {len(containers)}")

unreferenced = []
for cid in set(containers):
    # Check if referenced in app.js or data/*.js
    if cid not in app_js:
        unreferenced.append(cid)

print(f"Containers not referenced directly in app.js: {len(unreferenced)}")
for u in sorted(unreferenced):
    # Check if referenced in styles.css or data/*.js
    print("  -", u)
