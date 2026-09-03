from pathlib import Path

lines = Path("styles.css").read_text(encoding="utf-8").splitlines()
depth = 0
for idx, line in enumerate(lines, 1):
    open_c = line.count("{")
    close_c = line.count("}")
    depth += open_c - close_c
    if depth < 0:
        print(f"First negative depth at line {idx}: {line}")
        for i in range(max(1, idx - 15), min(len(lines), idx + 10)):
            print(f"{i:4d}: {lines[i-1]}")
        break
