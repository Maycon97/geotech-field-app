import sys
from pathlib import Path
import pypdf
import re

pdf_path = Path(r"C:\Users\maycon.nascimento\Documents\Work\CÓPIAS\Copy Works\Layout_MapaGeológico_0826.pdf")
reader = pypdf.PdfReader(str(pdf_path))
page = reader.pages[0]
text = page.extract_text()
lines = [l.strip() for l in text.splitlines() if l.strip()]

print(f"Total lines: {len(lines)}")

# Look for non-numeric lines (labels, legends, titles, coordinates)
non_numeric = [l for l in lines if not re.match(r'^\d+(\.\d+)?$', l)]
print(f"Non-numeric lines count: {len(non_numeric)}")
print("\n--- Sample of non-numeric lines ---")
for l in non_numeric[:150]:
    print(l)

print("\n--- Search for coordinates / UTM / Datum / Projections ---")
for l in lines:
    if any(k in l.lower() for k in ['utm', 'sirgas', '23s', 'datum', 'escala', 'cava', 'jangada', 'itaminas', 'geol', 'seção', 'secao', 'falha', 'folia', 'litol', 'itabirito', 'hematita', 'canga', 'coluv', 'respons', 'data']):
        print(f"  MATCH: {l}")
