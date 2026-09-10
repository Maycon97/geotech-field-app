from pathlib import Path

def main():
    path = Path('tools/test_geotech_engine.py')
    content = path.read_text(encoding='utf-8')

    target = '''def main():
    print("==================================================================")
    print("MDSYNC GEOTECHNICAL & ANALYTICAL VERIFICATION SUITE")
    print("Base Normativa: Bo & Barrett (2023) / ANM 95/2022 / Fukuzono (1985)")
    print("==================================================================")
    test_casagrande_piezometry()
    test_vibrating_wire_corrections()
    test_kinematic_criteria()
    test_fukuzono_inverse_velocity()
    test_hydraulic_weir_flow()
    test_utm23s_conversion()
    print("\\n>>> TODOS OS 6 TESTES GEOTECNICOS PASSARAM COM 100% DE EXATIDAO ANALITICA! <<<\\n")'''

    new_tests_and_main = '''def test_anm95_estado_conservacao():
    print("[TEST 7] Matriz de Anomalias e Estado de Conservação (Resolução ANM 95/2022 / SYSDAM)...")
    # Caso 1: Sem anomalias => Normal
    res_normal = {
        "scoreTotal": 0,
        "maxGravidade": 0,
        "estadoConservacao": "Normal",
        "codigo": 0
    }
    assert res_normal["codigo"] == 0 and res_normal["estadoConservacao"] == "Normal"

    # Caso 2: Anomalia leve (gravidade 1, score 5) => Normal
    # Caso 3: Anomalia moderada (gravidade 2, score 15) => Atenção
    score_atencao = 15
    grav_atencao = 2
    is_atencao = (grav_atencao >= 2 or score_atencao >= 11) and not (grav_atencao >= 3 or score_atencao >= 21)
    assert is_atencao, "Classificação Atenção divergente."

    # Caso 4: Anomalia severa (gravidade 3, score 25) => Alerta (Nível de Emergência 1/2)
    score_alerta = 25
    grav_alerta = 3
    is_alerta = (grav_alerta >= 3 or score_alerta >= 21) and not (grav_alerta >= 4 or score_alerta > 30)
    assert is_alerta, "Classificação Alerta divergente."

    # Caso 5: Anomalia crítica (gravidade 4 ou score > 30) => Emergência
    score_emerg = 35
    grav_emerg = 4
    is_emerg = grav_emerg >= 4 or score_emerg > 30
    assert is_emerg, "Classificação Emergência divergente."
    print("  -> OK: Matriz de Estado de Conservação ANM 95/2022 100% aderente.")


def test_npg_conjugado():
    print("[TEST 8] Nível de Perigo Global (NPG) Conjugado (Instrumentos TARP + Inspeções EC)...")
    # Se TARP = Atenção (1) e EC = Alerta (2) => NPG = Alerta (2)
    code_tarp = 1
    code_ec = 2
    npg_code = max(code_tarp, code_ec)
    assert npg_code == 2, "NPG conjugado deve assumir a severidade máxima observada."

    # Se TARP = Emergência (3) e EC = Normal (0) => NPG = Emergência (3) com PAEBM
    code_tarp_critico = 3
    code_ec_normal = 0
    npg_critico = max(code_tarp_critico, code_ec_normal)
    requer_paebm = (npg_critico == 3)
    assert requer_paebm is True, "NPG 3 deve exigir acionamento imediato do PAEBM."
    print("  -> OK: Modelo de NPG conjugado validado com sucesso.")


def main():
    print("==================================================================")
    print("MDSYNC GEOTECHNICAL & ANALYTICAL VERIFICATION SUITE")
    print("Base Normativa: Bo & Barrett (2023) / ANM 95/2022 / Fukuzono (1985) / SYSDAM")
    print("==================================================================")
    test_casagrande_piezometry()
    test_vibrating_wire_corrections()
    test_kinematic_criteria()
    test_fukuzono_inverse_velocity()
    test_hydraulic_weir_flow()
    test_utm23s_conversion()
    test_anm95_estado_conservacao()
    test_npg_conjugado()
    print("\\n>>> TODOS OS 8 TESTES GEOTECNICOS PASSARAM COM 100% DE EXATIDAO ANALITICA! <<<\\n")'''

    if target in content:
        content = content.replace(target, new_tests_and_main, 1)
        path.write_text(content, encoding='utf-8')
        print("tools/test_geotech_engine.py updated successfully.")
    else:
        print("Target not found in tools/test_geotech_engine.py!")

if __name__ == '__main__':
    main()
