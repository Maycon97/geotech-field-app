from PIL import Image
from pathlib import Path

src_path = Path("assets/geologia/mapa-geologico-mosaico.jpg")
if src_path.exists():
    img = Image.open(src_path)
    print(f"Original mosaic: {img.size}")

    # Resize to standard GPU power-of-two texture: 2048x2048 for high performance offline
    opt_img = img.resize((2048, 2048), Image.Resampling.LANCZOS)
    out_path = Path("assets/geologia/cava-geologia-texture-2048.jpg")
    opt_img.save(out_path, "JPEG", quality=85)
    print(f"Saved optimized texture: {out_path} ({out_path.stat().st_size:,} bytes)")
else:
    print("Mosaic image not found!")
