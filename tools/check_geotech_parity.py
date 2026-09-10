from pathlib import Path
import re

def check_parity():
    geotech_js = Path('src/core/geotech.js').read_text(encoding='utf-8')
    stitch_rt = Path('stitch/stitch-runtime.js').read_text(encoding='utf-8')

    print("=== VERIFICANDO PARIDADE GEOTÉCNICA (Bo & Barrett 2023 / ANM 95) ===")
    
    # Check key calculation methods in geotech.js
    methods = [
        'calculateCasagrandeNA',
        'calculateVibratingWirePressure',
        'calculateKinematicStatus',
        'calculateInverseVelocityFukuzono',
        'calculateThompsonWeirFlow',
        'utm23sToLatLng'
    ]

    for m in methods:
        in_geo = m in geotech_js
        in_stitch = m in stitch_rt
        print(f"Método '{m}': geotech.js={in_geo}, stitch-runtime.js={in_stitch}")

    # Check if stitch-runtime imports or uses GeotechEngine
    uses_engine = 'GeotechEngine' in stitch_rt or 'MDSyncGeotech' in stitch_rt
    print(f"stitch-runtime referencia GeotechEngine: {uses_engine}")

if __name__ == '__main__':
    check_parity()
