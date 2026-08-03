# West Bengal Budget Explorer 2026-27

An evidence-led, static civic data dashboard for exploring West Bengal's 2026-27 budget. It separates official budget rows from policy announcements, exposes missing and unmatched data states, and links reviewed figures back to their source publication.

## What changed

- 58 canonical departments from BP-3, with the former department-unit display error corrected.
- Revenue receipts, capital receipts, borrowing, and total receipts shown separately.
- 5,383 extracted BP-3 budget-head rows with codes, source pages, and four financial periods.
- The original 550-entry initiative catalogue retained with exact, deterministic-alias, grouped, reviewed-aggregate, candidate, and unmatched reconciliation states.
- All 5,383 official rows remain independently searchable even when they also contribute to a reconciled initiative.
- Paginated, shareable scheme search with department, theme, record-type, reconciliation, amount-status, and sorting controls.
- Doughnut composition charts for compact part-to-whole totals, optional ranked bars, and accessible tables for both views.
- Accessible tables for every analytical view, keyboard-operable controls, responsive layouts, dark mode, view-scoped CSV downloads, and an automatically initialized map of reviewed cited locations.
- Generated metadata, department, initiative/alias, official-line, and cited-map contracts validated before every production build.
- One managed production-preview smoke test verifies its exact server process exits and its temporary port is released before deployment.

## Data workflow

The official source registry is in `data/source-registry.json`. BP-3 is parsed with:

```powershell
python scripts/extract_bp3.py tmp/pdfs/2026_bp3.pdf data/extracted/bp3-budget-lines.json
```

The parser preserves integer thousand-rupee values. `scripts/build_dashboard_data.mjs` then publishes every official row and links legacy initiatives to one or more rows. Exact title groups and presentation-only aliases may reconcile deterministically. Similar titles remain candidates without official amounts; reviewed cross-title aggregates belong in `data/reconciliation-overrides.json` with explicit budget codes, notes, sources, and overlap safety.

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

The primary baseline is the Finance Department's June 2026 BP-3 Departmental Expenditure publication. Budget estimates are allocations, not actual spending or releases. Announcement amounts remain separately labelled; reconciled aggregates publish their complete derivation and must not be summed when their underlying budget codes overlap.
