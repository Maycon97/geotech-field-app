import re

with open('index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html_content))

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Find all document.getElementById("...") in app.js
all_get_el = re.findall(r'document\.getElementById\(["\']([^"\']+)["\']\)', app_js)
all_get_el_set = set(all_get_el)

missing_from_html = all_get_el_set - html_ids

print(f"Total distinct IDs accessed in app.js: {len(all_get_el_set)}")
print(f"Total IDs present in index.html: {len(html_ids)}")
print(f"IDs accessed in app.js but not in index.html: {len(missing_from_html)}")

# Now check which missing IDs are accessed UNSAFELY (i.e. without null-check: .textContent, .style, .value, .innerHTML, .addEventListener, .classList directly without if)
unsafe_accesses = []

lines = app_js.split('\n')
for idx, line in enumerate(lines, 1):
    for m in missing_from_html:
        # Match pattern like document.getElementById("foo").bar or const x = document.getElementById("foo"); followed by x.bar without if
        if f'document.getElementById("{m}")' in line or f"document.getElementById('{m}')" in line:
            # Check if chained directly: document.getElementById("...").something
            chained = re.search(rf'document\.getElementById\(["\']{re.escape(m)}["\']\)\.([a-zA-Z]+)', line)
            if chained:
                prop = chained.group(1)
                # If chained directly to a property access, it will throw TypeError if element doesn't exist!
                unsafe_accesses.append((idx, line.strip(), m, prop))

print(f"\nPotential UNSAFE direct chained accesses on missing IDs: {len(unsafe_accesses)}")
for idx, line, m, prop in unsafe_accesses:
    print(f"  Line {idx}: ID '{m}'.{prop} -> {line}")
