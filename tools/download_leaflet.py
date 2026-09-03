import urllib.request
from pathlib import Path

vendor_leaflet = Path(r"vendor/leaflet")
vendor_leaflet.mkdir(parents=True, exist_ok=True)

urls = {
    "leaflet.js": "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "leaflet.css": "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
}

for name, url in urls.items():
    dest = vendor_leaflet / name
    print(f"Baixando {name} de {url}...")
    try:
        urllib.request.urlretrieve(url, dest)
        print(f"Salvo {dest} ({dest.stat().st_size / 1024:.1f} KB)")
    except Exception as e:
        print(f"Erro ao baixar {name}: {e}")
