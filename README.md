# West Bengal Budget Explorer 2026-27

An evidence-led, static civic data dashboard for exploring West Bengal's 2026-27 budget. It separates official budget rows from policy announcements, exposes missing and unmatched data states, and links reviewed figures back to their source publication.

## What changed

- 58 canonical departments from BP-3, with the former department-unit display error corrected.
- Revenue receipts, capital receipts, borrowing, and total receipts shown separately.
- 5,383 extracted BP-3 budget-head rows with codes, source pages, and four financial periods.
- The original 550-entry initiative catalogue retained and reconciled only when a unique exact-title match is available.
- Paginated, shareable scheme search with department, theme, record-type, amount-status, and sorting controls.
- Accessible tables for every analytical view, keyboard-operable controls, responsive layouts, dark mode, CSV downloads, and a lazy-loaded map with an explicit coverage warning.
- Generated metadata, department, scheme, and map contracts validated before every production build.

## Data workflow

The official source registry is in `data/source-registry.json`. BP-3 is parsed with:

```powershell
python scripts/extract_bp3.py tmp/pdfs/2026_bp3.pdf data/extracted/bp3-budget-lines.json
```

The parser preserves integer thousand-rupee values. `scripts/build_dashboard_data.mjs` then combines the reviewed official rows with the legacy catalogue and writes the public JSON artifacts. Ambiguous or fuzzy title matches are not accepted automatically; reviewed exceptions belong in `data/reconciliation-overrides.json`.

The generated `data/DATA_QUALITY.md` report records coverage and reconciliation status.

## Local development

```powershell
cd budget-frontend
npm install
npm run dev
```

Validation and production build:

```powershell
npm test
npm run build
```

The GitHub Actions workflow runs data checks, accessibility contract checks, and the Vite production build before deploying to GitHub Pages.

## Sources and interpretation

The primary baseline is the Finance Department's June 2026 BP-3 Departmental Expenditure publication. Budget estimates are allocations, not actual spending or releases. Announcement amounts remain separately labelled until linked to an exact official budget row.
