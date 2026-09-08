/**
 * MDSync Core Geotechnical Engine
 * Modulo de calculos analiticos, formulacoes canonicas e criterios de seguranca
 * Referencias: Bo & Barrett (2023), Terzaghi, Fukuzono (1985), Res. ANM 95/2022.
 */

export const Geotech = {
    /**
     * Densidade da agua / peso especifico da agua (kN/m³)
     */
    GAMMA_WATER: 9.81,

    /**
     * 1. PIEZOMETRIA E PORO-PRESSAO (Bo & Barrett, 2023)
     */

    /**
     * Calcula a Cota do Nivel d'Agua (Cota Piezometrica) para piezometros abertos / INA
     * @param {number} cotaBoca - Cota da boca do tubo (metros acima do nivel do mar)
     * @param {number} profundidade - Profundidade medida com fita metrica (metros)
     * @returns {number|null} Cota NA calculada
     */
    calculateCotaNA(cotaBoca, profundidade) {
        if (!Number.isFinite(cotaBoca) || !Number.isFinite(profundidade)) {
            return null;
        }
        return Number((cotaBoca - profundidade).toFixed(3));
    },

    /**
     * Calcula a Poro-pressao hidrostatica na ponta/filtro do piezometro
     * @param {number} cotaNA - Cota do nivel d'agua (m)
     * @param {number} cotaPonta - Cota da ponta ou filtro do instrumento (m)
     * @param {number} [gammaW=9.81] - Peso especifico da agua em kN/m³
     * @returns {number|null} Poro-pressao em kPa
     */
    calculatePorePressure(cotaNA, cotaPonta, gammaW = 9.81) {
        if (!Number.isFinite(cotaNA) || !Number.isFinite(cotaPonta)) {
            return null;
        }
        const colunaAgua = cotaNA - cotaPonta;
        if (colunaAgua <= 0) {
            return 0.0;
        }
        return Number((colunaAgua * gammaW).toFixed(2));
    },

    /**
     * Piezometro de Corda Vibrante (PZ)
     * Aplica compensacao termica e barometrica
     * @param {number} freqHz - Frequencia lida (Hz)
     * @param {number} calibFactor - Fator linear de calibracao do sensor (kPa/digito ou kPa/Hz²)
     * @param {number} tempC - Temperatura atual (°C)
     * @param {number} temp0C - Temperatura base de calibracao (°C)
     * @param {number} cT - Coeficiente termico do fio (kPa/°C)
     * @param {number} baroKPa - Pressao atmosferica atual (kPa)
     * @param {number} baro0KPa - Pressao atmosferica de calibracao (kPa)
     * @returns {number} Poro-pressao efetiva corrigida (kPa)
     */
    calculatePZVibratingWire(freqHz, calibFactor, tempC = 20, temp0C = 20, cT = 0, baroKPa = 101.32, baro0KPa = 101.32) {
        if (!Number.isFinite(freqHz) || !Number.isFinite(calibFactor)) {
            return null;
        }
        // Digitos lineares B = (freq / 1000)² * 1000
        const digits = Math.pow(freqHz / 1000, 2) * 1000;
        const rawPressureKPa = digits * calibFactor;
        const thermalCorrectionKPa = (tempC - temp0C) * cT;
        const barometricCorrectionKPa = (baroKPa - baro0KPa);
        const correctedPressureKPa = rawPressureKPa + thermalCorrectionKPa - barometricCorrectionKPa;
        return Number(Math.max(0, correctedPressureKPa).toFixed(2));
    },

    /**
     * Valida consistencia fisica da leitura de campo (Bo & Barrett, Cap. 8)
     */
    validatePiezometerReading(profundidade, cotaBoca, profMax) {
        const issues = [];
        if (profundidade < 0) {
            issues.push({
                type: "artesianismo",
                message: "Nivel d'agua acima da boca do tubo (artesianismo ou cota de referencia invertida)."
            });
        }
        if (profMax > 0 && profundidade > profMax * 1.05) {
            issues.push({
                type: "comprimento_excedido",
                message: `Profundidade medida (${profundidade.toFixed(2)}m) excede o comprimento do tubo (${profMax.toFixed(2)}m). Verifique assoreamento ou fita enroscada.`
            });
        }
        return {
            isValid: issues.length === 0,
            issues
        };
    },

    /**
     * 2. ESTABILIDADE DE TALUDES E CRITERIOS CINEMATICOS
     */

    /**
     * Criterio de Matsuo & Kawamura: Razao de Deslocamento (delta / s)
     * @param {number} horizontalToeDisplacementMm - Deslocamento horizontal no pe (mm)
     * @param {number} crestSettlementMm - Recalque vertical na crista (mm)
     * @returns {object} Status da razao cinematica
     */
    matsuoKawamuraRatio(horizontalToeDisplacementMm, crestSettlementMm) {
        if (!Number.isFinite(horizontalToeDisplacementMm) || !Number.isFinite(crestSettlementMm) || crestSettlementMm === 0) {
            return { ratio: null, safe: true, label: "Dados insuficientes" };
        }
        const ratio = Math.abs(horizontalToeDisplacementMm / crestSettlementMm);
        const isSafe = ratio < 0.90;
        return {
            ratio: Number(ratio.toFixed(3)),
            safe: isSafe,
            status: isSafe ? "Seguro" : "Zona Critica",
            threshold: 0.90,
            guidance: isSafe 
                ? "Razao cinematica dentro do limite operacional seguro (< 0,90)."
                : "ATENCAO: Razao pe/crista ultrapassou 0,90 da curva de ruptura de Matsuo & Kawamura. Requer inspecao visual urgente."
        };
    },

    /**
     * Criterio de Tominaga & Hashimoto: Taxa de Deformacao Diferencial (Delta delta / Delta s)
     * @param {number} deltaHorizontalMm - Incremento de deslocamento horizontal no intervalo (mm)
     * @param {number} deltaVerticalMm - Incremento de recalque vertical no intervalo (mm)
     * @returns {object} Indicacao de superficie de ruptura ativa
     */
    tominagaHashimotoRate(deltaHorizontalMm, deltaVerticalMm) {
        if (!Number.isFinite(deltaHorizontalMm) || !Number.isFinite(deltaVerticalMm) || deltaVerticalMm === 0) {
            return { rate: null, activeRupture: false };
        }
        const rate = Math.abs(deltaHorizontalMm / deltaVerticalMm);
        const active = rate > 0.70;
        return {
            rate: Number(rate.toFixed(3)),
            activeRupture: active,
            status: active ? "Ruptura Ativa em Deflagracao" : "Regime Estavel",
            threshold: 0.70,
            guidance: active
                ? "ALERTA: Taxa diferencial superior a 0,70. Caracteriza aceleracao e superficie de cisalhamento ativa no macico."
                : "Taxa diferencial compativel com acomodacao volumetrica estavel (<= 0,70)."
        };
    },

    /**
     * Metodo da Velocidade Inversa (Fukuzono, 1985 / Rose & Hungr, 2007)
     * Utilizado para radares de talude e prismas topograficos em regime acelerado (1/v -> 0).
     * @param {Array<{t: number, v: number}>} points - Vetor de pares { t: timestamp_horas, v: velocidade_mm_h }
     * @returns {object} Projecao do horizonte temporal de ruptura (tf)
     */
    fukuzonoInverseVelocity(points) {
        if (!Array.isArray(points) || points.length < 2) {
            return { valid: false, message: "Necessario ao menos 2 pontos temporais para calculo de 1/v." };
        }

        const validPoints = points
            .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v) && p.v > 0)
            .map(p => ({ t: p.t, invV: 1 / p.v }));

        if (validPoints.length < 2) {
            return { valid: false, message: "Velocidades nulas ou invalidas para calcular 1/v." };
        }

        // Regressao linear: invV = a * t + b
        const n = validPoints.length;
        let sumT = 0, sumInvV = 0, sumTInvV = 0, sumT2 = 0;

        for (const pt of validPoints) {
            sumT += pt.t;
            sumInvV += pt.invV;
            sumTInvV += (pt.t * pt.invV);
            sumT2 += (pt.t * pt.t);
        }

        const denom = (n * sumT2 - sumT * sumT);
        if (denom === 0) {
            return { valid: false, message: "Intervalo temporal nulo." };
        }

        const a = (n * sumTInvV - sumT * sumInvV) / denom; // Coeficiente angular (taxa de variacao de 1/v)
        const b = (sumInvV - a * sumT) / n;

        // Se a inclinacao for negativa, a velocidade esta crescendo (1/v decresce em direcao a 0)
        const isAccelerating = a < 0;
        let timeToFailureHours = null;

        if (isAccelerating) {
            // 1/v = 0 => t_f = -b / a
            const tFailure = -b / a;
            const lastT = validPoints[validPoints.length - 1].t;
            timeToFailureHours = Number(Math.max(0, tFailure - lastT).toFixed(2));
        }

        return {
            valid: true,
            isAccelerating,
            slope: Number(a.toFixed(5)),
            regime: isAccelerating ? "Acelerado (Risco de Ruptura)" : "Desacelerado / Estavel",
            timeToFailureHours,
            lastVelocityMmH: Number((1 / validPoints[validPoints.length - 1].invV).toFixed(2)),
            guidance: isAccelerating
                ? `ALERTA CRITICO: Regime acelerado identificado (inclinacao de 1/v = ${a.toFixed(4)}). Tempo estimado para colapso: ~${timeToFailureHours} horas se a taxa persistir.`
                : "Regime com velocidade estavel ou desacelerada (sem tendencia de 1/v tender a zero)."
        };
    },

    /**
     * 3. HIDRAULICA DE DRENAGEM E MEDICAO DE VAZAO
     */

    /**
     * Vertedor Triangular 90° Thompson
     * Equacao: Q = 1,38 * H^(2,5) [m³/s]
     * @param {number} headMeters - Altura da lamina d'agua sobre a crista do vertedor (m)
     * @returns {object} Vazao calculada em m³/s e litros/s
     */
    thompsonWeirFlow(headMeters) {
        if (!Number.isFinite(headMeters) || headMeters <= 0) {
            return { flowM3s: 0, flowLps: 0 };
        }
        const flowM3s = 1.38 * Math.pow(headMeters, 2.5);
        const flowLps = flowM3s * 1000;
        return {
            flowM3s: Number(flowM3s.toFixed(5)),
            flowLps: Number(flowLps.toFixed(2))
        };
    },

    /**
     * Calha Parshall padrao
     * Equacao geral: Q = C * H^n [m³/s]
     * Exemplo: garganta de 3 polegadas (W = 76mm): C = 0,176, n = 1,55
     * @param {number} headMeters - Carga hidraulica H no ponto Ha (m)
     * @param {number} [throatInches=3] - Largura da garganta da calha em polegadas
     * @returns {object} Vazao calculada
     */
    parshallFlumeFlow(headMeters, throatInches = 3) {
        if (!Number.isFinite(headMeters) || headMeters <= 0) {
            return { flowM3s: 0, flowLps: 0 };
        }
        // Coeficientes padronizados ASTM D1941 / USBR
        const coeffs = {
            1: { C: 0.0604, n: 1.55 },
            2: { C: 0.1207, n: 1.55 },
            3: { C: 0.1760, n: 1.55 },
            6: { C: 0.3810, n: 1.58 },
            9: { C: 0.5350, n: 1.53 },
            12: { C: 0.6900, n: 1.522 }
        };
        const cfg = coeffs[throatInches] || coeffs[3];
        const flowM3s = cfg.C * Math.pow(headMeters, cfg.n);
        const flowLps = flowM3s * 1000;
        return {
            flowM3s: Number(flowM3s.toFixed(5)),
            flowLps: Number(flowLps.toFixed(2)),
            throat: `${throatInches} pol`
        };
    },

    /**
     * 4. MOTOR TARP UNIFICADO (TRIGGER ACTION RESPONSE PLAN)
     * Alinhado com a Resolucao ANM nº 95/2022 e Portaria DNPM 70.389/2017
     */
    evaluateTARP(measuredValue, thresholds) {
        const t = thresholds || {};
        const val = Number(measuredValue);
        if (!Number.isFinite(val)) {
            return { level: "Normal", severity: "normal", guidance: "Sem leitura para analise." };
        }

        const emergency = Number(t.emergency ?? t.emergencyElevation);
        const alert = Number(t.alert ?? t.alertElevation);
        const warning = Number(t.warning ?? t.attention ?? t.attentionElevation);

        if (Number.isFinite(emergency) && val >= emergency) {
            return {
                level: "Emergência",
                severity: "emergency",
                code: 3,
                guidance: "EMERGENCIA (Nivel 3 ANM): Atingimento de cota limite de ruptura. Comunicar imediatamente a Coordenacao de Geotecnia, evacuar area a jusante e acionar o PAEBM."
            };
        }

        if (Number.isFinite(alert) && val >= alert) {
            return {
                level: "Alerta",
                severity: "alert",
                code: 2,
                guidance: "ALERTA (Nivel 2 ANM): Cota piezometrica excedeu limite critico de projeto. Realizar leitura confirmatoria imediata e inspecionar taludes."
            };
        }

        if (Number.isFinite(warning) && val >= warning) {
            return {
                level: "Atenção",
                severity: "warning",
                code: 1,
                guidance: "ATENCAO (Nivel 1 ANM): Cota na faixa preventiva (80% do limite Bo & Barrett). Dobrar periodicidade de leituras e verificar pluviometria recente."
            };
        }

        return {
            level: "Normal",
            severity: "normal",
            code: 0,
            guidance: "Operacao normal em conformidade com os limites de projeto."
        };
    }
};

// Suporte universal: expoe no escopo global para browsers convencionais
if (typeof window !== "undefined") {
    window.MDSyncGeotech = Geotech;
}
