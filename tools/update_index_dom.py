from pathlib import Path

def main():
    path = Path('index.html')
    html = path.read_text(encoding='utf-8')

    target = '<div class="geoview-dashboard-grid mt-3" id="geoview-dashboard-grid"></div>'
    replacement = '''<div class="geoview-dashboard-grid mt-3" id="geoview-dashboard-grid"></div>
                                    <div class="d-flex justify-center mt-3">
                                        <button type="button" class="btn btn-secondary btn-sm" id="geoview-load-more" onclick="toggleGeoViewFullRender()" style="display: none;">
                                            <i class="fa-solid fa-arrows-up-down"></i> <span id="geoview-load-more-text">Mostrar todos os dashboards</span>
                                        </button>
                                    </div>'''

    if target in html:
        html = html.replace(target, replacement, 1)
        path.write_text(html, encoding='utf-8')
        print("index.html updated successfully with geoview-load-more button.")
    else:
        print("Target not found in index.html!")

if __name__ == '__main__':
    main()
