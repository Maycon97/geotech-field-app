import zipfile
import re
from pathlib import Path

def inspect_apk():
    apk_path = Path(r"C:\Users\maycon.nascimento\Documents\Codex\2026-06-01\traga-todo-o-projeto-desse-link\work\geosync-android\app\build\outputs\apk\debug\app-debug.apk")
    if not apk_path.exists():
        print("APK nao encontrado:", apk_path)
        return

    print("=== Lendo APK:", apk_path.name, f"({apk_path.stat().st_size} bytes) ===")
    with zipfile.ZipFile(apk_path, "r") as z:
        for info in z.infolist():
            if "assets" in info.filename:
                print("Asset:", info.filename, f"({info.file_size} bytes)")

        if "classes.dex" in z.namelist():
            dex = z.read("classes.dex")
            print("\nClasses encontradas no dex (amostra):")
            classes = re.findall(rb'L[a-zA-Z0-9_/]+;', dex)
            for c in set(classes):
                c_str = c.decode("latin1", errors="ignore")
                if "itaminas" in c_str or "geosync" in c_str or "mdsync" in c_str:
                    print("  ", c_str)

if __name__ == "__main__":
    inspect_apk()
