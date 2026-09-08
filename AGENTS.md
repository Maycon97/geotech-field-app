# Agent Instructions & Project Context: MDSync & HUB Stitch (Dual Projects)

## Context
The repository hosts two distinct, synchronized geotechnical engineering solutions for mining operations (Dams and Waste Dumps):
1. **MDSync (Root PWA)**: Mission-critical tactical field application for offline data collection, piezometer readings, inspection checklists, and geospatial telemetry.
2. **HUB Stitch (`stitch/`)**: Executive governance and redesign platform featuring rich visual screens, regulatory compliance dashboards (ANM 95/2022, GISTM 2020), and 3D terrain exploration.

Both systems share a canonical database foundation (`data/catalog.json`, `data/structures/*.json`, IndexedDB `MDSyncDB`) and a real-time bilateral communication bus (`src/core/sync-bridge.js`).

## Key Directories
- `src/core/`: Database engine (IndexedDB), state manager, sync bridge bus, and geospatial utilities.
- `stitch/`: HUB Stitch platform (screens `stitch/screens/*.html`, runtime `stitch/stitch-runtime.js`, dashboard `stitch/index.html`).
- `data/`: Light metadata catalog (`catalog.json`) and partitioned structure databases (`data/structures/*.json`).
- `tools/`: Data ingestion, ETL, partitioning, runtime injection, and integrity validation scripts (Python 3.12).
- `vendor/`: Bundled offline dependencies (Chart.js, JSZip, Leaflet, FontAwesome).

## Critical Guidelines
1. **Bilateral Symmetry & Parity Rule**: Any new feature, automation, calculation formula (Bo & Barrett 2023), modal, or workflow implemented in MDSync must be mirrored in HUB Stitch, and vice-versa. State changes must propagate via `SyncBridge`.
2. **Never mutate legacy historical data without running `tools/validate_integrity.py`**.
3. **Always ensure full offline capabilities** using Service Worker, IndexedDB, and bundled vendor libraries.
4. **Respect SIRGAS 2000 / UTM 23S geospatial standards** for any coordinate mapping or visual inspection points.
