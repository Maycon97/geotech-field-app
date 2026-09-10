from pathlib import Path

def main():
    path = Path('styles.css')
    content = path.read_text(encoding='utf-8')

    sysdam_css = '''
/* ==========================================================================
   SYSDAM INTEGRATED OPERATIONAL COCKPIT & MOBILE UI (BENCHMARK PIMENTA DE ÁVILA)
   ========================================================================== */

/* Container de Sobreposição Full-Screen do Modo SYSDAM */
.sysdam-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: #000000;
    display: none;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.sysdam-overlay.active {
    display: flex;
}

/* Moldura do Dispositivo Móvel (Estilo iPhone Pro) */
.sysdam-device-frame {
    width: 100%;
    max-width: 430px;
    height: 100%;
    max-height: 932px;
    background: #f8fafc;
    color: #0f172a;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    overflow: hidden;
}

@media (min-width: 640px) {
    .sysdam-device-frame {
        border-radius: 44px;
        border: 12px solid #1e293b;
        height: 92vh;
    }
}

/* Barra de Status do Sistema Operacional */
.sysdam-status-bar {
    height: 48px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 700;
    z-index: 50;
    background: transparent;
    user-select: none;
}

.sysdam-status-bar.dark-text {
    color: #0f172a;
}

.sysdam-status-bar.white-text {
    color: #ffffff;
}

.sysdam-status-icons {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
}

/* Botão Fechar Modo SYSDAM */
.sysdam-close-btn {
    position: absolute;
    top: 52px;
    right: 18px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.6);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    z-index: 60;
    backdrop-filter: blur(8px);
    transition: all 0.2s;
}

.sysdam-close-btn:hover {
    background: rgba(15, 23, 42, 0.9);
    transform: scale(1.05);
}

/* Área de Conteúdo das Views do SYSDAM */
.sysdam-content-area {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    position: relative;
}

.sysdam-view {
    display: none;
    flex-direction: column;
    flex: 1;
    width: 100%;
}

.sysdam-view.active {
    display: flex;
}

/* VIEW 0: SPLASH / LOGIN (Imagem 2) */
.sysdam-splash-view {
    background: #0047ab;
    color: #ffffff;
    align-items: center;
    justify-content: space-between;
    padding: 40px 24px 24px;
    text-align: center;
}

.sysdam-brand-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 38px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #38bdf8;
    margin-top: auto;
    margin-bottom: 40px;
}

.sysdam-brand-logo span.prism {
    color: #60a5fa;
    position: relative;
}

.sysdam-login-box {
    width: 100%;
    margin-top: auto;
    margin-bottom: auto;
}

.sysdam-login-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 20px;
    color: #ffffff;
}

.sysdam-login-btn {
    width: 100%;
    height: 52px;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    font-size: 15px;
    font-weight: 700;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 14px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.15s, background-color 0.15s;
}

.sysdam-login-btn:hover {
    background: #f1f5f9;
    transform: translateY(-2px);
}

.sysdam-splash-footer {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-top: auto;
}

/* VIEW 1: SELETOR DE MÓDULOS (Imagem 3) */
.sysdam-modules-view {
    background: #f1f5f9;
    padding: 16px 20px;
}

.sysdam-modules-header {
    text-align: center;
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 16px;
}

.sysdam-user-access-bar {
    background: #ffffff;
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    margin-bottom: 20px;
    border: 1px solid #e2e8f0;
}

.sysdam-user-access-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.sysdam-user-icon {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #e0f2fe;
    color: #0284c7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.sysdam-user-texts strong {
    font-size: 14px;
    color: #0f172a;
    display: block;
}

.sysdam-user-texts span {
    font-size: 11px;
    color: #64748b;
}

.sysdam-sync-circle-btn {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #10b981;
    color: #ffffff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

/* Cards Grandes dos Três Módulos */
.sysdam-module-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 20px 18px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.sysdam-module-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.sysdam-badge-square {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 900;
    color: #ffffff;
    flex-shrink: 0;
}

.sysdam-badge-square.badge-al {
    background: #f59e0b; /* Alert Cadastrador */
}

.sysdam-badge-square.badge-in {
    background: #10b981; /* Inspeção */
}

.sysdam-badge-square.badge-mi {
    background: #8b5cf6; /* Monitoramento */
}

.sysdam-module-card strong {
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
}

/* VIEW 2: COCKPIT DE MONITORAMENTO GRID 3x4 (Imagem 4) */
.sysdam-grid-view {
    background: #f1f5f9;
    padding: 14px 16px;
}

.sysdam-grid-top-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
}

.sysdam-top-banner-card {
    background: #ffffff;
    border-radius: 14px;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    cursor: pointer;
}

.sysdam-top-banner-card.purple-badge {
    background: #8b5cf6;
    color: #ffffff;
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 1px;
}

.sysdam-top-banner-card i {
    font-size: 20px;
    color: #0369a1;
    margin-bottom: 4px;
}

.sysdam-top-banner-card span {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Grid de Ações 3x4 */
.sysdam-cockpit-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 12px;
}

.sysdam-grid-action-card {
    background: #ffffff;
    border-radius: 14px;
    aspect-ratio: 1 / 1;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: center;
}

.sysdam-grid-action-card:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-2px);
}

.sysdam-grid-action-card.card-muted {
    background: #e2e8f0;
}

.sysdam-grid-action-card i {
    font-size: 22px;
    color: #0284c7;
}

.sysdam-grid-action-card span {
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
}

/* Mini Mapa no Grid */
.sysdam-mini-map-card {
    background: #ffffff;
    border-radius: 14px;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0;
    cursor: pointer;
}

.sysdam-mini-map-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.sysdam-mini-map-pin {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #0f172a;
    color: #ffffff;
    border: 2px solid #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
}

/* VIEW 3: MAPA INTERATIVO & BOTTOM SHEET (Imagem 5) */
.sysdam-map-view {
    position: relative;
    flex: 1;
    background: #050d23;
}

.sysdam-map-canvas {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    z-index: 1;
}

/* Barra Superior Flutuante sobre o Mapa */
.sysdam-map-floating-top {
    position: absolute;
    top: 48px;
    left: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    z-index: 20;
}

.sysdam-map-icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #0284c7;
    color: #ffffff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sysdam-map-struct-pill {
    flex: 1;
    height: 40px;
    border-radius: 12px;
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Botões Flutuantes na Lateral Direita */
.sysdam-map-side-actions {
    position: absolute;
    right: 14px;
    bottom: 210px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 25;
}

.sysdam-side-action-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #ffffff;
    color: #0f172a;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    cursor: pointer;
    transition: transform 0.15s;
}

.sysdam-side-action-btn.btn-blue {
    background: #0284c7;
    color: #ffffff;
}

.sysdam-side-action-btn:hover {
    transform: scale(1.08);
}

/* Marcadores Circulares Geotécnicos no Mapa */
.sysdam-circle-marker {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--marker-color, #10b981);
    box-shadow: 0 0 0 4px var(--ring-color, rgba(16, 185, 129, 0.4)), 0 4px 12px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 13px;
    cursor: pointer;
    transition: transform 0.2s;
}

.sysdam-circle-marker:hover {
    transform: scale(1.18);
}

.sysdam-building-marker {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #0f172a;
    color: #ffffff;
    border: 2px solid #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
}

/* Bottom Sheet Deslizante Inferior (Imagem 5) */
.sysdam-bottom-sheet {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #ffffff;
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.35);
    z-index: 30;
    padding: 10px 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    max-height: 200px;
}

.sysdam-bottom-sheet.expanded {
    max-height: 480px;
}

.sysdam-sheet-drag-handle {
    width: 44px;
    height: 5px;
    border-radius: 3px;
    background: #cbd5e1;
    margin: 0 auto;
    cursor: grab;
}

.sysdam-sheet-search-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 6px 12px;
}

.sysdam-sheet-search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    color: #0f172a;
    outline: none;
}

.sysdam-sheet-search-input::placeholder {
    color: #94a3b8;
}

.sysdam-counter-badge {
    background: #10b981;
    color: #ffffff;
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 10px;
    font-family: var(--font-mono, monospace);
}

.sysdam-sort-btn {
    background: transparent;
    border: none;
    color: #64748b;
    font-size: 15px;
    cursor: pointer;
    padding: 2px 4px;
}

/* Carrossel Horizontal de Cards de Instrumentos */
.sysdam-carousel-container {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 4px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}

.sysdam-carousel-container::-webkit-scrollbar {
    display: none;
}

.sysdam-instrument-card {
    min-width: 110px;
    width: 110px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    cursor: pointer;
    scroll-snap-align: start;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    transition: transform 0.15s, border-color 0.15s;
    flex-shrink: 0;
}

.sysdam-instrument-card:hover,
.sysdam-instrument-card.active {
    border-color: #0284c7;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.2);
}

.sysdam-card-badge-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10px;
}

.sysdam-clock-badge {
    color: #f59e0b;
    font-size: 12px;
}

.sysdam-distance-badge {
    background: #10b981;
    color: #ffffff;
    border-radius: 4px;
    padding: 1px 4px;
    font-weight: 700;
    font-family: var(--font-mono, monospace);
}

.sysdam-card-thumb {
    width: 100%;
    height: 52px;
    border-radius: 8px;
    background: #e0f2fe;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0284c7;
    font-size: 18px;
}

.sysdam-card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
}

.sysdam-card-title-row strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #0f172a;
}

/* Modal Rápido de Nova Leitura no SYSDAM */
.sysdam-reading-modal {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(4px);
    z-index: 70;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.sysdam-reading-modal.active {
    display: flex;
}

.sysdam-reading-box {
    background: #ffffff;
    border-radius: 20px;
    padding: 22px;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* Cards do Módulo Alert Cadastrador */
.sysdam-al-item-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 10px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.sysdam-al-item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}
'''

    content = content + '\n' + sysdam_css
    path.write_text(content, encoding='utf-8')
    print("styles.css successfully updated with SYSDAM UI styles.")

if __name__ == '__main__':
    main()
