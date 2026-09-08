/**
 * MDSync <-> HUB Stitch Real-time Synchronization Bridge
 * Barramento bidirecional de eventos e estado compartilhado entre os dois projetos:
 * 1. MDSync (Campo / PWA Operacional)
 * 2. HUB Stitch (Executivo / Plataforma de Gestao & Governanca)
 */

(function (global) {
  'use strict';

  const CHANNEL_NAME = 'mdsync_stitch_bus';
  const STORAGE_PREFIX = 'mdsync_shared_';

  class Bridge {
    constructor() {
      this.channel = null;
      this.handlers = new Map();

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            if (event && event.data && event.data.type) {
              this._dispatch(event.data.type, event.data.payload, false);
            }
          };
        } catch (e) {
          console.warn('[SyncBridge] BroadcastChannel indisponivel, usando fallback de storage:', e);
        }
      }

      // Fallback e sincronizacao via evento 'storage' do window
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
          if (event.key && event.key.startsWith(STORAGE_PREFIX)) {
            const type = event.key.replace(STORAGE_PREFIX, '');
            try {
              const payload = JSON.parse(event.newValue);
              this._dispatch(type, payload, false);
            } catch (e) {
              // Ignorar payload nao-JSON
            }
          }
        });
      }
    }

    /**
     * Emite um evento sincronizado para ambas as aplicacoes
     * @param {string} type - Tipo do evento (ex: 'READING_ADDED', 'SIGBM_TRANSMITTED')
     * @param {any} payload - Dados do evento
     */
    emit(type, payload = {}) {
      const message = {
        type,
        payload,
        sender: typeof window !== 'undefined' ? window.location.pathname : 'core',
        timestamp: new Date().toISOString()
      };

      // Disparo via canal direto
      if (this.channel) {
        try {
          this.channel.postMessage(message);
        } catch (e) {
          console.warn('[SyncBridge] Erro ao postar no BroadcastChannel:', e);
        }
      }

      // Atualizacao de storage local compartilhado para persistencia e fallback
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_PREFIX + type, JSON.stringify(payload));
          localStorage.setItem(STORAGE_PREFIX + 'last_sync', JSON.stringify({ type, timestamp: message.timestamp }));
        } catch (e) {
          console.warn('[SyncBridge] Erro ao gravar no localStorage:', e);
        }
      }

      // Despachar localmente na mesma janela
      this._dispatch(type, payload, true);
    }

    /**
     * Registra um listener para eventos do barramento
     * @param {string} type - Tipo do evento ou '*' para todos
     * @param {Function} handler - Funcao callback (payload, isLocal) => void
     */
    on(type, handler) {
      if (!this.handlers.has(type)) {
        this.handlers.set(type, new Set());
      }
      this.handlers.get(type).add(handler);
      return () => this.off(type, handler);
    }

    off(type, handler) {
      if (this.handlers.has(type)) {
        this.handlers.get(type).delete(handler);
      }
    }

    _dispatch(type, payload, isLocal) {
      if (this.handlers.has(type)) {
        this.handlers.get(type).forEach((fn) => {
          try {
            fn(payload, isLocal);
          } catch (err) {
            console.error(`[SyncBridge] Erro no listener de ${type}:`, err);
          }
        });
      }

      // Listeners universais wildcard '*'
      if (this.handlers.has('*')) {
        this.handlers.get('*').forEach((fn) => {
          try {
            fn({ type, payload, isLocal });
          } catch (err) {
            console.error('[SyncBridge] Erro no listener wildcard:', err);
          }
        });
      }
    }

    /**
     * Leitura de dados compartilhados
     */
    getSharedData(key, defaultVal = null) {
      if (typeof localStorage === 'undefined') return defaultVal;
      try {
        const item = localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultVal;
      } catch (e) {
        return defaultVal;
      }
    }

    setSharedData(key, value) {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      } catch (e) {
        console.warn('[SyncBridge] Falha ao gravar shared data:', e);
      }
    }
  }

  const instance = new Bridge();

  // Exportacao global UMD / ES Module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
  } else {
    global.SyncBridge = instance;
  }
})(typeof window !== 'undefined' ? window : globalThis);
