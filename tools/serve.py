#!/usr/bin/env python3
"""
MDSync Local Development Server
Inicia um servidor HTTP local otimizado para validar PWA, Service Worker e carregamento de dados.
"""

import sys
import http.server
import socketserver
import webbrowser
from pathlib import Path

PORT = 8780
DIRECTORY = Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def end_headers(self):
        # Desabilitar cache agressivo durante desenvolvimento
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def run():
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://127.0.0.1:{PORT}/index.html"
        print(f"==================================================")
        print(f"  MDSync Servidor de Desenvolvimento Iniciado     ")
        print(f"  URL Local: {url}                                ")
        print(f"  Pressione Ctrl+C para encerrar                  ")
        print(f"==================================================")
        httpd.serve_forever()


if __name__ == "__main__":
    run()
