# Diretrizes de Engenharia e Desenvolvimento - MDSync

O MDSync é o sistema de campo para monitoramento de estruturas geotécnicas (Barragens e Pilhas de Disposição de Estéril/Rejeito - PDE).
Ao desenvolver ou manter este projeto, siga rigorosamente as diretrizes abaixo:

## 1. Padrões de Georreferenciamento e Cartografia
- **Datum Oficial**: SIRGAS 2000.
- **Projeção Padrão**: Universal Transversa de Mercator (UTM), Zona 23 Sul (EPSG: 31983).
- **Validação de Coordenadas**: Todas as coordenadas Este (EW/X ~ 590000 - 600000) e Norte (NS/Y ~ 7770000 - 7790000) devem ser validadas contra valores nulos ou fora do quadrante da mina.

## 2. Integridade dos Dados Geotécnicos
- **Tipos de Instrumentos**:
  - `INA` (Indicador de Nível D'Água / Piezômetro Casagrande)
  - `PZ` (Piezômetro de Corda Vibrante / Elétrico)
  - `VZ` / `MCD` / `ETR` (Medidores de Vazão e Calhas Parshall)
  - `MV` / `MS` (Marcos Superficiais de Deslocamento)
  - `NA` (Nível d'Água do Reservatório)
- **Validação de Limites**: As leituras devem ser comparadas com os limites operacionais:
  - *Normal* (dentro dos parâmetros de segurança)
  - *Atenção* (requer acompanhamento e repetição de leitura)
  - *Alerta* (inspeção imediata no local)
  - *Emergência* (acionamento do PAEBM / plano de contingência)

## 3. Arquitetura Offline-First
- O app deve funcionar 100% desconectado em campo.
- Leituras registradas offline são enfileiradas no IndexedDB (`localReadings`) e enviadas quando houver conectividade.
- Nunca faça chamadas a APIs que bloqueiem a interface se o usuário estiver sem internet.

## 4. Padrões de Código e Performance
- Evite arquivos monolíticos gigantescos na thread de renderização.
- Utilize o catálogo leve `data/catalog.json` para carregamento instantâneo e carregue dados de estruturas (`data/structures/*.json`) sob demanda.
- Destrua instâncias do Chart.js antes de recriar novos gráficos para evitar vazamento de memória.
