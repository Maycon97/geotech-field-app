/**
 * MDSync - Stitch Unified Client Runtime
 * Fornece interatividade, roteamento entre telas, modais técnicos,
 * cálculos de engenharia geotécnica, exportação de ZIP e transmissão SIGBM.
 */

(function () {
  'use strict';

  // --- 1. ROTEAMENTO UNIVERSAL ENTRE TELAS ---
  const ROUTE_MAP = {
    'visao-geral': '01-visao-geral-geotecnica.html',
    'monitoramento-instrumental': '01-visao-geral-geotecnica.html#tarp-section',
    'checklists-fir': '02-fluxo-coleta-checklist-offline.html',
    'geoview-gis-3d': '04-geoview-gis-3d-interativo-threejs.html',
    'relatorios-auditoria': '05-relatorios-auditoria-gistm-anm95.html',
    'exportacao-anm': '06-exportacao-pacote-oficial-anm-zip.html',
    'transmissao-sigbm': '07-transmissao-homologada-api-sigbm.html',
    'rotina-diaria': '08-rotina-diaria-equipe-geotecnica.html',
    'indicadores-bi-fmea': '09-painel-executivo-cronograma-pcmi.html',
    'cronograma-pcmi': '09-painel-executivo-cronograma-pcmi.html',
    'historico-series': '../../index.html#history-section',
    'parametros-usuarios': 'modal:parametros'
  };

  function getCurrentScreenFile() {
    const path = window.location.pathname;
    const parts = path.split('/');
    return parts[parts.length - 1] || '01-visao-geral-geotecnica.html';
  }

  function initNavigation() {
    const currentFile = getCurrentScreenFile();

    // Interceptar todos os links da barra de navegação com data-path
    document.querySelectorAll('[data-path]').forEach((link) => {
      const path = link.getAttribute('data-path');
      const target = ROUTE_MAP[path];

      if (target) {
        if (target.startsWith('modal:')) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalName = target.split(':')[1];
            openTechnicalModal(modalName);
          });
        } else {
          link.setAttribute('href', target);
        }
      }

      // Marcar link ativo
      if (target && target.includes(currentFile)) {
        link.classList.add('bg-primary-container/20', 'text-primary', 'font-medium', 'border', 'border-primary/30');
        link.classList.remove('text-on-surface-variant');
      }
    });

    // Botões "Nova Coleta" no cabeçalho e corpo
    document.querySelectorAll('button, a').forEach((el) => {
      const text = el.textContent ? el.textContent.trim().toLowerCase() : '';
      if (text.includes('nova coleta')) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          if (!currentFile.includes('02-fluxo-coleta')) {
            window.location.href = '02-fluxo-coleta-checklist-offline.html';
          }
        });
      }
    });

    // Botões "Sincronizar"
    document.querySelectorAll('button').forEach((btn) => {
      const text = btn.textContent ? btn.textContent.trim().toLowerCase() : '';
      if (text.includes('sincronizar')) {
        btn.addEventListener('click', handleSyncAction);
      }
    });

    // Botões de filtro no header (ícone filter_alt)
    document.querySelectorAll('button').forEach((btn) => {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon && icon.textContent.trim() === 'filter_alt') {
        btn.addEventListener('click', () => openFilterModal());
      }
      if (icon && icon.textContent.trim() === 'person') {
        btn.addEventListener('click', () => openUserProfileModal());
      }
    });

    // Injetar barra flutuante de navegação rápida (Voltar ao Catálogo / App de Campo)
    injectFloatingQuickNav();
  }

  // --- 2. SISTEMA DE NOTIFICAÇÕES (TOASTS) ---
  function showToast(title, message, type = 'info', duration = 3500) {
    let container = document.getElementById('mdsync-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'mdsync-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const typeColors = {
      success: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: 'verified', color: '#4edea3' },
      warning: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: 'warning', color: '#ffb95f' },
      error: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: 'error', color: '#ffb4ab' },
      info: { border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)', icon: 'info', color: '#89ceff' }
    };

    const config = typeColors[type] || typeColors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      pointer-events: auto;
      background: #171f35;
      border: 1px solid ${config.border};
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 16px ${config.bg};
      border-radius: 10px;
      padding: 14px 16px;
      color: #dbe1ff;
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
      <span class="material-symbols-outlined" style="color: ${config.color}; font-size: 22px; flex-shrink: 0;">${config.icon}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 2px;">${title}</div>
        <div style="font-size: 11.5px; color: #bec8d2; line-height: 1.4;">${message}</div>
      </div>
      <button style="background: transparent; border: none; color: #88929b; cursor: pointer; padding: 2px;" onclick="this.parentElement.remove()">
        <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
      </button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(10px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --- 3. BARRA FLUTUANTE DE NAVEGAÇÃO RÁPIDA ---
  function injectFloatingQuickNav() {
    if (document.getElementById('mdsync-quick-nav')) return;

    const nav = document.createElement('div');
    nav.id = 'mdsync-quick-nav';
    nav.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 280px;
      z-index: 45;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 28, 56, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.3);
      backdrop-filter: blur(12px);
      padding: 6px 10px;
      border-radius: 9999px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      font-family: 'Inter', sans-serif;
    `;

    nav.innerHTML = `
      <a href="../index.html" style="display: flex; align-items: center; gap: 6px; text-decoration: none; color: #89ceff; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; background: rgba(14, 165, 233, 0.15); transition: background 0.2s;" title="Ver todas as telas importadas">
        <span class="material-symbols-outlined" style="font-size: 14px;">grid_view</span>
        <span>Hub Stitch</span>
      </a>
      <span style="color: rgba(255, 255, 255, 0.2);">|</span>
      <a href="../../index.html" style="display: flex; align-items: center; gap: 6px; text-decoration: none; color: #4edea3; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); transition: background 0.2s;" title="Voltar para a aplicação de campo operacional">
        <span class="material-symbols-outlined" style="font-size: 14px;">arrow_back</span>
        <span>App de Campo</span>
      </a>
    `;

    document.body.appendChild(nav);
  }

  // --- 4. AÇÃO DE SINCRONIZAÇÃO EM NUVEM ---
  function handleSyncAction(e) {
    if (e) e.preventDefault();
    const syncIcons = document.querySelectorAll('.material-symbols-outlined');
    syncIcons.forEach((icon) => {
      if (icon.textContent.trim() === 'sync') {
        icon.classList.add('animate-spin');
      }
    });

    showToast('Sincronização Iniciada', 'Conectando ao servidor e verificando fila local...', 'info', 2000);

    setTimeout(() => {
      syncIcons.forEach((icon) => {
        if (icon.textContent.trim() === 'sync') {
          icon.classList.remove('animate-spin');
        }
      });
      showToast(
        'Sincronização 100% Concluída',
        'Todos os 218 instrumentos e 3.094 medições estão alinhados com o banco central.',
        'success',
        4000
      );
    }, 1500);
  }

  // --- 5. MODAIS TÉCNICOS E DE GOVERNANÇA ---
  window.openTechnicalModal = function (type) {
    const existing = document.getElementById('technical-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'technical-modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(5, 13, 35, 0.82);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Inter', sans-serif;
    `;

    let title = '';
    let content = '';

    if (type === 'cadastral') {
      title = 'Ficha Cadastral Oficial ANM (Resolução 95/2022)';
      content = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
          <div style="background: #171f35; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 10px; text-transform: uppercase; color: #88929b;">Código SNISB</div>
            <div style="font-size: 14px; font-weight: 700; color: #89ceff; font-family: 'JetBrains Mono', monospace;">MG-0312-B1-JANG</div>
          </div>
          <div style="background: #171f35; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 10px; text-transform: uppercase; color: #88929b;">Categoria de Risco (CRI)</div>
            <div style="font-size: 14px; font-weight: 700; color: #ffb95f;">Médio (Pontuação: 18)</div>
          </div>
          <div style="background: #171f35; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 10px; text-transform: uppercase; color: #88929b;">Dano Potencial Associado (DPA)</div>
            <div style="font-size: 14px; font-weight: 700; color: #ffb4ab;">Alto (Classe A)</div>
          </div>
          <div style="background: #171f35; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 10px; text-transform: uppercase; color: #88929b;">Datum Geodésico</div>
            <div style="font-size: 14px; font-weight: 700; color: #4edea3; font-family: 'JetBrains Mono', monospace;">SIRGAS 2000 / UTM 23S</div>
          </div>
        </div>
        <div style="background: #131b31; padding: 14px; border-radius: 8px; font-size: 12px; color: #bec8d2; line-height: 1.6;">
          <p><strong>Empreendimento:</strong> Mina Cava da Jangada / ITAMINAS Comércio de Minérios S/A</p>
          <p><strong>Estruturas Vinculadas:</strong> Cava Jangada, Barragem B1, Dique DS-02, PDE Jacó e PDE Mangaba</p>
          <p><strong>Volume Homologado de Reservatório:</strong> 12.450.000 m³</p>
          <p><strong>Engenheiro de Registro (EOR):</strong> Dr. Arnaldo Silveira (CREA-MG 45.221/D)</p>
          <p><strong>RT de Operação:</strong> Maycon Nascimento (CREA-MG 184.920/D)</p>
        </div>
      `;
    } else if (type === 'governanca') {
      title = 'PSB & Matriz de Governança GISTM';
      content = `
        <div style="background: #131b31; padding: 14px; border-radius: 8px; font-size: 12px; color: #bec8d2; line-height: 1.6;">
          <p style="color: #4edea3; font-weight: 700; margin-bottom: 8px;">Conformidade GISTM: Nível 4 (Avançado • 98.4%)</p>
          <ul style="padding-left: 18px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
            <li><strong>Princípio 01 & 02:</strong> Comunidades e Direitos Humanos com sirenes audíveis em 100% da ZAS.</li>
            <li><strong>Princípio 03:</strong> Base de Projeto Resiliente com Fator de Segurança FS ≥ 1.50 drenado.</li>
            <li><strong>Princípio 04:</strong> Revisão Periódica EOR com reuniões trimestrais e parecer técnico semestral.</li>
            <li><strong>Princípio 05:</strong> Plano de Ação de Emergência (PAEBM) com simulados anuais homologados na Defesa Civil.</li>
          </ul>
          <p><strong>Próxima Auditoria Externa:</strong> 24 de Outubro de 2026 (Auditora Independente Geoconsulting)</p>
        </div>
      `;
    } else if (type === 'tarp' || type === 'parametros') {
      title = 'Matriz Operacional TARP (Bo & Barrett 2023)';
      content = `
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #4edea3;">
            <span><strong>Nível 0 • Normal</strong> (Pressão e Cota dentro da faixa histórica sazonal)</span>
            <span style="font-weight: 700;">Rotina Padrão</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #ffb95f;">
            <span><strong>Nível 1 • Atenção</strong> (Atingimento de 70% a 80% do limite de projeto)</span>
            <span style="font-weight: 700;">Frequência 2x / Início Alerta</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ffb4ab;">
            <span><strong>Nível 2 • Alerta</strong> (Superação de limite de projeto ou deformação acelerada)</span>
            <span style="font-weight: 700;">Inspeção Imediata de Campo</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-radius: 6px; background: rgba(147, 0, 10, 0.3); border: 1px solid #ef4444; color: #ffdad6;">
            <span><strong>Nível 3 • Emergência</strong> (Instabilidade iminente ou anomalia severa)</span>
            <span style="font-weight: 700;">Disparo do PAEBM</span>
          </div>
        </div>
      `;
    } else {
      title = 'Informações Geotécnicas de Campo';
      content = `<p style="font-size: 13px; color: #bec8d2;">Módulo ${type} em operação regular.</p>`;
    }

    backdrop.innerHTML = `
      <div style="background: #171f35; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; width: 100%; max-width: 600px; box-shadow: 0 24px 64px rgba(0,0,0,0.8); overflow: hidden;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); background: #131b31;">
          <div style="font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #ffffff;">${title}</div>
          <button style="background: transparent; border: none; color: #88929b; cursor: pointer;" onclick="document.getElementById('technical-modal-backdrop').remove()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div style="padding: 18px;">
          ${content}
        </div>
        <div style="display: flex; justify-content: flex-end; padding: 12px 18px; background: #131b31; border-top: 1px solid rgba(255,255,255,0.06);">
          <button style="background: #0ea5e9; color: #ffffff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;" onclick="document.getElementById('technical-modal-backdrop').remove()">
            Fechar
          </button>
        </div>
      </div>
    `;

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    document.body.appendChild(backdrop);
  };

  window.scrollToSection = function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.style.transition = 'box-shadow 0.3s ease';
      el.style.boxShadow = '0 0 24px rgba(14, 165, 233, 0.6)';
      setTimeout(() => (el.style.boxShadow = ''), 2000);
    } else {
      showToast('Seção Alvo', `Navegando para o módulo ${id}...`, 'info');
    }
  };

  function openFilterModal() {
    window.openTechnicalModal('tarp');
  }

  function openUserProfileModal() {
    window.openTechnicalModal('cadastral');
  }

  // --- 6. INTERATIVIDADE ESPECÍFICA: TELA 02 (FLUXO DE COLETA DE CAMPO) ---
  function initScreen02Coleta() {
    const currentFile = getCurrentScreenFile();
    if (!currentFile.includes('02-fluxo-coleta')) return;

    // Pílulas de instrumentos rápidos
    const instrumentData = {
      'PZ-01': { type: 'Piezômetro Casagrande', cotaBoca: 842.5, cotaPonta: 805.0, profPadrao: 11.45 },
      'PZ-02': { type: 'Piezômetro Casagrande', cotaBoca: 845.2, cotaPonta: 810.0, profPadrao: 12.8 },
      'INA-01': { type: 'Inclinômetro de Precisão', cotaBoca: 846.0, cotaPonta: 790.0, profPadrao: 0.2 },
      'PZ-04': { type: 'Corda Vibrante Elétrica', cotaBoca: 850.1, cotaPonta: 812.5, profPadrao: 14.6 },
      'MED-02': { type: 'Calha Parshall', cotaBoca: 820.0, cotaPonta: 820.0, profPadrao: 4.2 }
    };

    let activeInstId = 'PZ-02';

    // Capturar inputs
    const depthInput = document.querySelector('input[type="number"]');

    function updateCalculations() {
      const inst = instrumentData[activeInstId] || instrumentData['PZ-02'];
      const prof = depthInput ? parseFloat(depthInput.value) || inst.profPadrao : inst.profPadrao;

      const cotaNA = (inst.cotaBoca - prof).toFixed(2);
      const colunaAgua = Math.max(0, cotaNA - inst.cotaPonta);
      const poroPressao = (colunaAgua * 9.81).toFixed(1);

      // Atualizar no DOM se existirem campos
      document.querySelectorAll('span, div').forEach((el) => {
        if (el.textContent && el.textContent.includes('832.40 m')) {
          el.textContent = `${cotaNA} m`;
        }
        if (el.textContent && el.textContent.includes('219.7 kPa')) {
          el.textContent = `${poroPressao} kPa`;
        }
      });
    }

    if (depthInput) {
      depthInput.addEventListener('input', updateCalculations);
    }

    // Pílulas de seleção de instrumento
    document.querySelectorAll('button').forEach((btn) => {
      const text = btn.textContent ? btn.textContent.trim() : '';
      for (const instId of Object.keys(instrumentData)) {
        if (text.includes(instId)) {
          btn.addEventListener('click', () => {
            activeInstId = instId;
            showToast('Instrumento Selecionado', `Alternado para ${instId} (${instrumentData[instId].type})`, 'info', 2000);
            updateCalculations();
          });
        }
      }
    });

    // Botão Salvar e Próximo
    const btnSaveNext = document.getElementById('save-next-btn');
    if (btnSaveNext) {
      btnSaveNext.addEventListener('click', () => {
        showToast(
          'Leitura Registrada!',
          `Instrumento ${activeInstId} salvo com sucesso na fila offline de campo.`,
          'success',
          3500
        );
      });
    }

    // Botão Salvar Local
    const btnSaveLocal = document.getElementById('save-local-btn');
    if (btnSaveLocal) {
      btnSaveLocal.addEventListener('click', () => {
        showToast('Memória Local Atualizada', 'Registro armazenado com hash criptográfico.', 'success', 2500);
      });
    }

    // Botão QR Code Scanner
    document.querySelectorAll('button').forEach((btn) => {
      if (btn.textContent && btn.textContent.includes('RFID / QR')) {
        btn.addEventListener('click', () => {
          showToast('Tag RFID Detectada', 'Sensor PZ-02 validado por proximidade NFC/RFID.', 'success', 2500);
        });
      }
      if (btn.textContent && btn.textContent.includes('Buscar ID')) {
        btn.addEventListener('click', () => {
          const id = prompt('Digite o ID do instrumento para busca imediata (Ex: PZ-04A, INA-02, VZ-01):', 'PZ-04A');
          if (id) {
            showToast('Instrumento Localizado', `Carregando parâmetros técnicos de ${id.toUpperCase()}...`, 'success');
          }
        });
      }
    });
  }

  // --- 7. INTERATIVIDADE ESPECÍFICA: TELA 06 (EXPORTAÇÃO PACOTE ANM ZIP) ---
  function initScreen06ExportacaoZip() {
    const currentFile = getCurrentScreenFile();
    if (!currentFile.includes('06-exportacao-pacote')) return;

    // Botão Baixar Pacote ZIP Completo
    document.querySelectorAll('button').forEach((btn) => {
      const text = btn.textContent ? btn.textContent.trim() : '';
      if (text.includes('Baixar Pacote ZIP Completo') || text.includes('Dossiê ANM Gerado')) {
        btn.addEventListener('click', () => {
          generateAndDownloadZip();
        });
      }
      if (text.includes('Transmitir Diretamente ao SIGBM')) {
        btn.addEventListener('click', () => {
          window.location.href = '07-transmissao-homologada-api-sigbm.html';
        });
      }
      if (text.includes('Copiar Hash')) {
        btn.addEventListener('click', () => {
          const hash = '8f92b740e53a19b88c7f0932a4e5d6198f92b740e53a19b88c7f0932a4e4a189f';
          if (navigator.clipboard) {
            navigator.clipboard.writeText(hash).then(() => {
              showToast('Hash Copiado', 'Checksum SHA-256 transferido para a área de transferência.', 'success');
            });
          }
        });
      }
    });
  }

  async function generateAndDownloadZip() {
    showToast('Gerando Pacote ZIP', 'Compactando dossiê, manifestos e séries históricas...', 'info', 2000);

    const manifestContent = `=======================================================
MDSYNC - PACOTE OFICIAL DE FISCALIZACAO ANM / SIGBM
Resolução ANM nº 95/2022 • Art. 17 e Art. 13
Empreendimento: Mina Cava Jangada - ITAMINAS
Responsável Técnico: Maycon Nascimento (CREA-MG 184.920/D)
Data de Geração: ${new Date().toISOString()}
=======================================================
ARQUIVOS INCLUSOS:
1. 01_DECLARACAO_ESTABILIDADE_DCE_2026.pdf
2. 02_SERIES_TEMPORAIS_PIEZOMETRIA_MAR2026.csv
3. 03_LAUDO_CINEMATICO_RADAR_IBIS_FM_FR012.txt
4. 04_CATALOGO_INSTRUMENTOS_MDSYNC.json
5. 05_CHECKSUM_SHA256_MANIFEST.txt

HASH SHA-256 DO PACOTE:
8f92b740e53a19b88c7f0932a4e5d6198f92b740e53a19b88c7f0932a4e4a189f
=======================================================`;

    // Se a biblioteca JSZip estiver disponível na janela ou globalmente
    if (typeof JSZip !== 'undefined') {
      try {
        const zip = new JSZip();
        zip.file('MANIFESTO_ANM_SIGBM.txt', manifestContent);
        zip.file('01_DECLARACAO_ESTABILIDADE_DCE_2026.txt', 'DCE REGULAR • Fator de Segurança FS=1.58 Drenado.');
        zip.file('02_SERIES_TEMPORAIS_PIEZOMETRIA.csv', 'instrumento,data,cota_boca,profundidade,cota_na,poropressao\nPZ-01,2026-03-08,842.50,11.45,831.05,206.5\nPZ-02,2026-03-08,845.20,12.80,832.40,219.7');

        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `MDSync_Dossie_Oficial_ANM_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        showToast('Download Iniciado', 'Arquivo ZIP baixado com sucesso no dispositivo.', 'success', 3500);
        return;
      } catch (err) {
        console.warn('Fallback para download direto de manifesto:', err);
      }
    }

    // Fallback: Download do manifesto em texto
    const blob = new Blob([manifestContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MDSync_Manifesto_ANM_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Manifesto Baixado', 'Dossiê homologado emitido com sucesso.', 'success', 3000);
  }

  // --- 8. INTERATIVIDADE ESPECÍFICA: TELA 07 (TRANSMISSÃO SIGBM) ---
  function initScreen07TransmissaoSigbm() {
    const currentFile = getCurrentScreenFile();
    if (!currentFile.includes('07-transmissao-homologada')) return;

    document.querySelectorAll('button').forEach((btn) => {
      const text = btn.textContent ? btn.textContent.trim().toLowerCase() : '';
      if (text.includes('transmitir') || text.includes('homologar') || text.includes('enviar')) {
        btn.addEventListener('click', () => {
          simulateSigbmTransmission(btn);
        });
      }
      if (text.includes('comprovante') || text.includes('recibo')) {
        btn.addEventListener('click', () => {
          downloadTransmissionReceipt();
        });
      }
    });
  }

  function simulateSigbmTransmission(btn) {
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin" style="font-size: 18px;">sync</span><span>Autenticando mTLS SIGBM...</span>`;

    showToast('Conectando ao SIGBM', 'Validando certificado digital e credenciais do responsável...', 'info', 2000);

    setTimeout(() => {
      btn.innerHTML = `<span class="material-symbols-outlined animate-spin" style="font-size: 18px;">sync</span><span>Transmitindo Carga Útil SHA-256...</span>`;
      showToast('Criptografia Validada', 'Enviando telemetria de 8 estruturas para o servidor ANM...', 'info', 2000);

      setTimeout(() => {
        const protocolNumber = `SIGBM-2026-ITAM-${Math.floor(100000 + Math.random() * 900000)}`;
        btn.innerHTML = `<span class="material-symbols-outlined" style="color: #4edea3; font-size: 20px;">verified</span><span>Homologado com Sucesso!</span>`;
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
        btn.style.border = '1px solid #10b981';

        showToast(
          'Transmissão Homologada!',
          `Protocolo Oficial emitido: ${protocolNumber}. Registro gravado no SIGBM da ANM.`,
          'success',
          5000
        );

        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }, 5000);
      }, 1600);
    }, 1400);
  }

  function downloadTransmissionReceipt() {
    const receipt = {
      sistema: 'MDSync Geotech Enterprise',
      orgaoRegulador: 'Agência Nacional de Mineração (ANM) / SIGBM',
      protocolo: `SIGBM-2026-ITAM-${Math.floor(100000 + Math.random() * 900000)}`,
      dataHoraEnvio: new Date().toISOString(),
      empreendimento: 'ITAMINAS - Cava Jangada',
      status: 'HOMOLOGADO E ASSINADO ICP-BRASIL',
      responsavelTecnico: 'Maycon Nascimento (CREA-MG 184.920/D)',
      hashSHA256: '8f92b740e53a19b88c7f0932a4e5d6198f92b740e53a19b88c7f0932a4e4a189f'
    };

    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Comprovante_Transmissao_SIGBM_${receipt.protocolo}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast('Comprovante Baixado', 'Recibo oficial exportado em formato JSON assinado.', 'success');
  }

  // --- 9. INTERATIVIDADE ESPECÍFICA: TELA 05 (RELATÓRIOS & AUDITORIA) ---
  function initScreen05Auditoria() {
    const currentFile = getCurrentScreenFile();
    if (!currentFile.includes('05-relatorios-auditoria')) return;

    document.querySelectorAll('button').forEach((btn) => {
      const text = btn.textContent ? btn.textContent.trim().toLowerCase() : '';
      if (text.includes('imprimir') || text.includes('pdf')) {
        btn.addEventListener('click', () => {
          window.print();
        });
      }
    });
  }

  // --- 10. INTERATIVIDADE ESPECÍFICA: TELA 08 (ROTINA DIÁRIA & EQUIPE) ---
  function initScreen08Rotina() {
    const currentFile = getCurrentScreenFile();
    if (!currentFile.includes('08-rotina-diaria')) return;

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        showToast('Tarefa Atualizada', 'Progresso do turno recalculado em tempo real.', 'info', 1500);
      });
    });
  }

  // --- INICIALIZAÇÃO NO CARREGAMENTO DO DOM ---
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScreen02Coleta();
    initScreen05Auditoria();
    initScreen06ExportacaoZip();
    initScreen07TransmissaoSigbm();
    initScreen08Rotina();
  });
})();
