from pathlib import Path

def main():
    path = Path('stitch/screens/01-visao-geral-geotecnica.html')
    content = path.read_text(encoding='utf-8')

    old_modal_cases = '''    } else {
      icon.innerText = 'folder';
      title.innerText = 'Módulo Integrado: ' + type.toUpperCase();
      body.innerHTML = `
        <p>Parâmetros e diretrizes carregados conforme normas vigentes da Agência Nacional de Mineração (ANM Resolução 95/2022) e Padrão Global de Gestão de Rejeitos (GISTM).</p>
      `;
    }'''

    new_modal_cases = '''    } else if (type === 'paebm') {
      icon.innerText = 'notifications_active';
      title.innerText = 'PAEBM & Gestão de Emergência (Res. ANM 95/2022 • SYSDAM Benchmark)';
      body.innerHTML = `
        <div class="flex flex-col gap-space-sm text-body-sm">
          <div class="p-space-sm rounded-xl bg-error/15 text-error font-code-telemetry text-code-telemetry flex items-center justify-between">
            <span>ZAS: Zona de Autossalvamento (10 km / 30 min)</span>
            <span class="font-bold">STATUS OPERACIONAL: 100% OK</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
            <div class="p-space-sm rounded-xl bg-surface-container">
              <span class="font-bold text-on-surface">Sirenes Remotas (STI)</span>
              <p class="text-secondary text-[12px] mt-1 font-code-telemetry">3 estações ativas (VHF + Satélite)</p>
              <p class="text-on-surface-variant text-[11px] mt-1">Acionamento duplo redundante com teste periódico.</p>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container">
              <span class="font-bold text-on-surface">Pontos de Encontro</span>
              <p class="text-primary text-[12px] mt-1 font-code-telemetry">5 pontos georreferenciados</p>
              <p class="text-on-surface-variant text-[11px] mt-1">Rotas de fuga sinalizadas fora da mancha de inundação.</p>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container">
              <span class="font-bold text-on-surface">Defesa Civil &amp; ANM</span>
              <p class="text-tertiary text-[12px] mt-1 font-code-telemetry">Canal direto 24/7</p>
              <p class="text-on-surface-variant text-[11px] mt-1">Protocolo integrado com o Centro de Operações.</p>
            </div>
          </div>
          <div class="p-space-sm rounded-xl bg-surface-container-highest/60 text-[12px] text-on-surface-variant">
            <strong>Matriz de Ação por Nível de Perigo (ANM 95/2022):</strong>
            <ul class="list-disc list-inside mt-1 space-y-1 font-code-telemetry">
              <li>Nível 1 (Atenção): Inspeção diária e comunicação preventiva à ANM.</li>
              <li>Nível 2 (Alerta): Dobrar monitoramento, mobilizar consultoria e prontidão da Defesa Civil.</li>
              <li>Nível 3 (Emergência): Toque imediato de sirenes, evacuação total da ZAS e alerta geral.</li>
            </ul>
          </div>
        </div>
      `;
    } else if (type === 'governanca') {
      icon.innerText = 'policy';
      title.innerText = 'PSB: Plano de Segurança de Barragens (Lei 12.334/2010 • ANM 95/2022)';
      body.innerHTML = `
        <div class="flex flex-col gap-space-sm text-body-sm">
          <p class="text-on-surface-variant">Estrutura documental do Plano de Segurança organizada em conformidade com as exigências da ANM e padrões de governança SYSDAM:</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            <div class="p-space-sm rounded-xl bg-surface-container">
              <span class="font-bold text-primary">Volume I: Informações Gerais &amp; As-Built</span>
              <p class="text-on-surface-variant text-[11px] mt-1">Histórico construtivo, geologia da fundação, estudos hidrológicos e projetos executivos.</p>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container">
              <span class="font-bold text-primary">Volume II: Operação &amp; Monitoramento</span>
              <p class="text-on-surface-variant text-[11px] mt-1">Manuais de operação de comportas, vertedores, limites TARP e rotinas de piezometria.</p>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container">
              <span class="font-bold text-primary">Volume III: PAEBM &amp; Dam Break</span>
              <p class="text-on-surface-variant text-[11px] mt-1">Estudos hidrodinâmicos de ruptura hipotética, mancha de inundação e cadastramento da ZAS.</p>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container">
              <span class="font-bold text-primary">Volume IV: Revisões Periódicas (RPSB)</span>
              <p class="text-on-surface-variant text-[11px] mt-1">Relatórios de inspeção regular (RISR), Declaração de Condição de Estabilidade (DCE) e ARTs.</p>
            </div>
          </div>
        </div>
      `;
    } else if (type === 'fmea') {
      icon.innerText = 'analytics';
      title.innerText = 'Análise FMEA & Modos de Falha Geotécnicos (ANM 95/2022)';
      body.innerHTML = `
        <div class="flex flex-col gap-space-sm text-body-sm">
          <p class="text-on-surface-variant">Matriz de priorização de risco (RPN = Severidade x Ocorrência x Detecção) calibrada para as estruturas da Itaminas:</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-space-sm font-code-telemetry text-[11px]">
            <div class="p-space-sm rounded-xl bg-surface-container border border-secondary/30">
              <span class="font-bold text-secondary">Piping / Erosão Interna</span>
              <p class="text-on-surface-variant mt-1">RPN: 18 (Baixo) • Filtros e drenos de pé monitorados.</p>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container border border-secondary/30">
              <span class="font-bold text-secondary">Instabilidade de Talude</span>
              <p class="text-on-surface-variant mt-1">RPN: 24 (Controlado) • Fator de segurança FS &gt; 1.50.</p>
            </div>
            <div class="p-space-sm rounded-xl bg-surface-container border border-tertiary/30">
              <span class="font-bold text-tertiary">Subpressão em Fundação</span>
              <p class="text-on-surface-variant mt-1">RPN: 48 (Atenção) • Acompanhamento por PZ e radar 24/7.</p>
            </div>
          </div>
        </div>
      `;
    } else {
      icon.innerText = 'folder';
      title.innerText = 'Módulo Integrado: ' + type.toUpperCase();
      body.innerHTML = `
        <p>Parâmetros e diretrizes carregados conforme normas vigentes da Agência Nacional de Mineração (ANM Resolução 95/2022) e Padrão Global de Gestão de Rejeitos (GISTM).</p>
      `;
    }'''

    if old_modal_cases in content:
        content = content.replace(old_modal_cases, new_modal_cases, 1)
        path.write_text(content, encoding='utf-8')
        print("01-visao-geral-geotecnica.html updated successfully with PAEBM, PSB and FMEA modules.")
    else:
        print("Target not found in 01-visao-geral-geotecnica.html!")

if __name__ == '__main__':
    main()
