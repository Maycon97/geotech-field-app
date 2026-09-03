import zipfile
import json
import xml.etree.ElementTree as ET
from pathlib import Path
import math

kmz_path = Path(r"C:\Users\maycon.nascimento\Downloads\ESTRUTURAS GEOTEC.kmz")
output_js = Path(r"C:\Users\maycon.nascimento\.gemini\antigravity\scratch\geotech-field-app\data\google-earth-geospatial.js")
output_json = Path(r"C:\Users\maycon.nascimento\.gemini\antigravity\scratch\geotech-field-app\data\structures-geotec.json")

def latlon_to_utm23s(lat, lon):
    a = 6378137.0
    f = 1 / 298.257222101
    e = math.sqrt(2 * f - f * f)
    e1sq = (e * e) / (1 - e * e)
    k0 = 0.9996
    zone = 23
    lon0 = ((zone - 1) * 6 - 180 + 3) * (math.pi / 180)
    
    phi = lat * (math.pi / 180)
    lam = lon * (math.pi / 180)
    
    sinPhi = math.sin(phi)
    cosPhi = math.cos(phi)
    tanPhi = math.tan(phi)
    
    N = a / math.sqrt(1 - e * e * sinPhi * sinPhi)
    T = tanPhi * tanPhi
    C = e1sq * cosPhi * cosPhi
    A = (lam - lon0) * cosPhi
    
    M = a * ((1 - e * e / 4 - 3 * e**4 / 64 - 5 * e**6 / 256) * phi
             - (3 * e * e / 8 + 3 * e**4 / 32 + 45 * e**6 / 1024) * math.sin(2 * phi)
             + (15 * e**4 / 256 + 45 * e**6 / 1024) * math.sin(4 * phi)
             - (35 * e**6 / 3072) * math.sin(6 * phi))
             
    easting = k0 * N * (A + (1 - T + C) * A**3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * e1sq) * A**5 / 120) + 500000.0
    northing = k0 * (M + N * tanPhi * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A**4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * e1sq) * A**6 / 720)) + 10000000.0
    return round(easting, 3), round(northing, 3)

structures = []
instruments = []

with zipfile.ZipFile(kmz_path, "r") as z:
    for name in z.namelist():
        if name.endswith(".kml"):
            xml_data = z.read(name).decode("utf-8", errors="ignore")
            root = ET.fromstring(xml_data)
            for elem in root.iter():
                if "}" in elem.tag:
                    elem.tag = elem.tag.split("}", 1)[1]
                    
            for pm in root.iter("Placemark"):
                name_tag = pm.find("name")
                name_text = name_tag.text.strip() if name_tag is not None and name_tag.text else "Sem nome"
                
                point = pm.find("Point")
                if point is not None:
                    coords_tag = point.find("coordinates")
                    if coords_tag is not None and coords_tag.text:
                        parts = coords_tag.text.strip().split(",")
                        lon = float(parts[0])
                        lat = float(parts[1])
                        alt = float(parts[2]) if len(parts) > 2 else 0.0
                        ew, ns = latlon_to_utm23s(lat, lon)
                        
                        is_inst = name_text.startswith("INA") or name_text.startswith("PZ") or name_text.startswith("MV")
                        
                        item = {
                            "name": name_text,
                            "code": name_text if is_inst else None,
                            "latitude": lat,
                            "longitude": lon,
                            "altitude": alt,
                            "easting": ew,
                            "northing": ns,
                            "datum": "SIRGAS 2000",
                            "epsg": "EPSG:31983",
                            "type": "instrument" if is_inst else "structure"
                        }
                        
                        if is_inst:
                            item["structure"] = "PDE 1" # Contexto das estacas KMZ
                            instruments.append(item)
                        else:
                            structures.append(item)

print(f"Extraídas {len(structures)} estruturas e {len(instruments)} instrumentos do KMZ oficial.")

geo_data = {
    "version": "2026-09-03-structures-geotec-kmz",
    "sourceFile": "ESTRUTURAS GEOTEC.kmz",
    "datum": "SIRGAS 2000",
    "geographicEpsg": "EPSG:4674",
    "projectedEpsg": "EPSG:31983",
    "zone": "23S",
    "structures": structures,
    "instruments": instruments
}

with open(output_json, "w", encoding="utf-8") as f:
    json.dump(geo_data, f, ensure_ascii=False, indent=2)

with open(output_js, "w", encoding="utf-8") as f:
    f.write(f"window.MDSYNC_GOOGLE_EARTH_GEOTEC = {json.dumps(geo_data, ensure_ascii=False, indent=4)};\n")

print(f"Salvo em {output_js} e {output_json}")
