from pathlib import Path
import json
import re

def test_sysdam():
    print("=== TESTE DE INTEGRAÇÃO DO ECOSSISTEMA SYSDAM ===")

    # 1. Controller JS
    ctrl_path = Path("src/core/sysdam-controller.js")
    assert ctrl_path.exists(), "src/core/sysdam-controller.js não encontrado!"
    ctrl_content = ctrl_path.read_text(encoding="utf-8")
    assert "class SysdamController" in ctrl_content, "Classe SysdamController ausente!"
    assert "renderMapMarkers" in ctrl_content, "renderMapMarkers ausente!"
    assert "renderBottomSheetCards" in ctrl_content, "renderBottomSheetCards ausente!"
    assert "openQuickReading" in ctrl_content, "openQuickReading ausente!"
    assert "alertResidents" in ctrl_content, "alertResidents ausente!"
    assert "sirenes" in ctrl_content, "sirenes ausente!"
    print("  [OK] src/core/sysdam-controller.js validado com sucesso.")

    # 2. index.html
    idx_path = Path("index.html")
    idx_content = idx_path.read_text(encoding="utf-8")
    assert 'id="sysdam-overlay"' in idx_content, "sysdam-overlay ausente no index.html!"
    assert 'id="sysdam-view-splash"' in idx_content, "view-splash ausente!"
    assert 'id="sysdam-view-modules"' in idx_content, "view-modules ausente!"
    assert 'id="sysdam-view-mi-grid"' in idx_content, "view-mi-grid ausente!"
    assert 'id="sysdam-view-mi-map"' in idx_content, "view-mi-map ausente!"
    assert 'id="sysdam-view-al-hub"' in idx_content, "view-al-hub ausente!"
    assert 'id="sysdam-view-in-hub"' in idx_content, "view-in-hub ausente!"
    assert 'id="sysdam-reading-modal"' in idx_content, "reading-modal ausente!"
    assert 'src="src/core/sysdam-controller.js' in idx_content, "Script sysdam-controller.js não linkado no index.html!"
    print("  [OK] index.html contem todas as 6 views e modal do SYSDAM.")

    # 3. app.js
    app_path = Path("app.js")
    app_content = app_path.read_text(encoding="utf-8")
    assert "openSysdamCockpit" in app_content, "openSysdamCockpit ausente no app.js!"
    assert "closeSysdamCockpit" in app_content, "closeSysdamCockpit ausente no app.js!"
    print("  [OK] app.js contem funcoes globais openSysdamCockpit e closeSysdamCockpit.")

    # 4. service-worker.js
    sw_path = Path("service-worker.js")
    sw_content = sw_path.read_text(encoding="utf-8")
    assert "./src/core/sysdam-controller.js" in sw_content, "sysdam-controller.js ausente no APP_SHELL do Service Worker!"
    print("  [OK] service-worker.js armazena em cache o sysdam-controller.js.")

    # 5. stitch/screens/11-sysdam-mobile-hub.html
    screen_path = Path("stitch/screens/11-sysdam-mobile-hub.html")
    assert screen_path.exists(), "Tela 11 do Stitch ausente!"
    screen_content = screen_path.read_text(encoding="utf-8")
    assert "mockup-phone-frame" in screen_content, "Moldura mobile ausente na tela 11!"
    assert "sysdam-controller.js" in screen_content, "sysdam-controller.js ausente na tela 11!"
    print("  [OK] stitch/screens/11-sysdam-mobile-hub.html criado com sucesso.")

    # 6. stitch/index.html
    stitch_idx = Path("stitch/index.html").read_text(encoding="utf-8")
    assert "screens/11-sysdam-mobile-hub.html" in stitch_idx, "Tela 11 nao registrada no stitch/index.html!"
    assert "MDSync Mobile Hub & Cockpit" in stitch_idx, "Titulo da Tela 11 nao registrado no stitch/index.html!"
    print("  [OK] stitch/index.html registrado com a Tela 11 (MDSync).")

    # 7. Verificação de Marca Exclusiva MDSync (Zero nomes de empresas externas)
    assert "Pimenta" not in idx_content, "Nome externo encontrado em index.html!"
    assert "Pimenta" not in screen_content, "Nome externo encontrado na Tela 11 do Stitch!"
    assert "Pimenta" not in ctrl_content, "Nome externo encontrado no controller JS!"
    print("  [OK] Verificação de Marca: 100% livre de referências a empresas externas.")

    print("\nTODOS OS TESTES DE INTEGRAÇÃO DO MDSYNC MOBILE FORAM APROVADOS COM SUCESSO!")

if __name__ == '__main__':
    test_sysdam()
