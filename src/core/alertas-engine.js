/**
 * MDSync Alertas Engine & Governança Operacional (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Implementa o motor de alertas da Secao 20 da especificacao mestra.
 * Classifica desvios e pendencias operacionais estritamente como
 * "ALERTA PARA AVALIACAO TECNICA", sem diagnosticos automaticos sensacionalistas.
 */

(function (global) {
    'use strict';

    class AlertasEngine {
        constructor(db) {
            this.db = db || global.MDSyncDB;
            this.alertasCache = [];
        }

        /**
         * Executa a varredura normativa de todas as estruturas e indicadores
         * @returns {Promise<Array>} Lista de alertas gerados para avaliacao tecnica
         */
        async varrerAlertas() {
            if (!this.db) return [];
            await this.db.init();

            const alertas = [];
            const agora = new Date();

            const [todasAnomalias, todasEstruturas, todosInstrumentos, todasLeituras, itensOutbox] = await Promise.all([
                this.db.getAll("anomalias"),
                this.db.getAll("estruturas"),
                this.db.getAll("instrumentos"),
                this.db.getAll("leituras_instrumentos"),
                this.db.getAll("sync_outbox")
            ]);

            // 1. Alertas de Anomalias Criticas ou com Prazo Vencido
            todasAnomalias.forEach(anom => {
                if (anom.status_ciclo !== "ENCERRADA") {
                    if (anom.criticidade === "MUITO_ALTA" || anom.criticidade === "ALTA") {
                        alertas.push({
                            id: `ALT-ANOM-CRIT-${anom.id}`,
                            tipo: "ANOMALIA_CRITICA",
                            titulo: "ALERTA PARA AVALIAÇÃO TÉCNICA: Anomalia com Alta Criticidade",
                            descricao: `Anomalia ${anom.codigo_sequencial || anom.id} classificada como ${anom.criticidade} requer vistoria e validacao do Engenheiro Geotecnico.`,
                            estruturaId: anom.estrutura_id,
                            registroVinculadoId: anom.id,
                            criticidade: anom.criticidade,
                            dataGeracao: anom.data_identificacao || agora.toISOString(),
                            acaoSugerida: "Inspecionar local e definir tratativa operacional emergencial.",
                            alçada: "ENGENHEIRO"
                        });
                    }

                    if (anom.data_limite && new Date(anom.data_limite) < agora) {
                        alertas.push({
                            id: `ALT-ANOM-VENC-${anom.id}`,
                            tipo: "ANOMALIA_VENCIDA",
                            titulo: "ALERTA PARA AVALIAÇÃO TÉCNICA: Prazo de Tratativa Ultrapassado",
                            descricao: `A anomalia ${anom.codigo_sequencial || anom.id} atingiu a data limite (${anom.data_limite}) sem conclusao da tratativa.`,
                            estruturaId: anom.estrutura_id,
                            registroVinculadoId: anom.id,
                            criticidade: "MEDIA",
                            dataGeracao: agora.toISOString(),
                            acaoSugerida: "Cobrar equipe de intervencao operacional de mina.",
                            alçada: "SUPERVISOR"
                        });
                    }

                    if (anom.status_ciclo === "VALIDACAO") {
                        alertas.push({
                            id: `ALT-ANOM-VAL-${anom.id}`,
                            tipo: "PENDENCIA_VALIDACAO",
                            titulo: "ALERTA PARA AVALIAÇÃO TÉCNICA: Tratamento Concluído Aguardando Parecer",
                            descricao: `A anomalia ${anom.codigo_sequencial || anom.id} teve intervencao fisica executada e aguarda parecer formal do Engenheiro.`,
                            estruturaId: anom.estrutura_id,
                            registroVinculadoId: anom.id,
                            criticidade: "BAIXA",
                            dataGeracao: agora.toISOString(),
                            acaoSugerida: "Emitir parecer tecnico de validacao para encerramento.",
                            alçada: "ENGENHEIRO"
                        });
                    }
                }
            });

            // 2. Alertas de Instrumentacao frente aos Limites TARP
            const leiturasPorInstrumento = new Map();
            todasLeituras.forEach(l => {
                const anterior = leiturasPorInstrumento.get(l.instrumento_id);
                if (!anterior || new Date(l.data_hora) > new Date(anterior.data_hora)) {
                    leiturasPorInstrumento.set(l.instrumento_id, l);
                }
            });

            todosInstrumentos.forEach(inst => {
                const ultLeitura = leiturasPorInstrumento.get(inst.id);
                if (ultLeitura) {
                    if (ultLeitura.status_tarp === "ALERTA" || ultLeitura.status_tarp === "EMERGENCIA") {
                        alertas.push({
                            id: `ALT-TARP-${inst.id}`,
                            tipo: "TARP_CRITICO",
                            titulo: "ALERTA PARA AVALIAÇÃO TÉCNICA: Limite Crítico TARP Atingido",
                            descricao: `Instrumento ${inst.codigo} registrou ${ultLeitura.valor_medido} ${ultLeitura.unidade} (Cota NA ${ultLeitura.cota_nivel_agua} m, limite crítico ${inst.limite_alerta}).`,
                            estruturaId: inst.estrutura_id,
                            registroVinculadoId: inst.id,
                            criticidade: "MUITO_ALTA",
                            dataGeracao: ultLeitura.data_hora,
                            acaoSugerida: "Duplicar frequencia de leitura, vistoriar talude e analisar poro-pressao.",
                            alçada: "ENGENHEIRO"
                        });
                    } else if (ultLeitura.status_tarp === "ATENCAO") {
                        alertas.push({
                            id: `ALT-TARP-ATN-${inst.id}`,
                            tipo: "TARP_ATENCAO",
                            titulo: "ALERTA PARA AVALIAÇÃO TÉCNICA: Nível de Atenção Operacional",
                            descricao: `Instrumento ${inst.codigo} atingiu a faixa de atencao (${ultLeitura.valor_medido} ${ultLeitura.unidade} frente ao limite ${inst.limite_atencao}).`,
                            estruturaId: inst.estrutura_id,
                            registroVinculadoId: inst.id,
                            criticidade: "MEDIA",
                            dataGeracao: ultLeitura.data_hora,
                            acaoSugerida: "Acompanhar serie temporal e realizar leitura complementar em 24h.",
                            alçada: "TECNICO_ESPECIALISTA"
                        });
                    }
                } else {
                    alertas.push({
                        id: `ALT-SEM-LEIT-${inst.id}`,
                        tipo: "INSTRUMENTO_SEM_LEITURA",
                        titulo: "ALERTA PARA AVALIAÇÃO TÉCNICA: Instrumento Sem Coletas Recentes",
                        descricao: `Instrumento ${inst.codigo} da estrutura nao possui leituras registradas na base ativa.`,
                        estruturaId: inst.estrutura_id,
                        registroVinculadoId: inst.id,
                        criticidade: "BAIXA",
                        dataGeracao: agora.toISOString(),
                        acaoSugerida: "Incluir instrumento na rota da proxima vistoria de campo.",
                        alçada: "TECNICO_CAMPO"
                    });
                }
            });

            // 3. Alertas de Sincronizacao Offline (Fila Outbox com Erro)
            const errosOutbox = itensOutbox.filter(item => item.status === "ERRO");
            if (errosOutbox.length > 0) {
                alertas.push({
                    id: `ALT-SYNC-ERRO`,
                    tipo: "FALHA_SINCRONIZACAO",
                    titulo: "ALERTA PARA AVALIAÇÃO TÉCNICA: Registros Retidos na Fila Outbox",
                    descricao: `Existem ${errosOutbox.length} apontamentos de campo retidos na fila com falha de transporte.`,
                    estruturaId: null,
                    registroVinculadoId: null,
                    criticidade: "MEDIA",
                    dataGeracao: agora.toISOString(),
                    acaoSugerida: "Verificar conectividade com rede corporativa e forçar retry de sincronizacao.",
                    alçada: "SUPERVISOR"
                });
            }

            this.alertasCache = alertas;

            if (global.SyncBridge) {
                global.SyncBridge.emit('ALERTAS_ATUALIZADOS', {
                    total: alertas.length,
                    timestamp: agora.toISOString()
                });
            }

            return alertas;
        }

        obterAlertasAtivos() {
            return this.alertasCache;
        }
    }

    const instance = new AlertasEngine();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { AlertasEngine, alertasEngine: instance };
    }

    global.MDSyncAlertas = instance;

})(typeof window !== 'undefined' ? window : globalThis);
