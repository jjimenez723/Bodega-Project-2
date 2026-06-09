# Recommended Fixes

Date reviewed: 2026-06-09

This project is a working Vite-based static site with a strong MVP foundation: homepage, story, gallery, Leaflet food-access map, and Handsontable KPI builder. The main work ahead is consolidation, maintainability, data confidence, and user polish.

## Highest Priority

1. Fix KPI builder column naming.
   - `src/modules/site/kpiBuilder.js` mixes dotted and non-dotted distributor fields, such as `Dist. Sale $/lb` and `Dist Sale $/lb`.
   - Standardize column names after CSV normalization and update `roleCols`, `kpiDefs`, formulas, debug output, and documentation to match.

2. Fix KPI totals refresh after edits.
   - `afterChange` currently looks for `input[name="role"]:checked`, but the role UI uses `.role-toggle` buttons.
   - Use `.role-toggle.active` so totals update when a user edits table values.

3. Fix map print center.
   - `src/modules/map/mapPage.js` uses `[40.7357, -73.413]` for print centering.
   - Newark longitude should be closer to `-74.17`.

4. Optimize images.
   - `images/` is very large, and production output includes several multi-megabyte images.
   - Convert large JPGs to WebP/AVIF, generate responsive sizes, and consistently reference optimized assets.

5. Clean up duplicate project folders and generated output.
   - There are active source files in `src/`, but also older/duplicate folders such as `Map/`, `bodega-map/`, root CSV/GeoJSON files, and tracked `dist/`.
   - Decide what is source of truth, archive legacy files, and avoid committing generated build artifacts unless deployment requires it.

## Data Structure

- Keep canonical data in `public/data/`.
- Add metadata to map features:
  - `address`
  - `source`
  - `last_verified`
  - `confidence`
  - `category`
  - `coordinate_source`
- Add a small data validation script for GeoJSON shape, numeric coordinates, required fields, and duplicate names.
- Remove or quarantine invalid legacy data. One older `bodega-map` GeoJSON contains `NaN`, which is invalid JSON.

## Presentation

- Expand `README.md` with:
  - project purpose
  - setup commands
  - page map
  - data pipeline
  - deploy instructions
  - ownership notes
- Update `package.json` metadata: description, license, author, and remove unused dependencies if confirmed unused.
- Add clearer calls to action from the homepage:
  - Explore the map
  - Open KPI builder
  - Read the story
- Make citations and assumptions easier to audit, especially in the KPI builder.

## UX

- Add loading and error states for map data and KPI CSV loading.
- Add result counts after filtering the map.
- Add a reset filter button.
- Preserve map state in share links: active layers, heatmap/cluster mode, center, zoom, radius, and filter.
- Add a default selected KPI role so the first table state feels intentional.
- Replace browser `alert()`/`prompt()` flows with inline status messages or toasts.
- Add clearer empty states when filters return no points.

## UI

- Split `style.css` into focused files:
  - base
  - navigation
  - home
  - map
  - KPI builder
  - gallery
  - footer
- Move inline styles from HTML into CSS classes, especially in `Map/index.html` and `kpi-builder/index.html`.
- Reduce repeated CSS overrides and repeated `:root` declarations.
- Restore consistent `:focus-visible` styles instead of globally removing outlines.
- Keep controls visually consistent across the map and KPI builder.
- Check mobile layouts for text overflow, panel sizing, and touch target spacing.

## Engineering

- Add smoke tests:
  - `npm run build`
  - GeoJSON files parse and contain valid coordinates
  - KPI formulas produce expected values for a sample row
  - Map and KPI pages include required DOM hooks
- Add `npm audit` review to maintenance work.
  - Current production audit showed moderate dependency issues through `firebase-admin`.
  - Confirm whether `firebase-admin`, `axios`, `dotenv`, and `user` are still needed by the deployed site.
- Consider moving backend/scanner work into a separate documented data tooling folder.
- Add `.env.example` if backend tooling remains in the repo.

## Suggested Order

1. Fix KPI bugs and map print coordinate.
2. Document setup and data source of truth.
3. Remove/archive duplicate files and legacy folders.
4. Optimize images and verify page performance.
5. Split CSS and remove inline styles.
6. Add validation/smoke tests.
