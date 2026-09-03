from pathlib import Path

html = Path("index.html").read_text(encoding="utf-8")
css = Path("styles.css").read_text(encoding="utf-8")
js = Path("app.js").read_text(encoding="utf-8")

print(f"index.html length: {len(html)} chars, lines: {len(html.splitlines())}")
print(f"styles.css length: {len(css)} chars, lines: {len(css.splitlines())}")
print(f"app.js length: {len(js)} chars, lines: {len(js.splitlines())}")

# Check CSS bracket balance
open_braces = css.count("{")
close_braces = css.count("}")
print(f"styles.css braces: open={open_braces}, close={close_braces}, diff={open_braces - close_braces}")

# Check JS bracket balance
js_open = js.count("{")
js_close = js.count("}")
print(f"app.js braces: open={js_open}, close={js_close}, diff={js_open - js_close}")
