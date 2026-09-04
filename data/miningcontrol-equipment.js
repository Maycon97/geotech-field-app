/**
 * MDSync - Base de Dados de Frotas e Mapeamento de Equipamentos (F2M Mining Control - ITAMINAS)
 * Integrado com a Cava Jangada, Telemetria GPS e Alocação em Bancadas.
 */

window.MDSYNC_MININGCONTROL = {
    systemInfo: {
        platform: "F2M - Mining Control Cloud",
        client: "ITAMINAS Mineração S.A.",
        endpoint: "https://itaminas.report.miningcontrol.cloud",
        lastSync: "04/09/2026 09:35:00",
        coverage: "Cava Jangada, Cava Samambaia, PDE Mangaba, Pilhão",
        activeFleetTotal: 34,
        operationalStatus: "100% Operacional (Rede 4G / WiFi)"
    },

    polygons: [
        { id: "180386", name: "1220_NORTE_1_JGD_0826", benchElevation: 1220, type: "Lavra", material: "ROM COMUM JGD" },
        { id: "180392", name: "1250_NORTE_1_JGD_0826", benchElevation: 1250, type: "Perfuração & Desmonte", material: "ESTERIL JGD", isCriticalZone: true },
        { id: "180388", name: "1250_NORTE_AS_1_JGD_0826", benchElevation: 1250, type: "Perfuração", material: "ESTERIL JGD" },
        { id: "180382", name: "1060_CAVA LESTE_1_JGD_0826", benchElevation: 1060, type: "Lavra Fundo", material: "ESTERIL JGD" },
        { id: "180381", name: "1120_OESTE_1_JGD_0826", benchElevation: 1120, type: "Lavra", material: "ROM COMUM JGD" },
        { id: "180384", name: "1160_LESTE_1_JGD_0826", benchElevation: 1160, type: "Lavra", material: "ROM COMUM JGD" },
        { id: "180393", name: "1160_NORTE_1_JGD_0826", benchElevation: 1160, type: "Praça de Carga", material: "ESTERIL JGD" },
        { id: "-706875", name: "1370 E1_JGD", benchElevation: 1370, type: "Bota-fora / Pilha", material: "ESTERIL" },
        { id: "-705797", name: "ACESSO CAVAS", type: "Pista Principal", material: "Tráfego Pesado" }
    ],

    equipments: [
        {
            id: "PF-01",
            code: "PERF-SANDVIK-01",
            type: "Perfuratriz",
            typeCategory: "drilling",
            icon: "fa-solid fa-bore-hole",
            model: "Sandvik Pantera DP1500i",
            fleet: "FROTA PERFURAÇÃO MINA",
            operator: "Lucas Silva (Itaminas)",
            status: "Operação Ativa (Perfuração)",
            statusClass: "status-danger",
            speedKmh: 0.0,
            hourmeter: 4820.5,
            polygonAllocation: "1250_NORTE_1_JGD_0826",
            sector: "N_Sup_1231.44 (Parede Norte Superior)",
            coordinates: {
                lat: -20.092372,
                lon: -44.089795,
                elevation: 1231.44,
                utmE: 595159.60,
                utmN: 7778037.06
            },
            network: "4G LTE (100% Sinal)",
            operationalNote: "Equipamento gerador da vibração superficial identificada no Flash Report FR012 da Hexagon. Interrupção e recuo alinhados com o CMG às 09:31.",
            highlight: true
        },
        {
            id: "PF-04",
            code: "PERF-ATLAS-04",
            type: "Perfuratriz",
            typeCategory: "drilling",
            icon: "fa-solid fa-bore-hole",
            model: "Atlas Copco SmartROC D65",
            fleet: "FROTA PERFURAÇÃO MINA",
            operator: "Márcio Pereira",
            status: "Aguardando Frente",
            statusClass: "status-warning",
            speedKmh: 0.0,
            hourmeter: 3215.2,
            polygonAllocation: "1160_LESTE_1_JGD_0826",
            sector: "Bancada Leste Intermediária",
            coordinates: {
                lat: -20.093800,
                lon: -44.087200,
                elevation: 1160.0,
                utmE: 595430.0,
                utmN: 7777880.0
            },
            network: "4G LTE",
            operationalNote: "Em manobra de posicionamento no setor leste."
        },
        {
            id: "ESC-01",
            code: "CAT-374F-01",
            type: "Escavadeira",
            typeCategory: "loading",
            icon: "fa-solid fa-trowel-bricks",
            model: "Caterpillar 374F L (75t)",
            fleet: "FROTA CARGA MINA",
            operator: "José Carlos",
            status: "Carregamento Efetivo",
            statusClass: "status-success",
            speedKmh: 0.0,
            hourmeter: 8940.0,
            polygonAllocation: "1120_OESTE_1_JGD_0826",
            sector: "Praça Oeste 1120m",
            coordinates: {
                lat: -20.094800,
                lon: -44.091500,
                elevation: 1120.0,
                utmE: 594980.0,
                utmN: 7777770.0
            },
            network: "4G LTE",
            operationalNote: "Carregamento de ROM Comum para alimentação da Britagem."
        },
        {
            id: "ESC-03",
            code: "KOM-PC1250-03",
            type: "Escavadeira",
            typeCategory: "loading",
            icon: "fa-solid fa-trowel-bricks",
            model: "Komatsu PC1250-8 (115t)",
            fleet: "FROTA CARGA MINA",
            operator: "Marcos Vieira",
            status: "Carregamento Estéril",
            statusClass: "status-success",
            speedKmh: 0.0,
            hourmeter: 6410.8,
            polygonAllocation: "1060_CAVA LESTE_1_JGD_0826",
            sector: "Fundo de Cava 1060m",
            coordinates: {
                lat: -20.094100,
                lon: -44.088100,
                elevation: 1060.0,
                utmE: 595335.0,
                utmN: 7777845.0
            },
            network: "4G LTE",
            operationalNote: "Decapeamento de fundo de cava e rebaixamento."
        },
        {
            id: "CBALT0319",
            code: "CAM-SCANIA-319",
            type: "Caminhão Fora-de-Estrada",
            typeCategory: "hauling",
            icon: "fa-solid fa-truck-monster",
            model: "Scania G480 8x4 Heavy Tipper (28t)",
            fleet: "CB ALTTO MINA 28T",
            operator: "Tiago Alves",
            status: "Transporte em Trânsito (Carregado)",
            statusClass: "status-primary",
            speedKmh: 24.5,
            hourmeter: 5120.0,
            polygonAllocation: "ACESSO CAVAS",
            sector: "Rampa Principal de Saída da Cava",
            coordinates: {
                lat: -20.095500,
                lon: -44.089200,
                elevation: 1145.0,
                utmE: 595220.0,
                utmN: 7777690.0
            },
            network: "4G LTE",
            operationalNote: "Ciclo Jangada -> Britagem Primária."
        },
        {
            id: "CBALT0320",
            code: "CAM-SCANIA-320",
            type: "Caminhão Fora-de-Estrada",
            typeCategory: "hauling",
            icon: "fa-solid fa-truck-monster",
            model: "Scania G480 8x4 Heavy Tipper (28t)",
            fleet: "CB ALTTO MINA 28T",
            operator: "Rafael Costa",
            status: "Fila de Carga",
            statusClass: "status-warning",
            speedKmh: 0.0,
            hourmeter: 4980.2,
            polygonAllocation: "1120_OESTE_1_JGD_0826",
            sector: "Praça Oeste 1120m",
            coordinates: {
                lat: -20.094950,
                lon: -44.091300,
                elevation: 1120.0,
                utmE: 595000.0,
                utmN: 7777750.0
            },
            network: "4G LTE",
            operationalNote: "Aguardando manobra de ré sob a escavadeira ESC-01."
        },
        {
            id: "TR-02",
            code: "TRAT-CAT-D8T",
            type: "Trator de Esteira",
            typeCategory: "support",
            icon: "fa-solid fa-tractor",
            model: "Caterpillar D8T",
            fleet: "FROTA TRATORES ESTEIRA",
            operator: "Valdir Ramos",
            status: "Manutenção de Berma / Limpeza",
            statusClass: "status-success",
            speedKmh: 3.2,
            hourmeter: 7810.0,
            polygonAllocation: "1160_NORTE_1_JGD_0826",
            sector: "Berma Norte 1160m",
            coordinates: {
                lat: -20.093100,
                lon: -44.089400,
                elevation: 1160.0,
                utmE: 595200.0,
                utmN: 7777950.0
            },
            network: "4G LTE",
            operationalNote: "Conformação de leiras de proteção e drenagem superficial."
        },
        {
            id: "MN-01",
            code: "MOTO-CAT-140K",
            type: "Motoniveladora",
            typeCategory: "support",
            icon: "fa-solid fa-road",
            model: "Caterpillar 140K",
            fleet: "FROTA INFRAESTRUTURA",
            operator: "Reginaldo Lima",
            status: "Conservação de Pista",
            statusClass: "status-success",
            speedKmh: 8.0,
            hourmeter: 6150.3,
            polygonAllocation: "ACESSO CAVAS",
            sector: "Rampa Sul Cava Jangada",
            coordinates: {
                lat: -20.096100,
                lon: -44.088600,
                elevation: 1140.0,
                utmE: 595280.0,
                utmN: 7777620.0
            },
            network: "4G LTE",
            operationalNote: "Nivelamento de pista de tráfego de caminhões 28T/44T."
        }
    ]
};
