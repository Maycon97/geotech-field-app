import zipfile
from pathlib import Path

kmz_path = Path(r"C:\Users\maycon.nascimento\Downloads\ESTRUTURAS GEOTEC.kmz")
assets_dir = Path(r"C:\Users\maycon.nascimento\.gemini\antigravity\scratch\geotech-field-app\assets\kmz")
assets_dir.mkdir(parents=True, exist_ok=True)

with zipfile.ZipFile(kmz_path, "r") as z:
    for name in z.namelist():
        if name.startswith("files/") and name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            filename = Path(name).name
            target = assets_dir / filename
            with open(target, "wb") as out:
                out.write(z.read(name))
            print(f"Extraída imagem: {filename} ({target.stat().st_size / 1024:.1f} KB)")
