/**
 * ==========================================================================
 * GEOSYNC - GEOTECHNICAL FIELD COLLECTOR & CENTRALIZER LOGIC ENGINE
 * ==========================================================================
 */

// --- 1. SEED DATA & STATE MANAGEMENT ---
let isOnline = true;
let isHighContrast = false;
let instrumentChart = null;
let pilhasInstrumentChart = null;
const indicatorCharts = {};
let deferredInstallPrompt = null;
const SOURCE_DATABASE = window.GEOSYNC_DATABASE || null;
const SOURCE_DATASET_VERSION = SOURCE_DATABASE?.version || "demo-seed-v1";
const SECURITY_PIN_HASH_KEY = "mdsync_security_pin_hash_v1";
const SECURITY_PRIVACY_KEY = "mdsync_privacy_notice_acceptance_v1";
const SECURITY_SESSION_KEY = "mdsync_security_session_until_v1";
const SECURITY_SESSION_MS = 30 * 60 * 1000;
const SECURITY_GATE_ENABLED = false;
const RELEASE_STATE_KEY = "mdsync_release_state_v1";
const GEOREF_STATE_KEY = "mdsync_georef_state_v1";
const GEOVIEW_STATE_KEY = "mdsync_geoview_state_v1";
const GEOSPATIAL_STATE_KEY = "mdsync_geospatial_layers_v1";
const MINING_SETTINGS_KEY = "mdsync_mining_settings_v1";
const CORPORATE_SYNC_STATE_KEY = "mdsync_corporate_sync_v1";
const VEHICLE_INSPECTIONS_KEY = "mdsync_vehicle_inspections_v1";
const CORPORATE_SYNC_PATH = "C:\\Users\\maycon.nascimento\\ITAMINAS\\SPLO - General\\03) Geotecnia\\05) PCM";
const CORPORATE_SYNC_INTERVAL_MS = 60 * 1000;
const GEOREF_SAMPLE_COUNT = 3;
const GEOREF_TARGET_ACCURACY_M = 5;
const GEOREF_MAX_ACCEPTABLE_ACCURACY_M = 15;
const SIRGAS_2000 = {
    datum: "SIRGAS 2000",
    geographicEpsg: "EPSG:4674",
    ellipsoid: "GRS80",
    semiMajorAxis: 6378137,
    inverseFlattening: 298.257222101,
    scaleFactor: 0.9996,
    falseEasting: 500000,
    falseNorthingSouth: 10000000
};
let appBooted = false;
let securityIdleTimer = null;
let releaseState = { current: null, history: [] };
let lastGeolocationFix = null;
let geoEvidenceState = { reading: null, inspection: null, vehicle: null };
const androidGeoCallbacks = {};
let GEOVIEW_CATALOG = window.MDSYNC_GEOVIEW_CATALOG || { dashboards: [], sourcePath: "" };
const GEOVIEW_OPERATIONAL = window.MDSYNC_GEOVIEW_OPERATIONAL || {
    pileMetrics: [],
    structureCoordinates: [],
    rainfall: [],
    rainfallStations: {},
    defaultLayers: {},
    inspections: []
};
const GOOGLE_EARTH_GEOTEC = window.MDSYNC_GOOGLE_EARTH_GEOTEC || {
    structures: [],
    instruments: [],
    additionalPoints: []
};
let readingPhotoEvidence = null;
let geoViewState = { importedFiles: [], dashboardFiles: {}, maps: {} };
let geoSpatialState = { selectedStructure: null, layers: {}, manualCoordinates: {} };
let earthMapView = { zoom: 1, centerX: 400, centerY: 200, layersVisible: true, focusedInstrumentId: null, liveGps: null };
let geoViewActiveDashboardId = null;
let geoViewShowAllDashboards = false;
let inspectionTemplate = "estabilidade";
let corporateSyncDirectoryHandle = null;
let corporateSyncTimer = null;
let corporateSyncSnapshot = {};
let corporateSyncSessionFiles = [];
let activeGeorefReference = null;
let vehicleEvidenceState = {
    panel: [],
    safety: [],
    general: [],
    complementary: []
};
let vehicleSignatureCollected = false;
let geoViewFilters = {
    area: "all",
    content: "all",
    recency: "all",
    sort: "recent",
    search: ""
};
let pilhasIndicatorFilters = {
    structure: "PDE 1",
    year: "2026",
    month: "junho",
    analysis: "Interno",
    instrumentId: null
};
const VEHICLE_SURVEY_SOURCE = {
    title: "Checklist Veicular - Diário",
    itemId: "af6c8c59f0654638b6e566793de64618",
    serviceItemId: "9a2d4ca741914ed59f062a05c779b1d1",
    url: "https://survey123.arcgis.com/share/af6c8c59f0654638b6e566793de64618"
};
const VEHICLE_CATALOG = {
    "PZB-1G94": {
        photo: "assets/vehicle-pzb-1g94.jpeg",
        description: "Jeep Renegade de campo"
    },
    "TXY-7J22": {
        photo: "assets/vehicle-txy-7j22.jpeg",
        description: "Jeep Renegade de campo"
    },
    "TEQ-1E02": {
        photo: "",
        description: "Veículo cadastrado no Survey123"
    },
    "TEQ-1E17": {
        photo: "",
        description: "Veículo cadastrado no Survey123"
    },
    "Outro": {
        photo: "",
        description: "Cadastro manual de veículo"
    }
};
const VEHICLE_SAFETY_ITEMS = [
    { id: "agua_limpador", label: "Água no limpador" },
    { id: "bandeirola", label: "Bandeirola de sinalização" },
    { id: "buzina", label: "Buzina" },
    { id: "cintos", label: "Cintos de segurança" },
    { id: "documentacao", label: "Documentação válida", detail: "CRLV, CNH e credencial do Plano de Trânsito" },
    { id: "freios", label: "Freios" },
    { id: "giroflex", label: "Giroflex" },
    { id: "pneus_estepe", label: "Pneus e estepe" },
    { id: "kit_sinalizacao", label: "Kit de sinalização", detail: "Macaco, chave de roda e triângulo" }
];
const VEHICLE_GENERAL_ITEMS = [
    { id: "calibragem", label: "Calibragem dos pneus" },
    { id: "iluminacao", label: "Iluminação e sinalização", detail: "Faróis, setas, freio, ré e lanternas" },
    { id: "lataria_pintura", label: "Lataria e pintura" },
    { id: "limpeza", label: "Limpeza geral" },
    { id: "oleo_motor", label: "Nível do óleo do motor" },
    { id: "arrefecimento", label: "Nível de água/líquido de arrefecimento" },
    { id: "parabrisa", label: "Para-brisa" },
    { id: "vazamentos", label: "Vazamentos aparentes" }
];
const PILHAS_STRUCTURE_ALIASES = {
    "PDE 1": "Pilha ES I",
    "PDE Jacó": "PDE Jacó",
    "PDE Mangaba": "Mangaba"
};
const PILHAS_INDICATOR_MODEL = {
    sourceDashboardId: "indicadores-pilhas",
    years: ["2025", "2026"],
    months: ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
    monthLabels: {
        janeiro: "janeiro",
        fevereiro: "fevereiro",
        marco: "mar\u00e7o",
        abril: "abril",
        maio: "maio",
        junho: "junho",
        julho: "julho",
        agosto: "agosto",
        setembro: "setembro",
        outubro: "outubro",
        novembro: "novembro",
        dezembro: "dezembro"
    },
    analyses: ["Externo", "Interno"],
    baseFilter: { year: "2026", month: "dezembro", analysis: "Interno" },
    charts: {
        geometria: {
            elementId: "pilhas-chart-geometria",
            unit: "%",
            decimals: 1,
            max: 90,
            target: 70,
            targetLabel: "70%",
            targetMode: "minimum",
            rows: [
                { label: "Pilha ES I", value: 80.7 },
                { label: "PDE Jac\u00f3", value: 72.4 },
                { label: "Mangaba", value: 70.0 },
                { label: "Pilha ES II", value: 62.5 },
                { label: "Silicoso", value: 62.1 },
                { label: "Linha M\u00e9dia", value: 51.7 },
                { label: "Contrapilham...", value: 51.1 },
                { label: "Pilha Over", value: 28.1 }
            ]
        },
        declividade: {
            elementId: "pilhas-chart-declividade",
            unit: "%",
            decimals: 1,
            max: 90,
            target: 30,
            targetLabel: "30%",
            targetMode: "maximum",
            rows: [
                { label: "Pilha Over", value: 80.1 },
                { label: "Mangaba", value: 78.3 },
                { label: "Pilha ES II", value: 76.6 },
                { label: "Contrapilham...", value: 76.2 },
                { label: "Pilha ES I", value: 75.9 },
                { label: "Linha M\u00e9dia", value: 74.8 },
                { label: "Silicoso", value: 72.2 },
                { label: "PDE Jac\u00f3", value: 71.3 }
            ]
        },
        empocamento: {
            elementId: "pilhas-chart-empocamento",
            unit: "%",
            decimals: 1,
            max: 14,
            target: 5,
            targetLabel: "5%",
            targetMode: "maximum",
            rows: [
                { label: "Silicoso", value: 12.4 },
                { label: "PDE Jac\u00f3", value: 12.1 },
                { label: "Pilha ES II", value: 10.3 },
                { label: "Pilha ES I", value: 9.2 },
                { label: "Contrapilham...", value: 7.2 },
                { label: "Linha M\u00e9dia", value: 6.1 },
                { label: "Mangaba", value: 5.7 },
                { label: "Pilha Over", value: 5.0 }
            ]
        },
        fator: {
            elementId: "pilhas-chart-fator",
            unit: "",
            decimals: 2,
            max: 3,
            target: 1.3,
            targetLabel: "1,30",
            targetMode: "minimum",
            rows: [
                { label: "Pilha ES II", value: 2.75 },
                { label: "Pilha ES I", value: 1.73 },
                { label: "Contrapilham...", value: 1.66 },
                { label: "PDE Jac\u00f3", value: 1.57 },
                { label: "Linha M\u00e9dia", value: 1.54 },
                { label: "Mangaba", value: 1.39 },
                { label: "Silicoso", value: 1.30 },
                { label: "Pilha Over", value: 1.10 }
            ]
        },
        planoLavra: {
            elementId: "pilhas-chart-plano-lavra",
            unit: "",
            decimals: 2,
            max: 3,
            target: null,
            targetLabel: "",
            targetMode: "minimum",
            rows: [
                { label: "Mangaba", value: 1.37 }
            ]
        }
    },
    locations: [
        { label: "Pilha ES I", x: 12, y: 52, color: "#8b5cf6" },
        { label: "PDE Jac\u00f3", x: 25, y: 75, color: "#22a5e8" },
        { label: "Mangaba", x: 42, y: 50, color: "#e657b7" },
        { label: "Pilha ES II", x: 57, y: 74, color: "#2447e8" },
        { label: "Silicoso", x: 77, y: 30, color: "#e33658" },
        { label: "Pilha Over", x: 91, y: 46, color: "#ff7c3b" }
    ]
};

// Instrument Catalog with baseline parameters and historical trends
const DEFAULT_INSTRUMENT_REGISTRY = {
    "PZ-01": {
        id: "PZ-01",
        name: "Piezômetro PZ-01 (Cresta Central)",
        type: "PZ",
        cotaBoca: 450.20,
        profMax: 25.00,
        limiteCritico: 15.00, // Cota de alerta crítico de nível d'água medido a partir da boca
        historico: [
            { data: "2026-05-01", valor: 11.20 },
            { data: "2026-05-07", valor: 11.35 },
            { data: "2026-05-14", valor: 11.15 },
            { data: "2026-05-21", valor: 11.45 }
        ]
    },
    "PZ-02": {
        id: "PZ-02",
        name: "Piezômetro PZ-02 (Talude Intermediário)",
        type: "PZ",
        cotaBoca: 442.50,
        profMax: 30.00,
        limiteCritico: 18.00,
        historico: [
            { data: "2026-05-01", valor: 14.10 },
            { data: "2026-05-07", valor: 14.20 },
            { data: "2026-05-14", valor: 14.05 },
            { data: "2026-05-21", valor: 14.30 }
        ]
    },
    "PZ-03": {
        id: "PZ-03",
        name: "Piezômetro PZ-03 (Pé do Talude)",
        type: "PZ",
        cotaBoca: 428.10,
        profMax: 20.00,
        limiteCritico: 15.00,
        historico: [
            { data: "2026-05-01", valor: 13.80 },
            { data: "2026-05-07", valor: 14.10 },
            { data: "2026-05-14", valor: 14.85 },
            { data: "2026-05-21", valor: 15.20 } // Critical!
        ]
    },
    "PZ-04": {
        id: "PZ-04",
        name: "Piezômetro PZ-04 (Pé de Jusante)",
        type: "PZ",
        cotaBoca: 412.30,
        profMax: 22.00,
        limiteCritico: 12.00,
        historico: [
            { data: "2026-05-01", valor: 8.50 },
            { data: "2026-05-07", valor: 8.62 },
            { data: "2026-05-14", valor: 8.55 },
            { data: "2026-05-21", valor: 8.70 }
        ]
    },
    "INA-01": {
        id: "INA-01",
        name: "Indicador Nível Água INA-01 (Reservatório)",
        type: "INA",
        cotaBoca: 460.00,
        profMax: 15.00,
        limiteCritico: 8.00,
        historico: [
            { data: "2026-05-01", valor: 5.10 },
            { data: "2026-05-07", valor: 5.25 },
            { data: "2026-05-14", valor: 5.30 },
            { data: "2026-05-21", valor: 5.20 }
        ]
    },
    "INA-02": {
        id: "INA-02",
        name: "Indicador Nível Água INA-02 (Canal Extensor)",
        type: "INA",
        cotaBoca: 445.80,
        profMax: 18.00,
        limiteCritico: 10.00,
        historico: [
            { data: "2026-05-01", valor: 3.10 },
            { data: "2026-05-07", valor: 3.40 },
            { data: "2026-05-14", valor: 3.80 },
            { data: "2026-05-21", valor: 4.10 } // Attention!
        ]
    },
    "INA-03": {
        id: "INA-03",
        name: "Indicador Nível Água INA-03 (Filtro Dreno)",
        type: "INA",
        cotaBoca: 418.90,
        profMax: 12.00,
        limiteCritico: 6.00,
        historico: [
            { data: "2026-05-01", valor: 2.10 },
            { data: "2026-05-07", valor: 2.20 },
            { data: "2026-05-14", valor: 2.15 },
            { data: "2026-05-21", valor: 2.22 }
        ]
    }
};
const INSTRUMENT_REGISTRY = SOURCE_DATABASE?.instrumentRegistry || DEFAULT_INSTRUMENT_REGISTRY;

// Global state holding local database and sync queue
let readingsDatabase = [];
let flowReadingsDatabase = [];
let inspectionsDatabase = [];
let vehicleInspectionsDatabase = [];
let syncQueue = [];

function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}

function readFileAsDataUrl(file, callback) {
    if (!file || typeof FileReader === "undefined") {
        callback("");
        return;
    }
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result || ""));
    reader.onerror = () => callback("");
    reader.readAsDataURL(file);
}

function getDefaultReadingsSeed() {
    const seed = [];
    Object.keys(INSTRUMENT_REGISTRY).forEach(key => {
        const inst = INSTRUMENT_REGISTRY[key];
        if (!["PZ", "INA"].includes(inst.type)) return;
        (inst.historico || []).forEach(hist => {
            seed.push({
                id: Math.random().toString(36).substr(2, 9),
                source: "demo",
                instrumentId: inst.id,
                instrumentCode: inst.code || inst.id,
                structure: inst.structure || "Barragem Sul",
                type: inst.type,
                dateTime: `${hist.data}T10:00`,
                value: hist.valor,
                cotaCalculada: (inst.cotaBoca - hist.valor).toFixed(2),
                inspector: "Eng. Maycon (Base)",
                status: getReadingStatus(inst.id, hist.valor),
                comments: "Importação histórica do banco corporativo."
            });
        });
    });
    return seed;
}

function getReadingsSeed() {
    return SOURCE_DATABASE?.readings?.length
        ? cloneData(SOURCE_DATABASE.readings)
        : getDefaultReadingsSeed();
}

function getFlowReadingsSeed() {
    return SOURCE_DATABASE?.flowReadings?.length
        ? cloneData(SOURCE_DATABASE.flowReadings)
        : [];
}

function parseCachedArray(storageKey) {
    const cached = localStorage.getItem(storageKey);
    if (!cached) return null;
    try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        console.warn(`Cache inválido em ${storageKey}. Recriando base local.`, error);
        return null;
    }
}

function isFieldCreatedRecord(record) {
    if (!record) return false;
    if (record.source === "campo") return true;
    if (["xlsx", "demo", "sharepoint-bdc", "barragens-xlsx"].includes(record.source)) return false;
    if (record.sourceId || String(record.id || "").startsWith("xlsx-")) return false;
    return !(record.inspector || "").includes("(Base)");
}

function mergeSeedWithFieldRecords(seedRecords, cachedRecords) {
    const merged = [...seedRecords];
    (cachedRecords || []).filter(isFieldCreatedRecord).forEach(record => {
        merged.push(record);
    });
    return merged;
}

function persistFieldRecordsOnly(records) {
    return (records || []).filter(isFieldCreatedRecord);
}

function getStorageItem(storage, key) {
    try {
        return storage.getItem(key);
    } catch (error) {
        console.warn("Armazenamento local indisponivel:", error);
        return null;
    }
}

function setStorageItem(storage, key, value) {
    try {
        storage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn("Nao foi possivel gravar configuracao local:", error);
        return false;
    }
}

function removeStorageItem(storage, key) {
    try {
        storage.removeItem(key);
    } catch (error) {
        console.warn("Nao foi possivel limpar sessao local:", error);
    }
}

function isSecurityConfigured() {
    return Boolean(getStorageItem(localStorage, SECURITY_PIN_HASH_KEY));
}

function isSecuritySessionValid() {
    const sessionUntil = Number(getStorageItem(sessionStorage, SECURITY_SESSION_KEY) || 0);
    return Number.isFinite(sessionUntil) && sessionUntil > Date.now();
}

async function hashSecurityPin(pin) {
    const text = `MDSync:${pin}:${SOURCE_DATASET_VERSION}`;
    if (!window.crypto?.subtle || !window.TextEncoder) {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return `fnv-${(hash >>> 0).toString(16).padStart(8, "0")}`;
    }
    const payload = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest("SHA-256", payload);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function showSecurityError(message) {
    const errorEl = document.getElementById("security-error");
    if (errorEl) errorEl.textContent = message || "";
}

function configureSecurityGate() {
    const setupMode = !isSecurityConfigured();
    const title = document.getElementById("security-title");
    const message = document.getElementById("security-message");
    const submit = document.getElementById("security-submit");
    const confirmWrap = document.getElementById("security-confirm-wrap");
    const confirmInput = document.getElementById("security-pin-confirm");
    const privacyWrap = document.getElementById("security-privacy-wrap");
    const pinInput = document.getElementById("security-pin");

    if (title) title.textContent = setupMode ? "Criar PIN local" : "Protecao de dados de campo";
    if (message) {
        message.textContent = setupMode
            ? "Defina um PIN de no minimo 6 digitos para proteger o acesso local ao app neste dispositivo."
            : "Informe o PIN local para desbloquear a sessao operacional.";
    }
    if (submit) submit.textContent = setupMode ? "Criar PIN e acessar" : "Desbloquear";
    if (confirmWrap) confirmWrap.style.display = setupMode ? "block" : "none";
    if (confirmInput) confirmInput.required = setupMode;
    if (privacyWrap) privacyWrap.style.display = setupMode || !getStorageItem(localStorage, SECURITY_PRIVACY_KEY) ? "flex" : "none";
    if (pinInput) {
        pinInput.value = "";
        pinInput.autocomplete = setupMode ? "new-password" : "current-password";
        setTimeout(() => pinInput.focus(), 50);
    }
    if (confirmInput) confirmInput.value = "";
    showSecurityError("");
}

function unlockSecurityGate() {
    document.body.classList.remove("security-locked");
    const gate = document.getElementById("security-gate");
    if (gate) gate.hidden = true;
}

function showSecurityGate() {
    document.body.classList.add("security-locked");
    const gate = document.getElementById("security-gate");
    if (gate) gate.hidden = false;
    configureSecurityGate();
}

function markSecuritySession() {
    setStorageItem(sessionStorage, SECURITY_SESSION_KEY, String(Date.now() + SECURITY_SESSION_MS));
}

function resetSecurityIdleTimer() {
    if (!SECURITY_GATE_ENABLED) return;
    if (!appBooted || document.body.classList.contains("security-locked")) return;
    if (securityIdleTimer) clearTimeout(securityIdleTimer);
    securityIdleTimer = setTimeout(() => lockSecuritySession(true), SECURITY_SESSION_MS);
    markSecuritySession();
}

function installSecurityActivityListeners() {
    if (!SECURITY_GATE_ENABLED) return;
    if (window.__mdsyncSecurityListenersInstalled) return;
    window.__mdsyncSecurityListenersInstalled = true;
    ["click", "keydown", "touchstart", "pointerdown"].forEach(eventName => {
        window.addEventListener(eventName, resetSecurityIdleTimer, { passive: true });
    });
}

function lockSecuritySession(silent = false) {
    if (!SECURITY_GATE_ENABLED) {
        unlockSecurityGate();
        if (!appBooted) bootApplication();
        if (!silent && typeof showToast === "function") {
            showToast("Autenticacao local desativada temporariamente.");
        }
        return;
    }
    removeStorageItem(sessionStorage, SECURITY_SESSION_KEY);
    showSecurityGate();
    if (!silent && typeof showToast === "function") {
        showToast("Sessao bloqueada.", "warning");
    }
}

function cleanupDisabledSecurityGate() {
    document.body.classList.remove("security-locked");
    document.getElementById("security-gate")?.setAttribute("hidden", "");
    document.getElementById("security-lock-btn")?.remove();
    removeStorageItem(sessionStorage, SECURITY_SESSION_KEY);

    if (window.caches?.keys) {
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key.startsWith("geosync-field-pwa-") && key !== "geosync-field-pwa-20260615-google-earth-v16")
                    .map(key => caches.delete(key))
            ))
            .catch(error => console.warn("Nao foi possivel limpar caches antigos:", error));
    }
}

function initializeSecurityGate() {
    if (!SECURITY_GATE_ENABLED) {
        cleanupDisabledSecurityGate();
        unlockSecurityGate();
        bootApplication();
        return;
    }

    const form = document.getElementById("security-form");
    if (!form) {
        bootApplication();
        return;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        showSecurityError("");

        const pin = document.getElementById("security-pin")?.value || "";
        const confirmation = document.getElementById("security-pin-confirm")?.value || "";
        const privacyAccepted = document.getElementById("security-privacy-accept")?.checked;
        const setupMode = !isSecurityConfigured();

        if (pin.length < 6) {
            showSecurityError("Use um PIN com no minimo 6 digitos.");
            return;
        }
        if ((setupMode || !getStorageItem(localStorage, SECURITY_PRIVACY_KEY)) && !privacyAccepted) {
            showSecurityError("Confirme a ciencia da finalidade e responsabilidade sobre os dados.");
            return;
        }
        if (setupMode && pin !== confirmation) {
            showSecurityError("A confirmacao do PIN nao confere.");
            return;
        }

        try {
            const pinHash = await hashSecurityPin(pin);
            if (setupMode) {
                setStorageItem(localStorage, SECURITY_PIN_HASH_KEY, pinHash);
                setStorageItem(localStorage, SECURITY_PRIVACY_KEY, new Date().toISOString());
            } else if (pinHash !== getStorageItem(localStorage, SECURITY_PIN_HASH_KEY)) {
                showSecurityError("PIN invalido.");
                return;
            } else if (privacyAccepted) {
                setStorageItem(localStorage, SECURITY_PRIVACY_KEY, new Date().toISOString());
            }

            markSecuritySession();
            unlockSecurityGate();
            if (!appBooted) bootApplication();
            resetSecurityIdleTimer();
        } catch (error) {
            showSecurityError(error.message || "Nao foi possivel validar o PIN neste dispositivo.");
        }
    });

    if (isSecurityConfigured() && isSecuritySessionValid()) {
        unlockSecurityGate();
        bootApplication();
        resetSecurityIdleTimer();
        return;
    }

    showSecurityGate();
}

function getEmptyReleaseState() {
    return { current: null, history: [] };
}

function loadReleaseState() {
    const raw = getStorageItem(localStorage, RELEASE_STATE_KEY);
    if (!raw) {
        releaseState = getEmptyReleaseState();
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        releaseState = {
            current: parsed.current || null,
            history: Array.isArray(parsed.history) ? parsed.history : []
        };
    } catch (error) {
        console.warn("Liberação local inválida. Recriando controle.", error);
        releaseState = getEmptyReleaseState();
    }
}

function saveReleaseState() {
    const normalized = {
        current: releaseState.current,
        history: (releaseState.history || []).slice(0, 30)
    };
    releaseState = normalized;
    setStorageItem(localStorage, RELEASE_STATE_KEY, JSON.stringify(normalized));
    updateReleaseBadge();
}

function getReleaseStatus(release) {
    if (!release) return "pending";
    if (release.revokedAt) return "revoked";
    const expiresAt = new Date(release.expiresAt);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) return "expired";
    return "active";
}

function getActiveRelease() {
    return getReleaseStatus(releaseState.current) === "active" ? releaseState.current : null;
}

function getReleaseStatusLabel(status) {
    const labels = {
        active: "Ativa",
        expired: "Expirada",
        revoked: "Revogada",
        pending: "Pendente"
    };
    return labels[status] || "Pendente";
}

function getReleaseStatusIcon(status) {
    if (status === "active") return "fa-unlock-keyhole";
    if (status === "expired") return "fa-hourglass-end";
    if (status === "revoked") return "fa-ban";
    return "fa-lock";
}

function createReleaseId() {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `LIB-${stamp}-${suffix}`;
}

function getDefaultReleaseValidity() {
    const date = new Date();
    date.setHours(date.getHours() + 8);
    return toDateTimeLocalValue(date);
}

function initializeReleaseDefaults() {
    const validityInput = document.getElementById("release-validity");
    if (validityInput && !validityInput.value) validityInput.value = getDefaultReleaseValidity();
}

function updateReleaseBadge() {
    const badge = document.getElementById("release-badge");
    if (!badge) return;

    const status = getReleaseStatus(releaseState.current);
    badge.textContent = getReleaseStatusLabel(status);
    badge.className = "badge";
    if (status === "active") badge.classList.add("badge-success");
    if (status === "expired" || status === "revoked") badge.classList.add("badge-danger");
}

function renderReleasePanel() {
    const current = releaseState.current;
    const status = getReleaseStatus(current);
    const isActive = status === "active";
    const card = document.getElementById("release-status-card");
    const icon = card?.querySelector(".release-status-icon i");
    const historyBody = document.getElementById("release-history-body");

    if (card) {
        card.className = `release-status-card ${status}`;
    }
    if (icon) {
        icon.className = `fa-solid ${getReleaseStatusIcon(status)}`;
    }

    setTextContent("release-status-label", isActive ? "Liberação ativa" : `Liberação ${getReleaseStatusLabel(status).toLowerCase()}`);
    setTextContent("release-status-code", current?.id || "Aguardando");
    setTextContent(
        "release-status-desc",
        isActive
            ? "Exportações e sincronização simulada podem usar este protocolo local até a API corporativa entrar em produção."
            : "Gere uma liberação manual para rastrear exportações e sincronizações até a integração com a API corporativa."
    );
    setTextContent("release-current-responsible", current?.responsible || "-");
    setTextContent("release-current-purpose", current?.purpose || "-");
    setTextContent("release-current-scope", current?.scope || "-");
    setTextContent("release-current-validity", current?.expiresAt ? formatDateTimeBR(current.expiresAt) : "-");

    if (!historyBody) return;
    const history = releaseState.history || [];
    if (!history.length) {
        historyBody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary">Nenhuma liberação local registrada.</td></tr>`;
        updateReleaseBadge();
        initializeReleaseDefaults();
        return;
    }

    historyBody.innerHTML = "";
    history.forEach(item => {
        const itemStatus = getReleaseStatus(item);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${escapeHtml(item.id)}</strong></td>
            <td><span class="release-pill ${itemStatus}">${escapeHtml(getReleaseStatusLabel(itemStatus))}</span></td>
            <td>${escapeHtml(item.responsible)}</td>
            <td>${escapeHtml(item.purpose)}</td>
            <td>${escapeHtml(item.scope)}</td>
            <td>${escapeHtml(formatDateTimeBR(item.expiresAt))}</td>
            <td>${escapeHtml(formatDateTimeBR(item.createdAt))}</td>
        `;
        historyBody.appendChild(tr);
    });
    updateReleaseBadge();
    initializeReleaseDefaults();
}

function createManualRelease(event) {
    event.preventDefault();

    const responsible = document.getElementById("release-responsible")?.value.trim();
    const purpose = document.getElementById("release-purpose")?.value;
    const scope = document.getElementById("release-scope")?.value;
    const validity = document.getElementById("release-validity")?.value;
    const observations = document.getElementById("release-observations")?.value.trim();
    const acknowledged = document.getElementById("release-ack")?.checked;

    if (!responsible || !purpose || !scope || !validity || !acknowledged) {
        showToast("Preencha os campos obrigatórios e confirme a ciência da liberação.", "warning");
        return;
    }

    const expiresAt = new Date(validity);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        showToast("Defina uma validade futura para a liberação.", "warning");
        return;
    }

    if (releaseState.current && getReleaseStatus(releaseState.current) === "active") {
        releaseState.current.revokedAt = new Date().toISOString();
        releaseState.current.revocationReason = "Substituída por nova liberação local.";
    }

    const release = {
        id: createReleaseId(),
        status: "active",
        responsible,
        purpose,
        scope,
        observations: observations || "Liberação local temporária.",
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        datasetVersion: SOURCE_DATASET_VERSION
    };

    releaseState.current = release;
    releaseState.history = [release, ...(releaseState.history || [])].slice(0, 30);
    saveReleaseState();
    renderReleasePanel();
    document.getElementById("release-form")?.reset();
    initializeReleaseDefaults();
    showToast(`Liberação local ${release.id} gerada.`);
}

function revokeManualRelease() {
    if (!releaseState.current || getReleaseStatus(releaseState.current) !== "active") {
        showToast("Não há liberação ativa para revogar.", "warning");
        return;
    }

    releaseState.current.revokedAt = new Date().toISOString();
    releaseState.current.revocationReason = "Revogada manualmente.";
    releaseState.history = (releaseState.history || []).map(item =>
        item.id === releaseState.current.id ? releaseState.current : item
    );
    saveReleaseState();
    renderReleasePanel();
    showToast("Liberação local revogada.", "warning");
}

// Initialize local databases from LocalStorage if they exist, or seed them
function initDatabases() {
    const cachedReadings = parseCachedArray("geosync_readings");
    const cachedFlowReadings = parseCachedArray("geosync_flow_readings");
    const cachedInspections = parseCachedArray("geosync_inspections");
    const cachedVehicleInspections = parseCachedArray(VEHICLE_INSPECTIONS_KEY);
    const cachedQueue = parseCachedArray("geosync_queue");
    const cachedDatasetVersion = localStorage.getItem("geosync_dataset_version");
    const shouldRefreshSource = SOURCE_DATABASE && cachedDatasetVersion !== SOURCE_DATASET_VERSION;
    const hasSourceReadings = Boolean(SOURCE_DATABASE?.readings?.length);
    const hasSourceFlowReadings = Boolean(SOURCE_DATABASE?.flowReadings?.length);

    if (hasSourceReadings) {
        readingsDatabase = mergeSeedWithFieldRecords(getReadingsSeed(), cachedReadings);
        saveToLocalStorage("readings");
    } else if (cachedReadings && !shouldRefreshSource) {
        readingsDatabase = cachedReadings;
    } else {
        readingsDatabase = mergeSeedWithFieldRecords(getReadingsSeed(), cachedReadings);
        saveToLocalStorage("readings");
    }

    if (hasSourceFlowReadings) {
        flowReadingsDatabase = mergeSeedWithFieldRecords(getFlowReadingsSeed(), cachedFlowReadings);
        saveToLocalStorage("flow");
    } else if (cachedFlowReadings && !shouldRefreshSource) {
        flowReadingsDatabase = cachedFlowReadings;
    } else {
        flowReadingsDatabase = mergeSeedWithFieldRecords(getFlowReadingsSeed(), cachedFlowReadings);
        saveToLocalStorage("flow");
    }

    if (cachedInspections) {
        inspectionsDatabase = cachedInspections;
    } else {
        // Seed default inspection
        inspectionsDatabase.push({
            id: Math.random().toString(36).substr(2, 9),
            source: "demo",
            structure: "Barragem Sul",
            dateTime: "2026-05-28T14:00",
            weather: "Ensolarado",
            anomalias: { seepage: false, cracks: true, erosion: false, drainage: false },
            insRisk: "Atenção Operacional",
            inspector: "Eng. Maycon (Base)",
            comments: "Trincas estiras longitudinais sem alteração de extensão no talude de jusante."
        });
        saveToLocalStorage("inspections");
    }

    vehicleInspectionsDatabase = cachedVehicleInspections || [];

    if (cachedQueue) {
        syncQueue = cachedQueue;
        updateSyncBadge();
    }

    localStorage.setItem("geosync_dataset_version", SOURCE_DATASET_VERSION);
}

function saveToLocalStorage(type) {
    try {
        if (type === "readings") localStorage.setItem("geosync_readings", JSON.stringify(persistFieldRecordsOnly(readingsDatabase)));
        if (type === "flow") localStorage.setItem("geosync_flow_readings", JSON.stringify(persistFieldRecordsOnly(flowReadingsDatabase)));
        if (type === "inspections") localStorage.setItem("geosync_inspections", JSON.stringify(inspectionsDatabase));
        if (type === "vehicle-inspections") localStorage.setItem(VEHICLE_INSPECTIONS_KEY, JSON.stringify(vehicleInspectionsDatabase));
        if (type === "queue") {
            localStorage.setItem("geosync_queue", JSON.stringify(syncQueue));
            updateSyncBadge();
        }
    } catch (error) {
        console.warn("Nao foi possivel persistir dados locais. A base corporativa permanece disponivel no app.", error);
        if (type === "queue") updateSyncBadge();
    }
}

function getReadingEvaluation(inst, value) {
    if (!inst) return { status: "Normal", mode: "depth" };
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return { status: "Normal", mode: inst.thresholdMode || "depth" };

    if (inst.thresholdMode === "elevation" && inst.thresholds) {
        const cotaBoca = Number(inst.cotaBoca);
        const attentionElevation = Number(inst.thresholds.attentionElevation);
        const alertElevation = Number(inst.thresholds.alertElevation);
        const emergencyElevation = Number(inst.thresholds.emergencyElevation);
        const criticalElevation = Number.isFinite(emergencyElevation) ? emergencyElevation : alertElevation;
        const measuredElevation = Number.isFinite(cotaBoca) ? cotaBoca - numericValue : null;

        if (!Number.isFinite(measuredElevation) || !Number.isFinite(criticalElevation)) {
            return { status: "Normal", mode: "elevation" };
        }

        let status = "Normal";
        if (measuredElevation >= criticalElevation) status = "Crítico";
        else if (Number.isFinite(attentionElevation) && measuredElevation >= attentionElevation) status = "Atenção";

        return {
            status,
            mode: "elevation",
            measuredElevation,
            warningValue: Number.isFinite(attentionElevation) ? cotaBoca - attentionElevation : null,
            criticalValue: cotaBoca - criticalElevation,
            attentionElevation,
            criticalElevation
        };
    }

    const criticalValue = Number(inst.limiteCritico || inst.profMax || 0);
    if (!Number.isFinite(criticalValue) || criticalValue <= 0) return { status: "Normal", mode: "depth" };
    const ratio = numericValue / criticalValue;
    let status = "Normal";
    if (ratio >= 1.0) status = "Crítico";
    else if (ratio >= 0.8) status = "Atenção";
    return { status, mode: "depth", warningValue: criticalValue * 0.8, criticalValue };
}

// Helper to determine safety states based on design thresholds
function getReadingStatus(instId, value) {
    return getReadingEvaluation(INSTRUMENT_REGISTRY[instId], value).status;
}

function getStatusClass(status) {
    const normalized = String(status || "Normal").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (normalized.includes("critic")) return "alert";
    if (normalized.includes("atenc") || normalized.includes("verificar")) return "warning";
    return "normal";
}

function formatNumber(value, digits = 2, fallback = "-") {
    if (value === null || value === undefined || value === "") return fallback;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(digits) : fallback;
}

function roundNumber(value, digits = 6) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Number(numeric.toFixed(digits));
}

function getSirgasUtmZone(longitude) {
    const numeric = Number(longitude);
    const zone = Number.isFinite(numeric)
        ? Math.floor((numeric + 180) / 6) + 1
        : 23;
    return Math.min(60, Math.max(1, zone));
}

function getSirgasProjectedEpsg(zone, hemisphere = "S") {
    const numericZone = Number(zone);
    if (hemisphere === "S" && numericZone >= 18 && numericZone <= 25) {
        return `EPSG:${31960 + numericZone}`;
    }
    return `SIRGAS 2000 / UTM ${numericZone}${hemisphere}`;
}

function latLonToSirgasUtm(latitude, longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const zone = getSirgasUtmZone(lon);
    const hemisphere = lat < 0 ? "S" : "N";
    const centralMeridian = ((zone - 1) * 6) - 180 + 3;
    const a = SIRGAS_2000.semiMajorAxis;
    const f = 1 / SIRGAS_2000.inverseFlattening;
    const e2 = f * (2 - f);
    const ep2 = e2 / (1 - e2);
    const k0 = SIRGAS_2000.scaleFactor;
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    const lonOriginRad = centralMeridian * Math.PI / 180;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const tanLat = Math.tan(latRad);
    const n = a / Math.sqrt(1 - e2 * sinLat * sinLat);
    const t = tanLat * tanLat;
    const c = ep2 * cosLat * cosLat;
    const aa = cosLat * (lonRad - lonOriginRad);
    const m = a * (
        (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * latRad
        - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * latRad)
        + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * latRad)
        - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latRad)
    );

    const easting = SIRGAS_2000.falseEasting + k0 * n * (
        aa
        + (1 - t + c) * Math.pow(aa, 3) / 6
        + (5 - 18 * t + t * t + 72 * c - 58 * ep2) * Math.pow(aa, 5) / 120
    );
    let northing = k0 * (
        m
        + n * tanLat * (
            aa * aa / 2
            + (5 - t + 9 * c + 4 * c * c) * Math.pow(aa, 4) / 24
            + (61 - 58 * t + t * t + 600 * c - 330 * ep2) * Math.pow(aa, 6) / 720
        )
    );
    if (lat < 0) northing += SIRGAS_2000.falseNorthingSouth;

    return {
        datum: SIRGAS_2000.datum,
        geographicEpsg: SIRGAS_2000.geographicEpsg,
        projectedEpsg: getSirgasProjectedEpsg(zone, hemisphere),
        ellipsoid: SIRGAS_2000.ellipsoid,
        zone,
        hemisphere,
        centralMeridian,
        easting: roundNumber(easting, 3),
        northing: roundNumber(northing, 3)
    };
}

function sirgasUtmToLatLon(easting, northing, zone = 23, hemisphere = "S") {
    const e = Number(easting);
    const n = Number(northing);
    const numericZone = Number(zone) || 23;
    const hemi = String(hemisphere || "S").toUpperCase();
    if (!Number.isFinite(e) || !Number.isFinite(n)) return null;

    const a = SIRGAS_2000.semiMajorAxis;
    const f = 1 / SIRGAS_2000.inverseFlattening;
    const e2 = f * (2 - f);
    const ep2 = e2 / (1 - e2);
    const k0 = SIRGAS_2000.scaleFactor;
    const x = e - SIRGAS_2000.falseEasting;
    const y = hemi === "S" ? n - SIRGAS_2000.falseNorthingSouth : n;
    const m = y / k0;
    const mu = m / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const j1 = 3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32;
    const j2 = 21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32;
    const j3 = 151 * Math.pow(e1, 3) / 96;
    const j4 = 1097 * Math.pow(e1, 4) / 512;
    const fp = mu
        + j1 * Math.sin(2 * mu)
        + j2 * Math.sin(4 * mu)
        + j3 * Math.sin(6 * mu)
        + j4 * Math.sin(8 * mu);

    const sinFp = Math.sin(fp);
    const cosFp = Math.cos(fp);
    const tanFp = Math.tan(fp);
    const c1 = ep2 * cosFp * cosFp;
    const t1 = tanFp * tanFp;
    const n1 = a / Math.sqrt(1 - e2 * sinFp * sinFp);
    const r1 = a * (1 - e2) / Math.pow(1 - e2 * sinFp * sinFp, 1.5);
    const d = x / (n1 * k0);
    const q1 = n1 * tanFp / r1;
    const q2 = d * d / 2;
    const q3 = (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * Math.pow(d, 4) / 24;
    const q4 = (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * Math.pow(d, 6) / 720;
    const latitude = fp - q1 * (q2 - q3 + q4);
    const q5 = d;
    const q6 = (1 + 2 * t1 + c1) * Math.pow(d, 3) / 6;
    const q7 = (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * Math.pow(d, 5) / 120;
    const centralMeridian = ((numericZone - 1) * 6) - 180 + 3;
    const longitude = (centralMeridian * Math.PI / 180) + (q5 - q6 + q7) / cosFp;

    return {
        latitude: roundNumber(latitude * 180 / Math.PI, 8),
        longitude: roundNumber(longitude * 180 / Math.PI, 8),
        datum: SIRGAS_2000.datum,
        geographicEpsg: SIRGAS_2000.geographicEpsg,
        projectedEpsg: getSirgasProjectedEpsg(numericZone, hemi),
        zone: numericZone,
        hemisphere: hemi
    };
}

function classifyGeorefAccuracy(accuracyMeters) {
    const accuracy = Number(accuracyMeters);
    if (!Number.isFinite(accuracy)) {
        return { code: "unknown", label: "Precisao nao informada", className: "pending" };
    }
    if (accuracy <= 2) {
        return { code: "survey", label: "Alta precisao", className: "excellent" };
    }
    if (accuracy <= GEOREF_TARGET_ACCURACY_M) {
        return { code: "field", label: "Precisao de campo", className: "active" };
    }
    if (accuracy <= GEOREF_MAX_ACCEPTABLE_ACCURACY_M) {
        return { code: "acceptable", label: "Precisao aceitavel", className: "warning" };
    }
    return { code: "low", label: "Baixa precisao", className: "revoked" };
}

function normalizeLocationPayload(payload, source = "browser") {
    const coords = payload?.coords || payload || {};
    const latitude = Number(coords.latitude);
    const longitude = Number(coords.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    const accuracy = Number(coords.accuracy);
    const sirgas2000 = latLonToSirgasUtm(latitude, longitude);
    const capturedAt = new Date(payload?.time || payload?.timestamp || Date.now()).toISOString();
    const fix = {
        source,
        provider: payload?.provider || coords.provider || source,
        capturedAt,
        latitude: roundNumber(latitude, 8),
        longitude: roundNumber(longitude, 8),
        altitudeMeters: roundNumber(coords.altitude, 2),
        altitudeAccuracyMeters: roundNumber(coords.altitudeAccuracy, 2),
        accuracyMeters: roundNumber(accuracy, 2),
        heading: roundNumber(coords.heading, 2),
        speed: roundNumber(coords.speed, 2),
        sirgas2000
    };
    fix.quality = classifyGeorefAccuracy(fix.accuracyMeters);
    return fix;
}

function cloneGeorefFix(fix) {
    return fix ? JSON.parse(JSON.stringify(fix)) : null;
}

function loadGeorefState() {
    try {
        const cached = JSON.parse(localStorage.getItem(GEOREF_STATE_KEY) || "{}");
        lastGeolocationFix = cached.lastFix || null;
    } catch (error) {
        lastGeolocationFix = null;
    }
}

function saveGeorefState() {
    localStorage.setItem(GEOREF_STATE_KEY, JSON.stringify({
        lastFix: lastGeolocationFix,
        updatedAt: new Date().toISOString()
    }));
}

function getGeorefStatusText(fix) {
    if (!fix) return "Aguardando GPS";
    const sirgas = fix.sirgas2000 || {};
    const accuracy = Number.isFinite(Number(fix.accuracyMeters))
        ? `${formatNumber(fix.accuracyMeters, 1)} m`
        : "sem raio";
    return `${sirgas.datum || "SIRGAS 2000"} UTM ${sirgas.zone || 23}${sirgas.hemisphere || "S"} - ${accuracy}`;
}

function getGeorefExportText(fix) {
    if (!fix) return "-";
    const sirgas = fix.sirgas2000 || {};
    return `${sirgas.projectedEpsg || "SIRGAS 2000"} E ${formatNumber(sirgas.easting, 3)} / N ${formatNumber(sirgas.northing, 3)} / ${formatNumber(fix.accuracyMeters, 1)} m`;
}

function getRecordGeolocation(record) {
    return record?.evidence?.geolocation || record?.geolocation || null;
}

function getGeorefDetailsHtml(fix) {
    if (!fix) return "";
    const sirgas = fix.sirgas2000 || {};
    return `
        <div><span>Datum</span><strong>${sirgas.datum || "SIRGAS 2000"}</strong></div>
        <div><span>EPSG</span><strong>${sirgas.projectedEpsg || "-"}</strong></div>
        <div><span>Latitude</span><strong>${formatNumber(fix.latitude, 8)}</strong></div>
        <div><span>Longitude</span><strong>${formatNumber(fix.longitude, 8)}</strong></div>
        <div><span>UTM E</span><strong>${formatNumber(sirgas.easting, 3)} m</strong></div>
        <div><span>UTM N</span><strong>${formatNumber(sirgas.northing, 3)} m</strong></div>
        <div><span>Precisao</span><strong>${formatNumber(fix.accuracyMeters, 1)} m</strong></div>
        <div><span>Captura</span><strong>${formatDateTimeBR(fix.capturedAt)}</strong></div>
    `;
}

function renderGeoEvidence(scope) {
    const fix = geoEvidenceState[scope];
    const statusEl = document.getElementById(`${scope}-gps-status`);
    const detailEl = document.getElementById(`${scope}-geo-detail`);
    const actionEl = statusEl?.closest(".evidence-action");

    if (!statusEl) return;
    if (!fix) {
        statusEl.textContent = "Aguardando GPS";
        actionEl?.classList.remove("done", "geo-low-accuracy");
        if (detailEl) {
            detailEl.hidden = true;
            detailEl.innerHTML = "";
        }
        return;
    }

    statusEl.textContent = getGeorefStatusText(fix);
    actionEl?.classList.add("done");
    actionEl?.classList.toggle("geo-low-accuracy", fix.quality?.code === "low");
    if (detailEl) {
        detailEl.hidden = false;
        detailEl.className = `geo-evidence-card ${fix.quality?.className || "pending"}`;
        detailEl.innerHTML = getGeorefDetailsHtml(fix);
    }
}

function setGeoCaptureMessage(scope, message) {
    if (scope === "panel") {
        setTextContent("georef-fix-status", message);
        return;
    }
    const statusEl = document.getElementById(`${scope}-gps-status`);
    if (statusEl) statusEl.textContent = message;
}

function requestBrowserLocation() {
    return new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
            reject(new Error("Geolocalizacao indisponivel neste dispositivo."));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 25000,
            maximumAge: 0
        });
    });
}

function requestAndroidLocation() {
    if (!window.MDSyncAndroid || typeof window.MDSyncAndroid.requestCurrentLocation !== "function") {
        return null;
    }

    return new Promise((resolve, reject) => {
        const requestId = `geo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const timeout = setTimeout(() => {
            delete androidGeoCallbacks[requestId];
            reject(new Error("Tempo limite na captura nativa de GPS."));
        }, 28000);

        androidGeoCallbacks[requestId] = { resolve, reject, timeout };
        try {
            window.MDSyncAndroid.requestCurrentLocation(requestId);
        } catch (error) {
            clearTimeout(timeout);
            delete androidGeoCallbacks[requestId];
            reject(error);
        }
    });
}

window.MDSyncAndroidReceiveLocation = function receiveAndroidLocation(requestId, payload) {
    const callback = androidGeoCallbacks[requestId];
    if (!callback) return;
    clearTimeout(callback.timeout);
    delete androidGeoCallbacks[requestId];

    if (payload?.ok) {
        callback.resolve(payload);
    } else {
        callback.reject(new Error(payload?.error || "Falha na captura nativa de GPS."));
    }
};

async function getSingleLocationSample() {
    const androidRequest = requestAndroidLocation();
    if (androidRequest) {
        return normalizeLocationPayload(await androidRequest, "android-native");
    }
    return normalizeLocationPayload(await requestBrowserLocation(), "browser");
}

async function captureGeolocation(scope = "panel") {
    setGeoCaptureMessage(scope, "Capturando GPS de alta precisao...");
    let bestFix = null;
    const errors = [];
    const attempts = window.MDSyncAndroid ? 1 : GEOREF_SAMPLE_COUNT;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            setGeoCaptureMessage(scope, `Amostra ${attempt}/${attempts}...`);
            const fix = await getSingleLocationSample();
            if (!fix) continue;
            if (!bestFix || Number(fix.accuracyMeters || Infinity) < Number(bestFix.accuracyMeters || Infinity)) {
                bestFix = fix;
            }
            if (Number(bestFix.accuracyMeters) <= GEOREF_TARGET_ACCURACY_M) break;
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (!bestFix) {
        const message = errors[0] || "Nao foi possivel capturar a localizacao.";
        setGeoCaptureMessage(scope, "GPS indisponivel");
        showToast(message, "error");
        return null;
    }

    lastGeolocationFix = bestFix;
    saveGeorefState();
    if (scope === "reading" || scope === "inspection" || scope === "vehicle") {
        geoEvidenceState[scope] = cloneGeorefFix(bestFix);
        renderGeoEvidence(scope);
    }
    renderGeorefPanel();
    if (document.getElementById("pilhas-bi-dashboard")) renderPilhasIndicatorDashboard();
    renderEarthMapPanel();

    if (Number(bestFix.accuracyMeters) > GEOREF_MAX_ACCEPTABLE_ACCURACY_M) {
        showToast(`Localizacao registrada com baixa precisao (${formatNumber(bestFix.accuracyMeters, 1)} m).`, "warning");
    } else {
        showToast(`Localizacao SIRGAS 2000 registrada (${formatNumber(bestFix.accuracyMeters, 1)} m).`);
    }
    return bestFix;
}

function getInstrumentCoordinateSummary() {
    const instruments = Object.values(INSTRUMENT_REGISTRY);
    const withCoordinates = instruments.filter(inst =>
        Number.isFinite(Number(inst.coordinates?.ew)) && Number.isFinite(Number(inst.coordinates?.ns))
    );
    return {
        total: instruments.length,
        withCoordinates: withCoordinates.length,
        withoutCoordinates: instruments.length - withCoordinates.length,
        defaultProjectedEpsg: "EPSG:31983",
        datum: SIRGAS_2000.datum
    };
}

function getGeoreferencedRows() {
    return buildUnifiedRecords({ structure: "all", type: "all" })
        .filter(row => getRecordGeolocation(row.raw));
}

function getNearestGeoreferencedStructure(fix = lastGeolocationFix) {
    if (!fix) return null;
    return getGeospatialStructureList()
        .map(structure => ({
            structure,
            coordinate: getPreferredStructureCoordinate(structure)
        }))
        .filter(item => item.coordinate)
        .map(item => ({
            ...item,
            distance: getDistanceMeters(fix, item.coordinate)
        }))
        .filter(item => item.coordinate && Number.isFinite(item.distance))
        .sort((a, b) => a.distance - b.distance)[0] || null;
}

let georefMap = null;
let georefMarkersGroup = null;
let georefGpsMarker = null;
let georefGpsCircle = null;

function initGeorefLeafletMap() {
    const container = document.getElementById("georef-leaflet-map");
    if (!container || typeof L === "undefined") return;

    if (!georefMap) {
        georefMap = L.map("georef-leaflet-map", {
            center: [-20.088, -44.103],
            zoom: 14,
            zoomControl: true,
            attributionControl: false
        });

        const esriSatellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            maxZoom: 19
        });

        const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19
        });

        esriSatellite.addTo(georefMap);

        L.control.layers({
            "Satélite de Alta Resolução": esriSatellite,
            "Mapa Topográfico / Vias": osm
        }, null, { position: "topright" }).addTo(georefMap);

        georefMarkersGroup = L.layerGroup().addTo(georefMap);
    }

    setTimeout(() => {
        if (georefMap) georefMap.invalidateSize();
    }, 150);

    renderGeorefMarkers();
}

function renderGeorefStructurePills() {
    const container = document.getElementById("georef-structure-pills");
    if (!container) return;
    const structures = ["Toda a Mina (Visão Geral)", ...getGeospatialStructureList()];
    const current = geoSpatialState.selectedStructure || structures[0];

    container.innerHTML = structures.map(name => {
        const isOverview = name === "Toda a Mina (Visão Geral)";
        const isActive = normalizeComparable(name) === normalizeComparable(current);
        const icon = isOverview ? "fa-globe" : "fa-layer-group";
        return `
            <button type="button" class="georef-pill ${isActive ? "active" : ""}" onclick="selectGeorefStructure('${escapeHtml(name)}')">
                <i class="fa-solid ${icon}"></i> ${escapeHtml(name)}
            </button>
        `;
    }).join("");
}

function selectGeorefStructure(structureName) {
    const isOverview = structureName === "Toda a Mina (Visão Geral)" || structureName === "all";
    const canonical = isOverview ? "Toda a Mina (Visão Geral)" : getCanonicalStructureName(structureName);
    geoSpatialState.selectedStructure = canonical;

    renderGeorefStructurePills();
    renderGeorefStructureDetails(canonical);
    saveGeospatialState();

    if (!georefMap) return;

    if (isOverview) {
        georefMap.flyTo([-20.088, -44.103], 14, { animate: true, duration: 1.2 });
        setTextContent("georef-active-structure-name", "Toda a Mina (Visão Geral)");
        setTextContent("georef-active-structure-coords", "10 Estruturas Geotécnicas • SIRGAS 2000 / UTM 23S");
        return;
    }

    const coord = getPreferredStructureCoordinate(canonical);
    if (coord && Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude)) {
        georefMap.flyTo([coord.latitude, coord.longitude], 17, { animate: true, duration: 1.2 });
        const utm = latLonToSirgasUtm(coord.latitude, coord.longitude);
        setTextContent("georef-active-structure-name", canonical);
        setTextContent("georef-active-structure-coords", `Lat ${coord.latitude.toFixed(6)}, Lon ${coord.longitude.toFixed(6)} • E ${formatNumber(utm.easting, 1)} m, N ${formatNumber(utm.northing, 1)} m`);
        
        const latInput = document.getElementById("georef-input-lat");
        const lonInput = document.getElementById("georef-input-lon");
        if (latInput) latInput.value = coord.latitude.toFixed(8);
        if (lonInput) lonInput.value = coord.longitude.toFixed(8);
        onGeorefLatLonChange();
    }
}

function renderGeorefMarkers() {
    if (!georefMarkersGroup || typeof L === "undefined") return;
    georefMarkersGroup.clearLayers();

    const structures = getGeospatialStructureList();
    const latestReadings = typeof getLatestReadingsByInstrument === "function" ? getLatestReadingsByInstrument() : {};

    // 1. Plot Structures
    structures.forEach(structure => {
        const coord = getPreferredStructureCoordinate(structure);
        if (!coord || !Number.isFinite(coord.latitude) || !Number.isFinite(coord.longitude)) return;

        const utm = latLonToSirgasUtm(coord.latitude, coord.longitude);
        const icon = L.divIcon({
            className: "georef-custom-structure-pin",
            html: `<div class="georef-structure-badge-pin"><i class="fa-solid fa-layer-group"></i> ${escapeHtml(structure)}</div>`,
            iconSize: [120, 30],
            iconAnchor: [60, 15]
        });

        const marker = L.marker([coord.latitude, coord.longitude], { icon })
            .bindPopup(`
                <div style="font-family: inherit; font-size: 13px; line-height: 1.5; color: #fff;">
                    <div style="font-weight: 800; font-size: 14px; color: #38bdf8; margin-bottom: 6px;">
                        <i class="fa-solid fa-layer-group"></i> ${escapeHtml(structure)}
                    </div>
                    <div><b>Latitude:</b> ${coord.latitude.toFixed(8)}</div>
                    <div><b>Longitude:</b> ${coord.longitude.toFixed(8)}</div>
                    <div><b>UTM E:</b> ${formatNumber(utm.easting, 3)} m</div>
                    <div><b>UTM N:</b> ${formatNumber(utm.northing, 3)} m</div>
                    <div><b>Datum:</b> SIRGAS 2000 (EPSG:31983)</div>
                    <div style="margin-top: 10px; display: flex; gap: 6px;">
                        <button style="background: #0284c7; color: #fff; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px;" onclick="selectGeorefStructure('${escapeHtml(structure)}')">Focar Estrutura</button>
                        <button style="background: #334155; color: #fff; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px;" onclick="window.open('https://earth.google.com/web/search/${coord.latitude},${coord.longitude}', '_blank')">Google Earth</button>
                    </div>
                </div>
            `);

        marker.on("click", () => {
            selectGeorefStructure(structure);
        });

        georefMarkersGroup.addLayer(marker);
    });

    // 2. Plot Instruments
    const instruments = Object.values(INSTRUMENT_REGISTRY);
    instruments.forEach(inst => {
        const latLon = getInstrumentLatLon(inst);
        if (!latLon || !Number.isFinite(latLon.latitude) || !Number.isFinite(latLon.longitude)) return;

        const latest = latestReadings[inst.id];
        const status = latest?.status || "Normal";
        let statusClass = "normal";
        if (status === "Alerta" || status === "Crítico") statusClass = "alert";
        else if (status === "Atenção") statusClass = "warning";

        const icon = L.divIcon({
            className: "georef-custom-inst-pin",
            html: `<div class="georef-inst-dot-pin ${statusClass}" title="${escapeHtml(inst.code || inst.id)}"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        const utm = latLonToSirgasUtm(latLon.latitude, latLon.longitude);
        const marker = L.marker([latLon.latitude, latLon.longitude], { icon })
            .bindPopup(`
                <div style="font-family: inherit; font-size: 13px; line-height: 1.5; color: #fff;">
                    <div style="font-weight: 800; font-size: 14px; color: #facc15; margin-bottom: 6px;">
                        <i class="fa-solid fa-satellite"></i> ${escapeHtml(inst.code || inst.id)} (${escapeHtml(inst.type)})
                    </div>
                    <div><b>Estrutura:</b> ${escapeHtml(inst.structure)}</div>
                    <div><b>Status:</b> <span style="font-weight: 700; color: ${statusClass === 'alert' ? '#ef4444' : statusClass === 'warning' ? '#f59e0b' : '#22c55e'}">${escapeHtml(status)}</span></div>
                    <div><b>Última Leitura:</b> ${latest ? `${formatNumber(latest.value, 2)} ${latest.unit || 'm'} em ${formatDateBRShort(latest.dateTime)}` : 'Sem leitura recente'}</div>
                    <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
                        Lat ${latLon.latitude.toFixed(6)}, Lon ${latLon.longitude.toFixed(6)}<br>
                        UTM E ${formatNumber(utm.easting, 2)} m, N ${formatNumber(utm.northing, 2)} m
                    </div>
                    <div style="margin-top: 8px;">
                        <button style="background: #0284c7; color: #fff; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 11px;" onclick="selectInstrumentFromMap('${escapeHtml(inst.id)}')">Histórico de Leituras</button>
                    </div>
                </div>
            `);

        georefMarkersGroup.addLayer(marker);
    });
}

function triggerGeorefGpsCapture() {
    const btnLabel = document.getElementById("georef-gps-btn-label");
    if (btnLabel) btnLabel.textContent = "Obtendo sinal GPS...";

    if (!navigator.geolocation) {
        showToast("Geolocalização não suportada pelo navegador.", "error");
        if (btnLabel) btnLabel.textContent = "Usar GPS Atual";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            if (btnLabel) btnLabel.textContent = "Usar GPS Atual";
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const acc = pos.coords.accuracy || 5;

            const fix = {
                latitude: lat,
                longitude: lon,
                accuracyMeters: acc,
                capturedAt: new Date().toISOString(),
                provider: "GPS Nativo Alta Precisão",
                sirgas2000: latLonToSirgasUtm(lat, lon),
                quality: {
                    label: acc <= 5 ? "Alta Precisão (Sub-5m)" : "Precisão Padrão",
                    className: acc <= 5 ? "success" : "warning"
                }
            };

            lastGeolocationFix = fix;
            saveGeorefState();

            const latInput = document.getElementById("georef-input-lat");
            const lonInput = document.getElementById("georef-input-lon");
            if (latInput) latInput.value = lat.toFixed(8);
            if (lonInput) lonInput.value = lon.toFixed(8);
            onGeorefLatLonChange();

            if (georefMap) {
                if (georefGpsMarker) georefMap.removeLayer(georefGpsMarker);
                if (georefGpsCircle) georefMap.removeLayer(georefGpsCircle);

                const userIcon = L.divIcon({
                    className: "georef-user-pin",
                    html: `<div style="width: 18px; height: 18px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px #38bdf8;"></div>`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });

                georefGpsMarker = L.marker([lat, lon], { icon: userIcon }).addTo(georefMap);
                georefGpsCircle = L.circle([lat, lon], { radius: acc, color: "#38bdf8", fillOpacity: 0.15 }).addTo(georefMap);

                georefMap.flyTo([lat, lon], 18, { animate: true, duration: 1.0 });
            }

            showToast(`GPS capturado: ± ${formatNumber(acc, 1)} m de precisão.`, "success");
            renderGeorefPanel();
        },
        err => {
            if (btnLabel) btnLabel.textContent = "Usar GPS Atual";
            showToast(`Erro ao capturar GPS: ${err.message}`, "warning");
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
}

function onGeorefLatLonChange() {
    const lat = Number(document.getElementById("georef-input-lat")?.value);
    const lon = Number(document.getElementById("georef-input-lon")?.value);
    const derivedEl = document.getElementById("georef-utm-derived");

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        if (derivedEl) derivedEl.textContent = "-";
        return;
    }

    const utm = latLonToSirgasUtm(lat, lon);
    if (derivedEl) {
        derivedEl.textContent = `E ${formatNumber(utm.easting, 3)} m · N ${formatNumber(utm.northing, 3)} m · ${utm.projectedEpsg}`;
    }
}

async function copyGeorefCoordinate() {
    const lat = Number(document.getElementById("georef-input-lat")?.value);
    const lon = Number(document.getElementById("georef-input-lon")?.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        showToast("Insira coordenadas válidas antes de copiar.", "warning");
        return;
    }
    const utm = latLonToSirgasUtm(lat, lon);
    const text = `Lat ${lat.toFixed(8)}, Lon ${lon.toFixed(8)}, E ${formatNumber(utm.easting, 3)} m, N ${formatNumber(utm.northing, 3)} m, ${utm.projectedEpsg}`;
    try {
        await navigator.clipboard.writeText(text);
        showToast("Coordenadas copiadas para a área de transferência!");
    } catch {
        showToast(text);
    }
}

function applyPastedGeorefCoordinate() {
    const input = document.getElementById("georef-input-paste");
    if (!input || !input.value.trim()) {
        showToast("Cole o texto da coordenada no campo antes de aplicar.", "warning");
        return;
    }
    const parsed = parseEarthCoordinateText(input.value);
    if (!parsed) {
        showToast("Formato de coordenada não reconhecido.", "warning");
        return;
    }
    const latInput = document.getElementById("georef-input-lat");
    const lonInput = document.getElementById("georef-input-lon");
    if (latInput) latInput.value = parsed.latitude.toFixed(8);
    if (lonInput) lonInput.value = parsed.longitude.toFixed(8);
    onGeorefLatLonChange();
    showToast("Coordenada aplicada aos campos!");
}

function saveManualGeorefCoordinate() {
    const structure = geoSpatialState.selectedStructure;
    if (!structure || structure === "Toda a Mina (Visão Geral)") {
        showToast("Selecione uma estrutura específica antes de salvar.", "warning");
        return;
    }
    const lat = Number(document.getElementById("georef-input-lat")?.value);
    const lon = Number(document.getElementById("georef-input-lon")?.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        showToast("Coordenadas inválidas.", "error");
        return;
    }

    geoSpatialState.manualCoordinates = geoSpatialState.manualCoordinates || {};
    geoSpatialState.manualCoordinates[structure] = { latitude: lat, longitude: lon };
    saveGeospatialState();
    renderGeorefMarkers();
    showToast(`Coordenada salva para ${structure}!`, "success");
}

function openSelectedStructureInGoogleEarth() {
    const structure = geoSpatialState.selectedStructure || "PDE 1";
    const coord = getPreferredStructureCoordinate(structure) || { latitude: -20.088, longitude: -44.103 };
    window.open(`https://earth.google.com/web/search/${coord.latitude.toFixed(8)},${coord.longitude.toFixed(8)}`, "_blank");
}

function renderGeorefStructureDetails(structureName) {
    const isOverview = structureName === "Toda a Mina (Visão Geral)" || structureName === "all";
    const badge = document.getElementById("georef-structure-badge");
    if (badge) badge.textContent = isOverview ? "Visão Geral" : structureName;

    const instruments = isOverview
        ? Object.values(INSTRUMENT_REGISTRY)
        : getEarthStructureInstruments(structureName);

    const latestReadings = typeof getLatestReadingsByInstrument === "function" ? getLatestReadingsByInstrument() : {};

    let normalCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    instruments.forEach(inst => {
        const latest = latestReadings[inst.id];
        const status = latest?.status || "Normal";
        if (status === "Alerta" || status === "Crítico") criticalCount++;
        else if (status === "Atenção") warningCount++;
        else normalCount++;
    });

    setTextContent("georef-kpi-instruments", instruments.length);
    setTextContent("georef-kpi-normal", normalCount);
    setTextContent("georef-kpi-warning", warningCount);
    setTextContent("georef-kpi-critical", criticalCount);

    const listContainer = document.getElementById("georef-instruments-list");
    if (!listContainer) return;

    if (!instruments.length) {
        listContainer.innerHTML = `<div class="text-secondary small p-3">Nenhum instrumento associado a esta estrutura.</div>`;
        return;
    }

    listContainer.innerHTML = instruments.slice(0, 30).map(inst => {
        const latest = latestReadings[inst.id];
        const status = latest?.status || "Normal";
        let statusBadge = `<span class="badge badge-success">Normal</span>`;
        if (status === "Alerta" || status === "Crítico") statusBadge = `<span class="badge badge-danger">${escapeHtml(status)}</span>`;
        else if (status === "Atenção") statusBadge = `<span class="badge badge-warning">Atenção</span>`;

        return `
            <div class="georef-inst-card" onclick="focusGeorefInstrument('${escapeHtml(inst.id)}')">
                <div>
                    <strong>${escapeHtml(inst.code || inst.id)}</strong>
                    <div class="text-secondary small">${escapeHtml(inst.type)} • ${latest ? `${formatNumber(latest.value, 2)} ${latest.unit || 'm'}` : 'Sem leitura'}</div>
                </div>
                <div>${statusBadge}</div>
            </div>
        `;
    }).join("");
}

function focusGeorefInstrument(instrumentId) {
    const inst = INSTRUMENT_REGISTRY[instrumentId];
    if (!inst || !georefMap) return;
    const latLon = getInstrumentLatLon(inst);
    if (latLon && Number.isFinite(latLon.latitude) && Number.isFinite(latLon.longitude)) {
        georefMap.flyTo([latLon.latitude, latLon.longitude], 18, { animate: true, duration: 1.0 });
    }
}

function renderGeorefPanel() {
    renderGeorefStructurePills();
    initGeorefLeafletMap();
    renderGeorefStructureDetails(geoSpatialState.selectedStructure || "Toda a Mina (Visão Geral)");

    const rows = typeof buildUnifiedRecords === "function" ? getGeoreferencedRows() : [];
    const body = document.getElementById("georef-records-body");
    if (!body) return;

    const previewRows = rows.slice(0, 15);
    if (previewRows.length === 0) {
        body.innerHTML = `<tr><td colspan="8" class="text-center text-secondary">Nenhum registro com georreferenciamento capturado em campo.</td></tr>`;
        return;
    }

    body.innerHTML = previewRows.map(row => {
        const geo = getRecordGeolocation(row.raw);
        const rowSirgas = geo?.sirgas2000 || {};
        return `<tr>
            <td>${escapeHtml(row.displayDate)}</td>
            <td>${escapeHtml(row.structure)}</td>
            <td>${escapeHtml(row.element)}</td>
            <td>${escapeHtml(row.typeLabel)}</td>
            <td>${escapeHtml(rowSirgas.projectedEpsg || "-")}</td>
            <td>E ${escapeHtml(formatNumber(rowSirgas.easting, 3))}<br>N ${escapeHtml(formatNumber(rowSirgas.northing, 3))}</td>
            <td>${escapeHtml(formatNumber(geo?.accuracyMeters, 1))} m</td>
            <td><span class="release-pill ${escapeHtml(geo?.quality?.className || "pending")}">${escapeHtml(geo?.quality?.label || "-")}</span></td>
        </tr>`;
    }).join("");
}

function getInstrumentLabel(inst) {
    return `${inst.code || inst.id} - ${getInstrumentTypeShortLabel(inst.type)}`;
}

function getInstrumentTypeShortLabel(type) {
    if (type === "PZ") return "Piezômetro";
    if (type === "INA") return "Indicador de Nível de Água";
    if (type === "MV") return "Medidor de Vazão";
    if (type === "NA") return "Nível de Água";
    return type || "Instrumento";
}

function compareInstrumentsByTypeAndCode(a, b) {
    const typeOrder = { PZ: 1, INA: 2, NA: 3, MV: 4 };
    const typeCompare = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    if (typeCompare !== 0) return typeCompare;

    return String(a.code || a.id).localeCompare(String(b.code || b.id), "pt-BR", {
        numeric: true,
        sensitivity: "base"
    });
}

function getLatestReadingsByInstrument() {
    const latestReadings = {};
    readingsDatabase.forEach(r => {
        if (!latestReadings[r.instrumentId] || new Date(r.dateTime) > new Date(latestReadings[r.instrumentId].dateTime)) {
            latestReadings[r.instrumentId] = r;
        }
    });
    return latestReadings;
}

function populateInstrumentSelect() {
    const select = document.getElementById("instrument-select");
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = `<option value="">Selecione...</option>`;

    const groupedByStructure = Object.values(INSTRUMENT_REGISTRY)
        .filter(inst => ["PZ", "INA"].includes(inst.type))
        .reduce((groups, inst) => {
            const structure = inst.structure || "Estrutura não informada";
            if (!groups[structure]) groups[structure] = [];
            groups[structure].push(inst);
            return groups;
        }, {});

    const structureOrder = SOURCE_DATABASE?.summary?.structures || [];
    const orderedStructures = Object.keys(groupedByStructure).sort((a, b) => {
        const indexA = structureOrder.indexOf(a);
        const indexB = structureOrder.indexOf(b);
        if (indexA !== -1 || indexB !== -1) {
            return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA)
                - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
        }
        return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });

    orderedStructures.forEach(structure => {
        const group = document.createElement("optgroup");
        group.label = structure;
        groupedByStructure[structure].sort(compareInstrumentsByTypeAndCode).forEach(inst => {
            const option = document.createElement("option");
            option.value = inst.id;
            option.textContent = getInstrumentLabel(inst);
            option.dataset.structure = structure;
            option.dataset.type = inst.type;
            group.appendChild(option);
        });
        select.appendChild(group);
    });

    if (currentValue && INSTRUMENT_REGISTRY[currentValue]) {
        select.value = currentValue;
    }
}

function populateInspectionStructures() {
    const select = document.getElementById("ins-structure");
    if (!select || !SOURCE_DATABASE?.summary?.structures?.length) return;

    const currentValue = select.value;
    select.innerHTML = "";
    SOURCE_DATABASE.summary.structures.forEach(structure => {
        const option = document.createElement("option");
        option.value = structure;
        option.textContent = structure;
        select.appendChild(option);
    });

    if (currentValue && SOURCE_DATABASE.summary.structures.includes(currentValue)) {
        select.value = currentValue;
    }
}

function getGoogleEarthStructureRecords() {
    return (GOOGLE_EARTH_GEOTEC.structures || [])
        .filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
        .map(item => ({
            structure: getCanonicalStructureName(item.name),
            coordinate: {
                latitude: Number(item.latitude),
                longitude: Number(item.longitude)
            }
        }));
}

function getGoogleEarthStructureCoordinate(structure) {
    const normalized = normalizeComparable(structure);
    const record = getGoogleEarthStructureRecords().find(item =>
        normalizeComparable(item.structure) === normalized
    );
    return record?.coordinate || null;
}

function getManualStructureCoordinate(structure) {
    const normalized = normalizeComparable(structure);
    const entry = Object.entries(geoSpatialState.manualCoordinates || {}).find(([key]) =>
        normalizeComparable(key) === normalized
    )?.[1];
    const latitude = Number(entry?.latitude);
    const longitude = Number(entry?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
        latitude,
        longitude,
        source: entry.source || "Coordenada manual",
        updatedAt: entry.updatedAt || null
    };
}

function getPreferredStructureCoordinate(structure) {
    return getManualStructureCoordinate(structure)
        || getGoogleEarthStructureCoordinate(structure)
        || null;
}

function getGoogleEarthInstrumentCoordinate(instrument) {
    const code = normalizeComparable(instrument?.code || instrument?.id);
    const structure = normalizeComparable(instrument?.structure);
    const record = (GOOGLE_EARTH_GEOTEC.instruments || []).find(item =>
        normalizeComparable(item.code) === code
        && (!item.structure || normalizeComparable(item.structure) === structure)
    );
    if (!record) return null;
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
        latitude,
        longitude,
        altitude: null,
        ...latLonToSirgasUtm(latitude, longitude),
        source: GOOGLE_EARTH_GEOTEC.sourceFile || "Google Earth"
    };
}

function buildGoogleEarthBundledLayers() {
    const layers = {};
    const ensureLayer = structure => {
        const canonical = getCanonicalStructureName(structure);
        if (!layers[canonical]) {
            layers[canonical] = {
                fileName: GOOGLE_EARTH_GEOTEC.sourceFile || "ESTRUTURAS GEOTEC.kmz",
                name: `${canonical} - Google Earth`,
                importedAt: new Date().toISOString(),
                bundled: true,
                official: true,
                sourceVersion: GOOGLE_EARTH_GEOTEC.version,
                features: [],
                overlays: []
            };
        }
        return layers[canonical];
    };

    getGoogleEarthStructureRecords().forEach(item => {
        ensureLayer(item.structure).features.push({
            type: "point",
            name: item.structure,
            role: "structure",
            coordinates: [item.coordinate]
        });
    });

    (GOOGLE_EARTH_GEOTEC.additionalPoints || []).forEach(item => {
        if (!Number.isFinite(Number(item.latitude)) || !Number.isFinite(Number(item.longitude))) return;
        ensureLayer(item.structure || item.name).features.push({
            type: "point",
            name: item.name,
            role: "reference",
            coordinates: [{ latitude: Number(item.latitude), longitude: Number(item.longitude) }]
        });
    });

    (GOOGLE_EARTH_GEOTEC.instruments || []).forEach(item => {
        if (!Number.isFinite(Number(item.latitude)) || !Number.isFinite(Number(item.longitude))) return;
        ensureLayer(item.structure || "Instrumentos").features.push({
            type: "point",
            name: item.code,
            role: "instrument",
            coordinates: [{ latitude: Number(item.latitude), longitude: Number(item.longitude) }]
        });
    });
    return layers;
}

function getBundledGeospatialLayers() {
    const layers = {};
    Object.entries(GEOVIEW_OPERATIONAL.defaultLayers || {}).forEach(([structure, layer]) => {
        const canonical = getCanonicalStructureName(structure);
        layers[canonical] = layer;
    });
    Object.assign(layers, buildGoogleEarthBundledLayers());
    return layers;
}

function loadGeospatialState() {
    const bundledLayers = getBundledGeospatialLayers();
    try {
        const parsed = JSON.parse(localStorage.getItem(GEOSPATIAL_STATE_KEY) || "null");
        if (parsed && typeof parsed === "object") {
            geoSpatialState = {
                selectedStructure: parsed.selectedStructure || null,
                manualCoordinates: parsed.manualCoordinates && typeof parsed.manualCoordinates === "object" ? parsed.manualCoordinates : {},
                layers: {
                    ...(parsed.layers && typeof parsed.layers === "object" ? parsed.layers : {}),
                    ...bundledLayers
                }
            };
        } else {
            geoSpatialState.layers = bundledLayers;
            geoSpatialState.manualCoordinates = geoSpatialState.manualCoordinates || {};
        }
    } catch (error) {
        console.warn("Falha ao carregar camadas geoespaciais:", error);
        geoSpatialState = { selectedStructure: null, layers: bundledLayers, manualCoordinates: {} };
    }
}

function saveGeospatialState() {
    try {
        localStorage.setItem(GEOSPATIAL_STATE_KEY, JSON.stringify(geoSpatialState));
    } catch (error) {
        console.warn("Falha ao salvar camadas geoespaciais:", error);
        showToast("A camada foi carregada, mas o dispositivo nao conseguiu salvar tudo localmente.", "warning");
    }
}

function initializeEarthMapInputs() {
    const input = document.getElementById("earth-kml-input");
    if (input && input.dataset.bound !== "true") {
        input.addEventListener("change", event => {
            handleEarthKmlFile(event.target.files?.[0]);
            event.target.value = "";
        });
        input.dataset.bound = "true";
    }
}

function populateEarthStructureSelect() {
    const select = document.getElementById("earth-structure-select");
    if (!select) return null;

    const structures = ["Toda a Mina (Visão Geral)", ...getGeospatialStructureList()];
    const current = geoSpatialState.selectedStructure && structures.includes(geoSpatialState.selectedStructure)
        ? geoSpatialState.selectedStructure
        : structures[0];
    geoSpatialState.selectedStructure = current;
    select.innerHTML = structures.map(structure => `<option value="${escapeHtml(structure)}">${escapeHtml(structure)}</option>`).join("");
    select.value = current;
    return current;
}

function setEarthMapStructure(structure) {
    const isOverview = structure === "Toda a Mina (Visão Geral)" || structure === "all";
    const canonical = isOverview ? "Toda a Mina (Visão Geral)" : getCanonicalStructureName(structure);
    geoSpatialState.selectedStructure = canonical;

    const select = document.getElementById("earth-structure-select");
    if (select && select.value !== canonical) select.value = canonical;

    if (!isOverview) {
        pilhasIndicatorFilters.structure = canonical;
        pilhasIndicatorFilters.instrumentId = null;
        const geoViewSelect = document.getElementById("geoview-map-structure");
        if (geoViewSelect && Array.from(geoViewSelect.options).some(option => option.value === canonical)) {
            geoViewSelect.value = canonical;
        }
    }
    earthMapView.focusedInstrumentId = null;
    saveGeospatialState();
    renderEarthMapPanel();
    renderEarthStructureChips();
    if (document.getElementById("pilhas-bi-dashboard") && !isOverview) renderPilhasIndicatorDashboard();

    // Trigger smooth fly-to transition
    transitionCameraToStructure(canonical);
}

function getEarthCoordinateEditorValues() {
    const latitude = Number(document.getElementById("earth-manual-lat")?.value);
    const longitude = Number(document.getElementById("earth-manual-lon")?.value);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
}

function setEarthCoordinateEditorValues(coordinate, sourceLabel = "Referência do KMZ Google Earth") {
    const latInput = document.getElementById("earth-manual-lat");
    const lonInput = document.getElementById("earth-manual-lon");
    if (latInput) latInput.value = Number.isFinite(Number(coordinate?.latitude)) ? Number(coordinate.latitude).toFixed(8) : "";
    if (lonInput) lonInput.value = Number.isFinite(Number(coordinate?.longitude)) ? Number(coordinate.longitude).toFixed(8) : "";
    setTextContent("earth-coordinate-source", sourceLabel);
    updateEarthCoordinateDerived();
}

function updateEarthCoordinateDerived() {
    const coordinate = getEarthCoordinateEditorValues();
    if (!coordinate) {
        setTextContent("earth-coordinate-derived", "-");
        return;
    }
    const utm = latLonToSirgasUtm(coordinate.latitude, coordinate.longitude);
    setTextContent(
        "earth-coordinate-derived",
        `E ${formatNumber(utm.easting, 3)} m / N ${formatNumber(utm.northing, 3)} m - ${utm.projectedEpsg}`
    );
}

function parseEarthCoordinateText(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    // Se for formato UTM: E 593029 N 7778196 ou 593029, 7778196 com valores altos
    const utmMatch = raw.match(/(\d{5,7}(?:\.\d+)?)\s*[,\s/]+\s*(\d{6,8}(?:\.\d+)?)/);
    if (utmMatch) {
        const n1 = Number(utmMatch[1]);
        const n2 = Number(utmMatch[2]);
        if (n1 > 100000 && n2 > 1000000) {
            const latLon = sirgasUtmToLatLon(n1, n2, 23, "S");
            if (latLon) return latLon;
        }
    }

    // Formato Decimal Lat, Lon
    const numbers = raw
        .replace(/;/g, ",")
        .match(/-?\d+(?:[.,]\d+)?/g)
        ?.map(value => Number(value.replace(",", "."))) || [];
    if (numbers.length >= 2) {
        const [lat, lon] = numbers;
        if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            return { latitude: lat, longitude: lon };
        }
    }

    return null;
}

function applyPastedEarthCoordinate() {
    const input = document.getElementById("earth-coordinate-paste");
    const coordinate = parseEarthCoordinateText(input?.value);
    if (!coordinate) {
        showToast("Cole uma coordenada válida no formato latitude, longitude ou UTM E/N.", "warning");
        return;
    }
    setEarthCoordinateEditorValues(coordinate, "Coordenada colada (WGS84 / SIRGAS 2000)");
    showToast("Coordenada reconhecida com sucesso! Revise e clique em Aplicar.");
}

function populateEarthCoordinateEditor(structure) {
    const manual = getManualStructureCoordinate(structure);
    const googleEarth = getGoogleEarthStructureCoordinate(structure);
    const coordinate = manual || googleEarth;
    const sourceLabel = manual
        ? `Coordenada manual salva em ${formatDateTimeBR(manual.updatedAt)}`
        : googleEarth
            ? `Referência oficial do KMZ ${GOOGLE_EARTH_GEOTEC.sourceFile || "Google Earth"}`
            : "Sem referência cadastrada";
    setEarthCoordinateEditorValues(coordinate, sourceLabel);
}

function applyEarthManualCoordinate() {
    const structure = geoSpatialState.selectedStructure || document.getElementById("earth-structure-select")?.value;
    if (!structure || structure === "Toda a Mina (Visão Geral)") {
        showToast("Selecione uma estrutura específica antes de aplicar a coordenada.", "warning");
        return;
    }
    const coordinate = getEarthCoordinateEditorValues();
    if (!coordinate) {
        showToast("Informe latitude e longitude válidas antes de aplicar.", "warning");
        return;
    }
    if (!geoSpatialState.manualCoordinates) geoSpatialState.manualCoordinates = {};
    geoSpatialState.manualCoordinates[getCanonicalStructureName(structure)] = {
        ...coordinate,
        source: "manual",
        updatedAt: new Date().toISOString()
    };
    saveGeospatialState();
    renderEarthMapPanel();
    renderGeorefPanel();
    renderPilhasIndicatorDashboard();
    showToast(`Coordenada aplicada com sucesso para ${getCanonicalStructureName(structure)}.`);
}

function useCurrentGpsForEarthCoordinate() {
    if (!navigator.geolocation) {
        showToast("Geolocalização não suportada neste dispositivo.", "warning");
        return;
    }
    showToast("Capturando coordenadas de alta precisão via GPS...");
    navigator.geolocation.getCurrentPosition(
        position => {
            const fix = ingestGeolocationFix({
                coords: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude
                },
                timestamp: position.timestamp,
                provider: "GPS Nativo Alta Precisão"
            }, "GPS_DIRECT");

            earthMapView.liveGps = fix;
            setEarthCoordinateEditorValues(fix, `GPS atual capturado (precisão ± ${formatNumber(fix.accuracyMeters, 1)} m)`);
            renderEarthMapPanel();
            renderGeorefPanel();
            showToast(`GPS capturado: ± ${formatNumber(fix.accuracyMeters, 1)} m`);
        },
        error => {
            if (lastGeolocationFix) {
                setEarthCoordinateEditorValues(lastGeolocationFix, "Última posição GPS em memória");
                showToast("Usando última captura de GPS disponível.");
            } else {
                showToast(`Falha ao obter sinal do GPS: ${error.message}`, "warning");
            }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
}

function getSelectedEarthStructureCoordinate() {
    const structure = geoSpatialState.selectedStructure || document.getElementById("earth-structure-select")?.value;
    const coordinate = getPreferredStructureCoordinate(structure);
    return { structure, coordinate };
}

function openSelectedEarthStructureInGoogleEarth() {
    const { structure, coordinate } = getSelectedEarthStructureCoordinate();
    if (!coordinate) {
        showToast("Esta estrutura ainda não tem coordenada definida.", "warning");
        return;
    }
    const latitude = Number(coordinate.latitude).toFixed(8);
    const longitude = Number(coordinate.longitude).toFixed(8);
    window.open(`https://earth.google.com/web/search/${latitude},${longitude}`, "_blank", "noopener,noreferrer");
    showToast(`Abrindo ${structure} no Google Earth.`);
}

async function copyEarthStructureCoordinate() {
    const coordinate = getEarthCoordinateEditorValues();
    if (!coordinate) {
        showToast("Não há coordenada válida para copiar.", "warning");
        return;
    }
    const utm = latLonToSirgasUtm(coordinate.latitude, coordinate.longitude);
    const text = `Lat ${coordinate.latitude.toFixed(8)}, Lon ${coordinate.longitude.toFixed(8)}, E ${formatNumber(utm.easting, 3)} m, N ${formatNumber(utm.northing, 3)} m, ${utm.projectedEpsg}`;
    try {
        await navigator.clipboard.writeText(text);
        showToast("Coordenada copiada para a área de transferência.");
    } catch (error) {
        showToast(text);
    }
}

let mapCamera = {
    current: { x: 0, y: 0, w: 800, h: 400 },
    target: { x: 0, y: 0, w: 800, h: 400 },
    start: { x: 0, y: 0, w: 800, h: 400 },
    animating: false,
    startTime: 0,
    duration: 500,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    cameraStartX: 0,
    cameraStartY: 0
};

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function flyToMapViewBox(targetX, targetY, targetW, targetH, duration = 500) {
    const svg = document.getElementById("dam-map");
    if (!svg) return;

    targetW = Math.max(120, Math.min(800, targetW));
    targetH = targetW / 2;
    targetX = Math.max(-50, Math.min(850 - targetW, targetX));
    targetY = Math.max(-50, Math.min(450 - targetH, targetY));

    mapCamera.start = { ...mapCamera.current };
    mapCamera.target = { x: targetX, y: targetY, w: targetW, h: targetH };
    mapCamera.startTime = performance.now();
    mapCamera.duration = duration;

    if (!mapCamera.animating) {
        mapCamera.animating = true;
        requestAnimationFrame(stepMapCameraAnimation);
    }
}

function stepMapCameraAnimation(now) {
    const elapsed = now - mapCamera.startTime;
    const progress = Math.min(1, elapsed / mapCamera.duration);
    const ease = easeOutCubic(progress);

    mapCamera.current.x = mapCamera.start.x + (mapCamera.target.x - mapCamera.start.x) * ease;
    mapCamera.current.y = mapCamera.start.y + (mapCamera.target.y - mapCamera.start.y) * ease;
    mapCamera.current.w = mapCamera.start.w + (mapCamera.target.w - mapCamera.start.w) * ease;
    mapCamera.current.h = mapCamera.start.h + (mapCamera.target.h - mapCamera.start.h) * ease;

    const svg = document.getElementById("dam-map");
    if (svg) {
        svg.setAttribute("viewBox", `${mapCamera.current.x.toFixed(2)} ${mapCamera.current.y.toFixed(2)} ${mapCamera.current.w.toFixed(2)} ${mapCamera.current.h.toFixed(2)}`);
    }

    if (progress < 1) {
        requestAnimationFrame(stepMapCameraAnimation);
    } else {
        mapCamera.animating = false;
    }
}

function initInteractiveMapPanZoom() {
    const stage = document.querySelector(".earth-map-stage");
    const svg = document.getElementById("dam-map");
    if (!stage || !svg || stage.dataset.panInitialized === "true") return;
    stage.dataset.panInitialized = "true";

    // Mouse Drag Panning
    stage.addEventListener("mousedown", e => {
        if (e.target.closest("button") || e.target.closest(".map-pin") || e.target.closest(".earth-structure-reference-pin")) return;
        mapCamera.isDragging = true;
        mapCamera.dragStartX = e.clientX;
        mapCamera.dragStartY = e.clientY;
        mapCamera.cameraStartX = mapCamera.current.x;
        mapCamera.cameraStartY = mapCamera.current.y;
        stage.classList.add("is-dragging");
    });

    window.addEventListener("mousemove", e => {
        if (!mapCamera.isDragging) return;
        const rect = svg.getBoundingClientRect();
        const scaleX = mapCamera.current.w / (rect.width || 800);
        const scaleY = mapCamera.current.h / (rect.height || 400);
        const dx = (e.clientX - mapCamera.dragStartX) * scaleX;
        const dy = (e.clientY - mapCamera.dragStartY) * scaleY;

        mapCamera.current.x = mapCamera.cameraStartX - dx;
        mapCamera.current.y = mapCamera.cameraStartY - dy;
        mapCamera.target.x = mapCamera.current.x;
        mapCamera.target.y = mapCamera.current.y;
        svg.setAttribute("viewBox", `${mapCamera.current.x.toFixed(2)} ${mapCamera.current.y.toFixed(2)} ${mapCamera.current.w.toFixed(2)} ${mapCamera.current.h.toFixed(2)}`);
    });

    window.addEventListener("mouseup", () => {
        if (mapCamera.isDragging) {
            mapCamera.isDragging = false;
            stage.classList.remove("is-dragging");
        }
    });

    // Touch Drag Panning
    stage.addEventListener("touchstart", e => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            mapCamera.isDragging = true;
            mapCamera.dragStartX = touch.clientX;
            mapCamera.dragStartY = touch.clientY;
            mapCamera.cameraStartX = mapCamera.current.x;
            mapCamera.cameraStartY = mapCamera.current.y;
        }
    }, { passive: true });

    stage.addEventListener("touchmove", e => {
        if (!mapCamera.isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const rect = svg.getBoundingClientRect();
        const scaleX = mapCamera.current.w / (rect.width || 800);
        const scaleY = mapCamera.current.h / (rect.height || 400);
        const dx = (touch.clientX - mapCamera.dragStartX) * scaleX;
        const dy = (touch.clientY - mapCamera.dragStartY) * scaleY;

        mapCamera.current.x = mapCamera.cameraStartX - dx;
        mapCamera.current.y = mapCamera.cameraStartY - dy;
        svg.setAttribute("viewBox", `${mapCamera.current.x.toFixed(2)} ${mapCamera.current.y.toFixed(2)} ${mapCamera.current.w.toFixed(2)} ${mapCamera.current.h.toFixed(2)}`);
    }, { passive: true });

    stage.addEventListener("touchend", () => {
        mapCamera.isDragging = false;
    });

    // Wheel Zoom
    stage.addEventListener("wheel", e => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const mouseSvgX = mapCamera.current.x + ((e.clientX - rect.left) / (rect.width || 800)) * mapCamera.current.w;
        const mouseSvgY = mapCamera.current.y + ((e.clientY - rect.top) / (rect.height || 400)) * mapCamera.current.h;

        const zoomFactor = e.deltaY < 0 ? 0.80 : 1.25;
        const newW = Math.max(120, Math.min(800, mapCamera.current.w * zoomFactor));
        const newH = newW / 2;

        const newX = mouseSvgX - ((e.clientX - rect.left) / (rect.width || 800)) * newW;
        const newY = mouseSvgY - ((e.clientY - rect.top) / (rect.height || 400)) * newH;

        flyToMapViewBox(newX, newY, newW, newH, 200);
    }, { passive: false });
}

function renderEarthStructureChips() {
    const container = document.getElementById("earth-structure-chips");
    if (!container) return;
    const structures = ["Toda a Mina (Visão Geral)", ...getGeospatialStructureList()];
    const current = geoSpatialState.selectedStructure || structures[0];

    container.innerHTML = structures.map(name => {
        const isOverview = name === "Toda a Mina (Visão Geral)";
        const isActive = normalizeComparable(name) === normalizeComparable(current);
        const icon = isOverview ? "fa-globe" : "fa-layer-group";
        return `
            <button type="button" class="structure-chip ${isActive ? "active" : ""}" onclick="setEarthMapStructure('${escapeHtml(name)}')">
                <i class="fa-solid ${icon}"></i> ${escapeHtml(name)}
            </button>
        `;
    }).join("");
}

function transitionCameraToStructure(structure) {
    const isOverview = structure === "Toda a Mina (Visão Geral)" || structure === "all";
    if (isOverview) {
        flyToMapViewBox(0, 0, 800, 400, 520);
        return;
    }

    const projection = getMasterEarthProjection();
    const coord = getPreferredStructureCoordinate(structure);
    if (coord) {
        const p = projection(coord);
        flyToMapViewBox(p.x - 140, p.y - 70, 280, 140, 500);
        return;
    }

    const instruments = getEarthStructureInstruments(structure);
    const valid = instruments.map(inst => getInstrumentLatLon(inst)).filter(Boolean);
    if (valid.length) {
        const p = projection(valid[0]);
        flyToMapViewBox(p.x - 140, p.y - 70, 280, 140, 500);
    } else {
        flyToMapViewBox(0, 0, 800, 400, 500);
    }
}

function setEarthMapZoom(direction) {
    const factor = direction > 0 ? 0.70 : 1.40;
    const newW = Math.max(120, Math.min(800, mapCamera.current.w * factor));
    const newH = newW / 2;
    const cx = mapCamera.current.x + mapCamera.current.w / 2;
    const cy = mapCamera.current.y + mapCamera.current.h / 2;
    flyToMapViewBox(cx - newW / 2, cy - newH / 2, newW, newH, 350);
}

function resetEarthMapView(apply = true) {
    flyToMapViewBox(0, 0, 800, 400, 500);
}

function toggleEarthMapLayers() {
    earthMapView.layersVisible = !earthMapView.layersVisible;
    document.getElementById("dam-map")?.classList.toggle("earth-hide-kml", !earthMapView.layersVisible);
}

function openEarthKmlPicker() {
    const structure = geoSpatialState.selectedStructure || document.getElementById("earth-structure-select")?.value;
    if (!structure) {
        showToast("Selecione uma estrutura antes de importar a base Google Earth.", "warning");
        return;
    }
    document.getElementById("earth-kml-input")?.click();
}

function getXmlElements(parent, tagName) {
    return [
        ...Array.from(parent.getElementsByTagName(tagName)),
        ...Array.from(parent.getElementsByTagNameNS("*", tagName))
    ].filter((node, index, list) => list.indexOf(node) === index);
}

function getFirstXmlText(parent, tagName) {
    return getXmlElements(parent, tagName)[0]?.textContent?.trim() || "";
}

function parseKmlCoordinates(text) {
    return String(text || "")
        .trim()
        .split(/\s+/)
        .map(chunk => {
            const [lon, lat, alt] = chunk.split(",").map(Number);
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
            return { longitude: lon, latitude: lat, altitude: Number.isFinite(alt) ? alt : null };
        })
        .filter(Boolean);
}

function parseKmlText(kmlText, fileName = "Google Earth") {
    const xml = new DOMParser().parseFromString(kmlText, "application/xml");
    if (xml.querySelector("parsererror")) {
        throw new Error("KML invalido ou corrompido.");
    }

    const layer = {
        fileName,
        name: getFirstXmlText(xml, "name") || fileName,
        importedAt: new Date().toISOString(),
        features: [],
        overlays: []
    };

    getXmlElements(xml, "Placemark").forEach((placemark, index) => {
        const name = getFirstXmlText(placemark, "name") || `Feicao ${index + 1}`;
        getXmlElements(placemark, "Point").forEach(point => {
            const coordinates = parseKmlCoordinates(getFirstXmlText(point, "coordinates"));
            coordinates.forEach(coord => layer.features.push({ type: "point", name, coordinates: [coord] }));
        });
        getXmlElements(placemark, "LineString").forEach(line => {
            const coordinates = parseKmlCoordinates(getFirstXmlText(line, "coordinates"));
            if (coordinates.length) layer.features.push({ type: "line", name, coordinates });
        });
        getXmlElements(placemark, "Polygon").forEach(polygon => {
            const coordinates = parseKmlCoordinates(getFirstXmlText(polygon, "coordinates"));
            if (coordinates.length) layer.features.push({ type: "polygon", name, coordinates });
        });
    });

    getXmlElements(xml, "GroundOverlay").forEach((overlay, index) => {
        const box = getXmlElements(overlay, "LatLonBox")[0];
        if (!box) return;
        layer.overlays.push({
            name: getFirstXmlText(overlay, "name") || `Imagem ${index + 1}`,
            href: getFirstXmlText(overlay, "href"),
            north: Number(getFirstXmlText(box, "north")),
            south: Number(getFirstXmlText(box, "south")),
            east: Number(getFirstXmlText(box, "east")),
            west: Number(getFirstXmlText(box, "west")),
            rotation: Number(getFirstXmlText(box, "rotation")) || 0
        });
    });

    return layer;
}

function getKmzAssetMime(path) {
    const ext = String(path || "").split(".").pop().toLowerCase();
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    if (ext === "gif") return "image/gif";
    return "image/jpeg";
}

async function readEarthKmlOrKmzFile(file) {
    const name = file?.name || "";
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith(".kmz")) {
        if (!window.JSZip) throw new Error("Biblioteca KMZ offline nao carregada.");
        const zip = await window.JSZip.loadAsync(file);
        const kmlEntry = zip.file(/^doc\.kml$/i)[0] || zip.file(/\.kml$/i)[0];
        if (!kmlEntry) throw new Error("KMZ sem arquivo KML interno.");
        const layer = parseKmlText(await kmlEntry.async("text"), name);
        for (const overlay of layer.overlays) {
            const href = String(overlay.href || "").replace(/^\.?\//, "");
            const asset = href ? zip.file(href) || zip.file(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"))[0] : null;
            if (asset) {
                const base64 = await asset.async("base64");
                overlay.dataUrl = `data:${getKmzAssetMime(href)};base64,${base64}`;
            }
        }
        return layer;
    }
    return parseKmlText(await file.text(), name);
}

async function handleEarthKmlFile(file) {
    const structure = geoSpatialState.selectedStructure || document.getElementById("earth-structure-select")?.value;
    if (!file || !structure) return;
    try {
        const layer = await readEarthKmlOrKmzFile(file);
        geoSpatialState.selectedStructure = structure;
        geoSpatialState.layers[structure] = layer;
        saveGeospatialState();
        renderEarthMapPanel();
        showToast(`Base Google Earth importada para ${structure}.`);
    } catch (error) {
        console.warn("Falha ao importar KML/KMZ:", error);
        showToast(error.message || "Nao foi possivel importar este KML/KMZ.", "warning");
    }
}

function getEarthStructureInstruments(structure) {
    return Object.values(INSTRUMENT_REGISTRY)
        .filter(inst => inst.structure === structure && inst.type && inst.type !== "REF");
}

function getInstrumentLatLon(inst) {
    const googleEarthCoordinate = getGoogleEarthInstrumentCoordinate(inst);
    if (googleEarthCoordinate) return googleEarthCoordinate;
    const coordinates = inst?.coordinates || {};
    const easting = coordinates.ew;
    const northing = coordinates.ns;
    if (easting === null || easting === undefined || easting === "" || northing === null || northing === undefined || northing === "") return null;
    const eastingNumber = Number(easting);
    const northingNumber = Number(northing);
    if (!Number.isFinite(eastingNumber) || !Number.isFinite(northingNumber) || eastingNumber <= 0 || northingNumber <= 0) return null;
    return sirgasUtmToLatLon(eastingNumber, northingNumber, coordinates.zone || 23, coordinates.hemisphere || "S");
}

function getLayerCoordinateList(layer) {
    const coords = [];
    (layer?.features || []).forEach(feature => (feature.coordinates || []).forEach(coord => coords.push(coord)));
    (layer?.overlays || []).forEach(overlay => {
        if ([overlay.north, overlay.south, overlay.east, overlay.west].every(value => Number.isFinite(Number(value)))) {
            coords.push({ latitude: overlay.north, longitude: overlay.west });
            coords.push({ latitude: overlay.south, longitude: overlay.east });
        }
    });
    return coords;
}

function getEarthMapBounds(layer, instrumentPoints) {
    const coords = [
        ...getLayerCoordinateList(layer),
        ...instrumentPoints.map(item => item.latLon).filter(Boolean)
    ].filter(coord => Number.isFinite(Number(coord.latitude)) && Number.isFinite(Number(coord.longitude)));
    if (!coords.length) return null;
    let minLon = Math.min(...coords.map(coord => Number(coord.longitude)));
    let maxLon = Math.max(...coords.map(coord => Number(coord.longitude)));
    let minLat = Math.min(...coords.map(coord => Number(coord.latitude)));
    let maxLat = Math.max(...coords.map(coord => Number(coord.latitude)));
    const lonPad = Math.max((maxLon - minLon) * 0.12, 0.0008);
    const latPad = Math.max((maxLat - minLat) * 0.12, 0.0008);
    minLon -= lonPad;
    maxLon += lonPad;
    minLat -= latPad;
    maxLat += latPad;
    return { minLon, maxLon, minLat, maxLat };
}

function createEarthProjection(bounds) {
    const width = 800;
    const height = 400;
    const padding = 36;
    const lonRange = bounds.maxLon - bounds.minLon || 1;
    const latRange = bounds.maxLat - bounds.minLat || 1;
    return coord => ({
        x: padding + ((Number(coord.longitude) - bounds.minLon) / lonRange) * (width - padding * 2),
        y: height - padding - ((Number(coord.latitude) - bounds.minLat) / latRange) * (height - padding * 2)
    });
}

const MINE_MASTER_BOUNDS = {
    minLat: -20.108,
    maxLat: -20.060,
    minLon: -44.125,
    maxLon: -44.082
};

function getMasterEarthProjection() {
    return createEarthProjection(MINE_MASTER_BOUNDS);
}

function renderEarthFallbackBase(baseLayer, structure, hasCoordinates) {
    if (!baseLayer) return;
    baseLayer.innerHTML = `
        ${hasCoordinates ? "" : `<text x="400" y="205" class="earth-empty-label">Sem coordenadas para plotagem</text>`}
    `;
}

function renderEarthLayer(layer, projection) {
    const kmlLayer = document.getElementById("earth-kml-layer");
    const overlayLayer = document.getElementById("earth-overlay-layer");
    if (!kmlLayer || !overlayLayer) return;

    overlayLayer.innerHTML = (layer?.overlays || []).map(overlay => {
        if (![overlay.north, overlay.south, overlay.east, overlay.west].every(value => Number.isFinite(Number(value)))) return "";
        const nw = projection({ latitude: overlay.north, longitude: overlay.west });
        const se = projection({ latitude: overlay.south, longitude: overlay.east });
        const x = Math.min(nw.x, se.x);
        const y = Math.min(nw.y, se.y);
        const width = Math.abs(se.x - nw.x);
        const height = Math.abs(se.y - nw.y);
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const transform = overlay.rotation ? ` transform="rotate(${-overlay.rotation} ${centerX} ${centerY})"` : "";
        return overlay.dataUrl
            ? `<image href="${overlay.dataUrl}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" opacity="0.72"${transform}></image>`
            : `<rect x="${x}" y="${y}" width="${width}" height="${height}" class="earth-overlay-box"${transform}><title>${escapeHtml(overlay.name)}</title></rect>`;
    }).join("");

    kmlLayer.innerHTML = (layer?.features || []).map(feature => {
        const points = (feature.coordinates || []).map(projection);
        const title = `<title>${escapeHtml(feature.name || "Camada Google Earth")}</title>`;
        if (feature.type === "polygon" && points.length >= 3) {
            return `<polygon class="earth-kml-polygon" points="${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}">${title}</polygon>`;
        }
        if (feature.type === "line" && points.length >= 2) {
            return `<polyline class="earth-kml-line" points="${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}">${title}</polyline>`;
        }
        if (feature.type === "point" && points.length) {
            const point = points[0];
            return `<g class="earth-kml-point" transform="translate(${point.x.toFixed(1)}, ${point.y.toFixed(1)})">${title}<circle r="4"></circle></g>`;
        }
        return "";
    }).join("");
}

function renderAllEarthStructures(selectedStructure, projection) {
    const layer = document.getElementById("earth-base-layer");
    if (!layer) return;
    const records = getGoogleEarthStructureRecords();
    const isOverview = selectedStructure === "Toda a Mina (Visão Geral)" || selectedStructure === "all";

    layer.innerHTML = records.map(item => {
        const point = projection(item.coordinate);
        const isSelected = !isOverview && normalizeComparable(item.structure) === normalizeComparable(selectedStructure);
        const utm = latLonToSirgasUtm(item.coordinate.latitude, item.coordinate.longitude);
        const title = `${item.structure} • SIRGAS 2000 UTM 23S: E ${formatNumber(utm.easting, 3)} / N ${formatNumber(utm.northing, 3)} • Lat ${item.coordinate.latitude.toFixed(6)} / Lon ${item.coordinate.longitude.toFixed(6)}`;

        return `
            <g class="earth-structure-reference-pin ${isSelected ? "is-selected" : ""}"
               transform="translate(${point.x.toFixed(1)}, ${point.y.toFixed(1)})"
               onclick="event.stopPropagation(); setEarthMapStructure('${escapeHtml(item.structure)}')">
                <title>${escapeHtml(title)}</title>
                ${isSelected ? `<circle r="36" class="structure-radar-pulse"></circle>` : ""}
                <circle r="${isSelected ? 16 : 11}" class="structure-reference-halo"></circle>
                <circle r="${isSelected ? 6 : 4.5}" class="structure-reference-core"></circle>
                <text y="${isSelected ? -20 : -14}" class="structure-reference-tag">${escapeHtml(item.structure)}</text>
            </g>
        `;
    }).join("");
}

function renderEarthLiveGpsPin(fix, projection) {
    const layer = document.getElementById("earth-base-layer");
    if (!layer || !fix) return;
    const point = projection({ latitude: fix.latitude, longitude: fix.longitude });
    const utm = fix.sirgas2000 || latLonToSirgasUtm(fix.latitude, fix.longitude);
    const title = `Minha Posição Atual (GPS) • Precisão ± ${formatNumber(fix.accuracyMeters, 1)} m • E ${formatNumber(utm?.easting, 3)} / N ${formatNumber(utm?.northing, 3)}`;

    layer.insertAdjacentHTML("beforeend", `
        <g class="gps-live-marker" transform="translate(${point.x.toFixed(1)}, ${point.y.toFixed(1)})">
            <title>${escapeHtml(title)}</title>
            <circle r="24" class="gps-pulse"></circle>
            <circle r="6" class="gps-core"></circle>
            <text y="-14" class="structure-reference-tag" style="fill: #22c55e;">VOCÊ ESTÁ AQUI</text>
        </g>
    `);
}

function renderEarthInstrumentPins(instrumentPoints, projection) {
    const layer = document.getElementById("earth-instrument-layer");
    if (!layer) return;
    const latestReadings = getLatestReadingsByInstrument();
    layer.innerHTML = instrumentPoints.map(item => {
        const point = projection(item.latLon);
        const latest = latestReadings[item.instrument.id];
        const statusClass = getStatusClass(latest?.status);
        const radius = statusClass === "alert" ? 12 : statusClass === "warning" ? 10 : 8;
        const coreRadius = statusClass === "alert" ? 6 : 5;
        const label = item.instrument.code || item.instrument.id;
        const title = `${item.instrument.name} - ${item.latLon.projectedEpsg || "SIRGAS 2000"} E ${formatNumber(item.instrument.coordinates?.ew, 3)} / N ${formatNumber(item.instrument.coordinates?.ns, 3)} - ${latest?.status || "Sem leitura"}`;
        return `
            <g class="map-pin ${statusClass} ${earthMapView.focusedInstrumentId === item.instrument.id ? "is-focused" : ""}" id="pin-${escapeHtml(item.instrument.id)}" tabindex="0" transform="translate(${point.x.toFixed(1)}, ${point.y.toFixed(1)})" onmouseenter="focusEarthInstrument('${escapeHtml(item.instrument.id)}')" onfocus="focusEarthInstrument('${escapeHtml(item.instrument.id)}')" onclick="event.stopPropagation(); focusEarthInstrument('${escapeHtml(item.instrument.id)}', true)">
                <title>${escapeHtml(title)}</title>
                <circle r="${radius}" class="pin-pulse" />
                <circle r="${coreRadius}" class="pin-core" />
                <text y="-12" class="pin-label">${escapeHtml(label)}</text>
            </g>
        `;
    }).join("");
}

function getEarthInspectionAlerts(structure, instrumentCode = null) {
    return (GEOVIEW_OPERATIONAL.inspections || []).filter(item => {
        if (normalizeComparable(item.structure) !== normalizeComparable(structure)) return false;
        return !instrumentCode
            || !item.instrumentCode
            || normalizeComparable(item.instrumentCode) === normalizeComparable(instrumentCode);
    });
}

function getEarthInstrumentTrend(instrumentId) {
    const rows = readingsDatabase
        .filter(reading => reading.instrumentId === instrumentId)
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
        .slice(0, 2);
    if (rows.length < 2) return null;
    const current = Number(rows[0].value);
    const previous = Number(rows[1].value);
    return Number.isFinite(current) && Number.isFinite(previous) ? current - previous : null;
}

function renderEarthAnomalyPanel(structure, focusedInstrumentId = null) {
    const container = document.getElementById("alert-list-container");
    if (!container || !structure) return;
    const instruments = getEarthStructureInstruments(structure);
    const latestByInstrument = getLatestReadingsByInstrument();
    const focusedInstrument = focusedInstrumentId ? INSTRUMENT_REGISTRY[focusedInstrumentId] : null;
    const visibleInstruments = focusedInstrument ? [focusedInstrument] : instruments;
    const readingAlerts = visibleInstruments
        .map(instrument => ({ instrument, reading: latestByInstrument[instrument.id] }))
        .filter(item => item.reading && (focusedInstrument || getStatusClass(item.reading.status) !== "normal"))
        .sort((a, b) => {
            const severity = { alert: 2, warning: 1, normal: 0 };
            return severity[getStatusClass(b.reading.status)] - severity[getStatusClass(a.reading.status)];
        });
    const inspectionAlerts = getEarthInspectionAlerts(structure, focusedInstrument?.code);
    const items = [];

    readingAlerts.forEach(({ instrument, reading }) => {
        const statusClass = getStatusClass(reading.status);
        const trend = getEarthInstrumentTrend(instrument.id);
        const severity = statusClass === "alert" ? "critical" : statusClass === "warning" ? "warning" : "info";
        const trendText = trend === null
            ? ""
            : ` Variação desde a leitura anterior: ${trend >= 0 ? "+" : ""}${formatNumber(trend, 3)} m.`;
        items.push(`
            <article class="notification-item ${severity}">
                <div class="noti-icon"><i class="fa-solid ${severity === "critical" ? "fa-triangle-exclamation" : severity === "warning" ? "fa-circle-exclamation" : "fa-gauge-high"}"></i></div>
                <div class="noti-details">
                    <h4>${escapeHtml(instrument.code || instrument.id)} - ${escapeHtml(reading.status || "Sem classificação")}</h4>
                    <p>Leitura ${formatNumber(reading.value, 3)} m em ${formatDateBRShort(reading.dateTime)}.${escapeHtml(trendText)}</p>
                    <span class="noti-time">${escapeHtml(instrument.type)} • ${escapeHtml(structure)}</span>
                    ${focusedInstrument ? `<button type="button" class="noti-action" onclick="selectInstrumentFromMap('${escapeHtml(instrument.id)}')"><i class="fa-solid fa-chart-line"></i> Abrir histórico</button>` : ""}
                </div>
            </article>
        `);
    });

    inspectionAlerts.forEach(alert => {
        const severity = alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info";
        items.push(`
            <article class="notification-item ${severity}">
                <div class="noti-icon"><i class="fa-solid ${severity === "critical" ? "fa-triangle-exclamation" : "fa-clipboard-check"}"></i></div>
                <div class="noti-details">
                    <h4>${escapeHtml(alert.title)}</h4>
                    <p>${escapeHtml(alert.description)}</p>
                    <span class="noti-time">${formatDateBRShort(alert.date)} • ${escapeHtml(alert.source || "Inspeção")}</span>
                </div>
            </article>
        `);
    });

    if (!items.length) {
        const latest = focusedInstrument ? latestByInstrument[focusedInstrument.id] : null;
        items.push(`
            <article class="notification-item success">
                <div class="noti-icon"><i class="fa-solid fa-circle-check"></i></div>
                <div class="noti-details">
                    <h4>${focusedInstrument ? `${escapeHtml(focusedInstrument.code || focusedInstrument.id)} - sem anomalia ativa` : "Sem anomalias ativas"}</h4>
                    <p>${focusedInstrument
                        ? latest
                            ? `Última leitura classificada como ${escapeHtml(latest.status)} em ${formatDateBRShort(latest.dateTime)}.`
                            : "Instrumento cadastrado sem leitura associada."
                        : `${instruments.length} instrumento(s) cadastrado(s) nesta estrutura sem alerta atual no banco.`}</p>
                    <span class="noti-time">${focusedInstrument ? `${escapeHtml(focusedInstrument.type)} • ${escapeHtml(structure)}` : "Passe o cursor sobre um ponto para detalhar o instrumento."}</span>
                    ${focusedInstrument ? `<button type="button" class="noti-action" onclick="selectInstrumentFromMap('${escapeHtml(focusedInstrument.id)}')"><i class="fa-solid fa-chart-line"></i> Abrir histórico</button>` : ""}
                </div>
            </article>
        `);
    }
    container.innerHTML = items.join("");
    setTextContent("earth-anomaly-context", focusedInstrument ? focusedInstrument.code : structure);
}

function focusEarthInstrument(instrumentId, persistent = false) {
    const instrument = INSTRUMENT_REGISTRY[instrumentId];
    if (!instrument) return;
    earthMapView.focusedInstrumentId = instrumentId;
    document.querySelectorAll("#earth-instrument-layer .map-pin").forEach(pin => pin.classList.remove("is-focused"));
    document.getElementById(`pin-${instrumentId}`)?.classList.add("is-focused");
    renderEarthAnomalyPanel(instrument.structure, instrumentId);
    
    // Zoom closer on focused instrument
    const latLon = getInstrumentLatLon(instrument);
    if (latLon) {
        const projection = getMasterEarthProjection();
        const p = projection(latLon);
        applyEarthMapView(p.x, p.y, 3.2);
    }
    
    if (persistent) {
        const status = getLatestReadingsByInstrument()[instrumentId]?.status || "sem leitura";
        setTextContent("earth-map-status", `${instrument.code || instrument.id} selecionado • ${instrument.type} • ${status}. Use “Abrir histórico” no painel lateral.`);
    }
}

function clearEarthInstrumentFocus() {
    earthMapView.focusedInstrumentId = null;
    document.querySelectorAll("#earth-instrument-layer .map-pin").forEach(pin => pin.classList.remove("is-focused"));
    renderEarthAnomalyPanel(geoSpatialState.selectedStructure);
}

function renderEarthMapPanel() {
    initializeEarthMapInputs();
    const structure = populateEarthStructureSelect();
    const svg = document.getElementById("dam-map");
    if (!svg || !structure) return;

    const isOverview = structure === "Toda a Mina (Visão Geral)" || structure === "all";
    const layer = isOverview ? null : geoSpatialState.layers?.[structure];
    const instruments = isOverview 
        ? Object.values(INSTRUMENT_REGISTRY).filter(inst => inst.type && inst.type !== "REF")
        : getEarthStructureInstruments(structure);
    const instrumentPoints = instruments
        .map(instrument => ({ instrument, latLon: getInstrumentLatLon(instrument) }))
        .filter(item => item.latLon);

    const structureCoordinate = isOverview ? null : getPreferredStructureCoordinate(structure);
    const projection = getMasterEarthProjection();

    const baseLayer = document.getElementById("earth-base-layer");
    const kmlLayer = document.getElementById("earth-kml-layer");
    const overlayLayer = document.getElementById("earth-overlay-layer");
    const instrumentLayer = document.getElementById("earth-instrument-layer");
    if (kmlLayer) kmlLayer.innerHTML = "";
    if (overlayLayer) overlayLayer.innerHTML = "";
    if (instrumentLayer) instrumentLayer.innerHTML = "";
    if (baseLayer) baseLayer.innerHTML = "";

    const titleEl = document.getElementById("earth-map-title");
    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-earth-americas text-primary"></i> ${isOverview ? "Mapeamento Geral da Mina - KMZ Oficial" : `Integração Google Earth - ${escapeHtml(structure)}`}`;
    }

    if (!isOverview) {
        populateEarthCoordinateEditor(structure);
    } else {
        setTextContent("earth-coordinate-source", "Mapeamento Geral da Mina (ESTRUTURAS GEOTEC.kmz)");
        setTextContent("earth-coordinate-derived", "10 Estruturas Geotécnicas • SIRGAS 2000 / UTM 23S");
    }

    setTextContent(
        "earth-map-source-badge",
        isOverview 
            ? "Mapeamento Completo da Mina" 
            : getManualStructureCoordinate(structure)
                ? "Coordenada manual ativa"
                : layer?.bundled
                    ? "KMZ Oficial ESTRUTURAS GEOTEC"
                    : "Referência KMZ ativa"
    );

    // Render Master Base and All Structure Pins
    renderAllEarthStructures(structure, projection);
    if (!isOverview && layer) {
        renderEarthLayer(layer, projection);
    }
    renderEarthInstrumentPins(instrumentPoints, projection);

    // Live GPS marker if captured
    if (earthMapView.liveGps) {
        renderEarthLiveGpsPin(earthMapView.liveGps, projection);
    }

    const sourceText = isOverview
        ? `Base Geral ESTRUTURAS GEOTEC.kmz: 10 estruturas geotécnicas mapeadas e ${instrumentPoints.length} instrumentos ativos com SIRGAS 2000 / UTM 23S.`
        : `Estrutura ${structure}: ${structureCoordinate ? "Coordenada ativa" : "Sem coordenada"} • ${instrumentPoints.length} instrumento(s) plotado(s).`;
    setTextContent("earth-map-status", sourceText);

    renderEarthAnomalyPanel(isOverview ? (getGeospatialStructureList()[0] || "PDE 1") : structure, earthMapView.focusedInstrumentId);
    renderEarthStructureChips();
    initInteractiveMapPanZoom();
}

function populateMapPins() {
    renderEarthMapPanel();
}

// --- 2. NAVIGATION AND INTERACTION ---
function switchTab(tabId) {
    // Hide all panels
    const panes = document.querySelectorAll(".tab-pane");
    panes.forEach(pane => pane.classList.remove("active"));
    
    // Deactivate all navigation items
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => item.classList.remove("active"));

    // Activate selected
    const activePane = document.getElementById(`tab-${tabId}`);
    if (activePane) activePane.classList.add("active");

    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) activeNav.classList.add("active");

    // Dynamic header subtitle adjustments
    const titleEl = document.getElementById("page-title");
    const subEl = document.getElementById("page-subtitle");
    
    if (tabId === 'dashboard') {
        titleEl.textContent = "Visão geral";
        subEl.textContent = "Cronograma operacional de campo, atividades diárias e auditoria de inspeções.";
        updateDashboardKPIs();
        renderDailyOperationalSchedule();
        renderMiniInspectionsDashboard();
        renderSurveyAnomalies();
    } else if (tabId === 'readings') {
        titleEl.textContent = "Coletas";
        subEl.textContent = "Fluxo guiado para leituras de instrumentos com evidências digitais.";
        loadInstrumentDetails();
    } else if (tabId === 'inspections') {
        titleEl.textContent = "Checklists";
        subEl.textContent = "Modelos de inspeção com itens, risco, GPS e assinatura.";
        updateChecklistProgress();
    } else if (tabId === 'history') {
        titleEl.textContent = "Dados";
        subEl.textContent = "Base unificada de leituras, vazões e inspeções para exportação.";
        renderHistoryTable();
    } else if (tabId === 'reports') {
        titleEl.textContent = "Relatórios";
        subEl.textContent = "Pacotes auditáveis para relatórios, evidências e indicadores de gestão.";
        renderReportsPanel();
    } else if (tabId === 'indicators') {
        titleEl.textContent = "Indicadores";
        subEl.textContent = "Dashboards dinâmicos por estrutura, tipo de dado, status e período.";
        renderIndicatorsDashboard();
    } else if (tabId === 'geoview') {
        titleEl.textContent = "GeoView";
        subEl.textContent = "Dashboards corporativos, arquivos locais e mapas por estrutura em uma visao operacional.";
        renderGeoViewPanel();
    } else if (tabId === 'georef') {
        titleEl.textContent = "Georreferenciamento";
        subEl.textContent = "Mapeamento GIS interativo, coordenadas SIRGAS 2000, UTM 23S e rastreamento de campo.";
        renderGeorefPanel();
        if (georefMap) {
            setTimeout(() => {
                georefMap.invalidateSize();
                selectGeorefStructure(geoSpatialState.selectedStructure || "Toda a Mina (Visão Geral)");
            }, 100);
        }
    } else if (tabId === 'release') {
        titleEl.textContent = "Liberação";
        subEl.textContent = "Controle local temporário para autorizar exportações e sincronização simulada.";
        renderReleasePanel();
    } else if (tabId === 'sync') {
        titleEl.textContent = "Nuvem";
        subEl.textContent = "Fila offline e envio seguro para a base corporativa.";
        renderSyncQueue();
    }
}

// Map selection handler
function selectInstrumentFromMap(instId) {
    // Navigate to readings tab
    switchTab('readings');
    
    // Select instrument in select option
    const select = document.getElementById("instrument-select");
    select.value = instId;
    
    // Trigger load of details and chart
    loadInstrumentDetails();
}

// Toggle outdoor readability/contrast mode
function toggleContrastMode() {
    isHighContrast = !isHighContrast;
    if (isHighContrast) {
        document.body.classList.add("high-contrast");
    } else {
        document.body.classList.remove("high-contrast");
    }
}

// --- 3. DYNAMIC CHARTS AND GRAPHICS ---
function renderInstrumentChart(instId) {
    const ctx = document.getElementById('instrumentChart').getContext('2d');
    const inst = INSTRUMENT_REGISTRY[instId];
    if (!inst) return;

    // Get historical dataset sorted by date
    const localData = readingsDatabase
        .filter(r => r.instrumentId === instId)
        .filter(r => Number.isFinite(Number(r.value)))
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    if (localData.length === 0) {
        if (instrumentChart) {
            instrumentChart.destroy();
            instrumentChart = null;
        }
        document.getElementById("chart-fallback").style.display = "flex";
        document.getElementById("chart-legend-box").style.display = "none";
        document.getElementById("active-chart-label").textContent = `${inst.name} - Sem histórico`;
        return;
    }

    const labels = localData.map(r => {
        const d = new Date(r.dateTime);
        return `${d.getDate()}/${d.getMonth()+1}`;
    });
    const values = localData.map(r => Number(r.value));

    // Destroy existing chart to prevent memory leaks and overlapping charts
    if (instrumentChart) {
        instrumentChart.destroy();
    }

    document.getElementById("chart-fallback").style.display = "none";
    document.getElementById("chart-legend-box").style.display = "flex";

    // Setup color system based on contrast mode
    const textCol = isHighContrast ? '#000000' : '#94a3b8';
    const gridCol = isHighContrast ? '#e2e8f0' : 'rgba(255,255,255,0.06)';

    // Dynamic Thresholds
    const latestEvaluation = getReadingEvaluation(inst, values[values.length - 1]);
    const criticalVal = Number(latestEvaluation.criticalValue || inst.limiteCritico || inst.profMax || Math.max(...values));
    const warningVal = Number(latestEvaluation.warningValue || criticalVal * 0.8);

    instrumentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Nível D'água (m - boca)`,
                    data: values,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.15)',
                    borderWidth: 3,
                    tension: 0.2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#2563eb',
                    fill: true
                },
                {
                    label: latestEvaluation.mode === "elevation" ? 'Faixa de atenção por cota' : 'Faixa de Atenção (80%)',
                    data: Array(labels.length).fill(warningVal),
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: latestEvaluation.mode === "elevation" ? 'Cota crítica convertida em leitura' : 'Critério crítico (100%)',
                    data: Array(labels.length).fill(criticalVal),
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            responsiveAnimationDuration: 0,
            scales: {
                y: {
                    grid: { color: gridCol },
                    ticks: { color: textCol },
                    title: {
                        display: true,
                        text: 'Profundidade medida (m)',
                        color: textCol,
                        font: { size: 12, weight: 600 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textCol }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: textCol }
                }
            }
        }
    });

    document.getElementById("active-chart-label").textContent = `${inst.name} - Histórico`;
}

// --- 4. FORM LOGIC & FIELD VALIDATIONS ---
function loadInstrumentDetails() {
    const instId = document.getElementById("instrument-select").value;
    const metaBox = document.getElementById("inst-meta");
    
    if (!instId) {
        metaBox.style.display = "none";
        document.getElementById("chart-fallback").style.display = "flex";
        document.getElementById("chart-legend-box").style.display = "none";
        if (instrumentChart) {
            instrumentChart.destroy();
            instrumentChart = null;
        }
        document.getElementById("active-chart-label").textContent = "Nenhum Instrumento Selecionado";
        return;
    }

    const inst = INSTRUMENT_REGISTRY[instId];
    metaBox.style.display = "grid";

    // Set parameters
    document.getElementById("meta-cota").textContent = formatNumber(inst.cotaBoca);
    document.getElementById("meta-prof").textContent = formatNumber(inst.profMax);

    // Get last reading
    const readings = readingsDatabase
        .filter(r => r.instrumentId === instId)
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    if (readings.length > 0) {
        const last = readings[readings.length - 1];
        const lastDate = new Date(last.dateTime);
        document.getElementById("meta-last").textContent = `${formatNumber(last.value)}m (${lastDate.getDate()}/${lastDate.getMonth()+1})`;
    } else {
        document.getElementById("meta-last").textContent = "Sem leituras";
    }

    // Render historical chart
    renderInstrumentChart(instId);
    validateInputReading();
}

// Dynamic field validation - alerts user instantly in field if reading is abnormal
function validateInputReading() {
    const instId = document.getElementById("instrument-select").value;
    const valueInput = document.getElementById("reading-value").value;
    const alertBox = document.getElementById("form-validation-alert");
    
    if (!instId || !valueInput) {
        alertBox.style.display = "none";
        return;
    }

    const inst = INSTRUMENT_REGISTRY[instId];
    const value = parseFloat(valueInput);
    const evaluation = getReadingEvaluation(inst, value);
    const criticalValue = Number(evaluation.criticalValue || inst.limiteCritico || inst.profMax || 0);
    if (!Number.isFinite(criticalValue) || criticalValue <= 0) {
        alertBox.style.display = "none";
        return;
    }

    if (evaluation.status === "Crítico") {
        alertBox.style.display = "flex";
        alertBox.className = "validation-warning critical-alert";
        if (evaluation.mode === "elevation") {
            alertBox.querySelector("p").innerHTML = `A leitura de <strong>${value.toFixed(2)}m</strong> indica cota d'água de <strong>${formatNumber(evaluation.measuredElevation)}m</strong>, acima da cota crítica cadastrada. É necessário incluir foto de comprovação.`;
        } else {
            alertBox.querySelector("p").innerHTML = `A leitura de <strong>${value.toFixed(2)}m</strong> excede o limite cadastrado de <strong>${formatNumber(inst.limiteCritico)}m</strong>! É necessário incluir foto de comprovação.`;
        }
    } else if (evaluation.status === "Atenção") {
        alertBox.style.display = "flex";
        alertBox.className = "validation-warning warning-alert";
        if (evaluation.mode === "elevation") {
            alertBox.querySelector("p").innerHTML = `A leitura de <strong>${value.toFixed(2)}m</strong> indica cota d'água de <strong>${formatNumber(evaluation.measuredElevation)}m</strong>, dentro da faixa de atenção da barragem.`;
        } else {
            alertBox.querySelector("p").innerHTML = `A leitura de <strong>${value.toFixed(2)}m</strong> está na faixa de atenção (>80% do limite). Redobre os cuidados de leitura.`;
        }
    } else {
        alertBox.style.display = "none";
    }
}

// Simulates rugged tablet camera capture
function simulatePhotoUpload() {
    const textEl = document.getElementById("photo-upload-text");
    const previewEl = document.getElementById("uploaded-photo-preview");
    
    textEl.textContent = "Processando foto geotécnica...";
    
    setTimeout(() => {
        textEl.textContent = "Foto carregada com sucesso! ✔️";
        previewEl.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100' viewBox='0 0 200 100'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='11'>SIMULAÇÃO: Boca do Tubo PZ - OK</text></svg>";
        previewEl.style.display = "block";
    }, 800);
}

function simulatePhotoUpload() {
    const fileInput = document.getElementById("reading-photo-file");
    if (!fileInput) return;
    fileInput.click();
}

function handleReadingPhotoFile(file) {
    const textEl = document.getElementById("photo-upload-text");
    const previewEl = document.getElementById("uploaded-photo-preview");
    if (!file || !textEl || !previewEl) return;

    const previewUrl = URL.createObjectURL(file);
    previewEl.onload = () => URL.revokeObjectURL(previewUrl);
    previewEl.src = previewUrl;
    previewEl.style.display = "block";
    textEl.textContent = `Foto anexada: ${file.name}`;
    readingPhotoEvidence = {
        name: file.name,
        size: file.size,
        type: file.type || "image",
        capturedAt: new Date().toISOString(),
        dataUrl: ""
    };
    readFileAsDataUrl(file, dataUrl => {
        if (readingPhotoEvidence?.name === file.name && readingPhotoEvidence?.size === file.size) {
            readingPhotoEvidence.dataUrl = dataUrl;
        }
    });
    showToast("Foto anexada a leitura.");
}

function initializeFieldFileInputs() {
    const readingInput = document.getElementById("reading-photo-file");
    if (readingInput && readingInput.dataset.bound !== "true") {
        readingInput.addEventListener("change", event => {
            handleReadingPhotoFile(event.target.files?.[0]);
            event.target.value = "";
        });
        readingInput.dataset.bound = "true";
    }
}

function simulateGeoLocation(scope) {
    captureGeolocation(scope);
}

function simulateSignature(scope) {
    const statusEl = document.getElementById(`${scope}-signature-status`);
    if (!statusEl) return;

    statusEl.textContent = "Assinado digitalmente";
    statusEl.closest(".evidence-action")?.classList.add("done");
    if (scope === "vehicle") vehicleSignatureCollected = true;
    showToast("Assinatura digital anexada.");
}

function resetEvidence(scope) {
    const gps = document.getElementById(`${scope}-gps-status`);
    const signature = document.getElementById(`${scope}-signature-status`);
    if (gps) gps.textContent = "Aguardando GPS";
    if (signature) signature.textContent = "Não coletada";
    if (scope === "reading" || scope === "inspection" || scope === "vehicle") {
        geoEvidenceState[scope] = null;
        renderGeoEvidence(scope);
    }

    document
        .querySelectorAll(`#${scope === "reading" ? "reading" : scope === "vehicle" ? "vehicle-checklist" : "inspection"}-form .evidence-action`)
        .forEach(action => action.classList.remove("done", "geo-low-accuracy"));
}

const SURVEY_ANOMALIES = [
    {
        group: "Condições estruturais",
        id: "abatimento",
        title: "Evidência de Abatimento",
        description: "Afundamentos, depressões ou movimentações localizadas.",
        placeholder: "Local, extensão e provável causa do abatimento"
    },
    {
        group: "Condições estruturais",
        id: "erosoes",
        title: "Evidência de Erosões Superficiais",
        description: "Ravinas, sulcos, carreamento superficial ou perda de proteção.",
        placeholder: "Local e dimensão aproximada da erosão"
    },
    {
        group: "Condições estruturais",
        id: "recalque",
        title: "Evidência de Recalque",
        description: "Degraus, desníveis ou deformações compatíveis com recalque.",
        placeholder: "Local, altura do degrau/desnível e extensão"
    },
    {
        group: "Condições estruturais",
        id: "saturacao",
        title: "Evidência de Saturação/Surgência",
        description: "Umidade, surgência, percolação ou água turva com finos.",
        placeholder: "Localização, vazão estimada e coloração da água"
    },
    {
        group: "Condições estruturais",
        id: "trincas",
        title: "Evidência de Trincas",
        description: "Fissuras, trincas longitudinais, transversais ou em meia-lua.",
        placeholder: "Abertura (mm), extensão e orientação da trinca"
    },
    {
        group: "Drenagem superficial",
        id: "drenagem_superficial",
        title: "Drenagem Superficial",
        description: "Presença e funcionamento dos dispositivos de drenagem superficial.",
        placeholder: "Descreva o ponto, condição e impacto observado"
    },
    {
        group: "Drenagem superficial",
        id: "obstrucao",
        title: "Obstrução",
        description: "Obstrução por sedimentos, vegetação, material carreado ou outros.",
        placeholder: "Informe o tipo de obstrução e trecho afetado"
    },
    {
        group: "Drenagem interna",
        id: "alteracao_vazao",
        title: "Alteração da Vazão",
        description: "Mudança relevante na vazão ou no comportamento do fluxo.",
        placeholder: "Informe vazão observada e comparação com a rotina"
    },
    {
        group: "Drenagem interna",
        id: "assoreamento_dreno",
        title: "Assoreamento na Saída do Dreno",
        description: "Acúmulo de sedimentos na saída do sistema de drenagem.",
        placeholder: "Local, extensão e volume aparente de assoreamento"
    },
    {
        group: "Drenagem interna",
        id: "carreamento_solidos",
        title: "Carreamento de Sólidos",
        description: "Presença de finos, sólidos suspensos ou material carreado pela água.",
        placeholder: "Cor da água, quantidade de sólidos e ponto de ocorrência"
    },
    {
        group: "Drenagem interna",
        id: "vegetacao_dreno",
        title: "Presença de Vegetação",
        description: "Vegetação interferindo nos drenos, canaletas ou saídas de fluxo.",
        placeholder: "Trecho afetado e nível de obstrução"
    },
    {
        group: "Estado de conservação",
        id: "percolacao_ec2",
        title: "Percolação (EC2)",
        description: "Fluxos, infiltrações ou umidade associada à condição de conservação.",
        placeholder: "Local da percolação e característica do fluxo"
    },
    {
        group: "Estado de conservação",
        id: "deformacao_recalques_ec3",
        title: "Deformação e Recalques (EC3)",
        description: "Deformações, recalques ou deslocamentos observados em campo.",
        placeholder: "Descreva evidência, dimensão e evolução"
    },
    {
        group: "Estado de conservação",
        id: "deterioracao_taludes_ec4",
        title: "Deterioração dos Taludes/Paramentos (EC4)",
        description: "Desplacamentos, perda de proteção, erosões ou deterioração geral.",
        placeholder: "Talude/paramento afetado e condição observada"
    },
    {
        group: "Acessos",
        id: "condicao_acesso",
        title: "Condição das Vias de Acesso",
        description: "Verifica trafegabilidade, erosões, atoleiros, obstáculos ou perda de plataforma.",
        placeholder: "Trecho afetado, extensão e restrição observada"
    },
    {
        group: "Acessos",
        id: "sinalizacao_acesso",
        title: "Sinalização e Identificação",
        description: "Verifica placas, marcos, isolamento, rotas e identificação da estrutura.",
        placeholder: "Informe a sinalização ausente, danificada ou insuficiente"
    },
    {
        group: "Acessos",
        id: "seguranca_acesso",
        title: "Segurança do Acesso",
        description: "Verifica guarda-corpo, iluminação, taludes laterais e condições para circulação segura.",
        placeholder: "Descreva o risco de acesso e a ação imediata necessária"
    }
];

const SURVEY_ANOMALY_IDS = SURVEY_ANOMALIES.map(item => item.id);

function getInspectionTemplateForGroup(group = "") {
    const normalized = normalizeComparable(group);
    if (normalized.includes("drenagem")) return "drenagem";
    if (normalized.includes("acesso")) return "acessos";
    return "estabilidade";
}

function getActiveInspectionAnomalies() {
    return SURVEY_ANOMALIES.filter(anomaly => getInspectionTemplateForGroup(anomaly.group) === inspectionTemplate);
}

function setInspectionTemplate(template) {
    const allowed = ["estabilidade", "drenagem", "acessos"];
    inspectionTemplate = allowed.includes(template) ? template : "estabilidade";
    document.querySelectorAll("[data-inspection-template]").forEach(button => {
        const active = button.dataset.inspectionTemplate === inspectionTemplate;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-anomaly-template]").forEach(element => {
        const active = element.dataset.anomalyTemplate === inspectionTemplate;
        element.hidden = !active;
        element.querySelectorAll("input, select, textarea, button").forEach(control => {
            control.disabled = !active;
        });
        const requiredRadio = element.querySelector('input[type="radio"][value="Sim"]');
        if (requiredRadio) requiredRadio.required = active;
    });
    document.querySelectorAll("[data-anomaly-group-template]").forEach(group => {
        group.hidden = group.dataset.anomalyGroupTemplate !== inspectionTemplate;
    });
    const labels = {
        estabilidade: "Coleta isolada de estabilidade selecionada.",
        drenagem: "Coleta isolada de drenagem selecionada.",
        acessos: "Coleta isolada das condições de acesso selecionada."
    };
    setTextContent("inspection-template-context", labels[inspectionTemplate]);
    updateChecklistProgress();
}

function renderSurveyAnomalies() {
    const container = document.getElementById("anomaly-matrix");
    if (!container || container.dataset.rendered === "true") return;

    const grouped = SURVEY_ANOMALIES.reduce((acc, anomaly) => {
        if (!acc[anomaly.group]) acc[anomaly.group] = [];
        acc[anomaly.group].push(anomaly);
        return acc;
    }, {});

    container.innerHTML = `
        <div class="survey-anomaly-head">
            <span>Condição observada</span>
            <span>Resposta</span>
        </div>
        ${Object.entries(grouped).map(([group, anomalies]) => `
            <div class="survey-anomaly-group" data-anomaly-group-template="${getInspectionTemplateForGroup(group)}">${group}</div>
            ${anomalies.map(anomaly => `
                <fieldset class="survey-anomaly-item" data-anomaly="${anomaly.id}" data-anomaly-template="${getInspectionTemplateForGroup(anomaly.group)}">
                    <legend>
                        <strong>${anomaly.title}</strong>
                        <small>${anomaly.description}</small>
                    </legend>
                    <div class="survey-choice-group" role="radiogroup" aria-label="${anomaly.title}">
                        <label class="survey-choice">
                            <input type="radio" name="anomalia-${anomaly.id}" value="Sim" onchange="handleAnomalyChoice('${anomaly.id}')" required>
                            <span>Sim</span>
                        </label>
                        <label class="survey-choice">
                            <input type="radio" name="anomalia-${anomaly.id}" value="Não" onchange="handleAnomalyChoice('${anomaly.id}')">
                            <span>Não</span>
                        </label>
                    </div>
                    <div class="anomaly-detail" id="detail-${anomaly.id}" style="display:none;">
                        <input type="text" class="form-control mt-2" placeholder="${anomaly.placeholder}">
                        <select class="form-control mt-2">
                            <option value="Baixa">Baixa - monitorar na próxima rotina</option>
                            <option value="Media">Média - exige acompanhamento de evolução</option>
                            <option value="Alta">Alta - comunicar engenharia geotécnica</option>
                        </select>
                        <input type="file" id="anomaly-photo-file-${anomaly.id}" class="sr-only-file" accept="image/*" capture="environment" onchange="handleAnomalyPhotoFile('${anomaly.id}', this.files && this.files[0]); this.value = '';">
                        <button type="button" class="anomaly-photo-action" onclick="openAnomalyPhotoPicker('${anomaly.id}')">
                            <i class="fa-solid fa-camera"></i>
                            <span>
                                <strong>Registrar foto da anomalia</strong>
                                <small id="anomaly-photo-status-${anomaly.id}">Nenhuma foto registrada</small>
                            </span>
                        </button>
                        <div class="anomaly-photo-preview" id="anomaly-photo-preview-${anomaly.id}" style="display:none;">
                            <i class="fa-solid fa-image"></i>
                            <span>Foto anexada à evidência</span>
                        </div>
                    </div>
                </fieldset>
            `).join("")}
        `).join("")}
    `;
    container.dataset.rendered = "true";
    setInspectionTemplate(inspectionTemplate);
}

function getAnomalyValue(anomalyId) {
    return document.querySelector(`input[name="anomalia-${anomalyId}"]:checked`)?.value || "";
}

function getAnomalyDetails(anomalyId) {
    const detailEl = document.getElementById(`detail-${anomalyId}`);
    const previewEl = document.getElementById(`anomaly-photo-preview-${anomalyId}`);
    return {
        resposta: getAnomalyValue(anomalyId),
        descricao: detailEl?.querySelector("input")?.value || "",
        severidade: detailEl?.querySelector("select")?.value || "",
        fotoRegistrada: previewEl?.style.display === "flex",
        fotoArquivo: previewEl?.dataset.fileName || "",
        fotoTamanho: Number(previewEl?.dataset.fileSize || 0),
        fotoDataUrl: previewEl?.dataset.dataUrl || ""
    };
}

function buildAnomalyResponses() {
    return getActiveInspectionAnomalies().reduce((acc, anomaly) => {
        const anomalyId = anomaly.id;
        acc[anomalyId] = getAnomalyDetails(anomalyId);
        return acc;
    }, {});
}

function handleAnomalyChoice(anomalyId) {
    const answer = getAnomalyValue(anomalyId);
    const row = document.querySelector(`.survey-anomaly-item[data-anomaly="${anomalyId}"]`);
    const detail = document.getElementById(`detail-${anomalyId}`);

    if (row) {
        row.classList.toggle("answered", Boolean(answer));
        row.classList.toggle("positive", answer === "Sim");
    }

    if (detail) {
        detail.style.display = answer === "Sim" ? "grid" : "none";
    }

    updateChecklistProgress();
}

function simulateAnomalyPhoto(anomalyId) {
    const statusEl = document.getElementById(`anomaly-photo-status-${anomalyId}`);
    const previewEl = document.getElementById(`anomaly-photo-preview-${anomalyId}`);
    const row = document.querySelector(`.survey-anomaly-item[data-anomaly="${anomalyId}"]`);
    if (!statusEl || !previewEl) return;

    statusEl.textContent = "Abrindo câmera...";
    setTimeout(() => {
        statusEl.textContent = "Foto registrada agora";
        previewEl.style.display = "flex";
        row?.classList.add("with-photo");
        showToast("Foto anexada à anomalia.");
    }, 650);
}

function openAnomalyPhotoPicker(anomalyId) {
    const input = document.getElementById(`anomaly-photo-file-${anomalyId}`);
    if (!input) return;
    input.click();
}

function handleAnomalyPhotoFile(anomalyId, file) {
    const statusEl = document.getElementById(`anomaly-photo-status-${anomalyId}`);
    const previewEl = document.getElementById(`anomaly-photo-preview-${anomalyId}`);
    const row = document.querySelector(`.survey-anomaly-item[data-anomaly="${anomalyId}"]`);
    if (!file || !statusEl || !previewEl) return;

    statusEl.textContent = `Foto anexada: ${file.name}`;
    previewEl.style.display = "flex";
    previewEl.dataset.fileName = file.name;
    previewEl.dataset.fileSize = String(file.size || 0);
    previewEl.dataset.dataUrl = "";
    previewEl.innerHTML = `
        <i class="fa-solid fa-image"></i>
        <span>${file.name}</span>
    `;
    readFileAsDataUrl(file, dataUrl => {
        if (previewEl.dataset.fileName === file.name) {
            previewEl.dataset.dataUrl = dataUrl;
        }
    });
    row?.classList.add("with-photo");
    showToast("Foto anexada a anomalia.");
}

function updateChecklistProgress() {
    const activeIds = getActiveInspectionAnomalies().map(anomaly => anomaly.id);
    const total = activeIds.length;
    const answers = activeIds.map(getAnomalyValue).filter(Boolean);
    const answeredCount = answers.length;
    const positiveCount = answers.filter(answer => answer === "Sim").length;
    const percent = total ? Math.round((answeredCount / total) * 100) : 0;

    const textEl = document.getElementById("checklist-progress-text");
    const fillEl = document.getElementById("checklist-progress-fill");
    if (textEl) {
        textEl.textContent = positiveCount > 0
            ? `${answeredCount} de ${total} itens respondidos · ${positiveCount} evidências positivas`
            : `${answeredCount} de ${total} itens respondidos`;
    }
    if (fillEl) fillEl.style.width = `${percent}%`;
}

function setInspectionCriticality(value) {
    const risk = document.getElementById("ins-risk");
    if (!risk) return;
    if (value === "Alta") risk.value = "Crítico / Emergência";
    else if (value === "Media") risk.value = "Alerta Geotécnico";
    else risk.value = "Atenção Operacional";
}

function syncInspectionCriticalityFromRisk() {
    const risk = document.getElementById("ins-risk")?.value || "";
    const value = risk.includes("Crítico") ? "Alta" : risk.includes("Alerta") ? "Media" : "Baixa";
    const input = document.querySelector(`input[name="inspection-criticality"][value="${value}"]`);
    if (input) input.checked = true;
}

function getInspectionCriticality() {
    return document.querySelector('input[name="inspection-criticality"]:checked')?.value || "Baixa";
}

function toDateTimeLocalValue(date) {
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalValue(value) {
    return value ? new Date(value) : new Date();
}

function formatDateTimeBR(date) {
    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function calculateNextInspectionDate(baseDate, season) {
    const nextDate = new Date(baseDate.getTime());
    if (season === "chuvoso") {
        nextDate.setDate(nextDate.getDate() + 7);
    } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
}

function getInspectionSchedule() {
    const baseInput = document.getElementById("ins-datetime");
    const seasonInput = document.getElementById("ins-season");
    const nextInput = document.getElementById("ins-next-date");
    const alertInput = document.getElementById("ins-alert-enabled");
    const baseDate = fromDateTimeLocalValue(baseInput?.value);
    const season = seasonInput?.value || "seca";
    const nextDate = nextInput?.value ? fromDateTimeLocalValue(nextInput.value) : calculateNextInspectionDate(baseDate, season);
    const alertDate = new Date(nextDate.getTime() - 24 * 60 * 60 * 1000);

    return {
        inspectionDateTime: baseInput?.value || toDateTimeLocalValue(baseDate),
        season,
        frequency: season === "chuvoso" ? "Semanal" : "Mensal",
        nextInspectionDateTime: toDateTimeLocalValue(nextDate),
        alertEnabled: Boolean(alertInput?.checked),
        alertAt: toDateTimeLocalValue(alertDate)
    };
}

function updateInspectionSchedule() {
    const baseInput = document.getElementById("ins-datetime");
    const seasonInput = document.getElementById("ins-season");
    const nextInput = document.getElementById("ins-next-date");
    const alertBox = document.getElementById("inspection-alert-box");
    const alertText = document.getElementById("inspection-alert-text");
    if (!baseInput || !seasonInput || !nextInput || !alertText) return;

    if (!baseInput.value) {
        baseInput.value = toDateTimeLocalValue(new Date());
    }

    const baseDate = fromDateTimeLocalValue(baseInput.value);
    const nextDate = calculateNextInspectionDate(baseDate, seasonInput.value);
    const alertDate = new Date(nextDate.getTime() - 24 * 60 * 60 * 1000);
    nextInput.value = toDateTimeLocalValue(nextDate);

    const alertEnabled = document.getElementById("ins-alert-enabled")?.checked;
    const daysUntilNext = Math.ceil((nextDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    alertBox?.classList.toggle("due-soon", alertEnabled && daysUntilNext <= 1 && daysUntilNext >= 0);
    alertBox?.classList.toggle("disabled", !alertEnabled);

    if (!alertEnabled) {
        alertText.textContent = "Alerta desativado para esta rotina.";
    } else if (daysUntilNext <= 1 && daysUntilNext >= 0) {
        alertText.textContent = `Atenção: próxima inspeção em menos de 1 dia (${formatDateTimeBR(nextDate)}).`;
    } else {
        alertText.textContent = `Alerta será exibido em ${formatDateTimeBR(alertDate)}; próxima inspeção em ${formatDateTimeBR(nextDate)}.`;
    }
}

function initializeInspectionSchedule() {
    const baseInput = document.getElementById("ins-datetime");
    if (baseInput && !baseInput.value) {
        baseInput.value = toDateTimeLocalValue(new Date());
    }
    updateInspectionSchedule();
}

function confirmGeorefForSave(scopeLabel, fix) {
    if (!fix) {
        return window.confirm(`${scopeLabel} ainda nao possui georreferenciamento SIRGAS 2000 capturado. Deseja salvar mesmo assim?`);
    }
    if (Number(fix.accuracyMeters) > GEOREF_MAX_ACCEPTABLE_ACCURACY_M) {
        return window.confirm(`${scopeLabel} possui GPS com baixa precisao (${formatNumber(fix.accuracyMeters, 1)} m). Deseja salvar mantendo este raio de incerteza?`);
    }
    return true;
}

// Saving instrument readings locally (allows offline queueing)
function saveReading(event) {
    event.preventDefault();
    
    const instId = document.getElementById("instrument-select").value;
    const value = parseFloat(document.getElementById("reading-value").value);
    const comment = document.getElementById("reading-comment").value;
    
    if (!instId || isNaN(value)) return;
    if (!confirmGeorefForSave("A leitura", geoEvidenceState.reading)) return;

    const inst = INSTRUMENT_REGISTRY[instId];
    const cotaBoca = Number(inst.cotaBoca);
    const cotaCalculada = Number.isFinite(cotaBoca) ? Number((cotaBoca - value).toFixed(2)) : null;
    const status = getReadingStatus(instId, value);

    const newReading = {
        id: Math.random().toString(36).substr(2, 9),
        source: "campo",
        sourceVersion: SOURCE_DATASET_VERSION,
        instrumentId: instId,
        instrumentCode: inst.code || instId,
        structure: inst.structure || "Estrutura não informada",
        type: inst.type,
        dateTime: new Date().toISOString().substring(0, 16),
        value: value,
        cotaCalculada: cotaCalculada,
        inspector: "Maycon Nascimento (Campo)",
        status: status,
        evidence: {
            gps: document.getElementById("reading-gps-status")?.textContent || "Não informado",
            geolocation: cloneGeorefFix(geoEvidenceState.reading),
            signature: document.getElementById("reading-signature-status")?.textContent || "Não informado",
            photo: document.getElementById("uploaded-photo-preview")?.style.display === "block",
            photoFile: readingPhotoEvidence
        },
        comments: comment || "Leitura de rotina."
    };

    // If offline, queue it! If online, goes straight to client-side DB but marked as unsynced
    if (!isOnline) {
        syncQueue.push({ type: "reading", data: newReading });
        saveToLocalStorage("queue");
        showToast("Conexão offline: Registro enfileirado localmente.");
    } else {
        readingsDatabase.push(newReading);
        saveToLocalStorage("readings");
        // Also save to sync queue as synced for tracking if wanted, or just skip
        showToast("Leitura salva com sucesso!");
    }

    // Reset Form and reload
    resetReadingForm();
    loadInstrumentDetails();
    updateDashboardKPIs();
}

// Reset reading form parameters
function resetReadingForm() {
    document.getElementById("reading-form").reset();
    document.getElementById("inst-meta").style.display = "none";
    document.getElementById("uploaded-photo-preview").style.display = "none";
    document.getElementById("photo-upload-text").textContent = "Toque para registrar foto";
    readingPhotoEvidence = null;
    document.getElementById("form-validation-alert").style.display = "none";
    resetEvidence("reading");
    if (instrumentChart) {
        instrumentChart.destroy();
        instrumentChart = null;
    }
}

// Save stability visual inspections
function toggleAnomalySeverity(anomalyId) {
    handleAnomalyChoice(anomalyId);
}

function saveInspection(event) {
    event.preventDefault();
    
    const structure = document.getElementById("ins-structure").value;
    const weather = document.getElementById("ins-weather").value;
    const risk = document.getElementById("ins-risk").value;
    const comments = document.getElementById("ins-comments").value;
    
    const anomalyResponses = buildAnomalyResponses();
    const schedule = getInspectionSchedule();
    if (!confirmGeorefForSave("A inspeção", geoEvidenceState.inspection)) return;

    const newInspection = {
        id: Math.random().toString(36).substr(2, 9),
        structure: structure,
        dateTime: new Date().toISOString().substring(0, 16),
        weather: weather,
        checklistTemplate: inspectionTemplate,
        anomalias: anomalyResponses,
        schedule: schedule,
        insRisk: risk,
        criticality: getInspectionCriticality(),
        inspector: "Maycon Nascimento (Campo)",
        evidence: {
            gps: document.getElementById("inspection-gps-status")?.textContent || "Não informado",
            geolocation: cloneGeorefFix(geoEvidenceState.inspection),
            signature: document.getElementById("inspection-signature-status")?.textContent || "Não informado"
        },
        comments: comments || "Inspeção visual rotineira executada."
    };

    if (!isOnline) {
        syncQueue.push({ type: "inspection", data: newInspection });
        saveToLocalStorage("queue");
        showToast("Conexão offline: Inspeção visual enfileirada.");
    } else {
        inspectionsDatabase.push(newInspection);
        saveToLocalStorage("inspections");
        showToast("Inspeção visual registrada no banco central.");
    }

    resetInspectionForm();
    updateDashboardKPIs();
}

function resetInspectionForm() {
    document.getElementById("inspection-form").reset();
    const details = document.querySelectorAll(".anomaly-detail");
    details.forEach(d => d.style.display = "none");
    document.querySelectorAll(".survey-anomaly-item").forEach(row => {
        row.classList.remove("answered", "positive", "with-photo");
    });
    document.querySelectorAll(".anomaly-photo-preview").forEach(preview => {
        preview.style.display = "none";
    });
    document.querySelectorAll("[id^='anomaly-photo-status-']").forEach(status => {
        status.textContent = "Nenhuma foto registrada";
    });
    initializeInspectionSchedule();
    setInspectionCriticality("Baixa");
    resetEvidence("inspection");
    setInspectionTemplate(inspectionTemplate);
    updateChecklistProgress();
}

function getLocalDateTimeInputValue(date = new Date()) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

function renderVehicleChecklistGroup(containerId, group, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = items.map((item, index) => `
        <fieldset class="vehicle-check-item" data-vehicle-group="${group}" data-vehicle-item="${item.id}">
            <legend>
                <span>${index + 1}</span>
                <strong>${escapeHtml(item.label)}</strong>
                ${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}
            </legend>
            <div class="vehicle-condition-options" role="radiogroup" aria-label="${escapeHtml(item.label)}">
                <label class="vehicle-condition ok">
                    <input type="radio" name="vehicle-${group}-${item.id}" value="OK" onchange="updateVehicleChecklistSummary()">
                    <span><i class="fa-solid fa-circle-check"></i> OK</span>
                </label>
                <label class="vehicle-condition attention">
                    <input type="radio" name="vehicle-${group}-${item.id}" value="Atenção" onchange="updateVehicleChecklistSummary()">
                    <span><i class="fa-solid fa-triangle-exclamation"></i> Atenção</span>
                </label>
                <label class="vehicle-condition critical">
                    <input type="radio" name="vehicle-${group}-${item.id}" value="Crítico" onchange="updateVehicleChecklistSummary()">
                    <span><i class="fa-solid fa-octagon-exclamation"></i> Crítico</span>
                </label>
            </div>
        </fieldset>
    `).join("");
}

function collectVehicleChecklistGroup(group, items) {
    return items.map(item => {
        const value = document.querySelector(`input[name="vehicle-${group}-${item.id}"]:checked`)?.value || "";
        return {
            id: item.id,
            item: item.label,
            detail: item.detail || "",
            result: value
        };
    });
}

function getVehicleChecklistEvaluation(safety, general) {
    const responses = [...safety, ...general];
    const critical = responses.filter(item => item.result === "Crítico").length;
    const attention = responses.filter(item => item.result === "Atenção").length;
    const answered = responses.filter(item => item.result).length;
    const status = critical > 0 ? "Crítico" : attention > 0 ? "Atenção" : answered === responses.length ? "Liberado" : "Pendente";
    return { critical, attention, answered, total: responses.length, status };
}

function updateVehicleChecklistSummary() {
    const safety = collectVehicleChecklistGroup("safety", VEHICLE_SAFETY_ITEMS);
    const general = collectVehicleChecklistGroup("general", VEHICLE_GENERAL_ITEMS);
    const evaluation = getVehicleChecklistEvaluation(safety, general);
    const safetyAnswered = safety.filter(item => item.result).length;
    const generalAnswered = general.filter(item => item.result).length;

    setTextContent("vehicle-safety-progress", `${safetyAnswered}/${VEHICLE_SAFETY_ITEMS.length}`);
    setTextContent("vehicle-general-progress", `${generalAnswered}/${VEHICLE_GENERAL_ITEMS.length}`);

    document.querySelectorAll(".vehicle-check-item").forEach(item => {
        const checked = item.querySelector("input:checked");
        item.classList.toggle("answered", Boolean(checked));
        item.classList.toggle("attention", checked?.value === "Atenção");
        item.classList.toggle("critical", checked?.value === "Crítico");
    });

    const summary = document.getElementById("vehicle-checklist-summary");
    if (!summary) return evaluation;
    summary.className = `vehicle-checklist-summary mt-3 status-${normalizeComparable(evaluation.status).toLowerCase()}`;
    const message = evaluation.status === "Pendente"
        ? `${evaluation.answered}/${evaluation.total} itens respondidos.`
        : evaluation.status === "Liberado"
            ? "Veículo sem desvios no checklist e apto para liberação."
            : `${evaluation.critical} item(ns) crítico(s) e ${evaluation.attention} em atenção. Registre as evidências e providências.`;
    summary.innerHTML = `<i class="fa-solid ${evaluation.status === "Liberado" ? "fa-circle-check" : "fa-triangle-exclamation"}"></i><span>${escapeHtml(message)}</span>`;
    return evaluation;
}

function updateVehicleSelection() {
    const plate = document.getElementById("vehicle-plate")?.value || "PZB-1G94";
    const vehicle = VEHICLE_CATALOG[plate] || VEHICLE_CATALOG.Outro;
    const image = document.getElementById("vehicle-reference-photo");
    const otherGroup = document.getElementById("vehicle-other-group");
    const otherInput = document.getElementById("vehicle-other");

    setTextContent("vehicle-photo-title", plate);
    setTextContent("vehicle-photo-caption", vehicle.description);
    if (image) {
        image.src = vehicle.photo || "assets/icons/icon-192.png";
        image.classList.toggle("placeholder", !vehicle.photo);
        image.alt = vehicle.photo ? `Veículo de placa ${plate}` : `Imagem pendente para ${plate}`;
    }
    if (otherGroup) otherGroup.hidden = plate !== "Outro";
    if (otherInput) otherInput.required = plate === "Outro";
}

function normalizeVehicleFileList(files) {
    if (!files) return [];
    const list = files instanceof File ? [files] : Array.from(files);
    return list.filter(Boolean).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type || "image",
        capturedAt: new Date().toISOString(),
        dataUrl: ""
    }));
}

function handleVehicleEvidenceFile(scope, files) {
    const metadata = normalizeVehicleFileList(files);
    vehicleEvidenceState[scope] = metadata;
    const status = document.getElementById(`vehicle-${scope}-photo-status`);
    if (status) {
        status.textContent = metadata.length
            ? `${metadata.length} arquivo(s) anexado(s)`
            : scope === "panel" ? "Foto obrigatória" : "Nenhuma foto anexada";
    }
    Array.from(files || []).forEach((file, index) => {
        readFileAsDataUrl(file, dataUrl => {
            if (vehicleEvidenceState[scope]?.[index]?.name === file.name) {
                vehicleEvidenceState[scope][index].dataUrl = dataUrl;
            }
        });
    });
    status?.closest(".vehicle-file-action")?.classList.toggle("done", metadata.length > 0);
}

function initializeVehicleChecklist() {
    renderVehicleChecklistGroup("vehicle-safety-items", "safety", VEHICLE_SAFETY_ITEMS);
    renderVehicleChecklistGroup("vehicle-general-items", "general", VEHICLE_GENERAL_ITEMS);
    const dateTime = document.getElementById("vehicle-datetime");
    if (dateTime && !dateTime.value) dateTime.value = getLocalDateTimeInputValue();
    updateVehicleSelection();
    updateVehicleChecklistSummary();
}

function getVehicleInspectionRecord() {
    const safety = collectVehicleChecklistGroup("safety", VEHICLE_SAFETY_ITEMS);
    const general = collectVehicleChecklistGroup("general", VEHICLE_GENERAL_ITEMS);
    const evaluation = getVehicleChecklistEvaluation(safety, general);
    const plate = document.getElementById("vehicle-plate")?.value || "";
    const driver = document.getElementById("vehicle-driver")?.value.trim() || "";
    const sector = document.getElementById("vehicle-sector")?.value || "";
    const otherVehicle = document.getElementById("vehicle-other")?.value.trim() || "";
    const comments = document.getElementById("vehicle-comments")?.value.trim() || "";
    const hasSafetyDeviation = safety.some(item => ["Atenção", "Crítico"].includes(item.result));
    const hasGeneralDeviation = general.some(item => ["Atenção", "Crítico"].includes(item.result));

    if (evaluation.answered !== evaluation.total) {
        showToast("Responda aos 17 itens do checklist veicular.", "warning");
        return null;
    }
    if (!driver || !sector || !plate) {
        showToast("Informe condutor, setor e placa do veículo.", "warning");
        return null;
    }
    if (plate === "Outro" && !otherVehicle) {
        showToast("Identifique a marca, o modelo e a placa do veículo.", "warning");
        return null;
    }
    if (!document.getElementById("vehicle-odometer")?.value) {
        showToast("Informe o hodômetro atual.", "warning");
        return null;
    }
    if (!vehicleEvidenceState.panel.length) {
        showToast("Registre a foto obrigatória do painel.", "warning");
        return null;
    }
    if (hasSafetyDeviation && !vehicleEvidenceState.safety.length) {
        showToast("Anexe fotos dos desvios nos itens de segurança.", "warning");
        return null;
    }
    if (hasGeneralDeviation && !vehicleEvidenceState.general.length) {
        showToast("Anexe fotos dos desvios nas condições gerais.", "warning");
        return null;
    }
    if ((hasSafetyDeviation || hasGeneralDeviation) && !comments) {
        showToast("Descreva os desvios e as providências adotadas.", "warning");
        return null;
    }
    if (!geoEvidenceState.vehicle) {
        showToast("Capture a localização GPS do checklist veicular.", "warning");
        return null;
    }
    if (!vehicleSignatureCollected) {
        showToast("Colete a assinatura do condutor.", "warning");
        return null;
    }

    return {
        id: `VEH-${Date.now().toString(36).toUpperCase()}`,
        source: "Survey123 incorporado",
        sourceForm: cloneData(VEHICLE_SURVEY_SOURCE),
        dateTime: document.getElementById("vehicle-datetime")?.value || getLocalDateTimeInputValue(),
        plate: plate === "Outro" ? otherVehicle : plate,
        plateOption: plate,
        vehicleDescription: VEHICLE_CATALOG[plate]?.description || "Veículo de campo",
        driver,
        sector,
        odometerKm: Number(document.getElementById("vehicle-odometer")?.value),
        safety,
        general,
        status: evaluation.status,
        deviations: evaluation.attention + evaluation.critical,
        criticalItems: evaluation.critical,
        comments: comments || "Checklist concluído sem desvios.",
        evidence: {
            panelPhotos: cloneData(vehicleEvidenceState.panel),
            safetyPhotos: cloneData(vehicleEvidenceState.safety),
            generalPhotos: cloneData(vehicleEvidenceState.general),
            complementaryPhotos: cloneData(vehicleEvidenceState.complementary),
            gps: document.getElementById("vehicle-gps-status")?.textContent || "Não informado",
            geolocation: cloneGeorefFix(geoEvidenceState.vehicle),
            signature: document.getElementById("vehicle-signature-status")?.textContent || "Não coletada"
        },
        inspector: driver
    };
}

function saveVehicleInspection(event) {
    event.preventDefault();
    const record = getVehicleInspectionRecord();
    if (!record) return;

    if (isOnline) {
        vehicleInspectionsDatabase.push(record);
        saveToLocalStorage("vehicle-inspections");
        showToast(`Checklist do veículo ${record.plate} salvo com sucesso.`);
    } else {
        syncQueue.push({ type: "vehicle-inspection", data: record });
        saveToLocalStorage("queue");
        showToast(`Checklist do veículo ${record.plate} salvo na fila offline.`);
    }

    resetVehicleInspectionForm();
    renderReportsPanel();
    updateDashboardKPIs();
}

function resetVehicleInspectionForm() {
    document.getElementById("vehicle-checklist-form")?.reset();
    vehicleEvidenceState = { panel: [], safety: [], general: [], complementary: [] };
    vehicleSignatureCollected = false;
    ["panel", "safety", "general", "complementary"].forEach(scope => {
        const status = document.getElementById(`vehicle-${scope}-photo-status`);
        if (status) {
            status.textContent = scope === "panel"
                ? "Foto obrigatória"
                : scope === "complementary"
                    ? "Opcional"
                    : "Obrigatórias quando houver desvio";
        }
        status?.closest(".vehicle-file-action")?.classList.remove("done");
    });
    resetEvidence("vehicle");
    const dateTime = document.getElementById("vehicle-datetime");
    if (dateTime) dateTime.value = getLocalDateTimeInputValue();
    updateVehicleSelection();
    updateVehicleChecklistSummary();
}

// --- 5. SYNCING AND OFFLINE ENGINE ---
function toggleOnlineStatus() {
    isOnline = !isOnline;
    const indicator = document.getElementById("connection-indicator");
    const statusText = indicator.querySelector(".status-text");

    if (isOnline) {
        indicator.className = "connection-status online";
        statusText.textContent = "Online";
        showToast("Conexão estabelecida com o servidor principal.");
    } else {
        indicator.className = "connection-status offline";
        statusText.textContent = "Offline (Local)";
        showToast("Você entrou em modo Offline. Modificações serão armazenadas localmente.");
    }
    updateSyncBadge();
    if (isOnline) scanCorporateSyncFolder(false);
    else setCorporateSyncStatus("Offline", null, null, "Monitoramento pausado até a conexão retornar.");
}

function updateSyncBadge() {
    const badge = document.getElementById("sync-badge");
    const pendingVal = syncQueue.length;
    badge.textContent = pendingVal;
    const workflowPending = document.getElementById("workflow-pending-sync");
    if (workflowPending) workflowPending.textContent = pendingVal;
    const offlineLabel = document.getElementById("offline-mode-label");
    if (offlineLabel) offlineLabel.textContent = isOnline ? "Sincronização pronta" : "Coleta em modo offline";
    const queueStep = document.getElementById("pipeline-queue-step");
    const cloudStep = document.getElementById("pipeline-cloud-step");
    if (queueStep) queueStep.classList.toggle("active", pendingVal > 0);
    if (cloudStep) cloudStep.classList.toggle("complete", pendingVal === 0 && isOnline);
    
    // KPI updating
    document.getElementById("kpi-pending-sync").textContent = pendingVal;
    const descEl = document.getElementById("kpi-sync-desc");
    if (pendingVal > 0) {
        descEl.textContent = `Aguardando conexão de rede para sync.`;
        descEl.className = "text-warning";
    } else {
        descEl.textContent = "Todos os dados integrados ao servidor";
        descEl.className = "text-secondary";
    }
}

function renderSyncQueue() {
    const container = document.getElementById("sync-queue-list");
    const titleEl = document.getElementById("sync-status-title");
    const descEl = document.getElementById("sync-status-desc");

    if (syncQueue.length === 0) {
        container.innerHTML = `<div class="text-center text-secondary p-4">Fila de upload vazia. Não há dados pendentes.</div>`;
        titleEl.textContent = "Nenhum Dado Pendente";
        descEl.textContent = "Todas as inspeções de campo e leituras estão sincronizadas.";
        return;
    }

    titleEl.textContent = `${syncQueue.length} Registros Pendentes`;
    descEl.textContent = "Pronto para descarregar os dados locais no banco corporativo central.";

    container.innerHTML = "";
    syncQueue.forEach((item, idx) => {
        const itemEl = document.createElement("div");
        itemEl.className = "sync-list-item";
        
        let labelText = "";
        let icon = "";
        if (item.type === "reading") {
            labelText = `Leitura PZ/INA - ${item.data.instrumentCode || item.data.instrumentId}: ${formatNumber(item.data.value)}m`;
            icon = `<i class="fa-solid fa-gauge text-blue"></i>`;
        } else if (item.type === "vehicle-inspection") {
            labelText = `Checklist Veicular - ${item.data.plate}: ${item.data.status}`;
            icon = `<i class="fa-solid fa-car-side text-success"></i>`;
        } else {
            labelText = `Inspeção - ${item.data.structure}: ${item.data.insRisk}`;
            icon = `<i class="fa-solid fa-clipboard text-purple"></i>`;
        }

        itemEl.innerHTML = `
            <div class="flex gap-2 align-center">
                ${icon}
                <span>${labelText}</span>
            </div>
            <span class="badge badge-outline">Aguardando</span>
        `;
        container.appendChild(itemEl);
    });
}

function performSync() {
    if (!isOnline) {
        showToast("Impossível sincronizar em modo Offline! Ligue a conexão primeiro.", "danger");
        return;
    }

    if (syncQueue.length === 0) {
        showToast("Fila de sincronização está vazia.");
        return;
    }

    if (!getActiveRelease()) {
        showToast("Gere uma liberação local ativa antes de simular a sincronização.", "warning");
        switchTab("release");
        return;
    }

    const spinner = document.getElementById("sync-spinner");
    spinner.classList.add("syncing");
    document.getElementById("btn-sync-action").disabled = true;

    // Simulate standard network upload with interval progress
    setTimeout(() => {
        // Drain queue into actual database
        syncQueue.forEach(item => {
            if (item.type === "reading") {
                readingsDatabase.push(item.data);
            } else if (item.type === "inspection") {
                inspectionsDatabase.push(item.data);
            } else if (item.type === "vehicle-inspection") {
                vehicleInspectionsDatabase.push(item.data);
            }
        });

        // Save and reset
        saveToLocalStorage("readings");
        saveToLocalStorage("inspections");
        saveToLocalStorage("vehicle-inspections");
        
        syncQueue = [];
        saveToLocalStorage("queue");

        spinner.classList.remove("syncing");
        document.getElementById("btn-sync-action").disabled = false;
        
        showToast("Sincronização corporativa efetuada com absoluto sucesso!");
        renderSyncQueue();
        updateDashboardKPIs();
    }, 2500);
}

// --- 6. CENTRAL DATA HUB / EXPORTS ---
function renderHistoryTable() {
    const tbody = document.getElementById("history-table-body");
    const filter = document.getElementById("filter-type").value;
    tbody.innerHTML = "";

    let rows = [];

    // Compile readings
    if (filter === "all" || filter === "pz" || filter === "ina" || filter === "na") {
        readingsDatabase.forEach(r => {
            if (filter === "pz" && r.type !== "PZ") return;
            if (filter === "ina" && r.type !== "INA") return;
            if (filter === "na" && r.type !== "NA") return;
            
            const inst = INSTRUMENT_REGISTRY[r.instrumentId] || {};
            const d = new Date(r.dateTime);
            const isWaterLevel = r.type === "NA";
            
            rows.push({
                element: r.instrumentCode || inst.code || r.instrumentId,
                type: getTypeLabel(r.type),
                dateTime: `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`,
                valueText: isWaterLevel ? `Cota ${formatNumber(r.value)}m` : `${formatNumber(r.value)}m (Boca)`,
                cota: r.cotaCalculada === null || r.cotaCalculada === undefined ? "-" : `${formatNumber(r.cotaCalculada)}m`,
                inspector: r.inspector,
                status: r.status,
                synced: true, // Mocked as synced
                originalData: r
            });
        });
    }

    // Compile flow readings
    if (filter === "all" || filter === "mv") {
        flowReadingsDatabase.forEach(r => {
            const inst = INSTRUMENT_REGISTRY[r.instrumentId] || {};
            const d = new Date(r.dateTime);
            const flowText = r.flowM3s !== null && r.flowM3s !== undefined
                ? `Q ${formatNumber(r.flowM3s, 4)} m³/s`
                : `${formatNumber(r.litersPerSecond, 3)} L/s`;

            rows.push({
                element: r.instrumentCode || inst.code || r.instrumentId,
                type: "Medidor de Vazão",
                dateTime: `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`,
                valueText: flowText,
                cota: r.h === null || r.h === undefined ? "-" : `H ${formatNumber(r.h)}m`,
                inspector: r.inspector,
                status: r.status,
                synced: true,
                originalData: r
            });
        });
    }

    // Compile inspections
    if (filter === "all" || filter === "ins") {
        inspectionsDatabase.forEach(i => {
            const d = new Date(i.dateTime);
            rows.push({
                element: i.structure,
                type: "Inspeção Visual",
                dateTime: `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`,
                valueText: i.insRisk,
                cota: "-",
                inspector: i.inspector,
                status: i.insRisk === "Sem Anomalias Significativas" ? "Normal" : 
                        i.insRisk === "Atenção Operacional" ? "Atenção" : "Crítico",
                synced: true,
                originalData: i
            });
        });
    }

    if (filter === "all" || filter === "veh") {
        vehicleInspectionsDatabase.forEach(item => {
            const date = new Date(item.dateTime);
            rows.push({
                element: item.plate,
                type: "Checklist Veicular",
                dateTime: `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
                valueText: `${item.status} · ${Number(item.odometerKm || 0).toLocaleString("pt-BR")} km`,
                cota: item.sector || "-",
                inspector: item.driver || item.inspector || "-",
                status: item.status === "Liberado" ? "Normal" : item.status,
                synced: true,
                originalData: item
            });
        });
    }

    // Sort by Date descending
    rows.sort((a, b) => new Date(b.originalData.dateTime) - new Date(a.originalData.dateTime));

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-secondary">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement("tr");
        
        let statusBadge = "";
        const statusClass = getStatusClass(row.status);
        if (statusClass === "normal") statusBadge = `<span class="badge badge-success">Estável</span>`;
        else if (statusClass === "warning") statusBadge = `<span class="badge badge-warning">Atenção</span>`;
        else statusBadge = `<span class="badge badge-danger">Crítico</span>`;

        tr.innerHTML = `
            <td><strong>${row.element}</strong></td>
            <td>${row.type}</td>
            <td>${row.dateTime}</td>
            <td>${row.valueText}</td>
            <td>${row.cota}</td>
            <td>${row.inspector}</td>
            <td>${statusBadge}</td>
            <td><i class="fa-solid fa-circle-check text-success"></i> Centralizado</td>
        `;
        tbody.appendChild(tr);
    });
}

function applyFilters() {
    renderHistoryTable();
}

function csvCell(value) {
    let text = String(value ?? "");
    if (typeof value === "string" && /^[=+\-@]/.test(text.trim())) {
        text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values) {
    return values.map(csvCell).join(",") + "\n";
}

function confirmSensitiveExport(context = "dados") {
    const release = getActiveRelease();
    const releaseText = release
        ? `Liberação local ativa: ${release.id} (${release.purpose}, válida até ${formatDateTimeBR(release.expiresAt)}).`
        : "Não há liberação local ativa. A exportação ficará sem protocolo manual de liberação.";
    const message = [
        `Voce esta exportando ${context} do MDSync.`,
        releaseText,
        "Confirme que a finalidade e autorizada, que o arquivo sera armazenado em local seguro e que o compartilhamento seguira as regras internas de protecao de dados."
    ].join("\n\n");
    return window.confirm(message);
}

// Client-side export downloads
function exportData(format) {
    if (!confirmSensitiveExport("a base operacional completa")) return;

    let content = "";
    let filename = "";
    const activeRelease = getActiveRelease();
    const releaseId = activeRelease?.id || "Sem liberação local";
    
    if (format === 'csv') {
        filename = "mdsync_export.csv";
        content = csvRow(["ID", "Tipo", "Estrutura", "Data_Hora", "Leitura_Risco", "Cota_ou_H", "Inspetor", "Status", "Origem", "SIRGAS2000_EPSG", "SIRGAS2000_UTM_E", "SIRGAS2000_UTM_N", "Latitude", "Longitude", "Precisao_GPS_m", "Liberacao_Local"]);
        
        readingsDatabase.forEach(r => {
            const inst = INSTRUMENT_REGISTRY[r.instrumentId] || {};
            const geo = getRecordGeolocation(r);
            const sirgas = geo?.sirgas2000 || {};
            content += csvRow([
                r.instrumentCode || inst.code || r.instrumentId,
                `Leitura_${r.type}`,
                r.structure || inst.structure,
                r.dateTime,
                r.value,
                r.cotaCalculada,
                r.inspector,
                r.status,
                r.sourceSheet || r.source || "app",
                sirgas.projectedEpsg || "-",
                sirgas.easting ?? "-",
                sirgas.northing ?? "-",
                geo?.latitude ?? "-",
                geo?.longitude ?? "-",
                geo?.accuracyMeters ?? "-",
                releaseId
            ]);
        });
        flowReadingsDatabase.forEach(r => {
            const inst = INSTRUMENT_REGISTRY[r.instrumentId] || {};
            const geo = getRecordGeolocation(r);
            const sirgas = geo?.sirgas2000 || {};
            content += csvRow([
                r.instrumentCode || inst.code || r.instrumentId,
                "Vazao_MV",
                r.structure || inst.structure,
                r.dateTime,
                r.flowM3s ?? r.litersPerSecond,
                r.h,
                r.inspector,
                r.status,
                r.sourceSheet || r.source || "app",
                sirgas.projectedEpsg || "-",
                sirgas.easting ?? "-",
                sirgas.northing ?? "-",
                geo?.latitude ?? "-",
                geo?.longitude ?? "-",
                geo?.accuracyMeters ?? "-",
                releaseId
            ]);
        });
        inspectionsDatabase.forEach(i => {
            const geo = getRecordGeolocation(i);
            const sirgas = geo?.sirgas2000 || {};
            content += csvRow([i.structure, "Inspeção_Visual", i.structure, i.dateTime, i.insRisk, "-", i.inspector, i.insRisk, i.source || "app", sirgas.projectedEpsg || "-", sirgas.easting ?? "-", sirgas.northing ?? "-", geo?.latitude ?? "-", geo?.longitude ?? "-", geo?.accuracyMeters ?? "-", releaseId]);
        });
    } else {
        filename = "mdsync_export.json";
        content = JSON.stringify({
            source: SOURCE_DATABASE ? {
                file: SOURCE_DATABASE.sourceFile,
                version: SOURCE_DATASET_VERSION,
                summary: SOURCE_DATABASE.summary
            } : null,
            manualRelease: activeRelease,
            instruments: INSTRUMENT_REGISTRY,
            readings: readingsDatabase,
            flowReadings: flowReadingsDatabase,
            inspections: inspectionsDatabase
        }, null, 4);
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Download do arquivo ${filename} iniciado.`);
}

// --- 6.1 AUDIT REPORTS AND DYNAMIC INDICATORS ---
function normalizeComparable(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function getKnownStructureNames() {
    const names = [];
    (SOURCE_DATABASE?.summary?.structures || []).forEach(name => names.push(name));
    Object.values(INSTRUMENT_REGISTRY).forEach(inst => {
        if (inst.structure) names.push(inst.structure);
    });

    const unique = new Map();
    names.forEach(name => {
        const key = normalizeComparable(name);
        if (key && !unique.has(key)) unique.set(key, name);
    });
    return Array.from(unique.values());
}

function getCanonicalStructureName(structure) {
    const raw = String(structure || "Estrutura não informada").trim();
    const normalized = normalizeComparable(raw);
    const known = getKnownStructureNames().find(name => normalizeComparable(name) === normalized);
    return known || raw;
}

function getStructureList() {
    const structureOrder = SOURCE_DATABASE?.summary?.structures || [];
    const unique = new Map();

    getKnownStructureNames().forEach(name => {
        unique.set(normalizeComparable(name), getCanonicalStructureName(name));
    });

    readingsDatabase.forEach(record => {
        const inst = INSTRUMENT_REGISTRY[record.instrumentId] || {};
        const structure = getCanonicalStructureName(record.structure || inst.structure);
        unique.set(normalizeComparable(structure), structure);
    });

    flowReadingsDatabase.forEach(record => {
        const inst = INSTRUMENT_REGISTRY[record.instrumentId] || {};
        const structure = getCanonicalStructureName(record.structure || inst.structure);
        unique.set(normalizeComparable(structure), structure);
    });

    inspectionsDatabase.forEach(record => {
        const structure = getCanonicalStructureName(record.structure);
        unique.set(normalizeComparable(structure), structure);
    });

    return Array.from(unique.values()).sort((a, b) => {
        const indexA = structureOrder.findIndex(name => normalizeComparable(name) === normalizeComparable(a));
        const indexB = structureOrder.findIndex(name => normalizeComparable(name) === normalizeComparable(b));
        if (indexA !== -1 || indexB !== -1) {
            return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA)
                - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
        }
        return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });
}

function getGeospatialStructureList() {
    const sourceStructures = SOURCE_DATABASE?.summary?.structures || [];
    const instrumentStructures = Object.values(INSTRUMENT_REGISTRY)
        .map(inst => inst.structure)
        .filter(Boolean);
    const googleEarthStructures = getGoogleEarthStructureRecords().map(item => item.structure);
    const bundledStructures = Object.keys(getBundledGeospatialLayers());
    const base = [
        ...(sourceStructures.length ? sourceStructures : instrumentStructures),
        ...googleEarthStructures,
        ...bundledStructures
    ];
    const unique = new Map();

    base.forEach(name => {
        const canonical = getCanonicalStructureName(name);
        unique.set(normalizeComparable(canonical), canonical);
    });

    return Array.from(unique.values()).sort((a, b) => {
        const indexA = sourceStructures.findIndex(name => normalizeComparable(name) === normalizeComparable(a));
        const indexB = sourceStructures.findIndex(name => normalizeComparable(name) === normalizeComparable(b));
        if (indexA !== -1 || indexB !== -1) {
            return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA)
                - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
        }
        return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
    });
}

function toDateInputValue(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDateBRShort(value) {
    if (!value) return "-";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-");
        return `${day}/${month}/${year}`;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("pt-BR");
}

function formatDateTimeBR(value) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function normalizeStatusLabel(status) {
    const statusClass = getStatusClass(status);
    if (statusClass === "alert") return "Crítico";
    if (statusClass === "warning") return "Atenção";
    return "Normal";
}

function getTypeLabel(type) {
    const labels = {
        PZ: "Piezômetro",
        INA: "Indicador de Nível",
        NA: "Nível de Água",
        MV: "Medidor de Vazão",
        INS: "Inspeção Visual",
        VEH: "Checklist Veicular"
    };
    return labels[type] || type || "Registro";
}

function getPurposeLabel(purpose) {
    const labels = {
        audit: "Auditoria",
        indicators: "Indicadores",
        complete: "Completo"
    };
    return labels[purpose] || "Auditoria";
}

function hasEvidence(record) {
    if (!record) return false;
    const evidence = record.evidence || {};
    const gps = normalizeComparable(evidence.gps);
    const signature = normalizeComparable(evidence.signature);

    if (evidence.photo === true) return true;
    if (["panelPhotos", "safetyPhotos", "generalPhotos", "complementaryPhotos"]
        .some(key => Array.isArray(evidence[key]) && evidence[key].length > 0)) return true;
    if (gps && !gps.includes("AGUARDANDO") && !gps.includes("NAO INFORMADO")) return true;
    if (signature && !signature.includes("NAO COLETADA") && !signature.includes("NAO INFORMADO")) return true;

    return Object.values(record.anomalias || {}).some(anomaly => {
        if (!anomaly || typeof anomaly !== "object") return false;
        return anomaly.fotoRegistrada === true || anomaly.photo === true;
    });
}

function countPositiveAnomalies(inspection) {
    return Object.values(inspection?.anomalias || {}).reduce((total, anomaly) => {
        if (anomaly === true) return total + 1;
        if (!anomaly || typeof anomaly !== "object") return total;
        return normalizeComparable(anomaly.resposta) === "SIM" ? total + 1 : total;
    }, 0);
}

function countAnomalyPhotos(inspection) {
    return Object.values(inspection?.anomalias || {}).reduce((total, anomaly) => {
        if (!anomaly || typeof anomaly !== "object") return total;
        return anomaly.fotoRegistrada === true || anomaly.photo === true ? total + 1 : total;
    }, 0);
}

function getStatusBadgeHtml(status) {
    const statusClass = getStatusClass(status);
    if (statusClass === "normal") return `<span class="badge badge-success">Normal</span>`;
    if (statusClass === "warning") return `<span class="badge badge-warning">Atenção</span>`;
    return `<span class="badge badge-danger">Crítico</span>`;
}

function buildUnifiedRecords(filters = {}) {
    const rows = [];

    readingsDatabase.forEach(record => {
        const inst = INSTRUMENT_REGISTRY[record.instrumentId] || {};
        const type = record.type || inst.type || "PZ";
        const date = new Date(record.dateTime);
        const structure = getCanonicalStructureName(record.structure || inst.structure);
        const valueText = type === "NA"
            ? `Cota ${formatNumber(record.value)} m`
            : `${formatNumber(record.value)} m`;
        rows.push({
            id: record.id,
            category: "reading",
            type,
            typeLabel: getTypeLabel(type),
            structure,
            element: record.instrumentCode || inst.code || record.instrumentId,
            date,
            dateTime: record.dateTime,
            displayDate: formatDateTimeBR(record.dateTime),
            value: record.value,
            valueText,
            cota: record.cotaCalculada === null || record.cotaCalculada === undefined ? "-" : `${formatNumber(record.cotaCalculada)} m`,
            status: record.status,
            statusLabel: normalizeStatusLabel(record.status),
            statusClass: getStatusClass(record.status),
            inspector: record.inspector || "-",
            evidence: hasEvidence(record) ? "Sim" : "Não",
            positiveAnomalies: 0,
            anomalyPhotos: 0,
            source: record.sourceSheet || record.source || "app",
            comments: record.comments || "",
            raw: record
        });
    });

    flowReadingsDatabase.forEach(record => {
        const inst = INSTRUMENT_REGISTRY[record.instrumentId] || {};
        const date = new Date(record.dateTime);
        const structure = getCanonicalStructureName(record.structure || inst.structure);
        const flowM3s = Number(record.flowM3s);
        const liters = Number(record.litersPerSecond);
        const valueText = Number.isFinite(flowM3s)
            ? `${formatNumber(flowM3s, 4)} m³/s`
            : `${formatNumber(liters, 3)} L/s`;

        rows.push({
            id: record.id,
            category: "flow",
            type: "MV",
            typeLabel: getTypeLabel("MV"),
            structure,
            element: record.instrumentCode || inst.code || record.instrumentId,
            date,
            dateTime: record.dateTime,
            displayDate: formatDateTimeBR(record.dateTime),
            value: Number.isFinite(flowM3s) ? flowM3s : liters,
            valueText,
            cota: record.h === null || record.h === undefined ? "-" : `H ${formatNumber(record.h)} m`,
            status: record.status || record.situation || "Normal",
            statusLabel: normalizeStatusLabel(record.status || record.situation),
            statusClass: getStatusClass(record.status || record.situation),
            inspector: record.inspector || "-",
            evidence: hasEvidence(record) ? "Sim" : "Não",
            positiveAnomalies: 0,
            anomalyPhotos: 0,
            source: record.sourceSheet || record.source || "app",
            comments: record.comments || "",
            raw: record
        });
    });

    inspectionsDatabase.forEach(record => {
        const date = new Date(record.dateTime);
        const positiveAnomalies = countPositiveAnomalies(record);
        const status = record.insRisk === "Sem Anomalias Significativas" ? "Normal" : record.insRisk;
        rows.push({
            id: record.id,
            category: "inspection",
            type: "INS",
            typeLabel: getTypeLabel("INS"),
            structure: getCanonicalStructureName(record.structure),
            element: record.structure || "Inspeção",
            date,
            dateTime: record.dateTime,
            displayDate: formatDateTimeBR(record.dateTime),
            value: record.insRisk,
            valueText: record.insRisk || "-",
            cota: "-",
            status,
            statusLabel: normalizeStatusLabel(status),
            statusClass: getStatusClass(status),
            inspector: record.inspector || "-",
            evidence: hasEvidence(record) ? "Sim" : "Não",
            positiveAnomalies,
            anomalyPhotos: countAnomalyPhotos(record),
            source: record.source || "app",
            comments: record.comments || "",
            raw: record
        });
    });

    vehicleInspectionsDatabase.forEach(record => {
        const date = new Date(record.dateTime);
        const status = record.status === "Liberado" ? "Normal" : record.status;
        const photoCount = ["panelPhotos", "safetyPhotos", "generalPhotos", "complementaryPhotos"]
            .reduce((total, key) => total + (record.evidence?.[key]?.length || 0), 0);
        rows.push({
            id: record.id,
            category: "vehicle-inspection",
            type: "VEH",
            typeLabel: getTypeLabel("VEH"),
            structure: `Frota - ${record.sector || "Não informado"}`,
            element: record.plate || "Veículo",
            date,
            dateTime: record.dateTime,
            displayDate: formatDateTimeBR(record.dateTime),
            value: record.status,
            valueText: `${record.status || "-"} · ${Number(record.odometerKm || 0).toLocaleString("pt-BR")} km`,
            cota: "-",
            status,
            statusLabel: normalizeStatusLabel(status),
            statusClass: getStatusClass(status),
            inspector: record.driver || record.inspector || "-",
            evidence: hasEvidence(record) ? "Sim" : "Não",
            positiveAnomalies: Number(record.deviations || 0),
            anomalyPhotos: photoCount,
            source: record.source || "Survey123 incorporado",
            comments: record.comments || "",
            raw: record
        });
    });

    const structureFilter = filters.structure && filters.structure !== "all"
        ? normalizeComparable(filters.structure)
        : "";
    const typeFilter = filters.type && filters.type !== "all" ? filters.type : "";
    const startDate = filters.start ? new Date(`${filters.start}T00:00:00`) : null;
    const endDate = filters.end ? new Date(`${filters.end}T23:59:59`) : null;

    return rows
        .filter(row => !Number.isNaN(row.date.getTime()))
        .filter(row => !structureFilter || normalizeComparable(row.structure) === structureFilter)
        .filter(row => !typeFilter || row.type === typeFilter)
        .filter(row => !startDate || row.date >= startDate)
        .filter(row => !endDate || row.date <= endDate)
        .sort((a, b) => b.date - a.date);
}

function getRecordsSummary(rows) {
    const alertRows = rows.filter(row => row.statusClass !== "normal" || row.positiveAnomalies > 0);
    return {
        total: rows.length,
        alerts: alertRows.length,
        evidence: rows.filter(row => row.evidence === "Sim").length,
        structures: new Set(rows.map(row => row.structure)).size,
        anomalyPhotos: rows.reduce((total, row) => total + row.anomalyPhotos, 0),
        positiveAnomalies: rows.reduce((total, row) => total + row.positiveAnomalies, 0)
    };
}

function setTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function fillStructureSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value || "all";
    select.innerHTML = `<option value="all">Todas as estruturas</option>`;
    getStructureList().forEach(structure => {
        const option = document.createElement("option");
        option.value = structure;
        option.textContent = structure;
        select.appendChild(option);
    });

    if (Array.from(select.options).some(option => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function getRecordsCountByStructure() {
    return buildUnifiedRecords({ structure: "all", type: "all" }).reduce((counts, row) => {
        counts[row.structure] = (counts[row.structure] || 0) + 1;
        return counts;
    }, {});
}

function renderReportStructureChips() {
    const container = document.getElementById("report-structure-chips");
    if (!container) return;

    const currentValue = document.getElementById("report-structure")?.value || "all";
    const counts = getRecordsCountByStructure();
    container.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = `report-structure-button${currentValue === "all" ? " active" : ""}`;
    allButton.dataset.structureFilter = "all";
    allButton.textContent = "Todas";
    allButton.onclick = () => setReportStructureFilter("all");
    container.appendChild(allButton);

    getStructureList().forEach(structure => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `report-structure-button${structure === currentValue ? " active" : ""}`;
        button.dataset.structureFilter = structure;
        const count = counts[structure] || 0;
        button.textContent = `${structure} (${count.toLocaleString("pt-BR")})`;
        button.title = `Filtrar relatório da estrutura ${structure}`;
        button.onclick = () => setReportStructureFilter(structure);
        container.appendChild(button);
    });
}

function updateReportStructureChipState(currentValue = "all") {
    document.querySelectorAll(".report-structure-button").forEach(button => {
        button.classList.toggle("active", button.dataset.structureFilter === currentValue);
    });
}

function setReportStructureFilter(structure) {
    const select = document.getElementById("report-structure");
    if (!select) return;

    if (!Array.from(select.options).some(option => option.value === structure)) {
        fillStructureSelect("report-structure");
    }

    select.value = structure;
    renderReportsPanel();
}

function populateAnalyticsFilters() {
    fillStructureSelect("report-structure");
    fillStructureSelect("indicator-structure");
    renderReportStructureChips();
}

function getReportFilters() {
    return {
        structure: document.getElementById("report-structure")?.value || "all",
        type: document.getElementById("report-type")?.value || "all",
        purpose: document.getElementById("report-purpose")?.value || "audit",
        start: document.getElementById("report-start")?.value || "",
        end: document.getElementById("report-end")?.value || ""
    };
}

function getPeriodText(filters) {
    if (filters.start && filters.end) return `${formatDateBRShort(filters.start)} a ${formatDateBRShort(filters.end)}`;
    if (filters.start) return `A partir de ${formatDateBRShort(filters.start)}`;
    if (filters.end) return `Até ${formatDateBRShort(filters.end)}`;
    return "Período completo";
}

function renderReportsPanel() {
    const tbody = document.getElementById("report-preview-body");
    if (!tbody) return;

    const reportSelect = document.getElementById("report-structure");
    if (reportSelect && reportSelect.options.length <= 1) {
        populateAnalyticsFilters();
    }

    const filters = getReportFilters();
    const rows = buildUnifiedRecords(filters);
    const summary = getRecordsSummary(rows);
    updateReportStructureChipState(filters.structure);

    setTextContent("report-total-records", summary.total.toLocaleString("pt-BR"));
    setTextContent("report-alert-records", summary.alerts.toLocaleString("pt-BR"));
    setTextContent("report-evidence-records", summary.evidence.toLocaleString("pt-BR"));
    setTextContent("report-structures-count", summary.structures.toLocaleString("pt-BR"));
    setTextContent("report-period-chip", getPeriodText(filters));
    setTextContent("report-purpose-chip", getPurposeLabel(filters.purpose));
    setTextContent(
        "report-readiness-text",
        `${summary.total.toLocaleString("pt-BR")} registros prontos, ${summary.evidence.toLocaleString("pt-BR")} com evidência digital e ${summary.alerts.toLocaleString("pt-BR")} em atenção/crítico.`
    );

    tbody.innerHTML = "";
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    rows.slice(0, 12).forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.displayDate}</td>
            <td><strong>${row.structure}</strong></td>
            <td>${row.element}</td>
            <td>${row.typeLabel}</td>
            <td>${row.valueText}</td>
            <td>${getStatusBadgeHtml(row.status)}</td>
            <td>${row.evidence}</td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getExportableRecord(row) {
    const activeRelease = getActiveRelease();
    const geo = getRecordGeolocation(row.raw);
    const sirgas = geo?.sirgas2000 || {};
    return {
        id: row.id,
        dataHora: row.dateTime,
        estrutura: row.structure,
        elemento: row.element,
        tipo: row.type,
        tipoDescricao: row.typeLabel,
        valorRisco: row.valueText,
        cotaOuH: row.cota,
        status: row.statusLabel,
        evidenciaDigital: row.evidence,
        anomaliasPositivas: row.positiveAnomalies,
        fotosDeAnomalia: row.anomalyPhotos,
        inspetor: row.inspector,
        origem: row.source,
        observacoes: row.comments,
        sirgas2000: geo ? {
            datum: sirgas.datum || SIRGAS_2000.datum,
            epsgGeografico: sirgas.geographicEpsg || SIRGAS_2000.geographicEpsg,
            epsgProjetado: sirgas.projectedEpsg || "-",
            zonaUtm: sirgas.zone ? `${sirgas.zone}${sirgas.hemisphere || "S"}` : "-",
            latitude: geo.latitude,
            longitude: geo.longitude,
            utmE: sirgas.easting,
            utmN: sirgas.northing,
            precisaoMetros: geo.accuracyMeters,
            qualidade: geo.quality?.label || "-",
            capturadoEm: geo.capturedAt,
            provedor: geo.provider || geo.source || "-"
        } : null,
        sirgas2000Texto: getGeorefExportText(geo),
        liberacaoLocal: activeRelease?.id || "Sem liberação local"
    };
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8;") {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 250);
}

function exportAuditReport(format) {
    const filters = getReportFilters();
    const rows = buildUnifiedRecords(filters);
    const summary = getRecordsSummary(rows);

    if (rows.length === 0) {
        showToast("Nenhum dado encontrado para exportar com os filtros atuais.", "error");
        return;
    }

    const context = filters.structure === "all"
        ? "registros de todas as estruturas"
        : `registros da estrutura ${filters.structure}`;
    if (!confirmSensitiveExport(context)) return;

    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const purpose = filters.purpose || "audit";
    const activeRelease = getActiveRelease();
    const releaseId = activeRelease?.id || "Sem liberação local";
    let filename = "";
    let content = "";
    let mimeType = "text/plain;charset=utf-8;";

    if (format === "csv") {
        filename = `mdsync_${purpose}_${stamp}.csv`;
        content = "\uFEFF" + csvRow([
            "Data_Hora",
            "Estrutura",
            "Elemento",
            "Tipo",
            "Valor_Risco",
            "Cota_H",
            "Status",
            "Evidencia_Digital",
            "Anomalias_Positivas",
            "Fotos_Anomalia",
            "Inspetor",
            "Origem",
            "Observacoes",
            "SIRGAS2000_EPSG",
            "SIRGAS2000_UTM_E",
            "SIRGAS2000_UTM_N",
            "Latitude",
            "Longitude",
            "Precisao_GPS_m",
            "Liberacao_Local"
        ]);
        rows.forEach(row => {
            const geo = getRecordGeolocation(row.raw);
            const sirgas = geo?.sirgas2000 || {};
            content += csvRow([
                row.dateTime,
                row.structure,
                row.element,
                row.typeLabel,
                row.valueText,
                row.cota,
                row.statusLabel,
                row.evidence,
                row.positiveAnomalies,
                row.anomalyPhotos,
                row.inspector,
                row.source,
                row.comments,
                sirgas.projectedEpsg || "-",
                sirgas.easting ?? "-",
                sirgas.northing ?? "-",
                geo?.latitude ?? "-",
                geo?.longitude ?? "-",
                geo?.accuracyMeters ?? "-",
                releaseId
            ]);
        });
        mimeType = "text/csv;charset=utf-8;";
    } else if (format === "json") {
        filename = `mdsync_${purpose}_${stamp}.json`;
        content = JSON.stringify({
            metadata: {
                app: "MDSync - Centralizador de Dados de Campo",
                generatedAt: new Date().toISOString(),
                datasetVersion: SOURCE_DATASET_VERSION,
                sourceFile: SOURCE_DATABASE?.sourceFile || null,
                purpose: getPurposeLabel(filters.purpose),
                manualRelease: activeRelease
            },
            filters,
            summary,
            records: rows.map(getExportableRecord)
        }, null, 2);
        mimeType = "application/json;charset=utf-8;";
    } else {
        filename = `mdsync_${purpose}_${stamp}.html`;
        content = buildAuditHtmlReport(rows, filters, summary);
        mimeType = "text/html;charset=utf-8;";
    }

    downloadTextFile(filename, content, mimeType);
    showToast(`Exportação ${filename} iniciada.`);
}

function buildAuditHtmlReport(rows, filters, summary) {
    const generatedAt = formatDateTimeBR(new Date());
    const activeRelease = getActiveRelease();
    const exportedRows = rows.map(getExportableRecord);
    const filterRows = [
        ["Finalidade", getPurposeLabel(filters.purpose)],
        ["Estrutura", filters.structure === "all" ? "Todas as estruturas" : filters.structure],
        ["Base de dados", filters.type === "all" ? "Todos os dados" : getTypeLabel(filters.type)],
        ["Período", getPeriodText(filters)],
        ["Gerado em", generatedAt],
        ["Liberação local", activeRelease ? `${activeRelease.id} - ${activeRelease.purpose}` : "Sem liberação local ativa"],
        ["Versão da base", SOURCE_DATASET_VERSION]
    ];

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório MDSync - ${escapeHtml(getPurposeLabel(filters.purpose))}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #162535; margin: 32px; background: #f4f8fb; }
        h1, h2 { margin: 0 0 10px; }
        .header { border-left: 5px solid #36d57b; padding-left: 16px; margin-bottom: 22px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
        .box { background: #fff; border: 1px solid #dbe8f1; border-radius: 8px; padding: 14px; }
        .box span { display: block; color: #526579; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .box strong { font-size: 24px; }
        table { width: 100%; border-collapse: collapse; background: #fff; margin-top: 14px; }
        th, td { border: 1px solid #dbe8f1; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
        th { background: #eef5fa; }
        .meta { width: 100%; max-width: 780px; }
        .meta th { width: 180px; }
        .status-normal { color: #18824b; font-weight: 700; }
        .status-warning { color: #a35b00; font-weight: 700; }
        .status-alert { color: #b91c1c; font-weight: 700; }
        @media print { body { margin: 14mm; background: #fff; } .summary { grid-template-columns: repeat(2, 1fr); } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório MDSync - Centralizador de Dados de Campo</h1>
        <p>Pacote auditável de dados geotécnicos, evidências digitais e indicadores operacionais.</p>
    </div>
    <table class="meta">
        <tbody>
            ${filterRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
        </tbody>
    </table>
    <div class="summary">
        <div class="box"><span>Registros</span><strong>${summary.total.toLocaleString("pt-BR")}</strong></div>
        <div class="box"><span>Alertas / críticos</span><strong>${summary.alerts.toLocaleString("pt-BR")}</strong></div>
        <div class="box"><span>Evidências digitais</span><strong>${summary.evidence.toLocaleString("pt-BR")}</strong></div>
        <div class="box"><span>Estruturas</span><strong>${summary.structures.toLocaleString("pt-BR")}</strong></div>
    </div>
    <h2>Registros Exportados</h2>
    <table>
        <thead>
            <tr>
                <th>Data/Hora</th>
                <th>Estrutura</th>
                <th>Elemento</th>
                <th>Tipo</th>
                <th>Valor/Risco</th>
                <th>Status</th>
                <th>Evidência</th>
                <th>SIRGAS 2000</th>
                <th>Inspetor</th>
                <th>Origem</th>
                <th>Liberação</th>
            </tr>
        </thead>
        <tbody>
            ${exportedRows.map(row => {
                const statusClass = getStatusClass(row.status);
                return `<tr>
                    <td>${escapeHtml(formatDateTimeBR(row.dataHora))}</td>
                    <td>${escapeHtml(row.estrutura)}</td>
                    <td>${escapeHtml(row.elemento)}</td>
                    <td>${escapeHtml(row.tipoDescricao)}</td>
                    <td>${escapeHtml(row.valorRisco)}</td>
                    <td class="status-${escapeHtml(statusClass)}">${escapeHtml(row.status)}</td>
                    <td>${escapeHtml(row.evidenciaDigital)}</td>
                    <td>${escapeHtml(row.sirgas2000Texto)}</td>
                    <td>${escapeHtml(row.inspetor)}</td>
                    <td>${escapeHtml(row.origem)}</td>
                    <td>${escapeHtml(row.liberacaoLocal)}</td>
                </tr>`;
            }).join("")}
        </tbody>
    </table>
</body>
</html>`;
}

function downloadBlobFile(filename, blob) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function getAuditTableData(rows) {
    const headers = ["Data/Hora", "Estrutura", "Elemento", "Tipo", "Valor/Risco", "Status", "Evidência", "SIRGAS 2000", "Inspetor", "Origem"];
    const data = rows.map(row => {
        const exported = getExportableRecord(row);
        return [
            exported.dataHora,
            exported.estrutura,
            exported.elemento,
            exported.tipoDescricao,
            exported.valorRisco,
            exported.status,
            exported.evidenciaDigital,
            exported.sirgas2000Texto,
            exported.inspetor,
            exported.origem
        ];
    });
    return { headers, data };
}

function formatFileSize(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return "-";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getInspectionAnomalyLabel(anomalyId) {
    const anomaly = SURVEY_ANOMALIES.find(item => item.id === anomalyId);
    return anomaly ? `${anomaly.group} - ${anomaly.title}` : anomalyId;
}

function getRecordAnomalyDetails(row) {
    const raw = row.raw || {};
    if (row.category === "vehicle-inspection") {
        return [...(raw.safety || []), ...(raw.general || [])]
            .filter(item => item && item.result && item.result !== "OK")
            .map(item => ({
                label: item.label || item.id || "Item do checklist veicular",
                status: item.result,
                description: item.notes || "Desvio apontado no checklist veicular.",
                severity: item.result === "CrÃ­tico" ? "Alta" : "MÃ©dia",
                group: item.group || "Checklist veicular"
            }));
    }

    return Object.entries(raw.anomalias || {})
        .filter(([, anomaly]) => {
            if (anomaly === true) return true;
            if (!anomaly || typeof anomaly !== "object") return false;
            return normalizeComparable(anomaly.resposta) === "SIM";
        })
        .map(([id, anomaly]) => ({
            label: getInspectionAnomalyLabel(id),
            status: anomaly?.resposta || "Sim",
            description: anomaly?.descricao || "Anomalia registrada em campo sem detalhamento adicional.",
            severity: anomaly?.severidade || row.statusLabel || "AtenÃ§Ã£o",
            group: "InspeÃ§Ã£o visual"
        }));
}

function getRecordEvidenceItems(row) {
    const raw = row.raw || {};
    const evidence = raw.evidence || {};
    const items = [];
    const pushItem = (label, item) => {
        if (!item) return;
        if (typeof item === "string") {
            items.push({ label, name: item, size: 0, type: "texto", dataUrl: "", capturedAt: "" });
            return;
        }
        items.push({
            label,
            name: item.name || item.fotoArquivo || label,
            size: item.size || item.fotoTamanho || 0,
            type: item.type || "image",
            dataUrl: item.dataUrl || item.fotoDataUrl || "",
            capturedAt: item.capturedAt || raw.dateTime || ""
        });
    };

    if (evidence.photoFile) pushItem("Foto da leitura", evidence.photoFile);
    ["panelPhotos", "safetyPhotos", "generalPhotos", "complementaryPhotos"].forEach(key => {
        const label = {
            panelPhotos: "Foto do painel",
            safetyPhotos: "Foto de item de seguranca",
            generalPhotos: "Foto de condicao geral",
            complementaryPhotos: "Foto complementar"
        }[key];
        (evidence[key] || []).forEach(item => pushItem(label, item));
    });
    Object.entries(raw.anomalias || {}).forEach(([id, anomaly]) => {
        if (!anomaly || typeof anomaly !== "object") return;
        if (anomaly.fotoRegistrada || anomaly.fotoArquivo || anomaly.fotoDataUrl) {
            pushItem(`Foto da anomalia: ${getInspectionAnomalyLabel(id)}`, {
                name: anomaly.fotoArquivo || `anomalia-${id}`,
                size: anomaly.fotoTamanho,
                type: "image",
                dataUrl: anomaly.fotoDataUrl,
                capturedAt: raw.dateTime
            });
        }
    });
    return items;
}

function getRecordTreatmentText(row, anomalies = getRecordAnomalyDetails(row)) {
    const raw = row.raw || {};
    if (row.statusClass === "normal" && anomalies.length === 0) {
        return "Manter monitoramento de rotina conforme plano de inspecao vigente.";
    }
    if (row.category === "vehicle-inspection") {
        return raw.comments || "Registrar providencia corretiva para os desvios veiculares antes da liberacao operacional.";
    }
    if (row.category === "inspection") {
        const critical = anomalies.some(item => normalizeComparable(item.severity).includes("CRIT") || normalizeComparable(item.severity).includes("ALTA"));
        return critical
            ? "Acionar responsavel geotecnico, registrar tratativa imediata e acompanhar evolucao ate encerramento."
            : "Programar tratativa operacional, manter inspecao dirigida e anexar evidencias de acompanhamento.";
    }
    if (row.statusClass === "alert") return "Validar leitura em campo, anexar evidencia fotografica e escalar para avaliacao geotecnica.";
    if (row.statusClass === "warning") return "Repetir leitura, acompanhar tendencia e registrar observacao na proxima campanha.";
    return row.comments || "Registro mantido para rastreabilidade operacional.";
}

function getReportRecordCards(rows) {
    return rows.map(row => {
        const anomalies = getRecordAnomalyDetails(row);
        const evidenceItems = getRecordEvidenceItems(row);
        return {
            row,
            anomalies,
            evidenceItems,
            treatment: getRecordTreatmentText(row, anomalies),
            observations: row.comments || row.raw?.comments || "Sem observacoes adicionais registradas."
        };
    });
}

function renderEvidenceCardsHtml(items) {
    if (!items.length) {
        return `<p class="empty-note">Nenhuma foto anexada a este registro.</p>`;
    }
    return `<div class="evidence-grid">${items.map(item => `
        <figure class="evidence-card">
            ${item.dataUrl ? `<img src="${item.dataUrl}" alt="${escapeHtml(item.label)}">` : `<div class="evidence-placeholder"><strong>Foto registrada</strong><span>${escapeHtml(item.name)}</span></div>`}
            <figcaption>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.name || "-")} | ${escapeHtml(formatFileSize(item.size))}</span>
                <small>${escapeHtml(item.capturedAt ? formatDateTimeBR(item.capturedAt) : "Data vinculada ao registro")}</small>
            </figcaption>
        </figure>
    `).join("")}</div>`;
}

function renderAnomalyListHtml(items) {
    if (!items.length) return `<p class="empty-note">Sem anomalias positivas no registro.</p>`;
    return `<ul class="anomaly-list">${items.map(item => `
        <li>
            <strong>${escapeHtml(item.label)}</strong>
            <span>Status: ${escapeHtml(item.status)} | Criticidade: ${escapeHtml(item.severity)}</span>
            <p>${escapeHtml(item.description)}</p>
        </li>
    `).join("")}</ul>`;
}

function buildSimplePdfBlob(rows, filters, summary) {
    const clean = value => String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ");
    const lines = [
        "MDSync - Relatorio Geotecnico",
        `Finalidade: ${getPurposeLabel(filters.purpose)}`,
        `Estrutura: ${filters.structure === "all" ? "Todas" : filters.structure}`,
        `Periodo: ${getPeriodText(filters)}`,
        `Registros: ${summary.total} | Alertas: ${summary.alerts} | Evidencias: ${summary.evidence}`,
        `Gerado em: ${formatDateTimeBR(new Date())}`,
        "",
        "DATA | ESTRUTURA | ELEMENTO | TIPO | VALOR/RISCO | STATUS"
    ];
    rows.forEach(row => lines.push(clean([
        row.displayDate,
        row.structure,
        row.element,
        row.typeLabel,
        row.valueText,
        row.statusLabel
    ].join(" | ")).slice(0, 112)));

    const perPage = 48;
    const pages = [];
    for (let index = 0; index < lines.length; index += perPage) {
        pages.push(lines.slice(index, index + perPage));
    }
    const objects = [];
    const pageIds = pages.map((_, index) => 4 + index * 2);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    pages.forEach((pageLines, index) => {
        const pageId = 4 + index * 2;
        const contentId = pageId + 1;
        const contentLines = [
            "BT",
            "/F1 9 Tf",
            "11 TL",
            "36 806 Td",
            ...pageLines.map((line, lineIndex) => {
                const escaped = clean(line).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
                return `${lineIndex ? "T* " : ""}(${escaped}) Tj`;
            }),
            `T* (Pagina ${index + 1} de ${pages.length}) Tj`,
            "ET"
        ];
        const stream = contentLines.join("\n");
        objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
        objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id += 1) {
        offsets[id] = pdf.length;
        pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id += 1) {
        pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
}

async function buildDocxBlob(rows, filters, summary) {
    if (!window.JSZip) throw new Error("Componente de documentos offline indisponível.");
    const zip = new window.JSZip();
    const table = getAuditTableData(rows);
    const paragraph = text => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
    const cell = text => `<w:tc><w:tcPr><w:tcW w:w="1900" w:type="dxa"/></w:tcPr>${paragraph(text)}</w:tc>`;
    const tableRows = [
        `<w:tr>${table.headers.map(cell).join("")}</w:tr>`,
        ...table.data.map(row => `<w:tr>${row.map(cell).join("")}</w:tr>`)
    ].join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${paragraph("MDSync - Relatório Geotécnico")}
${paragraph(`Estrutura: ${filters.structure === "all" ? "Todas as estruturas" : filters.structure}`)}
${paragraph(`Período: ${getPeriodText(filters)} | Registros: ${summary.total} | Alertas: ${summary.alerts}`)}
<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${tableRows}</w:tbl>
<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
</w:body></w:document>`;
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file("word/document.xml", documentXml);
    zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
}

function buildSpreadsheetXml(rows, filters, summary) {
    const table = getAuditTableData(rows);
    const rowXml = values => `<Row>${values.map(value => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join("")}</Row>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Relatorio"><Table>
${rowXml(["MDSync - Relatório Geotécnico", `Estrutura: ${filters.structure}`, `Registros: ${summary.total}`, `Alertas: ${summary.alerts}`])}
${rowXml(table.headers)}
${table.data.map(rowXml).join("")}
</Table></Worksheet></Workbook>`;
}

function getExcelColumnName(index) {
    let value = index + 1;
    let label = "";
    while (value > 0) {
        value -= 1;
        label = String.fromCharCode(65 + value % 26) + label;
        value = Math.floor(value / 26);
    }
    return label;
}

async function buildXlsxBlob(rows, filters, summary) {
    if (!window.JSZip) throw new Error("Componente de planilhas offline indisponível.");
    const zip = new window.JSZip();
    const table = getAuditTableData(rows);
    const allRows = [
        ["MDSync - Relatório Geotécnico", `Estrutura: ${filters.structure}`, `Registros: ${summary.total}`, `Alertas: ${summary.alerts}`],
        table.headers,
        ...table.data
    ];
    const sheetRows = allRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${getExcelColumnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`).join("")}</row>`).join("");
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
    zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`);
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
}

function getPowerPointShape(id, name, x, y, width, height, text, fontSize = 2000, bold = false) {
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${escapeXml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="${fontSize}" b="${bold ? 1 : 0}" dirty="0"/><a:t>${escapeXml(text)}</a:t></a:r><a:endParaRPr lang="pt-BR"/></a:p></p:txBody></p:sp>`;
}

async function buildPptxBlob(rows, filters, summary) {
    if (!window.JSZip) throw new Error("Componente de apresentações offline indisponível.");
    const zip = new window.JSZip();
    const preview = rows.slice(0, 16).map(row => `${row.displayDate} | ${row.structure} | ${row.element} | ${row.statusLabel}`);
    const slideText = [
        `Estrutura: ${filters.structure === "all" ? "Todas as estruturas" : filters.structure}`,
        `Período: ${getPeriodText(filters)}`,
        `Registros: ${summary.total} | Alertas: ${summary.alerts} | Evidências: ${summary.evidence} | Estruturas: ${summary.structures}`,
        "",
        ...preview
    ].join("\n");
    const spTreeBase = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="0B3852"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${spTreeBase}${getPowerPointShape(2, "Título", 550000, 300000, 11000000, 800000, "MDSync - Relatório Geotécnico", 3000, true)}${getPowerPointShape(3, "Conteúdo", 650000, 1250000, 10800000, 4800000, slideText, 1450, false)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>`);
    zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
    zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
    zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>`);
    zip.file("ppt/slides/slide1.xml", slideXml);
    zip.file("ppt/slides/_rels/slide1.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`);
    zip.file("ppt/slideMasters/slideMaster1.xml", `<?xml version="1.0" encoding="UTF-8"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${spTreeBase}</p:spTree></p:cSld><p:clrMap accent1="2273AA" accent2="36D57B" accent3="F59E0B" accent4="EF4444" accent5="38BDF8" accent6="8B5CF6" bg1="FFFFFF" bg2="F4F8FB" folHlink="800080" hlink="0000FF" tx1="162535" tx2="526579"/><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
    zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`);
    zip.file("ppt/slideLayouts/slideLayout1.xml", `<?xml version="1.0" encoding="UTF-8"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Em branco"><p:spTree>${spTreeBase}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
    zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
    zip.file("ppt/theme/theme1.xml", `<?xml version="1.0" encoding="UTF-8"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MDSync"><a:themeElements><a:clrScheme name="MDSync"><a:dk1><a:srgbClr val="162535"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0B3852"/></a:dk2><a:lt2><a:srgbClr val="F4F8FB"/></a:lt2><a:accent1><a:srgbClr val="2273AA"/></a:accent1><a:accent2><a:srgbClr val="36D57B"/></a:accent2><a:accent3><a:srgbClr val="F59E0B"/></a:accent3><a:accent4><a:srgbClr val="EF4444"/></a:accent4><a:accent5><a:srgbClr val="38BDF8"/></a:accent5><a:accent6><a:srgbClr val="8B5CF6"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements></a:theme>`);
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", compression: "DEFLATE" });
}

async function exportAuditReport(format) {
    const allowedFormats = new Set(["pdf", "docx", "doc", "xlsx", "xls", "pptx"]);
    if (!allowedFormats.has(format)) {
        showToast("Formato de relatório não autorizado.", "warning");
        return;
    }
    const filters = getReportFilters();
    const rows = buildUnifiedRecords(filters);
    const summary = getRecordsSummary(rows);
    if (!rows.length) {
        showToast("Nenhum dado encontrado para exportar com os filtros atuais.", "error");
        return;
    }
    const context = filters.structure === "all" ? "registros de todas as estruturas" : `registros da estrutura ${filters.structure}`;
    if (!confirmSensitiveExport(context)) return;

    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const purpose = filters.purpose || "audit";
    const filename = `mdsync_${purpose}_${stamp}.${format}`;
    showToast(`Preparando ${format.toUpperCase()}...`);
    try {
        let blob;
        if (format === "pdf") blob = buildSimplePdfBlob(rows, filters, summary);
        if (format === "doc") blob = new Blob(["\uFEFF", buildAuditHtmlReport(rows, filters, summary)], { type: "application/msword;charset=utf-8" });
        if (format === "docx") blob = await buildDocxBlob(rows, filters, summary);
        if (format === "xls") blob = new Blob(["\uFEFF", buildSpreadsheetXml(rows, filters, summary)], { type: "application/vnd.ms-excel;charset=utf-8" });
        if (format === "xlsx") blob = await buildXlsxBlob(rows, filters, summary);
        if (format === "pptx") blob = await buildPptxBlob(rows, filters, summary);
        downloadBlobFile(filename, blob);
        showToast(`${format.toUpperCase()} gerado com sucesso.`);
    } catch (error) {
        console.warn("Falha ao gerar relatório:", error);
        showToast(error.message || "Não foi possível gerar o relatório.", "error");
    }
}

function getLatestRecordDate(rows) {
    const dates = rows
        .map(row => row.date)
        .filter(date => date instanceof Date && !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a);
    return dates[0] || null;
}

function getIndicatorFilters() {
    const period = document.getElementById("indicator-period")?.value || "all";
    const baseRows = buildUnifiedRecords({
        structure: document.getElementById("indicator-structure")?.value || "all",
        type: document.getElementById("indicator-type")?.value || "all"
    });
    const latestDate = getLatestRecordDate(baseRows) || new Date();
    let start = "";

    if (period !== "all") {
        const days = Number(period);
        const startDate = new Date(latestDate);
        startDate.setDate(startDate.getDate() - days + 1);
        start = toDateInputValue(startDate);
    }

    return {
        structure: document.getElementById("indicator-structure")?.value || "all",
        type: document.getElementById("indicator-type")?.value || "all",
        period,
        start,
        end: ""
    };
}

function groupRows(rows, keyFactory) {
    return rows.reduce((groups, row) => {
        const key = keyFactory(row);
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
        return groups;
    }, {});
}

function getChartColors() {
    return {
        primary: "#2273aa",
        success: "#36d57b",
        warning: "#f59e0b",
        danger: "#ff6666",
        aqua: "#41aebd",
        muted: "#9fb4c6",
        text: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim() || "#526579",
        grid: "rgba(82, 101, 121, 0.14)"
    };
}

function renderIndicatorChart(chartId, config) {
    const canvas = document.getElementById(chartId);
    if (!canvas || typeof Chart === "undefined") return;

    if (indicatorCharts[chartId]) {
        indicatorCharts[chartId].destroy();
    }

    const colors = getChartColors();
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        responsiveAnimationDuration: 0,
        plugins: {
            legend: {
                display: true,
                labels: { color: colors.text, boxWidth: 12 }
            }
        }
    };

    if (config.type !== "doughnut") {
        baseOptions.scales = {
            y: {
                beginAtZero: true,
                grid: { color: colors.grid },
                ticks: { color: colors.text, precision: 0 }
            },
            x: {
                grid: { display: false },
                ticks: { color: colors.text }
            }
        };
    }

    indicatorCharts[chartId] = new Chart(canvas.getContext("2d"), {
        ...config,
        options: {
            ...baseOptions,
            ...(config.options || {}),
            plugins: {
                ...baseOptions.plugins,
                ...(config.options?.plugins || {})
            },
            scales: config.options?.scales || baseOptions.scales
        }
    });
}

function getSafeChartLabels(labels, fallback = "Sem dados") {
    return labels.length ? labels : [fallback];
}

function getSafeChartData(data) {
    return data.length ? data : [0];
}

function renderIndicatorsDashboard() {
    const tableBody = document.getElementById("indicator-structure-table");
    if (!tableBody) return;

    const filters = getIndicatorFilters();
    const rows = buildUnifiedRecords(filters);
    const summary = getRecordsSummary(rows);
    const colors = getChartColors();
    const alertRate = rows.length ? ((summary.alerts / rows.length) * 100).toFixed(1).replace(".0", "") : "0";

    setTextContent("indicator-total-records", summary.total.toLocaleString("pt-BR"));
    setTextContent("indicator-alert-rate", `${alertRate}%`);
    setTextContent("indicator-active-structures", summary.structures.toLocaleString("pt-BR"));
    setTextContent("indicator-last-update", rows[0] ? formatDateBRShort(rows[0].date) : "-");

    const structureGroups = groupRows(rows, row => row.structure);
    const typeGroups = groupRows(rows, row => row.type);
    const structureLabels = Object.keys(structureGroups).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    const typeLabels = ["PZ", "INA", "NA", "MV", "INS"].filter(type => typeGroups[type]?.length);
    const volumeLabels = filters.structure === "all" ? structureLabels : typeLabels.map(getTypeLabel);
    const volumeData = filters.structure === "all"
        ? structureLabels.map(label => structureGroups[label].length)
        : typeLabels.map(type => typeGroups[type].length);

    renderIndicatorChart("indicatorStructureChart", {
        type: "bar",
        data: {
            labels: getSafeChartLabels(volumeLabels),
            datasets: [{
                label: "Registros",
                data: getSafeChartData(volumeData),
                backgroundColor: colors.primary,
                borderRadius: 6
            }]
        }
    });

    const statusCounts = rows.reduce((acc, row) => {
        acc[row.statusClass] = (acc[row.statusClass] || 0) + 1;
        return acc;
    }, { normal: 0, warning: 0, alert: 0 });

    renderIndicatorChart("indicatorStatusChart", {
        type: "doughnut",
        data: {
            labels: ["Normal", "Atenção", "Crítico"],
            datasets: [{
                data: [statusCounts.normal, statusCounts.warning, statusCounts.alert],
                backgroundColor: [colors.success, colors.warning, colors.danger],
                borderWidth: 0
            }]
        },
        options: {
            cutout: "62%"
        }
    });

    const monthGroups = groupRows(rows, row => {
        const month = String(row.date.getMonth() + 1).padStart(2, "0");
        return `${row.date.getFullYear()}-${month}`;
    });
    const monthKeys = Object.keys(monthGroups).sort().slice(-18);
    const monthLabels = monthKeys.map(key => {
        const [year, month] = key.split("-").map(Number);
        return new Date(year, month - 1, 1)
            .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
            .replace(".", "");
    });

    renderIndicatorChart("indicatorTrendChart", {
        type: "line",
        data: {
            labels: getSafeChartLabels(monthLabels),
            datasets: [{
                label: "Registros/mês",
                data: getSafeChartData(monthKeys.map(key => monthGroups[key].length)),
                borderColor: colors.aqua,
                backgroundColor: "rgba(65, 174, 189, 0.14)",
                borderWidth: 3,
                pointRadius: 4,
                tension: 0.24,
                fill: true
            }]
        }
    });

    const riskLabels = structureLabels;
    const riskAlerts = riskLabels.map(label => structureGroups[label].filter(row => row.statusClass !== "normal").length);
    const riskAnomalies = riskLabels.map(label => structureGroups[label].reduce((total, row) => total + row.positiveAnomalies, 0));

    renderIndicatorChart("indicatorRiskChart", {
        type: "bar",
        data: {
            labels: getSafeChartLabels(riskLabels),
            datasets: [
                {
                    label: "Alertas",
                    data: getSafeChartData(riskAlerts),
                    backgroundColor: colors.warning,
                    borderRadius: 6
                },
                {
                    label: "Anomalias positivas",
                    data: getSafeChartData(riskAnomalies),
                    backgroundColor: colors.danger,
                    borderRadius: 6
                }
            ]
        }
    });

    renderIndicatorStructureTable(rows);
}

function renderIndicatorStructureTable(rows) {
    const tableBody = document.getElementById("indicator-structure-table");
    if (!tableBody) return;

    const grouped = groupRows(rows, row => row.structure);
    const structures = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    tableBody.innerHTML = "";
    if (structures.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-secondary">Nenhum indicador encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    structures.forEach(structure => {
        const records = grouped[structure];
        const countType = type => records.filter(row => row.type === type).length;
        const alerts = records.filter(row => row.statusClass !== "normal" || row.positiveAnomalies > 0).length;
        const anomalies = records.reduce((total, row) => total + row.positiveAnomalies, 0);
        const latest = records.sort((a, b) => b.date - a.date)[0];
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${structure}</strong></td>
            <td>${countType("PZ").toLocaleString("pt-BR")}</td>
            <td>${countType("INA").toLocaleString("pt-BR")}</td>
            <td>${countType("NA").toLocaleString("pt-BR")}</td>
            <td>${countType("MV").toLocaleString("pt-BR")}</td>
            <td>${countType("INS").toLocaleString("pt-BR")}</td>
            <td>${alerts.toLocaleString("pt-BR")}</td>
            <td>${anomalies.toLocaleString("pt-BR")}</td>
            <td>${latest ? formatDateBRShort(latest.date) : "-"}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// --- 6B. GEOVIEW - CORPORATE DASHBOARD CATALOG & LOCAL FILE LINKS ---
function getDefaultGeoViewState() {
    return {
        importedFiles: [],
        dashboardFiles: {},
        maps: {}
    };
}

function loadGeoViewState() {
    const fallback = getDefaultGeoViewState();
    try {
        const parsed = JSON.parse(localStorage.getItem(GEOVIEW_STATE_KEY) || "null");
        geoViewState = {
            importedFiles: Array.isArray(parsed?.importedFiles) ? parsed.importedFiles : [],
            dashboardFiles: parsed?.dashboardFiles && typeof parsed.dashboardFiles === "object" ? parsed.dashboardFiles : {},
            maps: parsed?.maps && typeof parsed.maps === "object" ? parsed.maps : {}
        };
    } catch (error) {
        console.warn("Estado GeoView invalido. Recriando cache local.", error);
        geoViewState = fallback;
    }
}

function saveGeoViewState() {
    try {
        localStorage.setItem(GEOVIEW_STATE_KEY, JSON.stringify(geoViewState));
    } catch (error) {
        console.warn("Nao foi possivel salvar GeoView localmente:", error);
        showToast("Nao foi possivel salvar tudo no armazenamento local. Reduza imagens grandes.", "warning");
    }
}

function getGeoViewDashboards() {
    return Array.isArray(GEOVIEW_CATALOG.dashboards) ? GEOVIEW_CATALOG.dashboards : [];
}

function getGeoViewDashboard(dashboardId) {
    return getGeoViewDashboards().find(item => item.id === dashboardId) || null;
}

function getFileCategory(fileName = "") {
    const name = String(fileName).toLowerCase();
    if (/\.(pbix|pbit)$/.test(name)) return "powerbi";
    if (/\.(xlsx|xls|xlsm|csv)$/.test(name)) return "spreadsheet";
    if (/\.(png|jpg|jpeg|webp|gif|tif|tiff)$/.test(name)) return "image";
    if (/\.(pdf|docx|pptx|odt)$/.test(name)) return "document";
    if (/\.(geojson|json|qmd|html|htm)$/.test(name)) return "technical";
    return "other";
}

function formatFileSize(bytes) {
    const numeric = Number(bytes);
    if (!Number.isFinite(numeric) || numeric <= 0) return "-";
    if (numeric < 1024) return `${numeric} B`;
    if (numeric < 1024 * 1024) return `${(numeric / 1024).toFixed(1)} KB`;
    return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
}

function getGeoViewFileMeta(file) {
    const relativePath = file.webkitRelativePath || file.relativePath || file.name;
    return {
        id: Math.random().toString(36).slice(2, 11),
        name: file.name,
        relativePath,
        size: file.size || 0,
        type: file.type || "",
        category: getFileCategory(file.name),
        lastModified: Number(file.lastModified || 0),
        fingerprint: `${relativePath}|${Number(file.size || 0)}|${Number(file.lastModified || 0)}`,
        importedAt: new Date().toISOString()
    };
}

function matchGeoViewDashboardFromFile(meta) {
    const path = normalizeComparable(meta.relativePath || meta.name);
    return getGeoViewDashboards().find(dashboard => {
        const folder = normalizeComparable(dashboard.folder);
        const title = normalizeComparable(dashboard.title);
        const id = normalizeComparable(dashboard.id);
        return path.includes(folder) || path.includes(title) || path.includes(id);
    })?.id || null;
}

function addGeoViewFileToDashboard(dashboardId, fileId) {
    if (!dashboardId || !fileId) return;
    if (!geoViewState.dashboardFiles[dashboardId]) geoViewState.dashboardFiles[dashboardId] = [];
    if (!geoViewState.dashboardFiles[dashboardId].includes(fileId)) {
        geoViewState.dashboardFiles[dashboardId].push(fileId);
    }
}

function openGeoViewFilePicker(dashboardId = null) {
    geoViewActiveDashboardId = dashboardId;
    const input = document.getElementById("geoview-file-input");
    if (!input) return;
    input.click();
}

function openGeoViewFolderPicker() {
    geoViewActiveDashboardId = null;
    const input = document.getElementById("geoview-folder-input");
    if (!input) return;
    input.click();
}

function handleGeoViewFiles(fileList, dashboardId = null) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const metas = files.map(getGeoViewFileMeta);
    geoViewState.importedFiles.push(...metas);

    metas.forEach(meta => {
        const matchedDashboard = dashboardId || matchGeoViewDashboardFromFile(meta);
        if (matchedDashboard) addGeoViewFileToDashboard(matchedDashboard, meta.id);
    });

    saveGeoViewState();
    renderGeoViewPanel();
    const linked = metas.filter(meta => dashboardId || matchGeoViewDashboardFromFile(meta)).length;
    showToast(`${metas.length} arquivo(s) conectado(s) ao GeoView${linked ? `, ${linked} associado(s) a dashboards.` : "."}`);
}

function initializeGeoViewInputs() {
    const fileInput = document.getElementById("geoview-file-input");
    const folderInput = document.getElementById("geoview-folder-input");
    const mapInput = document.getElementById("geoview-map-input");

    if (fileInput && fileInput.dataset.bound !== "true") {
        fileInput.addEventListener("change", event => {
            handleGeoViewFiles(event.target.files, geoViewActiveDashboardId);
            event.target.value = "";
            geoViewActiveDashboardId = null;
        });
        fileInput.dataset.bound = "true";
    }

    if (folderInput && folderInput.dataset.bound !== "true") {
        folderInput.addEventListener("change", event => {
            handleGeoViewFiles(event.target.files, null);
            event.target.value = "";
        });
        folderInput.dataset.bound = "true";
    }

    if (mapInput && mapInput.dataset.bound !== "true") {
        mapInput.addEventListener("change", event => {
            handleGeoViewMapFile(event.target.files?.[0]);
            event.target.value = "";
        });
        mapInput.dataset.bound = "true";
    }
}

function loadCorporateSyncState() {
    try {
        const state = JSON.parse(localStorage.getItem(CORPORATE_SYNC_STATE_KEY) || "{}");
        corporateSyncSnapshot = state.snapshot && typeof state.snapshot === "object" ? state.snapshot : {};
    } catch (error) {
        corporateSyncSnapshot = {};
    }
}

function saveCorporateSyncState() {
    localStorage.setItem(CORPORATE_SYNC_STATE_KEY, JSON.stringify({
        sourcePath: CORPORATE_SYNC_PATH,
        snapshot: corporateSyncSnapshot,
        updatedAt: new Date().toISOString()
    }));
}

function setCorporateSyncStatus(state, files = null, changes = null, feed = null) {
    setTextContent("corporate-sync-state", state);
    if (files !== null) setTextContent("corporate-sync-files", Number(files).toLocaleString("pt-BR"));
    if (changes !== null) setTextContent("corporate-sync-changes", Number(changes).toLocaleString("pt-BR"));
    if (state !== "Aguardando autorização") setTextContent("corporate-sync-last", formatDateTimeBR(new Date()));
    if (feed !== null) setTextContent("corporate-sync-feed", feed);
}

function isCorporateSyncFile(name = "") {
    return /\.(xlsx?|xlsm|csv|json|geojson|kml|kmz|pbix|pbit|pdf|docx?|pptx|png|jpe?g|webp|html?)$/i.test(name);
}

async function collectCorporateDirectoryFiles(directoryHandle, prefix = "", output = []) {
    if (!directoryHandle || output.length >= 5000) return output;
    for await (const [name, entry] of directoryHandle.entries()) {
        if (output.length >= 5000) break;
        const relativePath = prefix ? `${prefix}/${name}` : name;
        if (entry.kind === "directory") {
            await collectCorporateDirectoryFiles(entry, relativePath, output);
        } else if (isCorporateSyncFile(name)) {
            try {
                const file = await entry.getFile();
                output.push({
                    name: file.name,
                    relativePath,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                });
            } catch (error) {
                console.warn("Arquivo corporativo não pôde ser lido:", relativePath, error);
            }
        }
    }
    return output;
}

function ingestCorporateSyncFiles(files) {
    const existingByFingerprint = new Map((geoViewState.importedFiles || []).map(file => [file.fingerprint, file]));
    const existingByPath = new Map((geoViewState.importedFiles || []).map(file => [normalizeComparable(file.relativePath), file]));
    const nextSnapshot = {};
    const changes = [];

    files.forEach(file => {
        const meta = getGeoViewFileMeta(file);
        nextSnapshot[meta.relativePath] = meta.fingerprint;
        const previousFingerprint = corporateSyncSnapshot[meta.relativePath];
        if (previousFingerprint === meta.fingerprint) return;
        changes.push(meta);
        const previous = existingByPath.get(normalizeComparable(meta.relativePath));
        if (previous) {
            geoViewState.importedFiles = geoViewState.importedFiles.filter(item => item.id !== previous.id);
            Object.keys(geoViewState.dashboardFiles || {}).forEach(dashboardId => {
                geoViewState.dashboardFiles[dashboardId] = (geoViewState.dashboardFiles[dashboardId] || []).filter(id => id !== previous.id);
            });
        } else if (existingByFingerprint.has(meta.fingerprint)) {
            return;
        }
        geoViewState.importedFiles.push(meta);
        const matchedDashboard = matchGeoViewDashboardFromFile(meta);
        if (matchedDashboard) addGeoViewFileToDashboard(matchedDashboard, meta.id);
    });

    corporateSyncSnapshot = nextSnapshot;
    saveCorporateSyncState();
    if (changes.length) saveGeoViewState();
    return changes;
}

async function scanCorporateSyncFolder(manual = false) {
    if (!navigator.onLine || !isOnline) {
        setCorporateSyncStatus("Offline", null, null, "A verificação será retomada quando a conexão voltar.");
        if (manual) showToast("A pasta será verificada quando o app estiver online.", "warning");
        return;
    }
    if (!corporateSyncDirectoryHandle && !corporateSyncSessionFiles.length) {
        if (manual) {
            showToast("Conecte a pasta corporativa antes de verificar.", "warning");
            connectCorporateSyncFolder();
        }
        return;
    }
    setCorporateSyncStatus("Verificando...");
    try {
        const files = corporateSyncDirectoryHandle
            ? await collectCorporateDirectoryFiles(corporateSyncDirectoryHandle)
            : corporateSyncSessionFiles;
        const changes = ingestCorporateSyncFiles(files);
        const recent = changes.slice(0, 4).map(file => file.name).join(", ");
        setCorporateSyncStatus(
            "Monitoramento ativo",
            files.length,
            changes.length,
            changes.length
                ? `${changes.length} arquivo(s) novo(s) ou alterado(s) integrado(s) ao GeoView: ${recent}${changes.length > 4 ? "..." : ""}`
                : "Nenhuma alteração desde a última verificação."
        );
        if (changes.length) {
            renderGeoViewPanel();
            if (manual) showToast(`${changes.length} arquivo(s) atualizado(s) no GeoView.`);
        } else if (manual) {
            showToast("A base corporativa já está atualizada.");
        }
    } catch (error) {
        console.warn("Falha na verificação da pasta corporativa:", error);
        setCorporateSyncStatus("Acesso interrompido", null, null, "Reconecte a pasta para continuar o monitoramento.");
        if (manual) showToast("Não foi possível ler a pasta corporativa.", "warning");
    }
}

async function connectCorporateSyncFolder() {
    try {
        if ("showDirectoryPicker" in window && !window.MDSyncAndroid) {
            corporateSyncDirectoryHandle = await window.showDirectoryPicker({ mode: "read" });
            corporateSyncSessionFiles = [];
            setCorporateSyncStatus("Pasta autorizada", 0, 0, `Conectado a ${corporateSyncDirectoryHandle.name}.`);
            startCorporateSyncMonitor();
            await scanCorporateSyncFolder(true);
            return;
        }
        document.getElementById("corporate-sync-folder-input")?.click();
    } catch (error) {
        if (error?.name !== "AbortError") {
            console.warn("Falha ao conectar pasta corporativa:", error);
            showToast("Não foi possível autorizar a pasta.", "warning");
        }
    }
}

function startCorporateSyncMonitor() {
    if (corporateSyncTimer) clearInterval(corporateSyncTimer);
    corporateSyncTimer = setInterval(() => scanCorporateSyncFolder(false), CORPORATE_SYNC_INTERVAL_MS);
}

function initializeCorporateSync() {
    loadCorporateSyncState();
    setTextContent("corporate-sync-path", CORPORATE_SYNC_PATH);
    const input = document.getElementById("corporate-sync-folder-input");
    if (input && input.dataset.bound !== "true") {
        input.addEventListener("change", event => {
            corporateSyncSessionFiles = Array.from(event.target.files || [])
                .filter(file => isCorporateSyncFile(file.name))
                .map(file => ({
                    name: file.name,
                    relativePath: file.webkitRelativePath || file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }));
            event.target.value = "";
            setCorporateSyncStatus("Pasta autorizada", corporateSyncSessionFiles.length, 0, "Arquivos disponibilizados pelo seletor do dispositivo.");
            startCorporateSyncMonitor();
            scanCorporateSyncFolder(true);
        });
        input.dataset.bound = "true";
    }
    window.addEventListener("online", () => {
        isOnline = true;
        scanCorporateSyncFolder(false);
    });
    window.addEventListener("offline", () => {
        isOnline = false;
        setCorporateSyncStatus("Offline", null, null, "Monitoramento pausado até a conexão retornar.");
    });
}

function getGeoViewSummary(dashboards = getGeoViewDashboards()) {
    const catalog = dashboards;
    const visibleIds = new Set(catalog.map(item => item.id));
    const associatedVisibleFileIds = new Set();
    Object.entries(geoViewState.dashboardFiles || {}).forEach(([dashboardId, ids]) => {
        if (!visibleIds.has(dashboardId)) return;
        (ids || []).forEach(id => associatedVisibleFileIds.add(id));
    });
    const imported = geoViewState.importedFiles || [];
    const countImported = category => imported.filter(file => associatedVisibleFileIds.has(file.id) && file.category === category).length;
    const catalogPowerBi = catalog.reduce((total, item) => total + Number(item.powerbi || 0), 0);
    const catalogExcel = catalog.reduce((total, item) => total + Number(item.excel || 0), 0);
    const catalogEvidence = catalog.reduce((total, item) => total + Number(item.images || 0), 0);
    const catalogDocuments = catalog.reduce((total, item) => total + Number(item.pdfs || 0), 0);

    return {
        dashboards: catalog.length,
        powerbi: catalogPowerBi + countImported("powerbi"),
        excel: catalogExcel + countImported("spreadsheet"),
        evidence: catalogEvidence + countImported("image"),
        documents: catalogDocuments + countImported("document") + countImported("technical")
    };
}

function getGeoViewDashboardFiles(dashboardId) {
    const ids = geoViewState.dashboardFiles?.[dashboardId] || [];
    const filesById = new Map((geoViewState.importedFiles || []).map(file => [file.id, file]));
    return ids.map(id => filesById.get(id)).filter(Boolean);
}

function getGeoViewDashboardContentCount(dashboard, contentType) {
    const associatedFiles = getGeoViewDashboardFiles(dashboard.id);
    const countFiles = category => associatedFiles.filter(file => file.category === category).length;
    const evidenceCount = Number(dashboard.images || 0);
    const documentCount = Number(dashboard.pdfs || 0);

    if (contentType === "powerbi") return Number(dashboard.powerbi || 0) + countFiles("powerbi");
    if (contentType === "spreadsheet") return Number(dashboard.excel || 0) + countFiles("spreadsheet");
    if (contentType === "evidence") return evidenceCount + countFiles("image");
    if (contentType === "document") return documentCount + countFiles("document") + countFiles("technical");
    return getGeoViewDashboardTotal(dashboard);
}

function getGeoViewFilteredDashboards() {
    const search = normalizeComparable(geoViewFilters.search || "");
    const filtered = getGeoViewDashboards().filter(dashboard => {
        if (geoViewFilters.area !== "all" && dashboard.area !== geoViewFilters.area) return false;
        if (geoViewFilters.content !== "all" && getGeoViewDashboardContentCount(dashboard, geoViewFilters.content) <= 0) return false;
        if (geoViewFilters.recency !== "all" && getGeoViewRecencyBucket(dashboard) !== geoViewFilters.recency) return false;
        if (!search) return true;

        const files = getGeoViewDashboardFiles(dashboard.id);
        const haystack = normalizeComparable([
            dashboard.title,
            dashboard.area,
            dashboard.folder,
            dashboard.description,
            dashboard.content,
            ...files.map(file => file.name),
            ...files.map(file => file.relativePath)
        ].join(" "));
        return haystack.includes(search);
    });

    return filtered.sort((a, b) => {
        if (geoViewFilters.sort === "size") return getGeoViewDashboardTotal(b) - getGeoViewDashboardTotal(a);
        if (geoViewFilters.sort === "title") return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        if (geoViewFilters.sort === "area") {
            return String(a.area || "").localeCompare(String(b.area || ""), "pt-BR", { sensitivity: "base" })
                || a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }
        return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
    });
}

function populateGeoViewDynamicControls() {
    const areaSelect = document.getElementById("geoview-area-filter");
    if (areaSelect) {
        const current = geoViewFilters.area;
        const areas = Array.from(new Set(getGeoViewDashboards().map(item => item.area || "Sem área")))
            .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
        areaSelect.innerHTML = `<option value="all">Todas as áreas</option>`
            + areas.map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join("");
        areaSelect.value = areas.includes(current) ? current : "all";
        geoViewFilters.area = areaSelect.value;
    }

    [
        ["geoview-area-filter", "area"],
        ["geoview-content-filter", "content"],
        ["geoview-recency-filter", "recency"],
        ["geoview-sort-filter", "sort"]
    ].forEach(([id, key]) => {
        const control = document.getElementById(id);
        if (!control) return;
        control.value = geoViewFilters[key] || "all";
        if (control.dataset.bound === "true") return;
        control.addEventListener("change", event => setGeoViewFilter(key, event.target.value));
        control.dataset.bound = "true";
    });

    const search = document.getElementById("geoview-search-filter");
    if (search) {
        search.value = geoViewFilters.search || "";
        if (search.dataset.bound !== "true") {
            search.addEventListener("input", event => {
                geoViewFilters.search = event.target.value || "";
                geoViewShowAllDashboards = false;
                renderGeoViewPanel();
            });
            search.dataset.bound = "true";
        }
    }
}

function setGeoViewFilter(key, value) {
    geoViewFilters[key] = value || "all";
    geoViewShowAllDashboards = false;
    renderGeoViewPanel();
}

function setGeoViewFilterFromElement(element) {
    const key = element?.dataset?.filterType;
    if (!key) return;
    setGeoViewFilter(key, element.dataset.filterValue || "all");
}

function handleGeoViewChartKey(event, element) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setGeoViewFilterFromElement(element);
}

function clearGeoViewFilters() {
    geoViewFilters = {
        area: "all",
        content: "all",
        recency: "all",
        sort: "recent",
        search: ""
    };
    geoViewShowAllDashboards = false;
    renderGeoViewPanel();
}

function getGeoViewTooltip(dashboard, files) {
    return [
        dashboard.description,
        `Conteudo: ${dashboard.content}`,
        `Power BI: ${dashboard.powerbi || 0} | Planilhas: ${dashboard.excel || 0} | Imagens: ${dashboard.images || 0} | PDFs: ${dashboard.pdfs || 0}`,
        `Associacoes locais: ${files.length}`,
        `Atualizado: ${formatDateTimeBR(dashboard.lastUpdated)}`
    ].filter(Boolean).join("\n");
}

function getGeoViewCatalogTotal(dashboard) {
    return Number(dashboard.totalFiles || 0)
        || Number(dashboard.powerbi || 0)
        + Number(dashboard.excel || 0)
        + Number(dashboard.images || 0)
        + Number(dashboard.pdfs || 0);
}

function getGeoViewDashboardTotal(dashboard) {
    return getGeoViewCatalogTotal(dashboard) + getGeoViewDashboardFiles(dashboard.id).length;
}

function getGeoViewRecencyBucket(dashboard) {
    const date = new Date(dashboard.lastUpdated);
    if (Number.isNaN(date.getTime())) return "Sem data";
    const days = Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));
    if (days <= 7) return "7 dias";
    if (days <= 30) return "30 dias";
    if (days <= 90) return "90 dias";
    return "+90 dias";
}

function renderLightBarChart(containerId, rows, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const maxValue = Math.max(1, ...rows.map(row => Number(row.value || 0)));
    container.innerHTML = rows.length
        ? rows.map(row => {
            const value = Number(row.value || 0);
            const percent = Math.max(4, Math.round((value / maxValue) * 100));
            const label = escapeHtml(row.label);
            const detail = escapeHtml(row.detail || `${value.toLocaleString("pt-BR")} item(ns)`);
            const click = row.filterType
                ? ` data-filter-type="${escapeHtml(row.filterType)}" data-filter-value="${escapeHtml(row.filterValue ?? row.label)}" onclick="setGeoViewFilterFromElement(this)" onkeydown="handleGeoViewChartKey(event, this)"`
                : "";
            return `
                <div class="geoview-bar-row geoview-info ${row.filterType ? "is-clickable" : ""}" tabindex="0" data-tooltip="${detail}"${click}>
                    <span>${label}</span>
                    <div class="geoview-bar-track"><i style="width:${percent}%"></i></div>
                    <strong>${value.toLocaleString("pt-BR")}</strong>
                </div>
            `;
        }).join("")
        : `<div class="geoview-empty-link">${escapeHtml(options.empty || "Sem dados para exibir.")}</div>`;
}

function renderGeoViewContentStack(summary) {
    const container = document.getElementById("geoview-chart-content");
    if (!container) return;

    const rows = [
        { key: "powerbi", label: "Power BI", value: summary.powerbi, color: "#2273aa" },
        { key: "spreadsheet", label: "Planilhas", value: summary.excel, color: "#36d57b" },
        { key: "evidence", label: "Evidências", value: summary.evidence, color: "#f59e0b" },
        { key: "document", label: "Documentos", value: summary.documents, color: "#8b5cf6" }
    ];
    const total = Math.max(1, rows.reduce((sum, row) => sum + row.value, 0));
    setTextContent("geoview-chart-content-total", `${total.toLocaleString("pt-BR")} itens`);
    container.innerHTML = `
        <div class="geoview-stack-track">
            ${rows.map(row => {
                const width = Math.max(2, (row.value / total) * 100);
                return `<i style="width:${width}%; background:${row.color}" title="${escapeHtml(row.label)}"></i>`;
            }).join("")}
        </div>
        <div class="geoview-stack-legend">
            ${rows.map(row => `
                <span class="is-clickable" tabindex="0" data-filter-type="content" data-filter-value="${escapeHtml(row.key)}" onclick="setGeoViewFilterFromElement(this)" onkeydown="handleGeoViewChartKey(event, this)"><i style="background:${row.color}"></i>${escapeHtml(row.label)} <b>${Number(row.value || 0).toLocaleString("pt-BR")}</b></span>
            `).join("")}
        </div>
    `;
}

function renderGeoViewRecencyChart(dashboards) {
    const order = ["7 dias", "30 dias", "90 dias", "+90 dias", "Sem data"];
    const counts = dashboards.reduce((acc, dashboard) => {
        const bucket = getGeoViewRecencyBucket(dashboard);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
    }, {});
    const rows = order.map(label => ({
        label,
        value: counts[label] || 0,
        filterType: "recency",
        filterValue: label
    }));
    const newest = dashboards
        .map(dashboard => new Date(dashboard.lastUpdated))
        .filter(date => !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a)[0];

    setTextContent("geoview-chart-recency-total", newest ? `Último: ${formatDateBRShort(newest)}` : "-");
    renderLightBarChart("geoview-chart-recency", rows, { empty: "Sem atualização registrada." });
}

function renderGeoViewCharts(dashboards, summary) {
    const areaCounts = dashboards.reduce((acc, dashboard) => {
        const area = dashboard.area || "Sem área";
        acc[area] = (acc[area] || 0) + 1;
        return acc;
    }, {});
    const areaRows = Object.entries(areaCounts)
        .map(([label, value]) => ({
            label,
            value,
            detail: `${value} dashboard(s) em ${label}. Clique para filtrar esta area.`,
            filterType: "area",
            filterValue: label
        }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"))
        .slice(0, 8);
    setTextContent("geoview-chart-area-total", `${Object.keys(areaCounts).length.toLocaleString("pt-BR")} áreas`);
    renderLightBarChart("geoview-chart-area", areaRows);

    renderGeoViewContentStack(summary);

    const topRows = dashboards
        .map(dashboard => ({
            label: dashboard.title,
            value: getGeoViewDashboardTotal(dashboard),
            detail: `${dashboard.title}\n${dashboard.description}\nConteúdo: ${dashboard.content}\nClique para abrir o drilldown deste dashboard.`,
            filterType: "search",
            filterValue: dashboard.title
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    renderLightBarChart("geoview-chart-top", topRows);
    renderGeoViewRecencyChart(dashboards);
}

function getGeoViewMiniChart(dashboard) {
    const powerbi = Number(dashboard.powerbi || 0);
    const excel = Number(dashboard.excel || 0);
    const evidence = Number(dashboard.images || 0) + Number(dashboard.pdfs || 0);
    const documents = Number(dashboard.pdfs || 0);
    const total = Math.max(1, powerbi + excel + evidence);
    const maxTotal = Math.max(1, ...getGeoViewDashboards().map(item => getGeoViewDashboardTotal(item)));
    const dashboardTotal = getGeoViewDashboardTotal(dashboard);
    const volumePercent = Math.max(4, Math.min(100, (dashboardTotal / maxTotal) * 100));
    const daysOld = dashboard.lastUpdated
        ? Math.max(0, Math.round((Date.now() - new Date(dashboard.lastUpdated).getTime()) / 86400000))
        : null;
    const freshnessPercent = daysOld === null
        ? 6
        : Math.max(6, Math.min(100, 100 - Math.min(daysOld, 120) / 120 * 100));
    const freshnessClass = daysOld === null
        ? "unknown"
        : daysOld <= 7
            ? "fresh"
            : daysOld <= 30
                ? "recent"
                : "old";
    const segments = [
        { label: "PBIX", value: powerbi, color: "#2273aa" },
        { label: "Bases", value: excel, color: "#36d57b" },
        { label: "Evidências", value: evidence, color: "#f59e0b" },
        { label: "Docs", value: documents, color: "#8b5cf6" }
    ];

    return `
        <div class="geoview-mini-chart" aria-label="Resumo visual do dashboard">
            <div class="geoview-mini-title">
                <span>Resumo visual</span>
                <strong>${dashboardTotal.toLocaleString("pt-BR")} item(ns)</strong>
            </div>
            <div class="geoview-mini-track">
                ${segments.map(segment => {
                    const width = segment.value ? Math.max(4, (segment.value / total) * 100) : 0;
                    return `<i style="width:${width}%; background:${segment.color}" title="${escapeHtml(segment.label)}"></i>`;
                }).join("")}
            </div>
            <div class="geoview-mini-legend">
                ${segments.filter(segment => segment.value > 0).map(segment => `<span><i style="background:${segment.color}"></i>${escapeHtml(segment.label)} <b>${segment.value.toLocaleString("pt-BR")}</b></span>`).join("")}
            </div>
            <div class="geoview-mini-bars">
                <div>
                    <span>Volume relativo</span>
                    <em>${dashboardTotal.toLocaleString("pt-BR")}</em>
                    <div class="geoview-mini-meter"><i style="width:${volumePercent}%"></i></div>
                </div>
                <div class="${freshnessClass}">
                    <span>Atualização</span>
                    <em>${daysOld === null ? "Sem data" : daysOld <= 0 ? "Hoje" : `${daysOld} dia(s)`}</em>
                    <div class="geoview-mini-meter"><i style="width:${freshnessPercent}%"></i></div>
                </div>
            </div>
        </div>
    `;
}

function toggleGeoViewFullRender() {
    geoViewShowAllDashboards = !geoViewShowAllDashboards;
    renderGeoViewPanel();
}

function renderGeoViewDrilldownTable(dashboards) {
    const tbody = document.getElementById("geoview-dashboard-table-body");
    if (!tbody) return;

    setTextContent("geoview-drilldown-count", `${dashboards.length.toLocaleString("pt-BR")} dashboards`);
    if (!dashboards.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-secondary">Nenhum dashboard encontrado para os filtros atuais.</td></tr>`;
        return;
    }

    tbody.innerHTML = dashboards.map(dashboard => {
        const files = getGeoViewDashboardFiles(dashboard.id);
        const evidenceCount = Number(dashboard.images || 0) + Number(dashboard.pdfs || 0);
        return `
            <tr>
                <td><strong>${escapeHtml(dashboard.title)}</strong><br><small>${escapeHtml(dashboard.folder)}</small></td>
                <td>${escapeHtml(dashboard.area || "-")}</td>
                <td>${Number(dashboard.powerbi || 0).toLocaleString("pt-BR")}</td>
                <td>${Number(dashboard.excel || 0).toLocaleString("pt-BR")}</td>
                <td>${evidenceCount.toLocaleString("pt-BR")}</td>
                <td>${getGeoViewDashboardTotal(dashboard).toLocaleString("pt-BR")}</td>
                <td>${formatDateBRShort(dashboard.lastUpdated)}</td>
                <td>${files.length ? `${files.length} local(is)` : "Sem anexo local"}</td>
            </tr>
        `;
    }).join("");
}

function renderPilhasFilterGroup(containerId, values, selected, key) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = values.map(value => {
        const label = key === "month" ? (PILHAS_INDICATOR_MODEL.monthLabels[value] || value) : value;
        const active = value === selected;
        return `
            <button type="button" class="${active ? "is-active" : ""}" onclick="setPilhasIndicatorFilter('${key}', '${value}')">
                ${escapeHtml(label)}
            </button>
        `;
    }).join("");
}

function setPilhasIndicatorFilter(key, value) {
    if (!Object.prototype.hasOwnProperty.call(pilhasIndicatorFilters, key)) return;
    pilhasIndicatorFilters[key] = value;
    renderPilhasIndicatorDashboard();
}

function setPilhasStructureFilter(structure) {
    const canonical = getCanonicalStructureName(structure);
    pilhasIndicatorFilters.structure = canonical;
    pilhasIndicatorFilters.instrumentId = null;
    geoSpatialState.selectedStructure = canonical;
    earthMapView.focusedInstrumentId = null;
    saveGeospatialState();
    const earthSelect = document.getElementById("earth-structure-select");
    if (earthSelect && Array.from(earthSelect.options).some(option => option.value === canonical)) {
        earthSelect.value = canonical;
    }
    const geoViewSelect = document.getElementById("geoview-map-structure");
    if (geoViewSelect && Array.from(geoViewSelect.options).some(option => option.value === canonical)) {
        geoViewSelect.value = canonical;
    }
    renderPilhasIndicatorDashboard();
    renderEarthMapPanel();
    renderGeoViewMaps();
}

function setPilhasInstrumentFilter(instrumentId) {
    pilhasIndicatorFilters.instrumentId = instrumentId || null;
    renderPilhasInstrumentChart();
}

function getPilhasMetricRows() {
    const monthIndex = PILHAS_INDICATOR_MODEL.months.indexOf(pilhasIndicatorFilters.month);
    return (GEOVIEW_OPERATIONAL.pileMetrics || []).filter(row => {
        const date = new Date(row.analysisDate);
        return !Number.isNaN(date.getTime())
            && String(date.getFullYear()) === pilhasIndicatorFilters.year
            && date.getMonth() === monthIndex
            && normalizeComparable(row.analysisType) === normalizeComparable(pilhasIndicatorFilters.analysis);
    });
}

function getSelectedPilhasMetricName() {
    return PILHAS_STRUCTURE_ALIASES[pilhasIndicatorFilters.structure] || pilhasIndicatorFilters.structure;
}

function getPilhasChartDefinition(chartKey) {
    const definitions = {
        geometria: {
            elementId: "pilhas-chart-geometria",
            field: "geometry",
            unit: "%",
            decimals: 1,
            max: 90,
            target: 70,
            targetLabel: "70%",
            targetMode: "minimum"
        },
        declividade: {
            elementId: "pilhas-chart-declividade",
            field: "slopeConformity",
            unit: "%",
            decimals: 1,
            max: 55,
            target: 30,
            targetLabel: "30%",
            targetMode: "maximum"
        },
        empocamento: {
            elementId: "pilhas-chart-empocamento",
            field: "ponding",
            unit: "%",
            decimals: 1,
            max: 18,
            target: 5,
            targetLabel: "5%",
            targetMode: "maximum"
        },
        fator: {
            elementId: "pilhas-chart-fator",
            field: "safetyFactor",
            unit: "",
            decimals: 2,
            max: 2,
            target: 1.3,
            targetLabel: "1,30",
            targetMode: "minimum"
        },
        planoLavra: {
            elementId: "pilhas-chart-plano-lavra",
            field: "minePlanSafetyFactor",
            unit: "",
            decimals: 2,
            max: 2,
            target: null,
            targetLabel: "",
            targetMode: "minimum"
        }
    };
    return definitions[chartKey];
}

function getPilhasRealRows(chartKey) {
    const chart = getPilhasChartDefinition(chartKey);
    if (!chart) return [];
    return getPilhasMetricRows()
        .filter(row => Number.isFinite(Number(row[chart.field])))
        .map(row => ({
            label: row.pile,
            value: Number(row[chart.field]),
            selected: normalizeComparable(row.pile) === normalizeComparable(getSelectedPilhasMetricName()),
            source: row
        }))
        .sort((a, b) => b.value - a.value);
}

function isPilhasIndicatorOk(value, chart) {
    if (chart.target == null) return value >= 1.3;
    if (chart.targetMode === "maximum") return value < chart.target;
    return value >= chart.target;
}

function formatPilhasIndicatorValue(value, chart) {
    const formatted = Number(value || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: chart.decimals,
        maximumFractionDigits: chart.decimals
    });
    return chart.unit === "%" ? `${formatted}%` : formatted;
}

function getPilhasIndicatorTooltip(label, value, chart) {
    const target = chart.target == null ? null : chart.targetLabel;
    return [
        label,
        `Valor: ${formatPilhasIndicatorValue(value, chart)}`,
        target ? `Referencia: ${target}` : null,
        `Ano: ${pilhasIndicatorFilters.year}`,
        `Mes: ${PILHAS_INDICATOR_MODEL.monthLabels[pilhasIndicatorFilters.month] || pilhasIndicatorFilters.month}`,
        `Analise: ${pilhasIndicatorFilters.analysis}`,
        "Fonte: Indicadores_Pilhas.xlsx"
    ].filter(Boolean).join("\n");
}

function renderPilhasBarChart(chartKey) {
    const chart = getPilhasChartDefinition(chartKey);
    const container = document.getElementById(chart?.elementId);
    if (!chart || !container) return;

    const rows = getPilhasRealRows(chartKey);
    if (!rows.length) {
        container.innerHTML = `
            <div class="pilhas-chart-empty is-visible">
                Sem indicador de ${escapeHtml(pilhasIndicatorFilters.analysis.toLowerCase())} para o período selecionado.
            </div>
        `;
        return;
    }
    const targetBottom = chart.target == null ? null : Math.max(0, Math.min(100, (chart.target / chart.max) * 100));
    const isSingle = rows.length === 1;
    const bars = rows.map(row => {
        const value = Number(row.value || 0);
        const height = Math.max(3, Math.min(100, (value / chart.max) * 100));
        const ok = isPilhasIndicatorOk(value, chart);
        const tooltip = escapeHtml(getPilhasIndicatorTooltip(row.label, value, chart));
        return `
            <div class="pilhas-bi-bar-group geoview-info ${row.selected ? "is-selected" : ""}" tabindex="0" data-tooltip="${tooltip}">
                <span class="pilhas-bi-value">${escapeHtml(formatPilhasIndicatorValue(value, chart))}</span>
                <i class="pilhas-bi-bar ${ok ? "is-good" : "is-alert"}" style="height:${height}%"></i>
                <span class="pilhas-bi-axis-label">${escapeHtml(row.label)}</span>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div class="pilhas-bi-plot ${isSingle ? "is-single" : ""}" style="--pilhas-target-bottom:${targetBottom ?? 0}%;">
            ${chart.target == null ? "" : `
                <span class="pilhas-bi-target-line"></span>
                <span class="pilhas-bi-target-label">${escapeHtml(chart.targetLabel)}</span>
            `}
            <div class="pilhas-bi-bars" style="grid-template-columns: repeat(${Math.max(1, rows.length)}, minmax(0, 1fr));">
                ${bars}
            </div>
        </div>
    `;
}

function getGeoViewStructureCoordinate(structure) {
    const preferredCoordinate = getPreferredStructureCoordinate(structure);
    if (preferredCoordinate) return preferredCoordinate;
    const pileName = PILHAS_STRUCTURE_ALIASES[structure] || structure;
    const fromSheet = (GEOVIEW_OPERATIONAL.structureCoordinates || []).find(item =>
        normalizeComparable(item.name) === normalizeComparable(pileName)
    );
    if (fromSheet && Number.isFinite(Number(fromSheet.latitude)) && Number.isFinite(Number(fromSheet.longitude))) {
        return {
            latitude: Number(fromSheet.latitude),
            longitude: Number(fromSheet.longitude)
        };
    }
    const layer = GEOVIEW_OPERATIONAL.defaultLayers?.[structure]
        || Object.entries(GEOVIEW_OPERATIONAL.defaultLayers || {}).find(([key]) =>
            normalizeComparable(key) === normalizeComparable(structure)
        )?.[1];
    const point = layer?.features?.find(feature => feature.type === "point")?.coordinates?.[0];
    return point ? { latitude: Number(point.latitude), longitude: Number(point.longitude) } : null;
}

function renderPilhasLocationMap() {
    const container = document.getElementById("pilhas-location-map");
    if (!container) return;

    const metrics = getPilhasRealRows("geometria");
    const geometryByLabel = new Map(metrics.map(row => [normalizeComparable(row.label), row.value]));
    const pointRows = getStructureList()
        .map(structure => ({ structure, coordinate: getGeoViewStructureCoordinate(structure) }))
        .filter(item => item.coordinate);
    const allLongitudes = pointRows.map(item => item.coordinate.longitude);
    const allLatitudes = pointRows.map(item => item.coordinate.latitude);
    const minLon = Math.min(...allLongitudes);
    const maxLon = Math.max(...allLongitudes);
    const minLat = Math.min(...allLatitudes);
    const maxLat = Math.max(...allLatitudes);
    const points = pointRows.map((item, index) => {
        const x = 7 + ((item.coordinate.longitude - minLon) / (maxLon - minLon || 1)) * 86;
        const y = 8 + ((maxLat - item.coordinate.latitude) / (maxLat - minLat || 1)) * 84;
        const metricName = PILHAS_STRUCTURE_ALIASES[item.structure] || item.structure;
        const value = geometryByLabel.get(normalizeComparable(metricName));
        const selected = normalizeComparable(item.structure) === normalizeComparable(pilhasIndicatorFilters.structure);
        const tooltip = escapeHtml([
            item.structure,
            value == null ? null : `Geometria: ${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
            `Ano: ${pilhasIndicatorFilters.year}`,
            `Mes: ${PILHAS_INDICATOR_MODEL.monthLabels[pilhasIndicatorFilters.month] || pilhasIndicatorFilters.month}`,
            `Analise: ${pilhasIndicatorFilters.analysis}`
        ].filter(Boolean).join("\n"));
        const colors = ["#8b5cf6", "#22a5e8", "#e657b7", "#2447e8", "#e33658", "#ff7c3b"];
        return `<button type="button" class="pilhas-map-point geoview-info ${selected ? "is-selected" : ""}" style="left:${x}%; top:${y}%; --point-color:${colors[index % colors.length]};" data-tooltip="${tooltip}" aria-label="${escapeHtml(item.structure)}" onclick="setPilhasStructureFilter('${escapeHtml(item.structure)}')"></button>`;
    }).join("");

    container.innerHTML = `
        ${points}
        <span class="pilhas-map-credit">Base aérea operacional / pontos KMZ</span>
    `;
}

function getDistanceMeters(origin, destination) {
    if (!origin || !destination) return null;
    const lat1 = Number(origin.latitude);
    const lon1 = Number(origin.longitude);
    const lat2 = Number(destination.latitude);
    const lon2 = Number(destination.longitude);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
    const radians = value => value * Math.PI / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceMeters(distance) {
    if (!Number.isFinite(Number(distance))) return "-";
    return distance < 1000
        ? `${Math.round(distance).toLocaleString("pt-BR")} m`
        : `${(distance / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

function renderPilhasLocationMap() {
    const container = document.getElementById("pilhas-location-map");
    if (!container) return;

    const metrics = getPilhasRealRows("geometria");
    const geometryByLabel = new Map(metrics.map(row => [normalizeComparable(row.label), row.value]));
    const pointRows = getStructureList()
        .map(structure => ({ structure, coordinate: getGeoViewStructureCoordinate(structure) }))
        .filter(item => item.coordinate);
    if (!pointRows.length) {
        container.innerHTML = `<div class="georef-map-empty"><strong>Sem coordenadas georreferenciadas.</strong></div>`;
        setTextContent("pilhas-map-live-status", "Nenhuma estrutura possui coordenadas válidas.");
        return;
    }

    const minLon = Math.min(...pointRows.map(item => item.coordinate.longitude));
    const maxLon = Math.max(...pointRows.map(item => item.coordinate.longitude));
    const minLat = Math.min(...pointRows.map(item => item.coordinate.latitude));
    const maxLat = Math.max(...pointRows.map(item => item.coordinate.latitude));
    const project = coordinate => ({
        x: 5 + ((coordinate.longitude - minLon) / (maxLon - minLon || 1)) * 90,
        y: 6 + ((maxLat - coordinate.latitude) / (maxLat - minLat || 1)) * 88
    });
    const colors = ["#8b5cf6", "#22a5e8", "#e657b7", "#2447e8", "#e33658", "#ff7c3b"];
    const points = pointRows.map((item, index) => {
        const position = project(item.coordinate);
        const metricName = PILHAS_STRUCTURE_ALIASES[item.structure] || item.structure;
        const value = geometryByLabel.get(normalizeComparable(metricName));
        const selected = normalizeComparable(item.structure) === normalizeComparable(pilhasIndicatorFilters.structure);
        const distance = getDistanceMeters(lastGeolocationFix, item.coordinate);
        const tooltip = escapeHtml([
            item.structure,
            value == null ? null : `Geometria: ${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
            Number.isFinite(distance) ? `Distância da posição capturada: ${formatDistanceMeters(distance)}` : null,
            `Latitude: ${item.coordinate.latitude.toFixed(7)}`,
            `Longitude: ${item.coordinate.longitude.toFixed(7)}`,
            `Período: ${PILHAS_INDICATOR_MODEL.monthLabels[pilhasIndicatorFilters.month] || pilhasIndicatorFilters.month}/${pilhasIndicatorFilters.year}`,
            `Análise: ${pilhasIndicatorFilters.analysis}`
        ].filter(Boolean).join("\n"));
        return `<button type="button" class="pilhas-map-point geoview-info ${selected ? "is-selected" : ""}" style="left:${position.x}%; top:${position.y}%; --point-color:${colors[index % colors.length]};" data-tooltip="${tooltip}" aria-label="${escapeHtml(item.structure)}" onclick="setPilhasStructureFilter('${escapeHtml(item.structure)}')"></button>`;
    }).join("");

    let gpsMarker = "";
    const gps = lastGeolocationFix;
    const lonPad = Math.max((maxLon - minLon) * 0.15, 0.003);
    const latPad = Math.max((maxLat - minLat) * 0.15, 0.003);
    if (gps
        && gps.longitude >= minLon - lonPad && gps.longitude <= maxLon + lonPad
        && gps.latitude >= minLat - latPad && gps.latitude <= maxLat + latPad) {
        const position = project(gps);
        gpsMarker = `<span class="pilhas-gps-point geoview-info" style="left:${position.x}%; top:${position.y}%;" data-tooltip="${escapeHtml(`Posição capturada\nPrecisão: ${formatNumber(gps.accuracyMeters, 1)} m\n${formatDateTimeBR(gps.capturedAt)}`)}"></span>`;
    }

    const selectedCoordinate = getGeoViewStructureCoordinate(pilhasIndicatorFilters.structure);
    const selectedDistance = getDistanceMeters(lastGeolocationFix, selectedCoordinate);
    setTextContent(
        "pilhas-map-live-status",
        lastGeolocationFix && Number.isFinite(selectedDistance)
            ? `${pilhasIndicatorFilters.structure}: ${formatDistanceMeters(selectedDistance)} da posição capturada, precisão GPS ${formatNumber(lastGeolocationFix.accuracyMeters, 1)} m.`
            : `${pilhasIndicatorFilters.structure}: coordenada KMZ/SIRGAS carregada. Capture o GPS para calcular a distância.`
    );
    container.innerHTML = `
        ${points}
        ${gpsMarker}
        <span class="pilhas-map-credit">Base aérea operacional / camadas KMZ / SIRGAS 2000</span>
    `;
}

function getStructureInstruments(structure) {
    return Object.values(INSTRUMENT_REGISTRY)
        .filter(instrument => normalizeComparable(instrument.structure) === normalizeComparable(structure))
        .sort(compareInstrumentsByTypeAndCode);
}

function getFilteredStructureReadings(structure) {
    const monthIndex = PILHAS_INDICATOR_MODEL.months.indexOf(pilhasIndicatorFilters.month);
    return readingsDatabase.filter(reading => {
        const instrument = INSTRUMENT_REGISTRY[reading.instrumentId] || {};
        const readingStructure = reading.structure || instrument.structure;
        const date = new Date(reading.dateTime);
        return normalizeComparable(readingStructure) === normalizeComparable(structure)
            && !Number.isNaN(date.getTime())
            && String(date.getFullYear()) === pilhasIndicatorFilters.year
            && date.getMonth() === monthIndex;
    });
}

function renderPilhasStructureFilter() {
    const select = document.getElementById("pilhas-structure-filter");
    if (!select) return;
    const structures = getStructureList();
    if (!structures.some(name => normalizeComparable(name) === normalizeComparable(pilhasIndicatorFilters.structure))) {
        pilhasIndicatorFilters.structure = structures[0] || "PDE 1";
    }
    select.innerHTML = structures
        .map(structure => `<option value="${escapeHtml(structure)}">${escapeHtml(structure)}</option>`)
        .join("");
    select.value = pilhasIndicatorFilters.structure;
}

function renderPilhasStructureKpis() {
    const structure = pilhasIndicatorFilters.structure;
    const instruments = getStructureInstruments(structure);
    const periodReadings = getFilteredStructureReadings(structure);
    const latestByInstrument = getLatestReadingsByInstrument();
    const latestReadings = instruments.map(instrument => latestByInstrument[instrument.id]).filter(Boolean);
    const activeAlerts = latestReadings.filter(reading => getStatusClass(reading.status) !== "normal");
    const inspectionAlerts = (GEOVIEW_OPERATIONAL.inspections || []).filter(item =>
        normalizeComparable(item.structure) === normalizeComparable(structure)
    );
    const latest = [...latestReadings].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))[0];
    const types = [...new Set(instruments.map(instrument => instrument.type))].join(", ");
    setTextContent("pilhas-kpi-instruments", instruments.length.toLocaleString("pt-BR"));
    setTextContent("pilhas-kpi-types", types || "Sem instrumentos");
    setTextContent("pilhas-kpi-readings", periodReadings.length.toLocaleString("pt-BR"));
    setTextContent("pilhas-kpi-period", `${PILHAS_INDICATOR_MODEL.monthLabels[pilhasIndicatorFilters.month]} de ${pilhasIndicatorFilters.year}`);
    setTextContent("pilhas-kpi-alerts", (activeAlerts.length + inspectionAlerts.length).toLocaleString("pt-BR"));
    setTextContent("pilhas-kpi-alert-label", `${activeAlerts.length} instrumentais / ${inspectionAlerts.length} inspeção`);
    setTextContent("pilhas-kpi-latest", latest ? formatDateBRShort(latest.dateTime) : "-");
    setTextContent("pilhas-kpi-latest-code", latest ? `${latest.instrumentCode || latest.instrumentId} - ${latest.status}` : "Sem leitura");
}

function renderPilhasExecutiveSummary() {
    const container = document.getElementById("pilhas-executive-summary");
    if (!container) return;
    const geometry = getPilhasRealRows("geometria");
    const slope = getPilhasRealRows("declividade");
    const ponding = getPilhasRealRows("empocamento");
    const safety = getPilhasRealRows("fator");
    if (!geometry.length && !safety.length) {
        container.innerHTML = `<p>Não há indicadores geométricos para este recorte. O histórico instrumental abaixo permanece disponível para a estrutura selecionada.</p>`;
        return;
    }
    const geometryBelow = geometry.filter(row => row.value < 70).map(row => row.label);
    const slopeAbove = slope.filter(row => row.value > 30).map(row => row.label);
    const pondingAbove = ponding.filter(row => row.value > 5).map(row => row.label);
    const safetyBelow = safety.filter(row => row.value < 1.3).map(row => row.label);
    container.innerHTML = `
        <article><strong>Aderência geométrica</strong><span>${geometryBelow.length ? `${geometryBelow.length} estrutura(s) abaixo de 70%: ${escapeHtml(geometryBelow.join(", "))}.` : "Todas as estruturas avaliadas atendem à meta de 70%."}</span></article>
        <article><strong>Declividade</strong><span>${slopeAbove.length ? `${slopeAbove.length} estrutura(s) acima de 30%, mantidas sob monitoramento geotécnico: ${escapeHtml(slopeAbove.join(", "))}.` : "Nenhuma estrutura acima do limite de 30%."}</span></article>
        <article><strong>Empoçamento</strong><span>${pondingAbove.length ? `Os ${pondingAbove.length} registros avaliados superam a referência de 5% e exigem continuidade nas ações de drenagem superficial.` : "Sem desvios de empoçamento no recorte atual."}</span></article>
        <article><strong>Fator de segurança</strong><span>${safetyBelow.length ? `Abaixo de 1,30: ${escapeHtml(safetyBelow.join(", "))}. Pilha Over segue em remoção; Pilha Silicoso permanece isolada e interditada.` : "Todas as estruturas avaliadas atendem ao mínimo de 1,30."}</span></article>
    `;
}

function getInstrumentChartValue(reading, instrument) {
    const calculated = Number(reading.cotaCalculada);
    if (Number.isFinite(calculated) && calculated > 0) return calculated;
    const cotaBoca = Number(instrument?.cotaBoca);
    const value = Number(reading.value);
    if (Number.isFinite(cotaBoca) && cotaBoca > 0 && Number.isFinite(value)) return cotaBoca - value;
    return Number.isFinite(value) ? value : null;
}

function downsampleRows(rows, maxRows = 150) {
    if (rows.length <= maxRows) return rows;
    const step = (rows.length - 1) / (maxRows - 1);
    return Array.from({ length: maxRows }, (_, index) => rows[Math.round(index * step)]);
}

function getAccumulatedRainfall(station, currentDate, previousDate) {
    if (!station) return 0;
    const start = previousDate ? new Date(previousDate).getTime() : new Date(currentDate).getTime() - 7 * 86400000;
    const end = new Date(currentDate).getTime();
    return (GEOVIEW_OPERATIONAL.rainfall || []).reduce((total, row) => {
        const time = new Date(row.date).getTime();
        return normalizeComparable(row.location) === normalizeComparable(station)
            && time > start
            && time <= end
            ? total + Number(row.millimeters || 0)
            : total;
    }, 0);
}

function renderPilhasInstrumentChart() {
    const select = document.getElementById("pilhas-instrument-filter");
    const canvas = document.getElementById("pilhas-instrument-chart");
    const empty = document.getElementById("pilhas-instrument-chart-empty");
    if (!select || !canvas || !empty) return;

    const instruments = getStructureInstruments(pilhasIndicatorFilters.structure);
    const instrumentsWithData = instruments.filter(instrument =>
        readingsDatabase.some(reading => reading.instrumentId === instrument.id)
    );
    if (!pilhasIndicatorFilters.instrumentId || !instrumentsWithData.some(instrument => instrument.id === pilhasIndicatorFilters.instrumentId)) {
        pilhasIndicatorFilters.instrumentId = [...instrumentsWithData].sort((a, b) => {
            const countA = readingsDatabase.filter(reading => reading.instrumentId === a.id).length;
            const countB = readingsDatabase.filter(reading => reading.instrumentId === b.id).length;
            return countB - countA;
        })[0]?.id || null;
    }
    select.innerHTML = instrumentsWithData.length
        ? instrumentsWithData.map(instrument => `<option value="${escapeHtml(instrument.id)}">${escapeHtml(instrument.code || instrument.id)} - ${escapeHtml(instrument.type)}</option>`).join("")
        : `<option value="">Sem histórico instrumental</option>`;
    select.value = pilhasIndicatorFilters.instrumentId || "";

    if (pilhasInstrumentChart) {
        pilhasInstrumentChart.destroy();
        pilhasInstrumentChart = null;
    }
    const instrument = INSTRUMENT_REGISTRY[pilhasIndicatorFilters.instrumentId];
    if (!instrument) {
        empty.classList.add("is-visible");
        setTextContent("pilhas-instrument-chart-title", "HISTÓRICO DO INSTRUMENTO");
        setTextContent("pilhas-instrument-meta", "Nenhuma série disponível para esta estrutura.");
        return;
    }

    const rows = downsampleRows(
        readingsDatabase
            .filter(reading => reading.instrumentId === instrument.id)
            .filter(reading => Number.isFinite(getInstrumentChartValue(reading, instrument)))
            .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    );
    if (!rows.length) {
        empty.classList.add("is-visible");
        return;
    }
    empty.classList.remove("is-visible");
    const labels = rows.map(row => formatDateBRShort(row.dateTime));
    const station = GEOVIEW_OPERATIONAL.rainfallStations?.[pilhasIndicatorFilters.structure];
    const rainfall = rows.map((row, index) =>
        getAccumulatedRainfall(station, row.dateTime, rows[index - 1]?.dateTime)
    );
    const values = rows.map(row => getInstrumentChartValue(row, instrument));
    const thresholds = instrument.thresholds || {};
    const thresholdRows = [
        ["Nível de atenção", thresholds.attentionElevation, "#facc15"],
        ["Nível de alerta", thresholds.alertElevation, "#f59e0b"],
        ["Nível de emergência", thresholds.emergencyElevation, "#ef4444"],
        ["Cota de fundo", instrument.cotaFundo, "#e5e7eb"],
        ["Cota de topo", instrument.cotaBoca, "#ffffff"]
    ].filter(([, value]) => Number.isFinite(Number(value)) && Number(value) !== 0);
    const datasets = [
        {
            type: "bar",
            label: station ? `Pluviometria acumulada - ${station}` : "Pluviometria",
            data: rainfall,
            yAxisID: "rainfall",
            backgroundColor: "rgba(96, 165, 250, 0.26)",
            borderColor: "rgba(96, 165, 250, 0.44)",
            borderWidth: 1,
            order: 3
        },
        {
            type: "line",
            label: `Leitura ${instrument.code || instrument.id}`,
            data: values,
            yAxisID: "elevation",
            borderColor: "#d8e8f1",
            backgroundColor: "#d8e8f1",
            borderWidth: 3,
            pointRadius: rows.length > 80 ? 0 : 2,
            tension: 0.16,
            order: 1
        },
        ...thresholdRows.map(([label, value, color]) => ({
            type: "line",
            label,
            data: labels.map(() => Number(value)),
            yAxisID: "elevation",
            borderColor: color,
            backgroundColor: color,
            borderWidth: label === "Cota de topo" ? 2 : 1.5,
            borderDash: label === "Cota de topo" ? [7, 5] : [],
            pointRadius: 0,
            tension: 0,
            order: 2
        }))
    ];
    pilhasInstrumentChart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    labels: { color: "#ffffff", boxWidth: 16, font: { size: 11, weight: "700" } }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const suffix = context.dataset.yAxisID === "rainfall" ? " mm" : " m";
                            return `${context.dataset.label}: ${Number(context.raw).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}${suffix}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "rgba(255,255,255,0.78)", maxRotation: 70, minRotation: 0, autoSkip: true, maxTicksLimit: 18 },
                    grid: { color: "rgba(255,255,255,0.07)" }
                },
                elevation: {
                    position: "left",
                    ticks: { color: "#ffffff" },
                    title: { display: true, text: "Elevação / leitura (m)", color: "#ffffff" },
                    grid: { color: "rgba(255,255,255,0.12)" }
                },
                rainfall: {
                    position: "right",
                    beginAtZero: true,
                    ticks: { color: "#93c5fd" },
                    title: { display: true, text: "Pluviometria (mm)", color: "#93c5fd" },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
    setTextContent("pilhas-instrument-chart-title", `${instrument.code || instrument.id} - ${pilhasIndicatorFilters.structure}`);
    setTextContent(
        "pilhas-instrument-meta",
        `${rows.length} pontos exibidos | Série completa preservada no banco | ${station ? `Chuva associada: ${station}` : "Sem estação pluviométrica associada"}`
    );
}

function renderPilhasIndicatorDashboard() {
    const root = document.getElementById("pilhas-bi-dashboard");
    if (!root) return;

    const dashboard = getGeoViewDashboard(PILHAS_INDICATOR_MODEL.sourceDashboardId);
    const monthLabel = PILHAS_INDICATOR_MODEL.monthLabels[pilhasIndicatorFilters.month] || pilhasIndicatorFilters.month;
    const sourceLabel = dashboard?.title || "Indicadores Pilhas";
    const sourceContent = dashboard?.content || "Indicadores_Pilhas.pbix e Indicadores_Pilhas.xlsx";

    root.dataset.tooltip = [
        sourceLabel,
        `Fonte: GeoView / ${dashboard?.folder || "18) Indicadores Pilhas"}`,
        `Conteudo: ${sourceContent}`,
        `Estrutura: ${pilhasIndicatorFilters.structure}`,
        `Filtro atual: ${pilhasIndicatorFilters.year} / ${monthLabel} / ${pilhasIndicatorFilters.analysis}`
    ].join("\n");

    setTextContent("pilhas-bi-title", `INDICADORES - ${pilhasIndicatorFilters.structure}`);
    setTextContent("pilhas-bi-source-badge", `${sourceLabel} • ${monthLabel}/${pilhasIndicatorFilters.year}`);
    renderPilhasStructureFilter();
    renderPilhasFilterGroup("pilhas-year-filter", PILHAS_INDICATOR_MODEL.years, pilhasIndicatorFilters.year, "year");
    renderPilhasFilterGroup("pilhas-month-filter", PILHAS_INDICATOR_MODEL.months, pilhasIndicatorFilters.month, "month");
    renderPilhasFilterGroup("pilhas-analysis-filter", PILHAS_INDICATOR_MODEL.analyses, pilhasIndicatorFilters.analysis, "analysis");

    renderPilhasBarChart("geometria");
    renderPilhasBarChart("declividade");
    renderPilhasBarChart("empocamento");
    renderPilhasBarChart("fator");
    renderPilhasBarChart("planoLavra");
    renderPilhasLocationMap();
    renderPilhasStructureKpis();
    renderPilhasExecutiveSummary();
    renderPilhasInstrumentChart();
}

function renderGeoViewPanel() {
    const grid = document.getElementById("geoview-dashboard-grid");
    if (!grid) return;

    initializeGeoViewInputs();
    populateGeoViewStructureSelect();
    populateGeoViewDynamicControls();

    const dashboards = getGeoViewFilteredDashboards();
    const summary = getGeoViewSummary(dashboards);
    setTextContent("geoview-source-path", GEOVIEW_CATALOG.sourcePath || "Pasta corporativa nao informada");
    setTextContent("geoview-kpi-dashboards", summary.dashboards.toLocaleString("pt-BR"));
    setTextContent("geoview-kpi-powerbi", summary.powerbi.toLocaleString("pt-BR"));
    setTextContent("geoview-kpi-excel", summary.excel.toLocaleString("pt-BR"));
    setTextContent("geoview-kpi-evidence", (summary.evidence + summary.documents).toLocaleString("pt-BR"));

    renderPilhasIndicatorDashboard();
    renderGeoViewCharts(dashboards, summary);
    renderGeoViewDrilldownTable(dashboards);

    if (!dashboards.length) {
        grid.innerHTML = `<div class="card"><div class="card-body text-secondary">Nenhum dashboard encontrado para os filtros atuais.</div></div>`;
        renderGeoViewMaps();
        return;
    }

    const renderLimit = window.matchMedia?.("(pointer: coarse)")?.matches ? 10 : 14;
    const visibleDashboards = geoViewShowAllDashboards ? dashboards : dashboards.slice(0, renderLimit);
    const loadMore = document.getElementById("geoview-load-more");
    const loadMoreText = document.getElementById("geoview-load-more-text");
    if (loadMore) loadMore.style.display = dashboards.length > renderLimit ? "flex" : "none";
    if (loadMoreText) {
        loadMoreText.textContent = geoViewShowAllDashboards
            ? "Mostrar menos dashboards"
            : `Mostrar todos os ${dashboards.length} dashboards`;
    }

    grid.innerHTML = visibleDashboards.map(dashboard => {
        const files = getGeoViewDashboardFiles(dashboard.id);
        const tooltip = escapeHtml(getGeoViewTooltip(dashboard, files));
        const updated = dashboard.lastUpdated ? formatDateBRShort(dashboard.lastUpdated) : "-";
        const evidenceCount = Number(dashboard.images || 0) + Number(dashboard.pdfs || 0);
        const fileList = files.length
            ? `<ul class="geoview-file-list">${files.slice(-3).map(file => `<li><i class="fa-solid fa-paperclip"></i> ${escapeHtml(file.name)} <small>${escapeHtml(formatFileSize(file.size))}</small></li>`).join("")}</ul>`
            : `<p class="geoview-empty-link">Nenhum arquivo local associado nesta sessao.</p>`;

        return `
            <article class="geoview-card geoview-info" tabindex="0" data-tooltip="${tooltip}">
                <div class="geoview-card-head">
                    <span>${escapeHtml(dashboard.area || "GeoView")}</span>
                    <strong>${escapeHtml(dashboard.title)}</strong>
                </div>
                <p>${escapeHtml(dashboard.description)}</p>
                <div class="geoview-card-metrics">
                    <span><b>${Number(dashboard.powerbi || 0)}</b> PBIX</span>
                    <span><b>${Number(dashboard.excel || 0)}</b> bases</span>
                    <span><b>${evidenceCount}</b> evid.</span>
                    <span><b>${updated}</b></span>
                </div>
                ${getGeoViewMiniChart(dashboard)}
                <div class="geoview-card-content">${escapeHtml(dashboard.content)}</div>
                ${fileList}
                <button type="button" class="btn btn-secondary geoview-attach-btn" onclick="openGeoViewFilePicker('${escapeHtml(dashboard.id)}')">
                    <i class="fa-solid fa-link"></i> Associar arquivos
                </button>
            </article>
        `;
    }).join("");

    renderGeoViewMaps();
}

function populateGeoViewStructureSelect() {
    const select = document.getElementById("geoview-map-structure");
    if (!select) return;

    const current = select.value;
    const structures = getStructureList();
    select.innerHTML = "";
    structures.forEach(structure => {
        const option = document.createElement("option");
        option.value = structure;
        option.textContent = structure;
        select.appendChild(option);
    });

    if (current && structures.includes(current)) {
        select.value = current;
    }
}

function openGeoViewMapPicker() {
    const select = document.getElementById("geoview-map-structure");
    const input = document.getElementById("geoview-map-input");
    if (!select?.value) {
        showToast("Selecione uma estrutura para atualizar o mapa.", "warning");
        return;
    }
    input?.click();
}

function compactImageFile(file, maxSide = 1100, quality = 0.72) {
    return new Promise((resolve, reject) => {
        if (!file?.type?.startsWith("image/")) {
            reject(new Error("Arquivo nao e imagem."));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
                const width = Math.max(1, Math.round(img.width * ratio));
                const height = Math.max(1, Math.round(img.height * ratio));
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleGeoViewMapFile(file) {
    const structure = document.getElementById("geoview-map-structure")?.value;
    if (!structure || !file) return;

    try {
        const dataUrl = await compactImageFile(file);
        geoViewState.maps[structure] = {
            name: file.name,
            size: file.size || 0,
            dataUrl,
            updatedAt: new Date().toISOString()
        };
        saveGeoViewState();
        renderGeoViewMaps();
        showToast(`Mapa atualizado para ${structure}.`);
    } catch (error) {
        console.warn("Falha ao anexar mapa GeoView:", error);
        showToast("Nao foi possivel anexar esta imagem de mapa.", "warning");
    }
}

function renderGeoViewMaps() {
    const grid = document.getElementById("geoview-map-grid");
    if (!grid) return;

    const structures = getStructureList();
    if (!structures.length) {
        grid.innerHTML = `<div class="geoview-empty-map">Nenhuma estrutura cadastrada para associar mapa.</div>`;
        return;
    }

    const selected = document.getElementById("geoview-map-structure")?.value;
    const mapped = structures.filter(structure => geoViewState.maps?.[structure]);
    const renderLimit = window.matchMedia?.("(pointer: coarse)")?.matches ? 8 : 14;
    const visible = Array.from(new Set([
        selected,
        ...mapped,
        ...structures
    ].filter(Boolean))).slice(0, Math.max(renderLimit, mapped.length + 1));
    const hiddenCount = Math.max(0, structures.length - visible.length);

    grid.innerHTML = visible.map(structure => {
        const map = geoViewState.maps?.[structure];
        const tooltip = escapeHtml(map
            ? `Mapa de ${structure}\nArquivo: ${map.name}\nAtualizado em: ${formatDateTimeBR(map.updatedAt)}`
            : `Mapa de ${structure}\nSem imagem associada. Use Atualizar mapa para anexar uma captura do Google Earth ou imagem corporativa.`);
        return `
            <article class="geoview-map-card geoview-info" tabindex="0" data-tooltip="${tooltip}">
                ${map?.dataUrl
                    ? `<img src="${map.dataUrl}" alt="Mapa de ${escapeHtml(structure)}">`
                    : `<div class="geoview-map-placeholder"><i class="fa-solid fa-map-location-dot"></i></div>`}
                <div>
                    <strong>${escapeHtml(structure)}</strong>
                    <span>${map ? `Atualizado: ${escapeHtml(formatDateBRShort(map.updatedAt))}` : "Mapa pendente"}</span>
                </div>
            </article>
        `;
    }).join("") + (hiddenCount
        ? `<div class="geoview-empty-map">Mais ${hiddenCount.toLocaleString("pt-BR")} estrutura(s) ficam disponiveis no seletor acima para atualizar mapa.</div>`
        : "");
}

// --- 7. NOTIFICATION SYSTEM (TOAST) ---
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.background = type === "success"
        ? "var(--success)"
        : type === "warning"
            ? "var(--orange)"
            : "var(--danger)";
    toast.style.color = "white";
    toast.style.padding = "14px 24px";
    toast.style.borderRadius = "var(--border-radius-sm)";
    toast.style.fontSize = "13px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 10px 20px rgba(0,0,0,0.3)";
    toast.style.zIndex = "1000";
    toast.style.animation = "fadeIn 0.3s ease-out";
    
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s ease-in";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- 8. OPERATIONAL DAILY SCHEDULE & INSPECTIONS MINI DASHBOARD ---
let dashboardScheduleState = {
    selectedDate: new Date().toISOString().slice(0, 10),
    selectedStructure: "all",
    scheduleItems: [
        {
            time: "08:00 - 09:30",
            structure: "Barragem B4",
            activity: "Leitura de Piezômetros Elétricos & Pneumáticos (PZ-01 a PZ-20)",
            category: "Leitura de Instrumentos",
            frequency: "Diária",
            team: "Geotecnia / Operação",
            status: "completed"
        },
        {
            time: "09:30 - 11:00",
            structure: "Barragem B1",
            activity: "Inspeção Visual Sensorial: Crista, Talude de Jusante e Drenos",
            category: "Monitoramento Sensorial",
            frequency: "Diária",
            team: "Engenheiro Geotécnico",
            status: "in-progress"
        },
        {
            time: "11:00 - 12:00",
            structure: "PDE 1",
            activity: "Leitura de Indicadores de Nível d'Água (INA) e Medidores de Vazão",
            category: "Leitura de Instrumentos",
            frequency: "Diária",
            team: "Técnico de Campo",
            status: "pending"
        },
        {
            time: "13:30 - 15:00",
            structure: "Barragem B2",
            activity: "Registro Fotográfico das Bermas, Drenagens Pluviais e Ombreiras",
            category: "Registro Fotográfico",
            frequency: "Semanal",
            team: "Geotecnia / Drone",
            status: "pending"
        },
        {
            time: "15:00 - 16:30",
            structure: "Cava Jangada",
            activity: "Monitoramento Sensorial: Frentes de Lavra, Trincas e Surgências",
            category: "Monitoramento Sensorial",
            frequency: "Diária",
            team: "Geologia / Geotecnia",
            status: "pending"
        },
        {
            time: "16:30 - 17:30",
            structure: "Pilha B2",
            activity: "Registro Fotográfico e Inspeção Visual de Estabilidade de Taludes",
            category: "Registro Fotográfico",
            frequency: "Semanal",
            team: "Técnico de Mineração",
            status: "pending"
        }
    ]
};

function renderDailyOperationalSchedule() {
    const today = new Date();
    const dateFormatted = today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    setTextContent("daily-schedule-current-date", `Hoje (${dateFormatted})`);

    const dateInput = document.getElementById("dashboard-schedule-date");
    if (dateInput && !dateInput.value) {
        dateInput.value = dashboardScheduleState.selectedDate;
    }

    const structureSelect = document.getElementById("dashboard-schedule-structure-filter");
    if (structureSelect && structureSelect.options.length <= 1) {
        const structures = getGeospatialStructureList();
        structureSelect.innerHTML = `<option value="all">Todas as Estruturas</option>` +
            structures.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    }

    // Filter items
    const filtered = dashboardScheduleState.scheduleItems.filter(item => {
        if (dashboardScheduleState.selectedStructure !== "all" && normalizeComparable(item.structure) !== normalizeComparable(dashboardScheduleState.selectedStructure)) {
            return false;
        }
        return true;
    });

    // Update Activity Summary Stats
    const totalInstruments = Object.keys(INSTRUMENT_REGISTRY).length;
    setTextContent("activity-instruments-target", `${totalInstruments} instrumentos`);
    const instrumentProgress = Math.min(100, Math.round((readingsDatabase.length / (totalInstruments || 1)) * 100));
    setTextContent("activity-instruments-progress", `${instrumentProgress}%`);

    const photoInspections = inspectionsDatabase.filter(i => (i.photoCount || 0) > 0 || (i.generalPhotos && i.generalPhotos.length > 0));
    setTextContent("activity-photo-target", `${getGeospatialStructureList().length} estruturas`);
    setTextContent("activity-photo-progress", `${photoInspections.length} fotos`);

    const normalInspections = inspectionsDatabase.filter(i => i.insRisk === "Sem Anomalias Significativas" || i.insRisk === "Normal").length;
    setTextContent("activity-sensory-target", `${inspectionsDatabase.length} checklists`);
    setTextContent("activity-sensory-status", normalInspections >= (inspectionsDatabase.length * 0.8) ? "Sem Anomalias" : "Com Apontamentos");

    // Populate schedule table
    const tbody = document.getElementById("dashboard-schedule-table-body");
    if (!tbody) return;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-3">Nenhuma atividade programada para os filtros selecionados.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        let catIcon = "fa-chart-line text-primary";
        if (item.category === "Registro Fotográfico") catIcon = "fa-camera text-purple";
        else if (item.category === "Monitoramento Sensorial") catIcon = "fa-eye text-warning";

        let statusBadge = `<span class="schedule-status-badge pending"><i class="fa-solid fa-clock"></i> Pendente</span>`;
        if (item.status === "in-progress") {
            statusBadge = `<span class="schedule-status-badge in-progress"><i class="fa-solid fa-spinner fa-spin"></i> Em Andamento</span>`;
        } else if (item.status === "completed") {
            statusBadge = `<span class="schedule-status-badge completed"><i class="fa-solid fa-circle-check"></i> Concluída</span>`;
        }

        return `
            <tr>
                <td><strong>${escapeHtml(item.time)}</strong></td>
                <td><span class="badge badge-outline">${escapeHtml(item.structure)}</span></td>
                <td><strong>${escapeHtml(item.activity)}</strong></td>
                <td><i class="fa-solid ${catIcon}"></i> ${escapeHtml(item.category)}</td>
                <td>${escapeHtml(item.frequency)}</td>
                <td><span class="text-secondary">${escapeHtml(item.team)}</span></td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join("");
}

function filterDashboardScheduleByDate(date) {
    dashboardScheduleState.selectedDate = date;
    renderDailyOperationalSchedule();
    showToast(`Cronograma filtrado para ${formatDateBRShort(date)}`);
}

function filterDashboardScheduleByStructure(structure) {
    dashboardScheduleState.selectedStructure = structure;
    renderDailyOperationalSchedule();
}

function importInspectionScheduleSpreadsheet(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const content = e.target.result;
            const lines = content.split(/\r\n|\n/).filter(line => line.trim().length > 0);
            if (lines.length <= 1) {
                showToast("Arquivo vazio ou sem dados válidos.", "warning");
                return;
            }

            const parsedItems = [];
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(/[;,]/).map(p => p.trim());
                if (parts.length < 3) continue;

                parsedItems.push({
                    time: parts[0] || "08:00 - 17:00",
                    structure: getCanonicalStructureName(parts[1] || "Barragem B1"),
                    activity: parts[2] || "Inspeção Operacional de Campo",
                    category: parts[3] || "Monitoramento Sensorial",
                    frequency: parts[4] || "Diária",
                    team: parts[5] || "Equipe Geotecnia",
                    status: "pending"
                });
            }

            if (parsedItems.length > 0) {
                dashboardScheduleState.scheduleItems = parsedItems;
                renderDailyOperationalSchedule();
                showToast(`Cronograma importado: ${parsedItems.length} atividades carregadas!`, "success");
            } else {
                showToast("Nenhuma atividade válida extraída da planilha.", "warning");
            }
        } catch (err) {
            showToast(`Erro ao processar planilha: ${err.message}`, "error");
        }
    };
    reader.readAsText(file, "UTF-8");
}

function renderMiniInspectionsDashboard() {
    const total = inspectionsDatabase.length;
    let normal = 0;
    let warning = 0;
    let critical = 0;

    inspectionsDatabase.forEach(i => {
        const risk = i.insRisk || "Normal";
        if (risk === "Crítico" || risk === "Alerta") critical++;
        else if (risk === "Atenção" || risk === "Média" || risk === "Alta") warning++;
        else normal++;
    });

    setTextContent("mini-kpi-total-inspections", total);
    setTextContent("mini-kpi-normal-inspections", normal);
    setTextContent("mini-kpi-warning-inspections", warning);
    setTextContent("mini-kpi-critical-inspections", critical);

    const tbody = document.getElementById("dashboard-recent-inspections-body");
    if (!tbody) return;

    if (!inspectionsDatabase.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-3">Nenhuma inspeção registrada no banco.</td></tr>`;
        return;
    }

    const recent = [...inspectionsDatabase]
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
        .slice(0, 6);

    tbody.innerHTML = recent.map(i => {
        const statusClass = i.insRisk === "Sem Anomalias Significativas" || i.insRisk === "Normal"
            ? "text-success"
            : i.insRisk === "Crítico" ? "text-danger" : "text-warning";

        const photoCount = (i.generalPhotos?.length || 0) + (i.photoCount || 0);

        return `
            <tr>
                <td><strong>${formatDateTimeBR(i.dateTime)}</strong></td>
                <td><span class="badge badge-outline">${escapeHtml(i.structure)}</span></td>
                <td>${escapeHtml(i.inspector || "Técnico Geotécnico")}</td>
                <td><span class="${statusClass} font-bold"><i class="fa-solid fa-circle-dot"></i> ${escapeHtml(i.insRisk || "Normal")}</span></td>
                <td>${escapeHtml(i.comments ? (i.comments.slice(0, 45) + (i.comments.length > 45 ? "..." : "")) : "Sem anomalias")}</td>
                <td><span class="badge badge-primary"><i class="fa-solid fa-camera"></i> ${photoCount} fotos</span></td>
            </tr>
        `;
    }).join("");
}

function updateDashboardKPIs() {
    document.getElementById("kpi-total-instruments").textContent = Object.keys(INSTRUMENT_REGISTRY).length;
    document.getElementById("kpi-month-readings").textContent = readingsDatabase.length + flowReadingsDatabase.length;
    const fieldCollected = readingsDatabase.filter(item => item.source === "campo").length;
    const fieldCollectedEl = document.getElementById("field-collected-count");
    if (fieldCollectedEl) fieldCollectedEl.textContent = `${fieldCollected} coletas de campo`;
    const completedInspectionsEl = document.getElementById("completed-inspections-count");
    if (completedInspectionsEl) completedInspectionsEl.textContent = `${inspectionsDatabase.length} inspeções registradas`;
    const vehicleChecklistEl = document.getElementById("vehicle-checklist-overview-count");
    if (vehicleChecklistEl) {
        const critical = vehicleInspectionsDatabase.filter(item => item.status === "Crítico").length;
        vehicleChecklistEl.textContent = critical
            ? `${vehicleInspectionsDatabase.length} realizados · ${critical} crítico(s)`
            : `${vehicleInspectionsDatabase.length} veículos inspecionados`;
    }

    let alerts = 0;
    const latestReadings = getLatestReadingsByInstrument();
    const alertLabels = [];

    Object.keys(latestReadings).forEach(key => {
        if (getStatusClass(latestReadings[key].status) !== "normal") {
            alerts++;
            const inst = INSTRUMENT_REGISTRY[key] || {};
            alertLabels.push(inst.code || key);
        }
    });

    document.getElementById("kpi-alerts-count").textContent = alerts;
    const alertCard = document.getElementById("kpi-alerts-card");
    if (alerts > 0) {
        alertCard.classList.add("text-glow-amber");
        alertCard.querySelector(".kpi-footer").innerHTML = `<span class="text-warning"><i class="fa-solid fa-triangle-exclamation"></i> ${alertLabels.slice(0, 3).join(", ")}${alertLabels.length > 3 ? "..." : ""} para verificar</span>`;
    } else {
        alertCard.classList.remove("text-glow-amber");
        alertCard.querySelector(".kpi-footer").innerHTML = `<span class="text-success"><i class="fa-solid fa-check"></i> Sem alertas ativos</span>`;
    }

    updateSyncBadge();
    renderDailyOperationalSchedule();
    renderMiniInspectionsDashboard();
}

// Quick Modals
function triggerQuickReading() {
    document.getElementById("quick-reading-modal").style.display = "flex";
}

function closeQuickReading() {
    document.getElementById("quick-reading-modal").style.display = "none";
}

function goToReadingsTab() {
    closeQuickReading();
    switchTab('readings');
}

function goToInspectionsTab() {
    closeQuickReading();
    switchTab('inspections');
}

function openVehicleChecklist() {
    closeQuickReading();
    switchTab("inspections");
    window.setTimeout(() => {
        document.querySelector(".vehicle-checklist-card")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }, 80);
}

function initializePWAInstallPrompt() {
    const installButton = document.getElementById("pwa-install-btn");
    if (!installButton) return;

    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        deferredInstallPrompt = event;
        installButton.style.display = "inline-flex";
    });

    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
        installButton.style.display = "none";
        showToast("MDSync instalado no dispositivo.");
    });
}

async function installPWA() {
    const installButton = document.getElementById("pwa-install-btn");
    if (!deferredInstallPrompt) {
        showToast("Instalacao disponivel pelo menu do navegador quando o PWA estiver pronto.");
        return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") {
        showToast("Instalacao do MDSync iniciada.");
    }

    deferredInstallPrompt = null;
    if (installButton) installButton.style.display = "none";
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
        .register("./service-worker.js")
        .then(() => {
            console.info("MDSync PWA offline pronto.");
        })
        .catch(error => {
            console.warn("Service worker indisponivel:", error);
        });
}

function loadMiningSettings() {
    const defaults = {
        alertCriterion: "15.00",
        apiEndpoint: "https://api.valeverde.mining/geotech/v2",
        readingFrequency: "Diária para PZ e Semanal para INA"
    };
    try {
        return {
            ...defaults,
            ...JSON.parse(localStorage.getItem(MINING_SETTINGS_KEY) || "{}")
        };
    } catch (error) {
        console.warn("Falha ao carregar parâmetros da mineração:", error);
        return defaults;
    }
}

function initializeMiningSettings() {
    const settings = loadMiningSettings();
    const criterion = document.getElementById("mining-alert-criterion");
    const endpoint = document.getElementById("mining-api-endpoint");
    const frequency = document.getElementById("mining-reading-frequency");
    if (criterion) criterion.value = settings.alertCriterion;
    if (endpoint) endpoint.value = settings.apiEndpoint;
    if (frequency) frequency.value = settings.readingFrequency;
}

function saveMiningSettings(showConfirmation = false) {
    const settings = {
        alertCriterion: document.getElementById("mining-alert-criterion")?.value || "15.00",
        apiEndpoint: document.getElementById("mining-api-endpoint")?.value?.trim() || "",
        readingFrequency: document.getElementById("mining-reading-frequency")?.value?.trim() || ""
    };
    localStorage.setItem(MINING_SETTINGS_KEY, JSON.stringify(settings));
    const status = document.getElementById("mining-settings-status");
    if (status) {
        status.innerHTML = `<i class="fa-solid fa-circle-check"></i> Salvo em ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (showConfirmation) showToast("Parâmetros da mineração salvos neste dispositivo.");
}

function openInitialHashTab() {
    let tabId = window.location.hash.replace("#", "");
    if (document.body.classList.contains("android-shell") && ["history", "release", "sync"].includes(tabId)) {
        tabId = "dashboard";
    }
    if (["dashboard", "readings", "inspections", "history", "reports", "indicators", "geoview", "georef", "release", "sync"].includes(tabId)) {
        switchTab(tabId);
    }
}

function initializeRuntimePlatform() {
    const androidShell = Boolean(window.MDSyncAndroid) || /MDSyncAndroid/i.test(navigator.userAgent);
    document.body.classList.toggle("android-shell", androidShell);
    document.body.classList.toggle("web-shell", !androidShell);
}

let lastLiveSyncTimestamp = null;
function initializeLivePCMISync() {
    async function checkLivePCMIUpdates() {
        try {
            const response = await fetch("data/sync-signal.json?t=" + Date.now());
            if (!response.ok) return;
            const signal = await response.json();
            if (!lastLiveSyncTimestamp) {
                lastLiveSyncTimestamp = signal.timestamp;
                return;
            }
            if (signal.timestamp !== lastLiveSyncTimestamp) {
                console.log("[MDSync LiveSync] Atualização detectada na base PCMI:", signal);
                lastLiveSyncTimestamp = signal.timestamp;

                const catRes = await fetch("data/geoview-catalog.json?t=" + Date.now());
                if (catRes.ok) {
                    const newCatalog = await catRes.json();
                    window.MDSYNC_GEOVIEW_CATALOG = newCatalog;
                    GEOVIEW_CATALOG = newCatalog;

                    if (typeof renderGeoViewPanel === "function") {
                        renderGeoViewPanel();
                    }

                    if (typeof showToast === "function") {
                        showToast(`Base PCMI sincronizada! (${signal.totalFiles || ""} arquivos)`, "success");
                    }
                }
            }
        } catch (e) {
            // Silencioso em caso de offline
        }
    }

    // Polling a cada 3 segundos e no foco da aba
    setInterval(checkLivePCMIUpdates, 3000);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) checkLivePCMIUpdates();
    });
}

function bootApplication() {
    if (appBooted) return;
    appBooted = true;

    initDatabases();
    loadReleaseState();
    loadGeorefState();
    loadGeoViewState();
    loadGeospatialState();
    initializeRuntimePlatform();
    initializePWAInstallPrompt();
    initializeFieldFileInputs();
    initializeGeoViewInputs();
    initializeCorporateSync();
    initializeLivePCMISync();
    initializeEarthMapInputs();
    populateInstrumentSelect();
    populateInspectionStructures();
    populateAnalyticsFilters();
    populateMapPins();
    transitionCameraToStructure(geoSpatialState.selectedStructure || "Toda a Mina (Visão Geral)");
    renderSurveyAnomalies();
    initializeVehicleChecklist();
    initializeInspectionSchedule();
    initializeMiningSettings();
    updateChecklistProgress();
    updateDashboardKPIs();
    renderReportsPanel();
    renderGeorefPanel();
    renderReleasePanel();
    openInitialHashTab();
    registerServiceWorker();
    installSecurityActivityListeners();
    resetSecurityIdleTimer();
}

// Window Loader Initializer
window.onload = function() {
    if (!SECURITY_GATE_ENABLED) {
        unlockSecurityGate();
        bootApplication();
        return;
    }
    initializeSecurityGate();
};
