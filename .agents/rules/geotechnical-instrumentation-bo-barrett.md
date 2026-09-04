---
name: geotechnical-instrumentation-bo-barrett
description: Diretrizes técnicas canônicas de instrumentação e monitoramento geotécnico baseadas em Myint Win Bo & Jeffrey Barrett (2023).
---

# Diretrizes Técnicas de Instrumentação Geotécnica (Bo & Barrett, 2023)

Este padrão técnico governa a integridade, o processamento de dados, os cálculos piezométricos e a gestão de segurança em todas as estruturas monitoradas pelo sistema MDSync / ITAMINAS.

## 1. Formulação de Piezometria e Poro-pressão

### 1.1 Casagrande e Tubo Aberto (INA)
* **Cota Piezométrica (NA)**:
  $$\text{Cota NA} = \text{Cota Boca} - \text{Profundidade Medida}$$
* **Poro-pressão na Ponta ($u$)**:
  $$u = (\text{Cota NA} - \text{Cota Ponta/Filtro}) \cdot 9{,}81\text{ kPa}$$
* **Atenção ao Efeito de Retardo (Time Lag)**: Em maciços de baixa condutividade hidráulica ($k < 10^{-6}\text{ m/s}$), leituras imediatas após chuvas intensas podem apresentar atraso físico na subida do nível estático.

### 1.2 Corda Vibrante (PZ)
* **Princípio**: Transdutor de diafragma com fio de alta frequência. Resposta instantânea à sobrepressão neutra.
* **Correções Mandatórias**:
  - Correção térmica: compensação da expansão térmica do fio de aço ($C_T$).
  - Correção barométrica: dedução das flutuações atmosféricas locais ($\Delta P_{\text{baro}}$) em piezômetros selados não compensados externamente.

## 2. Protocolo de Verificação e Fontes de Erro

Antes de validar anomalias ou disparar alarmes, certificar-se de:
1. **Desvio Angular de Furação**: Verificar se a inclinação do furo não subestima a profundidade vertical da ponta.
2. **Efeito do Recalque do Sensor**: Em aterros e pilhas compressíveis, a descida do sensor com o solo aumenta a coluna de água sobre a ponta; essa variação geométrica deve ser isolada da poro-pressão real.
3. **Condições Artesianas**: Identificar se a pressão medida decorre de aquífero confinado sobrejacente ou sobjacente.

## 3. Gestão de Níveis de Gatilho (TARP - Trigger Action Response Plan)

* **Normal (Verde)**: Nível abaixo de $70\%$ a $80\%$ do limite de projeto ou faixa histórica sazonal.
* **Atenção (Amarelo / Alert)**: Cota atinge entre $70\%$ e $80\%$ da cota de alerta crítico, ou observa-se aceleração na taxa de elevação. Exige dobrar a frequência de monitoramento e inspeção de campo focada.
* **Alerta / Ação (Vermelho / Trigger)**: Atingimento da cota de controle crítico ou desestabilização cinemática. Exige acionamento imediato do plano de contingência (paralisação de cargas na crista, contra-bermas ou drenagem profunda).

## 4. Estabilidade de Taludes e Critérios Cinemáticos

* **Razão de Deslocamento de Matsuo & Kawamura**: Relação entre deslocamento horizontal no pé e recalque na crista ($\delta / s$). A operação segura restringe-se a valores inferiores a $0{,}9$ da curva limite.
* **Taxa de Deformação de Tominaga & Hashimoto**: $\Delta \delta / \Delta s > 0{,}7$ caracteriza deflagração de superfície de ruptura ativa.
* **Análise de Velocidade Inversa ($1/v$)**: O monitoramento de marcos e inclinômetros em regime de aceleração deve acompanhar a projeção de $1/v \to 0$ para estimar o horizonte temporal de ruptura e mitigar riscos a equipes de campo.
