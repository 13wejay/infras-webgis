export async function parseFile(file){
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type:'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  return rows;
}

const COL_ALIASES = {
  lat: ['lat','latitude','y','y_coord','ycoord','lat_deg'],
  lon: ['lon','lng','long','longitude','x','x_coord','xcoord','lon_deg'],
  name: ['name','project','title','facility','asset'],
  type: ['type','category','class','project_type'],
  location: ['location','district','county','city','region','state','province'],
  cost: ['cost','amount','budget','value','capex','estimate'],
  status: ['status','phase','stage','state','progress'],
  startDate: ['start_date','startdate','start','begin','commenced','project_start'],
  endDate: ['end_date','enddate','end','finish','completed','project_end'],
  contractor: ['contractor','vendor','company','firm','builder','developer'],
  description: ['description','desc','summary','scope','details','notes']
};

export function autoMapColumns(rows){
  const cols = Object.keys(rows[0] || {});
  const map = {lat:null, lon:null, name:null, type:null, location:null, cost:null, status:null, startDate:null, endDate:null, contractor:null, description:null};
  const norm = s => String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
  const find = keys => cols.find(c => keys.includes(norm(c)));

  const aliasMap = Object.fromEntries(Object.entries(COL_ALIASES).map(([k, arr])=>[
    k, arr.map(a=>a.replace(/[^a-z0-9]+/g,'').toLowerCase())
  ]));

  for (const k of Object.keys(map)){
    const targetKeys = aliasMap[k];
    const c = find(targetKeys);
    if (c) map[k] = c;
  }
  return map;
}

export function mappedRowToFeature(r, map){
  const lat = coerceNum(r[map.lat]);
  const lon = coerceNum(r[map.lon]);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  const name = val(r, map.name);
  const type = val(r, map.type);
  const location = val(r, map.location);
  const cost = coerceNum(r[map.cost]);
  const status = val(r, map.status);
  const startDate = parseDate(r[map.startDate]);
  const endDate = parseDate(r[map.endDate]);
  const contractor = val(r, map.contractor);
  const description = val(r, map.description);
  
  return {
    type: 'Feature',
    geometry: { type:'Point', coordinates:[lon, lat] },
    properties: { 
      name, type, location, cost, status, startDate, endDate, contractor, description,
      documents: [] // Initialize empty documents array
    }
  };
}

function val(r, c){ return c ? r[c] : null; }
function coerceNum(v){
  if (v==null || v==='') return null;
  const n = typeof v === 'string' ? Number(v.replace(/[$,\s]/g,'')) : Number(v);
  return isFinite(n) ? n : null;
}
function parseDate(v) { 
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

export function exportCSV(features){
  const rows = features.map(f => ({
    name:f.properties.name,
    type:f.properties.type,
    location:f.properties.location,
    cost:f.properties.cost,
    status:f.properties.status,
    startDate:f.properties.startDate,
    endDate:f.properties.endDate,
    contractor:f.properties.contractor,
    description:f.properties.description,
    lat:f.geometry.coordinates[1],
    lon:f.geometry.coordinates[0],
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'data');
  XLSX.writeFile(wb, 'infrastructure_filtered.csv');
}

export function exportGeoJSON(features){
  const fc = { type:'FeatureCollection', features };
  const blob = new Blob([JSON.stringify(fc)], {type:'application/geo+json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'infrastructure_filtered.geojson';
  a.click();
  URL.revokeObjectURL(a.href);
}
