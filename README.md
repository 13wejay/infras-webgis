# Infrastructure WebGIS

A lightweight WebGIS for infrastructure asset management. Load an Excel/CSV file directly in the browser, map columns, filter by type/location/cost, and visualize projects on an interactive map with clustering and a synchronized data table.

## Features
- Excel/CSV import (SheetJS)
- Auto column mapping + manual override (name, type, location, cost, lat, lon)
- Leaflet map with marker clustering (OpenStreetMap tiles)
- Advanced filters: text search, multi-select type/location, cost range, map extent
- Real-time updates: map markers and table react instantly
- Export filtered results as CSV or GeoJSON
- Responsive UI

## File formats
Expected columns (auto-detected, customizable):
- latitude: lat | latitude | y | y_coord | ycoord | lat_deg
- longitude: lon | lng | long | longitude | x | x_coord | xcoord | lon_deg
- name: name | project | title | facility | asset
- type: type | category | class | project_type
- location: location | district | county | city | region | state | province
- cost: cost | amount | budget | value | capex | estimate

## 🌐 Deploy Online (Share with Others)

**Quick Deploy (FREE):**
GitHub, Netlify, Vercel, or any static file host

## How to run locally (Windows PowerShell)
This is a static site—open `index.html` directly or serve with a simple server.

- Quick open (works in most browsers):
  - Double click `index.html` or drag it into your browser. If markers don't show due to file:// CORS, use a local server below.

- Serve with Python (if available):
```powershell
# Python 3
python -m http.server 5173
# Then browse to http://localhost:5173
```

- Or serve with Node (if available):
```powershell
npx serve . -l 5173
# Then browse to http://localhost:5173
```

## Using the app
1. Click "Load sample data" to try it immediately.
2. Or click the file picker and choose your `.xlsx`, `.xls`, or `.csv` file.
3. Review the auto-detected column mapping on the left; adjust as needed, then Apply.
4. Use filters (search, type, location, cost, extent) to refine results.
5. Click table "Zoom" to focus the map on a project.
6. Export the filtered results via CSV or GeoJSON.

## Customize and extend
- Styling: edit `src/styles.css`.
- Business fields: extend `src/js/utils.js` mapping and `src/js/ui.js` table.
- Basemap: change the tile URL in `src/js/map.js`.
- Persist filters: store `currentFilters` in localStorage.

## Notes
- All data stays in your browser. No backend needed; suitable for up to ~50k points depending on device.
- For larger datasets or multi-user editing, add a backend (PostGIS + API) and replace the file importer with server queries.

