from pathlib import Path

def main():
    path = Path('src/core/geotech.js')
    content = path.read_text(encoding='utf-8')

    target = '''        return {
            level: "Normal",
            severity: "normal",
            code: 0,
            guidance: "Operacao normal em conformidade com os limites de projeto."
        };
    }
};'''

    new_methods = '''        return {
            level: "Normal",
            severity: "normal",
            code: 0,
            guidance: "Operacao normal em conformidade com os limites de projeto."
        };
    },

    /**
     * 7. ESTADO DE CONSERVAÇÃO E MATRIZ DE ANOMALIAS (Resolução ANM nº 95/2022 / Benchmark SYSDAM)
     * Avalia a pontuação acumulada e a severidade máxima das anomalias registradas em campo (FIR/ISR)
     * @param {Array<Object>} anomalias - Lista de anomalias [{ gravidade: 1..4, pontuacao: number, descricao: string }]
     * @returns {Object} { scoreTotal, maxGravidade, estadoConservacao, nivelPerigo, codigo, orientacao, acaoRecomendada }
     */
    calculateEstadoConservacao(anomalias = []) {
        if (!Array.isArray(anomalias) || anomalias.length === 0) {
            return {
                scoreTotal: 0,
                maxGravidade: 0,
                estadoConservacao: "Normal",
                nivelPerigo: "Sem Perigo Iminente",
                codigo: 0,
                orientacao: "Estrutura sem anomalias registradas ou pontuação zerada.",
                acaoRecomendada: "Manter frequência rotineira de inspeções visuais regulares."
            };
        }

        let scoreTotal = 0;
        let maxGravidade = 0;

        for (const a of anomalias) {
            const grav = Number(a.gravidade ?? a.severityCode ?? 1);
            const pts = Number(a.pontuacao ?? a.score ?? (grav * 2.5));
            scoreTotal += Number.isFinite(pts) ? pts : 0;
            if (grav > maxGravidade) maxGravidade = grav;
        }

        // Matriz normativa Resolução ANM nº 95/2022 e Portaria DNPM 70.389/2017:
        // Gravidade 4 ou Score > 30 => Emergência (Ruptura iminente ou em curso)
        // Gravidade 3 ou Score entre 21 e 30 => Alerta
        // Gravidade 2 ou Score entre 11 e 20 => Atenção
        // Score <= 10 e Gravidade <= 1 => Normal
        if (maxGravidade >= 4 || scoreTotal > 30) {
            return {
                scoreTotal,
                maxGravidade,
                estadoConservacao: "Emergência",
                nivelPerigo: "Nível 3 (Emergência / Ruptura Iminente)",
                codigo: 3,
                orientacao: "Acionamento imediato do PAEBM e alerta à Defesa Civil e ANM (Res. 95/2022).",
                acaoRecomendada: "Evacuação imediata da ZAS (Zona de Autossalvamento) e paralisação de todas as atividades."
            };
        }

        if (maxGravidade >= 3 || scoreTotal >= 21) {
            return {
                scoreTotal,
                maxGravidade,
                estadoConservacao: "Alerta",
                nivelPerigo: "Nível 2 (Anomalia não controlada com potencial de evolução)",
                codigo: 2,
                orientacao: "Anomalia severa não controlada. Acionar equipe de engenharia e consultoria especializada.",
                acaoRecomendada: "Intervenção técnica prioritária nas próximas 24 horas e vistorias diárias."
            };
        }

        if (maxGravidade >= 2 || scoreTotal >= 11) {
            return {
                scoreTotal,
                maxGravidade,
                estadoConservacao: "Atenção",
                nivelPerigo: "Nível 1 (Anomalia que compromete a segurança caso não tratada)",
                codigo: 1,
                orientacao: "Anomalia moderada ou estável com necessidade de monitoramento preventivo.",
                acaoRecomendada: "Dobrar frequência de inspeções visuais e elaborar plano de ação corretivo."
            };
        }

        return {
            scoreTotal,
            maxGravidade,
            estadoConservacao: "Normal",
            nivelPerigo: "Sem Perigo Iminente",
            codigo: 0,
            orientacao: "Pequenas não-conformidades de manutenção rotineira.",
            acaoRecomendada: "Correções operacionais de rotina conforme cronograma."
        };
    },

    /**
     * 8. NÍVEL DE PERIGO GLOBAL (NPG) CONJUGADO (ANM 95/2022 / Bo & Barrett 2023 / Benchmark SYSDAM)
     * Pondera conjuntamente os instrumentos de campo (TARP) e as inspeções visuais (EC)
     * @param {Object} tarpResult - Resultado da avaliação TARP { code, level }
     * @param {Object} ecResult - Resultado da avaliação de Estado de Conservação { codigo, estadoConservacao }
     * @returns {Object} { nivelGlobal, codigoMax, statusCor, requerPAEBM, origemGatilho }
     */
    calculateNPG(tarpResult = {}, ecResult = {}) {
        const codeTARP = Number(tarpResult.code ?? 0);
        const codeEC = Number(ecResult.codigo ?? 0);
        const codigoMax = Math.max(codeTARP, codeEC);

        const mapaStatus = {
            3: { nivelGlobal: "Emergência", statusCor: "#dc2626", requerPAEBM: true, badgeClass: "status-danger" },
            2: { nivelGlobal: "Alerta", statusCor: "#ea580c", requerPAEBM: false, badgeClass: "status-alert" },
            1: { nivelGlobal: "Atenção", statusCor: "#eab308", requerPAEBM: false, badgeClass: "status-warning" },
            0: { nivelGlobal: "Normal", statusCor: "#16a34a", requerPAEBM: false, badgeClass: "status-success" }
        };

        const config = mapaStatus[codigoMax] || mapaStatus[0];
        let origem = "Convergência de Instrumentos e Inspeções";
        if (codeTARP > codeEC) origem = "Instrumentação Geotécnica (TARP)";
        else if (codeEC > codeTARP) origem = "Inspeção Visual (Estado de Conservação)";

        return {
            ...config,
            codigoMax,
            origemGatilho: origem,
            detalheTARP: tarpResult.level || "Normal",
            detalheEC: ecResult.estadoConservacao || "Normal"
        };
    }
};'''

    if target in content:
        content = content.replace(target, new_methods, 1)
        path.write_text(content, encoding='utf-8')
        print("src/core/geotech.js updated successfully with ANM 95 / SYSDAM methods.")
    else:
        print("Target not found in src/core/geotech.js!")

if __name__ == '__main__':
    main()
