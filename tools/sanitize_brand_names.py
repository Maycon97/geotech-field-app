from pathlib import Path
import re

def sanitize_index_html():
    path = Path('index.html')
    content = path.read_text(encoding='utf-8')

    # 1. Corrigir menu lateral
    bad_nav_pattern = r'<a href="stitch/index\.html" class="nav-item" id="nav-stitch"[\s\S]*?<span>Telas Stitch</span>[\s\S]*?</a>\s*</a>'
    clean_nav = '''<a href="stitch/index.html" class="nav-item" id="nav-stitch" title="Central de Telas e Design System Stitch" style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 6px; padding-top: 10px;">
                    <i class="fa-solid fa-layer-group" style="color: #38bdf8;"></i>
                    <span>Telas Stitch</span>
                    <span class="badge" style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.4); font-size: 10px;">PRO</span>
                </a>
                <a href="#" class="nav-item" id="nav-sysdam" onclick="openSysdamCockpit('modules'); return false;" title="Abrir MDSync Cockpit Operacional Móvel" style="margin-top: 4px;">
                    <i class="fa-solid fa-mobile-screen-button" style="color: #a855f7;"></i>
                    <span>MDSync Móvel</span>
                    <span class="badge" style="background: rgba(168, 85, 247, 0.25); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.5); font-size: 10px;">HUB</span>
                </a>'''

    if re.search(bad_nav_pattern, content):
        content = re.sub(bad_nav_pattern, clean_nav, content)
        print("[OK] Menu lateral do index.html higienizado e corrigido.")

    # 2. Botão no header
    old_btn = '''<button class="btn btn-secondary btn-sysdam-toggle" onclick="openSysdamCockpit('modules')" title="Abrir Modo SYSDAM Cockpit Operacional Mobile" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(2, 132, 199, 0.25)); border: 1px solid rgba(168, 85, 247, 0.5); color: #c084fc; font-weight: 700;">
                        <i class="fa-solid fa-mobile-screen-button"></i> <span>SYSDAM</span>
                    </button>'''

    new_btn = '''<button class="btn btn-secondary btn-sysdam-toggle" onclick="openSysdamCockpit('modules')" title="Abrir MDSync Cockpit Operacional Móvel" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(2, 132, 199, 0.25)); border: 1px solid rgba(168, 85, 247, 0.5); color: #c084fc; font-weight: 700;">
                        <i class="fa-solid fa-mobile-screen-button"></i> <span>MDSync Móvel</span>
                    </button>'''

    content = content.replace(old_btn, new_btn)

    # 3. Textos do Overlay
    content = content.replace(
        'SYSDAM OPERATIONAL COCKPIT & MOBILE OVERLAY (BENCHMARK PIMENTA DE ÁVILA)',
        'MDSYNC MOBILE COCKPIT & OPERATIONAL HUB (DUAL PROJECTS)'
    )
    content = content.replace(
        'aria-label="Fechar SYSDAM" title="Fechar e voltar ao MDSync"',
        'aria-label="Fechar Cockpit MDSync" title="Fechar e voltar à visão principal"'
    )
    content = content.replace(
        '<span>sysdam<span class="prism">.</span></span>',
        '<span>MDSync<span class="prism">.</span></span>'
    )
    content = content.replace(
        '<p>SYSDAM Mobile Hub • Pimenta de Ávila</p>',
        '<p>MDSync Mobile Hub • Centralizador Geotécnico</p>'
    )
    content = content.replace(
        '<p class="small text-muted">Sincronizado bilateralmente com o MDSync</p>',
        '<p class="small text-muted">Operação de Campo 100% Desconectada e Sincronizada</p>'
    )

    path.write_text(content, encoding='utf-8')
    print("index.html atualizado com marca exclusiva MDSync.")


def sanitize_stitch_screen():
    path = Path('stitch/screens/11-sysdam-mobile-hub.html')
    if not path.exists():
        return
    content = path.read_text(encoding='utf-8')

    content = content.replace(
        '<title>HUB Stitch - SYSDAM Mobile Hub &amp; Cockpit Operacional</title>',
        '<title>HUB Stitch - MDSync Mobile Hub &amp; Cockpit Operacional</title>'
    )
    content = content.replace(
        'TELA 11 • SYSDAM',
        'TELA 11 • MDSYNC COCKPIT'
    )
    content = content.replace(
        '<h1 class="text-base font-head font-bold text-white">SYSDAM Mobile Hub &amp; Cockpit Operacional</h1>',
        '<h1 class="text-base font-head font-bold text-white">MDSync Mobile Hub &amp; Cockpit Operacional</h1>'
    )
    content = content.replace(
        '<h2 class="font-head text-base font-bold text-white">Cockpit Operacional SYSDAM</h2>',
        '<h2 class="font-head text-base font-bold text-white">Cockpit Operacional MDSync</h2>'
    )
    content = content.replace(
        'Replicação funcional de alta fidelidade baseada nas referências do software SYSDAM (Pimenta de Ávila Consultoria). Integração dos 3 módulos centrais de segurança de barragens e pilhas:',
        'Cockpit Operacional Móvel do MDSync de alta fidelidade para campo. Integração dos 3 módulos essenciais de segurança de barragens e pilhas:'
    )
    content = content.replace(
        '<span>sysdam<span class="prism">.</span></span>',
        '<span>MDSync<span class="prism">.</span></span>'
    )
    content = content.replace(
        '<p>SYSDAM Mobile Hub • Pimenta de Ávila</p>',
        '<p>MDSync Mobile Hub • Centralizador Geotécnico</p>'
    )
    content = content.replace(
        '<p class="text-[10px] text-white/60">Sincronizado bilateralmente com o MDSync</p>',
        '<p class="text-[10px] text-white/60">Operação de Campo 100% Desconectada e Sincronizada</p>'
    )

    path.write_text(content, encoding='utf-8')
    print("stitch/screens/11-sysdam-mobile-hub.html atualizado com marca exclusiva MDSync.")


def sanitize_stitch_index():
    path = Path('stitch/index.html')
    content = path.read_text(encoding='utf-8')

    content = content.replace(
        'title: "SYSDAM Mobile Hub & Cockpit",',
        'title: "MDSync Mobile Hub & Cockpit",'
    )
    content = content.replace(
        'badge: "SYSDAM 3x4"',
        'badge: "MDSync 3x4"'
    )

    path.write_text(content, encoding='utf-8')
    print("stitch/index.html atualizado com marca exclusiva MDSync.")


def sanitize_js_controller():
    path = Path('src/core/sysdam-controller.js')
    content = path.read_text(encoding='utf-8')

    content = content.replace(
        'MDSync - SYSDAM Unified Controller\n * Controlador da interface e fluxos inspirados no SYSDAM (Pimenta de Ávila Consultoria)',
        'MDSync - Mobile Cockpit Unified Controller\n * Controlador da interface e fluxos do Cockpit Operacional Móvel do MDSync'
    )

    path.write_text(content, encoding='utf-8')
    print("src/core/sysdam-controller.js atualizado com marca exclusiva MDSync.")


if __name__ == '__main__':
    sanitize_index_html()
    sanitize_stitch_screen()
    sanitize_stitch_index()
    sanitize_js_controller()
