import re
from pathlib import Path

def audit_runtime():
    content = Path('stitch/stitch-runtime.js').read_text(encoding='utf-8')
    print(f"Linhas em stitch-runtime.js: {len(content.splitlines())}")

    # IDs accessed
    by_id = set(re.findall(r'getElementById\(["\']([^"\']+)["\']\)', content))
    print(f"IDs buscados: {len(by_id)}")
    for i in sorted(by_id):
        print(f"  - {i}")

    # Check which IDs are dynamically created vs expected in screens
    print("\nVerificando se telas possuem esses IDs ou se são injetados dinamicamente...")
    screens = list(Path('stitch/screens').glob('*.html'))
    for target_id in sorted(by_id):
        found_in = []
        for s in screens:
            if target_id in s.read_text(encoding='utf-8'):
                found_in.append(s.name)
        if not found_in:
            # Check if created in stitch-runtime.js
            if f"id = '{target_id}'" in content or f'id = "{target_id}"' in content or f".id = '{target_id}'" in content or f'.id = "{target_id}"' in content:
                print(f"  [OK - Criado dinamicamente no runtime] {target_id}")
            else:
                print(f"  [ALERTA - Não encontrado em nenhuma tela nem criado no runtime] {target_id}")
        else:
            print(f"  [OK - Presente em {len(found_in)} telas] {target_id}")

if __name__ == '__main__':
    audit_runtime()
