from pathlib import Path

def main():
    path = Path('src/core/sync-bridge.js')
    content = path.read_text(encoding='utf-8')

    target = '''    emit(type, payload = {}) {
      const message = {
        type,
        payload,
        sender: typeof window !== 'undefined' ? window.location.pathname : 'core',
        timestamp: new Date().toISOString()
      };'''

    replacement = '''    emit(type, payload = {}) {
      const timestampUTC = new Date().toISOString();
      const auditTrail = {
        origin: typeof window !== 'undefined' ? (window.location.pathname.includes('stitch') ? 'HUB_STITCH' : 'MDSYNC_FIELD') : 'CORE',
        timestampUTC,
        timestampBRT: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        traceId: 'TRC-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7).toUpperCase()
      };

      const message = {
        type,
        payload,
        audit: auditTrail,
        sender: typeof window !== 'undefined' ? window.location.pathname : 'core',
        timestamp: timestampUTC
      };'''

    # Also log to audit ring buffer
    target2 = '''      // Despachar localmente na mesma janela
      this._dispatch(type, payload, true);
    }'''

    replacement2 = '''      // Registrar na trilha de auditoria imutável local (Benchmark SYSDAM / LGPD)
      if (typeof localStorage !== 'undefined') {
        try {
          const logKey = STORAGE_PREFIX + 'audit_trail';
          const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
          logs.unshift({ type, traceId: auditTrail.traceId, origin: auditTrail.origin, timestampBRT: auditTrail.timestampBRT });
          if (logs.length > 50) logs.pop();
          localStorage.setItem(logKey, JSON.stringify(logs));
        } catch (e) {}
      }

      // Despachar localmente na mesma janela
      this._dispatch(type, payload, true);
    }'''

    if target in content and target2 in content:
      content = content.replace(target, replacement, 1)
      content = content.replace(target2, replacement2, 1)
      path.write_text(content, encoding='utf-8')
      print("src/core/sync-bridge.js successfully updated with audit trail.")
    else:
      print("Target not found in src/core/sync-bridge.js!")

if __name__ == '__main__':
    main()
