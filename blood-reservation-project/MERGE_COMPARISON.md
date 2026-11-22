# Sandugo ZIP merge record

Source: `Sandugo-Current-Progress.zip` (`blood-reservation-project/`).

## Reconciliation

- All 209 files from the ZIP are present in the active project.
- 173 files match byte for byte; 36 shared paths contain workspace-specific edits.
- The active project also has eight files absent from the ZIP: the legacy root map, appointment attendance, hospital request history, request stock accounting, inventory label printing, two related stylesheets, and donor field options.
- The ZIP's `.gitignore` rules were merged with the local `backend/.env` credential rule.

The shared-file differences were retained where the active project carries integrated behavior: landing-page authentication remains embedded, while admin routing and locator capabilities (facility types, hours, saved preferences, and admin controls) remain available. Inventory keeps the stock breakdown and selected-bag release flow alongside request history and label printing. Backend stock accounting and hospital release history coexist with facility handling, audit records, role checks, and appointment attendance.

## Run and verification

- `npm run build` completed successfully. Vite emitted a chunk-size advisory for the map and main JavaScript bundles.
- Frontend is running at `http://127.0.0.1:5174/` and returned HTTP 200.
- Backend is running at `http://localhost:3000`; MongoDB connected and `GET /api/facilities` returned HTTP 200.
- Automated test suites were not run.
