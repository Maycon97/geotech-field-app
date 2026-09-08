from pathlib import Path

screens_dir = Path("stitch/screens")
updated = 0

for html_file in screens_dir.glob("*.html"):
    content = html_file.read_text(encoding="utf-8")
    additions = []
    if "jszip.min.js" not in content:
        additions.append('<script src="../../vendor/jszip.min.js"></script>')
    if "stitch-runtime.js" not in content:
        additions.append('<script src="../stitch-runtime.js"></script>')

    if additions:
        inject_code = "\n" + "\n".join(additions) + "\n"
        if "</body>" in content:
            content = content.replace("</body>", inject_code + "</body>")
        else:
            content += inject_code
        html_file.write_text(content, encoding="utf-8")
        updated += 1
        print(f"[OK] Injetado em {html_file.name}")

print(f"Total de telas atualizadas com sucesso: {updated}")
