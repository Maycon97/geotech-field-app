from pathlib import Path
import pypdf
from PIL import Image
import io

pdf_path = Path(r"C:\Users\maycon.nascimento\Documents\Work\CÓPIAS\Copy Works\Layout_MapaGeológico_0826.pdf")
out_dir = Path("assets/geologia")
out_dir.mkdir(parents=True, exist_ok=True)

reader = pypdf.PdfReader(str(pdf_path))
page = reader.pages[0]

print("Extracting Image_286.png...")
for img in page.images:
    if "286" in img.name:
        out_path = out_dir / "layout-mapa-geologico-overview.png"
        out_path.write_bytes(img.data)
        print(f"Saved {out_path} ({len(img.data):,} bytes)")
        break

# Let's also check if we can reconstruct the full high-res raster or sample some tiles
print("Done.")
