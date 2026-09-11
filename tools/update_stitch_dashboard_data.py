#!/usr/bin/env python3
import json
import re
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
STITCH_DIR = WORKSPACE_ROOT / "stitch"
SCREENS_CATALOG = STITCH_DIR / "stitch-screens.json"
INDEX_HTML = STITCH_DIR / "index.html"

screens_raw = json.loads(SCREENS_CATALOG.read_text(encoding="utf-8"))

# Filtrar e formatar para o dashboard
screens_for_dashboard = []

local_extra_screens = [
    {
        "category": "Campo & Inspeção",
        "id": "11",
        "title": "MDSync Mobile Hub & Cockpit",
        "file": "screens/11-sysdam-mobile-hub.html",
        "screenshot": "assets/screenshots/02-fluxo-coleta-checklist-offline.png",
        "icon": "fa-solid fa-mobile-screen-button",
        "badge": "MDSync 3x4"
    },
    {
        "category": "Governança & Dossiê",
        "id": "12",
        "title": "MDSync Dossiê Digital & Governança",
        "file": "screens/12-dossie-digital-hub.html",
        "screenshot": "assets/screenshots/14-modulo-estruturas-dossie-360.png",
        "icon": "fa-solid fa-folder-open",
        "badge": "Versão 1.0"
    },
    {
        "category": "Governança & Dossiê",
        "id": "13",
        "title": "MDSync Alertas para Avaliação Técnica",
        "file": "screens/13-alertas-governanca.html",
        "screenshot": "assets/screenshots/16-gestao-anomalias-ciclo-9-estados.png",
        "icon": "fa-solid fa-triangle-exclamation",
        "badge": "Seção 20"
    }
]

for s in screens_raw:
    slug = s["slug"]
    filename = s["filename"]
    screenshot = s.get("screenshot")
    
    if "tela-19-mdsync-maquete-3d" in slug or "tela-19-mdsync-maquete-3d" in filename:
        slug = "30-maquete-3d-mina-integral"
        filename = "30-maquete-3d-mina-integral.html"
        screenshot = "30-maquete-3d-mina-integral.png"

    m = re.match(r"^(\d+)", slug)
    screen_num = m.group(1) if m else "99"
    
    clean_title = s["title"].replace("MDSync \u2014 ", "").replace("MDSync - ", "").replace("MD Sync \u2014 ", "")
    # Remover em-dash e en-dash de titulos para conformidade com a regra de estilo
    clean_title = clean_title.replace("\u2014", "-").replace("\u2013", "-")
    
    screens_for_dashboard.append({
        "category": s["category"],
        "id": screen_num,
        "title": clean_title,
        "file": f"screens/{filename}",
        "screenshot": f"assets/screenshots/{screenshot}" if screenshot else None,
        "icon": s["icon"],
        "badge": s["badge"].replace("\u2014", "-").replace("\u2013", "-")
    })

for s in local_extra_screens:
    if not any(x["file"] == s["file"] for x in screens_for_dashboard):
        screens_for_dashboard.append(s)

def sort_key(item):
    try:
        return int(item["id"])
    except:
        return 999

screens_for_dashboard.sort(key=sort_key)

print(f"Total de telas organizadas para o painel executivo: {len(screens_for_dashboard)}")

# Injetar em stitch/index.html
html = INDEX_HTML.read_text(encoding="utf-8")
js_code = "const SCREENS_DATA = " + json.dumps(screens_for_dashboard, indent=12, ensure_ascii=False) + ";"
pattern = r"const SCREENS_DATA = \[[\s\S]*?\];"
new_html = re.sub(pattern, js_code, html)

INDEX_HTML.write_text(new_html, encoding="utf-8")
print(f"[OK] stitch/index.html atualizado com sucesso!")

# Salvar stitch/metadata.json
metadata = {
    "projectId": "17431042698047576274",
    "title": "Geotech Platform Redesign",
    "importedAt": "2026-09-11T15:45:00Z",
    "totalScreens": len(screens_for_dashboard),
    "screens": screens_for_dashboard
}
(STITCH_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"[OK] stitch/metadata.json atualizado com {len(screens_for_dashboard)} telas!")

