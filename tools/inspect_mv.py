import re

with open('data/geosync-database.js', 'r', encoding='utf-8') as f:
    text = f.read()

mv_matches = re.findall(r'"id":\s*"([^"]*MV[^"]*)"', text)
print('Total MV instruments found:', len(mv_matches))
print('Sample MV IDs:', mv_matches[:10])

if mv_matches:
    sample_id = mv_matches[0]
    idx = text.find(f'"{sample_id}"')
    print('Sample MV instrument details:')
    print(text[idx:idx+800])
