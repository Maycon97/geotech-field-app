#!/usr/bin/env python3
"""
MDSync - Importador de Projeto do Google Stitch
Baixa telas, design system, tokens, capturas de tela e ativos vetoriais
do projeto 'Geotech Platform Redesign' (ID: 17431042698047576274).
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

# Arquivos de cache com metadados do Stitch capturados na sessão MCP
CACHE_STEPS = [
    Path(r"C:\Users\maycon.nascimento\.gemini\antigravity-ide\brain\9796c004-faf1-493f-a1e2-a4b54cd2cd50\.system_generated\steps\9\output.txt"),
    Path(r"C:\Users\maycon.nascimento\.gemini\antigravity-ide\brain\9796c004-faf1-493f-a1e2-a4b54cd2cd50\.system_generated\steps\17\output.txt"),
    Path(r"C:\Users\maycon.nascimento\.gemini\antigravity-ide\brain\9796c004-faf1-493f-a1e2-a4b54cd2cd50\.system_generated\steps\35\output.txt")
]


def download_url(url, dest_path, is_binary=False):
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MDSyncImporter/1.0"}
    )
    with urllib.request.urlopen(req, timeout=40) as response:
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


def main():
    print("=== Iniciando Importação do Projeto Stitch: Geotech Platform Redesign ===")
    
    # Criar diretórios
    for d in [STITCH_DIR, SCREENS_DIR, ASSETS_DIR, SCREENSHOTS_DIR, DESIGN_SYSTEM_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    # Carregar dados do projeto e telas
    project_meta = {}
    screens_list = []
    design_systems = []

    if CACHE_STEPS[0].exists():
        with open(CACHE_STEPS[0], "r", encoding="utf-8") as f:
            p_data = json.load(f)
            projects = p_data.get("projects", [])
            if projects:
                project_meta = projects[0]

    if CACHE_STEPS[1].exists():
        with open(CACHE_STEPS[1], "r", encoding="utf-8") as f:
            s_data = json.load(f)
            screens_list = s_data.get("screens", [])

    if CACHE_STEPS[2].exists():
        with open(CACHE_STEPS[2], "r", encoding="utf-8") as f:
            ds_data = json.load(f)
            design_systems = ds_data.get("designSystems", [])

    print(f"Projeto: {project_meta.get('title', PROJECT_TITLE)}")
    print(f"Total de telas identificadas: {len(screens_list)}")

    # 1. Salvar Design System
    design_theme = project_meta.get("designTheme", {})
    design_md = design_theme.get("designMd", "")
    if not design_md and design_systems:
        design_md = design_systems[0].get("designSystem", {}).get("designMd", "")

    if design_md:
        ds_path = DESIGN_SYSTEM_DIR / "DESIGN.md"
        with open(ds_path, "w", encoding="utf-8") as f:
            f.write(design_md)
        print(f"[OK] Design System salvo em: {ds_path.name} ({len(design_md)} chars)")

    # 2. Salvar Tokens em JSON
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

    # 3. Mapeamento amigável para telas
    friendly_slugs = {
        "5c9f6b7b20d046f384a75d4d5559ea59": "logo-mdsync",
        "2bc511394c1c4e55a2635c0ffcac1bdc": "01-visao-geral-geotecnica",
        "cfaa8505f6b5468793b1949617661409": "02-fluxo-coleta-checklist-offline",
        "256d6d0496814f93b0e76bc60e808554": "03-geoview-gis-3d-campo",
        "8236ad0c8ac54248951af9853ea7e9fc": "04-geoview-gis-3d-interativo-threejs",
        "5bc3d2b902fd4fef8b82d65f7fb467c7": "05-relatorios-auditoria-gistm-anm95",
        "cef08a9f91d14945b27ce0ef501ce357": "06-exportacao-pacote-oficial-anm-zip",
        "0d149436b6294074a93cc3d9dae57ac7": "07-transmissao-homologada-api-sigbm",
        "026ae1e4c0e2442dba90d64dc8c6664c": "08-rotina-diaria-equipe-geotecnica",
        "5479262262948498850": "09-painel-executivo-cronograma-pcmi",
        "aa28aa50565f402dac5e5b4e301bae7c": "10-threejs-widget",
        "312bb647d529491da1a1b84a9e5ee007": "11-texto-base-geotech-field-app",
        "6958761145405582248": "12-captura-referencia-pcmi"
    }

    imported_screens_index = []

    # 4. Baixar cada tela e screenshot
    for idx, screen in enumerate(screens_list, 1):
        screen_id = screen["name"].split("/")[-1]
        title = screen.get("title", f"Tela {idx}")
        slug = friendly_slugs.get(screen_id, f"{idx:02d}-{sanitize_filename(title)}")
        
        html_entry = screen.get("htmlCode", {})
        mime_type = html_entry.get("mimeType", "")
        code_url = html_entry.get("downloadUrl")

        screenshot_entry = screen.get("screenshot", {})
        shot_url = screenshot_entry.get("downloadUrl")

        screen_record = {
            "id": screen_id,
            "title": title,
            "slug": slug,
            "mimeType": mime_type,
            "htmlFile": None,
            "screenshotFile": None,
            "width": screen.get("width"),
            "height": screen.get("height"),
            "deviceType": screen.get("deviceType", "DESKTOP")
        }

        # Baixar código/marcação
        if code_url:
            if "svg" in mime_type or slug == "logo-mdsync":
                ext = "svg"
                target_file = ASSETS_DIR / "logo.svg"
            elif "markdown" in mime_type:
                ext = "md"
                target_file = SCREENS_DIR / f"{slug}.md"
            else:
                ext = "html"
                target_file = SCREENS_DIR / f"{slug}.html"

            try:
                size = download_url(code_url, target_file, is_binary=False)
                rel_path = str(target_file.relative_to(STITCH_DIR)).replace("\\", "/")
                screen_record["htmlFile"] = rel_path
                print(f"[{idx}/{len(screens_list)}] [CÓDIGO] {title} -> {target_file.name} ({size:,} bytes)")
            except Exception as e:
                print(f"[{idx}/{len(screens_list)}] [ERRO-CÓDIGO] {title}: {e}")

        # Baixar screenshot
        if shot_url:
            shot_file = SCREENSHOTS_DIR / f"{slug}.png"
            try:
                size = download_url(shot_url, shot_file, is_binary=True)
                rel_path = str(shot_file.relative_to(STITCH_DIR)).replace("\\", "/")
                screen_record["screenshotFile"] = rel_path
                print(f"[{idx}/{len(screens_list)}] [SHOT] {title} -> {shot_file.name} ({size:,} bytes)")
            except Exception as e:
                print(f"[{idx}/{len(screens_list)}] [ERRO-SHOT] {title}: {e}")

        imported_screens_index.append(screen_record)

    # 5. Salvar metadados consolidados
    metadata = {
        "projectId": PROJECT_ID,
        "title": PROJECT_TITLE,
        "importedAt": "2026-09-08T12:35:00Z",
        "totalScreens": len(imported_screens_index),
        "screens": imported_screens_index,
        "projectMeta": project_meta
    }
    meta_path = STITCH_DIR / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK] Metadados completos salvos em: {meta_path.name}")

    print("\n=== Importação dos arquivos brutos do Stitch concluída com sucesso! ===")


if __name__ == "__main__":
    main()
