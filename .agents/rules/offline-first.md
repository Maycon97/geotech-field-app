---
name: offline-first
description: Offline-first architectural principles and caching rules for MDSync.
---

# Offline-First Rules
- The application must start and display all operational dashboards without an active internet connection.
- All new readings and checklists submitted offline must be committed to IndexedDB immediately.
- Sync badges must dynamically reflect the number of pending unsynced records.
