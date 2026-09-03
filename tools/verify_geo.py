import json

with open("data/google-earth-geospatial.js", "r", encoding="utf-8") as f:
    content = f.read()
    json_part = content.split("=", 1)[1].strip().rstrip(";")
    data = json.loads(json_part)
    print("google-earth-geospatial.js valido!")
    print(f"Total de estruturas: {len(data['structures'])}")
    print(f"Total de instrumentos: {len(data['instruments'])}")
