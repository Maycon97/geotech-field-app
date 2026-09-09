/**
 * Plano de Lavra e Controle de Qualidade - Cava Jangada e Complexo Itaminas
 * Fonte: Apresentação Oficial Line Up (Programação de Lavra - 10 de Setembro de 2026)
 * Caminho Original: SPLO - General/02) Controle de Qualidade/Programação de Lavra/2026/09_Setembro/LINE.UP/09-09-2026/Apresentação L. UP_10_de Setembro.pptx
 */

(function(global) {
  'use strict';

  const PlanoLavraJangada = {
    dataReferencia: '2026-09-10',
    dataLineUp: '2026-09-09',
    titulo: 'Planejamento de Lavra e Controle de Qualidade',
    empresa: 'Itaminas Comércio de Minérios S.A.',
    responsaveis: {
      mina: 'Roberto',
      qualidade: 'José Geraldo / José Laercio',
      planejamentoLavra: 'Deiwison',
      geotecnia: 'Maycon Nascimento'
    },
    
    // Status Crítico de Interdição Geotécnica
    interdicaoGeotecnica: {
      setor: 'Mina Cava Jangada - Zona Oeste',
      status: 'INTERDITADA PELA GEOTECNIA',
      tarpNivel: 'TARP NÍVEL 3 (CRÍTICO)',
      inicioRestricao: '2026-07-27',
      dataMarco: '2026-08-12',
      motivoOficial: 'Na programação do dia não houve marcação de lavra no local indicado devido ao isolamento da área pela geotecnia.',
      acaoOperacionalDesvio: 'Estamos entrando na frente de Lavra em Engenho Seco na Índia fora do plano mensal para atender qualidade das usinas, substituindo a massa da zona oeste na Mina Jangada, que se encontra interditada pela geotecnia.',
      correlacaoRadar: 'Corresponde à anomalia de +20.00 mm registrada pelo Radar Hexagon IBIS-FM EVO 01 no talude superior / berma 1231.'
    },

    // Frentes de Lavra Mapeadas
    frentesLavra: [
      {
        id: 'JGD-OESTE',
        nome: 'Jangada Oeste (Cota Final do Banco)',
        status: 'INTERDITADA',
        statusClass: 'status-danger',
        cor: '#ef4444',
        equipamento: 'MAQ 876',
        capacidadeDia: '5.000 ton',
        destino: 'ITM04 / SCALPER / JACÓ',
        tipoMaterial: 'ROM / Comum / Estéril',
        teores: {
          fe: 59.06,
          sio2: 6.41,
          al: 1.57,
          p: 0.139,
          feOesteEspecial: 58.10,
          sio2Especial: 7.80,
          alEspecial: 2.17,
          pEspecial: 0.090,
          feBaixo: 50.05,
          sio2Alto: 15.56,
          feo: 1.06
        },
        orientacoes: [
          'Prioridade 1: Remover matacos para liberar avanço da lavra quando houver liberação geotécnica;',
          'Prioridade 2: Área interditada para operação até segunda ordem;',
          'Prioridade 3: Área interditada para correção do talude;',
          'Qualidade irá acompanhar lavra para direcionar material assim que liberada.'
        ],
        imagem: 'assets/plano_lavra/cava-jangada-oeste-interditada.jpg'
      },
      {
        id: 'JGD-LESTE',
        nome: 'Jangada Leste',
        status: 'PERFURAÇÃO E DESMONTE',
        statusClass: 'status-warning',
        cor: '#ffb95f',
        equipamento: 'Equipe de Furação / D&B',
        capacidadeDia: 'Programada',
        destino: 'ITM04 / JACÓ / SCALPER / ITM09',
        tipoMaterial: 'Comum / Estéril / Especial',
        teores: {
          fe: 47.34,
          sio2: 29.94,
          feo: 2.55,
          feOeste: 62.58,
          sio2Oeste: 5.52,
          alOeste: 0.98,
          pOeste: 0.060
        },
        orientacoes: [
          'Prioridade 1: Área para perfuração e desmonte controlado;',
          'Prioridade 2: Seguir rigorosamente o plano de fogo para minimizar vibrações no maciço rochoso adjacente.'
        ],
        imagem: 'assets/plano_lavra/cava-jangada-leste-perfuracao.jpg'
      },
      {
        id: 'JGD-FUNDO',
        nome: 'Jangada Leste (Fundo de Cava)',
        status: 'OPERACIONAL',
        statusClass: 'status-success',
        cor: '#4edea3',
        equipamento: 'MAQ 908',
        capacidadeDia: 'Programada',
        destino: 'ITM09 / Jacó',
        tipoMaterial: 'ROM Especial / Sumpão',
        teores: {
          fe: 63.61,
          sio2: 6.57,
          al: 0.43,
          p: 0.169
        },
        orientacoes: [
          'Prioridade 1: Lavra de minério de alto teor para ITM09 e matacos para sumpão;',
          'Prioridade 2: Área para perfuração e desmonte da nova bancada rebaixada;'
        ],
        imagem: 'assets/plano_lavra/cava-jangada-fundo-cava.jpg'
      },
      {
        id: 'PILHAO-JGD-NORTE',
        nome: 'Pilhão / Jangada Norte',
        status: 'ATENÇÃO GEOTÉCNICA',
        statusClass: 'status-warning',
        cor: '#f59e0b',
        equipamento: 'MAQ 996',
        capacidadeDia: '5.000 kt',
        destino: 'Jacó (Estéril) / ITM04 ou Bolo de Noiva (Comum)',
        tipoMaterial: 'Estéril / Comum (18m)',
        teores: {
          fe: 49.32,
          sio2: 26.55,
          feo: 1.28
        },
        orientacoes: [
          'Prioridade 1: Lavra de estéril para Jacó e comum para ITM04 ou Bolo de Noiva;',
          'Atenção Geotécnica: Atentar à cota do plano de lavra, existe material solto no talude que precisa ser lavrado!',
          'Seguir as marcações de cortes no piso (bancada de 18m).'
        ],
        imagem: 'assets/plano_lavra/cava-jangada-pilhao-norte.jpg'
      },
      {
        id: 'PILHAO-JGD',
        nome: 'Pilhão / Jangada Frentes Gerais',
        status: 'OPERACIONAL',
        statusClass: 'status-success',
        cor: '#38bdf8',
        equipamentos: ['MAQ 2419 (5.000 kt)', 'MAQ 633 (6.000 kt)', 'MAQ 2466 (11.000 kt)', 'MAQ 966 (6.000 kt)'],
        destino: 'ITM04 / ITM09 / SCALPER / Estoque Bolo de Noiva / Cava Samambaia',
        teores: {
          feEspecial: 59.80,
          sio2Especial: 7.81,
          alEspecial: 1.78,
          pEspecial: 0.100,
          feComum: 49.32,
          sio2Comum: 26.55,
          feoComum: 1.28
        },
        orientacoes: [
          'Prioridade 1: Lavra de minério especial para ITM09/SCALPER e Comum para ITM04/Bolo de Noiva;',
          'Destinar estéril da MAQ 2466 para Cava Samambaia.'
        ],
        imagem: 'assets/plano_lavra/plano-lavra-geral-setembro.jpg'
      }
    ],

    // Parâmetros Geotécnicos de Empilhamento nos Estoques Intermediários
    estoquesIntermediarios: [
      {
        nome: 'Estoque Bolo de Noiva',
        volume: 214472,
        unidade: 't',
        restricao: 'Destinar apenas minério in situ para este estoque.',
        parametrosGeotecnicos: {
          larguraBerma: '7,0 m',
          alturaBanco: '10,0 m',
          anguloInclinacao: '30°'
        },
        imagem: 'assets/plano_lavra/plano-estoques-intermediarios.jpg'
      },
      {
        nome: 'Estoque Samambaia',
        volume: 38477,
        unidade: 't',
        restricao: 'Minério de suporte operacional e estéril conforme programação.'
      },
      {
        nome: 'Estoque da Divisa',
        volume: 119319,
        unidade: 't',
        restricao: 'Estoque estratégico de regularização de alimentação.'
      }
    ],

    // Programação das Pilhas e Alimentação Global das Usinas
    qualidadeUsinas: {
      itm09Especial: {
        fe: 61.44,
        sio2: 5.97,
        al2o3: 1.27,
        p: 0.06,
        mn: 0.26,
        ppc: 3.70
      },
      scalperEspecial: {
        fe: 60.99,
        sio2: 5.84,
        al2o3: 1.43,
        p: 0.07,
        mn: 0.16,
        ppc: 4.56
      },
      itm04Comum: {
        fe: 50.34,
        sio2: 21.94,
        al2o3: 1.45,
        p: 0.07,
        mn: 0.30,
        ppc: 3.92
      }
    }
  };

  global.PlanoLavraJangada = PlanoLavraJangada;
})(typeof window !== 'undefined' ? window : this);
