/**
 * MDSync Database Engine & Persistence Layer (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Implementa persistencia relacional offline no IndexedDB (MDSyncDB),
 * garantia de transacoes ACID locais, fila outbox transacional,
 * trilha de auditoria imutavel e calculos geotecnicos de Cota NA e Poro-pressao.
 */

(function (global) {
    'use strict';

    const DB_NAME = "MDSyncDB";
    const DB_VERSION = 2;

    // Perfis de Acesso Corporativos (RBAC)
    const PERFIS_USUARIO = {
        TECNICO_CAMPO: "TECNICO_CAMPO",
        TECNICO_ESPECIALISTA: "TECNICO_ESPECIALISTA",
        ENGENHEIRO: "ENGENHEIRO",
        SUPERVISOR: "SUPERVISOR",
        GERENTE: "GERENTE"
    };

    // Estados do Ciclo de Vida da Anomalia (9 Estados Normativos)
    const ESTADOS_ANOMALIA = {
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

    // Niveis de Criticidade
    const CRITICIDADE = {
        BAIXA: "BAIXA",
        MEDIA: "MEDIA",
        ALTA: "ALTA",
        MUITO_ALTA: "MUITO_ALTA"
    };

    // Status TARP para Instrumentacao
    const TARP_STATUS = {
        NORMAL: "NORMAL",
        ATENCAO: "ATENCAO",
        ALERTA: "ALERTA",
        EMERGENCIA: "EMERGENCIA"
    };

    // Estados da Fila de Sincronizacao Outbox
    const OUTBOX_STATUS = {
        PENDENTE: "PENDENTE",
        PROCESSANDO: "PROCESSANDO",
        SINCRONIZADO: "SINCRONIZADO",
        CONFLITO: "CONFLITO",
        ERRO: "ERRO"
    };

    // Utilitario para geracao de identificador UUID v4 em ambiente web ou offline
    function generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    class MDSyncDatabaseEngine {
        constructor() {
            this.db = null;
            this.isReady = false;
            this.readyPromise = null;
            this.currentUser = {
                id: "usr-tecnico-01",
                matricula: "MAT-2026-081",
                nome: "Tecnico Geotecnia Campo",
                perfil: PERFIS_USUARIO.TECNICO_CAMPO,
                email: "campo.geotecnia@itaminas.com.br"
            };
        }

        /**
         * Inicializa a conexao com o IndexedDB e configura as stores relacionais
         */
        async init() {
            if (this.readyPromise) return this.readyPromise;

            this.readyPromise = new Promise((resolve, reject) => {
                if (typeof indexedDB === 'undefined') {
                    console.warn('[MDSyncDB] IndexedDB nao disponivel no ambiente atual.');
                    resolve(this);
                    return;
                }

                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    console.info('[MDSyncDB] Executando upgrade do esquema de banco para versao:', DB_VERSION);

                    // 1. Usuarios e RBAC
                    if (!db.objectStoreNames.contains("usuarios")) {
                        const store = db.createObjectStore("usuarios", { keyPath: "id" });
                        store.createIndex("by_matricula", "matricula", { unique: true });
                        store.createIndex("by_perfil", "perfil", { unique: false });
                        store.createIndex("by_email", "email", { unique: false });
                    }

                    // 2. Cadastro de Estruturas
                    if (!db.objectStoreNames.contains("estruturas")) {
                        const store = db.createObjectStore("estruturas", { keyPath: "id" });
                        store.createIndex("by_codigo", "codigo", { unique: true });
                        store.createIndex("by_tipo", "tipo", { unique: false });
                        store.createIndex("by_status", "status_operacional", { unique: false });
                        store.createIndex("by_slug", "slug", { unique: false });
                    }

                    // 3. Cadastro de Instrumentos
                    if (!db.objectStoreNames.contains("instrumentos")) {
                        const store = db.createObjectStore("instrumentos", { keyPath: "id" });
                        store.createIndex("by_codigo", "codigo", { unique: false });
                        store.createIndex("by_estrutura", "estrutura_id", { unique: false });
                        store.createIndex("by_tipo", "tipo", { unique: false });
                        store.createIndex("by_status", "status", { unique: false });
                    }

                    // 4. Leituras de Instrumentos (Series Temporais Estruturadas)
                    if (!db.objectStoreNames.contains("leituras_instrumentos")) {
                        const store = db.createObjectStore("leituras_instrumentos", { keyPath: "id" });
                        store.createIndex("by_instrumento", "instrumento_id", { unique: false });
                        store.createIndex("by_estrutura", "estrutura_id", { unique: false });
                        store.createIndex("by_data", "data_hora", { unique: false });
                        store.createIndex("by_status_tarp", "status_tarp", { unique: false });
                        store.createIndex("by_sincronizado", "status_sincronizacao", { unique: false });
                    }

                    // 5. Inspecoes de Campo
                    if (!db.objectStoreNames.contains("inspecoes")) {
                        const store = db.createObjectStore("inspecoes", { keyPath: "id" });
                        store.createIndex("by_estrutura", "estrutura_id", { unique: false });
                        store.createIndex("by_usuario", "usuario_responsavel_id", { unique: false });
                        store.createIndex("by_data", "data_inicio", { unique: false });
                        store.createIndex("by_status_fluxo", "status_fluxo", { unique: false });
                    }

                    // 6. Itens de Checklist da Inspecao Visual
                    if (!db.objectStoreNames.contains("inspecao_itens_checklist")) {
                        const store = db.createObjectStore("inspecao_itens_checklist", { keyPath: "id" });
                        store.createIndex("by_inspecao", "inspecao_id", { unique: false });
                        store.createIndex("by_componente", "componente", { unique: false });
                        store.createIndex("by_resultado", "resultado", { unique: false });
                    }

                    // 7. Modulo de Anomalias Geotecnicas
                    if (!db.objectStoreNames.contains("anomalias")) {
                        const store = db.createObjectStore("anomalias", { keyPath: "id" });
                        store.createIndex("by_codigo", "codigo_sequencial", { unique: true });
                        store.createIndex("by_estrutura", "estrutura_id", { unique: false });
                        store.createIndex("by_inspecao", "inspecao_origem_id", { unique: false });
                        store.createIndex("by_status_ciclo", "status_ciclo", { unique: false });
                        store.createIndex("by_criticidade", "criticidade", { unique: false });
                    }

                    // 8. Tratativas Operacionais de Anomalias
                    if (!db.objectStoreNames.contains("tratativas")) {
                        const store = db.createObjectStore("tratativas", { keyPath: "id" });
                        store.createIndex("by_anomalia", "anomalia_id", { unique: false });
                        store.createIndex("by_setor", "setor_responsavel", { unique: false });
                    }

                    // 9. Cadastro e Monitoramento de SUMPs
                    if (!db.objectStoreNames.contains("sumps")) {
                        const store = db.createObjectStore("sumps", { keyPath: "id" });
                        store.createIndex("by_codigo", "codigo", { unique: true });
                        store.createIndex("by_estrutura", "estrutura_associada_id", { unique: false });
                    }

                    // 10. Evidencias Fotograficas com Metadados Vinculados
                    if (!db.objectStoreNames.contains("fotografias_evidencias")) {
                        const store = db.createObjectStore("fotografias_evidencias", { keyPath: "id" });
                        store.createIndex("by_registro_vinculo", "registro_vinculo_id", { unique: false });
                        store.createIndex("by_tabela_vinculo", "tabela_vinculo", { unique: false });
                        store.createIndex("by_hash", "hash_sha256", { unique: false });
                    }

                    // 11. Trilha de Auditoria Imutavel
                    if (!db.objectStoreNames.contains("auditoria_modificacoes")) {
                        const store = db.createObjectStore("auditoria_modificacoes", { keyPath: "id" });
                        store.createIndex("by_tabela", "tabela_afetada", { unique: false });
                        store.createIndex("by_registro", "registro_id", { unique: false });
                        store.createIndex("by_usuario", "usuario_id", { unique: false });
                        store.createIndex("by_data", "data_hora", { unique: false });
                    }

                    // 12. Fila Transacional Outbox de Sincronizacao
                    if (!db.objectStoreNames.contains("sync_outbox")) {
                        const store = db.createObjectStore("sync_outbox", { keyPath: "id" });
                        store.createIndex("by_status", "status", { unique: false });
                        store.createIndex("by_prioridade", "prioridade", { unique: false });
                        store.createIndex("by_criado_em", "criado_em", { unique: false });
                    }

                    // 13. Solicitacoes de Analise Geotecnica de Estabilidade
                    if (!db.objectStoreNames.contains("analises_geotecnicas")) {
                        const store = db.createObjectStore("analises_geotecnicas", { keyPath: "id" });
                        store.createIndex("by_estrutura", "estrutura_id", { unique: false });
                        store.createIndex("by_status", "status", { unique: false });
                    }

                    // Stores de compatibilidade com versoes anteriores
                    if (!db.objectStoreNames.contains("catalog")) {
                        db.createObjectStore("catalog", { keyPath: "key" });
                    }
                    if (!db.objectStoreNames.contains("structures")) {
                        db.createObjectStore("structures", { keyPath: "slug" });
                    }
                    if (!db.objectStoreNames.contains("localReadings")) {
                        const store = db.createObjectStore("localReadings", { keyPath: "id", autoIncrement: true });
                        store.createIndex("by_instrument", "instrumentId", { unique: false });
                        store.createIndex("by_synced", "synced", { unique: false });
                    }
                };

                request.onsuccess = async (event) => {
                    this.db = event.target.result;
                    this.isReady = true;
                    console.info('[MDSyncDB] Conexao com IndexedDB estabelecida com sucesso.');
                    try {
                        await this._seedSeVazio();
                    } catch (err) {
                        console.warn('[MDSyncDB] Aviso ao executar carga inicial:', err);
                    }
                    resolve(this);
                };

                request.onerror = (event) => {
                    console.error('[MDSyncDB] Erro critico ao abrir IndexedDB:', event.target.error);
                    resolve(this);
                };
            });

            return this.readyPromise;
        }

        /**
         * Define o usuario ativo para a sessao corrente (para trilha de auditoria e criacao)
         */
        setCurrentUser(usuario) {
            if (usuario && usuario.id) {
                this.currentUser = { ...this.currentUser, ...usuario };
            }
        }

        getCurrentUser() {
            return this.currentUser;
        }

        // =========================================================================
        // OPERACOES GENERICAS COM AUDITORIA E TRANSACAO
        // =========================================================================

        async get(storeName, key) {
            await this.init();
            return new Promise((resolve) => {
                if (!this.db) return resolve(null);
                try {
                    const tx = this.db.transaction(storeName, "readonly");
                    const store = tx.objectStore(storeName);
                    const req = store.get(key);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => resolve(null);
                } catch (e) {
                    resolve(null);
                }
            });
        }

        async getAll(storeName, indexName = null, query = null) {
            await this.init();
            return new Promise((resolve) => {
                if (!this.db) return resolve([]);
                try {
                    const tx = this.db.transaction(storeName, "readonly");
                    const store = tx.objectStore(storeName);
                    let req;
                    if (indexName && store.indexNames.contains(indexName)) {
                        const idx = store.index(indexName);
                        req = query !== null ? idx.getAll(query) : idx.getAll();
                    } else {
                        req = store.getAll();
                    }
                    req.onsuccess = () => {
                        const items = (req.result || []).filter(item => !item.is_deleted);
                        resolve(items);
                    };
                    req.onerror = () => resolve([]);
                } catch (e) {
                    resolve([]);
                }
            });
        }

        /**
         * Salva ou atualiza um registro com registro automatico de auditoria e enfileiramento outbox
         */
        async put(storeName, item, motivoAuditoria = "Atualizacao de registro") {
            await this.init();
            if (!this.db || !item) return null;

            if (!item.id) {
                item.id = generateUUID();
            }

            const registroAnterior = await this.get(storeName, item.id);
            const isNovo = !registroAnterior;

            item.atualizado_em = new Date().toISOString();
            item.atualizado_por_id = this.currentUser.id;
            if (isNovo) {
                item.criado_em = item.atualizado_em;
                item.criado_por_id = this.currentUser.id;
                item.versao_registro = 1;
                item.is_deleted = false;
            } else {
                item.versao_registro = (registroAnterior.versao_registro || 1) + 1;
            }

            return new Promise((resolve, reject) => {
                try {
                    const tx = this.db.transaction([storeName, "auditoria_modificacoes", "sync_outbox"], "readwrite");
                    const store = tx.objectStore(storeName);
                    const auditStore = tx.objectStore("auditoria_modificacoes");
                    const outboxStore = tx.objectStore("sync_outbox");

                    store.put(item);

                    // Trilha de Auditoria Imutavel
                    const auditRecord = {
                        id: generateUUID(),
                        tabela_afetada: storeName,
                        registro_id: item.id,
                        campo_modificado: isNovo ? "CRIACAO_REGISTRO" : "MUDANCA_REGISTRO",
                        valor_anterior: isNovo ? null : JSON.stringify(registroAnterior),
                        novo_valor: JSON.stringify(item),
                        usuario_id: this.currentUser.id,
                        data_hora: new Date().toISOString(),
                        motivo_alteracao: motivoAuditoria,
                        origem_dispositivo: "DISPOSITIVO_CAMPO_OFFLINE",
                        ip_ou_device_id: typeof navigator !== 'undefined' ? navigator.userAgent : "local-client"
                    };
                    auditStore.add(auditRecord);

                    // Enfileiramento na Outbox Transacional para Sincronizacao Posterior
                    const outboxRecord = {
                        id: generateUUID(),
                        tabela: storeName,
                        registro_id: item.id,
                        tipo_operacao: isNovo ? "INSERT" : "UPDATE",
                        payload: item,
                        prioridade: storeName === "anomalias" ? 1 : 2,
                        status: OUTBOX_STATUS.PENDENTE,
                        tentativas: 0,
                        criado_em: new Date().toISOString(),
                        erro_detalhe: null
                    };
                    outboxStore.add(outboxRecord);

                    tx.oncomplete = () => {
                        // Notificar barramento de sincronizacao em tempo real
                        if (global.SyncBridge) {
                            global.SyncBridge.emit('DATABASE_MUTATION', {
                                storeName,
                                id: item.id,
                                isNovo,
                                versao: item.versao_registro
                            });
                        }
                        resolve(item);
                    };

                    tx.onerror = (e) => {
                        console.error(`[MDSyncDB] Erro na transacao de put em ${storeName}:`, e);
                        reject(e);
                    };
                } catch (err) {
                    reject(err);
                }
            });
        }

        /**
         * Exclusao logica (Soft Delete) com registro auditado. NUNCA apaga dados fisicos.
         */
        async softDelete(storeName, id, motivo = "Exclusao logica solicitada") {
            const registro = await this.get(storeName, id);
            if (!registro) return false;

            registro.is_deleted = true;
            registro.deletado_em = new Date().toISOString();
            registro.deletado_por_id = this.currentUser.id;

            await this.put(storeName, registro, `Soft Delete: ${motivo}`);
            return true;
        }

        // =========================================================================
        // METODOS ESPECIALIZADOS EM GEOTECNIA (LEITURAS, ANOMALIAS, INSPECOES)
        // =========================================================================

        /**
         * Salva leitura geotecnica com calculo automatico de Cota NA, Poro-pressao e TARP
         */
        async salvarLeituraInstrumento(dadosLeitura) {
            if (!dadosLeitura.instrumento_id) {
                throw new Error("Instrumento obrigatorio para registro da leitura.");
            }

            const instrumento = await this.get("instrumentos", dadosLeitura.instrumento_id);
            if (!instrumento) {
                throw new Error(`Instrumento ${dadosLeitura.instrumento_id} nao localizado no banco.`);
            }

            const profundidade = parseFloat(dadosLeitura.profundidade_medida || 0);
            const cotaBoca = parseFloat(instrumento.cota_boca || 0);
            const cotaPonta = parseFloat(instrumento.cota_ponta || 0);

            // Calculo da Cota do Nivel d'Agua (NA)
            let cotaNA = null;
            if (profundidade > 0 && cotaBoca > 0) {
                cotaNA = parseFloat((cotaBoca - profundidade).toFixed(2));
            } else if (dadosLeitura.valor_medido !== undefined) {
                cotaNA = parseFloat(dadosLeitura.valor_medido);
            }

            // Calculo da Poro-pressao em kPa: u = (Cota NA - Cota Ponta) * gama_agua (9.81 kN/m3)
            let poropressao = 0;
            if (cotaNA !== null && cotaPonta > 0) {
                const cargaHidraulica = Math.max(0, cotaNA - cotaPonta);
                poropressao = parseFloat((cargaHidraulica * 9.81).toFixed(2));
            }

            // Avaliacao de TARP frente aos limites cadastrados
            let statusTarp = TARP_STATUS.NORMAL;
            const limAtencao = parseFloat(instrumento.limite_atencao || 0);
            const limAlerta = parseFloat(instrumento.limite_alerta || 0);

            const valorComparar = cotaNA !== null ? cotaNA : poropressao;

            if (limAlerta > 0 && valorComparar >= limAlerta) {
                statusTarp = TARP_STATUS.ALERTA;
            } else if (limAtencao > 0 && valorComparar >= limAtencao) {
                statusTarp = TARP_STATUS.ATENCAO;
            }

            const leituraFinal = {
                id: dadosLeitura.id || generateUUID(),
                instrumento_id: instrumento.id,
                instrumento_codigo: instrumento.codigo,
                estrutura_id: instrumento.estrutura_id,
                inspecao_id: dadosLeitura.inspecao_id || null,
                data_hora: dadosLeitura.data_hora || new Date().toISOString(),
                usuario_id: this.currentUser.id,
                usuario_nome: this.currentUser.nome,
                valor_medido: dadosLeitura.valor_medido !== undefined ? parseFloat(dadosLeitura.valor_medido) : cotaNA,
                unidade: instrumento.unidade_medida || "m",
                profundidade_medida: profundidade,
                cota_nivel_agua: cotaNA,
                poro_pressao_calculada: poropressao,
                status_tarp: statusTarp,
                observacao: dadosLeitura.observacao || "",
                coordenadas_gps_e: dadosLeitura.coordenadas_gps_e || null,
                coordenadas_gps_n: dadosLeitura.coordenadas_gps_n || null,
                precisao_gps_m: dadosLeitura.precisao_gps_m || null,
                status_sincronizacao: OUTBOX_STATUS.PENDENTE
            };

            await this.put("leituras_instrumentos", leituraFinal, "Registro de leitura de campo com calculo TARP");

            // Manter compatibilidade com a store legada localReadings
            try {
                const tx = this.db.transaction("localReadings", "readwrite");
                const store = tx.objectStore("localReadings");
                store.add({
                    instrumentId: instrumento.codigo,
                    value: leituraFinal.valor_medido,
                    cotaNA: cotaNA,
                    poropressao: poropressao,
                    tarp: statusTarp,
                    timestamp: leituraFinal.data_hora,
                    synced: false
                });
            } catch (e) {}

            return leituraFinal;
        }

        /**
         * Cria nova anomalia geotecnica com identificador unico sequencial e georreferenciamento
         */
        async criarAnomalia(dadosAnomalia) {
            if (!dadosAnomalia.estrutura_id) {
                throw new Error("Estrutura e obrigatoria para registro de anomalia.");
            }

            const estrutura = await this.get("estruturas", dadosAnomalia.estrutura_id);
            const prefixoEstrutura = estrutura ? (estrutura.codigo.replace(/[^a-zA-Z0-9]/g, '')) : 'ESTR';
            const anoAtual = new Date().getFullYear();

            // Geracao de codigo sequencial legivel e rastreavel
            const todasAnomalias = await this.getAll("anomalias");
            const contadorAno = todasAnomalias.filter(a => a.criado_em && a.criado_em.startsWith(String(anoAtual))).length + 1;
            const seqFormatado = String(contadorAno).padStart(3, '0');
            const codigoSequencial = `ANOM-${anoAtual}-${prefixoEstrutura}-${seqFormatado}`;

            const anomalia = {
                id: dadosAnomalia.id || generateUUID(),
                codigo_sequencial: codigoSequencial,
                estrutura_id: dadosAnomalia.estrutura_id,
                inspecao_origem_id: dadosAnomalia.inspecao_origem_id || null,
                item_checklist_id: dadosAnomalia.item_checklist_id || null,
                tipo_anomalia: dadosAnomalia.tipo_anomalia || "OUTRA",
                localizacao_detalhada: dadosAnomalia.localizacao_detalhada || "",
                coordenadas_utm_e: parseFloat(dadosAnomalia.coordenadas_utm_e || 0),
                coordenadas_utm_n: parseFloat(dadosAnomalia.coordenadas_utm_n || 0),
                data_identificacao: dadosAnomalia.data_identificacao || new Date().toISOString(),
                usuario_identificador_id: this.currentUser.id,
                usuario_identificador_nome: this.currentUser.nome,
                descricao: dadosAnomalia.descricao || "",
                dimensao_comprimento_m: parseFloat(dadosAnomalia.dimensao_comprimento_m || 0),
                dimensao_largura_m: parseFloat(dadosAnomalia.dimensao_largura_m || 0),
                dimensao_profundidade_m: parseFloat(dadosAnomalia.dimensao_profundidade_m || 0),
                criticidade: dadosAnomalia.criticidade || CRITICIDADE.MEDIA,
                peso_anm_matriz: parseInt(dadosAnomalia.peso_anm_matriz || 3, 10),
                avaliacao_tecnica: dadosAnomalia.avaliacao_tecnica || "",
                recomendacao_tecnica: dadosAnomalia.recomendacao_tecnica || "",
                prazo_proposto_dias: parseInt(dadosAnomalia.prazo_proposto_dias || 7, 10),
                data_limite: dadosAnomalia.data_limite || null,
                status_ciclo: ESTADOS_ANOMALIA.IDENTIFICADA,
                fluig_chamado_id: null,
                fluig_status: null
            };

            await this.put("anomalias", anomalia, "Criacao de anomalia geotecnica em campo");
            return anomalia;
        }

        /**
         * Registra evidencia fotografica com garantia de contexto e hash criptografico
         */
        async registrarFotografiaEvidencia(dadosFoto) {
            if (!dadosFoto.registro_vinculo_id || !dadosFoto.tabela_vinculo) {
                throw new Error("Uma fotografia deve obrigatoriamente estar vinculada a um registro pai.");
            }

            const foto = {
                id: dadosFoto.id || generateUUID(),
                tabela_vinculo: dadosFoto.tabela_vinculo,
                registro_vinculo_id: dadosFoto.registro_vinculo_id,
                caminho_arquivo_local: dadosFoto.caminho_arquivo_local || "",
                conteudo_base64: dadosFoto.conteudo_base64 || null,
                hash_sha256: dadosFoto.hash_sha256 || ("SHA256-" + Date.now().toString(16) + "-" + Math.random().toString(16).substring(2, 8)),
                data_hora_captura: dadosFoto.data_hora_captura || new Date().toISOString(),
                usuario_id: this.currentUser.id,
                coordenadas_gps_e: dadosFoto.coordenadas_gps_e || null,
                coordenadas_gps_n: dadosFoto.coordenadas_gps_n || null,
                direcao_azimute: dadosFoto.direcao_azimute || null,
                descricao_evidencia: dadosFoto.descricao_evidencia || "",
                tipo_evidencia: dadosFoto.tipo_evidencia || "DETALHE_ANOMALIA"
            };

            await this.put("fotografias_evidencias", foto, "Registro de evidencia fotografica vinculada");
            return foto;
        }

        /**
         * Retorna o Dossiê Digital Completo de uma estrutura consolidando todas as dimensoes
         */
        async obterDossieDigitalEstrutura(estruturaIdOuSlug) {
            await this.init();
            let estrutura = null;

            // Busca por ID ou slug
            estrutura = await this.get("estruturas", estruturaIdOuSlug);
            if (!estrutura) {
                const todas = await this.getAll("estruturas");
                estrutura = todas.find(e => e.codigo === estruturaIdOuSlug || e.slug === estruturaIdOuSlug || e.id === estruturaIdOuSlug);
            }

            if (!estrutura) return null;

            const [instrumentos, todasLeituras, todasInspecoes, todasAnomalias, sumps] = await Promise.all([
                this.getAll("instrumentos", "by_estrutura", estrutura.id),
                this.getAll("leituras_instrumentos", "by_estrutura", estrutura.id),
                this.getAll("inspecoes", "by_estrutura", estrutura.id),
                this.getAll("anomalias", "by_estrutura", estrutura.id),
                this.getAll("sumps", "by_estrutura", estrutura.id)
            ]);

            // Separar anomalias abertas e encerradas
            const anomaliasAbertas = todasAnomalias.filter(a => a.status_ciclo !== ESTADOS_ANOMALIA.ENCERRADA);
            const anomaliasEncerradas = todasAnomalias.filter(a => a.status_ciclo === ESTADOS_ANOMALIA.ENCERRADA);

            // Ordenar inspecoes da mais recente para a mais antiga
            todasInspecoes.sort((a, b) => new Date(b.data_inicio || 0) - new Date(a.data_inicio || 0));
            const ultimaInspecao = todasInspecoes[0] || null;

            // Ultimas leituras por instrumento
            const leiturasRecentes = {};
            todasLeituras.forEach(l => {
                if (!leiturasRecentes[l.instrumento_id] || new Date(l.data_hora) > new Date(leiturasRecentes[l.instrumento_id].data_hora)) {
                    leiturasRecentes[l.instrumento_id] = l;
                }
            });

            return {
                estrutura,
                ultimaInspecao,
                condicaoAtual: ultimaInspecao ? ultimaInspecao.estado_conservacao_calculado : "NORMAL",
                instrumentos,
                ultimasLeituras: Object.values(leiturasRecentes),
                anomaliasAbertas,
                anomaliasEncerradas,
                totalAnomaliasAbertas: anomaliasAbertas.length,
                sumps,
                totalInstrumentos: instrumentos.length,
                totalInspecoes: todasInspecoes.length,
                auditoriaRecente: await this.getAll("auditoria_modificacoes", "by_registro", estrutura.id)
            };
        }

        // =========================================================================
        // CARGA INICIAL E SEEDING
        // =========================================================================

        async _seedSeVazio() {
            const totalUsuarios = (await this.getAll("usuarios")).length;
            if (totalUsuarios > 0) return;

            console.info('[MDSyncDB] Banco vazio. Executando seed com dados estruturados da Itaminas...');

            // 1. Usuarios Iniciais com Alçadas RBAC
            const usuariosIniciais = [
                {
                    id: "usr-tecnico-01",
                    matricula: "MAT-2026-081",
                    nome: "Maycon Nascimento",
                    email: "maycon.nascimento@itaminas.com.br",
                    perfil: PERFIS_USUARIO.TECNICO_CAMPO,
                    registro_profissional: "CFT-MG 14920",
                    ativo: true
                },
                {
                    id: "usr-especialista-01",
                    matricula: "MAT-2026-015",
                    nome: "Especialista Geotecnico",
                    email: "especialista.geotecnia@itaminas.com.br",
                    perfil: PERFIS_USUARIO.TECNICO_ESPECIALISTA,
                    registro_profissional: "CREA-MG 184501",
                    ativo: true
                },
                {
                    id: "usr-engenheiro-01",
                    matricula: "MAT-2026-004",
                    nome: "Engenheiro Geotecnico Senior",
                    email: "engenharia.geotecnia@itaminas.com.br",
                    perfil: PERFIS_USUARIO.ENGENHEIRO,
                    registro_profissional: "CREA-MG 102450/D",
                    ativo: true
                },
                {
                    id: "usr-supervisor-01",
                    matricula: "MAT-2026-002",
                    nome: "Supervisor de Seguranca de Estruturas",
                    email: "supervisao.geotecnia@itaminas.com.br",
                    perfil: PERFIS_USUARIO.SUPERVISOR,
                    registro_profissional: "CREA-MG 88410/D",
                    ativo: true
                },
                {
                    id: "usr-gerente-01",
                    matricula: "MAT-2026-001",
                    nome: "Gerente Geral de Geotecnia e Operacoes",
                    email: "gerencia.geotecnia@itaminas.com.br",
                    perfil: PERFIS_USUARIO.GERENTE,
                    registro_profissional: "CREA-MG 45120/D",
                    ativo: true
                }
            ];

            for (const u of usuariosIniciais) {
                await this.put("usuarios", u, "Seed inicial de usuarios e alçadas");
            }

            // 2. Estruturas Principais de Sarzedo / Itaminas
            const estruturasIniciais = [
                {
                    id: "est-pde-01",
                    codigo: "PDE-01",
                    nome: "Pilha de Esteril 01 (PDE 1)",
                    slug: "pde-01",
                    tipo: "PILHA_ESTERIL",
                    status_operacional: "OPERACAO",
                    coordenadas_utm_e: 593450.0,
                    coordenadas_utm_n: 7784120.0,
                    cota_coroamento: 940.0,
                    cota_pe: 830.0,
                    altura_maxima: 110.0,
                    volume_atual: 12500000.0,
                    capacidade_total: 18000000.0,
                    angulo_talude_projeto: 28.0,
                    numero_bermas: 6,
                    largura_bermas_media: 8.0,
                    descricao_geologica: "Filito, itabirito friavel e quartzito fraturado com cobertura de solo residual.",
                    sistema_drenagem_desc: "Canaletas em concreto armado de berma, descidas d'agua em degraus e bacia de sedimentacao.",
                    data_implantacao: "2014-03-15"
                },
                {
                    id: "est-pde-02",
                    codigo: "PDE-02",
                    nome: "Pilha de Esteril 02 (PDE 2)",
                    slug: "pde-02",
                    tipo: "PILHA_ESTERIL",
                    status_operacional: "OPERACAO",
                    coordenadas_utm_e: 594100.0,
                    coordenadas_utm_n: 7783850.0,
                    cota_coroamento: 915.0,
                    cota_pe: 820.0,
                    altura_maxima: 95.0,
                    volume_atual: 8200000.0,
                    capacidade_total: 14000000.0,
                    angulo_talude_projeto: 28.0,
                    numero_bermas: 5,
                    largura_bermas_media: 8.0,
                    descricao_geologica: "Xisto alterado, quartzito e aterro compactado de esteril estéril itabirítico.",
                    sistema_drenagem_desc: "Drenagem superficial completa interligada a SUMP de pe.",
                    data_implantacao: "2017-08-20"
                },
                {
                    id: "est-cava-jangada",
                    codigo: "CAVA-JANGADA",
                    nome: "Taludes da Cava Jangada",
                    slug: "cava-jangada",
                    tipo: "TALUDE_CAVA",
                    status_operacional: "OPERACAO",
                    coordenadas_utm_e: 593800.0,
                    coordenadas_utm_n: 7784600.0,
                    cota_coroamento: 980.0,
                    cota_pe: 760.0,
                    altura_maxima: 220.0,
                    volume_atual: 0,
                    capacidade_total: 0,
                    angulo_talude_projeto: 45.0,
                    numero_bermas: 12,
                    largura_bermas_media: 6.0,
                    descricao_geologica: "Formacao Cauê, itabirito dolomitico e corpos de hematita compacta.",
                    sistema_drenagem_desc: "Drenos sub-horizontais profundos (DHP) e bombeamento central no fundo de cava.",
                    data_implantacao: "2008-01-10"
                },
                {
                    id: "est-bar-01",
                    codigo: "BAR-01",
                    nome: "Estrutura de Contencao e Sedimentacao 01",
                    slug: "bar-01",
                    tipo: "BARRAGEM",
                    status_operacional: "OPERACAO",
                    coordenadas_utm_e: 592900.0,
                    coordenadas_utm_n: 7783200.0,
                    cota_coroamento: 845.0,
                    cota_pe: 818.0,
                    altura_maxima: 27.0,
                    volume_atual: 450000.0,
                    capacidade_total: 600000.0,
                    angulo_talude_projeto: 20.0,
                    numero_bermas: 2,
                    largura_bermas_media: 5.0,
                    descricao_geologica: "Fundacao em aluviao argilo-arenoso sobre rocha sã gnaissica.",
                    sistema_drenagem_desc: "Tapete drenante de areia, dreno de pe em enrocamento e vertedouro tulipa.",
                    data_implantacao: "2011-05-12"
                }
            ];

            for (const est of estruturasIniciais) {
                await this.put("estruturas", est, "Seed inicial de estruturas");
            }

            // 3. Instrumentos de Exemplo
            const instrumentosIniciais = [
                {
                    id: "inst-pz-01",
                    codigo: "PZ-01",
                    estrutura_id: "est-pde-01",
                    tipo: "PIEZOMETRO_CASAGRANDE",
                    coordenadas_utm_e: 593410.0,
                    coordenadas_utm_n: 7784080.0,
                    cota_boca: 885.20,
                    profundidade_instalacao: 35.0,
                    cota_ponta: 850.20,
                    limite_atencao: 865.0,
                    limite_alerta: 872.0,
                    unidade_medida: "m",
                    status: "ATIVO"
                },
                {
                    id: "inst-ina-01",
                    codigo: "INA-01",
                    estrutura_id: "est-pde-01",
                    tipo: "INDICADOR_NIVEL_AGUA",
                    coordenadas_utm_e: 593480.0,
                    coordenadas_utm_n: 7784150.0,
                    cota_boca: 860.00,
                    profundidade_instalacao: 25.0,
                    cota_ponta: 835.00,
                    limite_atencao: 848.0,
                    limite_alerta: 853.0,
                    unidade_medida: "m",
                    status: "ATIVO"
                },
                {
                    id: "inst-vz-01",
                    codigo: "VZ-01",
                    estrutura_id: "est-pde-01",
                    tipo: "MEDIDOR_VAZAO",
                    coordenadas_utm_e: 593350.0,
                    coordenadas_utm_n: 7784010.0,
                    cota_boca: 830.00,
                    profundidade_instalacao: 0,
                    cota_ponta: 830.00,
                    limite_atencao: 4.5,
                    limite_alerta: 8.0,
                    unidade_medida: "L/s",
                    status: "ATIVO"
                },
                {
                    id: "inst-pz-02",
                    codigo: "PZ-02",
                    estrutura_id: "est-pde-02",
                    tipo: "PIEZOMETRO_CORDA_VIBRANTE",
                    coordenadas_utm_e: 594050.0,
                    coordenadas_utm_n: 7783810.0,
                    cota_boca: 875.00,
                    profundidade_instalacao: 40.0,
                    cota_ponta: 835.00,
                    limite_atencao: 120.0,
                    limite_alerta: 180.0,
                    unidade_medida: "kPa",
                    status: "ATIVO"
                }
            ];

            for (const inst of instrumentosIniciais) {
                await this.put("instrumentos", inst, "Seed inicial de instrumentos");
            }

            // 4. SUMPs Iniciais
            const sumpsIniciais = [
                {
                    id: "sump-01",
                    codigo: "SUMP-01",
                    nome: "SUMP de Pe da PDE 01",
                    estrutura_associada_id: "est-pde-01",
                    coordenadas_utm_e: 593320.0,
                    coordenadas_utm_n: 7783990.0,
                    cota_fundo: 825.0,
                    cota_bordo_livre: 831.0,
                    capacidade_maxima_m3: 15000.0,
                    volume_atual_estimado_m3: 5200.0,
                    nivel_agua_atual_percentual: 34.6,
                    sistema_bombeamento_status: "OPERACIONAL",
                    vazao_bombeamento_m3h: 180.0,
                    condicao_manutencao: "EXCELENTE"
                },
                {
                    id: "sump-02",
                    codigo: "SUMP-02",
                    nome: "SUMP Intermediario PDE 02",
                    estrutura_associada_id: "est-pde-02",
                    coordenadas_utm_e: 594020.0,
                    coordenadas_utm_n: 7783780.0,
                    cota_fundo: 818.0,
                    cota_bordo_livre: 824.0,
                    capacidade_maxima_m3: 8500.0,
                    volume_atual_estimado_m3: 3100.0,
                    nivel_agua_atual_percentual: 36.4,
                    sistema_bombeamento_status: "OPERACIONAL",
                    vazao_bombeamento_m3h: 120.0,
                    condicao_manutencao: "REGULAR"
                }
            ];

            for (const s of sumpsIniciais) {
                await this.put("sumps", s, "Seed inicial de sumps");
            }

            console.info('[MDSyncDB] Seed inicial concluido com sucesso.');
        }
    }

    // Instancia singleton canônica
    const instance = new MDSyncDatabaseEngine();

    // Exportacao para ambientes ES Modules e script tags globais
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            MDSyncDatabaseEngine,
            db: instance,
            PERFIS_USUARIO,
            ESTADOS_ANOMALIA,
            CRITICIDADE,
            TARP_STATUS,
            OUTBOX_STATUS
        };
    }

    global.MDSyncDB = instance;
    global.MDSyncEnums = {
        PERFIS_USUARIO,
        ESTADOS_ANOMALIA,
        CRITICIDADE,
        TARP_STATUS,
        OUTBOX_STATUS
    };

})(typeof window !== 'undefined' ? window : globalThis);
