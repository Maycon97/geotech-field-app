from pathlib import Path
import re

def update_screens():
    screens_dir = Path('stitch/screens')
    screens = sorted(list(screens_dir.glob('*.html')))
    print(f"Total screens found: {len(screens)}")

    for sc in screens:
        content = sc.read_text(encoding='utf-8')
        modified = False

        # If utils.js not in screen, inject before stitch-runtime.js or before </body>
        if 'src/core/utils.js' not in content:
            scripts_to_inject = '<script src="../../src/core/utils.js"></script>\n<script src="../../src/core/geotech.js"></script>\n'
            
            if '<script src="../stitch-runtime.js"></script>' in content:
                content = content.replace(
                    '<script src="../stitch-runtime.js"></script>',
                    scripts_to_inject + '<script src="../stitch-runtime.js"></script>'
                )
                modified = True
            elif '</body>' in content:
                content = content.replace(
                    '</body>',
                    scripts_to_inject + '</body>'
                )
                modified = True

        if modified:
            sc.write_text(content, encoding='utf-8')
            print(f"  [UPDATED] {sc.name}")
        else:
            print(f"  [ALREADY OK] {sc.name}")

if __name__ == '__main__':
    update_screens()
