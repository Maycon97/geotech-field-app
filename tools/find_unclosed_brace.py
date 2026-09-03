from pathlib import Path

lines = Path("styles.css").read_text(encoding="utf-8").splitlines()

depth = 0
for idx, line in enumerate(lines, 1):
    open_c = line.count("{")
    close_c = line.count("}")
    prev_depth = depth
    depth += open_c - close_c
    if depth < 0:
        print(f"Extra closing brace at line {idx}: {line}")
    if open_c > 0 or close_c > 0:
        if idx > 1700 and idx < 1900:
            print(f"Line {idx} (depth {depth}): {line}")

print(f"Final depth at end of file: {depth}")
