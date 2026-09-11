#!/usr/bin/env python3
"""
MDSync - Importador Oficial do Projeto Stitch para Antigravity IDE
Conecta diretamente ao endpoint MCP Stitch do Google Cloud,
baixa todas as telas, design system, tokens, capturas de tela e atualiza o HUB Stitch.
"""

import json
import os
import re
import urllib.request
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
STITCH_DIR = WORKSPACE_ROOT / "stitch"
SCREENS_DIR = STITCH_DIR / "screens"
ASSETS_DIR = STITCH_DIR / "assets"
SCREENSHOTS_DIR = ASSETS_DIR / "screenshots"
DESIGN_SYSTEM_DIR = STITCH_DIR / "design-system"

PROJECT_ID = "17431042698047576274"
MCP_URL = "https://stitch.googleapis.com/mcp"

def get_api_key():
    if key := os.environ.get("STITCH_API_KEY"):
        return key
    cfg_file = WORKSPACE_ROOT / ".agents" / "mcp_config.json"
    if cfg_file.exists():
        try:
            with open(cfg_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("mcpServers", {}).get("stitch", {}).get("headers", {}).get("X-Goog-Api-Key", "")
        except Exception:
            pass
    return ""

API_KEY = get_api_key()

HEADERS = {
    "X-Goog-Api-Key": API_KEY,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MDSyncImporter/3.0"
}


def call_mcp_method(name, arguments):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": name,
            "arguments": arguments
        }
    }
    req = urllib.request.Request(MCP_URL, data=json.dumps(payload).encode("utf-8"), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=40) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        content = res.get("result", {}).get("content", [])
        if content and "text" in content[0]:
            return json.loads(content[0]["text"])
        return res


def download_file(url, dest_path, is_binary=False):
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MDSyncImporter/3.0"}
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        content = response.read()
        if is_binary:
            with open(dest_path, "wb") as f:
                f.write(content)
        else:
            text = content.decode("utf-8", errors="replace")
            with open(dest_path, "w", encoding="utf-8") as f:
                f.write(text)
    return len(content)


def sanitize_filename(name):
    clean = re.sub(r"[^\w\s-]", "", name).strip().lower()
    clean = re.sub(r"[\s_]+", "-", clean)
    return clean[:60]


def inject_runtime_scripts(html_path):
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()

        changed = False

        if "fontawesome" not in html and "fa-" in html:
            fa_link = '<link rel="stylesheet" href="../../vendor/fontawesome/css/all.min.css">\n'
            if "</head>" in html:
                html = html.replace("</head>", f"{fa_link}</head>")
                changed = True

        runtime_scripts = """
    <!-- MDSync Core Bilateral Sync & Runtime Integration -->
    <script src="../../src/core/sync-bridge.js"></script>
    <script src="../stitch-runtime.js"></script>
"""
        if "stitch-runtime.js" not in html:
            if "</body>" in html:
                html = html.replace("</body>", f"{runtime_scripts}</body>")
                changed = True
            else:
                html += runtime_scripts
                changed = True

        if changed:
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(html)
    except Exception as e:
        print(f"  [AVISO] Erro ao injetar scripts em {html_path.name}: {e}")


def main():
    print("==================================================================")
    print("MDSYNC: IMPORTADOR DE PROJETO STITCH PARA ANTIGRAVITY IDE")
    print("==================================================================")

    for d in [STITCH_DIR, SCREENS_DIR, ASSETS_DIR, SCREENSHOTS_DIR, DESIGN_SYSTEM_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    print(f"Obtendo projeto Stitch: projects/{PROJECT_ID}...")
    project_res = call_mcp_method("get_project", {"name": f"projects/{PROJECT_ID}"})
    project_meta = project_res if "title" in project_res else project_res.get("project", {})

    print(f"Projeto Stitch: {project_meta.get('title', 'Geotech Platform Redesign')}")

    # 1. Salvar Design System e Tokens
    design_theme = project_meta.get("designTheme", {})
    design_md = design_theme.get("designMd", "")
    if design_md:
        ds_path = DESIGN_SYSTEM_DIR / "DESIGN.md"
        with open(ds_path, "w", encoding="utf-8") as f:
            f.write(design_md)
        print(f"[OK] Design System salvo: {ds_path.name} ({len(design_md):,} caracteres)")

    tokens = {
        "theme": design_theme.get("colorMode", "DARK"),
        "primaryColor": design_theme.get("customColor", "#0ea5e9"),
        "headlineFont": design_theme.get("headlineFont", "Outfit"),
        "bodyFont": design_theme.get("bodyFont", "Inter"),
        "labelFont": design_theme.get("labelFont", "JetBrains Mono"),
        "colors": design_theme.get("namedColors", {}),
        "typography": design_theme.get("typography", {}),
        "spacing": design_theme.get("spacing", {})
    }
    tokens_path = DESIGN_SYSTEM_DIR / "tokens.json"
    with open(tokens_path, "w", encoding="utf-8") as f:
        json.dump(tokens, f, indent=2, ensure_ascii=False)
    print(f"[OK] Tokens estruturados salvos: {tokens_path.name}")

    # 2. Listar Telas
    print("Listando telas do projeto...")
    screens_res = call_mcp_method("list_screens", {"projectId": PROJECT_ID})
    screens_list = screens_res.get("screens", [])
    print(f"Total de telas identificadas: {len(screens_list)}")

    # 3. Dicionario de Mapeamento Completo
    slug_map = {
        "2bc511394c1c4e55a2635c0ffcac1bdc": {
            "slug": "01-visao-geral-geotecnica",
            "category": "Dashboard & Executivo",
            "badge": "Dashboard",
            "icon": "fa-solid fa-chart-line"
        },
        "cfaa8505f6b5468793b1949617661409": {
            "slug": "02-fluxo-coleta-checklist-offline",
            "category": "Campo & Inspeção",
            "badge": "Offline Form",
            "icon": "fa-solid fa-clipboard-check"
        },
        "256d6d0496814f93b0e76bc60e808554": {
            "slug": "03-geoview-gis-3d-campo",
            "category": "3D & Cartografia",
            "badge": "Cartografia",
            "icon": "fa-solid fa-map-location-dot"
        },
        "8236ad0c8ac54248951af9853ea7e9fc": {
            "slug": "04-geoview-gis-3d-interativo-threejs",
            "category": "3D & Cartografia",
            "badge": "Three.js",
            "icon": "fa-solid fa-cube"
        },
        "5bc3d2b902fd4fef8b82d65f7fb467c7": {
            "slug": "05-relatorios-auditoria-gistm-anm95",
            "category": "Governança & Conformidade",
            "badge": "Auditoria",
            "icon": "fa-solid fa-file-shield"
        },
        "cef08a9f91d14945b27ce0ef501ce357": {
            "slug": "06-exportacao-pacote-oficial-anm-zip",
            "category": "Governança & Conformidade",
            "badge": "Exportador",
            "icon": "fa-solid fa-file-zipper"
        },
        "0d149436b6294074a93cc3d9dae57ac7": {
            "slug": "07-transmissao-homologada-api-sigbm",
            "category": "Governança & Conformidade",
            "badge": "SIGBM API",
            "icon": "fa-solid fa-tower-broadcast"
        },
        "026ae1e4c0e2442dba90d64dc8c6664c": {
            "slug": "08-rotina-diaria-equipe-geotecnica",
            "category": "Dashboard & Executivo",
            "badge": "Operações",
            "icon": "fa-solid fa-users-gear"
        },
        "5479262262948498850": {
            "slug": "09-painel-executivo-cronograma-pcmi",
            "category": "Dashboard & Executivo",
            "badge": "Cronograma",
            "icon": "fa-solid fa-timeline"
        },
        "aa28aa50565f402dac5e5b4e301bae7c": {
            "slug": "10-threejs-widget",
            "category": "3D & Cartografia",
            "badge": "WebGL",
            "icon": "fa-solid fa-shapes"
        },
        "5c9f6b7b20d046f384a75d4d5559ea59": {
            "slug": "logo-mdsync",
            "category": "Identidade Visual",
            "badge": "Logo",
            "icon": "fa-solid fa-layer-group"
        },
        "312bb647d529491da1a1b84a9e5ee007": {
            "slug": "11-texto-base-geotech-field-app",
            "category": "Documentação",
            "badge": "Markdown",
            "icon": "fa-solid fa-file-lines"
        },
        "6958761145405582248": {
            "slug": "12-captura-referencia-pcmi",
            "category": "Referência",
            "badge": "Screenshot",
            "icon": "fa-solid fa-image"
        },
        "08761852c8834da19b530ae2bed8b361": {
            "slug": "14-modulo-estruturas-dossie-360",
            "category": "Governança & Dossiê",
            "badge": "Dossiê 360°",
            "icon": "fa-solid fa-landmark"
        },
        "7d38bbe5cd4442f4b19f2a3de669e26b": {
            "slug": "15-fluxo-inspecao-guiada-26-itens",
            "category": "Campo & Inspeção",
            "badge": "26 Itens ANM",
            "icon": "fa-solid fa-list-check"
        },
        "a64509102e8b4dbaa128291979b8075b": {
            "slug": "16-gestao-anomalias-ciclo-9-estados",
            "category": "Campo & Inspeção",
            "badge": "9 Estados",
            "icon": "fa-solid fa-bug"
        },
        "79d836d7f17f452288c16897b8d652f0": {
            "slug": "17-gestao-sumps-bacias-drenagem",
            "category": "Engenharia & SUMPs",
            "badge": "SUMPs & Bacias",
            "icon": "fa-solid fa-water"
        },
        "1adb7aedede74704ab9be6469fff16e0": {
            "slug": "18-conectores-m365-data-lake-gis",
            "category": "Governança & Integrações",
            "badge": "M365 & Data Lake",
            "icon": "fa-solid fa-cloud-arrow-up"
        },
        "0c75a26861bb45b28d570abd09237690": {
            "slug": "19-modelagem-geostudio-paebm",
            "category": "Engenharia & Modelagem",
            "badge": "GeoStudio & PAEBM",
            "icon": "fa-solid fa-mountain"
        },
        "e1dc0d8e947e4ab98079823f300a1bac": {
            "slug": "20-fmea-rbac-governanca-clevel",
            "category": "Riscos & Governança",
            "badge": "FMEA & RBAC",
            "icon": "fa-solid fa-shield-halved"
        },
        "e35d20b6c62a41fe97c9deb9a81bf99f": {
            "slug": "21-inteligencia-auditoria-cripto",
            "category": "Riscos & Auditoria",
            "badge": "Cripto & Trilha",
            "icon": "fa-solid fa-fingerprint"
        },
        # TELAS RECENTES DE MODELAGEM 3D E API
        "37a71ef54dd64da1abb23d402f7bb803": {
            "slug": "22-developer-api-gateway-mcp",
            "category": "Engenharia & API",
            "badge": "API & MCP",
            "icon": "fa-solid fa-code"
        },
        "605ac1cab4bd493fa47c3b61b5309b12": {
            "slug": "23-geologia-estrutural-mapeamento-litologico",
            "category": "3D & Cartografia",
            "badge": "Geologia 3D",
            "icon": "fa-solid fa-gem"
        },
        "a93fc367440e4ed89ca5a2dbcb11836c": {
            "slug": "24-modelo-3d-cava-gemeo-digital",
            "category": "3D & Cartografia",
            "badge": "Gêmeo Digital",
            "icon": "fa-solid fa-cubes"
        },
        "889d602d42354388bdad46fb3782e92f": {
            "slug": "25-maquete-3d-cava-modelo-geologico",
            "category": "3D & Cartografia",
            "badge": "Modelo Geológico",
            "icon": "fa-solid fa-layer-group"
        },
        "566a27be263245c6a659b46992372986": {
            "slug": "26-maquete-3d-fiel-prancha-geologica",
            "category": "3D & Cartografia",
            "badge": "Prancha 3D",
            "icon": "fa-solid fa-map"
        },
        "4e48b8cda2324d4989686ef826ac594b": {
            "slug": "27-maquete-3d-telemetria-dinamica",
            "category": "3D & Cartografia",
            "badge": "Telemetria 3D",
            "icon": "fa-solid fa-satellite"
        },
        "df5411a654f342039b5cebd761627372": {
            "slug": "28-maquete-3d-cartografica-modelo-geotecnico",
            "category": "3D & Cartografia",
            "badge": "Cartografia 3D",
            "icon": "fa-solid fa-compass-drafting"
        },
        "54f89cc9abbf46e187d6e36e0d77747b": {
            "slug": "29-maquete-3d-visada-radar-ibis",
            "category": "3D & Cartografia",
            "badge": "Radar IBIS-FM",
            "icon": "fa-solid fa-tower-broadcast"
        }
    }

    imported_screens_index = []
    screens_data_js = []

    # 4. Iterar sobre as telas, buscar detalhes via get_screen e baixar HTML e PNG
    for idx, s_summary in enumerate(screens_list, 1):
        screen_name = s_summary["name"]
        screen_id = screen_name.split("/")[-1]
        title = s_summary.get("title", f"Tela {idx}")

        meta_info = slug_map.get(screen_id, {
            "slug": f"tela-{idx:02d}-{sanitize_filename(title)}",
            "category": "Geral",
            "badge": "Tela",
            "icon": "fa-solid fa-display"
        })
        slug = meta_info["slug"]

        print(f"[{idx:02d}/{len(screens_list)}] Processando: {title} ({slug})...")

        # Obter detalhes completos da tela
        try:
            screen_detail = call_mcp_method("get_screen", {"name": screen_name})
        except Exception as e:
            print(f"  [AVISO] Erro ao chamar get_screen para {screen_name}: {e}")
            continue

        html_entry = screen_detail.get("htmlCode", {})
        mime_type = html_entry.get("mimeType", "")
        code_url = html_entry.get("downloadUrl")

        screenshot_entry = screen_detail.get("screenshot", {})
        screenshot_url = screenshot_entry.get("downloadUrl")

        html_filename = None
        screenshot_filename = None

        # Download do HTML se disponível
        if code_url and "html" in mime_type.lower():
            html_filename = f"{slug}.html"
            dest_html = SCREENS_DIR / html_filename
            try:
                size = download_file(code_url, dest_html, is_binary=False)
                inject_runtime_scripts(dest_html)
                print(f"  -> HTML baixado: {html_filename} ({size:,} bytes)")
            except Exception as e:
                print(f"  [ERRO] Falha ao baixar HTML de {slug}: {e}")

        # Download do Screenshot se disponível
        if screenshot_url:
            screenshot_filename = f"{slug}.png"
            dest_png = SCREENSHOTS_DIR / screenshot_filename
            try:
                size = download_file(screenshot_url, dest_png, is_binary=True)
                print(f"  -> Screenshot baixado: {screenshot_filename} ({size:,} bytes)")
            except Exception as e:
                print(f"  [ERRO] Falha ao baixar Screenshot de {slug}: {e}")

        if html_filename:
            imported_screens_index.append({
                "id": screen_id,
                "slug": slug,
                "title": title,
                "filename": html_filename,
                "screenshot": screenshot_filename,
                "category": meta_info["category"],
                "badge": meta_info["badge"],
                "icon": meta_info["icon"]
            })

            screens_data_js.append({
                "id": screen_id,
                "title": title,
                "url": f"screens/{html_filename}",
                "screenshot": f"assets/screenshots/{screenshot_filename}" if screenshot_filename else None,
                "category": meta_info["category"],
                "badge": meta_info["badge"],
                "icon": meta_info["icon"]
            })

    # 5. Salvar stitch-screens.json com catalogo completo
    catalog_path = STITCH_DIR / "stitch-screens.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(imported_screens_index, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Catalogo de telas salvo em: {catalog_path.name} ({len(imported_screens_index)} telas registradas)")

    # 6. Atualizar stitch-runtime.js com as novas rotas
    runtime_path = STITCH_DIR / "stitch-runtime.js"
    if runtime_path.exists():
        runtime_code = runtime_path.read_text(encoding="utf-8")
        # Injetar novas rotas no ROUTE_MAP se necessario
        new_routes = {
            "cava-3d": "screens/04-geoview-gis-3d-interativo-threejs.html",
            "modelo-3d-cava": "screens/04-geoview-gis-3d-interativo-threejs.html",
            "geologia-3d": "screens/23-geologia-estrutural-mapeamento-litologico.html",
            "gemeo-digital": "screens/24-modelo-3d-cava-gemeo-digital.html",
            "prancha-geologica": "screens/26-maquete-3d-fiel-prancha-geologica.html",
            "radar-ibis": "screens/29-maquete-3d-visada-radar-ibis.html",
            "developer-api": "screens/22-developer-api-gateway-mcp.html"
        }
        for k, v in new_routes.items():
            if f"'{k}':" not in runtime_code and f'"{k}":' not in runtime_code:
                insert_marker = "const ROUTE_MAP = {"
                if insert_marker in runtime_code:
                    replacement = f"{insert_marker}\n    '{k}': '{v}',"
                    runtime_code = runtime_code.replace(insert_marker, replacement, 1)
        runtime_path.write_text(runtime_code, encoding="utf-8")
        print(f"[OK] stitch-runtime.js atualizado com novas rotas sincronizadas.")

    print("\n==================================================================")
    print(f"IMPORTAÇÃO CONCLUÍDA: {len(imported_screens_index)} telas ativas no HUB Stitch.")
    print("==================================================================")


if __name__ == "__main__":
    main()
