from pathlib import Path
import pypdf
from PIL import Image

pdf_path = Path(r"C:\Users\maycon.nascimento\Documents\Work\CÓPIAS\Copy Works\Layout_MapaGeológico_0826.pdf")
reader = pypdf.PdfReader(str(pdf_path))
page = reader.pages[0]

# Let's inspect the images in order and see their sizes
jpg_images = []
for idx, img in enumerate(page.images):
    name = img.name
    if name.endswith('.jpg') and '1777x256' in str(getattr(img, 'image', None)):
        pass
    pil_img = img.image
    w, h = pil_img.size
    fmt = pil_img.format
    if w == 1777:
        jpg_images.append((idx, name, w, h, pil_img))

print(f"Found {len(jpg_images)} images with width=1777")
total_height = sum(h for _, _, _, h, _ in jpg_images)
print(f"Combined height would be: {total_height}")

# If we stitch them vertically in order:
if len(jpg_images) > 0:
    combined = Image.new('RGB', (1777, total_height))
    curr_y = 0
    for _, name, w, h, pil_img in jpg_images:
        combined.paste(pil_img, (0, curr_y))
        curr_y += h
    out_stitched = Path("assets/geologia/mapa-geologico-mosaico.jpg")
    combined.save(out_stitched, quality=90)
    print(f"Saved stitched mosaic: {out_stitched} (size: {combined.size})")
