import re
from collections import Counter

with open('data/geosync-database.js', 'r', encoding='utf-8') as f:
    text = f.read()

types = re.findall(r'"type":\s*"([^"]+)"', text)
counts = Counter(types)
print('Instrument counts by type:')
for k, v in sorted(counts.items()):
    print(f'  {k}: {v}')
