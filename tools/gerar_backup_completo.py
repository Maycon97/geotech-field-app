"""
Script para geracao de Backup Completo e Estruturado do Projeto MDSync
Gera arquivo compactado ZIP com hash SHA-256 e distribui nas pastas locais e downloads.
"""

import os
import sys
import zipfile
import hashlib
from pathlib import Path
from datetime import datetime

WORKSPACE_DIR = Path(r"c:\Users\maycon.nascimento\OneDrive - ITAMINAS\Documentos\Work\Project Comunication 2026\Project_site_geo\geotech-field-app")
DOWNLOADS_DIR = Path(r"C:\Users\maycon.nascimento\Downloads")
OUTPUTS_DIR = WORKSPACE_DIR / "outputs"

def sha256_file(filepath):
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def criar_backup():
    data_str = datetime.now().strftime("%Y-%m-%d_%H%M")
    nome_arquivo = f"MDSync_Backup_Completo_{data_str}.zip"
    nome_padrao = "MDSync_Backup_Completo_Versao1.0.zip"
    
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    caminho_saida = OUTPUTS_DIR / nome_padrao
    
    print(f"=== Iniciando Geracao de Backup Completo do MDSync ===")
    print(f"Diretorio de Origem: {WORKSPACE_DIR}")
    print(f"Arquivo Destino: {caminho_saida}")
    
    pastas_ignorar = {".git", "__pycache__", ".pytest_cache", ".vscode", ".idea", "node_modules"}
    extensoes_ignorar = {".pyc", ".tmp", ".log"}
    
    arquivos_incluidos = 0
    total_bytes = 0
    
    with zipfile.ZipFile(caminho_saida, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(WORKSPACE_DIR):
            dirs[:] = [d for d in dirs if d not in pastas_ignorar]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in extensoes_ignorar:
                    continue
                
                # Evitar incluir o proprio arquivo de backup se ja existir
                if file.startswith("MDSync_Backup_"):
                    continue
                
                caminho_completo = Path(root) / file
                caminho_relativo = caminho_completo.relative_to(WORKSPACE_DIR)
                
                zipf.write(caminho_completo, caminho_relativo)
                arquivos_incluidos += 1
                total_bytes += caminho_completo.stat().st_size
    
    hash_sha256 = sha256_file(caminho_saida)
    tamanho_mb = caminho_saida.stat().st_size / (1024 * 1024)
    
    print(f"\n[SUCESSO] Backup compactado gerado com exito:")
    print(f"  - Total de arquivos: {arquivos_incluidos}")
    print(f"  - Tamanho descomprimido: {total_bytes / (1024*1024):.2f} MB")
    print(f"  - Tamanho do ZIP: {tamanho_mb:.2f} MB")
    print(f"  - Hash SHA-256: {hash_sha256}")
    
    # Copia para Downloads
    if DOWNLOADS_DIR.exists():
        destino_dl = DOWNLOADS_DIR / nome_padrao
        import shutil
        shutil.copy2(caminho_saida, destino_dl)
        print(f"  - Copia gravada em Downloads: {destino_dl}")
        
    return caminho_saida, hash_sha256

if __name__ == "__main__":
    criar_backup()
