import json
import re
from pathlib import Path
import pypdf
from PIL import Image

def extract_geology_data():
    pdf_path = Path(r"C:\Users\maycon.nascimento\Documents\Work\CÓPIAS\Copy Works\Layout_MapaGeológico_0826.pdf")
    reader = pypdf.PdfReader(str(pdf_path))
    page = reader.pages[0]

    text = page.extract_text()
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # Extract cotas
    cotas = []
    for l in lines:
        if re.match(r'^\d{4}$', l):
            val = int(l)
            if 1000 <= val <= 1450:
                cotas.append(val)
    cotas = sorted(list(set(cotas)))
    print(f"Extracted {len(cotas)} unique bench cotas: {cotas[:15]} ... {cotas[-10:]}")

    # Extract VP (GeoPDF Viewport)
    vp_data = {}
    if '/VP' in page:
        vp_obj = page['/VP'][0].get_object()
        measure = vp_obj.get('/Measure', {}).get_object()
        vp_data = {
            "name": str(vp_obj.get('/Name')),
            "bbox_pts": [float(x) for x in vp_obj.get('/BBox', [])],
            "gpts_latlon": [float(x) for x in measure.get('/GPTS', [])],
            "lpts": [float(x) for x in measure.get('/LPTS', [])],
            "wkt": str(measure.get('/GCS', {}).get('/WKT', ''))
        }

    # Extract Layers (OCGs)
    layers = []
    cat = reader.trailer['/Root']
    if '/OCProperties' in cat:
        oc = cat['/OCProperties'].get_object()
        if '/OCGs' in oc:
            for g in oc['/OCGs']:
                obj = g.get_object()
                name = str(obj.get('/Name'))
                if name and not name.startswith("Correção") and not name.startswith("Agrupar"):
                    layers.append(name)
    layers = list(dict.fromkeys(layers))
    print(f"Extracted {len(layers)} meaningful layers")

    # Litologias catalog with official colors from geological map
    litologias = {
        "HC": {
            "sigla": "HC",
            "nome": "Hematita Compacta",
            "grupo": "Minério de Alto Teor",
            "cor": "#1e293b",
            "corHex": "#1e293b",
            "resistencia": "Muito Alta (>100 MPa)",
            "anguloAtrito": "42°",
            "coesao": "220 kPa",
            "densidade": "4.8 g/cm³",
            "descricao": "Minério maciço com teor de Fe > 65%, alta densidade e resistência mecânica superior."
        },
        "HF": {
            "sigla": "HF",
            "nome": "Hematita Friável",
            "grupo": "Minério Nobre",
            "cor": "#475569",
            "corHex": "#475569",
            "resistencia": "Média (30-50 MPa)",
            "anguloAtrito": "36°",
            "coesao": "85 kPa",
            "densidade": "4.2 g/cm³",
            "descricao": "Hematita laminada com facilidade de desagregação mecânica e excelente teor."
        },
        "HGO": {
            "sigla": "HGO",
            "nome": "Hematita Goethítica",
            "grupo": "Minério Hidratado",
            "cor": "#78350f",
            "corHex": "#78350f",
            "resistencia": "Média-Baixa (20-40 MPa)",
            "anguloAtrito": "32°",
            "coesao": "65 kPa",
            "densidade": "3.8 g/cm³",
            "descricao": "Minério com hidratação secundária de goethita, suscetível a intemperismo na berma."
        },
        "HDO": {
            "sigla": "HDO",
            "nome": "Hematita Dolomítica",
            "grupo": "Minério Carbonático",
            "cor": "#a16207",
            "corHex": "#a16207",
            "resistencia": "Alta (60-80 MPa)",
            "anguloAtrito": "38°",
            "coesao": "120 kPa",
            "densidade": "4.1 g/cm³",
            "descricao": "Hematita associada a matriz dolomítica carbonatada."
        },
        "IC": {
            "sigla": "IC",
            "nome": "Itabirito Compacto",
            "grupo": "Formação Ferrífera Bandada (BIF)",
            "cor": "#0284c7",
            "corHex": "#0284c7",
            "resistencia": "Muito Alta (90-120 MPa)",
            "anguloAtrito": "40°",
            "coesao": "180 kPa",
            "densidade": "3.6 g/cm³",
            "descricao": "BIF silicoso com bandas alternadas de quartzo e hematita/magnetita."
        },
        "IF": {
            "sigla": "IF",
            "nome": "Itabirito Friável",
            "grupo": "Minério Principal da Lavra",
            "cor": "#38bdf8",
            "corHex": "#38bdf8",
            "resistencia": "Baixa-Média (15-35 MPa)",
            "anguloAtrito": "34°",
            "coesao": "45 kPa",
            "densidade": "3.2 g/cm³",
            "descricao": "Litologia predominante nas bancadas da Cava Jangada, com desagregação fácil."
        },
        "IFR": {
            "sigla": "IFR",
            "nome": "Itabirito Friável Rico",
            "grupo": "Minério Nobre Fe > 58%",
            "cor": "#0ea5e9",
            "corHex": "#0ea5e9",
            "resistencia": "Média (25-45 MPa)",
            "anguloAtrito": "35°",
            "coesao": "60 kPa",
            "densidade": "3.5 g/cm³",
            "descricao": "Minério nobre alimentando a usina ITM09 e fundo da Cava Jangada."
        },
        "IFP": {
            "sigla": "IFP",
            "nome": "Itabirito Friável Pobre",
            "grupo": "Minério Marginal Fe 38-48%",
            "cor": "#93c5fd",
            "corHex": "#93c5fd",
            "resistencia": "Baixa (10-25 MPa)",
            "anguloAtrito": "31°",
            "coesao": "35 kPa",
            "densidade": "2.9 g/cm³",
            "descricao": "Itabirito de menor teor, direcionado para estocagem e blend com minério rico."
        },
        "IGO": {
            "sigla": "IGO",
            "nome": "Itabirito Goethítico",
            "grupo": "Formação Ferrífera Alterada",
            "cor": "#d97706",
            "corHex": "#d97706",
            "resistencia": "Baixa (15-30 MPa)",
            "anguloAtrito": "30°",
            "coesao": "40 kPa",
            "densidade": "3.1 g/cm³",
            "descricao": "Itabirito hidratado com presença de goethita e limonita."
        },
        "IGOP": {
            "sigla": "IGOP",
            "nome": "Itabirito Goethítico Pobre",
            "grupo": "Estéril / Minério Marginal",
            "cor": "#f59e0b",
            "corHex": "#f59e0b",
            "resistencia": "Muito Baixa (10-20 MPa)",
            "anguloAtrito": "28°",
            "coesao": "25 kPa",
            "densidade": "2.8 g/cm³",
            "descricao": "Bancadas com maior suscetibilidade a escorregamentos superficiais."
        },
        "IAL": {
            "sigla": "IAL",
            "nome": "Itabirito Alveolar",
            "grupo": "Formação Ferrífera Porosa",
            "cor": "#fbbf24",
            "corHex": "#fbbf24",
            "resistencia": "Média-Baixa (20-35 MPa)",
            "anguloAtrito": "33°",
            "coesao": "50 kPa",
            "densidade": "3.0 g/cm³",
            "descricao": "Estrutura oca com lixiviação de carbonatos/sílica, drenante."
        },
        "IDO": {
            "sigla": "IDO",
            "nome": "Itabirito Dolomítico",
            "grupo": "Formação Ferrífera Carbonatada",
            "cor": "#10b981",
            "corHex": "#10b981",
            "resistencia": "Alta (50-80 MPa)",
            "anguloAtrito": "37°",
            "coesao": "110 kPa",
            "densidade": "3.4 g/cm³",
            "descricao": "Presença de dolomita na matriz mineralógica."
        },
        "IDSI": {
            "sigla": "IDSI",
            "nome": "Itabirito Dolomítico Silicoso",
            "grupo": "Formação Ferrífera Carbonatada",
            "cor": "#059669",
            "corHex": "#059669",
            "resistencia": "Alta (60-90 MPa)",
            "anguloAtrito": "38°",
            "coesao": "130 kPa",
            "densidade": "3.3 g/cm³",
            "descricao": "BIF carbonatado com intercalações silicosas rígidas."
        },
        "CG": {
            "sigla": "CG",
            "nome": "Canga",
            "grupo": "Cobertura Superficial Detrítica",
            "cor": "#b45309",
            "corHex": "#b45309",
            "resistencia": "Média (30-60 MPa)",
            "anguloAtrito": "35°",
            "coesao": "70 kPa",
            "densidade": "3.4 g/cm³",
            "descricao": "Crosta couraçada de topo de morro, protegendo cristas de taludes contra erosão."
        },
        "DO": {
            "sigla": "DO",
            "nome": "Dolomito",
            "grupo": "Rochas Carbonáticas (Grupo Gandarela)",
            "cor": "#14b8a6",
            "corHex": "#14b8a6",
            "resistencia": "Alta (70-110 MPa)",
            "anguloAtrito": "39°",
            "coesao": "160 kPa",
            "densidade": "2.85 g/cm³",
            "descricao": "Maciço dolomítico estéril, pode apresentar dissolução cárstica."
        },
        "FL": {
            "sigla": "FL",
            "nome": "Filito",
            "grupo": "Metassedimentos Argilosos",
            "cor": "#8b5cf6",
            "corHex": "#8b5cf6",
            "resistencia": "Muito Baixa (5-20 MPa)",
            "anguloAtrito": "22°",
            "coesao": "20 kPa",
            "densidade": "2.65 g/cm³",
            "descricao": "Plano de fraqueza geológica preferencial. Risco crítico de escorregamento planar."
        },
        "QT": {
            "sigla": "QT",
            "nome": "Quartzito",
            "grupo": "Metassedimentos Silicosos",
            "cor": "#cbd5e1",
            "corHex": "#cbd5e1",
            "resistencia": "Muito Alta (>120 MPa)",
            "anguloAtrito": "44°",
            "coesao": "250 kPa",
            "densidade": "2.65 g/cm³",
            "descricao": "Maciço rochoso muito competente, compõe escarpamentos naturais."
        },
        "GAD": {
            "sigla": "GAD",
            "nome": "Gabro / Diabásio",
            "grupo": "Rochas Ígneas Básicas (Diques)",
            "cor": "#1e1b4b",
            "corHex": "#1e1b4b",
            "resistencia": "Alta a Muito Alta (80-130 MPa)",
            "anguloAtrito": "41°",
            "coesao": "200 kPa",
            "densidade": "3.0 g/cm³",
            "descricao": "Corpos intrusivos lineares cortando o pacote sedimentar."
        },
        "GN": {
            "sigla": "GN",
            "nome": "Gnaisse",
            "grupo": "Embasamento Cristalino",
            "cor": "#64748b",
            "corHex": "#64748b",
            "resistencia": "Alta (70-100 MPa)",
            "anguloAtrito": "38°",
            "coesao": "150 kPa",
            "densidade": "2.7 g/cm³",
            "descricao": "Rochas metamórficas do embasamento regional."
        },
        "PIE": {
            "sigla": "PIE",
            "nome": "Pilha de Disposição de Estéril",
            "grupo": "Estruturas de Deposição",
            "cor": "#f97316",
            "corHex": "#f97316",
            "resistencia": "Aterro Controlado",
            "anguloAtrito": "35°",
            "coesao": "25 kPa",
            "densidade": "2.2 g/cm³",
            "descricao": "PDE-ES1, PDE-Jacó, PDE-Mangaba e Pilha B2."
        },
        "BARRAGEM": {
            "sigla": "BARRAGEM",
            "nome": "Estrutura de Contenção de Rejeitos",
            "grupo": "Barragens de Mineração",
            "cor": "#ef4444",
            "corHex": "#ef4444",
            "resistencia": "Aterro Compactado com Enrocamento",
            "anguloAtrito": "34°",
            "coesao": "20 kPa",
            "densidade": "2.1 g/cm³",
            "descricao": "Barragens B1 e B4 de contencao e descaracterizacao com monitoramento 24/7."
        },
        "IA": {
            "sigla": "IA",
            "nome": "Itabirito Anfibolitico",
            "grupo": "Formacao Ferrifera com Silicatos",
            "cor": "#eab308",
            "corHex": "#eab308",
            "resistencia": "Media (30-50 MPa)",
            "anguloAtrito": "35°",
            "coesao": "75 kPa",
            "densidade": "3.35 g/cm³",
            "descricao": "Itabirito com presenca de anfibolios ferromagnesianos (cummingtonita e grunerita), suscetivel a intemperismo quimico acelerado."
        },
        "IMN": {
            "sigla": "IMN",
            "nome": "Itabirito Manganesifero",
            "grupo": "Minerio Manganesifero",
            "cor": "#7c3aed",
            "corHex": "#7c3aed",
            "resistencia": "Media-Baixa (20-40 MPa)",
            "anguloAtrito": "32°",
            "coesao": "55 kPa",
            "densidade": "3.4 g/cm³",
            "descricao": "Itabirito enriquecido com lentes e filmes de oxidos de manganes (pirolusita e criptomelana), com lixiviacao diferencial."
        },
        "IN": {
            "sigla": "IN",
            "nome": "Itabirito Nao-Diferenciado",
            "grupo": "Formacao Ferrifera Bandada Mista",
            "cor": "#a855f7",
            "corHex": "#a855f7",
            "resistencia": "Media (25-45 MPa)",
            "anguloAtrito": "33°",
            "coesao": "60 kPa",
            "densidade": "3.2 g/cm³",
            "descricao": "Facies de transicao itabiritica com alternancia de bandas silicosas, hematiticas e goethiticas."
        },
        "LT": {
            "sigla": "LT",
            "nome": "Laterita / Solo Residual",
            "grupo": "Cobertura Pedologica Superficial",
            "cor": "#16a34a",
            "corHex": "#16a34a",
            "resistencia": "Solo Firme a Muito Firme",
            "anguloAtrito": "27°",
            "coesao": "18 kPa",
            "densidade": "1.95 g/cm³",
            "descricao": "Manto de intemperismo superficial enriquecido em oxidos de ferro e aluminio, com drenagem e suscetibilidade erosiva."
        },
        "PI": {
            "sigla": "PI",
            "nome": "Piroclastica / Vulcanoclastica",
            "grupo": "Rochas Vulcanossedimentares",
            "cor": "#92400e",
            "corHex": "#92400e",
            "resistencia": "Media (35-55 MPa)",
            "anguloAtrito": "34°",
            "coesao": "70 kPa",
            "densidade": "2.8 g/cm³",
            "descricao": "Lentes de tufos vulcanossedimentares e brechas piroclasticas interdigitadas na sequencia metassedimentar."
        },
        "RO": {
            "sigla": "RO",
            "nome": "Rocha Encaixante Indiferenciada",
            "grupo": "Macico Regional",
            "cor": "#f97316",
            "corHex": "#f97316",
            "resistencia": "Media a Alta (50-80 MPa)",
            "anguloAtrito": "37°",
            "coesao": "120 kPa",
            "densidade": "2.75 g/cm³",
            "descricao": "Rochas encaixantes do complexo estrutural da cava sem diferenciacao de detalhe cartografico."
        },
        "PE": {
            "sigla": "PE",
            "nome": "Pe de Talude / Deposito Coluvionar",
            "grupo": "Depositos Gravitacionais de Encosta",
            "cor": "#fbcfe8",
            "corHex": "#fbcfe8",
            "resistencia": "Material Desagregado / Solto",
            "anguloAtrito": "26°",
            "coesao": "8 kPa",
            "densidade": "1.85 g/cm³",
            "descricao": "Material acumulado na base das bancadas e bermas, composto por blocos e matriz terrosa carreada."
        }
    }

    geology_dataset = {
        "metadata": {
            "titulo": "Mapa Geológico - Minas Engenho Seco e Jangada",
            "versao": "CAVA_0826_OFICIAL",
            "dataReferencia": "Agosto - 2026",
            "dataCriacaoEsri": "2026-08-31T08:10:18",
            "softwareOrigem": "Esri ArcGISPro 3.6.3",
            "diretoria": "Diretoria de Serviços Técnicos e Desenvolvimento do Negócio",
            "empresa": "Itaminas Comércio de Minérios S.A.",
            "topografiaBase": "tpes_260731 (31/07/2026)",
            "ortofotoBase": "Mina_ES_Agosto2026.tif (Agosto/2026)",
            "sistemaReferenciaOriginal": {
                "projcs": "SAD_1969_96_UTM_Zone_23S",
                "datum": "SAD 1969 (South American Datum 1969/96)",
                "spheroid": "GRS 1967 Truncated",
                "epsg": 29193
            },
            "sistemaReferenciaOficialMDSync": {
                "projcs": "SIRGAS_2000_UTM_Zone_23S",
                "datum": "SIRGAS 2000 (GRS80)",
                "epsg": 31983,
                "conversaoParametros": {
                    "deltaX_metros": -67.35,
                    "deltaY_metros": 4.61,
                    "nota": "Conversão canônica IBGE/DNC para compatibilidade total com SIRGAS 2000."
                }
            },
            "extensaoGeografica": {
                "latitudeMin": -20.10649,
                "latitudeMax": -20.08289,
                "longitudeMin": -44.12624,
                "longitudeMax": -44.08152,
                "utmSirgas23S": {
                    "eastingMin": 591312.0,
                    "eastingMax": 595980.0,
                    "northingMin": 7776485.0,
                    "northingMax": 7779112.0
                }
            },
            "cavaJangadaCentroide": {
                "nome": "Cava Jangada (Mina Principal)",
                "easting": 595693.52,
                "northing": 7777616.71,
                "cotaCrista": 1250.0,
                "cotaBermaInterditada": 1231.44,
                "cotaFundo": 1030.0,
                "alvoCriticoRadar": "AOI_01 (+20.00 mm)"
            },
            "estatisticasAltimetricas": {
                "totalBancadas": len(cotas),
                "cotaMinima": min(cotas) if cotas else 1016,
                "cotaMaxima": max(cotas) if cotas else 1362,
                "alturaTotalCavaMetros": (max(cotas) - min(cotas)) if cotas else 346,
                "todasCotasBancadas": cotas
            },
            "pranchaLayoutOficial": {
                "imagemConsolidada": "assets/geologia/mapa-geologico-layout-oficial.jpg",
                "mapaRecortado": "assets/geologia/cava-mapa-geologico-cropped.jpg",
                "textura3D": "assets/geologia/cava-geologia-texture-2048.jpg",
                "dimensoesPixels": [1024, 658],
                "areaMapeamentoPixels": [971, 533],
                "escalaGrafica": "0 a 0.8 km (800m)",
                "limiteMinaTrimestral": "0_01_DESING_PLANO TRIMESTRAL_SUP_TRI_MOVEL_2026_LIMITES (Poligono Verde)",
                "malhaAmostragem": "samples_distance_10m_mai26 (Furos de Amostragem a cada 10m)",
                "totalLitologiasMapeadas": len(litologias)
            }
        },
        "litologias": litologias,
        "camadasDisponiveis": layers,
        "viewportEsri": vp_data
    }

    # Save to JSON
    json_path = Path("data/geologia-cava-jangada.json")
    json_path.write_text(json.dumps(geology_dataset, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved: {json_path}")

    # Save to JS global object
    js_content = f"/**\n * Base de Dados Geológica Oficial - Cava Jangada e Complexo Itaminas\n * Extraído do Layout_MapaGeológico_0826.pdf (ArcGIS Pro 3.6.3 - Agosto/2026)\n */\nwindow.MDSYNC_GEOLOGIA_CAVA = {json.dumps(geology_dataset, indent=2, ensure_ascii=False)};\n"
    js_path = Path("data/geologia-cava-jangada.js")
    js_path.write_text(js_content, encoding="utf-8")
    print(f"Saved: {js_path}")

if __name__ == '__main__':
    extract_geology_data()
