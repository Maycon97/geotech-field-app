# Agent Instructions & Project Context - MDSync

## Context
MDSync is a mission-critical Geotechnical Data Collection & Management PWA for mining operations (Dams and Waste Dumps).
It processes instrument data (piezometers, flow rates, water levels), field inspection checklists, and geospatial telemetry.

## Key Directories
- `src/core/`: Database engine (IndexedDB), state manager, and geospatial utilities.
- `data/`: Light metadata catalog (`catalog.json`) and partitioned structure databases (`data/structures/*.json`).
- `tools/`: Data ingestion, ETL, partitioning, and validation scripts (Python 3.12).
- `vendor/`: Bundled offline dependencies (Chart.js, JSZip, FontAwesome).

## Critical Guidelines
1. **Never mutate legacy historical data without running `tools/validate_integrity.py`**.
2. **Always ensure full offline capabilities** using Service Worker and IndexedDB.
3. **Respect SIRGAS 2000 / UTM 23S geospatial standards** for any coordinate mapping or visual inspection points.
