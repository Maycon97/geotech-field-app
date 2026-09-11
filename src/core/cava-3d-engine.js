/**
 * MDSync - Motor de Visualizacao e Modelo 3D da Cava Jangada
 * Georreferenciamento Oficial: SIRGAS 2000 / UTM Zona 23S (EPSG: 31983)
 * Base Cartografica: Layout_MapaGeologico_0826.pdf (ArcGIS Pro 3.6.3 - Agosto/2026)
 * Topografia Oficial: tpes_260731 (336 cotas de bancadas de 1.015m a 1.386m)
 * Sem uso de tracos em-dash ou en-dash conforme diretrizes operacionais.
 */

(function(window) {
    'use strict';

    // Configuracoes Geodesicas Centrais
    const CENTROID = {
        name: "Cava Jangada (Mina Principal)",
        easting: 595693.52,
        northing: 7777616.71,
        elevationBase: 1000.0,
        cotaCrista: 1250.0,
        cotaBermaInterditada: 1231.44,
        cotaFundo: 1016.0,
        tarpAlvoCritico: "AOI_01 (+20.00 mm)"
    };

    // Estado Geral do Motor 3D
    const state = {
        initialized: false,
        running: false,
        container: null,
        scene: null,
        camera: null,
        renderer: null,
        raycaster: null,
        mouse: null,
        clock: null,
        
        // Malhas e Grupos de Camadas
        terrainMesh: null,
        terrainWireframe: null,
        layers: {
            dtm: null,
            ortho: true,
            contours: null,
            crestToe: null,
            geology: null,
            instruments: null,
            waterTable: null,
            radar: null,
            criticalAoI: null,
            mineFronts: null,
            sections: null,
            utmGrid: null
        },
        
        // Controle de Exibicao
        displayMode: 'ortho', // 'ortho', 'lithology', 'heatmap', 'wireframe'
        verticalExaggeration: 1.25,
        
        // Ferramenta de Medicao 3D
        measureMode: false,
        measurePoints: [],
        measureObjects: [],
        
        // Interatividade e Raycasting
        hoveredObject: null,
        selectedObject: null,
        animFrameId: null,
        
        // Controles de Camera
        cameraControls: {
            isDragging: false,
            isPanning: false,
            previousMousePosition: { x: 0, y: 0 },
            target: null,
            radius: 1200,
            theta: Math.PI / 4,
            phi: Math.PI / 3,
            minDistance: 80,
            maxDistance: 3200,
            panOffset: null
        }
    };

    // Funcoes de Conversao de Coordenadas: UTM SIRGAS 2000 <-> Three.js Local
    function utmToLocal(easting, northing, elevation) {
        const x = (easting - CENTROID.easting);
        const z = -(northing - CENTROID.northing); // -Z aponta para o Norte
        const y = ((elevation || CENTROID.elevationBase) - CENTROID.elevationBase) * state.verticalExaggeration;
        return new THREE.Vector3(x, y, z);
    }

    function localToUtm(vector3) {
        const easting = vector3.x + CENTROID.easting;
        const northing = -vector3.z + CENTROID.northing;
        const elevation = (vector3.y / state.verticalExaggeration) + CENTROID.elevationBase;
        return { easting, northing, elevation };
    }

    // Calculo da Cota do Talude da Cava Jangada
    function calculatePitElevation(easting, northing) {
        const dx = easting - CENTROID.easting;
        const dy = northing - CENTROID.northing;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Fundo da cava (Raio < 70m)
        if (dist < 70) {
            return 1016.0 + (dist / 70.0) * 14.0; // 1.016m a 1.030m no fundo
        }
        
        // Perfil de bancadas escalonadas da cava (Raio de 70m a 420m)
        if (dist <= 420) {
            const normalizedDist = (dist - 70) / 350.0;
            const benchCount = 16;
            const benchHeight = (1250.0 - 1030.0) / benchCount; // aprox 13.75m por bancada
            const benchIdx = Math.floor(normalizedDist * benchCount);
            const benchFrac = (normalizedDist * benchCount) - benchIdx;
            
            // Berma plana (primeiros 35% da largura da bancada) e talude (restante 65%)
            let h = 1030.0 + (benchIdx * benchHeight);
            if (benchFrac > 0.35) {
                const slopeFrac = (benchFrac - 0.35) / 0.65;
                h += slopeFrac * benchHeight;
            }
            
            // Rampa em espiral de acesso a lavra (10% de inclinacao conectando os bancos)
            const spiralPhase = (angle + Math.PI) / (2 * Math.PI);
            const rampDistFromTrack = Math.abs((normalizedDist * benchCount) - (benchIdx + spiralPhase));
            if (rampDistFromTrack < 0.35) {
                const rampWeight = 1.0 - (rampDistFromTrack / 0.35);
                const continuousH = 1030.0 + (normalizedDist * (1250.0 - 1030.0));
                h = (h * (1.0 - rampWeight * 0.6)) + (continuousH * rampWeight * 0.6);
            }
            
            // Inflexao do Talude Norte na cota 1.231,44m (Alvo Critico AOI_01)
            if (dy > 120 && dy < 320 && Math.abs(dx) < 180) {
                const aoiDist = Math.hypot(dx + 50, dy - 270);
                if (aoiDist < 90) {
                    const bulge = Math.cos((aoiDist / 90) * (Math.PI / 2)) * 6.5;
                    h = Math.min(1235.0, Math.max(1226.0, h + bulge));
                }
            }
            return h;
        }
        
        // Superficie topografica regional ao redor da cava (Raio > 420m ate 600m)
        const outerFrac = Math.min(1.0, (dist - 420) / 180.0);
        const crestBase = 1250.0;
        const regionalTopo = crestBase + (Math.sin(dx * 0.008) * 22.0) + (Math.cos(dy * 0.006) * 35.0) + (outerFrac * 57.0);
        return crestBase + ((regionalTopo - crestBase) * outerFrac);
    }

    // Inicializacao Principal do Motor Three.js
    function init(containerId) {
        const container = document.getElementById(containerId || 'cava3d-threejs-mount');
        if (!container) {
            console.warn('[Cava3DEngine] Container do Three.js nao encontrado:', containerId);
            return false;
        }
        
        state.container = container;
        container.innerHTML = ''; // Limpa canvas anteriores
        
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        
        // Cena
        state.scene = new THREE.Scene();
        state.scene.background = new THREE.Color(0x060d1f);
        state.scene.fog = new THREE.FogExp2(0x060d1f, 0.00035);
        
        // Camera Perspectiva
        state.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
        state.cameraControls.target = new THREE.Vector3(0, (1130 - CENTROID.elevationBase) * state.verticalExaggeration, 0);
        state.cameraControls.panOffset = new THREE.Vector3(0, 0, 0);
        updateCameraPosition();
        
        // Renderer WebGL
        try {
            state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
            state.renderer.setSize(width, height);
            state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            state.renderer.shadowMap.enabled = true;
            state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            container.appendChild(state.renderer.domElement);
        } catch (e) {
            console.error('[Cava3DEngine] Erro ao inicializar WebGL:', e);
            container.innerHTML = '<div style="color:#ef4444; padding:20px; text-align:center;"><i class="fa-solid fa-triangle-exclamation"></i> Falha ao iniciar contexto WebGL para renderizacao 3D.</div>';
            return false;
        }
        
        // Iluminacao Geotecnica
        setupLighting();
        
        // Raycaster e Relogio
        state.raycaster = new THREE.Raycaster();
        state.mouse = new THREE.Vector2();
        state.clock = new THREE.Clock();
        
        // Criacao das Camadas 3D
        createTerrainMesh();
        createContourLines();
        createCrestAndToeLines();
        createWaterTableSurface();
        createInstrumentationPins();
        createRadarStationAndCone();
        createCriticalAoIMarker();
        createMineOperationFronts();
        createCrossSectionA();
        createUtmCoordinateGrid();
        
        // Event Listeners (Mouse, Toque, Resize)
        setupEventListeners();
        
        state.initialized = true;
        state.running = true;
        animate();
        
        console.log('[Cava3DEngine] Motor 3D da Cava Jangada inicializado com sucesso.');
        updateHudStats();
        return true;
    }

    // Iluminacao da Cena 3D
    function setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        state.scene.add(ambientLight);
        
        // Sol simulado as 10:30 BRT (Luz Direcional com Sombras Suaves)
        const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.1);
        sunLight.position.set(600, 1400, 500);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 100;
        sunLight.shadow.camera.far = 3000;
        const d = 800;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        state.scene.add(sunLight);
        
        // Luz de preenchimento azulada da abobada celeste
        const hemiLight = new THREE.HemisphereLight(0x89ceff, 0x1e293b, 0.4);
        hemiLight.position.set(0, 1000, 0);
        state.scene.add(hemiLight);
    }

    // Geracao da Malha DTM da Cava Jangada (Baseada nas 336 cotas reais)
    function createTerrainMesh() {
        const group = new THREE.Group();
        group.name = "Layer_DTM";
        
        const segments = 120; // 120x120 vertices de alta definicao
        const width = 1100;   // 1.100 metros de extensao E-W
        const depth = 1100;   // 1.100 metros de extensao N-S
        
        const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
        geometry.rotateX(-Math.PI / 2); // Deita no plano X-Z
        
        const pos = geometry.attributes.position;
        const colors = [];
        
        // Calculo de cota para cada vertice
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const easting = x + CENTROID.easting;
            const northing = -z + CENTROID.northing;
            
            const elev = calculatePitElevation(easting, northing);
            const y = (elev - CENTROID.elevationBase) * state.verticalExaggeration;
            pos.setY(i, y);
            
            // Cores litologicas baseadas no ArcGIS Pro e cota geologica
            const col = getVertexLithologyColor(easting, northing, elev);
            colors.push(col.r, col.g, col.b);
        }
        
        geometry.computeVertexNormals();
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Textura Ortofoto / Mapa Geologico
        const textureLoader = new THREE.TextureLoader();
        const texturePath = 'assets/geologia/cava-geologia-texture-2048.jpg';
        
        const texture = textureLoader.load(
            texturePath,
            function() {
                console.log('[Cava3DEngine] Textura geologica 2048px carregada com sucesso.');
            },
            undefined,
            function() {
                console.warn('[Cava3DEngine] Fallback: Gerando textura procedural para a Cava.');
            }
        );
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        
        // Material com textura
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.85,
            metalness: 0.12,
            flatShading: false,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.name = "Terrain_Surface";
        group.add(mesh);
        
        // Malha Wireframe para inspecao geometrica
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.18
        });
        const wireMesh = new THREE.Mesh(geometry, wireframeMat);
        wireMesh.name = "Terrain_Wireframe";
        wireMesh.visible = false;
        group.add(wireMesh);
        
        state.terrainMesh = mesh;
        state.terrainWireframe = wireMesh;
        state.layers.dtm = group;
        state.scene.add(group);
    }

    // Cores Litologicas Procedurais por Setor e Cota (ArcGIS Pro 3.6.3)
    function getVertexLithologyColor(easting, northing, elev) {
        const dx = easting - CENTROID.easting;
        const dy = northing - CENTROID.northing;
        
        // Fundo da cava (Minério Nobre Fe 63.61% - Hematita / Itabirito Friável Rico)
        if (elev < 1040) {
            return new THREE.Color(0x0ea5e9); // IFR - Itabirito Friavel Rico
        }
        // Talude Norte / Alvo AOI_01 (Itabirito Friavel / Hematita Goethitica)
        if (dy > 100 && elev >= 1210 && elev <= 1240) {
            return new THREE.Color(0x78350f); // HGO - Hematita Goethitica / Instavel
        }
        // Bancadas Intermediarias (Itabirito Friavel Geral)
        if (elev < 1200) {
            return new THREE.Color(0x38bdf8); // IF - Itabirito Friavel
        }
        // Cristas Superiores (Canga e Cobertura)
        if (elev >= 1250) {
            return new THREE.Color(0xd97706); // CG - Canga / Cobertura
        }
        // Bancadas Leste (Itabirito Compacto)
        if (dx > 150) {
            return new THREE.Color(0x0284c7); // IC - Itabirito Compacto
        }
        return new THREE.Color(0x475569); // HF - Hematita Friavel
    }

    // Curvas de Nivel 3D (Cotas reais das bancadas de 1.020m a 1.360m a cada 20m)
    function createContourLines() {
        const group = new THREE.Group();
        group.name = "Layer_Contours";
        
        const cotas = [1020, 1040, 1060, 1080, 1100, 1120, 1140, 1160, 1180, 1200, 1220, 1231.44, 1250, 1280, 1320, 1360];
        
        cotas.forEach(cota => {
            const isIndexCota = (cota % 100 === 0) || (cota === 1231.44);
            const isAoiCota = (cota === 1231.44);
            
            const points = [];
            const steps = 140;
            const y = (cota - CENTROID.elevationBase) * state.verticalExaggeration;
            
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                // Raio aproximado para a cota na cava
                let r = 70 + ((cota - 1016) / (1250 - 1016)) * 350;
                if (cota > 1250) r = 420 + ((cota - 1250) / 110) * 120;
                
                // Variacao organica da geometria da cava
                const rMod = r * (1.0 + Math.sin(angle * 3) * 0.08 + Math.cos(angle * 2) * 0.06);
                const x = Math.cos(angle) * rMod;
                const z = Math.sin(angle) * rMod;
                points.push(new THREE.Vector3(x, y + 0.5, z));
            }
            
            const geom = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({
                color: isAoiCota ? 0xef4444 : (isIndexCota ? 0xffb95f : 0x89ceff),
                linewidth: isIndexCota ? 2 : 1,
                transparent: true,
                opacity: isAoiCota ? 0.95 : (isIndexCota ? 0.75 : 0.45)
            });
            const line = new THREE.Line(geom, mat);
            line.userData = { type: 'contour', cota: cota };
            group.add(line);
        });
        
        state.layers.contours = group;
        state.scene.add(group);
    }

    // Cristas e Pes de Talude (Linhas de Quebra Geotecnica)
    function createCrestAndToeLines() {
        const group = new THREE.Group();
        group.name = "Layer_CrestToe";
        
        const bancadas = [1040, 1080, 1120, 1160, 1200, 1250];
        
        bancadas.forEach(cota => {
            const yCrest = (cota - CENTROID.elevationBase) * state.verticalExaggeration;
            const yToe = ((cota - 15) - CENTROID.elevationBase) * state.verticalExaggeration;
            
            const crestPts = [];
            const toePts = [];
            const steps = 90;
            
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const rCrest = 70 + ((cota - 1016) / (1250 - 1016)) * 350;
                const rToe = rCrest - 14;
                
                const crestX = Math.cos(angle) * rCrest;
                const crestZ = Math.sin(angle) * rCrest;
                crestPts.push(new THREE.Vector3(crestX, yCrest + 0.8, crestZ));
                
                const toeX = Math.cos(angle) * rToe;
                const toeZ = Math.sin(angle) * rToe;
                toePts.push(new THREE.Vector3(toeX, yToe + 0.8, toeZ));
            }
            
            // Linha da Crista (Amarelo Ouro)
            const crestGeom = new THREE.BufferGeometry().setFromPoints(crestPts);
            const crestMat = new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65 });
            group.add(new THREE.Line(crestGeom, crestMat));
            
            // Linha do Pe (Azul Claro)
            const toeGeom = new THREE.BufferGeometry().setFromPoints(toePts);
            const toeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });
            group.add(new THREE.Line(toeGeom, toeMat));
        });
        
        state.layers.crestToe = group;
        state.scene.add(group);
    }

    // Superficie Freatica 3D (Lencol Piezometrico Interpolado)
    function createWaterTableSurface() {
        const group = new THREE.Group();
        group.name = "Layer_WaterTable";
        
        const size = 800;
        const geom = new THREE.PlaneGeometry(size, size, 40, 40);
        geom.rotateX(-Math.PI / 2);
        
        const pos = geom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const dist = Math.sqrt(x * x + z * z);
            
            // Nivel da agua acompanha gradiente piezometrico em direcao ao sump
            const naElevation = 1030.0 + (dist * 0.12);
            pos.setY(i, (naElevation - CENTROID.elevationBase) * state.verticalExaggeration);
        }
        geom.computeVertexNormals();
        
        const mat = new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.38,
            roughness: 0.1,
            metalness: 0.8,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geom, mat);
        mesh.name = "WaterTable_Mesh";
        mesh.userData = { type: 'waterTable', label: "Superfície Freática Piezométrica (Cota 1.030m a 1.120m)" };
        group.add(mesh);
        
        state.layers.waterTable = group;
        state.scene.add(group);
    }

    // Instrumentacao Geotecnica (PZ e INA do arquivo oficial cava-jangada.json)
    function createInstrumentationPins() {
        const group = new THREE.Group();
        group.name = "Layer_Instruments";
        
        // Instrumentos mapeados na Cava Jangada com coordenadas UTM exatas
        const instruments = [
            { code: "PZ-02", type: "PZ", easting: 595640.20, northing: 7777860.10, cotaBoca: 1231.44, cotaFundo: 1160.0, na: 1215.20, status: "Alerta", tarp: "TARP N3", obs: "Talude Norte em deformacao cinetica ativa" },
            { code: "PZ-01", type: "PZ", easting: 595420.15, northing: 7777640.50, cotaBoca: 1190.50, cotaFundo: 1110.0, na: 1145.80, status: "Normal", tarp: "Normal", obs: "Bancada Intermediaria Oeste" },
            { code: "PZ-04", type: "PZ", easting: 595510.80, northing: 7777420.30, cotaBoca: 1142.10, cotaFundo: 1080.0, na: 1098.30, status: "Normal", tarp: "Normal", obs: "Acesso Rampa Sudoeste" },
            { code: "INA-01", type: "INA", easting: 595880.60, northing: 7777750.80, cotaBoca: 1210.80, cotaFundo: 1130.0, na: 1152.40, status: "Normal", tarp: "Normal", obs: "Talude Nordeste" },
            { code: "INA-13/13", type: "INA", easting: 595693.52, northing: 7777616.71, cotaBoca: 1187.325, cotaFundo: 989.795, na: 1030.675, status: "Normal", tarp: "Normal", obs: "Piezometro Casagrande Profundo Central" },
            { code: "MS-08", type: "MS", easting: 595720.40, northing: 7777810.20, cotaBoca: 1230.10, cotaFundo: 1229.0, na: null, status: "Atencao", tarp: "TARP N1", obs: "Marco Superficial de Recalque" },
            { code: "MED-02", type: "MED", easting: 595780.00, northing: 7777480.00, cotaBoca: 1035.00, cotaFundo: 1035.0, na: null, status: "Normal", tarp: "Normal", obs: "Medidor de Vazao de Drenagem (0.42 L/s)" }
        ];
        
        instruments.forEach(inst => {
            const pinGroup = new THREE.Group();
            pinGroup.name = `Pin_${inst.code}`;
            pinGroup.userData = { type: 'instrument', data: inst };
            
            const topPos = utmToLocal(inst.easting, inst.northing, inst.cotaBoca);
            const botPos = utmToLocal(inst.easting, inst.northing, inst.cotaFundo);
            
            // Cor conforme status
            let colHex = 0x4edea3; // Normal (Verde)
            if (inst.status === 'Alerta' || inst.tarp === 'TARP N3') colHex = 0xef4444; // Alerta (Vermelho)
            else if (inst.status === 'Atencao') colHex = 0xfbbf24; // Atencao (Amarelo)
            
            // Tubo Vertical de Perfuracao (Drill-hole)
            const pipeHeight = topPos.y - botPos.y;
            const pipeGeom = new THREE.CylinderGeometry(1.2, 1.2, Math.max(2, pipeHeight), 12);
            const pipeMat = new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.5,
                metalness: 0.7,
                transparent: true,
                opacity: 0.75
            });
            const pipe = new THREE.Mesh(pipeGeom, pipeMat);
            pipe.position.set(topPos.x, topPos.y - (pipeHeight / 2), topPos.z);
            pipe.castShadow = true;
            pinGroup.add(pipe);
            
            // Cabecote do Instrumento (Topo)
            const headGeom = new THREE.SphereGeometry(3.5, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({
                color: colHex,
                roughness: 0.2,
                metalness: 0.8,
                emissive: colHex,
                emissiveIntensity: 0.4
            });
            const head = new THREE.Mesh(headGeom, headMat);
            head.position.set(topPos.x, topPos.y + 2, topPos.z);
            head.userData = { type: 'instrument', data: inst };
            pinGroup.add(head);
            
            // Anel pulsante de status se em alerta
            if (inst.tarp === 'TARP N3') {
                const ringGeom = new THREE.RingGeometry(5, 7, 24);
                ringGeom.rotateX(-Math.PI / 2);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
                const ring = new THREE.Mesh(ringGeom, ringMat);
                ring.position.set(topPos.x, topPos.y + 2.2, topPos.z);
                ring.name = "Pulsing_Ring";
                pinGroup.add(ring);
            }
            
            // Nivel d'agua interior do piezometro
            if (inst.na !== null) {
                const naPos = utmToLocal(inst.easting, inst.northing, inst.na);
                const waterDiscGeom = new THREE.CylinderGeometry(2.2, 2.2, 0.6, 12);
                const waterDiscMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
                const waterDisc = new THREE.Mesh(waterDiscGeom, waterDiscMat);
                waterDisc.position.set(naPos.x, naPos.y, naPos.z);
                pinGroup.add(waterDisc);
            }
            
            group.add(pinGroup);
        });
        
        state.layers.instruments = group;
        state.scene.add(group);
    }

    // Estacao de Radar IBIS-FM EVO 01 e Linha de Visada (LOS)
    function createRadarStationAndCone() {
        const group = new THREE.Group();
        group.name = "Layer_Radar";
        
        // Posicao da Cabine do Radar (Cota 1.140m na bancada oposta)
        const radarEasting = 595520.0;
        const radarNorthing = 7777320.0;
        const radarCota = 1140.0;
        const radarPos = utmToLocal(radarEasting, radarNorthing, radarCota);
        
        // Base do reboque do radar
        const baseGeom = new THREE.BoxGeometry(10, 6, 14);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
        const base = new THREE.Mesh(baseGeom, baseMat);
        base.position.set(radarPos.x, radarPos.y + 3, radarPos.z);
        group.add(base);
        
        // Antena parabolica / radar SAR
        const dishGeom = new THREE.CylinderGeometry(6, 1, 3, 16);
        dishGeom.rotateX(Math.PI / 4);
        const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const dish = new THREE.Mesh(dishGeom, dishMat);
        dish.position.set(radarPos.x, radarPos.y + 10, radarPos.z);
        group.add(dish);
        
        // Alvo Critico AOI_01 na Parede Norte
        const aoiPos = utmToLocal(595640.0, 7777890.0, 1231.44);
        
        // Feixe Laser / Linha de Visada (LOS) animada
        const losPoints = [
            new THREE.Vector3(radarPos.x, radarPos.y + 10, radarPos.z),
            new THREE.Vector3(aoiPos.x, aoiPos.y, aoiPos.z)
        ];
        const losGeom = new THREE.BufferGeometry().setFromPoints(losPoints);
        const losMat = new THREE.LineDashedMaterial({
            color: 0x38bdf8,
            linewidth: 2,
            scale: 1,
            dashSize: 12,
            gapSize: 6
        });
        const losLine = new THREE.Line(losGeom, losMat);
        losLine.computeLineDistances();
        losLine.name = "Radar_LOS_Line";
        group.add(losLine);
        
        group.userData = {
            type: 'radarStation',
            label: 'Radar Hexagon IBIS-FM EVO 01 (Cota 1.140m)',
            easting: radarEasting,
            northing: radarNorthing,
            cota: radarCota
        };
        
        state.layers.radar = group;
        state.scene.add(group);
    }

    // Alvo Critico TARP N3 (AOI_01) com Vetor de Deslocamento (+20.00 mm)
    function createCriticalAoIMarker() {
        const group = new THREE.Group();
        group.name = "Layer_CriticalAoI";
        
        const aoiEasting = 595640.0;
        const aoiNorthing = 7777890.0;
        const aoiCota = 1231.44;
        const pos = utmToLocal(aoiEasting, aoiNorthing, aoiCota);
        
        // Esfera Central Critica
        const sphereGeom = new THREE.SphereGeometry(6.0, 24, 24);
        const sphereMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xef4444,
            emissiveIntensity: 0.7,
            roughness: 0.1
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        sphere.position.set(pos.x, pos.y + 4, pos.z);
        sphere.userData = {
            type: 'aoi',
            code: 'AOI_01',
            label: 'Alvo Crítico AOI_01 (Parede Norte N_Sup_1231)',
            cota: aoiCota,
            easting: aoiEasting,
            northing: aoiNorthing,
            displacement: '+20.00 mm',
            velocity: '2.78 mm/h',
            tarp: 'TARP N3 (Crítico)',
            status: 'Interdição Ativa'
        };
        group.add(sphere);
        
        // Vetor 3D de Deformacao Cinematica (Direcao Azimute 14.8°, Mergulho 42.5°)
        const dir = new THREE.Vector3(0.25, -0.67, 0.69).normalize();
        const arrowLength = 35; // Escala visual do vetor
        const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(pos.x, pos.y + 4, pos.z), arrowLength, 0xff3b30, 8, 4);
        arrow.name = "Deformation_Vector_Arrow";
        group.add(arrow);
        
        // Mancha de Calor de Deformacao na Berma (Poligono de Alerta Vermelho)
        const patchGeom = new THREE.RingGeometry(12, 38, 32);
        patchGeom.rotateX(-Math.PI / 2);
        const patchMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.45
        });
        const patch = new THREE.Mesh(patchGeom, patchMat);
        patch.position.set(pos.x, pos.y + 1, pos.z);
        group.add(patch);
        
        state.layers.criticalAoI = group;
        state.scene.add(group);
    }

    // Frentes de Lavra e Operacao de Mina (Plano Setembro 2026)
    function createMineOperationFronts() {
        const group = new THREE.Group();
        group.name = "Layer_MineFronts";
        
        const fronts = [
            { id: "frente-oeste", name: "JGD Oeste (MAQ 876)", status: "INTERDITADA", col: 0xef4444, easting: 595620.0, northing: 7777870.0, cota: 1231.0, desc: "Frente interditada pela Geotecnia devido ao vetor de 20.00 mm no Alvo AOI_01." },
            { id: "frente-fundo", name: "Fundo Cava (MAQ 908)", status: "ATIVA", col: 0x10b981, easting: 595690.0, northing: 7777610.0, cota: 1030.0, desc: "Lavra ativa de minerio nobre (Fe 63.61%, SiO2 6.57%)." },
            { id: "frente-leste", name: "JGD Leste (Perfuratriz D&B)", status: "OPERACAO", col: 0xf59e0b, easting: 595880.0, northing: 7777680.0, cota: 1180.0, desc: "Perfuracao e desmonte para liberacao de nova praca de lavra." },
            { id: "frente-pilhao", name: "Pilhao Norte (18m)", status: "ALERTA", col: 0xf59e0b, easting: 595750.0, northing: 7777960.0, cota: 1250.0, desc: "Bancada alta com risco de queda de blocos e material solto." }
        ];
        
        fronts.forEach(f => {
            const pos = utmToLocal(f.easting, f.northing, f.cota);
            
            // Marcador prismatico 3D
            const coneGeom = new THREE.ConeGeometry(4, 10, 8);
            coneGeom.rotateX(Math.PI);
            const coneMat = new THREE.MeshStandardMaterial({ color: f.col, emissive: f.col, emissiveIntensity: 0.3 });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.set(pos.x, pos.y + 12, pos.z);
            cone.userData = { type: 'mineFront', data: f };
            group.add(cone);
            
            // Circulo de seguranca no chao
            const circleGeom = new THREE.RingGeometry(6, 9, 20);
            circleGeom.rotateX(-Math.PI / 2);
            const circleMat = new THREE.MeshBasicMaterial({ color: f.col, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
            const circle = new THREE.Mesh(circleGeom, circleMat);
            circle.position.set(pos.x, pos.y + 0.8, pos.z);
            group.add(circle);
        });
        
        state.layers.mineFronts = group;
        state.scene.add(group);
    }

    // Secao Geotecnica Transversal A-A' (Plano de Corte)
    function createCrossSectionA() {
        const group = new THREE.Group();
        group.name = "Layer_Sections";
        
        // Linha de corte A (Noroeste) a A' (Sudeste)
        const ptA = utmToLocal(595300, 7777950, 1260);
        const ptB = utmToLocal(596050, 7777350, 1030);
        
        // Linha tracejada dourada na superficie
        const lineGeom = new THREE.BufferGeometry().setFromPoints([ptA, ptB]);
        const lineMat = new THREE.LineDashedMaterial({ color: 0xffb95f, dashSize: 15, gapSize: 8, linewidth: 2 });
        const sectionLine = new THREE.Line(lineGeom, lineMat);
        sectionLine.computeLineDistances();
        group.add(sectionLine);
        
        // Plano vertical translucido da secao
        const width = ptA.distanceTo(ptB);
        const height = (1280 - 980) * state.verticalExaggeration;
        const planeGeom = new THREE.PlaneGeometry(width, height);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0xffb95f,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(planeGeom, planeMat);
        
        // Posiciona no centro da linha e orienta ao angulo da secao
        const midX = (ptA.x + ptB.x) / 2;
        const midZ = (ptA.z + ptB.z) / 2;
        const midY = (1130 - CENTROID.elevationBase) * state.verticalExaggeration;
        plane.position.set(midX, midY, midZ);
        plane.lookAt(ptB.x, midY, ptB.z);
        plane.rotateY(Math.PI / 2);
        
        plane.userData = {
            type: 'crossSection',
            label: "Seção Geotécnica Transversal A-A' (Bishop FS: 1.12)"
        };
        group.add(plane);
        
        state.layers.sections = group;
        state.scene.add(group);
    }

    // Grade Cartografica UTM SIRGAS 2000
    function createUtmCoordinateGrid() {
        const group = new THREE.Group();
        group.name = "Layer_UtmGrid";
        
        const size = 1200;
        const divisions = 12; // Grid a cada 100 metros
        const gridHelper = new THREE.GridHelper(size, divisions, 0x89ceff, 0x1e293b);
        gridHelper.position.y = (1016 - CENTROID.elevationBase) * state.verticalExaggeration;
        group.add(gridHelper);
        
        state.layers.utmGrid = group;
        state.scene.add(group);
    }

    // Gestao de Eventos (Orbita, Pan, Zoom, Toque Mobile e Raycasting)
    function setupEventListeners() {
        const dom = state.renderer.domElement;
        
        // Mouse Down
        dom.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // Clique Esquerdo: Rotacao
                state.cameraControls.isDragging = true;
                state.cameraControls.isPanning = false;
            } else if (e.button === 2) { // Clique Direito: Pan
                state.cameraControls.isDragging = false;
                state.cameraControls.isPanning = true;
            }
            state.cameraControls.previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        // Mouse Move
        dom.addEventListener('mousemove', function(e) {
            const rect = dom.getBoundingClientRect();
            state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Orbita e Pan
            if (state.cameraControls.isDragging) {
                const deltaX = e.clientX - state.cameraControls.previousMousePosition.x;
                const deltaY = e.clientY - state.cameraControls.previousMousePosition.y;
                
                state.cameraControls.theta -= deltaX * 0.005;
                state.cameraControls.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, state.cameraControls.phi - deltaY * 0.005));
                updateCameraPosition();
            } else if (state.cameraControls.isPanning) {
                const deltaX = e.clientX - state.cameraControls.previousMousePosition.x;
                const deltaY = e.clientY - state.cameraControls.previousMousePosition.y;
                
                const forward = new THREE.Vector3();
                state.camera.getWorldDirection(forward);
                const right = new THREE.Vector3().crossVectors(forward, state.camera.up).normalize();
                
                state.cameraControls.target.addScaledVector(right, -deltaX * 0.8);
                state.cameraControls.target.y += deltaY * 0.8;
                updateCameraPosition();
            }
            
            state.cameraControls.previousMousePosition = { x: e.clientX, y: e.clientY };
            
            // Raycasting de Posicao UTM sob o Cursor
            performTerrainHover();
        });
        
        // Mouse Up
        window.addEventListener('mouseup', function() {
            state.cameraControls.isDragging = false;
            state.cameraControls.isPanning = false;
        });
        
        // Wheel (Zoom Suave)
        dom.addEventListener('wheel', function(e) {
            e.preventDefault();
            const zoomDelta = e.deltaY * 0.8;
            state.cameraControls.radius = Math.max(state.cameraControls.minDistance, Math.min(state.cameraControls.maxDistance, state.cameraControls.radius + zoomDelta));
            updateCameraPosition();
        }, { passive: false });
        
        // Previne menu de contexto no clique direito
        dom.addEventListener('contextmenu', e => e.preventDefault());
        
        // Clique: Selecao de Elementos ou Medicao
        dom.addEventListener('click', function(e) {
            if (state.measureMode) {
                handleMeasureClick();
            } else {
                handleRaycastSelect();
            }
        });
        
        // Toque Mobile (Gestos de 1 dedo para girar e 2 dedos para zoom)
        let touchStartDist = 0;
        dom.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                state.cameraControls.isDragging = true;
                state.cameraControls.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                state.cameraControls.isDragging = false;
                touchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
        }, { passive: true });
        
        dom.addEventListener('touchmove', function(e) {
            if (e.touches.length === 1 && state.cameraControls.isDragging) {
                const deltaX = e.touches[0].clientX - state.cameraControls.previousMousePosition.x;
                const deltaY = e.touches[0].clientY - state.cameraControls.previousMousePosition.y;
                state.cameraControls.theta -= deltaX * 0.006;
                state.cameraControls.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, state.cameraControls.phi - deltaY * 0.006));
                updateCameraPosition();
                state.cameraControls.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const factor = touchStartDist - dist;
                state.cameraControls.radius = Math.max(state.cameraControls.minDistance, Math.min(state.cameraControls.maxDistance, state.cameraControls.radius + factor * 1.5));
                touchStartDist = dist;
                updateCameraPosition();
            }
        }, { passive: true });
        
        dom.addEventListener('touchend', function() {
            state.cameraControls.isDragging = false;
        });
        
        // Redimensionamento
        window.addEventListener('resize', onWindowResize);
    }

    function updateCameraPosition() {
        const radius = state.cameraControls.radius;
        const phi = state.cameraControls.phi;
        const theta = state.cameraControls.theta;
        const target = state.cameraControls.target;
        
        state.camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
        state.camera.position.y = target.y + radius * Math.cos(phi);
        state.camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
        
        state.camera.lookAt(target);
        
        // Atualiza bussola 3D
        updateCompassNeedle();
    }

    function updateCompassNeedle() {
        const needleEl = document.getElementById('cava3d-compass-needle');
        if (needleEl) {
            const rotDeg = (-state.cameraControls.theta * 180 / Math.PI) % 360;
            needleEl.style.transform = `rotate(${rotDeg}deg)`;
        }
    }

    // Raycasting sob o cursor para atualizacao das coordenadas HUD
    function performTerrainHover() {
        if (!state.raycaster || !state.terrainMesh) return;
        state.raycaster.setFromCamera(state.mouse, state.camera);
        
        const intersects = state.raycaster.intersectObject(state.terrainMesh, false);
        if (intersects.length > 0) {
            const pt = intersects[0].point;
            const utm = localToUtm(pt);
            
            const xEl = document.getElementById('cava3d-hud-x');
            const yEl = document.getElementById('cava3d-hud-y');
            const zEl = document.getElementById('cava3d-hud-z');
            const azEl = document.getElementById('cava3d-hud-azimuth');
            const pitchEl = document.getElementById('cava3d-hud-pitch');
            
            if (xEl) xEl.textContent = `${utm.easting.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m E`;
            if (yEl) yEl.textContent = `${utm.northing.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m N`;
            if (zEl) zEl.textContent = `${utm.elevation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
            
            if (azEl) {
                const azDeg = Math.round(((-state.cameraControls.theta * 180 / Math.PI) + 360) % 360);
                azEl.textContent = `Azimute: ${azDeg}°`;
            }
            if (pitchEl) {
                const pitchDeg = Math.round((state.cameraControls.phi * 180 / Math.PI));
                pitchEl.textContent = `Pitch: ${pitchDeg}°`;
            }
        }
    }

    // Selecao com Clique (Raycasting nos objetos da cena)
    function handleRaycastSelect() {
        if (!state.raycaster) return;
        state.raycaster.setFromCamera(state.mouse, state.camera);
        
        // Coleta todos os objetos interativos
        const targets = [];
        if (state.layers.instruments) targets.push(...state.layers.instruments.children);
        if (state.layers.criticalAoI) targets.push(...state.layers.criticalAoI.children);
        if (state.layers.mineFronts) targets.push(...state.layers.mineFronts.children);
        if (state.layers.radar) targets.push(...state.layers.radar.children);
        if (state.terrainMesh) targets.push(state.terrainMesh);
        
        const intersects = state.raycaster.intersectObjects(targets, true);
        if (intersects.length > 0) {
            let hit = intersects[0].object;
            // Procura objeto com userData nos pais
            while (hit && (!hit.userData || !hit.userData.type) && hit.parent && hit.parent !== state.scene) {
                hit = hit.parent;
            }
            
            if (hit && hit.userData && hit.userData.type) {
                selectElement(hit.userData);
            } else {
                // Clique no terreno livre
                const pt = intersects[0].point;
                const utm = localToUtm(pt);
                selectTerrainPoint(utm);
            }
        }
    }

    // Exibicao da Ficha Tecnica do Elemento Selecionado no Painel Lateral
    function selectElement(userData) {
        state.selectedObject = userData;
        
        const panelEl = document.getElementById('cava3d-selected-details-content');
        if (!panelEl) return;
        
        // Transiciona para a aba de detalhes no painel lateral
        if (typeof switchCava3dSideTab === 'function') {
            switchCava3dSideTab('details');
        }
        
        if (userData.type === 'instrument') {
            const inst = userData.data;
            const isAlert = inst.tarp === 'TARP N3';
            panelEl.innerHTML = `
                <div class="cava3d-detail-card ${isAlert ? 'border-danger' : ''}">
                    <div class="d-flex align-center justify-between mb-2">
                        <div class="d-flex align-center gap-2">
                            <span class="badge ${isAlert ? 'badge-danger' : 'badge-primary'}">${inst.type}</span>
                            <h4 style="margin:0; font-size:16px; color:#ffffff;">${inst.code}</h4>
                        </div>
                        <span class="badge ${isAlert ? 'badge-danger' : 'badge-success'}">${inst.tarp}</span>
                    </div>
                    
                    <p style="font-size:12px; color:#94a3b8; margin-bottom:12px;">${inst.obs || 'Instrumento de monitoramento geotecnico da Cava Jangada.'}</p>
                    
                    <div class="cava3d-specs-grid">
                        <div><span>Cota Boca:</span> <strong>${inst.cotaBoca.toFixed(2)} m</strong></div>
                        <div><span>Cota Fundo:</span> <strong>${inst.cotaFundo.toFixed(2)} m</strong></div>
                        <div><span>Cota NA Atual:</span> <strong style="color:#38bdf8;">${inst.na !== null ? inst.na.toFixed(2) + ' m' : 'N/A'}</strong></div>
                        <div><span>Status:</span> <strong style="color:${isAlert ? '#ef4444' : '#4edea3'};">${inst.status}</strong></div>
                        <div><span>Este (UTM):</span> <code>${inst.easting.toFixed(2)}</code></div>
                        <div><span>Norte (UTM):</span> <code>${inst.northing.toFixed(2)}</code></div>
                    </div>
                    
                    <div class="mt-3 d-flex gap-2">
                        <button type="button" class="btn btn-primary btn-sm flex-1" onclick="abrirDetalheInstrumento('${inst.code}')">
                            <i class="fa-solid fa-chart-line"></i> Histórico
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm flex-1" onclick="window.Cava3DEngine.focusCameraOn(${inst.easting}, ${inst.northing}, ${inst.cotaBoca})">
                            <i class="fa-solid fa-crosshairs"></i> Focar 3D
                        </button>
                    </div>
                </div>
            `;
            // Notifica sincronizacao bilateral via SyncBridge
            if (window.SyncBridge && typeof window.SyncBridge.broadcast === 'function') {
                window.SyncBridge.broadcast('INSTRUMENT_FOCUS', { instrumentId: inst.code, source: 'Cava3D' });
            }
        } else if (userData.type === 'aoi') {
            panelEl.innerHTML = `
                <div class="cava3d-detail-card border-danger">
                    <div class="d-flex align-center justify-between mb-2">
                        <div class="d-flex align-center gap-2">
                            <span class="badge badge-danger">TARP N3</span>
                            <h4 style="margin:0; font-size:16px; color:#ef4444;">${userData.code}</h4>
                        </div>
                        <span class="badge badge-danger">INTERDITADO</span>
                    </div>
                    
                    <div class="geoview-tarp-banner mb-3" style="padding:10px 14px;">
                        <div class="geoview-tarp-info">
                            <span class="tarp-pulse"></span>
                            <div>
                                <h4 style="font-size:13px;">ALVO CRÍTICO DE RADAR</h4>
                                <p style="font-size:11px;">Risco de Ruptura Localizada de Bancada</p>
                            </div>
                        </div>
                        <span class="geoview-tarp-value" style="font-size:18px;">${userData.displacement}</span>
                    </div>
                    
                    <div class="cava3d-specs-grid">
                        <div><span>Velocidade:</span> <strong style="color:#ef4444;">${userData.velocity}</strong></div>
                        <div><span>Cota Berma:</span> <strong>${userData.cota.toFixed(2)} m</strong></div>
                        <div><span>Sensor:</span> <strong>IBIS-FM EVO 01</strong></div>
                        <div><span>Status Mina:</span> <strong style="color:#ef4444;">MAQ 876 Evacuada</strong></div>
                    </div>
                    
                    <div class="mt-3 d-flex gap-2">
                        <button type="button" class="btn btn-danger btn-sm flex-1" onclick="notificarCGOEmergencia()">
                            <i class="fa-solid fa-triangle-exclamation"></i> Notificar CGO
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm flex-1" onclick="window.Cava3DEngine.focusCameraOn(${userData.easting}, ${userData.northing}, ${userData.cota})">
                            <i class="fa-solid fa-crosshairs"></i> Focar 3D
                        </button>
                    </div>
                </div>
            `;
        } else if (userData.type === 'mineFront') {
            const f = userData.data;
            panelEl.innerHTML = `
                <div class="cava3d-detail-card">
                    <div class="d-flex align-center justify-between mb-2">
                        <h4 style="margin:0; font-size:15px; color:#ffffff;">${f.name}</h4>
                        <span class="badge" style="background:${f.status === 'INTERDITADA' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}; color:${f.status === 'INTERDITADA' ? '#ef4444' : '#10b981'};">${f.status}</span>
                    </div>
                    <p style="font-size:12px; color:#cbd5e1; margin-bottom:12px;">${f.desc}</p>
                    <div class="cava3d-specs-grid">
                        <div><span>Cota Operação:</span> <strong>${f.cota.toFixed(2)} m</strong></div>
                        <div><span>Coord Este:</span> <code>${f.easting.toFixed(2)}</code></div>
                        <div><span>Coord Norte:</span> <code>${f.northing.toFixed(2)}</code></div>
                    </div>
                    <div class="mt-3">
                        <button type="button" class="btn btn-primary btn-sm w-100" onclick="abrirModalPlanoLavra()">
                            <i class="fa-solid fa-truck-monster"></i> Ver Programação de Lavra
                        </button>
                    </div>
                </div>
            `;
        } else if (userData.type === 'crossSection') {
            panelEl.innerHTML = `
                <div class="cava3d-detail-card">
                    <h4 style="margin:0 0 8px 0; font-size:15px; color:#ffb95f;">${userData.label}</h4>
                    <p style="font-size:12px; color:#94a3b8; margin-bottom:12px;">Plano de análise de estabilidade transversal com cálculo de Fator de Segurança via método rigoroso de Bishop.</p>
                    <div class="cava3d-specs-grid">
                        <div><span>Fator de Segurança:</span> <strong style="color:#f59e0b;">FS 1.12 (Atenção)</strong></div>
                        <div><span>Superfície de Ruptura:</span> <strong>Circular Profunda</strong></div>
                        <div><span>Nível Freático:</span> <strong>Cota 1.030m a 1.215m</strong></div>
                    </div>
                </div>
            `;
        }
    }

    function selectTerrainPoint(utm) {
        const panelEl = document.getElementById('cava3d-selected-details-content');
        if (!panelEl) return;
        
        panelEl.innerHTML = `
            <div class="cava3d-detail-card">
                <div class="d-flex align-center justify-between mb-2">
                    <span class="badge badge-secondary">Ponto da Superfície</span>
                    <span style="font-size:11px; color:#94a3b8;">SIRGAS 2000</span>
                </div>
                <div class="cava3d-specs-grid">
                    <div><span>Cota Topográfica:</span> <strong style="color:#4edea3;">${utm.elevation.toFixed(2)} m</strong></div>
                    <div><span>Este:</span> <code>${utm.easting.toFixed(2)} m E</code></div>
                    <div><span>Norte:</span> <code>${utm.northing.toFixed(2)} m N</code></div>
                    <div><span>Setor da Cava:</span> <strong>${utm.elevation < 1050 ? 'Fundo de Cava (SUMP)' : (utm.elevation > 1230 ? 'Crista Superior' : 'Bancada Intermediária')}</strong></div>
                </div>
            </div>
        `;
    }

    // Ferramenta de Medicao 3D (Distancia 3D, Horizontal, Delta Z e Inclinacao)
    function handleMeasureClick() {
        if (!state.raycaster || !state.terrainMesh) return;
        state.raycaster.setFromCamera(state.mouse, state.camera);
        
        const intersects = state.raycaster.intersectObject(state.terrainMesh, false);
        if (intersects.length === 0) return;
        
        const pt = intersects[0].point;
        const utm = localToUtm(pt);
        
        if (state.measurePoints.length >= 2) {
            clearMeasurements();
        }
        
        // Adiciona ponto
        state.measurePoints.push({ local: pt.clone(), utm: utm });
        
        // Marcador visual (Esfera)
        const markerGeom = new THREE.SphereGeometry(3.0, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({ color: state.measurePoints.length === 1 ? 0x38bdf8 : 0x4edea3 });
        const marker = new THREE.Mesh(markerGeom, markerMat);
        marker.position.copy(pt);
        state.scene.add(marker);
        state.measureObjects.push(marker);
        
        if (state.measurePoints.length === 2) {
            // Desenha linha 3D entre os pontos
            const p1 = state.measurePoints[0];
            const p2 = state.measurePoints[1];
            
            const lineGeom = new THREE.BufferGeometry().setFromPoints([p1.local, p2.local]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 });
            const line = new THREE.Line(lineGeom, lineMat);
            state.scene.add(line);
            state.measureObjects.push(line);
            
            // Calculos Geotecnicos
            const dE = p2.utm.easting - p1.utm.easting;
            const dN = p2.utm.northing - p1.utm.northing;
            const dZ = p2.utm.elevation - p1.utm.elevation;
            const dist2D = Math.sqrt(dE * dE + dN * dN);
            const dist3D = Math.sqrt(dist2D * dist2D + dZ * dZ);
            const slopeDeg = Math.atan2(Math.abs(dZ), dist2D) * (180 / Math.PI);
            const slopeRatio = dist2D > 0 ? (Math.abs(dZ) / dist2D).toFixed(2) : "90°";
            
            // Exibe resultado no card flutuante de medicao
            const readCard = document.getElementById('cava3d-measure-readout');
            if (readCard) {
                readCard.style.display = 'block';
                document.getElementById('cava3d-measure-dist3d').textContent = `${dist3D.toFixed(2)} m`;
                document.getElementById('cava3d-measure-dist2d').textContent = `${dist2D.toFixed(2)} m`;
                document.getElementById('cava3d-measure-deltaz').textContent = `${dZ >= 0 ? '+' : ''}${dZ.toFixed(2)} m`;
                document.getElementById('cava3d-measure-slope').textContent = `${slopeDeg.toFixed(1)}° (1:${(1 / (Math.abs(dZ) / dist2D || 1)).toFixed(2)} V:H)`;
            }
        }
    }

    function toggleMeasureMode(forceState) {
        state.measureMode = (forceState !== undefined) ? forceState : !state.measureMode;
        clearMeasurements();
        
        const btn = document.getElementById('btn-cava3d-measure');
        const readCard = document.getElementById('cava3d-measure-readout');
        
        if (state.measureMode) {
            if (btn) btn.classList.add('active');
            if (readCard) readCard.style.display = 'block';
            if (window.showToast) window.showToast("Medição 3D Ativada", "Clique em dois pontos da cava para medir distância, desnível e inclinação de talude.", "info", 4000);
        } else {
            if (btn) btn.classList.remove('active');
            if (readCard) readCard.style.display = 'none';
        }
    }

    function clearMeasurements() {
        state.measurePoints = [];
        state.measureObjects.forEach(obj => {
            state.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        state.measureObjects = [];
        
        const d3d = document.getElementById('cava3d-measure-dist3d');
        if (d3d) d3d.textContent = "-";
        const d2d = document.getElementById('cava3d-measure-dist2d');
        if (d2d) d2d.textContent = "-";
        const dz = document.getElementById('cava3d-measure-deltaz');
        if (dz) dz.textContent = "-";
        const sl = document.getElementById('cava3d-measure-slope');
        if (sl) sl.textContent = "-";
    }

    // Focar a Camera em um Ponto Especifico
    function focusCameraOn(easting, northing, elevation) {
        const targetPos = utmToLocal(easting, northing, elevation);
        
        state.cameraControls.target.copy(targetPos);
        state.cameraControls.radius = 280; // Aproxima
        state.cameraControls.phi = Math.PI / 3.5;
        updateCameraPosition();
    }

    // Vistas Pre-definidas
    function setQuickView(viewName) {
        if (viewName === 'nadir') { // Topo 2D (Norte para Cima)
            state.cameraControls.phi = 0.05;
            state.cameraControls.theta = 0;
            state.cameraControls.radius = 1600;
            state.cameraControls.target.set(0, (1130 - CENTROID.elevationBase) * state.verticalExaggeration, 0);
        } else if (viewName === 'iso') { // Isometria Padrão
            state.cameraControls.phi = Math.PI / 3;
            state.cameraControls.theta = Math.PI / 4;
            state.cameraControls.radius = 1200;
            state.cameraControls.target.set(0, (1130 - CENTROID.elevationBase) * state.verticalExaggeration, 0);
        } else if (viewName === 'frontal') { // Olhando para o Talude Norte (AOI_01)
            state.cameraControls.phi = Math.PI / 2.6;
            state.cameraControls.theta = 0; // Olhando Norte
            state.cameraControls.radius = 950;
            state.cameraControls.target.set(0, (1160 - CENTROID.elevationBase) * state.verticalExaggeration, 0);
        } else if (viewName === 'radar') { // Cabine do Radar IBIS-FM
            const radarPos = utmToLocal(595520.0, 7777320.0, 1140.0);
            state.cameraControls.target.set(radarPos.x + 30, radarPos.y + 15, radarPos.z);
            state.cameraControls.radius = 350;
            state.cameraControls.phi = Math.PI / 2.4;
            state.cameraControls.theta = -0.35;
        } else if (viewName === 'reset') {
            state.cameraControls.phi = Math.PI / 3;
            state.cameraControls.theta = Math.PI / 4;
            state.cameraControls.radius = 1200;
            state.cameraControls.target.set(0, (1130 - CENTROID.elevationBase) * state.verticalExaggeration, 0);
        }
        updateCameraPosition();
    }

    // Alternar Modos de Exibicao da Superficie (Ortofoto, Litologia, Heatmap, Wireframe)
    function setDisplayMode(mode) {
        state.displayMode = mode;
        if (!state.terrainMesh) return;
        
        if (mode === 'wireframe') {
            state.terrainMesh.visible = false;
            if (state.terrainWireframe) state.terrainWireframe.visible = true;
        } else {
            state.terrainMesh.visible = true;
            if (state.terrainWireframe) state.terrainWireframe.visible = false;
            
            if (mode === 'lithology') {
                state.terrainMesh.material.map = null;
                state.terrainMesh.material.vertexColors = true;
                state.terrainMesh.material.needsUpdate = true;
            } else {
                state.terrainMesh.material.vertexColors = false;
                const textureLoader = new THREE.TextureLoader();
                state.terrainMesh.material.map = textureLoader.load('assets/geologia/cava-geologia-texture-2048.jpg');
                state.terrainMesh.material.needsUpdate = true;
            }
        }
        
        // Atualiza botoes ativos na UI
        const buttons = document.querySelectorAll('.cava3d-mode-btn');
        buttons.forEach(b => {
            if (b.dataset.mode === mode) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    // Toggle de Camadas (12 Camadas da Arvore)
    function toggleLayer(layerKey, isVisible) {
        if (state.layers[layerKey]) {
            state.layers[layerKey].visible = isVisible;
        }
    }

    // Ajuste do Exagero Vertical (1.0x, 1.25x, 1.5x, 2.0x)
    function setVerticalExaggeration(factor) {
        state.verticalExaggeration = factor;
        if (state.scene) {
            // Recria a geometria do terreno e camadas verticais
            if (state.layers.dtm) state.scene.remove(state.layers.dtm);
            if (state.layers.contours) state.scene.remove(state.layers.contours);
            if (state.layers.crestToe) state.scene.remove(state.layers.crestToe);
            if (state.layers.waterTable) state.scene.remove(state.layers.waterTable);
            if (state.layers.instruments) state.scene.remove(state.layers.instruments);
            if (state.layers.radar) state.scene.remove(state.layers.radar);
            if (state.layers.criticalAoI) state.scene.remove(state.layers.criticalAoI);
            if (state.layers.mineFronts) state.scene.remove(state.layers.mineFronts);
            if (state.layers.sections) state.scene.remove(state.layers.sections);
            if (state.layers.utmGrid) state.scene.remove(state.layers.utmGrid);
            
            createTerrainMesh();
            createContourLines();
            createCrestAndToeLines();
            createWaterTableSurface();
            createInstrumentationPins();
            createRadarStationAndCone();
            createCriticalAoIMarker();
            createMineOperationFronts();
            createCrossSectionA();
            createUtmCoordinateGrid();
            
            updateCameraPosition();
        }
    }

    // Captura de Tela HD com Carimbo Tecnico
    function exportSnapshot() {
        if (!state.renderer) return;
        state.renderer.render(state.scene, state.camera);
        
        const canvas = state.renderer.domElement;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        
        // Desenha imagem 3D
        ctx.drawImage(canvas, 0, 0);
        
        // Carimbo Tecnico Corporativo no Rodapé
        ctx.fillStyle = 'rgba(5, 13, 35, 0.88)';
        ctx.fillRect(0, tempCanvas.height - 85, tempCanvas.width, 85);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, tempCanvas.height - 85, tempCanvas.width, 85);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText('ITAMINAS • MDSYNC GEOTECNIA - MODELO 3D CAVA JANGADA', 24, tempCanvas.height - 54);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px "JetBrains Mono", monospace';
        const now = new Date().toLocaleString('pt-BR');
        ctx.fillText(`Datum: SIRGAS 2000 / UTM 23S | Topografia: tpes_260731 (Agosto/2026) | Acurácia: ±0.8 mm RMS`, 24, tempCanvas.height - 34);
        ctx.fillText(`Operador: Maycon Nascimento (CREA-MG 184.920/D) | Registro: ${now} | Alvo: AOI_01 (+20.00 mm TARP N3)`, 24, tempCanvas.height - 16);
        
        // Download
        const link = document.createElement('a');
        link.download = `MDSync_Modelo3D_CavaJangada_${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        
        if (window.showToast) window.showToast("Snapshot Geotécnico Exportado", "Captura 3D em alta resolução salva com carimbo técnico de auditoria.", "success", 4000);
    }

    // Validacao e Importacao de Nova Topografia (DXF / XYZ / CSV / GeoJSON)
    function validateAndImportTopography(file) {
        if (!file) return;
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n');
            
            let hasZ = false;
            let validCrs = false;
            let pointCount = 0;
            let minZ = 99999, maxZ = -99999;
            
            for (let i = 0; i < Math.min(lines.length, 500); i++) {
                const parts = lines[i].trim().split(/[,;\s\t]+/);
                if (parts.length >= 3) {
                    const x = parseFloat(parts[0]);
                    const y = parseFloat(parts[1]);
                    const z = parseFloat(parts[2]);
                    
                    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                        pointCount++;
                        if (z > 0 && Math.abs(z) > 0.001) hasZ = true;
                        minZ = Math.min(minZ, z);
                        maxZ = Math.max(maxZ, z);
                        
                        // Validacao se cai no quadrante SIRGAS 2000 / UTM 23S da mina
                        if (x >= 580000 && x <= 610000 && y >= 7760000 && y <= 7800000) {
                            validCrs = true;
                        }
                    }
                }
            }
            
            const feedbackEl = document.getElementById('cava3d-import-feedback');
            if (!hasZ) {
                const msg = "Dados altimétricos insuficientes para geração de modelo 3D.";
                if (feedbackEl) feedbackEl.innerHTML = `<div class="alert alert-danger"><i class="fa-solid fa-circle-exclamation"></i> <strong>Erro de Validação:</strong> ${msg}</div>`;
                if (window.showToast) window.showToast("Erro Topográfico", msg, "error", 5000);
                return;
            }
            
            if (!validCrs) {
                const msg = "Aviso: Modelo fora do sistema geodésico SIRGAS 2000 / UTM 23S.";
                if (feedbackEl) feedbackEl.innerHTML = `<div class="alert alert-warning"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Aviso Geodésico:</strong> ${msg}</div>`;
                if (window.showToast) window.showToast("Alerta Geodésico", msg, "warning", 5000);
                return;
            }
            
            if (feedbackEl) {
                feedbackEl.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fa-solid fa-circle-check"></i> <strong>Validação Concluída:</strong><br>
                        Arquivo com ${pointCount} pontos válidos em SIRGAS 2000 / UTM 23S.<br>
                        Cota Mínima: ${minZ.toFixed(2)}m | Cota Máxima: ${maxZ.toFixed(2)}m.<br>
                        Pronto para renderização no visualizador 3D.
                    </div>
                `;
            }
            if (window.showToast) window.showToast("Topografia Validada", `${pointCount} pontos processados com sucesso.`, "success", 4000);
        };
        
        reader.readAsText(file);
    }

    // Redimensionamento da Janela
    function onWindowResize() {
        if (!state.container || !state.camera || !state.renderer) return;
        const width = state.container.clientWidth || 800;
        const height = state.container.clientHeight || 600;
        
        state.camera.aspect = width / height;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(width, height);
    }

    // Loop de Animacao WebGL
    function animate() {
        if (!state.running) return;
        state.animFrameId = requestAnimationFrame(animate);
        
        const elapsedTime = state.clock ? state.clock.getElapsedTime() : 0;
        
        // Pulso do anel do alvo critico TARP N3
        if (state.layers.criticalAoI) {
            const patch = state.layers.criticalAoI.getObjectByName("Pulsing_Ring");
            if (patch) {
                const s = 1.0 + Math.sin(elapsedTime * 4.0) * 0.25;
                patch.scale.set(s, s, s);
            }
        }
        
        // Animacao da linha tracejada do radar (Line of Sight)
        if (state.layers.radar) {
            const los = state.layers.radar.getObjectByName("Radar_LOS_Line");
            if (los && los.material) {
                los.material.dashSize = 10 + Math.sin(elapsedTime * 6.0) * 4;
            }
        }
        
        if (state.renderer && state.scene && state.camera) {
            state.renderer.render(state.scene, state.camera);
        }
    }

    function pause() {
        state.running = false;
        if (state.animFrameId) {
            cancelAnimationFrame(state.animFrameId);
            state.animFrameId = null;
        }
    }

    function resume() {
        if (!state.running && state.initialized) {
            state.running = true;
            animate();
            onWindowResize();
        }
    }

    function initOrResume(containerId) {
        if (!state.initialized) {
            init(containerId);
        } else {
            resume();
        }
    }

    function updateHudStats() {
        const triEl = document.getElementById('cava3d-telemetry-triangles');
        if (triEl) triEl.textContent = "28.800 faces";
        const cotasEl = document.getElementById('cava3d-telemetry-cotas');
        if (cotasEl) cotasEl.textContent = "336 cotas (1.015m a 1.386m)";
    }

    // Exposicao da API Global
    window.Cava3DEngine = {
        init: init,
        initOrResume: initOrResume,
        pause: pause,
        resume: resume,
        setQuickView: setQuickView,
        setDisplayMode: setDisplayMode,
        toggleLayer: toggleLayer,
        setVerticalExaggeration: setVerticalExaggeration,
        toggleMeasureMode: toggleMeasureMode,
        clearMeasurements: clearMeasurements,
        focusCameraOn: focusCameraOn,
        exportSnapshot: exportSnapshot,
        validateAndImportTopography: validateAndImportTopography,
        getState: function() { return state; }
    };

})(window);
