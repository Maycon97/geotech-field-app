import os

def check_js(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    in_str = None
    in_comm = False
    in_multi_comm = False
    escaped = False
    curls = []
    parens = []
    bracks = []
    i = 0
    line = 1
    col = 1
    while i < len(content):
        c = content[i]
        nxt = content[i+1] if i+1 < len(content) else ''
        if c == '\n':
            line += 1
            col = 0
        col += 1

        if in_multi_comm:
            if c == '*' and nxt == '/':
                in_multi_comm = False
                i += 2
                continue
            i += 1
            continue
        if in_comm:
            if c == '\n':
                in_comm = False
            i += 1
            continue
        if in_str:
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == in_str:
                in_str = None
            i += 1
            continue

        if c == '/' and nxt == '/':
            in_comm = True
            i += 2
            continue
        if c == '/' and nxt == '*':
            in_multi_comm = True
            i += 2
            continue
        # Check regex literal
        if c == '/' and not in_comm and not in_multi_comm and not in_str:
            # Check previous non-whitespace char to distinguish division from regex literal
            prev_chars = [ch for ch in content[:i] if not ch.isspace()]
            prev_c = prev_chars[-1] if prev_chars else ''
            if prev_c in ('(', ',', '=', ':', '[', '!', '&', '|', '?', ';', '{', '}'):
                # it is a regex literal
                j = i + 1
                reg_escaped = False
                while j < len(content):
                    if reg_escaped:
                        reg_escaped = False
                    elif content[j] == '\\':
                        reg_escaped = True
                    elif content[j] == '/':
                        j += 1
                        while j < len(content) and content[j] in 'gimsuy':
                            j += 1
                        break
                    j += 1
                i = j
                continue

        if c in ('"', "'", '`'):
            in_str = c
            i += 1
            continue

        if c == '{': curls.append((line, col))
        elif c == '}':
            if curls: curls.pop()
            else: print(f"{path}: extra }} at line {line}:{col}")
        elif c == '(': parens.append((line, col))
        elif c == ')':
            if parens: parens.pop()
            else: print(f"{path}: extra ) at line {line}:{col}")
        elif c == '[': bracks.append((line, col))
        elif c == ']':
            if bracks: bracks.pop()
            else: print(f"{path}: extra ] at line {line}:{col}")
        i += 1

    if curls:
        print(f"{path}: unclosed {{ count={len(curls)} at {curls[:3]}")
    if parens:
        print(f"{path}: unclosed ( count={len(parens)} at {parens[:3]}")
    if bracks:
        print(f"{path}: unclosed [ count={len(bracks)} at {bracks[:3]}")
    if not curls and not parens and not bracks:
        print(f"OK: {os.path.basename(path)}")

if __name__ == '__main__':
    core_dir = 'src/core'
    for f in sorted(os.listdir(core_dir)):
        if f.endswith('.js'):
            check_js(os.path.join(core_dir, f))
