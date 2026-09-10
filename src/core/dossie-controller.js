/**
 * MDSync Dossiê Digital & Checklist Controller (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Gerencia a apresentacao e interacao com o Dossie Digital de Estruturas,
 * o Checklist Normativo de Inspecao Visual de 26 itens (ANM 95/2022) e a
 * gestao integrada do ciclo de vida de anomalias, sumps e exportacoes tecnicas.
 */

(function (global) {
    'use strict';

    // Lista padronizada dos 26 itens normativos de inspecao visual da especificacao
    const ITENS_CHECKLIST_PADRAO = [
        { id: "chk-01", componente: "CRISTA", label: "Crista da Estrutura (alinhamento, fissuras e greide)", peso: 2 },
        { id: "chk-02", componente: "TALUDES", label: "Taludes (estabilidade geral, conformacao e abaulamentos)", peso: 3 },
        { id: "chk-03", componente: "BERMAS", label: "Bermas de Equilibrio (largura util e integridade)", peso: 2 },
        { id: "chk-04", componente: "PE", label: "Regiao de Pe do Talude (surgencias e deformacoes)", peso: 4 },
        { id: "chk-05", componente: "ACESSOS", label: "Vias de Acesso e Rampas Operacionais", peso: 1 },
        { id: "chk-06", componente: "GREIDE", label: "Greide e Nivelamento das Bermas", peso: 1 },
        { id: "chk-07", componente: "GEOMETRIA", label: "Geometria Geral frente ao Projeto Executivo", peso: 2 },
        { id: "chk-08", componente: "ANGULO_TALUDES", label: "Angulo de Inclinacao dos Taludes", peso: 3 },
        { id: "chk-09", componente: "DRENAGEM_SUPERFICIAL", label: "Drenagem Superficial Geral", peso: 3 },
        { id: "chk-10", componente: "CANAIS", label: "Canais Coletores de Aguas Pluviais", peso: 2 },
        { id: "chk-11", componente: "CANAL_PERIFERICO", label: "Canal Periferico de Contorno", peso: 3 },
        { id: "chk-12", componente: "CANALETAS", label: "Canaletas de Berma (revestimento e trincas)", peso: 2 },
        { id: "chk-13", componente: "DESCIDAS_AGUA", label: "Descidas d'Agua em Degraus / Rapidas", peso: 3 },
        { id: "chk-14", componente: "EROSOES", label: "Ocorrencia de Erosoes Superficiais", peso: 3 },
        { id: "chk-15", componente: "RAVINAMENTOS", label: "Ravinamentos e Sulcos de Erosao", peso: 3 },
        { id: "chk-16", componente: "TRINCAS", label: "Trincas Longitudinais ou Transversais", peso: 4 },
        { id: "chk-17", componente: "DEPRESSOES", label: "Depressoes e Abatimentos de Superficie", peso: 3 },
        { id: "chk-18", componente: "RECALQUES", label: "Recalques Diferenciais Observaveis", peso: 4 },
        { id: "chk-19", componente: "ESCORREGAMENTOS", label: "Escorregamentos ou Movimentacoes de Massa", peso: 5 },
        { id: "chk-20", componente: "SURGENCIAS", label: "Surgencias de Agua com ou sem Carreamento", peso: 5 },
        { id: "chk-21", componente: "AREAS_SATURADAS", label: "Manchas de Umidade ou Areas Saturadas", peso: 3 },
        { id: "chk-22", componente: "VEGETACAO", label: "Cobertura Vegetal e Presenca de Arbustos Indesejados", peso: 1 },
        { id: "chk-23", componente: "HETEROGENEIDADE", label: "Heterogeneidade do Material Disposto", peso: 2 },
        { id: "chk-24", componente: "HOMOGENEIDADE", label: "Homogeneidade da Superficie e Espalhamento", peso: 1 },
        { id: "chk-25", componente: "BLOCOS", label: "Matacoes, Blocos Soltos ou Risco de Rolamento", peso: 3 },
        { id: "chk-26", componente: "MANUTENCAO", label: "Condicao Geral de Limpeza e Manutencao", peso: 2 }
    ];

    class DossieController {
        constructor() {
            this.db = global.MDSyncDB;
            this.estruturaAtiva = null;
            this.dossieAtual = null;
            this.abaAtiva = "identificacao";
            this.respostasChecklist = {};
        }

        async init() {
            if (this.db) {
                await this.db.init();
            }
            this._atualizarBadgeUsuarioHeader();
            if (global.SyncBridge && typeof global.SyncBridge.on === 'function') {
                global.SyncBridge.on('MDSYNC_USER_CHANGED', (payload) => {
                    if (payload && payload.user) {
                        this._atualizarBadgeUsuarioHeader(payload.user);
                    }
                });
            }
        }

        _atualizarBadgeUsuarioHeader(usuario = null) {
            const user = usuario || (this.db ? this.db.currentUser : null);
            if (!user) return;
            const nameEl = document.getElementById('header-user-name');
            const roleEl = document.getElementById('header-user-role');
            const avatarEl = document.getElementById('header-user-avatar');

            if (nameEl) nameEl.textContent = user.nome;
            if (roleEl) {
                const perfisLegiveis = {
                    TECNICO_CAMPO: "Técnico Campo",
                    TECNICO_ESPECIALISTA: "Especialista",
                    ENGENHEIRO: "Engenheiro",
                    SUPERVISOR: "Supervisor",
                    GERENTE: "Gerente"
                };
                roleEl.textContent = perfisLegiveis[user.perfil] || user.perfil;
            }
            if (avatarEl) {
                const iniciais = user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                avatarEl.textContent = iniciais || 'US';
            }
        }

        /**
         * Abre a interface do Dossie Digital de uma estrutura
         */
        async abrirDossie(estruturaCodigoOuId) {
            await this.init();
            const modal = document.getElementById('mdsync-dossie-modal');
            if (!modal) {
                console.warn('[Dossie] Modal de dossie mdsync-dossie-modal nao localizado no DOM.');
                return;
            }

            const dossie = await this.db.obterDossieDigitalEstrutura(estruturaCodigoOuId || "PDE-01");
            if (!dossie) {
                if (window.showToast) window.showToast("Dossiê Digital", "Estrutura nao localizada.", "warning");
                return;
            }

            this.estruturaAtiva = dossie.estrutura;
            this.dossieAtual = dossie;
            this.abaAtiva = "identificacao";

            this._renderizarCabecalho();
            this._renderizarAbaAtiva();

            modal.classList.add('active');
            modal.style.display = 'flex';
        }

        fecharDossie() {
            const modal = document.getElementById('mdsync-dossie-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }

        trocarAba(nomeAba) {
            this.abaAtiva = nomeAba;
            
            // Atualizar classes dos botoes de aba
            const tabs = document.querySelectorAll('.dossie-tab-btn');
            tabs.forEach(btn => {
                if (btn.getAttribute('data-tab') === nomeAba) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            this._renderizarAbaAtiva();
        }

        _renderizarCabecalho() {
            const tituloEl = document.getElementById('dossie-modal-title');
            const subEl = document.getElementById('dossie-modal-subtitle');
            const badgeCond = document.getElementById('dossie-modal-condicao-badge');

            if (tituloEl && this.estruturaAtiva) {
                tituloEl.textContent = `Dossiê Digital: ${this.estruturaAtiva.codigo} (${this.estruturaAtiva.nome})`;
            }
            if (subEl && this.estruturaAtiva) {
                subEl.textContent = `Tipo: ${this.estruturaAtiva.tipo} | Coordenadas UTM: E ${this.estruturaAtiva.coordenadas_utm_e} / N ${this.estruturaAtiva.coordenadas_utm_n} (SIRGAS 2000)`;
            }
            if (badgeCond && this.dossieAtual) {
                const cond = this.dossieAtual.condicaoAtual || "NORMAL";
                badgeCond.textContent = `Condição: ${cond}`;
                badgeCond.className = `dossie-badge-condicao ${cond === 'NORMAL' ? 'badge-success' : 'badge-warning'}`;
            }
        }

        _renderizarAbaAtiva() {
            const contentContainer = document.getElementById('dossie-tab-content');
            if (!contentContainer || !this.dossieAtual) return;

            switch (this.abaAtiva) {
                case "identificacao":
                    contentContainer.innerHTML = this._gerarHtmlIdentificacao();
                    break;
                case "instrumentacao":
                    contentContainer.innerHTML = this._gerarHtmlInstrumentacao();
                    break;
                case "checklist":
                    contentContainer.innerHTML = this._gerarHtmlChecklist();
                    break;
                case "anomalias":
                    contentContainer.innerHTML = this._gerarHtmlAnomalias();
                    break;
                case "sumps":
                    contentContainer.innerHTML = this._gerarHtmlSumps();
                    break;
                case "estabilidade":
                    contentContainer.innerHTML = this._gerarHtmlEstabilidade();
                    break;
                case "exportacao":
                    contentContainer.innerHTML = this._gerarHtmlExportacao();
                    break;
                default:
                    contentContainer.innerHTML = `<p class="p-3 text-secondary">Aba em desenvolvimento.</p>`;
            }
        }

        _gerarHtmlIdentificacao() {
            const est = this.estruturaAtiva;
            return `
                <div class="dossie-grid-cards">
                    <div class="dossie-info-card">
                        <h4><i class="fa-solid fa-mountain"></i> Características Físicas & Geometria</h4>
                        <div class="dossie-meta-list">
                            <div><span>Cota do Coroamento:</span> <strong>${est.cota_coroamento} m</strong></div>
                            <div><span>Cota de Pé:</span> <strong>${est.cota_pe} m</strong></div>
                            <div><span>Altura Máxima:</span> <strong>${est.altura_maxima} m</strong></div>
                            <div><span>Volume Atual:</span> <strong>${(est.volume_atual || 0).toLocaleString('pt-BR')} m³</strong></div>
                            <div><span>Capacidade Total:</span> <strong>${(est.capacidade_total || 0).toLocaleString('pt-BR')} m³</strong></div>
                            <div><span>Ângulo do Talude:</span> <strong>${est.angulo_talude_projeto}°</strong></div>
                            <div><span>Número de Bermas:</span> <strong>${est.numero_bermas}</strong></div>
                            <div><span>Largura Média das Bermas:</span> <strong>${est.largura_bermas_media} m</strong></div>
                        </div>
                    </div>

                    <div class="dossie-info-card">
                        <h4><i class="fa-solid fa-layer-group"></i> Geologia & Drenagem</h4>
                        <p class="small text-secondary mb-2"><strong>Contexto Geotécnico:</strong></p>
                        <p class="small text-muted mb-3">${est.descricao_geologica || "Informação em atualização cadastral."}</p>
                        <p class="small text-secondary mb-2"><strong>Sistema de Drenagem:</strong></p>
                        <p class="small text-muted">${est.sistema_drenagem_desc || "Drenagem superficial padronizada com canaletas e descidas d'água."}</p>
                    </div>

                    <div class="dossie-info-card full-width">
                        <h4><i class="fa-solid fa-clock-rotate-left"></i> Resumo Executivo da Última Inspeção</h4>
                        ${this.dossieAtual.ultimaInspecao ? `
                            <div class="d-flex justify-between align-center">
                                <div>
                                    <p class="mb-1"><strong>Data da Vistoria:</strong> ${new Date(this.dossieAtual.ultimaInspecao.data_inicio).toLocaleString('pt-BR')}</p>
                                    <p class="mb-1 text-secondary small">Responsável: ${this.dossieAtual.ultimaInspecao.usuario_nome || 'Equipe Geotécnica'}</p>
                                    <p class="mb-0 text-secondary small">Diagnóstico: <em>${this.dossieAtual.ultimaInspecao.diagnostico_geral || 'Estrutura operando em parâmetros normais de estabilidade.'}</em></p>
                                </div>
                                <div>
                                    <span class="badge badge-success" style="font-size:14px; padding:8px 14px;">Estado de Conservação: ${this.dossieAtual.ultimaInspecao.estado_conservacao_calculado || 'NORMAL'}</span>
                                </div>
                            </div>
                        ` : `
                            <p class="text-secondary small">Nenhuma inspeção formal registrada no período corrente. Utilize a aba "Checklist" para iniciar uma vistoria em campo.</p>
                        `}
                    </div>
                </div>
            `;
        }

        _gerarHtmlInstrumentacao() {
            const insts = this.dossieAtual.instrumentos;
            if (!insts.length) {
                return `<div class="p-4 text-center text-secondary"><i class="fa-solid fa-gauge-simple fa-2x mb-2"></i><p>Nenhum instrumento cadastrado para esta estrutura.</p></div>`;
            }

            return `
                <div class="dossie-table-container">
                    <div class="d-flex justify-between align-center mb-3">
                        <span class="font-bold">Instrumentação Geotécnica Cadastrada (${insts.length})</span>
                        <button class="btn btn-secondary btn-sm" onclick="window.MDSyncDossie.exportarCSV()">
                            <i class="fa-solid fa-file-csv"></i> Exportar Séries GeoStudio (CSV)
                        </button>
                    </div>
                    <table class="dossie-data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Tipo</th>
                                <th>Cota Boca</th>
                                <th>Cota Ponta</th>
                                <th>Limite Atenção</th>
                                <th>Limite Alerta</th>
                                <th>Última Leitura</th>
                                <th>Status TARP</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${insts.map(i => {
                                const ultLeitura = this.dossieAtual.ultimasLeituras.find(l => l.instrumento_id === i.id);
                                const tarp = ultLeitura ? ultLeitura.status_tarp : "NORMAL";
                                const tarpClass = tarp === 'NORMAL' ? 'badge-success' : (tarp === 'ATENCAO' ? 'badge-warning' : 'badge-danger');
                                return `
                                    <tr>
                                        <td><strong>${i.codigo}</strong></td>
                                        <td><span class="badge badge-outline">${i.tipo}</span></td>
                                        <td>${i.cota_boca} m</td>
                                        <td>${i.cota_ponta} m</td>
                                        <td>${i.limite_atencao} ${i.unidade_medida}</td>
                                        <td>${i.limite_alerta} ${i.unidade_medida}</td>
                                        <td>
                                            ${ultLeitura ? `
                                                <strong>${ultLeitura.valor_medido} ${ultLeitura.unidade}</strong>
                                                <br><small class="text-secondary">${new Date(ultLeitura.data_hora).toLocaleDateString('pt-BR')}</small>
                                            ` : '<span class="text-muted small">Sem leituras</span>'}
                                        </td>
                                        <td><span class="badge ${tarpClass}">${tarp}</span></td>
                                        <td>
                                            <button class="btn btn-primary btn-sm" onclick="window.Sysdam.openQuickReading('${i.id}')">
                                                <i class="fa-solid fa-plus"></i> Ler
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        _gerarHtmlChecklist() {
            return `
                <div class="dossie-checklist-wrapper">
                    <div class="d-flex justify-between align-center mb-3">
                        <div>
                            <h4 style="margin:0;">Inspeção Visual de Campo (Resolução ANM 95/2022)</h4>
                            <p class="small text-secondary mb-0">Avalie cada item rigorosamente. Itens "Não Conforme" abrem ficha de anomalia automaticamente.</p>
                        </div>
                        <button class="btn btn-primary" onclick="window.MDSyncDossie.salvarChecklistInspecao()">
                            <i class="fa-solid fa-check-double"></i> Concluir Vistoria e Salvar
                        </button>
                    </div>

                    <div class="dossie-checklist-grid">
                        ${ITENS_CHECKLIST_PADRAO.map((item, idx) => `
                            <div class="checklist-item-card" id="card-${item.id}">
                                <div class="d-flex justify-between align-center mb-2">
                                    <span class="badge badge-secondary">${idx + 1}. ${item.componente}</span>
                                    <span class="text-muted small">Peso: ${item.peso}</span>
                                </div>
                                <p class="small font-bold mb-2">${item.label}</p>
                                <div class="checklist-radio-group">
                                    <label><input type="radio" name="res_${item.id}" value="CONFORME" checked onchange="window.MDSyncDossie.atualizarRespostaItem('${item.id}', 'CONFORME')"> C</label>
                                    <label><input type="radio" name="res_${item.id}" value="NAO_CONFORME" onchange="window.MDSyncDossie.atualizarRespostaItem('${item.id}', 'NAO_CONFORME')"> NC</label>
                                    <label><input type="radio" name="res_${item.id}" value="NECESSITA_AVALIACAO" onchange="window.MDSyncDossie.atualizarRespostaItem('${item.id}', 'NECESSITA_AVALIACAO')"> Aval.</label>
                                    <label><input type="radio" name="res_${item.id}" value="NAO_APLICAVEL" onchange="window.MDSyncDossie.atualizarRespostaItem('${item.id}', 'NAO_APLICAVEL')"> N/A</label>
                                </div>
                                <input type="text" class="form-control form-control-sm mt-2" placeholder="Observações de campo..." id="obs_${item.id}">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        atualizarRespostaItem(itemId, resultado) {
            this.respostasChecklist[itemId] = resultado;
            const card = document.getElementById(`card-${itemId}`);
            if (card) {
                if (resultado === 'NAO_CONFORME') {
                    card.style.borderColor = '#ef4444';
                    card.style.background = 'rgba(239, 68, 68, 0.08)';
                } else if (resultado === 'NECESSITA_AVALIACAO') {
                    card.style.borderColor = '#f59e0b';
                    card.style.background = 'rgba(245, 158, 11, 0.08)';
                } else {
                    card.style.borderColor = '';
                    card.style.background = '';
                }
            }
        }

        async salvarChecklistInspecao() {
            const naoConformes = Object.entries(this.respostasChecklist).filter(([_, val]) => val === 'NAO_CONFORME');

            // Salva a inspecao no banco IndexedDB
            const inspecao = {
                id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'insp-' + Date.now()),
                estrutura_id: this.estruturaAtiva.id,
                usuario_responsavel_id: this.db.currentUser.id,
                usuario_nome: this.db.currentUser.nome,
                tipo_inspecao: "REGULAR_FIR",
                data_inicio: new Date().toISOString(),
                data_fim: new Date().toISOString(),
                diagnostico_geral: naoConformes.length ? `Inspeção concluída com ${naoConformes.length} não conformidade(s) registrada(s).` : "Inspeção visual concluída sem anomalias observadas.",
                estado_conservacao_calculado: naoConformes.length > 2 ? "ALERTA" : (naoConformes.length > 0 ? "ATENCAO" : "NORMAL"),
                status_fluxo: "FINALIZADA_CAMPO"
            };

            await this.db.put("inspecoes", inspecao, "Conclusao de checklist visual de inspecao");

            // Se houver itens nao conformes, abre modal para criar anomalia automaticamente
            if (naoConformes.length > 0) {
                const primeiroItemId = naoConformes[0][0];
                const itemMeta = ITENS_CHECKLIST_PADRAO.find(i => i.id === primeiroItemId) || {};
                
                await this.db.criarAnomalia({
                    estrutura_id: this.estruturaAtiva.id,
                    inspecao_origem_id: inspecao.id,
                    tipo_anomalia: itemMeta.componente || "OUTRA",
                    descricao: `Não conformidade constatada no item: ${itemMeta.label}`,
                    criticidade: "MEDIA",
                    coordenadas_utm_e: this.estruturaAtiva.coordenadas_utm_e,
                    coordenadas_utm_n: this.estruturaAtiva.coordenadas_utm_n
                });

                if (window.showToast) {
                    window.showToast("Inspeção Concluída", `Vistoria salva. ${naoConformes.length} anomalia(s) gerada(s) automaticamente na aba de Anomalias.`, "warning", 5000);
                }
            } else {
                if (window.showToast) {
                    window.showToast("Inspeção Concluída", "Vistoria visual registrada com 100% de conformidade.", "success", 4000);
                }
            }

            // Atualiza dossie
            await this.abrirDossie(this.estruturaAtiva.id);
            this.trocarAba("anomalias");
        }

        _gerarHtmlAnomalias() {
            const anomalias = this.dossieAtual.anomaliasAbertas;
            return `
                <div class="dossie-anomalias-wrapper">
                    <div class="d-flex justify-between align-center mb-3">
                        <span class="font-bold">Anomalias Ativas em Ciclo de Vida (${anomalias.length})</span>
                        <button class="btn btn-primary btn-sm" onclick="window.MDSyncDossie.abrirModalNovaAnomalia()">
                            <i class="fa-solid fa-plus"></i> Registrar Anomalia em Campo
                        </button>
                    </div>

                    ${!anomalias.length ? `
                        <div class="p-4 text-center text-secondary">
                            <i class="fa-solid fa-shield-check fa-2x mb-2 text-success"></i>
                            <p>Nenhuma anomalia ativa no momento para esta estrutura.</p>
                        </div>
                    ` : `
                        <div class="dossie-anomalias-list">
                            ${anomalias.map(a => {
                                const critBadge = a.criticidade === 'MUITO_ALTA' || a.criticidade === 'ALTA' ? 'badge-danger' : 'badge-warning';
                                return `
                                    <div class="anomalia-card-item">
                                        <div class="d-flex justify-between align-center mb-2">
                                            <div>
                                                <strong>${a.codigo_sequencial || a.id}</strong>
                                                <span class="badge ${critBadge} ml-2">${a.criticidade}</span>
                                                <span class="badge badge-outline ml-1">${a.tipo_anomalia}</span>
                                            </div>
                                            <span class="badge badge-primary" style="font-size:12px;">Estado: ${a.status_ciclo}</span>
                                        </div>
                                        <p class="small text-secondary mb-2">${a.descricao}</p>
                                        <p class="small text-muted mb-3">
                                            <strong>Local:</strong> ${a.localizacao_detalhada || 'Coordenadas do talude'} | 
                                            <strong>Dimensões:</strong> ${a.dimensao_comprimento_m || 0}m comp. x ${a.dimensao_largura_m || 0}m larg. x ${a.dimensao_profundidade_m || 0}m prof.
                                        </p>

                                        <div class="d-flex justify-between align-center pt-2" style="border-top:1px solid rgba(255,255,255,0.06);">
                                            <div class="small text-secondary">
                                                ${a.fluig_chamado_id ? `
                                                    <span class="text-success"><i class="fa-solid fa-link"></i> Fluig OS: <strong>${a.fluig_chamado_id}</strong></span>
                                                ` : `
                                                    <span class="text-muted"><i class="fa-solid fa-unlink"></i> Sem chamado Fluig</span>
                                                `}
                                            </div>
                                            <div class="d-flex gap-2">
                                                ${!a.fluig_chamado_id ? `
                                                    <button class="btn btn-secondary btn-sm" onclick="window.MDSyncDossie.abrirChamadoFluig('${a.id}')">
                                                        <i class="fa-solid fa-ticket"></i> Gerar Ordem Fluig
                                                    </button>
                                                ` : ''}
                                                <button class="btn btn-primary btn-sm" onclick="window.MDSyncDossie.gerenciarCicloAnomalia('${a.id}')">
                                                    <i class="fa-solid fa-arrow-right"></i> Avançar Ciclo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;
        }

        _gerarHtmlSumps() {
            const sumps = this.dossieAtual.sumps;
            return `
                <div class="dossie-sumps-wrapper">
                    <div class="d-flex justify-between align-center mb-3">
                        <div>
                            <h4 style="margin:0;"><i class="fa-solid fa-water text-primary"></i> Bacias de Acúmulo e SUMPs Associados (${sumps.length})</h4>
                            <p class="small text-secondary mb-0">Controle individual de cotas, nível d'água, volume estimado e integridade do bombeamento.</p>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="window.MDSyncDossie.abrirModalNovoSump()">
                            <i class="fa-solid fa-plus"></i> Cadastrar Novo SUMP
                        </button>
                    </div>

                    ${!sumps.length ? `
                        <div class="p-4 text-center text-secondary">
                            <i class="fa-solid fa-water fa-2x mb-2 text-muted"></i>
                            <p>Nenhum SUMP cadastrado para esta estrutura.</p>
                        </div>
                    ` : `
                        <div class="dossie-grid-cards">
                            ${sumps.map(s => {
                                const nivelClass = s.nivel_agua_atual_percentual > 80 ? 'badge-danger' : (s.nivel_agua_atual_percentual > 60 ? 'badge-warning' : 'badge-success');
                                const bombaClass = s.sistema_bombeamento_status === 'OPERACIONAL' ? 'badge-success' : 'badge-danger';
                                return `
                                    <div class="dossie-info-card">
                                        <div class="d-flex justify-between align-center mb-2">
                                            <strong>${s.codigo} (${s.nome})</strong>
                                            <span class="badge ${nivelClass}">Nível: ${s.nivel_agua_atual_percentual}%</span>
                                        </div>
                                        <div class="dossie-meta-list mb-3">
                                            <div><span>Capacidade Máxima:</span> <strong>${(s.capacidade_maxima_m3 || 0).toLocaleString('pt-BR')} m³</strong></div>
                                            <div><span>Volume Atual Estimado:</span> <strong>${(s.volume_atual_estimado_m3 || 0).toLocaleString('pt-BR')} m³</strong></div>
                                            <div><span>Cota Fundo:</span> <strong>${s.cota_fundo} m</strong></div>
                                            <div><span>Cota Bordo Livre:</span> <strong>${s.cota_bordo_livre} m</strong></div>
                                            <div><span>Sistema Bombeamento:</span> <span class="badge ${bombaClass}">${s.sistema_bombeamento_status}</span></div>
                                            <div><span>Vazão de Bombeamento:</span> <strong>${s.vazao_bombeamento_m3h} m³/h</strong></div>
                                            <div><span>Condição de Manutenção:</span> <strong>${s.condicao_manutencao}</strong></div>
                                            <div><span>Última Inspeção:</span> <small class="text-secondary">${s.data_ultima_inspecao ? new Date(s.data_ultima_inspecao).toLocaleDateString('pt-BR') : 'Sem registro'}</small></div>
                                        </div>
                                        <div class="pt-2" style="border-top:1px solid rgba(255,255,255,0.06);">
                                            <button class="btn btn-secondary btn-sm w-100" onclick="window.MDSyncDossie.abrirModalVistoriaSump('${s.id}')">
                                                <i class="fa-solid fa-pen-to-square"></i> Registrar Vistoria / Atualizar Nível
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;
        }

        _gerarHtmlEstabilidade() {
            const analises = this.dossieAtual.analisesGeotecnicas || [];
            return `
                <div class="dossie-estabilidade-wrapper">
                    <div class="d-flex justify-between align-center mb-3">
                        <div>
                            <h4 style="margin:0;"><i class="fa-solid fa-chart-line text-primary"></i> Análises de Estabilidade & Interoperabilidade (Seção 19)</h4>
                            <p class="small text-secondary mb-0">Solicitações formais de modelagem geotécnica, condições de contorno e Fatores de Segurança (FS).</p>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-secondary btn-sm" onclick="window.MDSyncExportador.exportarPacoteCompletoEstabilidade('${this.estruturaAtiva.id}')">
                                <i class="fa-solid fa-file-zipper"></i> Pacote Geral (ZIP)
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="window.MDSyncDossie.abrirModalNovaAnalise()">
                                <i class="fa-solid fa-plus"></i> Nova Solicitação
                            </button>
                        </div>
                    </div>

                    ${!analises.length ? `
                        <div class="p-4 text-center text-secondary">
                            <i class="fa-solid fa-chart-area fa-2x mb-2 text-muted"></i>
                            <p>Nenhuma solicitação de análise de estabilidade registrada para esta estrutura.</p>
                        </div>
                    ` : `
                        <div class="dossie-grid-cards">
                            ${analises.map(a => {
                                const statusClass = a.status === 'CONCLUIDA' ? 'badge-success' : (a.status === 'EM_MODELAGEM' ? 'badge-warning' : 'badge-primary');
                                const fs = a.fator_seguranca_calculado;
                                const fsBadge = fs ? (fs >= 1.50 ? 'badge-success' : 'badge-danger') : 'badge-secondary';
                                const params = a.parametros_geotecnicos || {};
                                return `
                                    <div class="dossie-info-card">
                                        <div class="d-flex justify-between align-center mb-2">
                                            <strong>${a.codigo}</strong>
                                            <span class="badge ${statusClass}">${a.status}</span>
                                        </div>
                                        <p class="small text-secondary mb-2">${a.motivo}</p>
                                        <div class="dossie-meta-list mb-3">
                                            <div><span>Software Alvo:</span> <strong class="text-primary">${a.software_alvo}</strong></div>
                                            <div><span>Seção Analisada:</span> <strong>${a.secao_geotecnica}</strong></div>
                                            <div><span>Carregamento:</span> <strong>${a.condicao_carregamento}</strong></div>
                                            <div><span>Parâmetros:</span> <small>c'=${params.coeso_kpa || 15}kPa, phi'=${params.atrito_graus || 32}°, gamma=${params.peso_especifico_kn_m3 || 20.5}kN/m³</small></div>
                                            <div><span>Fator de Segurança (FS):</span> <strong class="badge ${fsBadge}">${fs ? fs.toFixed(2) : 'Em cálculo'}</strong></div>
                                            <div><span>Solicitante:</span> <small>${a.solicitante_nome} (${a.solicitante_perfil})</small></div>
                                        </div>
                                        ${a.parecer_conclusivo ? `
                                            <div class="p-2 mb-3 rounded" style="background:rgba(255,255,255,0.04); border-left:3px solid #10b981;">
                                                <p class="small mb-0 text-muted"><strong>Parecer:</strong> ${a.parecer_conclusivo}</p>
                                            </div>
                                        ` : ''}
                                        <div class="d-flex gap-2 pt-2" style="border-top:1px solid rgba(255,255,255,0.06);">
                                            <button class="btn btn-secondary btn-sm flex-1" onclick="window.MDSyncExportador.exportarPacoteCompletoEstabilidade('${this.estruturaAtiva.id}', '${a.id}')">
                                                <i class="fa-solid fa-download"></i> Baixar ZIP
                                            </button>
                                            ${a.status !== 'CONCLUIDA' ? `
                                                <button class="btn btn-primary btn-sm" onclick="window.MDSyncDossie.atualizarResultadoAnalise('${a.id}')">
                                                    <i class="fa-solid fa-clipboard-check"></i> Lançar FS
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;
        }

        _gerarHtmlExportacao() {
            return `
                <div class="dossie-export-wrapper p-3">
                    <h4 class="mb-3">Interoperabilidade & Pacotes de Exportação Geotécnica</h4>
                    <p class="text-secondary small mb-4">Gere arquivos nos formatos canônicos neutros para modelagem 3D, análises de estabilidade e auditoria corporativa.</p>

                    <div class="d-flex gap-3 flex-wrap">
                        <div class="dossie-info-card" style="flex:1; min-width:280px;">
                            <h5><i class="fa-solid fa-file-csv text-primary"></i> Séries Temporais (CSV GeoStudio)</h5>
                            <p class="small text-secondary">Exporta leituras de instrumentação com Cota NA, Poro-pressão em kPa e TARP estruturado.</p>
                            <button class="btn btn-primary w-100 mt-2" onclick="window.MDSyncDossie.exportarCSV()">
                                <i class="fa-solid fa-download"></i> Baixar CSV GeoStudio
                            </button>
                        </div>

                        <div class="dossie-info-card" style="flex:1; min-width:280px;">
                            <h5><i class="fa-solid fa-map-location-dot text-primary"></i> Feições Espaciais (GeoJSON UTM 23S)</h5>
                            <p class="small text-secondary">Exporta geometria da estrutura, instrumentos, SUMPs e anomalias georreferenciadas.</p>
                            <button class="btn btn-secondary w-100 mt-2" onclick="window.MDSyncDossie.exportarGeoJSON()">
                                <i class="fa-solid fa-download"></i> Baixar GeoJSON SIRGAS 2000
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        async exportarCSV() {
            if (!global.MDSyncExportador || !this.estruturaAtiva) return;
            try {
                const res = await global.MDSyncExportador.exportarCSVGeoStudio(this.estruturaAtiva.id);
                global.MDSyncExportador.dispararDownload(res);
                if (window.showToast) window.showToast("Exportação Concluída", `Arquivo ${res.nomeArquivo} gerado com sucesso.`, "success");
            } catch (e) {
                alert("Erro ao exportar CSV: " + e.message);
            }
        }

        async exportarGeoJSON() {
            if (!global.MDSyncExportador || !this.estruturaAtiva) return;
            try {
                const res = await global.MDSyncExportador.exportarGeoJSON(this.estruturaAtiva.id);
                global.MDSyncExportador.dispararDownload(res);
                if (window.showToast) window.showToast("Exportação Concluída", `Arquivo ${res.nomeArquivo} gerado com sucesso.`, "success");
            } catch (e) {
                alert("Erro ao exportar GeoJSON: " + e.message);
            }
        }

        async abrirChamadoFluig(anomaliaId) {
            if (!global.MDSyncFluig) return;
            const anom = await this.db.get("anomalias", anomaliaId);
            if (!anom) return;

            try {
                const res = await global.MDSyncFluig.criarChamadoOS(anom);
                if (window.showToast) {
                    window.showToast("Ordem de Serviço Fluig", `Chamado gerado com sucesso! Protocolo: ${res.protocolo}`, "success", 5000);
                }
                await this.abrirDossie(this.estruturaAtiva.id);
                this.trocarAba("anomalias");
            } catch (e) {
                alert("Falha ao abrir chamado Fluig: " + e.message);
            }
        }

        async gerenciarCicloAnomalia(anomaliaId) {
            if (!global.MDSyncAnomalias) return;
            const anom = await this.db.get("anomalias", anomaliaId);
            if (!anom) return;

            const estadoAtual = anom.status_ciclo;
            let proximo = "";

            if (estadoAtual === "IDENTIFICADA") proximo = "REGISTRADA";
            else if (estadoAtual === "REGISTRADA") proximo = "AVALIADA";
            else if (estadoAtual === "AVALIADA") proximo = "TRATATIVA_DEFINIDA";
            else if (estadoAtual === "TRATATIVA_DEFINIDA") proximo = "EM_TRATAMENTO";
            else if (estadoAtual === "CHAMADO_ABERTO") proximo = "EM_TRATAMENTO";
            else if (estadoAtual === "EM_TRATAMENTO") proximo = "TRATAMENTO_EXECUTADO";
            else if (estadoAtual === "TRATAMENTO_EXECUTADO") proximo = "VALIDACAO";
            else if (estadoAtual === "VALIDACAO") proximo = "ENCERRADA";

            if (!proximo) {
                alert(`A anomalia já está no estado terminal: ${estadoAtual}`);
                return;
            }

            try {
                if (proximo === "AVALIADA") {
                    await global.MDSyncAnomalias.avaliarTecnicamente(anomaliaId, "Avaliação técnica de campo realizada sem indício de instabilidade global.", "Monitoramento quinzenal e limpeza da canaleta.");
                } else if (proximo === "TRATATIVA_DEFINIDA") {
                    await global.MDSyncAnomalias.definirTratativa(anomaliaId, {
                        descricao_intervencao: "Desobstrução e selamento de trinca com solo argiloso compactado.",
                        setor_responsavel: "Infraestrutura de Mina",
                        prazo_dias: 7
                    });
                } else if (proximo === "EM_TRATAMENTO") {
                    await global.MDSyncAnomalias.iniciarTratamento(anomaliaId, "Equipe Operacional de Infraestrutura");
                } else if (proximo === "TRATAMENTO_EXECUTADO") {
                    await global.MDSyncAnomalias.registrarConclusaoTratamento(anomaliaId, { evidencias_desc: "Intervenção concluída com registro fotográfico anexado." });
                } else if (proximo === "VALIDACAO") {
                    await global.MDSyncAnomalias.submeterParaValidacao(anomaliaId);
                } else if (proximo === "ENCERRADA") {
                    const parecer = prompt("Parecer técnico do Engenheiro para encerramento:", "Intervenção executada conforme especificação de projeto. Estrutura estável.");
                    if (!parecer) return;
                    await global.MDSyncAnomalias.encerrarAnomalia(anomaliaId, parecer, "Anomalia corrigida e validada.");
                }

                if (window.showToast) {
                    window.showToast("Ciclo de Anomalia", `Status avançado de ${estadoAtual} para ${proximo}.`, "info", 4000);
                }
                await this.abrirDossie(this.estruturaAtiva.id);
                this.trocarAba("anomalias");
            } catch (err) {
                alert("Erro ao avançar ciclo: " + err.message);
            }
        }

        abrirModalNovaAnomalia() {
            const modal = document.getElementById('mdsync-nova-anomalia-modal');
            if (modal) {
                // Preencher campos padrao
                const estEl = document.getElementById('anom-form-estrutura');
                if (estEl && this.estruturaAtiva) estEl.value = `${this.estruturaAtiva.codigo} - ${this.estruturaAtiva.nome}`;
                const utmE = document.getElementById('anom-form-utme');
                if (utmE && this.estruturaAtiva) utmE.value = this.estruturaAtiva.coordenadas_utm_e || 594000;
                const utmN = document.getElementById('anom-form-utmn');
                if (utmN && this.estruturaAtiva) utmN.value = this.estruturaAtiva.coordenadas_utm_n || 7784000;
                modal.classList.add('active');
                modal.style.display = 'flex';
                return;
            }

            const desc = prompt("Descrição da Anomalia:", "Trinca superficial longitudinal observada na berma");
            if (!desc) return;
            const tipo = prompt("Tipo da Anomalia (TRINCA, EROSAO, SURGENCIA, RECALQUE):", "TRINCA") || "TRINCA";

            this.db.criarAnomalia({
                estrutura_id: this.estruturaAtiva.id,
                tipo_anomalia: tipo,
                descricao: desc,
                criticidade: "MEDIA",
                coordenadas_utm_e: this.estruturaAtiva.coordenadas_utm_e,
                coordenadas_utm_n: this.estruturaAtiva.coordenadas_utm_n
            }).then(() => {
                if (window.showToast) window.showToast("Anomalia Registrada", "Nova anomalia inserida no fluxo de governança.", "success");
                this.abrirDossie(this.estruturaAtiva.id);
                this.trocarAba("anomalias");
            });
        }

        fecharModalGenerico(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        }

        async salvarNovaAnomaliaModal() {
            const desc = document.getElementById('anom-form-desc')?.value;
            const tipo = document.getElementById('anom-form-tipo')?.value || "TRINCA";
            const crit = document.getElementById('anom-form-criticidade')?.value || "MEDIA";
            const local = document.getElementById('anom-form-local')?.value || "";
            const comp = parseFloat(document.getElementById('anom-form-comp')?.value || 0);
            const larg = parseFloat(document.getElementById('anom-form-larg')?.value || 0);
            const prof = parseFloat(document.getElementById('anom-form-prof')?.value || 0);
            const utmE = parseFloat(document.getElementById('anom-form-utme')?.value || 0);
            const utmN = parseFloat(document.getElementById('anom-form-utmn')?.value || 0);
            const rec = document.getElementById('anom-form-rec')?.value || "";

            if (!desc) {
                alert("Por favor informe a descrição detalhada da anomalia.");
                return;
            }

            const anom = await this.db.criarAnomalia({
                estrutura_id: this.estruturaAtiva.id,
                tipo_anomalia: tipo,
                descricao: desc,
                criticidade: crit,
                localizacao_detalhada: local,
                dimensao_comprimento_m: comp,
                dimensao_largura_m: larg,
                dimensao_profundidade_m: prof,
                coordenadas_utm_e: utmE || this.estruturaAtiva.coordenadas_utm_e,
                coordenadas_utm_n: utmN || this.estruturaAtiva.coordenadas_utm_n,
                recomendacao_tecnica: rec
            });

            this.fecharModalGenerico('mdsync-nova-anomalia-modal');
            if (window.showToast) window.showToast("Anomalia Registrada", `Anomalia ${anom.codigo_sequencial} inserida no fluxo com sucesso.`, "success");
            await this.abrirDossie(this.estruturaAtiva.id);
            this.trocarAba("anomalias");
        }

        abrirModalNovoSump() {
            const modal = document.getElementById('mdsync-novo-sump-modal');
            if (modal) {
                const estEl = document.getElementById('sump-form-estrutura');
                if (estEl && this.estruturaAtiva) estEl.value = `${this.estruturaAtiva.codigo} - ${this.estruturaAtiva.nome}`;
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        }

        async salvarNovoSumpModal() {
            const cod = document.getElementById('sump-form-codigo')?.value || `SUMP-${Date.now().toString().slice(-3)}`;
            const nome = document.getElementById('sump-form-nome')?.value || "Bacia de Contenção de Drenagem";
            const cap = parseFloat(document.getElementById('sump-form-cap')?.value || 5000);
            const fundo = parseFloat(document.getElementById('sump-form-fundo')?.value || 820);
            const bordo = parseFloat(document.getElementById('sump-form-bordo')?.value || 826);
            const bomba = document.getElementById('sump-form-bomba')?.value || "OPERACIONAL";
            const vazao = parseFloat(document.getElementById('sump-form-vazao')?.value || 100);

            await this.db.criarSump({
                estrutura_associada_id: this.estruturaAtiva.id,
                codigo: cod,
                nome: nome,
                capacidade_maxima_m3: cap,
                cota_fundo: fundo,
                cota_bordo_livre: bordo,
                sistema_bombeamento_status: bomba,
                vazao_bombeamento_m3h: vazao,
                coordenadas_utm_e: this.estruturaAtiva.coordenadas_utm_e,
                coordenadas_utm_n: this.estruturaAtiva.coordenadas_utm_n
            });

            this.fecharModalGenerico('mdsync-novo-sump-modal');
            if (window.showToast) window.showToast("SUMP Cadastrado", `SUMP ${cod} associado à estrutura com sucesso.`, "success");
            await this.abrirDossie(this.estruturaAtiva.id);
            this.trocarAba("sumps");
        }

        abrirModalVistoriaSump(sumpId) {
            const sump = (this.dossieAtual.sumps || []).find(s => s.id === sumpId);
            if (!sump) return;
            const modal = document.getElementById('mdsync-vistoria-sump-modal');
            if (modal) {
                document.getElementById('vsump-id').value = sump.id;
                document.getElementById('vsump-label').textContent = `${sump.codigo} (${sump.nome})`;
                document.getElementById('vsump-nivel').value = sump.nivel_agua_atual_percentual || 0;
                document.getElementById('vsump-bomba').value = sump.sistema_bombeamento_status || "OPERACIONAL";
                document.getElementById('vsump-cond').value = sump.condicao_manutencao || "REGULAR";
                document.getElementById('vsump-vazao').value = sump.vazao_bombeamento_m3h || 100;
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        }

        async salvarVistoriaSumpModal() {
            const id = document.getElementById('vsump-id')?.value;
            const nivel = parseFloat(document.getElementById('vsump-nivel')?.value || 0);
            const bomba = document.getElementById('vsump-bomba')?.value;
            const cond = document.getElementById('vsump-cond')?.value;
            const vazao = parseFloat(document.getElementById('vsump-vazao')?.value || 0);

            if (!id) return;
            await this.db.registrarInspecaoSump(id, {
                nivel_agua_atual_percentual: nivel,
                sistema_bombeamento_status: bomba,
                condicao_manutencao: cond,
                vazao_bombeamento_m3h: vazao
            });

            this.fecharModalGenerico('mdsync-vistoria-sump-modal');
            if (window.showToast) window.showToast("Vistoria de SUMP", "Nível d'água e parâmetros operacionais atualizados.", "success");
            await this.abrirDossie(this.estruturaAtiva.id);
            this.trocarAba("sumps");
        }

        abrirModalNovaAnalise() {
            const modal = document.getElementById('mdsync-nova-analise-modal');
            if (modal) {
                const estEl = document.getElementById('analise-form-estrutura');
                if (estEl && this.estruturaAtiva) estEl.value = `${this.estruturaAtiva.codigo} - ${this.estruturaAtiva.nome}`;
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        }

        async salvarNovaAnaliseModal() {
            const software = document.getElementById('analise-form-software')?.value || "GEOSTUDIO_SLOPEW";
            const motivo = document.getElementById('analise-form-motivo')?.value || "Revisão Periódica de Estabilidade";
            const secao = document.getElementById('analise-form-secao')?.value || "Seção Crítica Principal";
            const carregamento = document.getElementById('analise-form-carregamento')?.value || "DRENADA_LONGO_PRAZO";
            const coeso = parseFloat(document.getElementById('analise-form-coeso')?.value || 15);
            const atrito = parseFloat(document.getElementById('analise-form-atrito')?.value || 32);
            const gamma = parseFloat(document.getElementById('analise-form-gamma')?.value || 20.5);
            const ru = parseFloat(document.getElementById('analise-form-ru')?.value || 0.20);
            const obs = document.getElementById('analise-form-obs')?.value || "";

            const sol = await this.db.criarSolicitacaoAnalise({
                estrutura_id: this.estruturaAtiva.id,
                software_alvo: software,
                motivo: motivo,
                secao_geotecnica: secao,
                condicao_carregamento: carregamento,
                parametros_geotecnicos: {
                    coeso_kpa: coeso,
                    atrito_graus: atrito,
                    peso_especifico_kn_m3: gamma,
                    ru_poropressao: ru
                },
                observacoes: obs
            });

            this.fecharModalGenerico('mdsync-nova-analise-modal');
            if (window.showToast) window.showToast("Análise Solicitada", `Solicitação ${sol.codigo} gerada para ${software}.`, "success");
            await this.abrirDossie(this.estruturaAtiva.id);
            this.trocarAba("estabilidade");
        }

        async atualizarResultadoAnalise(analiseId) {
            const fsStr = prompt("Informe o Fator de Segurança (FS) calculado na modelagem:", "1.58");
            if (!fsStr) return;
            const fs = parseFloat(fsStr.replace(',', '.'));
            if (isNaN(fs)) {
                alert("Valor de FS inválido.");
                return;
            }

            const parecer = prompt("Parecer técnico conclusivo do Engenheiro:", `Fator de Segurança calculado (${fs.toFixed(2)}) em conformidade com o critério mínimo de 1.50.`);
            if (!parecer) return;

            await this.db.atualizarSolicitacaoAnalise(analiseId, {
                status: "CONCLUIDA",
                fator_seguranca_calculado: fs,
                parecer_conclusivo: parecer,
                data_conclusao: new Date().toISOString()
            });

            if (window.showToast) window.showToast("Resultado Lançado", `Análise concluída com FS = ${fs.toFixed(2)}.`, "success");
            await this.abrirDossie(this.estruturaAtiva.id);
            this.trocarAba("estabilidade");
        }

        abrirSeletorUsuario() {
            const modal = document.getElementById('mdsync-user-role-modal');
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
            }
        }

        async selecionarPerfilUsuario(perfil) {
            await this.db.trocarUsuarioAtivo(perfil);
            this._atualizarBadgeUsuarioHeader();
            this.fecharModalGenerico('mdsync-user-role-modal');
            if (window.showToast) {
                window.showToast("Perfil Alternado", `Alçada ativa: ${this.db.currentUser.nome} (${this.db.currentUser.perfil})`, "info", 4000);
            }
            if (this.estruturaAtiva) {
                await this.abrirDossie(this.estruturaAtiva.id);
            }
        }
    }

    const instance = new DossieController();
    global.MDSyncDossie = instance;

})(typeof window !== 'undefined' ? window : globalThis);
