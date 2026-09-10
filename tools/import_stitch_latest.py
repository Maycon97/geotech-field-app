#!/usr/bin/env python3
"""
MDSync - Importador Oficial do Projeto Stitch para o Antigravity IDE
Baixa todas as telas, design system, tokens, capturas de tela e injeta no HUB Stitch.
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
PROJECT_TITLE = "Geotech Platform Redesign"

PROJECT_JSON_PATH = Path(r"C:\Users\maycon.nascimento\.gemini\antigravity-ide\brain\8cce1da7-76a7-43a6-a778-8cac651fc63e\.system_generated\steps\1102\output.txt")
SCREENS_JSON_PATH = Path(r"C:\Users\maycon.nascimento\.gemini\antigravity-ide\brain\8cce1da7-76a7-43a6-a778-8cac651fc63e\.system_generated\steps\1110\output.txt")


def download_url(url, dest_path, is_binary=False):
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MDSyncImporter/2.0"}
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
    """Garante que a tela HTML carregue FontAwesome, SyncBridge e Stitch Runtime"""
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()

        changed = False

        # Injetar fontes e FontAwesome se não existirem
        if "fontawesome" not in html and "fa-" in html:
            fa_link = '<link rel="stylesheet" href="../../vendor/fontawesome/css/all.min.css">\n'
            if "</head>" in html:
                html = html.replace("</head>", f"{fa_link}</head>")
                changed = True

        # Injetar SyncBridge e Runtime antes de </body>
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
    print("MDSYNC — IMPORTADOR DE PROJETO STITCH PARA ANTIGRAVITY IDE")
    print("==================================================================")

    for d in [STITCH_DIR, SCREENS_DIR, ASSETS_DIR, SCREENSHOTS_DIR, DESIGN_SYSTEM_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    with open(PROJECT_JSON_PATH, "r", encoding="utf-8") as f:
        p_data = json.load(f)
        project_meta = p_data.get("projects", [{}])[0]

    with open(SCREENS_JSON_PATH, "r", encoding="utf-8") as f:
        s_data = json.load(f)
        screens_list = s_data.get("screens", [])

    print(f"Projeto Stitch: {project_meta.get('title', PROJECT_TITLE)}")
    print(f"Telas identificadas no Stitch: {len(screens_list)}")

    # 1. Atualizar Design System e Tokens
    design_theme = project_meta.get("designTheme", {})
    design_md = design_theme.get("designMd", "")
    if design_md:
        ds_path = DESIGN_SYSTEM_DIR / "DESIGN.md"
        with open(ds_path, "w", encoding="utf-8") as f:
            f.write(design_md)
        print(f"[OK] Design System salvo em: {ds_path.name} ({len(design_md):,} chars)")

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
    print(f"[OK] Tokens estruturados salvos em: {tokens_path.name}")

    # 2. Dicionário de Mapeamento Completo com as 21 Telas
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
        # NOVAS TELAS DA ESPECIFICAÇÃO MESTRA
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
        }
    }

    imported_screens_index = []
    screens_data_js = []

    # 3. Baixar arquivos de cada tela
    for idx, screen in enumerate(screens_list, 1):
        screen_id = screen["name"].split("/")[-1]
        title = screen.get("title", f"Tela {idx}")
        meta_info = slug_map.get(screen_id, {
            "slug": f"tela-{idx:02d}-{sanitize_filename(title)}",
            "category": "Geral",
            "badge": "Tela",
            "icon": "fa-solid fa-display"
        })
        slug = meta_info["slug"]

        html_entry = screen.get("htmlCode", {})
        mime_type = html_entry.get("mimeType", "")
        code_url = html_entry.get("downloadUrl")

        screenshot_entry = screen.get("screenshot", {})
        shot_url = screenshot_entry.get("downloadUrl")

        screen_record = {
            "id": screen_id,
            "title": title,
            "slug": slug,
            "category": meta_info["category"],
            "badge": meta_info["badge"],
            "icon": meta_info["icon"],
            "mimeType": mime_type,
            "htmlFile": None,
            "screenshotFile": None,
            "width": screen.get("width"),
            "height": screen.get("height"),
            "deviceType": screen.get("deviceType", "DESKTOP")
        }

        # Baixar código/markup
        if code_url:
            if "svg" in mime_type or slug == "logo-mdsync":
                target_file = ASSETS_DIR / "logo.svg"
            elif "markdown" in mime_type:
                target_file = SCREENS_DIR / f"{slug}.md"
            else:
                target_file = SCREENS_DIR / f"{slug}.html"

            try:
                size = download_url(code_url, target_file, is_binary=False)
                rel_path = str(target_file.relative_to(STITCH_DIR)).replace("\\", "/")
                screen_record["htmlFile"] = rel_path
                print(f"[{idx:02d}/{len(screens_list)}] [HTML] {title[:45]:<45} -> {target_file.name} ({size:,} B)")
                
                # Injetar runtime e bridge nas telas HTML
                if target_file.suffix == ".html":
                    inject_runtime_scripts(target_file)

            except Exception as e:
                print(f"[{idx:02d}/{len(screens_list)}] [ERRO-HTML] {title}: {e}")

        # Baixar captura de tela
        if shot_url:
            shot_file = SCREENSHOTS_DIR / f"{slug}.png"
            try:
                size = download_url(shot_url, shot_file, is_binary=True)
                rel_path = str(shot_file.relative_to(STITCH_DIR)).replace("\\", "/")
                screen_record["screenshotFile"] = rel_path
                print(f"       [PNG]  {title[:45]:<45} -> {shot_file.name} ({size:,} B)")
            except Exception as e:
                print(f"       [ERRO-PNG] {title}: {e}")

        imported_screens_index.append(screen_record)

    # 4. Incluir telas locais do HUB Stitch que foram criadas no repositório (11, 12, 13)
    local_extra_screens = [
        {
            "category": "Campo & Inspeção",
            "id": "11",
            "title": "MDSync Mobile Hub & Cockpit",
            "file": "screens/11-sysdam-mobile-hub.html",
            "screenshot": None,
            "icon": "fa-solid fa-mobile-screen-button",
            "badge": "MDSync 3x4"
        },
        {
            "category": "Governança & Dossiê",
            "id": "12",
            "title": "MDSync Dossiê Digital & Governança",
            "file": "screens/12-dossie-digital-hub.html",
            "screenshot": None,
            "icon": "fa-solid fa-folder-open",
            "badge": "Versão 1.0"
        },
        {
            "category": "Governança & Dossiê",
            "id": "13",
            "title": "MDSync Alertas para Avaliação Técnica",
            "file": "screens/13-alertas-governanca.html",
            "screenshot": None,
            "icon": "fa-solid fa-triangle-exclamation",
            "badge": "Seção 20"
        }
    ]

    # 5. Salvar stitch/metadata.json atualizado
    metadata = {
        "projectId": PROJECT_ID,
        "title": PROJECT_TITLE,
        "importedAt": "2026-09-10T17:40:00Z",
        "totalScreens": len(imported_screens_index),
        "screens": imported_screens_index,
        "projectMeta": project_meta
    }
    meta_path = STITCH_DIR / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Metadados consolidados salvos em: {meta_path.name}")

    # 6. Construir lista SCREENS_DATA para stitch/index.html
    screens_for_dashboard = []
    
    # Primeiro as telas HTML importadas
    for s in imported_screens_index:
        if s.get("htmlFile") and s["htmlFile"].endswith(".html"):
            screens_for_dashboard.append({
                "category": s["category"],
                "id": s["slug"].split("-")[0],
                "title": s["title"].replace("MDSync — ", "").replace("MDSync - ", "").replace("MD Sync — ", ""),
                "file": s["htmlFile"],
                "screenshot": s.get("screenshotFile"),
                "icon": s["icon"],
                "badge": s["badge"]
            })

    # Adicionar as 3 telas locais
    for s in local_extra_screens:
        if not any(x["file"] == s["file"] for x in screens_for_dashboard):
            screens_for_dashboard.append(s)

    # Ordenar por id numérico
    def sort_key(item):
        m = re.match(r"^(\d+)", item["id"])
        return int(m.group(1)) if m else 999

    screens_for_dashboard.sort(key=sort_key)

    # 7. Atualizar stitch/index.html
    stitch_index_path = STITCH_DIR / "index.html"
    with open(stitch_index_path, "r", encoding="utf-8") as f:
        index_html = f.read()

    js_screens_code = "const SCREENS_DATA = " + json.dumps(screens_for_dashboard, indent=12, ensure_ascii=False) + ";"
    pattern = r"const SCREENS_DATA = \[[\s\S]*?\];"
    new_index_html = re.sub(pattern, js_screens_code, index_html)

    with open(stitch_index_path, "w", encoding="utf-8") as f:
        f.write(new_index_html)
    print(f"[OK] Painel executivo {stitch_index_path.name} atualizado com {len(screens_for_dashboard)} telas interativas!")

    print("\n>>> PROJETO STITCH IMPORTADO COM SUCESSO TOTAL PARA O ANTIGRAVITY IDE! <<<")


if __name__ == "__main__":
    main()
