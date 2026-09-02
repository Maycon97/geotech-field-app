/**
 * MDSync Database Engine (IndexedDB + Lazy-Loading + Local Persistence)
 * Fornece acesso assincrono, indexado e offline para os dados do MDSync.
 */

const DB_NAME = "MDSyncDB";
const DB_VERSION = 1;

export class DatabaseEngine {
    constructor() {
        this.db = null;
        this.catalog = null;
        this.structureCache = new Map();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store de catalogo geral
                if (!db.objectStoreNames.contains("catalog")) {
                    db.createObjectStore("catalog", { keyPath: "key" });
                }
                
                // Store de estruturas com leituras detalhadas
                if (!db.objectStoreNames.contains("structures")) {
                    db.createObjectStore("structures", { keyPath: "slug" });
                }
                
                // Store de coletas locais pendentes de sincronizacao
                if (!db.objectStoreNames.contains("localReadings")) {
                    const store = db.createObjectStore("localReadings", { keyPath: "id", autoIncrement: true });
                    store.createIndex("by_instrument", "instrumentId", { unique: false });
                    store.createIndex("by_synced", "synced", { unique: false });
                }

                // Store de checklists e inspecoes
                if (!db.objectStoreNames.contains("inspections")) {
                    const store = db.createObjectStore("inspections", { keyPath: "id", autoIncrement: true });
                    store.createIndex("by_structure", "structure", { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                resolve(this); // Fallback suave
            };
        });
    }

    /**
     * Carrega o catalogo inicial de forma assincrona e rapida (~150KB)
     */
    async loadCatalog() {
        if (this.catalog) return this.catalog;

        // Tenta obter do IndexedDB primeiro
        const cachedCatalog = await this._get("catalog", "main_catalog");
        if (cachedCatalog) {
            this.catalog = cachedCatalog.data;
            // Atualiza em background
            this._fetchAndCacheCatalog().catch(() => {});
            return this.catalog;
        }

        return await this._fetchAndCacheCatalog();
    }

    async _fetchAndCacheCatalog() {
        try {
            const response = await fetch("data/catalog.json");
            if (!response.ok) throw new Error("Falha ao carregar catalog.json");
            const catalog = await response.json();
            this.catalog = catalog;
            await this._put("catalog", { key: "main_catalog", data: catalog, updated_at: new Date().toISOString() });
            return catalog;
        } catch (err) {
            // Fallback para window.GEOSYNC_DATABASE se existir
            if (window.GEOSYNC_DATABASE) {
                console.warn("Usando fallback de window.GEOSYNC_DATABASE");
                return window.GEOSYNC_DATABASE;
            }
            throw err;
        }
    }

    /**
     * Carrega os dados detalhados e historico completo de uma estrutura sob demanda
     */
    async getStructureData(slug) {
        if (!slug) return null;
        if (this.structureCache.has(slug)) {
            return this.structureCache.get(slug);
        }

        // Tenta IndexedDB
        const cached = await this._get("structures", slug);
        if (cached) {
            this.structureCache.set(slug, cached.data);
            return cached.data;
        }

        // Busca do arquivo particionado
        try {
            const response = await fetch(`data/structures/${slug}.json`);
            if (response.ok) {
                const data = await response.json();
                this.structureCache.set(slug, data);
                await this._put("structures", { slug: slug, data: data, cached_at: new Date().toISOString() });
                return data;
            }
        } catch (e) {
            console.warn(`Erro ao carregar estrutura ${slug}:`, e);
        }

        return null;
    }

    /**
     * Registra nova leitura de campo no banco local
     */
    async saveLocalReading(reading) {
        const record = {
            ...reading,
            createdAt: new Date().toISOString(),
            synced: false
        };
        return await this._add("localReadings", record);
    }

    /**
     * Retorna todas as leituras pendentes de sincronizacao
     */
    async getPendingReadings() {
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction("localReadings", "readonly");
            const store = tx.objectStore("localReadings");
            const index = store.index("by_synced");
            const req = index.getAll(IDBKeyRange.only(false));
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    }

    // Métodos auxiliares de conveniência IndexedDB
    _get(storeName, key) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            try {
                const tx = this.db.transaction(storeName, "readonly");
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch {
                resolve(null);
            }
        });
    }

    _put(storeName, value) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(false);
            try {
                const tx = this.db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                const req = store.put(value);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch {
                resolve(false);
            }
        });
    }

    _add(storeName, value) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(null);
            try {
                const tx = this.db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                const req = store.add(value);
                req.onsuccess = () => resolve(req.result);
                req.onerror = (e) => reject(e);
            } catch (err) {
                reject(err);
            }
        });
    }
}

export const db = new DatabaseEngine();
