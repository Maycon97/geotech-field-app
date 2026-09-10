/**
 * MDSync Anomalias Engine & Workflow Controller (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Implementa o ciclo de vida rigoroso em 9 estados da anomalia geotecnica,
 * alçadas de transicao por perfil (RBAC), separacao estrita entre avaliacao
 * tecnica e tratativa operacional, e integracao com a trilha de auditoria imutavel.
 */

(function (global) {
    'use strict';

    const ESTADOS = {
        IDENTIFICADA: "IDENTIFICADA",
        REGISTRADA: "REGISTRADA",
        AVALIADA: "AVALIADA",
        TRATATIVA_DEFINIDA: "TRATATIVA_DEFINIDA",
        CHAMADO_ABERTO: "CHAMADO_ABERTO",
        EM_TRATAMENTO: "EM_TRATAMENTO",
        TRATAMENTO_EXECUTADO: "TRATAMENTO_EXECUTADO",
        VALIDACAO: "VALIDACAO",
        ENCERRADA: "ENCERRADA"
    };

    // Matriz de Transicoes Permitidas e Alçadas Minimas Exigidas
    const REGRAS_TRANSICAO = {
        IDENTIFICADA: {
            proximos: [ESTADOS.REGISTRADA],
            perfisAutorizados: ["TECNICO_CAMPO", "TECNICO_ESPECIALISTA", "ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        REGISTRADA: {
            proximos: [ESTADOS.AVALIADA, ESTADOS.TRATATIVA_DEFINIDA],
            perfisAutorizados: ["TECNICO_ESPECIALISTA", "ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        AVALIADA: {
            proximos: [ESTADOS.TRATATIVA_DEFINIDA],
            perfisAutorizados: ["ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        TRATATIVA_DEFINIDA: {
            proximos: [ESTADOS.CHAMADO_ABERTO, ESTADOS.EM_TRATAMENTO],
            perfisAutorizados: ["ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        CHAMADO_ABERTO: {
            proximos: [ESTADOS.EM_TRATAMENTO],
            perfisAutorizados: ["TECNICO_CAMPO", "TECNICO_ESPECIALISTA", "ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        EM_TRATAMENTO: {
            proximos: [ESTADOS.TRATAMENTO_EXECUTADO],
            perfisAutorizados: ["TECNICO_CAMPO", "TECNICO_ESPECIALISTA", "ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        TRATAMENTO_EXECUTADO: {
            proximos: [ESTADOS.VALIDACAO],
            perfisAutorizados: ["TECNICO_ESPECIALISTA", "ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        VALIDACAO: {
            proximos: [ESTADOS.ENCERRADA, ESTADOS.EM_TRATAMENTO], // Permite reprovar e voltar para tratamento
            perfisAutorizados: ["ENGENHEIRO", "SUPERVISOR", "GERENTE"]
        },
        ENCERRADA: {
            proximos: [], // Estado terminal. Nao permite reabertura silenciosa.
            perfisAutorizados: ["GERENTE"]
        }
    };

    class AnomaliasEngine {
        constructor(db) {
            this.db = db || global.MDSyncDB;
        }

        /**
         * Registra uma anomalia em campo a partir de vistoria visual ou deteccao direta
         */
        async registrarAnomaliaCampo(dados) {
            if (!dados.descricao || !dados.tipo_anomalia) {
                throw new Error("Tipo de anomalia e descricao sao campos obrigatorios.");
            }

            const anomaliaCriada = await this.db.criarAnomalia(dados);

            // Avancar de IDENTIFICADA para REGISTRADA apos persistencia
            anomaliaCriada.status_ciclo = ESTADOS.REGISTRADA;
            await this.db.put("anomalias", anomaliaCriada, "Transicao automatica de IDENTIFICADA para REGISTRADA");

            if (global.SyncBridge) {
                global.SyncBridge.emit('ANOMALIA_CRIADA', {
                    id: anomaliaCriada.id,
                    codigo: anomaliaCriada.codigo_sequencial,
                    criticidade: anomaliaCriada.criticidade,
                    estrutura_id: anomaliaCriada.estrutura_id
                });
            }

            return anomaliaCriada;
        }

        /**
         * Realiza avaliacao tecnica da anomalia por Especialista ou Engenheiro
         */
        async avaliarTecnicamente(anomaliaId, avaliacaoTecnica, recomendacao, novoPesoANM = null) {
            const anomalia = await this.db.get("anomalias", anomaliaId);
            if (!anomalia) throw new Error(`Anomalia ${anomaliaId} nao encontrada.`);

            this._validarTransicao(anomalia.status_ciclo, ESTADOS.AVALIADA);

            anomalia.avaliacao_tecnica = avaliacaoTecnica;
            anomalia.recomendacao_tecnica = recomendacao;
            if (novoPesoANM !== null) anomalia.peso_anm_matriz = parseInt(novoPesoANM, 10);
            anomalia.status_ciclo = ESTADOS.AVALIADA;
            anomalia.data_avaliacao = new Date().toISOString();
            anomalia.usuario_avaliador_id = this.db.currentUser.id;

            await this.db.put("anomalias", anomalia, "Registro de Avaliacao Tecnica Geotecnica");
            return anomalia;
        }

        /**
         * Define o plano de tratativa operacional (separado da avaliacao tecnica)
         */
        async definirTratativa(anomaliaId, dadosTratativa) {
            const anomalia = await this.db.get("anomalias", anomaliaId);
            if (!anomalia) throw new Error(`Anomalia ${anomaliaId} nao encontrada.`);

            this._validarTransicao(anomalia.status_ciclo, ESTADOS.TRATATIVA_DEFINIDA);

            const tratativa = {
                id: dadosTratativa.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'trat-' + Date.now()),
                anomalia_id: anomalia.id,
                anomalia_codigo: anomalia.codigo_sequencial,
                descricao_intervencao: dadosTratativa.descricao_intervencao,
                setor_responsavel: dadosTratativa.setor_responsavel || "Infraestrutura e Drenagem",
                responsavel_operacional: dadosTratativa.responsavel_operacional || "",
                prazo_dias: parseInt(dadosTratativa.prazo_dias || anomalia.prazo_proposto_dias || 7, 10),
                data_limite: dadosTratativa.data_limite || null,
                status_execucao: "PLANEJADA"
            };

            await this.db.put("tratativas", tratativa, "Definicao de plano de intervencao operacional");

            anomalia.status_ciclo = ESTADOS.TRATATIVA_DEFINIDA;
            anomalia.tratativa_ativa_id = tratativa.id;
            await this.db.put("anomalias", anomalia, "Transicao para TRATATIVA_DEFINIDA");

            return { anomalia, tratativa };
        }

        /**
         * Vincula chamado de Ordem de Servico gerado no Fluig / TOTVS
         */
        async vincularChamadoFluig(anomaliaId, fluigChamadoId) {
            const anomalia = await this.db.get("anomalias", anomaliaId);
            if (!anomalia) throw new Error(`Anomalia ${anomaliaId} nao encontrada.`);

            anomalia.fluig_chamado_id = fluigChamadoId;
            anomalia.fluig_status = "ABERTO";
            anomalia.status_ciclo = ESTADOS.CHAMADO_ABERTO;

            await this.db.put("anomalias", anomalia, `Vinculacao de Ordem de Servico Fluig: ${fluigChamadoId}`);
            return anomalia;
        }

        /**
         * Informa inicio ou andamento de tratamento no campo
         */
        async iniciarTratamento(anomaliaId, responsavelCampo = "") {
            const anomalia = await this.db.get("anomalias", anomaliaId);
            if (!anomalia) throw new Error(`Anomalia ${anomaliaId} nao encontrada.`);

            this._validarTransicao(anomalia.status_ciclo, ESTADOS.EM_TRATAMENTO);
            anomalia.status_ciclo = ESTADOS.EM_TRATAMENTO;
            anomalia.data_inicio_tratamento = new Date().toISOString();

            await this.db.put("anomalias", anomalia, `Tratamento operacional iniciado por ${responsavelCampo || this.db.currentUser.nome}`);
            return anomalia;
        }

        /**
         * Registra a conclusao da intervencao fisica com evidencias
         */
        async registrarConclusaoTratamento(anomaliaId, dadosConclusao) {
            const anomalia = await this.db.get("anomalias", anomaliaId);
            if (!anomalia) throw new Error(`Anomalia ${anomaliaId} nao encontrada.`);

            this._validarTransicao(anomalia.status_ciclo, ESTADOS.TRATAMENTO_EXECUTADO);

            // Atualiza tratativa vinculada
            if (anomalia.tratativa_ativa_id) {
                const tratativa = await this.db.get("tratativas", anomalia.tratativa_ativa_id);
                if (tratativa) {
                    tratativa.status_execucao = "EXECUTADA";
                    tratativa.data_conclusao_execucao = new Date().toISOString();
                    tratativa.evidencias_execucao_desc = dadosConclusao.evidencias_desc || "";
                    await this.db.put("tratativas", tratativa, "Conclusao de intervencao fisica");
                }
            }

            anomalia.status_ciclo = ESTADOS.TRATAMENTO_EXECUTADO;
            anomalia.data_conclusao_tratamento = new Date().toISOString();
            await this.db.put("anomalias", anomalia, "Registro de tratamento executado no campo");
            return anomalia;
        }

        /**
         * Submete para validacao da Engenharia Geotecnica Responsavel
         */
        async submeterParaValidacao(anomaliaId) {
            const anomalia = await this.db.get("anomalias", anomaliaId);
            if (!anomalia) throw new Error(`Anomalia ${anomaliaId} nao encontrada.`);

            this._validarTransicao(anomalia.status_ciclo, ESTADOS.VALIDACAO);
            anomalia.status_ciclo = ESTADOS.VALIDACAO;
            await this.db.put("anomalias", anomalia, "Submissao para validacao tecnica do engenheiro");
            return anomalia;
        }

        /**
         * Encerra a anomalia com parecer formal do Engenheiro e justificativa
         */
        async encerrarAnomalia(anomaliaId, parecerValidacao, justificativaEncerramento) {
            const anomalia = await this.db.get("anomalias", anomaliaId);
            if (!anomalia) throw new Error(`Anomalia ${anomaliaId} nao encontrada.`);

            this._validarTransicao(anomalia.status_ciclo, ESTADOS.ENCERRADA);

            const perfilUsuario = this.db.currentUser.perfil;
            if (!["ENGENHEIRO", "SUPERVISOR", "GERENTE"].includes(perfilUsuario)) {
                throw new Error("Apenas Engenheiros, Supervisores ou Gerentes possuem alçada para encerrar anomalias.");
            }

            anomalia.status_ciclo = ESTADOS.ENCERRADA;
            anomalia.parecer_validacao_final = parecerValidacao;
            anomalia.justificativa_encerramento = justificativaEncerramento;
            anomalia.data_encerramento = new Date().toISOString();
            anomalia.usuario_encerramento_id = this.db.currentUser.id;
            anomalia.usuario_encerramento_nome = this.db.currentUser.nome;

            await this.db.put("anomalias", anomalia, `Encerramento formal de anomalia: ${justificativaEncerramento}`);

            if (global.SyncBridge) {
                global.SyncBridge.emit('ANOMALIA_ENCERRADA', {
                    id: anomalia.id,
                    codigo: anomalia.codigo_sequencial,
                    encerradaPor: anomalia.usuario_encerramento_nome
                });
            }

            return anomalia;
        }

        /**
         * Valida se a transicao de estado e permitida e se o perfil possui alçada
         */
        _validarTransicao(estadoAtual, estadoDestino) {
            const regra = REGRAS_TRANSICAO[estadoAtual];
            if (!regra || !regra.proximos.includes(estadoDestino)) {
                throw new Error(`Transicao invalida: nao e permitido mover anomalia de ${estadoAtual} para ${estadoDestino}.`);
            }

            const perfil = this.db.currentUser.perfil;
            if (!regra.perfisAutorizados.includes(perfil)) {
                throw new Error(`Alçada insuficiente: perfil ${perfil} nao tem permissao para transicionar para ${estadoDestino}.`);
            }
        }
    }

    const instance = new AnomaliasEngine();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { AnomaliasEngine, anomaliasEngine: instance, ESTADOS };
    }

    global.MDSyncAnomalias = instance;
    global.MDSyncEstadosAnomalia = ESTADOS;

})(typeof window !== 'undefined' ? window : globalThis);
