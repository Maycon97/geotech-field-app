/**
 * MDSync Fluig / TOTVS Integration Gateway (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Camada de integracao desacoplada (Adapter / Gateway Pattern) para abertura,
 * rastreamento e sincronizacao de Ordens de Servico no Fluig / TOTVS.
 * Opera em modo emulado homologavel e auditado ate a concessao de credenciais corporativas.
 */

(function (global) {
    'use strict';

    class FluigServiceGateway {
        constructor(config = {}) {
            this.config = {
                endpoint: config.endpoint || null,
                tenantId: config.tenantId || "ITAMINAS-SARZEDO",
                appKey: config.appKey || null,
                appSecret: config.appSecret || null,
                isEmulatedMode: !config.endpoint || !config.appKey, // Modo emulado ativo se nao configurado
                ...config
            };

            this.emulatedDb = new Map();
        }

        /**
         * Configura credenciais corporativas reais quando fornecidas pela TI
         */
        configure(credentials) {
            this.config = {
                ...this.config,
                ...credentials,
                isEmulatedMode: !(credentials && credentials.endpoint && credentials.appKey)
            };
            console.info(`[FluigGateway] Configuracao atualizada. Modo emulado: ${this.config.isEmulatedMode}`);
        }

        /**
         * Cria uma Ordem de Servico no Fluig para execucao de tratativa de anomalia
         * @param {Object} payloadAnomalia - Dados estruturados da anomalia
         * @returns {Promise<Object>} Resposta contendo identificador de chamado e protocolo
         */
        async criarChamadoOS(payloadAnomalia) {
            if (!payloadAnomalia || !payloadAnomalia.id) {
                throw new Error("Payload da anomalia invalido para abertura de chamado.");
            }

            const timestamp = new Date().toISOString();

            // Modo Corporativo Real (Quando endpoints fornecidos)
            if (!this.config.isEmulatedMode) {
                try {
                    const response = await fetch(`${this.config.endpoint}/api/public/2.0/workflows/startProcess`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.config.appKey}`
                        },
                        body: JSON.stringify({
                            processId: "GEOTECNIA_TRATATIVA_ANOMALIA",
                            comments: `Abertura automatica via MDSync - Anomalia ${payloadAnomalia.codigo_sequencial || payloadAnomalia.id}`,
                            formFields: {
                                estrutura_codigo: payloadAnomalia.estrutura_codigo || "",
                                anomalia_id: payloadAnomalia.id,
                                anomalia_codigo: payloadAnomalia.codigo_sequencial || "",
                                criticidade: payloadAnomalia.criticidade || "MEDIA",
                                descricao: payloadAnomalia.descricao || "",
                                recomendacao: payloadAnomalia.recomendacao_tecnica || "",
                                setor_destino: payloadAnomalia.setor_destino || "INFRAESTRUTURA"
                            }
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Erro na API do Fluig: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    return {
                        sucesso: true,
                        chamadoId: String(data.processInstanceId),
                        protocolo: `FLUIG-OS-${data.processInstanceId}`,
                        modo: "PRODUCAO_REST",
                        status: "ABERTO",
                        criadoEm: timestamp
                    };
                } catch (err) {
                    console.error('[FluigGateway] Falha ao comunicar com API Fluig:', err);
                    throw err;
                }
            }

            // Modo Emulado Homologavel (Padrao Adapter)
            const idGerado = Math.floor(100000 + Math.random() * 900000);
            const protocoloEmulado = `FLUIG-OS-2026-${idGerado}`;
            
            const registroChamado = {
                chamadoId: String(idGerado),
                protocolo: protocoloEmulado,
                modo: "EMULADO_AUDITAVEL",
                status: "ABERTO",
                anomaliaId: payloadAnomalia.id,
                anomaliaCodigo: payloadAnomalia.codigo_sequencial || payloadAnomalia.id,
                descricao: payloadAnomalia.descricao || "",
                setorResponsavel: payloadAnomalia.setor_destino || "Infraestrutura de Mina",
                criadoEm: timestamp,
                historicoStatus: [
                    { status: "ABERTO", data: timestamp, responsavel: "MDSync Automacao" }
                ]
            };

            this.emulatedDb.set(String(idGerado), registroChamado);

            // Se o motor de anomalias estiver disponivel, vincula
            if (global.MDSyncAnomalias) {
                try {
                    await global.MDSyncAnomalias.vincularChamadoFluig(payloadAnomalia.id, protocoloEmulado);
                } catch (e) {
                    console.warn('[FluigGateway] Aviso ao vincular anomalia:', e);
                }
            }

            // Emite evento no barramento de sincronizacao
            if (global.SyncBridge) {
                global.SyncBridge.emit('FLUIG_CHAMADO_CRIADO', {
                    protocolo: protocoloEmulado,
                    anomaliaId: payloadAnomalia.id,
                    modo: "EMULADO_AUDITAVEL"
                });
            }

            return {
                sucesso: true,
                chamadoId: String(idGerado),
                protocolo: protocoloEmulado,
                modo: "EMULADO_AUDITAVEL",
                status: "ABERTO",
                criadoEm: timestamp
            };
        }

        /**
         * Consulta o status atual de uma Ordem de Servico
         */
        async consultarStatusOS(chamadoIdOuProtocolo) {
            const idLimpo = String(chamadoIdOuProtocolo).replace(/[^0-9]/g, '');

            if (!this.config.isEmulatedMode) {
                const response = await fetch(`${this.config.endpoint}/api/public/2.0/workflows/status/${idLimpo}`, {
                    headers: { 'Authorization': `Bearer ${this.config.appKey}` }
                });
                return await response.json();
            }

            const registro = this.emulatedDb.get(idLimpo);
            if (!registro) {
                return {
                    encontrado: false,
                    protocolo: chamadoIdOuProtocolo,
                    mensagem: "Chamado nao localizado no registro local emulado."
                };
            }

            return {
                encontrado: true,
                ...registro
            };
        }

        /**
         * Atualiza o andamento do chamado no Fluig (ex: em tratamento, concluido)
         */
        async atualizarStatusOS(chamadoId, novoStatus, observacao = "") {
            const idLimpo = String(chamadoId).replace(/[^0-9]/g, '');
            const timestamp = new Date().toISOString();

            if (this.config.isEmulatedMode) {
                const registro = this.emulatedDb.get(idLimpo);
                if (registro) {
                    registro.status = novoStatus;
                    registro.historicoStatus.push({
                        status: novoStatus,
                        data: timestamp,
                        observacao
                    });
                    this.emulatedDb.set(idLimpo, registro);
                }
                return { sucesso: true, novoStatus, timestamp };
            }

            return { sucesso: false, mensagem: "Atualizacao remota pendente de endpoint corporativo." };
        }
    }

    const instance = new FluigServiceGateway();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { FluigServiceGateway, fluigGateway: instance };
    }

    global.MDSyncFluig = instance;

})(typeof window !== 'undefined' ? window : globalThis);
