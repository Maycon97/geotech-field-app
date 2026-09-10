/**
 * MDSync Microsoft 365 & Power BI Integration Gateway (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Camada de integracao desacoplada da Secao 16 para alimentacao automatica
 * de datasets do Power BI, sincronizacao com bibliotecas do SharePoint e
 * acionamento de fluxos operacionais no Power Automate.
 */

(function (global) {
    'use strict';

    class MicrosoftServiceGateway {
        constructor(config = {}) {
            this.config = {
                tenantId: config.tenantId || "itaminas.com.br",
                clientId: config.clientId || null,
                sharePointSiteUrl: config.sharePointSiteUrl || "https://itaminas.sharepoint.com/sites/Geotecnia",
                powerBiPushUrl: config.powerBiPushUrl || null,
                powerAutomateWebhookUrl: config.powerAutomateWebhookUrl || null,
                isEmulatedMode: !config.clientId || !config.powerBiPushUrl,
                ...config
            };

            this.emulatedPushLogs = [];
        }

        /**
         * Envia dados de leituras de instrumentacao para o dataset de streaming do Power BI
         */
        async pushLeiturasPowerBI(leiturasArray) {
            const timestamp = new Date().toISOString();

            if (!this.config.isEmulatedMode && this.config.powerBiPushUrl) {
                try {
                    const response = await fetch(this.config.powerBiPushUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(leiturasArray)
                    });
                    return { sucesso: response.ok, status: response.status, timestamp };
                } catch (e) {
                    console.error('[MicrosoftGateway] Erro ao enviar dados ao Power BI:', e);
                    throw e;
                }
            }

            // Modo Emulado Homologavel
            const logEntry = {
                tipo: "POWER_BI_PUSH",
                totalRegistros: Array.isArray(leiturasArray) ? leiturasArray.length : 1,
                timestamp,
                status: "SINCRONIZADO_EMULADO"
            };
            this.emulatedPushLogs.push(logEntry);

            if (global.SyncBridge) {
                global.SyncBridge.emit('POWER_BI_SYNC_EMULATED', logEntry);
            }

            return { sucesso: true, modo: "EMULADO_AUDITAVEL", log: logEntry };
        }

        /**
         * Dispara gatilho operacional no Power Automate (ex: envio de email formal de anomalia)
         */
        async dispararFluxoPowerAutomate(eventoTipo, payload) {
            const timestamp = new Date().toISOString();

            if (!this.config.isEmulatedMode && this.config.powerAutomateWebhookUrl) {
                try {
                    const response = await fetch(this.config.powerAutomateWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ evento: eventoTipo, payload, timestamp })
                    });
                    return { sucesso: response.ok, status: response.status };
                } catch (e) {
                    console.error('[MicrosoftGateway] Erro no Webhook do Power Automate:', e);
                    throw e;
                }
            }

            const logEntry = {
                tipo: "POWER_AUTOMATE_TRIGGER",
                evento: eventoTipo,
                payloadResumo: payload.codigo || payload.id || "Evento Geotecnico",
                timestamp,
                status: "DISPARADO_EMULADO"
            };
            this.emulatedPushLogs.push(logEntry);

            return { sucesso: true, modo: "EMULADO_AUDITAVEL", log: logEntry };
        }

        obterLogsIntegracao() {
            return this.emulatedPushLogs;
        }
    }

    const instance = new MicrosoftServiceGateway();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { MicrosoftServiceGateway, microsoftGateway: instance };
    }

    global.MDSyncMicrosoft = instance;

})(typeof window !== 'undefined' ? window : globalThis);
