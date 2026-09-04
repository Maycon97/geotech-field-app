import os
import zipfile
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

EXCEL_PATH = r"C:\Users\maycon.nascimento\OneDrive - ITAMINAS\Documentos\Work\Project Comunication 2026\CronogramaPCM.xlsx"
OUTPUT_JSON = r"C:\Users\maycon.nascimento\.gemini\antigravity\scratch\geotech-field-app\data\cronograma-pcm.json"
OUTPUT_JS = r"C:\Users\maycon.nascimento\.gemini\antigravity\scratch\geotech-field-app\data\cronograma-pcm.js"

CANONICAL_STRUCTURES = {
    "B1": "Barragem B1",
    "B4": "Barragem B4",
    "PDE1": "PDE 1",
    "DIQUE PDE1": "PDE 1",
    "PDE2": "PDE 2",
    "PILHA B2": "Pilha B2",
    "PILHA JACÓ": "PDE Jacó",
    "PILHA JAC\u00d3": "PDE Jacó",
    "PILHA MANGABA": "PDE Mangaba",
    "CAVA JANGADA": "Cava Jangada",
    "CAVA SAMAMBAIA": "Cava Samambaia",
    "CAVA ENGENHO SECO": "Cava Engenho Seco",
    "SUMPS": "Sumps",
    "FRENTES DE LAVRA": "Frentes de Lavra",
    "PILHAS DE PRODUTO": "Pilhas de Produto",
    "PILHAS": "Pilhas",
    "TODAS": "Todas as Estruturas",
    "ESCRITORIO": "Escritório",
    "ESCRIT\u00d3RIO": "Escritório"
}

def excel_serial_to_date(val):
    if not val:
        return None
    try:
        n = float(val)
        dt = datetime(1899, 12, 30) + timedelta(days=n)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return str(val)

def categorize_action(action_name):
    act = (action_name or "").upper()
    if "INSTRUMENTA" in act or "PLUVIOMETRIA" in act:
        return "Leitura de Instrumentos"
    if "FOTOGRAFICO" in act or "FOTOGR\u00c1FICO" in act or "DRONE" in act:
        return "Registro Fotográfico"
    if "INSPE" in act or "HIDROGEOL" in act:
        return "Monitoramento Sensorial"
    if "RELAT" in act or "FORMUL" in act or "BANCO DE DADOS" in act or "FIR" in act:
        return "Relatórios & Banco de Dados"
    if "VISITA" in act or "TERMO" in act or "MPMG" in act or "SRV" in act or "MLF" in act or "EOR" in act or "RISR" in act:
        return "Vistorias & Auditorias Técnicas"
    return "Gestão Operacional"

def main():
    if not os.path.exists(EXCEL_PATH):
        print(f"ERRO: Arquivo não encontrado em {EXCEL_PATH}")
        return

    with zipfile.ZipFile(EXCEL_PATH, "r") as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss_tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            for si in ss_tree.findall(".//ns:si", ns):
                texts = [t.text or "" for t in si.findall(".//ns:t", ns)]
                shared_strings.append("".join(texts))

        def parse_worksheet(xml_path):
            tree = ET.fromstring(z.read(xml_path))
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            rows = []
            for r in tree.findall(".//ns:row", ns):
                row_idx = r.attrib.get("r")
                row_dict = {}
                for c in r.findall("./ns:c", ns):
                    cell_ref = c.attrib.get("r")
                    col_letter = "".join([ch for ch in cell_ref if ch.isalpha()])
                    t = c.attrib.get("t")
                    v_el = c.find("./ns:v", ns)
                    val = v_el.text if v_el is not None else ""
                    if t == "s" and val.isdigit():
                        val = shared_strings[int(val)]
                    row_dict[col_letter] = val
                rows.append((row_idx, row_dict))
            return rows

        sheet1_rows = parse_worksheet("xl/worksheets/sheet1.xml")
        header = sheet1_rows[0][1] if sheet1_rows else {}
        print("Header colunas:", header)

        tasks = []
        for r_idx, r_dict in sheet1_rows[1:]:
            raw_structure = r_dict.get("A", "").strip()
            if not raw_structure:
                continue

            raw_action = r_dict.get("E", "").strip()
            raw_date_plan = r_dict.get("D", "").strip()
            raw_date_real = r_dict.get("H", "").strip()
            raw_status = r_dict.get("K", "").strip()
            raw_desvio = r_dict.get("I", "").strip()
            raw_foto = r_dict.get("J", "").strip()
            raw_id = r_dict.get("F", "").strip() or str(r_idx)
            raw_ciclo = r_dict.get("G", "").strip()
            raw_justificativa = r_dict.get("L", "").strip()

            date_planned = excel_serial_to_date(raw_date_plan)
            date_realized = excel_serial_to_date(raw_date_real)

            canonical_structure = CANONICAL_STRUCTURES.get(raw_structure.upper(), raw_structure)
            category = categorize_action(raw_action)
            if raw_foto and category != "Registro Fotográfico":
                category = "Registro Fotográfico"

            status_normalized = "Pendente"
            if "conclu" in raw_status.lower() or "realizado" in raw_status.lower():
                status_normalized = "Concluído"
            elif "reprogramad" in raw_status.lower():
                status_normalized = "Reprogramada"
            elif "andamento" in raw_status.lower():
                status_normalized = "Em Andamento"
            elif "futuras" in raw_status.lower():
                status_normalized = "Programado"

            tasks.append({
                "id": raw_id,
                "structure": canonical_structure,
                "rawStructure": raw_structure,
                "action": raw_action,
                "category": category,
                "datePlanned": date_planned,
                "dateRealized": date_realized,
                "status": status_normalized,
                "rawStatus": raw_status,
                "desvio": raw_desvio,
                "photoRequired": bool(raw_foto),
                "photoDetails": raw_foto,
                "cycle": raw_ciclo,
                "justification": raw_justificativa,
                "responsibleTeam": "Geotecnia / Operação" if "INSTRUMENTA" in raw_action.upper() or "INSPE" in raw_action.upper() else "Engenharia Geotécnica"
            })

        print(f"Total de tarefas extraídas: {len(tasks)}")

        # Parse coordinates if available
        coordinates = []
        if "xl/worksheets/sheet2.xml" in z.namelist():
            sheet2_rows = parse_worksheet("xl/worksheets/sheet2.xml")
            for r_idx, r_dict in sheet2_rows[1:]:
                st = r_dict.get("A", "").strip()
                lat = r_dict.get("B", "").strip()
                lon = r_dict.get("C", "").strip()
                if st and lat and lon:
                    coordinates.append({
                        "structure": CANONICAL_STRUCTURES.get(st.upper(), st),
                        "rawStructure": st,
                        "latitude": float(lat),
                        "longitude": float(lon)
                    })
        print(f"Total de coordenadas extraídas: {len(coordinates)}")

    data_payload = {
        "sourceFile": EXCEL_PATH,
        "extractedAt": datetime.now().isoformat(),
        "totalTasks": len(tasks),
        "structuresList": sorted(list(set(t["structure"] for t in tasks))),
        "categoriesList": sorted(list(set(t["category"] for t in tasks))),
        "coordinates": coordinates,
        "tasks": tasks
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data_payload, f, indent=2, ensure_ascii=False)
    print(f"Salvo JSON em {OUTPUT_JSON} ({os.path.getsize(OUTPUT_JSON)} bytes)")

    js_content = f"// Cronograma Oficial PCM - Gerado automaticamente a partir de {os.path.basename(EXCEL_PATH)}\n"
    js_content += f"window.CRONOGRAMA_PCM_DATA = {json.dumps(data_payload, indent=2, ensure_ascii=False)};\n"
    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Salvo JS em {OUTPUT_JS} ({os.path.getsize(OUTPUT_JS)} bytes)")

if __name__ == "__main__":
    main()
