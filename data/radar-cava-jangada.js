/**
 * MDSync - Módulo de Monitoramento por Radar 24/7 (Hexagon Mining) & Cava Jangada
 * Renderização 3D da Cava Jangada, Linha do Tempo Interferométrica e Feed de WhatsApp.
 */

(function() {
    'use strict';

    // Global State for Radar Module
    window.radarState = {
        activeSubTab: 'radar',
        currentIndex: 8, // 09:24:00 (Pico FR012)
        isPlaying: false,
        playSpeed: 1,
        playTimer: null,
        camera: {
            azimuth: 340 * Math.PI / 180, // Google Earth LookAt 340 deg
            pitch: 62 * Math.PI / 180,    // 62 deg elevation
            zoom: 1.15,
            panX: 0,
            panY: 30,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0
        },
        viewMode: 'full', // 'full', 'mesh', 'heat'
        activeFilter: 'all',
        searchTerm: '',
        reportZoom: 1.0
    };

    // Sub-tab switcher: Radar vs Convencional
    window.switchMonitoringSubTab = function(tab) {
        window.radarState.activeSubTab = tab;
        const pillRadar = document.getElementById('pill-radar-247');
        const pillConv = document.getElementById('pill-conventional');
        const panelRadar = document.getElementById('panel-radar-monitoring');
        const panelConv = document.getElementById('panel-conventional-readings');

        if (tab === 'radar') {
            if (pillRadar) pillRadar.classList.add('active');
            if (pillConv) pillConv.classList.remove('active');
            if (panelRadar) panelRadar.style.display = 'block';
            if (panelConv) panelConv.style.display = 'none';
            initRadarCockpit();
        } else {
            if (pillRadar) pillRadar.classList.remove('active');
            if (pillConv) pillConv.classList.add('active');
            if (panelRadar) panelRadar.style.display = 'none';
            if (panelConv) panelConv.style.display = 'block';
            if (typeof loadInstrumentDetails === 'function') {
                loadInstrumentDetails();
            }
        }
    };

    // Initialize Radar Cockpit
    window.initRadarCockpit = function() {
        initRadar3DCanvas();
        renderWhatsAppFeed(window.radarState.activeFilter, window.radarState.searchTerm);
        updateRadarTimelineUI(window.radarState.currentIndex);
        renderTelemetryCharts();
    };

    // ----------------------------------------------------
    // 1. 3D CANVAS ENGINE: CAVA JANGADA & HEXAGON RADAR
    // ----------------------------------------------------
    let canvas, ctx;
    let animFrameId = null;
    let pulsePhase = 0;

    function initRadar3DCanvas() {
        canvas = document.getElementById('cavaJangadaCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        // Adjust canvas resolution to parent size
        resizeRadarCanvas();
        window.removeEventListener('resize', resizeRadarCanvas);
        window.addEventListener('resize', resizeRadarCanvas);

        // Mouse interactions for 3D Camera
        setupCanvasInteraction();

        // Start 3D render loop if not already running
        if (!animFrameId) {
            animFrameId = requestAnimationFrame(renderRadar3DLoop);
        }
    }

    function resizeRadarCanvas() {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (rect.width > 0) {
            canvas.width = rect.width * dpr;
            canvas.height = (rect.height || 480) * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = (rect.height || 480) + 'px';
            if (ctx) ctx.scale(dpr, dpr);
        }
    }

    function setupCanvasInteraction() {
        if (!canvas) return;

        canvas.onmousedown = function(e) {
            window.radarState.camera.isDragging = true;
            window.radarState.camera.lastMouseX = e.clientX;
            window.radarState.camera.lastMouseY = e.clientY;
        };

        window.addEventListener('mousemove', function(e) {
            if (!window.radarState.camera.isDragging) return;
            const dx = e.clientX - window.radarState.camera.lastMouseX;
            const dy = e.clientY - window.radarState.camera.lastMouseY;
            window.radarState.camera.lastMouseX = e.clientX;
            window.radarState.camera.lastMouseY = e.clientY;

            window.radarState.camera.azimuth += dx * 0.008;
            window.radarState.camera.pitch = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, window.radarState.camera.pitch - dy * 0.008));
        });

        window.addEventListener('mouseup', function() {
            window.radarState.camera.isDragging = false;
        });

        canvas.onwheel = function(e) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.08 : 0.92;
            window.radarState.camera.zoom = Math.max(0.6, Math.min(2.8, window.radarState.camera.zoom * factor));
        };
    }

    // Camera toolbar functions
    window.rotateRadarCamera = function(deg) {
        window.radarState.camera.azimuth += (deg * Math.PI / 180);
    };

    window.pitchRadarCamera = function(deg) {
        window.radarState.camera.pitch = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, window.radarState.camera.pitch + (deg * Math.PI / 180)));
    };

    window.zoomRadarCamera = function(factor) {
        window.radarState.camera.zoom = Math.max(0.6, Math.min(2.8, window.radarState.camera.zoom * factor));
    };

    window.resetRadarCamera = function() {
        window.radarState.camera.azimuth = 340 * Math.PI / 180;
        window.radarState.camera.pitch = 62 * Math.PI / 180;
        window.radarState.camera.zoom = 1.15;
        window.radarState.camera.panX = 0;
        window.radarState.camera.panY = 30;
    };

    window.focusParedeNorte = function() {
        window.radarState.camera.azimuth = 350 * Math.PI / 180;
        window.radarState.camera.pitch = 55 * Math.PI / 180;
        window.radarState.camera.zoom = 1.6;
        window.radarState.camera.panY = 60;
    };

    window.setRadar3DMode = function(mode) {
        window.radarState.viewMode = mode;
        const bFull = document.getElementById('btn-view-3d-full');
        const bMesh = document.getElementById('btn-view-3d-mesh');
        const bHeat = document.getElementById('btn-view-3d-heat');
        if (bFull) bFull.classList.toggle('active', mode === 'full');
        if (bMesh) bMesh.classList.toggle('active', mode === 'mesh');
        if (bHeat) bHeat.classList.toggle('active', mode === 'heat');
    };

    // 3D Projection Formula
    function project3D(x, y, z, cx, cy, cam) {
        const cosA = Math.cos(cam.azimuth);
        const sinA = Math.sin(cam.azimuth);
        const cosP = Math.cos(cam.pitch);
        const sinP = Math.sin(cam.pitch);

        // Rotate around Z (azimuth)
        const rx = x * cosA - y * sinA;
        const ry = x * sinA + y * cosA;
        const rz = z;

        // Rotate around X (pitch)
        const px = rx;
        const py = ry * sinP - rz * cosP;
        const pz = ry * cosP + rz * sinP;

        const baseScale = 1.05 * cam.zoom;
        const sx = cx + cam.panX + px * baseScale;
        const sy = cy + cam.panY + py * baseScale;

        return { x: sx, y: sy, depth: pz };
    }

    // Main 3D Render Loop
    function renderRadar3DLoop() {
        if (!canvas || !ctx) {
            animFrameId = requestAnimationFrame(renderRadar3DLoop);
            return;
        }

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const cx = width / 2;
        const cy = height / 2;
        const cam = window.radarState.camera;
        pulsePhase += 0.05;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // 1. Draw subtle background coordinate compass
        drawCompassAndGrid(ctx, width, height, cam);

        // 2. Build Cava Jangada benches geometry
        // Centroid of pit: (0, 0, 0). 
        // Parede Norte is at negative Y (in azimuth default, looking North).
        // North crest elevation: +120px (Cota 1280m), Pit floor: -80px (Cota 1080m)
        const benches = [
            { cota: 1280, rX: 250, rY: 170, z: 90, name: "Crista Superior (1280m)" },
            { cota: 1260, rX: 225, rY: 150, z: 70, name: "Banco 1260m" },
            { cota: 1240, rX: 195, rY: 130, z: 50, name: "Banco 1240m" },
            { cota: 1231.44, rX: 175, rY: 115, z: 38, name: "Setor N_Sup_1231.44 (FR012)", isCriticalSector: true },
            { cota: 1200, rX: 145, rY: 95, z: 15, name: "Banco 1200m" },
            { cota: 1160, rX: 115, rY: 75, z: -15, name: "Banco 1160m" },
            { cota: 1120, rX: 85, rY: 55, z: -45, name: "Banco 1120m" },
            { cota: 1080, rX: 55, rY: 35, z: -75, name: "Fundo de Cava (1080m)", isFloor: true }
        ];

        // Draw Terraced Pit Benches (Bottom to Top with shading)
        for (let b = benches.length - 1; b >= 0; b--) {
            drawBenchRing(ctx, benches[b], cx, cy, cam, window.radarState.viewMode);
        }

        // Draw Haul Road / Rampa de Acesso
        drawHaulRoad(ctx, cx, cy, cam);

        // Draw Radar Station (Base Sul)
        const radarPos = { x: 10, y: 165, z: 75 }; // South ridge
        drawRadarStation(ctx, radarPos, cx, cy, cam);

        // Draw Radar Microwave Beam to North Wall
        const targetPos = { x: -35, y: -105, z: 38 }; // N_Sup_1231.44
        drawRadarBeam(ctx, radarPos, targetPos, cx, cy, cam, pulsePhase);

        // Draw Interferometric Heatmap & Anomaly on Parede Norte
        drawInterferometricHotspot(ctx, targetPos, cx, cy, cam, pulsePhase);

        // Draw 3D Displacement & Shear Vector
        drawDisplacementVector(ctx, targetPos, cx, cy, cam);

        animFrameId = requestAnimationFrame(renderRadar3DLoop);
    }

    function drawCompassAndGrid(ctx, w, h, cam) {
        // Subtle North indicator in 3D
        const origin = project3D(0, 0, -80, w / 2, h / 2, cam);
        const northPt = project3D(0, -220, -80, w / 2, h / 2, cam);

        ctx.save();
        ctx.strokeStyle = 'rgba(65, 174, 189, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(northPt.x, northPt.y);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('N (AZ 0°)', northPt.x - 16, northPt.y - 8);
        ctx.restore();
    }

    function drawBenchRing(ctx, bench, cx, cy, cam, mode) {
        const segments = 36;
        const pts = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Pit asymmetry: wider in East-West, slightly curved North wall
            let rx = bench.rX * (1 + 0.08 * Math.cos(angle * 2));
            let ry = bench.rY * (1 - 0.05 * Math.sin(angle));

            const x = Math.cos(angle) * rx;
            const y = Math.sin(angle) * ry;
            const pt = project3D(x, y, bench.z, cx, cy, cam);
            pts.push(pt);
        }

        ctx.save();

        if (mode !== 'heat') {
            // Fill bench terrace
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.closePath();

            if (bench.isFloor) {
                ctx.fillStyle = 'rgba(23, 49, 69, 0.85)';
            } else if (bench.isCriticalSector) {
                ctx.fillStyle = 'rgba(45, 62, 78, 0.88)';
            } else {
                ctx.fillStyle = 'rgba(12, 38, 58, 0.72)';
            }
            ctx.fill();

            // Stroke bench berm edge
            ctx.lineWidth = bench.isCriticalSector ? 2 : 1;
            ctx.strokeStyle = bench.isCriticalSector ? 'rgba(239, 68, 68, 0.65)' : 'rgba(92, 189, 186, 0.35)';
            ctx.stroke();
        }

        // Label for critical sector
        if (bench.isCriticalSector) {
            const labelPt = project3D(-35, -bench.rY, bench.z, cx, cy, cam);
            ctx.fillStyle = '#fca5a5';
            ctx.font = 'bold 10px Segoe UI, sans-serif';
            ctx.fillText('banco N_Sup (1.231m)', labelPt.x + 8, labelPt.y - 4);
        }

        ctx.restore();
    }

    function drawHaulRoad(ctx, cx, cy, cam) {
        // Ramp spiraling down along the east wall
        const rampPts = [
            project3D(180, 50, 85, cx, cy, cam),
            project3D(160, -20, 60, cx, cy, cam),
            project3D(135, -70, 35, cx, cy, cam),
            project3D(100, -60, 0, cx, cy, cam),
            project3D(65, -30, -40, cx, cy, cam),
            project3D(45, 0, -75, cx, cy, cam)
        ];

        ctx.save();
        ctx.strokeStyle = 'rgba(252, 177, 28, 0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(rampPts[0].x, rampPts[0].y);
        for (let i = 1; i < rampPts.length; i++) {
            ctx.lineTo(rampPts[i].x, rampPts[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }

    function drawRadarStation(ctx, pos, cx, cy, cam) {
        const pt = project3D(pos.x, pos.y, pos.z, cx, cy, cam);

        ctx.save();
        // Radar Station Tripod Base
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - 8, pt.y + 14);
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + 8, pt.y + 14);
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x, pt.y + 16);
        ctx.stroke();

        // Radar Dish
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('📡 IBIS-FM 01', pt.x - 30, pt.y - 12);
        ctx.font = '9px Segoe UI';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Base Sul (1.140m)', pt.x - 28, pt.y - 2);

        ctx.restore();
    }

    function drawRadarBeam(ctx, fromPos, toPos, cx, cy, cam, phase) {
        const pt1 = project3D(fromPos.x, fromPos.y, fromPos.z, cx, cy, cam);
        const pt2 = project3D(toPos.x, toPos.y, toPos.z, cx, cy, cam);

        ctx.save();

        // Microwave Line-of-Sight Beam Cone
        const angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
        const perpX = Math.sin(angle) * 18;
        const perpY = -Math.cos(angle) * 18;

        const grad = ctx.createLinearGradient(pt1.x, pt1.y, pt2.x, pt2.y);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        grad.addColorStop(0.7, 'rgba(239, 68, 68, 0.25)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.7)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x + perpX, pt2.y + perpY);
        ctx.lineTo(pt2.x - perpX, pt2.y - perpY);
        ctx.closePath();
        ctx.fill();

        // Animated pulse wavefront along the beam
        const pulseT = (phase * 0.4) % 1.0;
        const pulseX = pt1.x + (pt2.x - pt1.x) * pulseT;
        const pulseY = pt1.y + (pt2.y - pt1.y) * pulseT;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 8 + pulseT * 12, angle - 0.5, angle + 0.5);
        ctx.stroke();

        ctx.restore();
    }

    function drawInterferometricHotspot(ctx, targetPos, cx, cy, cam, phase) {
        const pt = project3D(targetPos.x, targetPos.y, targetPos.z, cx, cy, cam);
        const series = window.MDSYNC_RADAR_FEED.timelineSeries;
        const curData = series[window.radarState.currentIndex] || series[8];
        const intensity = curData.heatIntensity;

        ctx.save();

        // Elliptical heat polygon representing the 204.52 m² area
        const heatRadius = 26 * cam.zoom;
        const radGrad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, heatRadius);

        if (curData.level === 3) {
            radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.92)');
            radGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.75)');
            radGrad.addColorStop(0.7, 'rgba(234, 179, 8, 0.45)');
            radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else if (curData.level === 2) {
            radGrad.addColorStop(0, 'rgba(249, 115, 22, 0.85)');
            radGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.55)');
            radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else if (curData.level === 1) {
            radGrad.addColorStop(0, 'rgba(234, 179, 8, 0.75)');
            radGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.35)');
            radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        } else {
            radGrad.addColorStop(0, 'rgba(16, 185, 129, 0.6)');
            radGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        }

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, heatRadius * 1.3, heatRadius * 0.75, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Concentric pulse wave
        const pRad = (phase * 15) % 36;
        ctx.strokeStyle = curData.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, pRad * 1.3, pRad * 0.75, -0.2, 0, Math.PI * 2);
        ctx.stroke();

        // Target reticle
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.moveTo(pt.x - 8, pt.y); ctx.lineTo(pt.x + 8, pt.y);
        ctx.moveTo(pt.x, pt.y - 8); ctx.lineTo(pt.x, pt.y + 8);
        ctx.stroke();

        // Centroid Technical Tag
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('Setor N_Sup_1231.44', pt.x + 16, pt.y - 12);
        ctx.fillStyle = curData.color;
        ctx.font = 'bold 10px Segoe UI, sans-serif';
        ctx.fillText(`${curData.displacement.toFixed(2)} mm • ${curData.velocity.toFixed(2)} mm/h`, pt.x + 16, pt.y + 2);

        // If time is 09:24 or 09:31, show drill rig icon marker
        if (window.radarState.currentIndex >= 7 && window.radarState.currentIndex <= 9) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 12px FontAwesome, Segoe UI';
            ctx.fillText('🚜 PERFURATRIZ EM OPERAÇÃO', pt.x - 70, pt.y - 28);
        }

        ctx.restore();
    }

    function drawDisplacementVector(ctx, targetPos, cx, cy, cam) {
        const pt = project3D(targetPos.x, targetPos.y, targetPos.z, cx, cy, cam);
        const series = window.MDSYNC_RADAR_FEED.timelineSeries;
        const curData = series[window.radarState.currentIndex] || series[8];

        ctx.save();
        // Vector pointing in direction of movement (towards LoS and bench toe)
        const vectorLen = Math.max(12, curData.displacement * 4 * cam.zoom);
        const vecAngle = Math.PI * 0.65; // Towards camera/radar
        const vx = pt.x + Math.cos(vecAngle) * vectorLen;
        const vy = pt.y + Math.sin(vecAngle) * vectorLen;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(vx, vy);
        ctx.stroke();

        // Arrow head
        const headlen = 8;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(vx - headlen * Math.cos(vecAngle - Math.PI / 6), vy - headlen * Math.sin(vecAngle - Math.PI / 6));
        ctx.lineTo(vx - headlen * Math.cos(vecAngle + Math.PI / 6), vy - headlen * Math.sin(vecAngle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // ----------------------------------------------------
    // 2. RADAR TIMELINE CONTROLLER & SYNCHRONIZATION
    // ----------------------------------------------------
    window.updateRadarTimelineUI = function(idx) {
        const series = window.MDSYNC_RADAR_FEED.timelineSeries;
        idx = Math.max(0, Math.min(series.length - 1, idx));
        window.radarState.currentIndex = idx;
        const item = series[idx];

        // 1. Update slider
        const slider = document.getElementById('radar-timeline-slider');
        if (slider) slider.value = idx;

        // 2. Update ticks highlight
        const ticks = document.querySelectorAll('.timeline-ticks .tick');
        ticks.forEach((t, i) => {
            t.classList.toggle('active-tick', i === idx);
        });

        // 3. Update top banner badges
        const liveDisp = document.getElementById('radar-live-disp-badge');
        const liveVel = document.getElementById('radar-live-vel-badge');
        const liveTarp = document.getElementById('radar-live-tarp-badge');
        if (liveDisp) liveDisp.textContent = `${item.displacement.toFixed(2)} mm`;
        if (liveVel) liveVel.textContent = `${item.velocity.toFixed(2)} mm/h`;
        if (liveTarp) {
            liveTarp.textContent = item.levelLabel.toUpperCase();
            liveTarp.style.color = item.color;
        }

        // 4. Update HUD Overlays
        const hudDisp = document.getElementById('hud-displacement');
        const hudVel = document.getElementById('hud-velocity');
        const hudStatus = document.getElementById('hud-vector-status');
        if (hudDisp) hudDisp.textContent = `-${item.displacement.toFixed(2)} mm`;
        if (hudVel) hudVel.textContent = `${item.velocity.toFixed(2)} mm/h`;
        if (hudStatus) {
            hudStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:${item.color}"></i> ${item.status}`;
        }

        // 5. Update Timeline Clock & Pill
        const clockEl = document.getElementById('timeline-clock-val');
        const pillEl = document.getElementById('timeline-tarp-pill');
        const noteEl = document.getElementById('timeline-event-text');
        if (clockEl) clockEl.textContent = `04/09/2026 ${item.time}:00`;
        if (pillEl) {
            pillEl.textContent = item.levelLabel;
            pillEl.style.backgroundColor = item.color;
            pillEl.style.color = (item.level === 1 || item.level === 0) ? '#1e293b' : '#fff';
        }
        if (noteEl) noteEl.textContent = `${item.time} - ${item.eventNote}`;

        // 6. Update chart current values
        const cDisp = document.getElementById('chart-disp-val');
        const cVel = document.getElementById('chart-vel-val');
        const cInv = document.getElementById('chart-inv-val');
        if (cDisp) cDisp.textContent = `${item.displacement.toFixed(2)} mm`;
        if (cVel) cVel.textContent = `${item.velocity.toFixed(2)} mm/h`;
        if (cInv) cInv.textContent = `${item.invVelocity.toFixed(2)} h/mm`;

        // Re-render telemetry charts with cursor at idx
        renderTelemetryCharts(idx);
    };

    window.onRadarSliderChange = function(val) {
        updateRadarTimelineUI(parseInt(val, 10));
    };

    window.setRadarTimelineIndex = function(idx) {
        updateRadarTimelineUI(idx);
    };

    window.stepRadarTimeline = function(step) {
        const next = window.radarState.currentIndex + step;
        updateRadarTimelineUI(next);
    };

    window.restartRadarTimeline = function() {
        updateRadarTimelineUI(0);
    };

    window.jumpToCriticalMoment = function() {
        // Index 8 is 09:24 FR012 Peak
        updateRadarTimelineUI(8);
        focusParedeNorte();
    };

    window.toggleRadarPlayback = function() {
        window.radarState.isPlaying = !window.radarState.isPlaying;
        const icon = document.getElementById('icon-radar-play');
        const label = document.getElementById('label-radar-play');

        if (window.radarState.isPlaying) {
            if (icon) icon.className = 'fa-solid fa-pause';
            if (label) label.textContent = 'Pausar';
            startRadarPlayLoop();
        } else {
            if (icon) icon.className = 'fa-solid fa-play';
            if (label) label.textContent = 'Reproduzir';
            stopRadarPlayLoop();
        }
    };

    function startRadarPlayLoop() {
        stopRadarPlayLoop();
        const baseInterval = 1800 / window.radarState.playSpeed;
        window.radarState.playTimer = setInterval(function() {
            const series = window.MDSYNC_RADAR_FEED.timelineSeries;
            let next = window.radarState.currentIndex + 1;
            if (next >= series.length) {
                next = 0; // Loop back
            }
            updateRadarTimelineUI(next);
        }, baseInterval);
    }

    function stopRadarPlayLoop() {
        if (window.radarState.playTimer) {
            clearInterval(window.radarState.playTimer);
            window.radarState.playTimer = null;
        }
    }

    window.setRadarPlaySpeed = function(spd) {
        window.radarState.playSpeed = spd;
        document.querySelectorAll('.timeline-speed-selector .btn-speed').forEach(b => {
            b.classList.toggle('active', b.textContent === spd + 'x');
        });
        if (window.radarState.isPlaying) {
            startRadarPlayLoop();
        }
    };

    // ----------------------------------------------------
    // 3. TELEMETRY CHARTS (CANVAS 2D NATIVE)
    // ----------------------------------------------------
    function renderTelemetryCharts(curIdx) {
        if (curIdx === undefined) curIdx = window.radarState.currentIndex;
        const series = window.MDSYNC_RADAR_FEED.timelineSeries;

        drawSparkChart('chartRadarDisplacement', series.map(s => s.displacement), curIdx, '#ef4444', 'mm', 12.0);
        drawSparkChart('chartRadarVelocity', series.map(s => s.velocity), curIdx, '#f59e0b', 'mm/h', 3.5);
        drawSparkChart('chartRadarInvVelocity', series.map(s => s.invVelocity), curIdx, '#a78bfa', 'h/mm', 15.0);
    }

    function drawSparkChart(canvasId, dataVals, activeIdx, strokeColor, unit, maxVal) {
        const c = document.getElementById(canvasId);
        if (!c) return;
        const ctx = c.getContext('2d');
        const w = c.parentElement.clientWidth || 280;
        const h = 100;
        const dpr = window.devicePixelRatio || 1;

        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = w + 'px';
        c.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, w, h);

        const padLeft = 28;
        const padRight = 14;
        const padTop = 10;
        const padBottom = 20;
        const plotW = w - padLeft - padRight;
        const plotH = h - padTop - padBottom;

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let g = 0; g <= 3; g++) {
            const gy = padTop + (plotH / 3) * g;
            ctx.moveTo(padLeft, gy);
            ctx.lineTo(w - padRight, gy);
        }
        ctx.stroke();

        // Y-axis label
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(maxVal.toFixed(1), 4, padTop + 8);
        ctx.fillText((maxVal / 2).toFixed(1), 4, padTop + plotH / 2 + 4);
        ctx.fillText('0.0', 4, padTop + plotH);

        // Compute points
        const points = [];
        const n = dataVals.length;
        for (let i = 0; i < n; i++) {
            const px = padLeft + (i / (n - 1)) * plotW;
            const py = padTop + plotH - (dataVals[i] / maxVal) * plotH;
            points.push({ x: px, y: py });
        }

        // Draw area gradient
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, strokeColor.replace(')', ', 0.35)').replace('rgb', 'rgba'));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(points[0].x, padTop + plotH);
        for (let i = 0; i < n; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineTo(points[n - 1].x, padTop + plotH);
        ctx.closePath();
        ctx.fill();

        // Draw line curve
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < n; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Draw dots
        for (let i = 0; i < n; i++) {
            ctx.fillStyle = (i === activeIdx) ? '#fff' : strokeColor;
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, (i === activeIdx) ? 5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
            if (i === activeIdx) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Vertical active cursor line
        if (points[activeIdx]) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(points[activeIdx].x, padTop);
            ctx.lineTo(points[activeIdx].x, padTop + plotH);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // ----------------------------------------------------
    // 4. OPERATIONAL WHATSAPP FEED
    // ----------------------------------------------------
    window.filterWhatsAppFeed = function(category) {
        window.radarState.activeFilter = category;
        document.querySelectorAll('.whatsapp-filter-pills .wa-filter-pill').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-wa-cat') === category);
        });
        renderWhatsAppFeed(category, window.radarState.searchTerm);
    };

    window.onWhatsAppSearch = function(query) {
        window.radarState.searchTerm = (query || '').toLowerCase().trim();
        renderWhatsAppFeed(window.radarState.activeFilter, window.radarState.searchTerm);
    };

    function renderWhatsAppFeed(filter, search) {
        const stream = document.getElementById('whatsapp-chat-stream');
        if (!stream || !window.MDSYNC_RADAR_FEED) return;

        const allMsgs = window.MDSYNC_RADAR_FEED.messages || [];
        const filtered = allMsgs.filter(m => {
            const matchesCat = (filter === 'all' || m.category === filter);
            const matchesSearch = (!search || m.text.toLowerCase().includes(search) || m.sender.toLowerCase().includes(search));
            return matchesCat && matchesSearch;
        });

        // Update badge count
        const countBadge = document.getElementById('wa-filter-count');
        if (countBadge) countBadge.textContent = `${filtered.length} Mensagens`;

        if (filtered.length === 0) {
            stream.innerHTML = `<div class="p-4 text-center text-secondary"><i class="fa-solid fa-inbox fa-2x mb-2"></i><br>Nenhuma mensagem localizada para os filtros selecionados.</div>`;
            return;
        }

        let html = '';
        filtered.forEach(msg => {
            const isHex = msg.senderType === 'hexagon';
            const rowClass = isHex ? 'from-hexagon' : 'from-itaminas';
            const criticalClass = msg.isCriticalAlert ? 'critical-alert' : '';
            const avatarClass = msg.sender.includes('Regina') ? 'avatar-management' : (isHex ? 'avatar-hexagon' : 'avatar-itaminas');
            const avatarIcon = isHex ? '<i class="fa-solid fa-satellite-dish"></i>' : (msg.sender.includes('Regina') ? '<i class="fa-solid fa-user-shield"></i>' : '<i class="fa-solid fa-hard-hat"></i>');

            let attachmentHtml = '';
            if (msg.hasAttachment) {
                if (msg.attachmentImage) {
                    attachmentHtml = `
                        <div class="wa-attachment-card" onclick="openFlashReportModal()">
                            <img src="${msg.attachmentImage}" alt="Flash Report FR012" class="wa-attachment-thumb">
                            <div class="wa-attachment-info">
                                <div class="wa-attachment-title"><i class="fa-solid fa-file-pdf text-danger"></i> ${msg.attachmentText || 'Relatório Oficial'}</div>
                                <div class="wa-attachment-desc">Toque para abrir em tela cheia com zoom e metadados</div>
                            </div>
                            <i class="fa-solid fa-magnifying-glass-plus text-primary"></i>
                        </div>
                    `;
                } else {
                    attachmentHtml = `
                        <div class="wa-attachment-card" onclick="jumpToCriticalMoment()">
                            <div class="wa-attachment-icon"><i class="fa-solid fa-chart-area"></i></div>
                            <div class="wa-attachment-info">
                                <div class="wa-attachment-title">${msg.attachmentText || 'Evidência de Monitoramento'}</div>
                                <div class="wa-attachment-desc">Registro anexado ao plantão do radar</div>
                            </div>
                        </div>
                    `;
                }
            }

            let syncBtnHtml = '';
            if (msg.radarSync) {
                syncBtnHtml = `
                    <button type="button" class="wa-sync-btn" onclick="syncRadarWithWhatsApp('${msg.id}')">
                        <i class="fa-solid fa-crosshairs"></i> Ver no 3D (${msg.radarSync.time})
                    </button>
                `;
            }

            html += `
                <div class="whatsapp-msg-row ${rowClass} ${criticalClass}" id="${msg.id}">
                    <div class="wa-avatar ${avatarClass}">
                        ${avatarIcon}
                    </div>
                    <div class="wa-bubble">
                        <div class="wa-msg-header">
                            <span class="wa-sender-name">${msg.sender}</span>
                            <span class="wa-badge ${msg.isCriticalAlert ? 'badge-alert-fr' : 'badge-shift'}">${msg.badge}</span>
                        </div>
                        <div class="wa-text">${msg.text}</div>
                        ${attachmentHtml}
                        <div class="wa-msg-footer">
                            <span class="wa-time"><i class="fa-regular fa-clock"></i> ${msg.timestamp}</span>
                            ${syncBtnHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        stream.innerHTML = html;
    }

    window.syncRadarWithWhatsApp = function(msgId) {
        const msg = (window.MDSYNC_RADAR_FEED.messages || []).find(m => m.id === msgId);
        if (!msg || !msg.radarSync) return;

        const targetTime = msg.radarSync.time;
        const series = window.MDSYNC_RADAR_FEED.timelineSeries;
        const idx = series.findIndex(s => s.time === targetTime);
        if (idx !== -1) {
            updateRadarTimelineUI(idx);
            focusParedeNorte();
            // Scroll to 3D Viewport smoothly
            const vp = document.getElementById('radarCanvasContainer');
            if (vp) vp.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // ----------------------------------------------------
    // 5. FLASH REPORT FR012 MODAL & ZOOM
    // ----------------------------------------------------
    window.openFlashReportModal = function() {
        const modal = document.getElementById('modal-flash-report-fr012');
        if (modal) modal.style.display = 'flex';
        resetReportImageZoom();
    };

    window.closeFlashReportModal = function() {
        const modal = document.getElementById('modal-flash-report-fr012');
        if (modal) modal.style.display = 'none';
    };

    window.closeFlashReportModalOnBackdrop = function(e) {
        if (e.target.id === 'modal-flash-report-fr012') {
            closeFlashReportModal();
        }
    };

    window.zoomReportImage = function(factor) {
        window.radarState.reportZoom = Math.max(0.6, Math.min(3.0, window.radarState.reportZoom * factor));
        applyReportImageZoom();
    };

    window.resetReportImageZoom = function() {
        window.radarState.reportZoom = 1.0;
        applyReportImageZoom();
    };

    function applyReportImageZoom() {
        const img = document.getElementById('flash-report-img');
        if (img) {
            img.style.transform = `scale(${window.radarState.reportZoom})`;
            img.style.transformOrigin = 'top center';
        }
    }

    // Auto-boot if already on readings tab
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            initRadarCockpit();
        }, 500);
    });

})();
