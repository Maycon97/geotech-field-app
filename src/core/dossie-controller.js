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
                    <h4 class="mb-3">Bacias de Acúmulo e SUMPs Associados (${sumps.length})</h4>
                    <div class="dossie-grid-cards">
                        ${sumps.map(s => `
                            <div class="dossie-info-card">
                                <h4><i class="fa-solid fa-water"></i> ${s.codigo} (${s.nome})</h4>
                                <div class="dossie-meta-list">
                                    <div><span>Capacidade Máxima:</span> <strong>${(s.capacidade_maxima_m3 || 0).toLocaleString('pt-BR')} m³</strong></div>
                                    <div><span>Volume Atual Estimado:</span> <strong>${(s.volume_atual_estimado_m3 || 0).toLocaleString('pt-BR')} m³</strong></div>
                                    <div><span>Nível d'Água:</span> <strong>${s.nivel_agua_atual_percentual}%</strong></div>
                                    <div><span>Cota Fundo:</span> <strong>${s.cota_fundo} m</strong></div>
                                    <div><span>Cota Bordo Livre:</span> <strong>${s.cota_bordo_livre} m</strong></div>
                                    <div><span>Sistema Bombeamento:</span> <strong>${s.sistema_bombeamento_status}</strong></div>
                                    <div><span>Vazão de Bombeamento:</span> <strong>${s.vazao_bombeamento_m3h} m³/h</strong></div>
                                    <div><span>Condição de Manutenção:</span> <strong>${s.condicao_manutencao}</strong></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
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
    }

    const instance = new DossieController();
    global.MDSyncDossie = instance;

})(typeof window !== 'undefined' ? window : globalThis);
