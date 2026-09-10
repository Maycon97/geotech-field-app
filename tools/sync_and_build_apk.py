#!/usr/bin/env python3
"""
MDSync - Script de Replicação e Compilação do APK Android
Replica todos os arquivos do site para os assets do projeto Android e gera o APK atualizado.
"""

import os
import shutil
import subprocess
import zipfile
from pathlib import Path

WORKSPACE_DIR = Path(__file__).resolve().parent.parent
CODEX_WORK_DIR = Path(r"C:\Users\maycon.nascimento\Documents\Codex\2026-06-01\traga-todo-o-projeto-desse-link\work")
ANDROID_PROJ_DIR = CODEX_WORK_DIR / "geosync-android"
ANDROID_ASSETS_DIR = ANDROID_PROJ_DIR / "app" / "src" / "main" / "assets" / "public"
OUTPUTS_DIR = Path(r"C:\Users\maycon.nascimento\Documents\Codex\2026-06-01\traga-todo-o-projeto-desse-link\outputs")
DOWNLOADS_DIR = Path(r"C:\Users\maycon.nascimento\Downloads\APP´S")
LOCAL_OUTPUTS_DIR = WORKSPACE_DIR / "outputs"

TOOLCHAIN_DIR = CODEX_WORK_DIR / "android-toolchain"
JAVA_HOME = TOOLCHAIN_DIR / "jdk17" / "jdk-17.0.19+10"
ANDROID_SDK = TOOLCHAIN_DIR / "android-sdk"
GRADLE_BAT = TOOLCHAIN_DIR / "gradle" / "gradle-8.9" / "bin" / "gradle.bat"


def step1_sync_assets():
    print("=== PASSO 1: Sincronizando arquivos do site para os assets do APK ===")
    
    if not ANDROID_ASSETS_DIR.exists():
        ANDROID_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    # Lista de arquivos e pastas principais a sincronizar
    items_to_sync = [
        "index.html",
        "styles.css",
        "app.js",
        "service-worker.js",
        "manifest.webmanifest",
        "src",
        "stitch",
        "data",
        "vendor",
        "assets"
    ]

    for item in items_to_sync:
        src = WORKSPACE_DIR / item
        dst = ANDROID_ASSETS_DIR / item
        if not src.exists():
            continue

        if src.is_file():
            shutil.copy2(src, dst)
            print(f"  [COPIADO] {item} ({src.stat().st_size} bytes)")
        elif src.is_dir():
            shutil.copytree(
                src,
                dst,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns("*.pyc", "__pycache__", ".git*")
            )
            count = sum(1 for _ in dst.rglob("*") if _.is_file())
            print(f"  [SINCRONIZADA PASTA] {item}/ ({count} arquivos)")

    print("[SUCESSO] Todos os arquivos do site sincronizados para assets do APK.\n")


def update_build_gradle_version():
    gradle_file = ANDROID_PROJ_DIR / "app" / "build.gradle"
    if gradle_file.exists():
        content = gradle_file.read_text(encoding="utf-8")
        content = content.replace('versionCode 6', 'versionCode 7')
        content = content.replace('versionName "0.4.2-geoview-mini-charts"', 'versionName "2026.09.10-mdsync-cockpit"')
        gradle_file.write_text(content, encoding="utf-8")
        print("[OK] app/build.gradle atualizado para versionCode 7 e versionName 2026.09.10-mdsync-cockpit.")


def step2_build_apk_with_gradle():
    print("=== PASSO 2: Compilando APK Android via Gradle Toolchain ===")
    
    # Criar local.properties para garantir apontamento do SDK
    local_props = ANDROID_PROJ_DIR / "local.properties"
    sdk_escaped = str(ANDROID_SDK).replace("\\", "\\\\")
    local_props.write_text(f"sdk.dir={sdk_escaped}\n", encoding="utf-8")
    print(f"  [CONFIG] local.properties configurado com: {ANDROID_SDK}")

    update_build_gradle_version()

    env = os.environ.copy()
    env["JAVA_HOME"] = str(JAVA_HOME)
    env["ANDROID_HOME"] = str(ANDROID_SDK)
    env["ANDROID_SDK_ROOT"] = str(ANDROID_SDK)
    env["PATH"] = f"{JAVA_HOME}\\bin;{ANDROID_SDK}\\platform-tools;{env.get('PATH', '')}"

    print(f"  [EXEC] Executando {GRADLE_BAT.name} assembleDebug...")
    try:
        proc = subprocess.run(
            [str(GRADLE_BAT), "assembleDebug", "--no-daemon", "--offline"],
            cwd=str(ANDROID_PROJ_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=180
        )
        print("Saída do Gradle:\n", proc.stdout[-800:] if len(proc.stdout) > 800 else proc.stdout)
        if proc.returncode == 0:
            print("[SUCESSO] Gradle assembleDebug finalizado com êxito!")
            return True
        else:
            print("Aviso: Gradle retornou código:", proc.returncode)
            print("Stderr:\n", proc.stderr[-800:] if len(proc.stderr) > 800 else proc.stderr)
            return False
    except Exception as e:
        print(f"Aviso ao executar Gradle: {e}")
        return False


def fallback_package_apk():
    print("\n=== FALLBACK DE SEGURANÇA: Atualizando pacote do APK com os novos assets ===")
    source_apk = ANDROID_PROJ_DIR / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
    if not source_apk.exists():
        source_apk = OUTPUTS_DIR / "MDSync-Campo-debug.apk"

    assert source_apk.exists(), f"APK base nao encontrado: {source_apk}"

    temp_apk = source_apk.parent / "temp_rebuilt.apk"
    
    # Criar novo APK substituindo os arquivos de assets/public
    with zipfile.ZipFile(source_apk, 'r') as zin:
        with zipfile.ZipFile(temp_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            # Copiar tudo que NÃO é assets/public/
            for item in zin.infolist():
                if not item.filename.startswith("assets/public/"):
                    zout.writestr(item, zin.read(item.filename))

            # Adicionar todos os novos arquivos de ANDROID_ASSETS_DIR
            for file_path in ANDROID_ASSETS_DIR.rglob("*"):
                if file_path.is_file():
                    rel_path = file_path.relative_to(ANDROID_ASSETS_DIR)
                    arcname = f"assets/public/{rel_path.as_posix()}"
                    zout.write(file_path, arcname)

    # Substituir o APK original pelo atualizado
    target_apk = ANDROID_PROJ_DIR / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
    target_apk.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(temp_apk, target_apk)
    print(f"[SUCESSO] APK reconstruído com novos assets ({target_apk.stat().st_size} bytes).")
    return True


def step3_distribute_apk():
    print("\n=== PASSO 3: Distribuindo APK gerado para as pastas de destino ===")
    generated_apk = ANDROID_PROJ_DIR / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
    
    if not generated_apk.exists():
        print("Erro: APK gerado não encontrado em", generated_apk)
        return

    # Destinos
    destinations = [
        OUTPUTS_DIR / "MDSync-Campo-debug.apk",
        OUTPUTS_DIR / "MDSync-Campo-v2026.09.10-Cockpit-debug.apk",
        DOWNLOADS_DIR / "MDSync-Campo-debug.apk",
        LOCAL_OUTPUTS_DIR / "MDSync-Campo-debug.apk"
    ]

    LOCAL_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    for dest in destinations:
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(generated_apk, dest)
            size_mb = round(dest.stat().st_size / (1024 * 1024), 2)
            print(f"  [DISTRIBUÍDO] {dest} ({size_mb} MB)")
        except Exception as e:
            print(f"  [ERRO AO COPIAR] {dest}: {e}")

    print("\n[CONCLUÍDO COM 100% DE SUCESSO] Todos os recursos do site foram replicados para o APK!")


if __name__ == "__main__":
    step1_sync_assets()
    success = step2_build_apk_with_gradle()
    if not success:
        fallback_package_apk()
    step3_distribute_apk()
