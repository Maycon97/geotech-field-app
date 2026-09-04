#!/usr/bin/env python3
r"""
MDSync Real-time File Watcher & Auto-Sync
Monitora continuamente o caminho oficial:
C:\Users\maycon.nascimento\ITAMINAS\SPLO - General\03) Geotecnia\01) PCMI
Sempre que um novo arquivo/planilha/dashboard for inserido, modificado ou removido,
o catálogo é reprocessado automaticamente em milissegundos e o sinal de sincronização é emitido.
"""

import sys
import time
import threading
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from scan_pcmi import scan, PCMI_PATH


class PCMIChangeHandler(FileSystemEventHandler):
    def __init__(self, debounce_seconds=2.0):
        super().__init__()
        self.debounce_seconds = debounce_seconds
        self.timer = None
        self.lock = threading.Lock()

    def on_any_event(self, event):
        # Ignorar arquivos temporários do Office e logs
        path = str(event.src_path)
        if "~$" in path or ".tmp" in path or "_LOGS" in path:
            return

        with self.lock:
            if self.timer:
                self.timer.cancel()
            self.timer = threading.Timer(self.debounce_seconds, self._trigger_scan, args=[event])
            self.timer.start()

    def _trigger_scan(self, event):
        print(f"\n[{time.strftime('%H:%M:%S')}] Alteracao detectada em {PCMI_PATH.name}: {event.event_type} - {Path(event.src_path).name}")
        try:
            scan()
            from extract_pcmi_master import main as extract_main
            extract_main()
            print(f"[{time.strftime('%H:%M:%S')}] Sincronizacao em tempo real concluida! O site/app foi notificado.")
        except Exception as e:
            print(f"Erro durante sincronizacao automatica: {e}")


def main():
    print("================================================================")
    print("  MDSync - Monitor de Sincronizacao em Tempo Real (PCMI)")
    print(f"  Diretorio Monitorado: {PCMI_PATH}")
    print("  Status: ATIVO (Observando qualquer novo dado ou alteracao...)")
    print("================================================================")
    
    # Realiza um scan inicial
    scan()
    
    event_handler = PCMIChangeHandler(debounce_seconds=2.0)
    observer = Observer()
    observer.schedule(event_handler, str(PCMI_PATH), recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()
