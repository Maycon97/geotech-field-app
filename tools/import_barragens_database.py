from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import struct
import unicodedata
import zipfile
import zlib
from datetime import datetime
from pathlib import Path

import pandas as pd


DEFAULT_BARRAGENS_SOURCE = Path(
    r"C:\Users\maycon.nascimento\ITAMINAS\SPLO - General\03) Geotecnia\05) PCM\01) Barragens\1) Monitoramentos\1) Dados\BancodeDados.xlsx"
)


def clean_text(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    return text or None


def clean_number(value, digits=3):
    if value is None:
        return None
    try:
        if math.isnan(value):
            return None
    except TypeError:
        pass
    try:
        return round(float(value), digits)
    except Exception:
        return None


def clean_date(value, with_time=False):
    if value is None or pd.isna(value):
        return None
    timestamp = pd.to_datetime(value, errors="coerce")
    if pd.isna(timestamp):
        return None
    return timestamp.strftime("%Y-%m-%dT%H:%M") if with_time else timestamp.strftime("%Y-%m-%d")


def strip_accents(text):
    return "".join(ch for ch in unicodedata.normalize("NFKD", str(text)) if not unicodedata.combining(ch))


def normalize_key(text):
    return re.sub(r"[^A-Z0-9]+", "", strip_accents(text).upper())


def normalize_structure(value):
    text = clean_text(value) or "Estrutura nao informada"
    text = re.sub(r"\s+", " ", text.strip())
    upper = strip_accents(text).upper()
    if upper.startswith("BARRAGEM "):
        suffix = text.split(maxsplit=1)[1].upper()
        return f"Barragem {suffix}"
    return text


def slug(text):
    text = strip_accents(str(text).upper())
    text = re.sub(r"[^A-Z0-9]+", "-", text).strip("-")
    return text or "SEM-ID"


def instrument_code(instrument_type, instrument_id):
    instrument_type = str(instrument_type).strip().upper()
    try:
        number = int(float(instrument_id))
        return f"{instrument_type}-{number:02d}" if number < 100 else f"{instrument_type}-{number}"
    except Exception:
        return f"{instrument_type}-{instrument_id}"


def instrument_key(structure, instrument_type, instrument_id):
    return f"{slug(normalize_structure(structure))}-{slug(instrument_type)}-{slug(str(instrument_id))}"


def imported_status(status, situation):
    raw = f"{clean_text(status) or ''} {clean_text(situation) or ''}".upper()
    if any(token in strip_accents(raw) for token in ["CRIT", "EMERG", "ALERTA"]):
        return "Critico"
    if any(token in strip_accents(raw) for token in ["VERIFICAR", "ATEN"]):
        return "Atencao"
    return "Normal"


def find_column(columns, contains):
    wanted = normalize_key(contains)
    for column in columns:
        if wanted in normalize_key(column):
            return column
    return None


def valid_zip(path: Path) -> bool:
    try:
        with zipfile.ZipFile(path) as workbook_zip:
            return workbook_zip.testzip() is None
    except zipfile.BadZipFile:
        return False


def recover_xlsx(source: Path, recovered: Path) -> tuple[Path, bool, list[str]]:
    if valid_zip(source):
        return source, False, []

    raw = source.read_bytes()
    pos = 0
    entries = []
    skipped = []
    while pos + 30 <= len(raw):
        if raw[pos:pos + 4] != b"PK\x03\x04":
            next_pos = raw.find(b"PK\x03\x04", pos + 1)
            if next_pos == -1:
                break
            pos = next_pos
            continue

        method = struct.unpack("<H", raw[pos + 8:pos + 10])[0]
        compressed_size = struct.unpack("<I", raw[pos + 18:pos + 22])[0]
        name_length = struct.unpack("<H", raw[pos + 26:pos + 28])[0]
        extra_length = struct.unpack("<H", raw[pos + 28:pos + 30])[0]
        name_start = pos + 30
        name = raw[name_start:name_start + name_length].decode("utf-8", errors="replace")
        data_start = name_start + name_length + extra_length
        data_end = data_start + compressed_size
        if data_end > len(raw):
            skipped.append(name)
            break

        compressed_data = raw[data_start:data_end]
        try:
            if method == 8:
                data = zlib.decompress(compressed_data, -15)
            elif method == 0:
                data = compressed_data
            else:
                raise ValueError(f"Metodo ZIP nao suportado: {method}")
            if name != "xl/calcChain.xml":
                entries.append((name, data))
        except Exception:
            skipped.append(name)
        pos = data_end

    recovered.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(recovered, "w", compression=zipfile.ZIP_DEFLATED) as workbook_zip:
        seen = set()
        for name, data in entries:
            if name in seen:
                continue
            seen.add(name)
            workbook_zip.writestr(name, data)

    if not valid_zip(recovered):
        raise zipfile.BadZipFile(f"Nao foi possivel recuperar {source}")
    return recovered, True, skipped


def add_thresholds(row):
    thresholds = {
        "normalElevation": clean_number(row.get(find_column(row.index, "NIVEL NORMAL")), 3),
        "attentionElevation": clean_number(row.get(find_column(row.index, "ATENCAO")), 3),
        "alertElevation": clean_number(row.get(find_column(row.index, "ALERTA")), 3),
        "emergencyElevation": clean_number(row.get(find_column(row.index, "EMERGENCIA")), 3),
    }
    return {key: value for key, value in thresholds.items() if value is not None}


def depth_from_elevation(cota_top, elevation):
    if cota_top is None or elevation is None:
        return None
    return round(cota_top - elevation, 3)


def build_barragens_database(source: Path, original_source: Path, recovered: bool, skipped_entries: list[str]) -> dict:
    info = pd.read_excel(source, sheet_name=1)
    readings_sheet = pd.read_excel(source, sheet_name=2)
    flow_sheet = pd.read_excel(source, sheet_name=3)
    water_level_sheet = pd.read_excel(source, sheet_name="NA")

    for dataframe in (info, readings_sheet, flow_sheet, water_level_sheet):
        dataframe.columns = [str(column).strip() for column in dataframe.columns]

    reading_col = find_column(readings_sheet.columns, "LEITURA")
    reading_level_col = find_column(readings_sheet.columns, "COTA LEITURA")
    situation_col = find_column(readings_sheet.columns, "SITUACAO")

    instruments = {}
    info_valid = info.dropna(subset=["ESTRUTURA", "TIPO", "ID"]).copy()
    for _, row in info_valid.iterrows():
        structure = normalize_structure(row.get("ESTRUTURA"))
        instrument_type = (clean_text(row.get("TIPO")) or "INST").upper()
        code = instrument_code(instrument_type, row.get("ID"))
        key = instrument_key(structure, instrument_type, row.get("ID"))
        depth = clean_number(row.get("PROFUNDIDADE INSTALAÇÃO"), 2) or clean_number(row.get("COMPRIMENTO TOTAL"), 2) or 0
        cota_top = clean_number(row.get("COTA TOPO"), 3)
        cota_base = clean_number(row.get("COTA BASE"), 3)
        thresholds = add_thresholds(row)
        emergency_depth = depth_from_elevation(cota_top or cota_base, thresholds.get("emergencyElevation") or thresholds.get("alertElevation"))

        instruments[key] = {
            "id": key,
            "code": code,
            "name": f"{code} - {structure}",
            "type": instrument_type,
            "structure": structure,
            "structureClass": "Barragem",
            "sourceGroup": "barragens",
            "installationDate": clean_date(row.get("DATA INSTALAÇÃO")),
            "section": clean_text(row.get("SEÇÃO")),
            "diameter": clean_text(row.get("DIÂMETRO Ø")),
            "cotaBoca": cota_top or cota_base or 0,
            "cotaBase": cota_base,
            "cotaFundo": clean_number(row.get("COTA FUNDO"), 3),
            "profMax": depth,
            "limiteCritico": emergency_depth or depth or 1,
            "thresholdMode": "elevation" if thresholds else "depth",
            "thresholds": thresholds,
            "coordinates": {
                "ns": clean_number(row.get("COORDENADA NS"), 3),
                "ew": clean_number(row.get("COORDENADA EW"), 3),
            },
            "historico": [],
        }

    readings = []
    readings_valid = readings_sheet.dropna(subset=["ESTRUTURA", "TIPO", "ID", "DATA"]).copy()
    for idx, row in readings_valid.iterrows():
        structure = normalize_structure(row.get("ESTRUTURA"))
        instrument_type = (clean_text(row.get("TIPO")) or "INST").upper()
        key = instrument_key(structure, instrument_type, row.get("ID"))
        code = instrument_code(instrument_type, row.get("ID"))
        value = clean_number(row.get(reading_col), 3)
        if value is None:
            continue

        cota = clean_number(row.get(reading_level_col), 3)
        if key not in instruments:
            thresholds = add_thresholds(row)
            cota_top = clean_number(row.get("COTA TOPO"), 3)
            emergency_depth = depth_from_elevation(cota_top, thresholds.get("emergencyElevation") or thresholds.get("alertElevation"))
            instruments[key] = {
                "id": key,
                "code": code,
                "name": f"{code} - {structure}",
                "type": instrument_type,
                "structure": structure,
                "structureClass": "Barragem",
                "sourceGroup": "barragens",
                "installationDate": None,
                "section": None,
                "diameter": None,
                "cotaBoca": cota_top or (cota + value if cota is not None else 0),
                "cotaBase": None,
                "cotaFundo": clean_number(row.get("COTA FUNDO"), 3),
                "profMax": value,
                "limiteCritico": emergency_depth or value,
                "thresholdMode": "elevation" if thresholds else "depth",
                "thresholds": thresholds,
                "coordinates": {"ns": None, "ew": None},
                "historico": [],
            }

        instrument = instruments[key]
        date_time = clean_date(row.get("DATA"), with_time=True)
        if cota is None and instrument.get("cotaBoca"):
            cota = round(instrument["cotaBoca"] - value, 3)

        status = imported_status(row.get("STATUS"), row.get(situation_col))
        readings.append({
            "id": f"barragens-xlsx-pz-{idx + 2}",
            "source": "barragens-xlsx",
            "sourceGroup": "barragens",
            "sourceId": f"Barragens:DadosPiezometricos:{idx + 2}",
            "sourceSheet": "DadosPiezometricos",
            "instrumentId": key,
            "instrumentCode": code,
            "structure": structure,
            "type": instrument["type"],
            "dateTime": date_time,
            "value": value,
            "cotaCalculada": cota,
            "cotaFundo": clean_number(row.get("COTA FUNDO"), 3),
            "inspector": "Base Barragens SharePoint",
            "status": status,
            "rawStatus": clean_text(row.get("STATUS")),
            "situation": clean_text(row.get(situation_col)),
            "comments": f"Registro importado de {original_source.name}.",
        })

    latest_history = {}
    for reading in readings:
        latest_history.setdefault(reading["instrumentId"], []).append(reading)
    for key, history in latest_history.items():
        history.sort(key=lambda item: item.get("dateTime") or "")
        instruments[key]["historico"] = [
            {"data": item["dateTime"][:10] if item.get("dateTime") else None, "valor": item["value"], "status": item["status"]}
            for item in history[-36:]
        ]
        instruments[key]["profMax"] = max(instruments[key].get("profMax") or 0, max(item["value"] for item in history))

    water_level_valid = water_level_sheet.dropna(subset=["Data"]).copy()
    if not water_level_valid.empty:
        structure = "Barragem B1"
        key = instrument_key(structure, "NA", "RESERVATORIO")
        instruments[key] = {
            "id": key,
            "code": "NA-Reservatorio",
            "name": f"NA Reservatorio - {structure}",
            "type": "NA",
            "structure": structure,
            "structureClass": "Barragem",
            "sourceGroup": "barragens",
            "installationDate": None,
            "section": "Reservatorio",
            "diameter": None,
            "cotaBoca": 0,
            "cotaBase": None,
            "cotaFundo": None,
            "profMax": 0,
            "limiteCritico": 1,
            "thresholdMode": "elevation",
            "thresholds": {},
            "coordinates": {
                "ns": clean_number(water_level_valid["Coordenada Norte (N)"].dropna().iloc[-1], 3)
                    if water_level_valid["Coordenada Norte (N)"].notna().any() else None,
                "ew": clean_number(water_level_valid["Coordenada Leste (E)"].dropna().iloc[-1], 3)
                    if water_level_valid["Coordenada Leste (E)"].notna().any() else None,
            },
            "historico": [],
        }

        water_history = []
        for idx, row in water_level_valid.iterrows():
            value = clean_number(row.get("Sirgas2000"), 3)
            altimetry = clean_number(row.get("Altimetria"), 3)
            if value is None and altimetry is None:
                continue
            date_time = clean_date(row.get("Data"), with_time=True)
            reading = {
                "id": f"barragens-xlsx-na-{idx + 2}",
                "source": "barragens-xlsx",
                "sourceGroup": "barragens",
                "sourceId": f"Barragens:NA:{idx + 2}",
                "sourceSheet": "NA",
                "instrumentId": key,
                "instrumentCode": "NA-Reservatorio",
                "structure": structure,
                "type": "NA",
                "dateTime": date_time,
                "value": value if value is not None else altimetry,
                "cotaCalculada": value if value is not None else altimetry,
                "altimetry": altimetry,
                "datum": clean_text(row.get("Datum")),
                "difference": clean_number(row.get("Diferença"), 3),
                "coordinates": {
                    "ew": clean_number(row.get("Coordenada Leste (E)"), 3),
                    "ns": clean_number(row.get("Coordenada Norte (N)"), 3),
                },
                "inspector": "Base Barragens SharePoint",
                "status": "Normal",
                "rawStatus": "Nivel de agua",
                "situation": "Nivel de agua",
                "comments": "Registro de nivel de agua importado da aba NA do banco de barragens.",
            }
            readings.append(reading)
            water_history.append(reading)

        water_history.sort(key=lambda item: item.get("dateTime") or "")
        instruments[key]["historico"] = [
            {"data": item["dateTime"][:10] if item.get("dateTime") else None, "valor": item["value"], "status": item["status"]}
            for item in water_history[-36:]
        ]
        instruments[key]["profMax"] = max((item["value"] for item in water_history), default=0)

    flow_readings = []
    flow_valid = flow_sheet.dropna(subset=["ESTRUTURA", "TIPO", "DATA"]).copy()
    for idx, row in flow_valid.iterrows():
        structure = normalize_structure(row.get("ESTRUTURA"))
        instrument_type = (clean_text(row.get("TIPO")) or "MV").upper()
        instrument_id = row.get("ID")
        key = instrument_key(structure, instrument_type, instrument_id if not pd.isna(instrument_id) else 1)
        code = instrument_code(instrument_type, instrument_id if not pd.isna(instrument_id) else 1)
        if key not in instruments:
            instruments[key] = {
                "id": key,
                "code": code,
                "name": f"{code} - {structure}",
                "type": instrument_type,
                "structure": structure,
                "structureClass": "Barragem",
                "sourceGroup": "barragens",
                "installationDate": None,
                "section": None,
                "diameter": None,
                "cotaBoca": 0,
                "cotaBase": None,
                "cotaFundo": None,
                "profMax": 0,
                "limiteCritico": 1,
                "coordinates": {"ns": None, "ew": None},
                "historico": [],
            }

        flow_readings.append({
            "id": f"barragens-xlsx-vazao-{idx + 2}",
            "source": "barragens-xlsx",
            "sourceGroup": "barragens",
            "sourceId": f"Barragens:DadosVazao:{idx + 2}",
            "sourceSheet": "DadosVazao",
            "instrumentId": key,
            "instrumentCode": code,
            "structure": structure,
            "type": instruments[key]["type"],
            "dateTime": clean_date(row.get("DATA"), with_time=True),
            "h": clean_number(row.get("H (m)"), 3),
            "litersPerSecond": clean_number(row.get("L/S"), 4),
            "flowM3s": clean_number(row.get("Q (m³/s)"), 6),
            "status": imported_status(row.get("SITUAÇÃO"), row.get("SITUAÇÃO")),
            "situation": clean_text(row.get("SITUAÇÃO")),
            "inspector": "Base Barragens SharePoint",
            "comments": "Registro de vazao importado da aba DadosVazao do banco de barragens.",
        })

    summary = {
        "instrumentCount": len(instruments),
        "piezometricReadingCount": len(readings),
        "flowReadingCount": len(flow_readings),
        "structures": sorted({instrument["structure"] for instrument in instruments.values()}),
        "dateRange": {
            "readingsStart": min((r["dateTime"] for r in readings if r.get("dateTime")), default=None),
            "readingsEnd": max((r["dateTime"] for r in readings if r.get("dateTime")), default=None),
            "flowStart": min((r["dateTime"] for r in flow_readings if r.get("dateTime")), default=None),
            "flowEnd": max((r["dateTime"] for r in flow_readings if r.get("dateTime")), default=None),
        },
        "recoveredXlsx": recovered,
        "skippedEntries": skipped_entries,
    }
    return {
        "sourceFile": str(original_source),
        "summary": summary,
        "instrumentRegistry": dict(sorted(instruments.items())),
        "readings": readings,
        "flowReadings": flow_readings,
    }


def load_existing_database(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"window\.GEOSYNC_DATABASE\s*=\s*(\{.*\});\s*$", text, re.S)
    if not match:
        raise ValueError(f"Nao foi possivel localizar window.GEOSYNC_DATABASE em {path}")
    return json.loads(match.group(1))


def ordered_structures(*structure_lists):
    result = []
    seen = set()
    for structures in structure_lists:
        for structure in structures or []:
            key = normalize_key(structure)
            if key and key not in seen:
                seen.add(key)
                result.append(structure)
    return result


def date_range(rows):
    dates = [row.get("dateTime") for row in rows if row.get("dateTime")]
    return min(dates, default=None), max(dates, default=None)


def merge_databases(base: dict, barragens: dict, source: Path) -> dict:
    base_instruments = {
        key: value for key, value in (base.get("instrumentRegistry") or {}).items()
        if value.get("sourceGroup") != "barragens"
    }
    base_readings = [row for row in base.get("readings", []) if row.get("sourceGroup") != "barragens" and row.get("source") != "barragens-xlsx"]
    base_flow = [row for row in base.get("flowReadings", []) if row.get("sourceGroup") != "barragens" and row.get("source") != "barragens-xlsx"]

    instruments = {**base_instruments, **barragens["instrumentRegistry"]}
    readings = base_readings + barragens["readings"]
    flow_readings = base_flow + barragens["flowReadings"]
    reading_start, reading_end = date_range(readings)
    flow_start, flow_end = date_range(flow_readings)

    source_files = []
    if base.get("sourceFiles"):
        source_files.extend(base["sourceFiles"])
    elif base.get("sourceFile"):
        source_files.append(base["sourceFile"])
    source_files.append(str(source))

    structures = ordered_structures(
        base.get("summary", {}).get("structures", []),
        barragens.get("summary", {}).get("structures", []),
        [instrument.get("structure") for instrument in instruments.values()]
    )

    summary = {
        "instrumentCount": len(instruments),
        "piezometricReadingCount": len(readings),
        "flowReadingCount": len(flow_readings),
        "structures": structures,
        "structureGroups": {
            "pilhas": [structure for structure in structures if not normalize_key(structure).startswith("BARRAGEM")],
            "barragens": [structure for structure in structures if normalize_key(structure).startswith("BARRAGEM")],
        },
        "dateRange": {
            "readingsStart": reading_start,
            "readingsEnd": reading_end,
            "flowStart": flow_start,
            "flowEnd": flow_end,
        },
        "imports": {
            "baseVersion": base.get("version"),
            "barragens": barragens["summary"],
        },
    }

    version_seed = json.dumps({
        "baseVersion": base.get("version"),
        "barragensSource": str(source),
        "barragensModified": source.stat().st_mtime,
        "summary": summary,
    }, sort_keys=True)

    return {
        "version": "mdsync-combined-" + hashlib.sha1(version_seed.encode("utf-8")).hexdigest()[:10],
        "sourceFile": "MDSync base combinada de pilhas e barragens",
        "sourceFiles": source_files,
        "generatedAt": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "summary": summary,
        "instrumentRegistry": dict(sorted(instruments.items())),
        "readings": readings,
        "flowReadings": flow_readings,
    }


def save_database(database: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(database, ensure_ascii=True, separators=(",", ":"))
    output.write_text(
        "// Base combinada gerada automaticamente para o MDSync.\n"
        f"window.GEOSYNC_DATABASE = {payload};\n",
        encoding="utf-8",
    )
    index_file = output.parents[1] / "index.html"
    if index_file.exists():
        html = index_file.read_text(encoding="utf-8")
        html = re.sub(
            r'data/geosync-database\.js(?:\?v=[^"]*)?',
            f"data/geosync-database.js?v={database['version']}",
            html,
        )
        index_file.write_text(html, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Incorpora o banco de barragens na base local do MDSync.")
    parser.add_argument("--source", type=Path, default=DEFAULT_BARRAGENS_SOURCE, help="Arquivo BancodeDados.xlsx de barragens.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "geosync-database.js",
        help="Arquivo JS de saida usado pelo app.",
    )
    parser.add_argument(
        "--recovered",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "work" / "BancodeDados-barragens-recovered.xlsx",
        help="Copia XLSX recuperada quando o arquivo original estiver truncado.",
    )
    args = parser.parse_args()

    base = load_existing_database(args.output)
    readable_source, recovered, skipped_entries = recover_xlsx(args.source, args.recovered)
    barragens = build_barragens_database(readable_source, args.source, recovered, skipped_entries)
    combined = merge_databases(base, barragens, args.source)
    save_database(combined, args.output)
    print(json.dumps({
        "source": str(args.source),
        "readableSource": str(readable_source),
        "output": str(args.output),
        "version": combined["version"],
        "summary": combined["summary"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
