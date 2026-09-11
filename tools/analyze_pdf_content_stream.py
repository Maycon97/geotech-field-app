import sys
from pathlib import Path
import pypdf
import re

pdf_path = Path(r"C:\Users\maycon.nascimento\Documents\Work\CÓPIAS\Copy Works\Layout_MapaGeológico_0826.pdf")
reader = pypdf.PdfReader(str(pdf_path))
page = reader.pages[0]

print("Page MediaBox:", page.mediabox)
print("Page CropBox:", page.cropbox)

# Extract stream operations
contents = page.get_contents()
if contents:
    stream_data = contents.get_data()
    print(f"Content stream size: {len(stream_data):,} bytes")
    # Search for Do operators (XObject invocation)
    # Typically: q a b c d e f cm /ImageName Do Q
    matches = re.findall(rb'([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s+cm\s+/([A-Za-z0-9_]+)\s+Do', stream_data)
    print(f"Found {len(matches)} image draw operations")
    for idx, m in enumerate(matches[:25]):
        a, b, c, d, e, f, name = m
        print(f"  Op #{idx+1}: /{name.decode('ascii')} matrix=({float(a):.1f}, {float(b):.1f}, {float(c):.1f}, {float(d):.1f}) pos=({float(e):.1f}, {float(f):.1f})")
