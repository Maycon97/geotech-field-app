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
