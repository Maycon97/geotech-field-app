import re

with open('data/geosync-database.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Find an MV reading
idx = text.find('"type": "MV"')
if idx != -1:
    print('Sample MV reading or instrument:')
    print(text[max(0, idx-200):idx+500])
