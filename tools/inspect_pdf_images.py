import sys
from pathlib import Path
import pypdf

pdf_path = Path(r"C:\Users\maycon.nascimento\Documents\Work\CÓPIAS\Copy Works\Layout_MapaGeológico_0826.pdf")
reader = pypdf.PdfReader(str(pdf_path))
page = reader.pages[0]

print(f"Total images: {len(page.images)}")
large_images = []
for idx, img in enumerate(page.images):
    try:
        data_len = len(img.data)
        # Try to get PIL Image size
        pil_img = img.image
        w, h = pil_img.size
        mode = pil_img.mode
        fmt = pil_img.format
        print(f"Img #{idx+1}: name={img.name} size={w}x{h} mode={mode} format={fmt} bytes={data_len:,}")
        if w > 500 or h > 500 or data_len > 100000:
            large_images.append((idx, img.name, w, h, data_len, fmt))
    except Exception as e:
        print(f"Img #{idx+1}: {img.name} error: {e}")

print(f"\nTotal large images (>500px or >100KB): {len(large_images)}")
for item in large_images:
    print(f"  #{item[0]+1}: {item[1]} ({item[2]}x{item[3]}, {item[4]:,} bytes, {item[5]})")
