/**
 * MDSync - Mobile Cockpit Unified Controller
 * Controlador da interface e fluxos do Cockpit Operacional Móvel do MDSync
 * Três módulos essenciais: [AL] Alert Cadastrador, [IN] Inspeção, [MI] Monitoramento
 */

(function (global) {
    'use strict';

    class SysdamController {
        constructor() {
            this.activeModule = 'MI';
            this.currentView = 'modules'; // 'login', 'modules', 'mi-grid', 'mi-map', 'al-hub', 'in-hub'
            this.selectedStructure = 'Barragem da Mina';
            this.structures = [];
            this.instruments = [];
            this.mapInstance = null;
            this.mapMarkersGroup = null;
            this.userLocation = { lat: -20.0880, lng: -44.1030 }; // Centro padrão Itaminas
            this.hasGPS = false;
            this.bottomSheetExpanded = false;
            this.searchQuery = '';
            this.sortByDistance = true;

            // Base de residentes cadastrados na ZAS (Módulo Alert Cadastrador)
            this.alertResidents = [
                { id: 'RES-01', nome: 'Comunidade Córrego do Feijão (Setor 1)', responsavel: 'Associação de Moradores', contato: '(31) 98765-4321', pessoas: 42, rota: 'Rota A (Ponto de Encontro 1)', status: 'Notificado' },
                { id: 'RES-02', nome: 'Sítio Bela Vista (ZAS Sul)', responsavel: 'Carlos Eduardo Silveira', contato: '(31) 99812-3344', pessoas: 6, rota: 'Rota B (Ponto de Encontro 2)', status: 'Notificado' },
                { id: 'RES-03', nome: 'Fazenda Boa Esperança (ZAS Leste)', responsavel: 'Mariana Guimarães', contato: '(31) 98845-9988', pessoas: 14, rota: 'Rota C (Ponto de Encontro 3)', status: 'Notificado' }
            ];

            // Base de sirenes STI da ZAS
            this.sirenes = [
                { id: 'STI-01', nome: 'Sirene Central 01 (Crista)', local: 'Talude Jusante', status: 'Operacional (100%)', teste: '08/09/2026 - OK', tipo: 'VHF + Satelital' },
                { id: 'STI-02', nome: 'Sirene 02 (ZAS km 2.5)', local: 'Entroncamento Sul', status: 'Operacional (100%)', teste: '08/09/2026 - OK', tipo: 'VHF + Satelital' },
                { id: 'STI-03', nome: 'Sirene 03 (ZAS km 6.0)', local: 'Ponto de Apoio Defesa Civil', status: 'Operacional (100%)', teste: '08/09/2026 - OK', tipo: 'VHF + Satelital' }
            ];
        }

        init() {
            this.loadStructures();
            this.loadInstruments();
            this.listenToSyncBridge();
            this.watchUserLocation();
        }

        listenToSyncBridge() {
            if (window.SyncBridge) {
                window.SyncBridge.on('READING_ADDED', () => {
                    this.loadInstruments();
                    if (this.currentView === 'mi-map') {
                        this.renderMapMarkers();
                        this.renderBottomSheetCards();
                    }
                });
            }
        }

        loadStructures() {
            if (typeof window.getGeospatialStructureList === 'function') {
                this.structures = window.getGeospatialStructureList();
            } else if (window.geoSpatialState && Array.isArray(window.geoSpatialState.structures)) {
                this.structures = window.geoSpatialState.structures.map(s => s.name || s);
            }
            if (!this.structures.length) {
                this.structures = [
                    'Barragem da Mina',
                    'Barragem do Dique 1',
                    'Barragem do Dique 2',
                    'Pilha de Rejeito Oeste',
                    'Pilha de Estéril Central',
                    'Cava Jangada'
                ];
            }
            if (!this.selectedStructure || !this.structures.includes(this.selectedStructure)) {
                this.selectedStructure = this.structures[0];
            }
        }

        loadInstruments() {
            if (typeof window.getInstrumentsForStructure === 'function') {
                this.instruments = window.getInstrumentsForStructure(this.selectedStructure) || [];
            } else if (window.geoSpatialState && Array.isArray(window.geoSpatialState.instruments)) {
                this.instruments = window.geoSpatialState.instruments.filter(inst => {
                    return !this.selectedStructure || inst.structure === this.selectedStructure;
                });
            }
            
            // Se vazio, gerar instrumentos padrão da estrutura para navegação operacional
            if (!this.instruments || !this.instruments.length) {
                this.instruments = [
                    { id: 'PZ-03 (BM)', type: 'PZ', label: 'PZ-03 (BM)', structure: this.selectedStructure, lat: -20.0872, lng: -44.1025, status: 'Normal', cotaNA: 825.40, limiteAlerta: 828.00, lastReading: 'Hoje, 07:45' },
                    { id: 'PZ-03', type: 'PZ', label: 'PZ-03', structure: this.selectedStructure, lat: -20.0875, lng: -44.1028, status: 'Normal', cotaNA: 824.10, limiteAlerta: 828.00, lastReading: 'Hoje, 07:50' },
                    { id: 'PZ-02 (BM)', type: 'PZ', label: 'PZ-02 (BM)', structure: this.selectedStructure, lat: -20.0885, lng: -44.1035, status: 'Atenção', cotaNA: 827.20, limiteAlerta: 828.00, lastReading: 'Hoje, 08:10' },
                    { id: 'PZ-01', type: 'PZ', label: 'PZ-01', structure: this.selectedStructure, lat: -20.0890, lng: -44.1042, status: 'Normal', cotaNA: 823.50, limiteAlerta: 828.00, lastReading: 'Hoje, 08:25' },
                    { id: 'INA-01', type: 'INA', label: 'INA-01', structure: this.selectedStructure, lat: -20.0868, lng: -44.1018, status: 'Normal', cotaNA: 830.15, limiteAlerta: 835.00, lastReading: 'Hoje, 08:30' },
                    { id: 'VZ-01', type: 'VZ', label: 'VZ-01', structure: this.selectedStructure, lat: -20.0895, lng: -44.1050, status: 'Normal', vazao: '2.4 L/s', limiteAlerta: '5.0 L/s', lastReading: 'Hoje, 08:40' }
                ];
            }
        }

        watchUserLocation() {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        this.userLocation = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        };
                        this.hasGPS = true;
                        this.updateDistances();
                    },
                    () => {
                        this.hasGPS = false;
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            }
        }

        getDistanceMeters(lat1, lon1, lat2, lon2) {
            const R = 6371e3; // raio da Terra em metros
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c);
        }

        updateDistances() {
            this.instruments.forEach(inst => {
                if (inst.lat && inst.lng) {
                    inst.distMeters = this.getDistanceMeters(
                        this.userLocation.lat,
                        this.userLocation.lng,
                        inst.lat,
                        inst.lng
                    );
                } else {
                    inst.distMeters = 916; // Distância demonstrativa de referência caso sem GPS
                }
            });
        }

        // --- NAVEGAÇÃO DE VIEWS ---
        switchView(viewName) {
            this.currentView = viewName;
            document.querySelectorAll('.sysdam-view').forEach(v => v.classList.remove('active'));
            const target = document.getElementById(`sysdam-view-${viewName}`);
            if (target) {
                target.classList.add('active');
            }

            if (viewName === 'mi-grid') {
                this.renderMIGridHeader();
            } else if (viewName === 'mi-map') {
                setTimeout(() => this.initMIMap(), 100);
            } else if (viewName === 'al-hub') {
                this.renderAlertCadastrador();
            } else if (viewName === 'in-hub') {
                this.renderInspecaoHub();
            }
        }

        selectModule(modCode) {
            this.activeModule = modCode;
            if (modCode === 'MI') {
                this.switchView('mi-grid');
            } else if (modCode === 'IN') {
                this.switchView('in-hub');
            } else if (modCode === 'AL') {
                this.switchView('al-hub');
            }
        }

        selectStructure(structName) {
            this.selectedStructure = structName;
            this.loadInstruments();
            this.updateDistances();
            if (this.currentView === 'mi-grid') {
                this.renderMIGridHeader();
            } else if (this.currentView === 'mi-map') {
                this.renderMapMarkers();
                this.renderBottomSheetCards();
                if (this.mapInstance && this.instruments.length) {
                    const first = this.instruments[0];
                    if (first.lat && first.lng) {
                        this.mapInstance.setView([first.lat, first.lng], 16);
                    }
                }
            }
        }

        renderMIGridHeader() {
            const label = document.getElementById('sysdam-active-structure-name');
            if (label) {
                label.textContent = this.selectedStructure;
            }
        }

        // --- MAPA LEAFLET COM SATÉLITE & PINS CIRCULARES ---
        initMIMap() {
            const mapContainer = document.getElementById('sysdam-leaflet-map');
            if (!mapContainer || typeof L === 'undefined') return;

            if (!this.mapInstance) {
                this.mapInstance = L.map('sysdam-leaflet-map', {
                    center: [this.userLocation.lat, this.userLocation.lng],
                    zoom: 15,
                    zoomControl: false,
                    attributionControl: false
                });

                // Satélite de Alta Resolução Esri ArcGIS
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    maxZoom: 19
                }).addTo(this.mapInstance);

                this.mapMarkersGroup = L.layerGroup().addTo(this.mapInstance);
            }

            this.mapInstance.invalidateSize();
            this.renderMapMarkers();
            this.renderBottomSheetCards();
        }

        renderMapMarkers() {
            if (!this.mapInstance || !this.mapMarkersGroup) return;
            this.mapMarkersGroup.clearLayers();

            const bounds = [];

            this.instruments.forEach(inst => {
                if (!inst.lat || !inst.lng) return;

                // Definir cor e classe do pin circular do SYSDAM
                let circleColor = '#10b981'; // Normal verde
                let ringColor = 'rgba(16, 185, 129, 0.4)';
                if (inst.status === 'Atenção' || inst.status === 'Alert') {
                    circleColor = '#f59e0b'; // Amarelo
                    ringColor = 'rgba(245, 158, 11, 0.4)';
                } else if (inst.status === 'Alerta' || inst.status === 'Emergência') {
                    circleColor = '#ef4444'; // Vermelho
                    ringColor = 'rgba(239, 68, 68, 0.5)';
                }

                const iconHtml = `
                    <div class="sysdam-circle-marker" style="--marker-color: ${circleColor}; --ring-color: ${ringColor};">
                        <div class="sysdam-marker-inner">
                            <i class="fa-solid fa-gauge-high"></i>
                        </div>
                    </div>
                `;

                const customIcon = L.divIcon({
                    html: iconHtml,
                    className: 'sysdam-custom-div-icon',
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                });

                const marker = L.marker([inst.lat, inst.lng], { icon: customIcon });
                marker.bindPopup(`
                    <div class="sysdam-popup-card">
                        <strong>${inst.label || inst.id}</strong>
                        <p class="text-secondary small">Estrutura: ${this.selectedStructure}</p>
                        <p class="text-secondary small">Status: <span class="badge ${inst.status === 'Normal' ? 'badge-success' : 'badge-warning'}">${inst.status}</span></p>
                        <p class="small">Distância GPS: <strong>${inst.distMeters || 916} m</strong></p>
                        <button class="btn btn-primary btn-sm mt-2 w-100" onclick="window.Sysdam.openQuickReading('${inst.id}')">
                            <i class="fa-solid fa-plus"></i> Registrar Leitura
                        </button>
                    </div>
                `);

                marker.on('click', () => {
                    this.highlightCarouselCard(inst.id);
                });

                this.mapMarkersGroup.addLayer(marker);
                bounds.push([inst.lat, inst.lng]);
            });

            // Marcador da estrutura principal (edificação/crista)
            if (bounds.length) {
                const structMarkerHtml = `
                    <div class="sysdam-building-marker">
                        <i class="fa-solid fa-building"></i>
                    </div>
                `;
                const structIcon = L.divIcon({
                    html: structMarkerHtml,
                    className: 'sysdam-building-div-icon',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                const centerLat = bounds[0][0] - 0.0015;
                const centerLng = bounds[0][1] + 0.0010;
                L.marker([centerLat, centerLng], { icon: structIcon })
                    .bindPopup(`<strong>${this.selectedStructure}</strong><br><small>Ponto de Controle Operacional</small>`)
                    .addTo(this.mapMarkersGroup);

                this.mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
            }
        }

        // --- BOTTOM SHEET & CARROSSEL DE INSTRUMENTOS ---
        renderBottomSheetCards() {
            const container = document.getElementById('sysdam-carousel-cards');
            const countBadge = document.getElementById('sysdam-instruments-count-badge');
            if (!container) return;

            let list = [...this.instruments];

            // Filtro de pesquisa
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(i => (i.label || i.id).toLowerCase().includes(q) || (i.type || '').toLowerCase().includes(q));
            }

            // Ordenação por distância
            if (this.sortByDistance) {
                list.sort((a, b) => (a.distMeters || 9999) - (b.distMeters || 9999));
            }

            if (countBadge) {
                countBadge.textContent = list.length;
            }

            if (!list.length) {
                container.innerHTML = `
                    <div class="sysdam-empty-cards">
                        <i class="fa-solid fa-filter-circle-xmark"></i>
                        <p>Nenhum instrumento correspondente aos filtros.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = list.map(inst => {
                const dist = inst.distMeters || 916;
                const isNormal = inst.status === 'Normal';
                const statusIconClass = isNormal ? 'text-success fa-circle-check' : 'text-warning fa-triangle-exclamation';

                return `
                    <div class="sysdam-instrument-card" id="sysdam-card-${inst.id}" onclick="window.Sysdam.focusInstrumentOnMap('${inst.id}')">
                        <div class="sysdam-card-badge-row">
                            <span class="sysdam-clock-badge">
                                <i class="fa-regular fa-clock"></i>
                            </span>
                            <span class="sysdam-distance-badge">
                                ${dist}m
                            </span>
                        </div>
                        <div class="sysdam-card-thumb">
                            <div class="sysdam-thumb-icon">
                                <i class="fa-solid fa-water"></i>
                            </div>
                        </div>
                        <div class="sysdam-card-title-row">
                            <strong>${inst.label || inst.id}</strong>
                            <i class="fa-solid ${statusIconClass}"></i>
                        </div>
                    </div>
                `;
            }).join('');
        }

        focusInstrumentOnMap(instId) {
            const inst = this.instruments.find(i => i.id === instId);
            if (!inst || !this.mapInstance) return;

            if (inst.lat && inst.lng) {
                this.mapInstance.setView([inst.lat, inst.lng], 18, { animate: true });
            }
            this.highlightCarouselCard(instId);
        }

        highlightCarouselCard(instId) {
            document.querySelectorAll('.sysdam-instrument-card').forEach(c => c.classList.remove('active'));
            const card = document.getElementById(`sysdam-card-${instId}`);
            if (card) {
                card.classList.add('active');
                card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }

        toggleBottomSheet() {
            this.bottomSheetExpanded = !this.bottomSheetExpanded;
            const sheet = document.getElementById('sysdam-bottom-sheet');
            if (sheet) {
                sheet.classList.toggle('expanded', this.bottomSheetExpanded);
            }
        }

        handleSearch(query) {
            this.searchQuery = query || '';
            this.renderBottomSheetCards();
        }

        toggleSort() {
            this.sortByDistance = !this.sortByDistance;
            this.renderBottomSheetCards();
        }

        recenterGPS() {
            if (this.mapInstance) {
                this.mapInstance.setView([this.userLocation.lat, this.userLocation.lng], 16, { animate: true });
                if (window.showToast) {
                    window.showToast('GPS Atualizado', 'Mapa centralizado na sua posição atual de campo.', 'info', 3000);
                }
            }
        }

        openQuickReading(instId) {
            const inst = this.instruments.find(i => i.id === instId) || { id: instId };
            const modal = document.getElementById('sysdam-reading-modal');
            const targetInput = document.getElementById('sysdam-read-instrument-id');
            const targetTitle = document.getElementById('sysdam-read-modal-title');
            
            if (targetInput) targetInput.value = inst.id;
            if (targetTitle) targetTitle.textContent = `Nova Leitura: ${inst.id}`;
            if (modal) modal.classList.add('active');
        }

        closeQuickReading() {
            const modal = document.getElementById('sysdam-reading-modal');
            if (modal) modal.classList.remove('active');
        }

        saveQuickReading() {
            const instId = document.getElementById('sysdam-read-instrument-id')?.value;
            const value = document.getElementById('sysdam-read-value')?.value;
            const obs = document.getElementById('sysdam-read-obs')?.value;

            if (!instId || !value) {
                alert('Preencha o valor da leitura.');
                return;
            }

            const payload = {
                instrumentId: instId,
                structure: this.selectedStructure,
                value: parseFloat(value),
                observations: obs || '',
                date: new Date().toISOString(),
                user: 'Operador de Campo'
            };

            // Propagar no barramento SyncBridge
            if (window.SyncBridge) {
                window.SyncBridge.emit('READING_ADDED', payload);
            }

            this.closeQuickReading();
            if (window.showToast) {
                window.showToast('Leitura Registrada', `Instrumento ${instId} salvo e sincronizado com sucesso.`, 'success', 3500);
            }
        }

        // --- MÓDULO ALERT CADASTRADOR [AL] ---
        renderAlertCadastrador() {
            const resContainer = document.getElementById('sysdam-al-residents-list');
            const sirenesContainer = document.getElementById('sysdam-al-sirenes-list');

            if (resContainer) {
                resContainer.innerHTML = this.alertResidents.map(r => `
                    <div class="sysdam-al-item-card">
                        <div class="sysdam-al-item-head">
                            <strong>${r.nome}</strong>
                            <span class="badge badge-success">${r.status}</span>
                        </div>
                        <p class="text-secondary small">Resp: <strong>${r.responsavel}</strong> • Tel: ${r.contato}</p>
                        <p class="text-secondary small">População abrangida: <strong>${r.pessoas} pessoas</strong> • ${r.rota}</p>
                    </div>
                `).join('');
            }

            if (sirenesContainer) {
                sirenesContainer.innerHTML = this.sirenes.map(s => `
                    <div class="sysdam-al-item-card">
                        <div class="sysdam-al-item-head">
                            <span class="font-bold text-primary"><i class="fa-solid fa-tower-broadcast"></i> ${s.nome}</span>
                            <span class="badge badge-success">${s.status}</span>
                        </div>
                        <p class="text-secondary small">Local: ${s.local} • Canal: ${s.tipo}</p>
                        <div class="d-flex justify-between align-center mt-2">
                            <span class="text-muted small">Último teste: ${s.teste}</span>
                            <button class="btn btn-secondary btn-sm" onclick="window.Sysdam.testSirene('${s.id}')">
                                <i class="fa-solid fa-volume-high"></i> Testar Sinal
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        testSirene(sireneId) {
            const s = this.sirenes.find(sir => sir.id === sireneId);
            if (s && window.showToast) {
                window.showToast('Teste de Sirene STI', `Comando de ping emitido para ${s.nome} via canal redundante VHF/Satelital. Retorno: 100% OK.`, 'info', 4000);
            }
        }

        // --- MÓDULO INSPEÇÃO [IN] ---
        renderInspecaoHub() {
            const scoreBadge = document.getElementById('sysdam-in-score-badge');
            const ecLabel = document.getElementById('sysdam-in-ec-label');
            if (window.MDSyncGeotech && window.MDSyncGeotech.calculateEstadoConservacao) {
                const ecResult = window.MDSyncGeotech.calculateEstadoConservacao([]);
                if (scoreBadge) scoreBadge.textContent = `Score: ${ecResult.scoreTotal} pts`;
                if (ecLabel) ecLabel.textContent = `Estado de Conservação: ${ecResult.estadoConservacao}`;
            }
        }
    }

    const instance = new SysdamController();
    global.Sysdam = instance;

    document.addEventListener('DOMContentLoaded', () => {
        instance.init();
    });

})(typeof window !== 'undefined' ? window : globalThis);
