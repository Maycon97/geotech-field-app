from pathlib import Path
import re

def inject_index_html():
    index_path = Path('index.html')
    content = index_path.read_text(encoding='utf-8')

    # 1. Adicionar botão no header-right caso ainda não exista
    if 'btn-sysdam-toggle' not in content:
        header_needle = '<button class="btn btn-secondary" id="theme-toggle-btn"'
        header_btn = '''<button class="btn btn-secondary btn-sysdam-toggle" onclick="openSysdamCockpit('modules')" title="Abrir Modo SYSDAM Cockpit Operacional Mobile" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(2, 132, 199, 0.25)); border: 1px solid rgba(168, 85, 247, 0.5); color: #c084fc; font-weight: 700;">
                        <i class="fa-solid fa-mobile-screen-button"></i> <span>SYSDAM</span>
                    </button>
                    '''
        if header_needle in content:
            content = content.replace(header_needle, header_btn + header_needle)
            print("[OK] Botao SYSDAM inserido no app-header.")

    # 2. Adicionar link no menu lateral caso ainda não exista
    if 'id="nav-sysdam"' not in content:
        nav_needle = 'id="nav-stitch"'
        nav_item = '''<a href="#" class="nav-item" id="nav-sysdam" onclick="openSysdamCockpit('modules'); return false;" title="Abrir Modo SYSDAM Cockpit Operacional Mobile" style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 6px; padding-top: 10px;">
                    <i class="fa-solid fa-mobile-screen-button" style="color: #a855f7;"></i>
                    <span>Modo SYSDAM</span>
                    <span class="badge" style="background: rgba(168, 85, 247, 0.25); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.5); font-size: 10px;">HUB</span>
                </a>
                '''
        if nav_needle in content:
            content = content.replace(nav_needle, nav_needle + '\n' + nav_item)
            print("[OK] Item nav-sysdam inserido no menu lateral.")

    # 3. Adicionar o bloco de HTML do sysdam-overlay
    if 'id="sysdam-overlay"' not in content:
        overlay_html = '''
    <!-- ==========================================================================
         SYSDAM OPERATIONAL COCKPIT & MOBILE OVERLAY (BENCHMARK PIMENTA DE ÁVILA)
         ========================================================================== -->
    <div id="sysdam-overlay" class="sysdam-overlay">
        <div class="sysdam-device-frame">
            <!-- Barra de Status do Smartphone -->
            <div class="sysdam-status-bar dark-text" id="sysdam-status-bar">
                <span class="font-mono">09:41</span>
                <div class="sysdam-status-icons">
                    <i class="fa-solid fa-signal"></i>
                    <i class="fa-solid fa-wifi"></i>
                    <i class="fa-solid fa-battery-full text-success"></i>
                </div>
            </div>

            <!-- Botão Fechar Modo SYSDAM -->
            <button type="button" class="sysdam-close-btn" onclick="closeSysdamCockpit()" aria-label="Fechar SYSDAM" title="Fechar e voltar ao MDSync">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <!-- Área de Conteúdo Alternável -->
            <div class="sysdam-content-area">

                <!-- VIEW 0: SPLASH / LOGIN (Imagem 2) -->
                <div id="sysdam-view-splash" class="sysdam-view sysdam-splash-view">
                    <div class="sysdam-brand-logo">
                        <i class="fa-solid fa-cubes"></i>
                        <span>sysdam<span class="prism">.</span></span>
                    </div>

                    <div class="sysdam-login-box">
                        <div class="sysdam-login-title">Faça o login em sua conta</div>
                        <button type="button" class="sysdam-login-btn" onclick="window.Sysdam.switchView('modules')">
                            <i class="fa-regular fa-envelope"></i> Continuar com o e-mail
                        </button>
                        <button type="button" class="sysdam-login-btn" onclick="window.Sysdam.switchView('modules')">
                            <i class="fa-brands fa-microsoft text-primary"></i> Continuar com a Microsoft
                        </button>
                    </div>

                    <div class="sysdam-splash-footer">
                        <p>SYSDAM Mobile Hub • Pimenta de Ávila</p>
                        <p class="small text-muted">Sincronizado bilateralmente com o MDSync</p>
                    </div>
                </div>

                <!-- VIEW 1: SELETOR DE MÓDULOS (Imagem 3) -->
                <div id="sysdam-view-modules" class="sysdam-view sysdam-modules-view active">
                    <div class="sysdam-modules-header">
                        <span>Módulos de Segurança</span>
                    </div>

                    <!-- Barra de Informações do Usuário e Sincronização -->
                    <div class="sysdam-user-access-bar">
                        <div class="sysdam-user-access-info">
                            <div class="sysdam-user-icon">
                                <i class="fa-solid fa-user-shield"></i>
                            </div>
                            <div class="sysdam-user-texts">
                                <strong>Maycon Nascimento</strong>
                                <span>Eng. Geotécnico Sênior • Sincronizado</span>
                            </div>
                        </div>
                        <button type="button" class="sysdam-sync-circle-btn" onclick="if(window.SyncBridge) window.SyncBridge.emit('FORCE_SYNC', {}); if(window.showToast) window.showToast('Sincronização', 'Base de dados 100% atualizada.', 'success', 2500);" title="Sincronizar dados">
                            <i class="fa-solid fa-rotate"></i>
                        </button>
                    </div>

                    <!-- Módulo [AL] Alert Cadastrador -->
                    <div class="sysdam-module-card" onclick="window.Sysdam.selectModule('AL')">
                        <div class="sysdam-badge-square badge-al">
                            AL
                        </div>
                        <div>
                            <strong>Alert Cadastrador</strong>
                            <p class="text-secondary small" style="margin: 2px 0 0 0;">Gestão da ZAS, População e Sirenes STI</p>
                        </div>
                    </div>

                    <!-- Módulo [IN] Inspeção -->
                    <div class="sysdam-module-card" onclick="window.Sysdam.selectModule('IN')">
                        <div class="sysdam-badge-square badge-in">
                            IN
                        </div>
                        <div>
                            <strong>Inspeção</strong>
                            <p class="text-secondary small" style="margin: 2px 0 0 0;">Ficha de Inspeção Regular e Res. ANM 95/2022</p>
                        </div>
                    </div>

                    <!-- Módulo [MI] Monitoramento -->
                    <div class="sysdam-module-card" onclick="window.Sysdam.selectModule('MI')">
                        <div class="sysdam-badge-square badge-mi">
                            MI
                        </div>
                        <div>
                            <strong>Monitoramento</strong>
                            <p class="text-secondary small" style="margin: 2px 0 0 0;">Leituras de Instrumentos e Mapa em Campo</p>
                        </div>
                    </div>
                </div>

                <!-- VIEW 2: COCKPIT DE MONITORAMENTO GRID 3x4 (Imagem 4) -->
                <div id="sysdam-view-mi-grid" class="sysdam-view sysdam-grid-view">
                    <!-- Linha do Topo: Badge Roxo, Estrutura e Operador -->
                    <div class="sysdam-grid-top-row">
                        <div class="sysdam-top-banner-card purple-badge" onclick="window.Sysdam.switchView('modules')" title="Voltar aos módulos">
                            <span>MI</span>
                        </div>
                        <div class="sysdam-top-banner-card" onclick="window.Sysdam.switchView('mi-map')" title="Estrutura Monitorada">
                            <i class="fa-solid fa-mountain"></i>
                            <span id="sysdam-active-structure-name">Barragem da Mina</span>
                        </div>
                        <div class="sysdam-top-banner-card" onclick="switchTab('users'); closeSysdamCockpit();" title="Perfil do Operador">
                            <i class="fa-solid fa-user-circle"></i>
                            <span>Maycon N.</span>
                        </div>
                    </div>

                    <!-- Grade de Ações 3x4 (12 Ações Operacionais) -->
                    <div class="sysdam-cockpit-grid">
                        <!-- 1. Mapa de Campo -->
                        <div class="sysdam-grid-action-card" onclick="window.Sysdam.switchView('mi-map')">
                            <i class="fa-solid fa-map-location-dot" style="color: #0284c7;"></i>
                            <span>Mapa Satélite</span>
                        </div>
                        <!-- 2. Nova Leitura -->
                        <div class="sysdam-grid-action-card" onclick="window.Sysdam.openQuickReading('PZ-03')">
                            <i class="fa-solid fa-pen-to-square" style="color: #10b981;"></i>
                            <span>Nova Leitura</span>
                        </div>
                        <!-- 3. Piezômetros -->
                        <div class="sysdam-grid-action-card" onclick="window.Sysdam.switchView('mi-map')">
                            <i class="fa-solid fa-gauge-high" style="color: #6366f1;"></i>
                            <span>Piezômetros</span>
                        </div>
                        <!-- 4. Indicador NA -->
                        <div class="sysdam-grid-action-card" onclick="window.Sysdam.switchView('mi-map')">
                            <i class="fa-solid fa-water" style="color: #06b6d4;"></i>
                            <span>Nível D'Água</span>
                        </div>
                        <!-- 5. Medidores Vazão -->
                        <div class="sysdam-grid-action-card" onclick="window.Sysdam.switchView('mi-map')">
                            <i class="fa-solid fa-faucet-drip" style="color: #f59e0b;"></i>
                            <span>Vazão VZ</span>
                        </div>
                        <!-- 6. Marcos Superficiais -->
                        <div class="sysdam-grid-action-card" onclick="window.Sysdam.switchView('mi-map')">
                            <i class="fa-solid fa-crosshairs" style="color: #ec4899;"></i>
                            <span>Marcos Topo</span>
                        </div>
                        <!-- 7. Câmeras & Radar -->
                        <div class="sysdam-grid-action-card" onclick="switchTab('geoview'); closeSysdamCockpit();">
                            <i class="fa-solid fa-tower-observation" style="color: #8b5cf6;"></i>
                            <span>Radar &amp; Câmeras</span>
                        </div>
                        <!-- 8. Mini-Mapa com Pin Central (Representação da Imagem 4) -->
                        <div class="sysdam-mini-map-card" onclick="window.Sysdam.switchView('mi-map')">
                            <img src="assets/geoview-site-overview.webp" alt="Localização do Instrumento">
                            <div class="sysdam-mini-map-pin">
                                <i class="fa-solid fa-location-dot"></i>
                            </div>
                        </div>
                        <!-- 9. Histórico Local -->
                        <div class="sysdam-grid-action-card" onclick="switchTab('history'); closeSysdamCockpit();">
                            <i class="fa-solid fa-clock-rotate-left" style="color: #3b82f6;"></i>
                            <span>Histórico</span>
                        </div>
                        <!-- 10. Sincronização SyncBridge -->
                        <div class="sysdam-grid-action-card" onclick="if(window.SyncBridge) window.SyncBridge.emit('FORCE_SYNC', {}); if(window.showToast) window.showToast('SyncBridge', 'Transmissão de dados concluída.', 'success', 2500);">
                            <i class="fa-solid fa-arrows-rotate" style="color: #10b981;"></i>
                            <span>SyncBridge</span>
                        </div>
                        <!-- 11. Normas & TARP -->
                        <div class="sysdam-grid-action-card" onclick="window.Sysdam.switchView('in-hub')">
                            <i class="fa-solid fa-shield-halved" style="color: #ef4444;"></i>
                            <span>TARP &amp; ANM</span>
                        </div>
                        <!-- 12. Voltar aos Módulos -->
                        <div class="sysdam-grid-action-card card-muted" onclick="window.Sysdam.switchView('modules')">
                            <i class="fa-solid fa-table-cells-large" style="color: #475569;"></i>
                            <span>Módulos</span>
                        </div>
                    </div>
                </div>

                <!-- VIEW 3: MAPA INTERATIVO & BOTTOM SHEET (Imagem 5) -->
                <div id="sysdam-view-mi-map" class="sysdam-view sysdam-map-view">
                    <!-- Container Leaflet com Base Satélite ESRI -->
                    <div id="sysdam-leaflet-map" class="sysdam-map-canvas"></div>

                    <!-- Barra Superior Flutuante -->
                    <div class="sysdam-map-floating-top">
                        <button type="button" class="sysdam-map-icon-btn" onclick="window.Sysdam.switchView('mi-grid')" title="Voltar ao Cockpit">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button type="button" class="sysdam-map-struct-pill" onclick="window.Sysdam.switchView('mi-grid')" title="Alternar Estrutura">
                            <i class="fa-solid fa-mountain"></i>
                            <span id="sysdam-map-struct-title">Barragem da Mina</span>
                        </button>
                        <button type="button" class="sysdam-map-icon-btn" onclick="window.Sysdam.openQuickReading('PZ-03')" title="Nova Leitura">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>

                    <!-- Botões Flutuantes na Lateral Direita -->
                    <div class="sysdam-map-side-actions">
                        <button type="button" class="sysdam-side-action-btn" onclick="window.Sysdam.recenterGPS()" title="Recentralizar na minha localização GPS">
                            <i class="fa-solid fa-crosshairs text-primary"></i>
                        </button>
                        <button type="button" class="sysdam-side-action-btn btn-blue" onclick="window.Sysdam.toggleBottomSheet()" title="Alternar gaveta inferior">
                            <i class="fa-solid fa-list-check"></i>
                        </button>
                    </div>

                    <!-- Bottom Sheet Inferior Deslizante com Busca e Carrossel -->
                    <div id="sysdam-bottom-sheet" class="sysdam-bottom-sheet">
                        <div class="sysdam-sheet-drag-handle" onclick="window.Sysdam.toggleBottomSheet()"></div>
                        
                        <!-- Barra de Busca, Contador e Ordenação -->
                        <div class="sysdam-sheet-search-row">
                            <i class="fa-solid fa-magnifying-glass text-secondary"></i>
                            <input type="text" class="sysdam-sheet-search-input" id="sysdam-sheet-search" placeholder="Pesquisar instrumento..." oninput="window.Sysdam.handleSearch(this.value)">
                            <span class="sysdam-counter-badge" id="sysdam-instruments-count-badge">6</span>
                            <button type="button" class="sysdam-sort-btn" onclick="window.Sysdam.toggleSort()" title="Alternar ordenação por distância">
                                <i class="fa-solid fa-arrow-down-short-wide"></i>
                            </button>
                        </div>

                        <!-- Carrossel Horizontal de Cards de Instrumentos -->
                        <div id="sysdam-carousel-cards" class="sysdam-carousel-container">
                            <!-- Injetado dinamicamente por SysdamController -->
                        </div>
                    </div>
                </div>

                <!-- VIEW 4: MÓDULO ALERT CADASTRADOR [AL] -->
                <div id="sysdam-view-al-hub" class="sysdam-view sysdam-modules-view">
                    <div class="d-flex align-center justify-between mb-3">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.Sysdam.switchView('modules')">
                            <i class="fa-solid fa-arrow-left"></i> Módulos
                        </button>
                        <span class="font-bold text-warning"><i class="fa-solid fa-bullhorn"></i> ZAS e Sirenes STI</span>
                    </div>

                    <!-- Alertas e Rotas da ZAS -->
                    <div class="card mb-3" style="background: #ffffff; border-radius: 14px; padding: 14px; border: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #0f172a;"><i class="fa-solid fa-person-walking-arrow-right text-warning"></i> Plano de Evacuação ZAS</h4>
                        <p class="text-secondary small" style="margin: 0 0 8px 0;">Tempo estimado de evacuação até ponto seguro: <strong>14 minutos</strong>.</p>
                        <div class="d-flex gap-2">
                            <span class="badge badge-success">3 Sirenes Ativas</span>
                            <span class="badge badge-info">62 Residentes</span>
                        </div>
                    </div>

                    <h5 style="font-size: 13px; color: #475569; margin: 12px 0 6px 0; text-transform: uppercase;">Sirenes STI Instaladas</h5>
                    <div id="sysdam-al-sirenes-list"></div>

                    <h5 style="font-size: 13px; color: #475569; margin: 16px 0 6px 0; text-transform: uppercase;">Residentes Mapeados na Mancha</h5>
                    <div id="sysdam-al-residents-list"></div>
                </div>

                <!-- VIEW 5: MÓDULO DE INSPEÇÃO TÉCNICA [IN] -->
                <div id="sysdam-view-in-hub" class="sysdam-view sysdam-modules-view">
                    <div class="d-flex align-center justify-between mb-3">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="window.Sysdam.switchView('modules')">
                            <i class="fa-solid fa-arrow-left"></i> Módulos
                        </button>
                        <span class="font-bold text-success"><i class="fa-solid fa-clipboard-check"></i> Vistoria FIR</span>
                    </div>

                    <div class="card mb-3" style="background: #ffffff; border-radius: 14px; padding: 14px; border: 1px solid #e2e8f0;">
                        <div class="d-flex justify-between align-center mb-2">
                            <span class="font-bold" id="sysdam-in-ec-label">Estado de Conservação: Normal</span>
                            <span class="badge badge-success" id="sysdam-in-score-badge">Score: 0 pts</span>
                        </div>
                        <p class="text-secondary small" style="margin: 0;">Cálculo normativo automático segundo a Resolução ANM nº 95/2022.</p>
                    </div>

                    <div class="d-flex flex-column gap-2">
                        <button type="button" class="btn btn-primary w-100" onclick="switchTab('inspections'); closeSysdamCockpit();" style="padding: 12px; border-radius: 12px;">
                            <i class="fa-solid fa-camera"></i> Nova Ficha de Inspeção FIR
                        </button>
                        <button type="button" class="btn btn-secondary w-100" onclick="switchTab('inspections'); closeSysdamCockpit();" style="padding: 12px; border-radius: 12px;">
                            <i class="fa-solid fa-triangle-exclamation"></i> Registrar Anomalia com Foto
                        </button>
                    </div>
                </div>

            </div>

            <!-- Modal de Leitura Rápida Geotécnica -->
            <div id="sysdam-reading-modal" class="sysdam-reading-modal">
                <div class="sysdam-reading-box">
                    <div class="d-flex justify-between align-center">
                        <h3 id="sysdam-read-modal-title" style="margin:0; font-size: 16px; color: #0f172a;">Nova Leitura</h3>
                        <button type="button" class="btn-close" onclick="window.Sysdam.closeQuickReading()" style="background:none; border:none; font-size:18px; cursor:pointer;">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <input type="hidden" id="sysdam-read-instrument-id" value="">
                    
                    <div>
                        <label class="small font-bold text-secondary" style="display:block; margin-bottom:4px;">Valor Medido (m ou Cota NA)</label>
                        <input type="number" step="0.01" id="sysdam-read-value" class="form-control" placeholder="Ex: 824.50" style="width:100%; height:44px; border-radius:10px; border:1px solid #cbd5e1; padding:0 12px; font-size:16px;">
                    </div>

                    <div>
                        <label class="small font-bold text-secondary" style="display:block; margin-bottom:4px;">Observações de Campo</label>
                        <textarea id="sysdam-read-obs" class="form-control" rows="2" placeholder="Ex: Condição normal de operação..." style="width:100%; border-radius:10px; border:1px solid #cbd5e1; padding:8px 12px; font-size:14px;"></textarea>
                    </div>

                    <div class="d-flex gap-2 mt-2">
                        <button type="button" class="btn btn-secondary w-50" onclick="window.Sysdam.closeQuickReading()" style="padding:10px; border-radius:10px;">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary w-50" onclick="window.Sysdam.saveQuickReading()" style="padding:10px; border-radius:10px;">
                            Salvar Leitura
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </div>
'''
        needle = '<!-- Script Injection -->'
        if needle in content:
            content = content.replace(needle, overlay_html + '\n    ' + needle)
            print("[OK] Bloco sysdam-overlay inserido antes de Script Injection.")

    # 4. Adicionar script tag do sysdam-controller.js
    if 'src="src/core/sysdam-controller.js' not in content:
        script_needle = '<script src="src/core/geotech.js?v=robust-20260908"></script>'
        sysdam_script = '<script src="src/core/sysdam-controller.js?v=20260910"></script>'
        if script_needle in content:
            content = content.replace(script_needle, script_needle + '\n    ' + sysdam_script)
            print("[OK] Tag script sysdam-controller.js inserida no index.html.")

    index_path.write_text(content, encoding='utf-8')
    print("index.html atualizado com sucesso!")


def inject_app_js():
    app_path = Path('app.js')
    content = app_path.read_text(encoding='utf-8')

    if 'function openSysdamCockpit' not in content:
        helper_code = '''
// --- SYSDAM COCKPIT OPERATIONAL MOBILE CONTROLLER ---
function openSysdamCockpit(viewName) {
    const overlay = document.getElementById('sysdam-overlay');
    if (overlay) {
        overlay.classList.add('active');
        if (window.Sysdam) {
            window.Sysdam.switchView(viewName || 'modules');
        }
    }
}

function closeSysdamCockpit() {
    const overlay = document.getElementById('sysdam-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

window.openSysdamCockpit = openSysdamCockpit;
window.closeSysdamCockpit = closeSysdamCockpit;
'''
        content = content + '\n' + helper_code
        app_path.write_text(content, encoding='utf-8')
        print("[OK] Helpers openSysdamCockpit e closeSysdamCockpit adicionados ao app.js.")

if __name__ == '__main__':
    inject_index_html()
    inject_app_js()
