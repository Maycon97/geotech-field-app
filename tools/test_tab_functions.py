import re

with open('index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Collect all element IDs present in index.html
html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html_content))

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

tab_functions = [
    'updateDashboardKPIs',
    'renderSurveyAnomalies',
    'loadInstrumentDetails',
    'initRadarCockpit',
    'updateChecklistProgress',
    'renderActionPlanTable',
    'renderHistoryHub',
    'renderReportsPanel',
    'renderIndicatorsDashboard',
    'renderGeoViewPanel',
    'initGeoView3DCockpit',
    'renderGeorefPanel',
    'initRotinaDiaria',
    'renderGeotechTeamFluxogram',
    'renderAuthPanel',
    'renderSyncQueue'
]

print(f"Total IDs in index.html: {len(html_ids)}")

for fn_name in tab_functions:
    # Find function body
    pattern = rf'function\s+{fn_name}\s*\([^)]*\)\s*\{{'
    match = re.search(pattern, app_js)
    if not match:
        # Check window.fn_name = function
        pattern2 = rf'window\.{fn_name}\s*=\s*function\s*\([^)]*\)\s*\{{'
        match = re.search(pattern2, app_js)
    
    if not match:
        # Check in other files
        print(f"\n[?] Function {fn_name} not defined directly in app.js as function declaration")
        continue

    start_idx = match.start()
    # Simple brace matcher to get roughly the function body
    open_braces = 0
    end_idx = start_idx
    started = False
    for i in range(start_idx, min(start_idx + 15000, len(app_js))):
        if app_js[i] == '{':
            open_braces += 1
            started = True
        elif app_js[i] == '}':
            open_braces -= 1
            if started and open_braces == 0:
                end_idx = i
                break
    
    body = app_js[start_idx:end_idx]
    accessed_ids = re.findall(r'document\.getElementById\(["\']([^"\']+)["\']\)', body)
    
    missing = [aid for aid in set(accessed_ids) if aid not in html_ids]
    if missing:
        print(f"\n[!] Function {fn_name} accesses MISSING IDs in index.html:")
        for m in missing:
            # Check if accessed with null check (e.g. if (el), el?, etc)
            lines_with_m = [line.strip() for line in body.split('\n') if f'"{m}"' in line or f"'{m}'" in line]
            print(f"    - {m}")
            for l in lines_with_m[:2]:
                print(f"       Code: {l}")
    else:
        print(f"[OK] {fn_name} checked ({len(set(accessed_ids))} IDs accessed, 0 missing)")
