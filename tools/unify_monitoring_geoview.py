import re
from pathlib import Path

def main():
    path = Path("index.html")
    html = path.read_text(encoding="utf-8")

    # 1. Locate start and end of tab-geoview
    tag_geoview_start = '<section id="tab-geoview" class="tab-pane">'
    idx_geoview_start = html.find(tag_geoview_start)
    if idx_geoview_start == -1:
        print("ERROR: tag_geoview_start not found")
        return
    idx_geoview_content_start = idx_geoview_start + len(tag_geoview_start)

    # The end of tab-geoview is before <!-- TAB 7: GEOREFERENCING -->
    idx_georef_comment = html.find('<!-- TAB 7: GEOREFERENCING -->')
    if idx_georef_comment == -1:
        print("ERROR: idx_georef_comment not found")
        return
    # find the </section> before idx_georef_comment
    idx_geoview_end = html.rfind('</section>', idx_geoview_start, idx_georef_comment)
    if idx_geoview_end == -1:
        print("ERROR: idx_geoview_end not found")
        return

    geoview_inner = html[idx_geoview_content_start:idx_geoview_end].strip()
    print(f"Extracted tab-geoview inner: {len(geoview_inner)} characters")

    # 2. Locate start and end of tab-georef
    tag_georef_start = '<section id="tab-georef" class="tab-pane">'
    idx_georef_start = html.find(tag_georef_start)
    if idx_georef_start == -1:
        print("ERROR: tag_georef_start not found")
        return
    idx_georef_content_start = idx_georef_start + len(tag_georef_start)

    idx_auth_comment = html.find('<!-- TAB 8: AUTHENTICATION & LOGIN')
    if idx_auth_comment == -1:
        print("ERROR: idx_auth_comment not found")
        return
    idx_georef_end = html.rfind('</section>', idx_georef_start, idx_auth_comment)
    if idx_georef_end == -1:
        print("ERROR: idx_georef_end not found")
        return

    georef_inner = html[idx_georef_content_start:idx_georef_end].strip()
    print(f"Extracted tab-georef inner: {len(georef_inner)} characters")

    # 3. Update sidebar nav items
    old_nav_readings = '''                <a href="#" class="nav-item" id="nav-readings" onclick="switchTab('readings')">
                    <i class="fa-solid fa-satellite-dish"></i>
                    <span>Monitoramento</span>
                </a>'''
    new_nav_readings = '''                <a href="#" class="nav-item" id="nav-readings" onclick="switchTab('readings')">
                    <i class="fa-solid fa-earth-americas" style="color: #38bdf8;"></i>
                    <span>Monitoramento &amp; GeoView 3D</span>
                    <span class="badge badge-danger" style="font-size: 10px; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);">AOI_01</span>
                </a>'''
    if old_nav_readings in html:
        html = html.replace(old_nav_readings, new_nav_readings, 1)
        print("Sidebar: Updated nav-readings")
    else:
        print("WARNING: old_nav_readings not found")

    old_nav_geos = '''                <a href="#" class="nav-item" id="nav-geoview" onclick="switchTab('geoview')">
                    <i class="fa-solid fa-earth-americas"></i>
                    <span>GeoView &amp; GIS 3D</span>
                </a>
                <a href="#" class="nav-item" id="nav-georef" onclick="switchTab('georef')">
                    <i class="fa-solid fa-location-crosshairs"></i>
                    <span>Georreferenciamento</span>
                </a>'''
    new_nav_geos = '''                <!-- Aliases ocultos de navegacao para retrocompatibilidade -->
                <a href="#" class="nav-item" id="nav-geoview" onclick="switchTab('geoview')" style="display: none;"></a>
                <a href="#" class="nav-item" id="nav-georef" onclick="switchTab('georef')" style="display: none;"></a>'''
    if old_nav_geos in html:
        html = html.replace(old_nav_geos, new_nav_geos, 1)
        print("Sidebar: Hidden nav-geoview and nav-georef aliases created")
    else:
        print("WARNING: old_nav_geos not found")

    # 4. In tab-readings, replace subnav bar and inject panel-geoview3d-cockpit
    old_subnav_bar = '''                    <!-- SUB-NAV TOGGLE BAR FOR MONITORING TAB -->
                    <div class="monitoring-subnav-bar mb-3">
                        <div class="monitoring-subnav-pills">
                            <button type="button" class="subnav-pill active" id="pill-radar-247" onclick="switchMonitoringSubTab('radar')">
                                <i class="fa-brands fa-whatsapp text-success pulse-icon"></i>
                                <span>Radar Hexagon 24/7 &amp; Grupo WhatsApp</span>
                                <span class="badge badge-danger">FR012 Nível 3</span>
                            </button>
                            <button type="button" class="subnav-pill" id="pill-conventional" onclick="switchMonitoringSubTab('conventional')">
                                <i class="fa-solid fa-ruler-vertical text-secondary"></i>
                                <span>Instrumentação Convencional (Piezômetros PZ/INA)</span>
                                <span class="badge badge-outline">24 Instrumentos</span>
                            </button>
                        </div>
                        <div class="monitoring-subnav-status">
                            <span class="status-indicator online"></span>
                            <span class="small font-mono text-secondary">IBIS-FM 01 • Conexão WhatsApp 24/7 Ativa</span>
                        </div>
                    </div>'''

    new_subnav_bar = f'''                    <!-- SUB-NAV TOGGLE BAR DO HUB UNIFICADO MONITORAMENTO & GEOVIEW 3D -->
                    <div class="monitoring-subnav-bar mb-3">
                        <div class="monitoring-subnav-pills">
                            <button type="button" class="subnav-pill active" id="pill-sub-geoview3d" onclick="switchMonitoringSubTab('geoview3d')">
                                <i class="fa-solid fa-cube text-primary"></i>
                                <span>GeoView &amp; GIS 3D</span>
                                <span class="badge badge-primary" style="font-size: 10px;">Three.js</span>
                            </button>
                            <button type="button" class="subnav-pill" id="pill-sub-radar" onclick="switchMonitoringSubTab('radar')">
                                <i class="fa-brands fa-whatsapp text-success pulse-icon"></i>
                                <span>Radar Hexagon 24/7</span>
                                <span class="badge badge-danger">FR012 Nível 3</span>
                            </button>
                            <button type="button" class="subnav-pill" id="pill-sub-conventional" onclick="switchMonitoringSubTab('conventional')">
                                <i class="fa-solid fa-ruler-vertical text-secondary"></i>
                                <span>Instrumentação Convencional (PZ/INA)</span>
                                <span class="badge badge-outline">24 Instrumentos</span>
                            </button>
                            <button type="button" class="subnav-pill" id="pill-sub-gis2d" onclick="switchMonitoringSubTab('gis2d')">
                                <i class="fa-solid fa-map-location-dot text-info"></i>
                                <span>Cartografia GIS 2D</span>
                                <span class="badge badge-outline">SIRGAS 2000</span>
                            </button>
                        </div>
                        <div class="monitoring-subnav-status">
                            <span class="status-indicator online"></span>
                            <span class="small font-mono text-secondary">IBIS-FM 01 • Cava Jangada • Online</span>
                        </div>
                    </div>

                    <!-- 1. PAINEL GEOVIEW & GIS 3D (THREE.JS / ORTOFOTOS / PLANO DE LAVRA) -->
                    <div id="panel-geoview3d-cockpit" class="monitoring-sub-panel">
{geoview_inner}
                    </div>'''

    if old_subnav_bar in html:
        html = html.replace(old_subnav_bar, new_subnav_bar, 1)
        print("tab-readings: Injected unified sub-nav bar and panel-geoview3d-cockpit")
    else:
        print("ERROR: old_subnav_bar not found")
        return

    # Update panel-radar-monitoring to start hidden
    old_radar_tag = '<div id="panel-radar-monitoring" class="radar-panel-container">'
    new_radar_tag = '<div id="panel-radar-monitoring" class="radar-panel-container monitoring-sub-panel" style="display: none;">'
    if old_radar_tag in html:
        html = html.replace(old_radar_tag, new_radar_tag, 1)
        print("tab-readings: Updated panel-radar-monitoring")

    old_conv_tag = '<div id="panel-conventional-readings" style="display: none;">'
    new_conv_tag = '<div id="panel-conventional-readings" class="monitoring-sub-panel" style="display: none;">'
    if old_conv_tag in html:
        html = html.replace(old_conv_tag, new_conv_tag, 1)
        print("tab-readings: Updated panel-conventional-readings")

    # Inject panel-gis2d-georef before tab-readings closing
    target_end_readings = '<!-- TAB 3: VISUAL INSPECTIONS -->'
    idx_insp = html.find(target_end_readings)
    idx_close_sec = html.rfind('</section>', 0, idx_insp)
    
    gis2d_block = f'''
                    <!-- 4. PAINEL CARTOGRAFIA GIS 2D & GEORREFERENCIAMENTO (LEAFLET / SIRGAS 2000) -->
                    <div id="panel-gis2d-georef" class="monitoring-sub-panel" style="display: none;">
{georef_inner}
                    </div>
                '''
    html = html[:idx_close_sec] + gis2d_block + html[idx_close_sec:]
    print("tab-readings: Injected panel-gis2d-georef")

    # 5. Empty out old tab-geoview and tab-georef
    # Find tab-geoview again
    idx_gv_s = html.find('<section id="tab-geoview" class="tab-pane">')
    idx_gv_c = html.find('<!-- TAB 7: GEOREFERENCING -->')
    idx_gv_e = html.rfind('</section>', idx_gv_s, idx_gv_c) + len('</section>')
    
    html = html[:idx_gv_s] + '<section id="tab-geoview" class="tab-pane" style="display: none;"></section>' + html[idx_gv_e:]
    print("Cleaned up old tab-geoview to empty placeholder")

    # Find tab-georef again
    idx_gr_s = html.find('<section id="tab-georef" class="tab-pane">')
    idx_gr_c = html.find('<!-- TAB 8: AUTHENTICATION & LOGIN')
    idx_gr_e = html.rfind('</section>', idx_gr_s, idx_gr_c) + len('</section>')

    html = html[:idx_gr_s] + '<section id="tab-georef" class="tab-pane" style="display: none;"></section>' + html[idx_gr_e:]
    print("Cleaned up old tab-georef to empty placeholder")

    path.write_text(html, encoding="utf-8")
    print("ALL DONE! index.html saved successfully.")

if __name__ == '__main__':
    main()
