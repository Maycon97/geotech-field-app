import sys
from pathlib import Path
import pypdf

pdf_path = Path(r"C:\Users\maycon.nascimento\Documents\Work\CÓPIAS\Copy Works\Layout_MapaGeológico_0826.pdf")

reader = pypdf.PdfReader(str(pdf_path))
print(f"Total pages: {len(reader.pages)}")

# Metadata
info = reader.metadata
print("\n--- Metadata ---")
if info:
    for k, v in info.items():
        print(f"{k}: {v}")

# Text extraction per page
for i, page in enumerate(reader.pages):
    print(f"\n--- Page {i+1} Text ---")
    text = page.extract_text()
    if text:
        lines = text.splitlines()
        print(f"Extracted {len(lines)} lines of text.")
        for line in lines[:50]:  # first 50 lines
            if line.strip():
                print(line.strip())
        if len(lines) > 50:
            print(f"... and {len(lines)-50} more lines")
    else:
        print("(No direct text extracted - may be image or vector layout)")

    # Images
    print(f"Images on page {i+1}: {len(page.images)}")
    for img_idx, img in enumerate(page.images):
        print(f"  Image {img_idx+1}: {img.name}, format={img.image.format if hasattr(img, 'image') else 'unknown'}")
