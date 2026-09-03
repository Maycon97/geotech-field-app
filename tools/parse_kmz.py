import zipfile
import re
import json
import xml.etree.ElementTree as ET
from pathlib import Path

kmz_path = Path(r"C:\Users\maycon.nascimento\Downloads\ESTRUTURAS GEOTEC.kmz")
print("Existe:", kmz_path.exists())
if not kmz_path.exists():
    # Tenta procurar em downloads ou no projeto
    downloads = Path(r"C:\Users\maycon.nascimento\Downloads")
    for f in downloads.glob("*GEOTEC*"):
        print("Encontrado em downloads:", f)
        kmz_path = f
        break

if kmz_path.exists():
    print(f"Lendo: {kmz_path}")
    with zipfile.ZipFile(kmz_path, "r") as z:
        print("Arquivos no KMZ:", z.namelist())
        for name in z.namelist():
            if name.endswith(".kml"):
                xml_data = z.read(name).decode("utf-8", errors="ignore")
                root = ET.fromstring(xml_data)
                # Remover namespaces para busca facilitada
                for elem in root.iter():
                    if "}" in elem.tag:
                        elem.tag = elem.tag.split("}", 1)[1]
                
                placemarks = []
                for pm in root.iter("Placemark"):
                    name_tag = pm.find("name")
                    name_text = name_tag.text if name_tag is not None else "Sem nome"
                    
                    # Coordenadas do Ponto
                    point = pm.find("Point")
                    coords = None
                    if point is not None:
                        coords_tag = point.find("coordinates")
                        if coords_tag is not None and coords_tag.text:
                            coords = coords_tag.text.strip().split(",")
                            
                    # Coordenadas do Polígono / LineString
                    polygon = pm.find("Polygon")
                    poly_coords = []
                    if polygon is not None:
                        for c_tag in polygon.iter("coordinates"):
                            if c_tag.text:
                                for pair in c_tag.text.strip().split():
                                    parts = pair.split(",")
                                    if len(parts) >= 2:
                                        poly_coords.append([float(parts[0]), float(parts[1])])
                                        
                    placemarks.append({
                        "name": name_text,
                        "point": [float(coords[0]), float(coords[1])] if coords and len(coords) >= 2 else None,
                        "polygon_points_count": len(poly_coords)
                    })
                    
                print(f"Total de Placemarks no KML: {len(placemarks)}")
                for p in placemarks:
                    print(f"  - {p['name']}: Point={p['point']}, PolyCoords={p['polygon_points_count']}")
