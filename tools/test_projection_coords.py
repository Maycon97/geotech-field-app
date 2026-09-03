import json

MINE_MASTER_BOUNDS = {
    "minLat": -20.108,
    "maxLat": -20.060,
    "minLon": -44.125,
    "maxLon": -44.082
}

def project(lat, lon, width=800, height=400, padding=40):
    lon_range = MINE_MASTER_BOUNDS["maxLon"] - MINE_MASTER_BOUNDS["minLon"]
    lat_range = MINE_MASTER_BOUNDS["maxLat"] - MINE_MASTER_BOUNDS["minLat"]
    x = padding + ((lon - MINE_MASTER_BOUNDS["minLon"]) / lon_range) * (width - padding * 2)
    y = height - padding - ((lat - MINE_MASTER_BOUNDS["minLat"]) / lat_range) * (height - padding * 2)
    return round(x, 1), round(y, 1)

with open("data/structures-geotec.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print("=== COORDENADAS PROJETADAS DAS ESTRUTURAS ===")
for s in data["structures"]:
    x, y = project(s["latitude"], s["longitude"])
    print(f" - {s['name']:<18}: Lat {s['latitude']:.6f}, Lon {s['longitude']:.6f} -> SVG X={x}, Y={y}")

print("\n=== COORDENADAS PROJETADAS DOS INSTRUMENTOS ===")
for inst in data["instruments"]:
    x, y = project(inst["latitude"], inst["longitude"])
    print(f" - {inst['name']:<8}: SVG X={x}, Y={y}")
