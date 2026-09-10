import re
import json
from pathlib import Path

def scan_stitch():
    print("=== SCANNING STITCH PLATFORM ===")
    stitch_dir = Path("stitch")
    if not stitch_dir.exists():
        print("Pasta stitch nao existe.")
        return

    screens_dir = stitch_dir / "screens"
    screens = list(screens_dir.glob("*.html"))
    print(f"Total de telas em stitch/screens: {len(screens)}")

    # Check stitch/index.html links to screens
    stitch_index = (stitch_dir / "index.html").read_text(encoding="utf-8")
    screen_links = set(re.findall(r'href=["\']([^"\']+\.html)["\']', stitch_index))
    print(f"Links para telas no stitch/index.html: {len(screen_links)}")
    for sl in screen_links:
        target = stitch_dir / sl
        if not target.exists():
            print(f"[BROKEN SCREEN LINK in stitch/index.html]: {sl} -> {target}")

    # Check each screen for broken assets, missing scripts, etc.
    for sc in screens:
        content = sc.read_text(encoding="utf-8")
        # Check script src
        scripts = re.findall(r'<script\s+[^>]*src=["\']([^"\']+)["\']', content)
        for s in scripts:
            if s.startswith("http") or s.startswith("//"):
                continue
            clean_s = s.split("?")[0].split("#")[0]
            target = (sc.parent / clean_s).resolve()
            if not target.exists():
                print(f"[BROKEN SCRIPT in {sc.name}]: {s} (resolved: {target})")

        # Check stylesheets
        links = re.findall(r'<link\s+[^>]*href=["\']([^"\']+)["\']', content)
        for l in links:
            if l.startswith("http") or l.startswith("//") or "stylesheet" not in content:
                continue
            clean_l = l.split("?")[0].split("#")[0]
            target = (sc.parent / clean_l).resolve()
            if not target.exists():
                print(f"[BROKEN STYLESHEET in {sc.name}]: {l} (resolved: {target})")

    # Check stitch-runtime.js
    runtime_file = stitch_dir / "stitch-runtime.js"
    if runtime_file.exists():
        rt_content = runtime_file.read_text(encoding="utf-8")
        print(f"stitch-runtime.js size: {len(rt_content)} bytes")
    else:
        print("[AVISO] stitch-runtime.js nao encontrado!")

if __name__ == '__main__':
    scan_stitch()
