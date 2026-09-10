/**
 * MDSync Pesquisa & Consulta Global (Versão 1.0)
 * Sistema Corporativo de Gestao de Dados Geotecnicos
 * 
 * Implementa o mecanismo de busca transversal da Secao 23 da especificacao mestra,
 * permitindo consultar por Estrutura, Instrumento, Anomalia, SUMP, Inspecao,
 * Usuario, Chamado Fluig, Periodo e Tipo em uma interface unificada e rapida.
 */

(function (global) {
    'use strict';

    class PesquisaGlobalController {
        constructor(db) {
            this.db = db || global.MDSyncDB;
            this.isModalOpen = false;
        }

        /**
         * Executa busca textual transversal em todas as tabelas normalizadas do MDSyncDB
         * @param {string} termo - Termo digitado pelo usuario
         * @returns {Promise<Object>} Resultados agrupados por categoria
         */
        async buscarGlobalmente(termo) {
            if (!this.db) return { total: 0, categorias: {} };
            await this.db.init();

            if (!termo || termo.trim().length < 2) {
                return { total: 0, categorias: {} };
            }

            const q = termo.trim().toLowerCase();

            const [estruturas, instrumentos, anomalias, sumps, inspecoes, usuarios] = await Promise.all([
                this.db.getAll("estruturas"),
                this.db.getAll("instrumentos"),
                this.db.getAll("anomalias"),
                this.db.getAll("sumps"),
                this.db.getAll("inspecoes"),
                this.db.getAll("usuarios")
            ]);

            const resultados = {
                estruturas: [],
                instrumentos: [],
                anomalias: [],
                sumps: [],
                inspecoes: [],
                usuarios: []
            };

            // 1. Estruturas
            estruturas.forEach(e => {
                if ((e.codigo || '').toLowerCase().includes(q) ||
                    (e.nome || '').toLowerCase().includes(q) ||
                    (e.tipo || '').toLowerCase().includes(q)) {
                    resultados.estruturas.push({
                        tipo: "ESTRUTURA",
                        id: e.id,
                        codigo: e.codigo,
                        titulo: `${e.codigo}: ${e.nome}`,
                        detalhe: `Tipo: ${e.tipo} | Cota Coroamento: ${e.cota_coroamento}m`,
                        icone: "fa-solid fa-mountain",
                        acao: `window.MDSyncDossie.abrirDossie('${e.id}'); window.MDSyncPesquisa.fecharModal();`
                    });
                }
            });

            // 2. Instrumentos
            instrumentos.forEach(i => {
                if ((i.codigo || '').toLowerCase().includes(q) ||
                    (i.tipo || '').toLowerCase().includes(q) ||
                    (i.id || '').toLowerCase().includes(q)) {
                    resultados.instrumentos.push({
                        tipo: "INSTRUMENTO",
                        id: i.id,
                        codigo: i.codigo,
                        titulo: `${i.codigo} (${i.tipo})`,
                        detalhe: `Cota Boca: ${i.cota_boca}m | Limite Atenção: ${i.limite_atencao}`,
                        icone: "fa-solid fa-gauge-high",
                        acao: `window.Sysdam.openQuickReading('${i.id}'); window.MDSyncPesquisa.fecharModal();`
                    });
                }
            });

            // 3. Anomalias & Chamados Fluig
            anomalias.forEach(a => {
                if ((a.codigo_sequencial || '').toLowerCase().includes(q) ||
                    (a.descricao || '').toLowerCase().includes(q) ||
                    (a.tipo_anomalia || '').toLowerCase().includes(q) ||
                    (a.fluig_chamado_id || '').toLowerCase().includes(q)) {
                    resultados.anomalias.push({
                        tipo: "ANOMALIA",
                        id: a.id,
                        codigo: a.codigo_sequencial,
                        titulo: `${a.codigo_sequencial || a.id} (${a.tipo_anomalia})`,
                        detalhe: `Criticidade: ${a.criticidade} | Estado: ${a.status_ciclo} | Fluig: ${a.fluig_chamado_id || 'Sem chamado'}`,
                        icone: "fa-solid fa-triangle-exclamation",
                        acao: `window.MDSyncDossie.abrirDossie('${a.estrutura_id}'); window.MDSyncDossie.trocarAba('anomalias'); window.MDSyncPesquisa.fecharModal();`
                    });
                }
            });

            // 4. SUMPs
            sumps.forEach(s => {
                if ((s.codigo || '').toLowerCase().includes(q) ||
                    (s.nome || '').toLowerCase().includes(q)) {
                    resultados.sumps.push({
                        tipo: "SUMP",
                        id: s.id,
                        codigo: s.codigo,
                        titulo: `${s.codigo}: ${s.nome}`,
                        detalhe: `Nível d'água: ${s.nivel_agua_atual_percentual}% | Bombeamento: ${s.sistema_bombeamento_status}`,
                        icone: "fa-solid fa-water",
                        acao: `window.MDSyncDossie.abrirDossie('${s.estrutura_associada_id}'); window.MDSyncDossie.trocarAba('sumps'); window.MDSyncPesquisa.fecharModal();`
                    });
                }
            });

            // 5. Inspeções
            inspecoes.forEach(insp => {
                if ((insp.tipo_inspecao || '').toLowerCase().includes(q) ||
                    (insp.diagnostico_geral || '').toLowerCase().includes(q) ||
                    (insp.usuario_nome || '').toLowerCase().includes(q)) {
                    resultados.inspecoes.push({
                        tipo: "INSPECAO",
                        id: insp.id,
                        codigo: insp.id,
                        titulo: `Inspeção: ${insp.tipo_inspecao}`,
                        detalhe: `Data: ${new Date(insp.data_inicio).toLocaleDateString('pt-BR')} | Estado: ${insp.estado_conservacao_calculado}`,
                        icone: "fa-solid fa-clipboard-check",
                        acao: `window.MDSyncDossie.abrirDossie('${insp.estrutura_id}'); window.MDSyncPesquisa.fecharModal();`
                    });
                }
            });

            // 6. Usuários & Responsáveis
            usuarios.forEach(u => {
                if ((u.nome || '').toLowerCase().includes(q) ||
                    (u.matricula || '').toLowerCase().includes(q) ||
                    (u.perfil || '').toLowerCase().includes(q)) {
                    resultados.usuarios.push({
                        tipo: "USUARIO",
                        id: u.id,
                        codigo: u.matricula,
                        titulo: `${u.nome} (${u.matricula})`,
                        detalhe: `Perfil: ${u.perfil} | Registro: ${u.registro_profissional || 'N/A'}`,
                        icone: "fa-solid fa-user-shield",
                        acao: `switchTab('users'); window.MDSyncPesquisa.fecharModal();`
                    });
                }
            });

            const total = resultados.estruturas.length +
                          resultados.instrumentos.length +
                          resultados.anomalias.length +
                          resultados.sumps.length +
                          resultados.inspecoes.length +
                          resultados.usuarios.length;

            return { total, categorias: resultados };
        }

        abrirModal() {
            let modal = document.getElementById('mdsync-pesquisa-modal');
            if (!modal) {
                this._criarModalDOM();
                modal = document.getElementById('mdsync-pesquisa-modal');
            }
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
                this.isModalOpen = true;
                const input = document.getElementById('pesquisa-global-input');
                if (input) {
                    input.value = '';
                    input.focus();
                }
                const resBox = document.getElementById('pesquisa-global-results');
                if (resBox) resBox.innerHTML = '<p class="text-secondary small p-3 text-center">Digite ao menos 2 caracteres para pesquisar em toda a base corporativa.</p>';
            }
        }

        fecharModal() {
            const modal = document.getElementById('mdsync-pesquisa-modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
                this.isModalOpen = false;
            }
        }

        async processarDigitacao(termo) {
            const resBox = document.getElementById('pesquisa-global-results');
            if (!resBox) return;

            if (!termo || termo.trim().length < 2) {
                resBox.innerHTML = '<p class="text-secondary small p-3 text-center">Digite ao menos 2 caracteres para pesquisar...</p>';
                return;
            }

            const data = await this.buscarGlobalmente(termo);
            if (data.total === 0) {
                resBox.innerHTML = `<p class="text-muted small p-4 text-center">Nenhum registro correspondente ao termo "${termo}".</p>`;
                return;
            }

            let html = `<div class="p-2"><span class="small text-secondary font-bold">${data.total} resultado(s) encontrado(s):</span></div>`;

            Object.entries(data.categorias).forEach(([catNome, itens]) => {
                if (!itens.length) return;
                html += `
                    <div class="mb-3">
                        <div class="px-2 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider">${catNome} (${itens.length})</div>
                        ${itens.map(item => `
                            <div class="pesquisa-result-item" onclick="${item.acao}">
                                <div class="d-flex align-center gap-3">
                                    <div class="pesquisa-result-icon"><i class="${item.icone}"></i></div>
                                    <div>
                                        <strong class="d-block text-white" style="font-size:13px;">${item.titulo}</strong>
                                        <span class="small text-secondary">${item.detalhe}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            });

            resBox.innerHTML = html;
        }

        _criarModalDOM() {
            const div = document.createElement('div');
            div.id = 'mdsync-pesquisa-modal';
            div.className = 'mdsync-dossie-modal-overlay';
            div.innerHTML = `
                <div class="mdsync-dossie-dialog" style="max-width: 650px;">
                    <div class="mdsync-dossie-header" style="padding: 14px 20px;">
                        <div class="d-flex align-center gap-2">
                            <i class="fa-solid fa-magnifying-glass text-primary"></i>
                            <h3 style="font-size:16px; margin:0;">Pesquisa &amp; Consulta Global (MDSync)</h3>
                        </div>
                        <button type="button" class="btn-close" onclick="window.MDSyncPesquisa.fecharModal()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer;">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(15,23,42,0.9);">
                        <input type="text" id="pesquisa-global-input" class="form-control" placeholder="Buscar estrutura, instrumento, anomalia, sump, operador..." oninput="window.MDSyncPesquisa.processarDigitacao(this.value)" style="width:100%; height:44px; border-radius:12px; background:rgba(30,41,59,0.8); border:1px solid rgba(255,255,255,0.15); color:#fff; padding:0 14px; font-size:14px;">
                    </div>
                    <div id="pesquisa-global-results" style="max-height: 400px; overflow-y: auto; padding: 12px 16px;">
                        <p class="text-secondary small p-3 text-center">Digite ao menos 2 caracteres para pesquisar...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(div);

            // Estilos específicos da lista de resultados
            const style = document.createElement('style');
            style.textContent = `
                .pesquisa-result-item {
                    padding: 10px 12px;
                    border-radius: 10px;
                    background: rgba(30, 41, 59, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    margin-bottom: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .pesquisa-result-item:hover {
                    background: rgba(56, 189, 248, 0.12);
                    border-color: rgba(56, 189, 248, 0.3);
                }
                .pesquisa-result-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    background: rgba(56, 189, 248, 0.15);
                    color: #38bdf8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    flex-shrink: 0;
                }
            `;
            document.head.appendChild(style);
        }
    }

    const instance = new PesquisaGlobalController();

    // Atalho global de teclado Ctrl+K ou /
    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
                e.preventDefault();
                instance.abrirModal();
            } else if (e.key === 'Escape' && instance.isModalOpen) {
                instance.fecharModal();
            }
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { PesquisaGlobalController, pesquisaGlobal: instance };
    }

    global.MDSyncPesquisa = instance;

})(typeof window !== 'undefined' ? window : globalThis);
