#!/usr/bin/env python3
r"""
MDSync Local Development Server & Live Sync Hub
Inicia o servidor HTTP local e o monitor de alterações em tempo real para a pasta PCMI:
C:\Users\maycon.nascimento\ITAMINAS\SPLO - General\03) Geotecnia\01) PCMI
"""

import sys
import time
import threading
import http.server
import socketserver
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from scan_pcmi import scan, PCMI_PATH

PORT = 8780
DIRECTORY = Path(__file__).resolve().parent.parent


class PCMIChangeHandler(FileSystemEventHandler):
    def __init__(self, debounce_seconds=2.0):
        super().__init__()
        self.debounce_seconds = debounce_seconds
        self.timer = None
        self.lock = threading.Lock()

    def on_any_event(self, event):
        path = str(event.src_path)
        if "~$" in path or ".tmp" in path or "_LOGS" in path:
            return

        with self.lock:
            if self.timer:
                self.timer.cancel()
            self.timer = threading.Timer(self.debounce_seconds, self._trigger_scan, args=[event])
            self.timer.start()

    def _trigger_scan(self, event):
        print(f"\n[{time.strftime('%H:%M:%S')}] Alteracao em PCMI ({event.event_type}): {Path(event.src_path).name}")
        try:
            scan()
            from extract_pcmi_master import main as extract_main
            extract_main()
            print(f"[{time.strftime('%H:%M:%S')}] Sincronizacao em tempo real concluida! App atualizado.")
        except Exception as e:
            print(f"Erro durante sincronizacao: {e}")


def start_watcher():
    if not PCMI_PATH.exists():
        print(f"Aviso: Caminho PCMI nao encontrado para monitoramento: {PCMI_PATH}")
        return None
    event_handler = PCMIChangeHandler(debounce_seconds=2.0)
    observer = Observer()
    observer.schedule(event_handler, str(PCMI_PATH), recursive=True)
    observer.daemon = True
    observer.start()
    print(f"  Live Watcher PCMI: ATIVO (Monitorando alteracoes em tempo real)")
    return observer


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def run():
    print("==================================================================")
    print("  MDSync - Servidor Local com Live Sync Ativo                     ")
    print(f"  Base Monitorada: {PCMI_PATH}                                   ")
    print(f"  URL Local: http://127.0.0.1:{PORT}/index.html                  ")
    print("==================================================================")
    sys.stdout.flush()
    
    # Inicia o observador de arquivos em background
    observer = start_watcher()
    
    # Executa varredura inicial em thread de background
    threading.Thread(target=scan, daemon=True).start()
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            if observer:
                observer.stop()
                observer.join()


if __name__ == "__main__":
    run()
