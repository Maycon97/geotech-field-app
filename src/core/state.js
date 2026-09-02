/**
 * MDSync Application State Manager
 * Centraliza o estado global da interface, filtros e conexao.
 */

export class StateManager {
    constructor() {
        this.state = {
            activeTab: "dashboard",
            currentStructure: null,
            currentInstrument: null,
            filterPeriod: "all",
            online: navigator.onLine,
            pendingSyncCount: 0,
            selectedStructureSlug: null,
            user: {
                name: "Eng. Geotécnico",
                role: "Operador de campo",
                authorized: true
            }
        };
        this.listeners = new Map();
        
        window.addEventListener("online", () => this.setOnline(true));
        window.addEventListener("offline", () => this.setOnline(false));
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        const oldVal = this.state[key];
        this.state[key] = value;
        if (oldVal !== value) {
            this._notify(key, value, oldVal);
        }
    }

    setOnline(status) {
        this.set("online", status);
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        return () => this.listeners.get(key).delete(callback);
    }

    _notify(key, newVal, oldVal) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(cb => {
                try {
                    cb(newVal, oldVal);
                } catch (e) {
                    console.error(`Erro no listener de ${key}:`, e);
                }
            });
        }
    }
}

export const appState = new StateManager();
