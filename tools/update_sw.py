from pathlib import Path

def main():
    sw_path = Path('service-worker.js')
    content = sw_path.read_text(encoding='utf-8')

    old_cache = 'const GEOSYNC_CACHE = "geosync-field-pwa-pcmi-v20260908-kpis-hd";'
    new_cache = 'const GEOSYNC_CACHE = "geosync-field-pwa-pcmi-v20260910-sysdam-core";'
    content = content.replace(old_cache, new_cache)

    old_block = '''    "./src/core/utils.js",
    "./src/core/geotech.js",'''

    new_block = '''    "./src/core/sync-bridge.js",
    "./src/core/utils.js",
    "./src/core/geotech.js",
    "./vendor/three.min.js",'''

    content = content.replace(old_block, new_block)

    old_data = '''    "./data/cronograma-pcm.js",
    "./data/pluviometria.js",'''

    new_data = '''    "./data/cronograma-pcm.js",
    "./data/cronograma-painel-pcm.js",
    "./data/rotina-equipe.js",
    "./data/pluviometria.js",'''

    content = content.replace(old_data, new_data)

    old_radar = '''    "./data/radar-cava-jangada.js",'''
    new_radar = '''    "./data/radar-cava-jangada.js",
    "./data/plano-lavra-jangada.js",'''

    content = content.replace(old_radar, new_radar)

    sw_path.write_text(content, encoding='utf-8')
    print("service-worker.js updated successfully.")

if __name__ == '__main__':
    main()
