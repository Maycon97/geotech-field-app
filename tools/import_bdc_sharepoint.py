from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import unicodedata
from datetime import datetime
from pathlib import Path

import pandas as pd


DEFAULT_SHAREPOINT_FOLDER = Path(
    r"C:\Users\maycon.nascimento\ITAMINAS\SPLO - General\03) Geotecnia\05) PCM\02) Pilhas\Banco de Dados - PILHAS\2026"
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
    return "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))


def normalize_structure(value):
    text = clean_text(value) or "SEM ESTRUTURA"
    text = re.sub(r"\s+", " ", text.strip())
    if text.upper() == "PDE":
        return "PDE 1"
    return text


def slug(text):
    text = strip_accents(str(text).upper())
    text = re.sub(r"[^A-Z0-9]+", "-", text).strip("-")
    return text or "SEM-ID"


def instrument_key(structure, instrument_type, instrument_id):
    try:
        id_part = f"{int(float(instrument_id)):02d}"
    except Exception:
        id_part = slug(instrument_id)
    return f"{slug(normalize_structure(structure))}-{slug(instrument_type)}-{id_part}"


def instrument_code(instrument_type, instrument_id):
    try:
        return f"{str(instrument_type).strip()}-{int(float(instrument_id)):02d}"
    except Exception:
        return f"{str(instrument_type).strip()}-{instrument_id}"


def imported_status(status, situation):
    raw = f"{clean_text(status) or ''} {clean_text(situation) or ''}".upper()
    if any(token in raw for token in ["CRIT", "EMERG", "ALERTA"]):
        return "Critico"
    if any(token in raw for token in ["VERIFICAR", "ATEN"]):
        return "Atencao"
    return "Normal"


def choose_source(folder: Path) -> Path:
    files = [
        path
        for path in folder.glob("BDC-Leituras_de_instrumentos*.xlsx")
        if path.is_file() and not path.name.startswith("~$")
    ]
    if not files:
        raise FileNotFoundError(f"Nenhum BDC-Leituras_de_instrumentos*.xlsx encontrado em {folder}")
    return max(files, key=lambda path: path.stat().st_mtime)


def build_database(source: Path) -> dict:
    info = pd.read_excel(source, sheet_name=0)
    readings_sheet = pd.read_excel(source, sheet_name=1)
    flow_sheet = pd.read_excel(source, sheet_name=2)

    for dataframe in (info, readings_sheet, flow_sheet):
        dataframe.columns = [str(column).strip() for column in dataframe.columns]

    reading_col = next(column for column in readings_sheet.columns if column.startswith("LEITURA"))
    reading_level_col = next(column for column in readings_sheet.columns if column.startswith("COTA LEITURA"))
    situation_col = next(column for column in readings_sheet.columns if column.startswith("SIT"))

    instruments = {}
    info_valid = info.dropna(subset=["ESTRUTURA", "TIPO", "ID"]).copy()
    for _, row in info_valid.iterrows():
        structure = normalize_structure(row.get("ESTRUTURA"))
        instrument_type = clean_text(row.get("TIPO")) or "INST"
        code = instrument_code(instrument_type, row.get("ID"))
        key = instrument_key(structure, instrument_type, row.get("ID"))
        depth = clean_number(row.get("PROFUNDIDADE INSTALAÇÃO"), 2) or clean_number(row.get("COMPRIMENTO TOTAL"), 2) or 0
        cota_top = clean_number(row.get("COTA TOPO"), 3)
        cota_base = clean_number(row.get("COTA BASE"), 3)
        instruments[key] = {
            "id": key,
            "code": code,
            "name": f"{code} - {structure}",
            "type": instrument_type.strip().upper(),
            "structure": structure,
            "installationDate": clean_date(row.get("DATA INSTALAÇÃO")),
            "diameter": clean_text(row.get("DIÂMETRO Ø")),
            "cotaBoca": cota_top or cota_base or 0,
            "cotaBase": cota_base,
            "cotaFundo": clean_number(row.get("COTA FUNDO"), 3),
            "profMax": depth,
            "limiteCritico": depth or 1,
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
        instrument_type = clean_text(row.get("TIPO")) or "INST"
        key = instrument_key(structure, instrument_type, row.get("ID"))
        code = instrument_code(instrument_type, row.get("ID"))
        value = clean_number(row.get(reading_col), 3)
        if value is None:
            continue

        cota = clean_number(row.get(reading_level_col), 3)
        if key not in instruments:
            instruments[key] = {
                "id": key,
                "code": code,
                "name": f"{code} - {structure}",
                "type": instrument_type.strip().upper(),
                "structure": structure,
                "installationDate": None,
                "diameter": None,
                "cotaBoca": cota + value if cota is not None else 0,
                "cotaBase": None,
                "cotaFundo": clean_number(row.get("COTA FUNDO"), 3),
                "profMax": value,
                "limiteCritico": value,
                "coordinates": {"ns": None, "ew": None},
                "historico": [],
            }

        instrument = instruments[key]
        date_time = clean_date(row.get("DATA"), with_time=True)
        if cota is None and instrument.get("cotaBoca"):
            cota = round(instrument["cotaBoca"] - value, 3)

        status = imported_status(row.get("STATUS"), row.get(situation_col))
        reading = {
            "id": f"xlsx-pz-{idx + 2}",
            "source": "sharepoint-xlsx",
            "sourceId": f"DadosPiezometricos:{idx + 2}",
            "sourceSheet": "DadosPiezometricos",
            "instrumentId": key,
            "instrumentCode": code,
            "structure": structure,
            "type": instrument["type"],
            "dateTime": date_time,
            "value": value,
            "cotaCalculada": cota,
            "cotaFundo": clean_number(row.get("COTA FUNDO"), 3),
            "inspector": "Base BDC SharePoint",
            "status": status,
            "rawStatus": clean_text(row.get("STATUS")),
            "situation": clean_text(row.get(situation_col)),
            "comments": f"Registro importado de {source.name}.",
        }
        readings.append(reading)
        instrument["historico"].append({"data": date_time[:10] if date_time else None, "valor": value, "status": status})

    max_by_instrument = {}
    for reading in readings:
        max_by_instrument[reading["instrumentId"]] = max(max_by_instrument.get(reading["instrumentId"], 0), reading["value"])

    for key, instrument in instruments.items():
        base = max(max_by_instrument.get(key, 0), clean_number(instrument.get("profMax"), 2) or 0, 1)
        instrument["profMax"] = max(clean_number(instrument.get("profMax"), 2) or 0, max_by_instrument.get(key, 0))
        # The workbook does not provide design alert thresholds. This envelope is for typing validation only.
        instrument["limiteCritico"] = round(base * 1.3, 2)

    flow_readings = []
    flow_valid = flow_sheet.dropna(subset=["ESTRUTURA", "TIPO", "DATA"]).copy()
    for idx, row in flow_valid.iterrows():
        structure = normalize_structure(row.get("ESTRUTURA"))
        instrument_type = clean_text(row.get("TIPO")) or "MV"
        instrument_id = row.get("ID")
        key = instrument_key(structure, instrument_type, instrument_id if not pd.isna(instrument_id) else 1)
        code = instrument_code(instrument_type, instrument_id if not pd.isna(instrument_id) else 1)
        if key not in instruments:
            instruments[key] = {
                "id": key,
                "code": code,
                "name": f"{code} - {structure}",
                "type": instrument_type.strip().upper(),
                "structure": structure,
                "installationDate": None,
                "diameter": None,
                "cotaBoca": 0,
                "cotaBase": None,
                "cotaFundo": None,
                "profMax": 0,
                "limiteCritico": 1,
                "coordinates": {"ns": None, "ew": None},
                "historico": [],
            }
        flow_readings.append(
            {
                "id": f"xlsx-vazao-{idx + 2}",
                "source": "sharepoint-xlsx",
                "sourceId": f"DadosVazao:{idx + 2}",
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
                "inspector": "Base BDC SharePoint",
                "comments": "Registro de vazao importado da aba DadosVazao.",
            }
        )

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
    }
    version_seed = json.dumps({"source": str(source), "modified": source.stat().st_mtime, "summary": summary}, sort_keys=True)
    return {
        "version": "sharepoint-bdc-" + hashlib.sha1(version_seed.encode("utf-8")).hexdigest()[:10],
        "sourceFile": str(source),
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
        "// Base gerada automaticamente do BDC no SharePoint sincronizado.\n"
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
    parser = argparse.ArgumentParser(description="Atualiza a base GeoSync a partir do BDC sincronizado do SharePoint.")
    parser.add_argument("--folder", type=Path, default=DEFAULT_SHAREPOINT_FOLDER, help="Pasta SharePoint sincronizada.")
    parser.add_argument("--source", type=Path, help="Arquivo XLSX especifico. Se omitido, usa o BDC mais recente da pasta.")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "geosync-database.js",
        help="Arquivo JS de saida usado pelo app.",
    )
    args = parser.parse_args()

    source = args.source or choose_source(args.folder)
    database = build_database(source)
    save_database(database, args.output)
    print(
        json.dumps(
            {
                "source": str(source),
                "output": str(args.output),
                "version": database["version"],
                "summary": database["summary"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
