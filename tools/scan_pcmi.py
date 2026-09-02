#!/usr/bin/env python3
r"""
MDSync PCMI Live Scanner
Varre exclusivamente o caminho oficial:
C:\Users\maycon.nascimento\ITAMINAS\SPLO - General\03) Geotecnia\01) PCMI
e gera o catálogo filtrado para o GeoView e base corporativa do app.
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime

PCMI_PATH = Path(r"C:\Users\maycon.nascimento\ITAMINAS\SPLO - General\03) Geotecnia\01) PCMI")
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_JS = DATA_DIR / "geoview-catalog.js"
OUTPUT_JSON = DATA_DIR / "geoview-catalog.json"
SIGNAL_JSON = DATA_DIR / "sync-signal.json"


def clean_name(folder_name: str) -> str:
    """Remove prefixos numericos como '00) ', '01) ', etc."""
    return re.sub(r"^\d+\)\s*", "", folder_name).strip()


def get_area_category(parent_name: str, folder_name: str) -> str:
    combined = f"{parent_name} {folder_name}".lower()
    if "gestão" in combined or "gestao" in combined or "cronograma" in combined or "chamados" in combined:
        return "Gestão à Vista"
    if "monitoramento" in combined or "leituras" in combined:
        return "Monitoramento Geotécnico"
    if "barragem" in combined or "dique" in combined:
        return "Barragens e Diques"
    if "pilha" in combined:
        return "Pilhas de Estéril (PDE)"
    if "cava" in combined:
        return "Cavas & Mina"
    if "pluviometria" in combined or "sump" in combined:
        return "Hidrogeologia & Drenagem"
    if "fos" in combined or "estabilidade" in combined:
        return "Fator de Segurança (FoS)"
    if "implantação" in combined or "implantacao" in combined:
        return "Implantação de Obras"
    if "checklist" in combined or "veicular" in combined:
        return "Inspeções & Checklists"
    if "contrato" in combined or "caução" in combined or "caucao" in combined:
        return "Compliance & Contratos"
    if "google earth" in combined or "datum" in combined or "drone" in combined:
        return "Georreferenciamento & Drone"
    return "Engenharia & Operação"


def scan():
    print(f"=== Varrendo PCMI: {PCMI_PATH} ===")
    if not PCMI_PATH.exists():
        print(f"ERRO: Caminho não encontrado: {PCMI_PATH}")
        return False

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dashboards = []
    
    total_pbix = 0
    total_excel = 0
    total_images = 0
    total_pdfs = 0
    total_docs = 0
    total_all_files = 0
    
    # 1. Obter subdiretórios principais
    top_dirs = [d for d in PCMI_PATH.iterdir() if d.is_dir() and not d.name.startswith("_")]
    
    for top_dir in sorted(top_dirs, key=lambda x: x.name):
        top_name = top_dir.name
        
        # Subpastas de nível 2
        sub_dirs = [d for d in top_dir.iterdir() if d.is_dir() and not d.name.startswith("_")]
        
        target_dirs = sub_dirs if sub_dirs else [top_dir]
        
        for target_dir in sorted(target_dirs, key=lambda x: x.name):
            folder_name = target_dir.name
            clean_title = clean_name(folder_name)
            
            # Coletar arquivos
            all_files = [f for f in target_dir.rglob("*") if f.is_file()]
            if not all_files and target_dir != top_dir:
                continue
                
            pbix_count = sum(1 for f in all_files if f.suffix.lower() == ".pbix")
            excel_count = sum(1 for f in all_files if f.suffix.lower() in [".xlsx", ".xls", ".xlsm", ".csv"])
            image_count = sum(1 for f in all_files if f.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp", ".bmp"])
            pdf_count = sum(1 for f in all_files if f.suffix.lower() == ".pdf")
            doc_count = sum(1 for f in all_files if f.suffix.lower() in [".docx", ".doc", ".pptx", ".ppt", ".txt"])
            
            total_pbix += pbix_count
            total_excel += excel_count
            total_images += image_count
            total_pdfs += pdf_count
            total_docs += doc_count
            total_all_files += len(all_files)
            
            last_mtime = max((f.stat().st_mtime for f in all_files), default=target_dir.stat().st_mtime)
            last_updated_iso = datetime.fromtimestamp(last_mtime).isoformat()
            
            # Amostra de arquivos relevantes
            sample_files = [f.name for f in all_files if f.suffix.lower() in [".pbix", ".xlsx", ".docx", ".pdf"]][:4]
            content_desc = ", ".join(sample_files) if sample_files else f"{len(all_files)} registros e arquivos de campo."
            
            area = get_area_category(top_name, folder_name)
            card_id = re.sub(r"[^a-zA-Z0-9]+", "-", f"{top_name}-{folder_name}").strip("-").lower()
            
            dashboard = {
                "id": card_id,
                "folder": f"{top_name} / {folder_name}" if target_dir != top_dir else top_name,
                "title": clean_title,
                "area": area,
                "description": f"Dados e indicadores de {clean_title} vinculados a pasta {top_name}.",
                "content": content_desc,
                "path": str(target_dir).replace("\\", "/"),
                "powerbi": pbix_count,
                "excel": excel_count,
                "images": image_count,
                "pdfs": pdf_count,
                "docs": doc_count,
                "totalFiles": len(all_files),
                "lastUpdated": last_updated_iso
            }
            dashboards.append(dashboard)

    # Estatísticas consolidadas
    catalog_data = {
        "version": "2026-09-02-pcmi-live",
        "sourcePath": str(PCMI_PATH).replace("\\", "/"),
        "generatedAt": datetime.now().isoformat(),
        "summary": {
            "totalDashboards": len(dashboards),
            "totalPowerBi": total_pbix,
            "totalExcel": total_excel,
            "totalImages": total_images,
            "totalPdfs": total_pdfs,
            "totalDocs": total_docs,
            "totalFiles": total_all_files
        },
        "dashboards": dashboards
    }

    # Salvar JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(catalog_data, f, ensure_ascii=False, indent=2)

    # Salvar JS
    js_content = f"window.MDSYNC_GEOVIEW_CATALOG = {json.dumps(catalog_data, ensure_ascii=False, indent=4)};\n"
    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    # Salvar sinal de sincronização instantânea
    sync_signal = {
        "timestamp": datetime.now().isoformat(),
        "source": "PCMI",
        "totalFiles": total_all_files,
        "dashboardsCount": len(dashboards)
    }
    with open(SIGNAL_JSON, "w", encoding="utf-8") as f:
        json.dump(sync_signal, f, ensure_ascii=False, indent=2)

    print(f"Catalogo PCMI atualizado com sucesso:")
    print(f" - Dashboards/Pastas mapeadas: {len(dashboards)}")
    print(f" - Total de arquivos: {total_all_files}")
    print(f" - Power BI: {total_pbix} | Planilhas: {total_excel} | Imagens: {total_images} | Docs/PDFs: {total_docs + total_pdfs}")
    return True


if __name__ == "__main__":
    scan()
