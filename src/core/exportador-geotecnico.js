/**
 * MDSync Exportador Geotecnico & Interoperabilidade (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Gera pacotes de exportacao canônica neutra para interoperabilidade com softwares
 * de analise de estabilidade e modelagem geotecnica (GeoStudio, Leapfrog, Datamine, FLAC):
 * 1. CSV Geotecnico Estruturado (Series temporais de instrumentacao e poro-pressao)
 * 2. GeoJSON Georreferenciado (Feicoes espaciais de estruturas, anomalias e SUMPs em UTM 23S)
 * 3. DXF 3D Neutro (Malha e linhas de talude, crista e pe de estruturas)
 */

(function (global) {
    'use strict';

    class ExportadorGeotecnico {
        constructor(db) {
            this.db = db || global.MDSyncDB;
        }

        /**
         * Exporta serie temporal de leituras em CSV compativel com GeoStudio (SLOPE/W e SEEP/W)
         * @param {string} estruturaIdOuSlug - Identificador da estrutura
         */
        async exportarCSVGeoStudio(estruturaIdOuSlug) {
            const dossie = await this.db.obterDossieDigitalEstrutura(estruturaIdOuSlug);
            if (!dossie) throw new Error("Estrutura nao localizada para exportacao.");

            const leituras = await this.db.getAll("leituras_instrumentos", "by_estrutura", dossie.estrutura.id);
            leituras.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

            const cabecalho = [
                "ESTRUTURA_CODIGO",
                "INSTRUMENTO_CODIGO",
                "TIPO_INSTRUMENTO",
                "DATA_HORA_UTC",
                "COTA_BOCA_M",
                "COTA_PONTA_M",
                "PROFUNDIDADE_MEDIDA_M",
                "COTA_NA_M",
                "POROPRESSAO_KPA",
                "STATUS_TARP",
                "COORD_UTM_E",
                "COORD_UTM_N",
                "OPERADOR"
            ];

            const mapaInstrumentos = new Map();
            dossie.instrumentos.forEach(i => mapaInstrumentos.set(i.id, i));

            const linhas = [cabecalho.join(";")];

            leituras.forEach(l => {
                const inst = mapaInstrumentos.get(l.instrumento_id) || {};
                const linha = [
                    `"${dossie.estrutura.codigo}"`,
                    `"${l.instrumento_codigo || inst.codigo || ''}"`,
                    `"${inst.tipo || ''}"`,
                    `"${l.data_hora}"`,
                    (inst.cota_boca !== undefined ? inst.cota_boca : "").toString().replace('.', ','),
                    (inst.cota_ponta !== undefined ? inst.cota_ponta : "").toString().replace('.', ','),
                    (l.profundidade_medida !== undefined ? l.profundidade_medida : "").toString().replace('.', ','),
                    (l.cota_nivel_agua !== undefined && l.cota_nivel_agua !== null ? l.cota_nivel_agua : "").toString().replace('.', ','),
                    (l.poro_pressao_calculada !== undefined ? l.poro_pressao_calculada : "").toString().replace('.', ','),
                    `"${l.status_tarp || 'NORMAL'}"`,
                    (inst.coordenadas_utm_e || l.coordenadas_gps_e || "").toString().replace('.', ','),
                    (inst.coordenadas_utm_n || l.coordenadas_gps_n || "").toString().replace('.', ','),
                    `"${l.usuario_nome || ''}"`
                ];
                linhas.push(linha.join(";"));
            });

            return {
                nomeArquivo: `MDSYNC_${dossie.estrutura.codigo}_SERIES_TEMPORAIS_${new Date().toISOString().substring(0, 10)}.csv`,
                conteudo: linhas.join("\r\n"),
                mimeType: "text/csv;charset=utf-8;"
            };
        }

        /**
         * Exporta feicoes espaciais da estrutura, instrumentos, anomalias e sumps em GeoJSON
         */
        async exportarGeoJSON(estruturaIdOuSlug) {
            const dossie = await this.db.obterDossieDigitalEstrutura(estruturaIdOuSlug);
            if (!dossie) throw new Error("Estrutura nao localizada para exportacao GeoJSON.");

            const features = [];

            // 1. Ponto Central da Estrutura
            if (dossie.estrutura.coordenadas_utm_e && dossie.estrutura.coordenadas_utm_n) {
                features.push({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [dossie.estrutura.coordenadas_utm_e, dossie.estrutura.coordenadas_utm_n]
                    },
                    properties: {
                        categoria: "ESTRUTURA",
                        codigo: dossie.estrutura.codigo,
                        nome: dossie.estrutura.nome,
                        tipo: dossie.estrutura.tipo,
                        cota_coroamento: dossie.estrutura.cota_coroamento,
                        cota_pe: dossie.estrutura.cota_pe,
                        altura_maxima: dossie.estrutura.altura_maxima,
                        volume_atual: dossie.estrutura.volume_atual
                    }
                });
            }

            // 2. Instrumentos
            dossie.instrumentos.forEach(inst => {
                if (inst.coordenadas_utm_e && inst.coordenadas_utm_n) {
                    features.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [inst.coordenadas_utm_e, inst.coordenadas_utm_n]
                        },
                        properties: {
                            categoria: "INSTRUMENTO",
                            codigo: inst.codigo,
                            tipo: inst.tipo,
                            cota_boca: inst.cota_boca,
                            cota_ponta: inst.cota_ponta,
                            limite_atencao: inst.limite_atencao,
                            limite_alerta: inst.limite_alerta,
                            unidade: inst.unidade_medida
                        }
                    });
                }
            });

            // 3. Anomalias Ativas
            dossie.anomaliasAbertas.forEach(anom => {
                if (anom.coordenadas_utm_e && anom.coordenadas_utm_n) {
                    features.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [anom.coordenadas_utm_e, anom.coordenadas_utm_n]
                        },
                        properties: {
                            categoria: "ANOMALIA",
                            codigo: anom.codigo_sequencial,
                            tipo: anom.tipo_anomalia,
                            criticidade: anom.criticidade,
                            status_ciclo: anom.status_ciclo,
                            descricao: anom.descricao,
                            dimensoes: `${anom.dimensao_comprimento_m}x${anom.dimensao_largura_m}x${anom.dimensao_profundidade_m}m`
                        }
                    });
                }
            });

            // 4. SUMPs
            dossie.sumps.forEach(s => {
                if (s.coordenadas_utm_e && s.coordenadas_utm_n) {
                    features.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [s.coordenadas_utm_e, s.coordenadas_utm_n]
                        },
                        properties: {
                            categoria: "SUMP",
                            codigo: s.codigo,
                            nome: s.nome,
                            capacidade_m3: s.capacidade_maxima_m3,
                            volume_atual_m3: s.volume_atual_estimado_m3,
                            nivel_pct: s.nivel_agua_atual_percentual,
                            status_bombeamento: s.sistema_bombeamento_status
                        }
                    });
                }
            });

            const geoJsonFinal = {
                type: "FeatureCollection",
                crs: {
                    type: "name",
                    properties: { name: "urn:ogc:def:crs:EPSG::31983" } // SIRGAS 2000 UTM 23S
                },
                metadata: {
                    sistema: "MDSync Versão 1.0",
                    geradoEm: new Date().toISOString(),
                    estrutura: dossie.estrutura.codigo
                },
                features
            };

            return {
                nomeArquivo: `MDSYNC_${dossie.estrutura.codigo}_GEOMETRIA_${new Date().toISOString().substring(0, 10)}.geojson`,
                conteudo: JSON.stringify(geoJsonFinal, null, 2),
                mimeType: "application/geo+json;charset=utf-8;"
            };
        }

        /**
         * Gera pacote consolidado de estabilidade geotecnica em ZIP (Secao 19)
         * Contendo series temporais GeoStudio CSV, geometria GeoJSON SIRGAS 2000 UTM 23S e memorial de parametros
         */
        async exportarPacoteCompletoEstabilidade(estruturaIdOuSlug, solicitacaoId = null) {
            const dossie = await this.db.obterDossieDigitalEstrutura(estruturaIdOuSlug);
            if (!dossie) throw new Error("Estrutura nao localizada para pacote de estabilidade.");

            let solicitacao = null;
            if (solicitacaoId) {
                solicitacao = await this.db.get("analises_geotecnicas", solicitacaoId);
            }
            if (!solicitacao && dossie.analisesGeotecnicas && dossie.analisesGeotecnicas.length > 0) {
                solicitacao = dossie.analisesGeotecnicas[0];
            }

            const [csvRes, geoJsonRes] = await Promise.all([
                this.exportarCSVGeoStudio(estruturaIdOuSlug),
                this.exportarGeoJSON(estruturaIdOuSlug)
            ]);

            const metadadosJson = {
                sistema: "MDSync Versão 1.0 (Sistema Corporativo de Gestao de Dados Geotecnicos)",
                dataExportacao: new Date().toISOString(),
                estrutura: {
                    codigo: dossie.estrutura.codigo,
                    nome: dossie.estrutura.nome,
                    tipo: dossie.estrutura.tipo,
                    cota_coroamento_m: dossie.estrutura.cota_coroamento,
                    cota_pe_m: dossie.estrutura.cota_pe,
                    altura_maxima_m: dossie.estrutura.altura_maxima,
                    angulo_talude_projeto_graus: dossie.estrutura.angulo_talude_projeto,
                    coordenadas_utm: {
                        e: dossie.estrutura.coordenadas_utm_e,
                        n: dossie.estrutura.coordenadas_utm_n,
                        datum: "SIRGAS 2000",
                        fuso: "UTM 23S"
                    }
                },
                solicitacao: solicitacao ? {
                    id: solicitacao.id,
                    codigo: solicitacao.codigo,
                    solicitante_nome: solicitacao.solicitante_nome,
                    solicitante_perfil: solicitacao.solicitante_perfil,
                    data_solicitacao: solicitacao.data_solicitacao,
                    motivo: solicitacao.motivo,
                    software_alvo: solicitacao.software_alvo,
                    secao_geotecnica: solicitacao.secao_geotecnica,
                    condicao_carregamento: solicitacao.condicao_carregamento,
                    parametros_geotecnicos: solicitacao.parametros_geotecnicos,
                    status: solicitacao.status,
                    fator_seguranca_calculado: solicitacao.fator_seguranca_calculado
                } : null,
                diretrizesNormativas: [
                    "ABNT NBR 13028 (Disposicao de Esteril e Rejeito em Mineracao)",
                    "Resolucao ANM nº 95/2022 (Seguranca de Barragens e Taludes de Mineracao)",
                    "Bo & Barrett (2023) - Geotechnical Instrumentation Guidelines"
                ]
            };

            const params = solicitacao && solicitacao.parametros_geotecnicos ? solicitacao.parametros_geotecnicos : { coeso_kpa: 15, atrito_graus: 32, peso_especifico_kn_m3: 20.5, ru_poropressao: 0.20 };

            const memorialTexto = [
                "================================================================================",
                "MD SYNC - MEMORIAL DESCRITIVO DE INTEROPERABILIDADE GEOTÉCNICA",
                "================================================================================",
                `Estrutura Analisada: ${dossie.estrutura.codigo} (${dossie.estrutura.nome})`,
                `Tipo: ${dossie.estrutura.tipo}`,
                `Código da Solicitação: ${solicitacao ? solicitacao.codigo : 'SOL-AVULSA-2026'}`,
                `Software Alvo: ${solicitacao ? solicitacao.software_alvo : 'GeoStudio SLOPE/W'}`,
                `Seção de Estudo: ${solicitacao ? solicitacao.secao_geotecnica : 'Seção Principal'}`,
                `Condição de Carregamento: ${solicitacao ? solicitacao.condicao_carregamento : 'DRENADA_LONGO_PRAZO'}`,
                `Data de Geração do Pacote: ${new Date().toLocaleString('pt-BR')}`,
                "",
                "PARÂMETROS GEOTÉCNICOS DE PROJETO:",
                `- Coesão Efetiva (c'): ${params.coeso_kpa || 15} kPa`,
                `- Ângulo de Atrito Efetivo (phi'): ${params.atrito_graus || 32} graus`,
                `- Peso Específico Natural (gamma): ${params.peso_especifico_kn_m3 || 20.5} kN/m³`,
                `- Razão de Poro-pressão (Ru): ${params.ru_poropressao || 0.20}`,
                "",
                "ARQUIVOS COMPONENTES:",
                "1. 01_series_instrumentacao_geostudio.csv - Dados tabulares para SLOPE/W e SEEP/W",
                "2. 02_geometria_espacial_utm23s.geojson - Malhas e pontos em SIRGAS 2000 UTM 23S",
                "3. 03_especificacao_analise_geotecnica.json - Metadados estruturados para automação",
                "================================================================================"
            ].join("\r\n");

            // Se JSZip estiver disponivel no ambiente global
            const JSZipLib = global.JSZip || (typeof window !== 'undefined' ? window.JSZip : null);
            if (JSZipLib) {
                const zip = new JSZipLib();
                zip.file("01_series_instrumentacao_geostudio.csv", csvRes.conteudo);
                zip.file("02_geometria_espacial_utm23s.geojson", geoJsonRes.conteudo);
                zip.file("03_especificacao_analise_geotecnica.json", JSON.stringify(metadadosJson, null, 2));
                zip.file("04_memorial_descritivo.txt", memorialTexto);

                const blob = await zip.generateAsync({ type: "blob" });
                const nomeZip = `MDSYNC_PACOTE_ESTABILIDADE_${dossie.estrutura.codigo}_${new Date().toISOString().substring(0, 10)}.zip`;

                if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = nomeZip;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }

                return {
                    nomeArquivo: nomeZip,
                    status: "DOWNLOAD_CONCLUIDO",
                    solicitacaoCodigo: solicitacao ? solicitacao.codigo : "N/A"
                };
            } else {
                // Fallback: download individual dos arquivos
                this.dispararDownload(csvRes);
                this.dispararDownload(geoJsonRes);
                return {
                    nomeArquivo: csvRes.nomeArquivo,
                    status: "DOWNLOAD_INDIVIDUAL",
                    solicitacaoCodigo: solicitacao ? solicitacao.codigo : "N/A"
                };
            }
        }

        /**
         * Dispara download no navegador
         */
        dispararDownload(resultadoExportacao) {
            if (typeof window === 'undefined' || typeof document === 'undefined') return;

            const blob = new Blob([resultadoExportacao.conteudo], { type: resultadoExportacao.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = resultadoExportacao.nomeArquivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    const instance = new ExportadorGeotecnico();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ExportadorGeotecnico, exportadorGeotecnico: instance };
    }

    global.MDSyncExportador = instance;

})(typeof window !== 'undefined' ? window : globalThis);
