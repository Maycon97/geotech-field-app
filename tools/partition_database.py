#!/usr/bin/env python3
"""
MDSync Database Partitioner
Converte o banco monolitico geosync-database.js (15.4MB) em:
1. data/catalog.json (Catalogo leve para startup instantaneo ~150KB)
2. data/structures/<structure_slug>.json (Historico particionado sob demanda)
3. data/summary.json (Metricas e contagens consolidadas)
"""

import os
import re
import json
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STRUCTURES_DIR = DATA_DIR / "structures"
LEGACY_DB_PATH = DATA_DIR / "geosync-database.js"


def slugify(text: str) -> str:
    """Converte um nome de estrutura em um slug de arquivo seguro."""
    text = unicodedata.normalize('NFKD', str(text)).encode('ASCII', 'ignore').decode('ASCII')
    text = re.sub(r'[^a-zA-Z0-9]+', '-', text).strip('-').lower()
    return text or "unknown"


def extract_json_from_js(file_path: Path) -> dict:
    """Le o arquivo JS e extrai o objeto JSON atribuido a window.GEOSYNC_DATABASE."""
    print(f"Lendo base original: {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    match = re.search(r'window\.GEOSYNC_DATABASE\s*=\s*(\{.*?\});?\s*$', content, re.DOTALL)
    if match:
        json_str = match.group(1)
        return json.loads(json_str)
    
    idx = content.find('{')
    last_idx = content.rfind('}')
    if idx != -1 and last_idx != -1:
        json_str = content[idx:last_idx+1]
        return json.loads(json_str)
    
    raise ValueError("Nao foi possivel extrair o JSON de window.GEOSYNC_DATABASE")


def partition_database():
    STRUCTURES_DIR.mkdir(parents=True, exist_ok=True)
    
    data = extract_json_from_js(LEGACY_DB_PATH)
    
    version = data.get("version", "1.0.0")
    generated_at = data.get("generatedAt", "")
    summary = data.get("summary", {})
    instrument_registry = data.get("instrumentRegistry", {})
    
    print(f"Total de instrumentos encontrados: {len(instrument_registry)}")
    
    structures_data = {}
    catalog_registry = {}
    
    total_piezo_readings = 0
    total_flow_readings = 0
    
    for inst_id, inst in instrument_registry.items():
        structure_name = inst.get("structure") or "Geral"
        slug = slugify(structure_name)
        
        if slug not in structures_data:
            structures_data[slug] = {
                "structure": structure_name,
                "slug": slug,
                "version": version,
                "instrumentCount": 0,
                "instruments": {}
            }
            
        historico = inst.get("historico", [])
        if inst.get("type") == "VZ" or "vazao" in inst.get("name", "").lower():
            total_flow_readings += len(historico)
        else:
            total_piezo_readings += len(historico)
            
        structures_data[slug]["instruments"][inst_id] = inst
        structures_data[slug]["instrumentCount"] += 1
        
        latest_reading = historico[-1] if historico else None
        reading_count = len(historico)
        
        inst_catalog = {
            "id": inst.get("id"),
            "code": inst.get("code"),
            "name": inst.get("name"),
            "type": inst.get("type"),
            "structure": inst.get("structure"),
            "structureClass": inst.get("structureClass"),
            "sourceGroup": inst.get("sourceGroup"),
            "section": inst.get("section"),
            "cotaBoca": inst.get("cotaBoca"),
            "cotaBase": inst.get("cotaBase"),
            "cotaFundo": inst.get("cotaFundo"),
            "profMax": inst.get("profMax"),
            "limiteCritico": inst.get("limiteCritico"),
            "thresholdMode": inst.get("thresholdMode"),
            "thresholds": inst.get("thresholds", {}),
            "coordinates": inst.get("coordinates", {}),
            "readingCount": reading_count,
            "latestReading": latest_reading,
            "structureSlug": slug
        }
        catalog_registry[inst_id] = inst_catalog

    catalog = {
        "version": version,
        "generatedAt": generated_at,
        "summary": summary,
        "structures": list(structures_data.keys()),
        "structureNames": [s["structure"] for s in structures_data.values()],
        "instrumentCount": len(catalog_registry),
        "totalPiezometricReadings": total_piezo_readings,
        "totalFlowReadings": total_flow_readings,
        "instruments": catalog_registry
    }
    
    catalog_path = DATA_DIR / "catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f"Catalogo leve salvo: {catalog_path} ({os.path.getsize(catalog_path) / 1024:.1f} KB)")
    
    for slug, struct_content in structures_data.items():
        struct_file = STRUCTURES_DIR / f"{slug}.json"
        with open(struct_file, "w", encoding="utf-8") as f:
            json.dump(struct_content, f, ensure_ascii=False, indent=2)
        print(f"  -> Estrutura '{struct_content['structure']}' ({slug}.json): {struct_content['instrumentCount']} instrumentos ({os.path.getsize(struct_file) / 1024:.1f} KB)")
        
    print("\nParticionamento concluido com sucesso!")
    return catalog


if __name__ == "__main__":
    partition_database()
