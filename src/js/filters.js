let currentFilters = {
  q: '',
  types: [],
  locations: [],
  costMin: null,
  costMax: null,
  extent: false,
};

let onChange;

export function initFilters(cb){
  onChange = cb;
}

export function bindFilterEvents(cb){
  const d = document;
  const q = d.getElementById('search-input');
  const typeSel = d.getElementById('type-select');
  const locSel = d.getElementById('location-select');
  const costMin = d.getElementById('cost-min');
  const costMax = d.getElementById('cost-max');
  const extent = d.getElementById('extent-checkbox');

  const apply = debounce(() => {
    currentFilters.q = (q.value || '').trim().toLowerCase();
    currentFilters.types = Array.from(typeSel.selectedOptions).map(o => o.value);
    currentFilters.locations = Array.from(locSel.selectedOptions).map(o => o.value);
    currentFilters.costMin = costMin.value ? Number(costMin.value) : null;
    currentFilters.costMax = costMax.value ? Number(costMax.value) : null;
    currentFilters.extent = extent.checked;
    cb();
  }, 200);

  q.addEventListener('input', apply);
  [typeSel, locSel].forEach(el => el.addEventListener('change', apply));
  [costMin, costMax].forEach(el => el.addEventListener('input', apply));
  extent.addEventListener('change', apply);
}

export function getActiveFilters(){
  return { ...currentFilters };
}

export function resetFilters(){
  currentFilters = { q:'', types:[], locations:[], costMin:null, costMax:null, extent:false };
  document.getElementById('search-input').value = '';
  document.getElementById('type-select').selectedIndex = -1;
  document.getElementById('location-select').selectedIndex = -1;
  document.getElementById('cost-min').value = '';
  document.getElementById('cost-max').value = '';
  document.getElementById('extent-checkbox').checked = false;
}

export function rebuildFilterOptions(features){
  const typeSel = document.getElementById('type-select');
  const locSel = document.getElementById('location-select');
  const types = new Set();
  const locs = new Set();
  features.forEach(f => {
    if (f.properties.type) types.add(f.properties.type);
    if (f.properties.location) locs.add(f.properties.location);
  });
  const fill = (sel, arr) => {
    const prev = Array.from(sel.selectedOptions).map(o => o.value);
    sel.innerHTML='';
    arr.sort((a,b)=>a.localeCompare(b)).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      if (prev.includes(v)) opt.selected = true;
      sel.appendChild(opt);
    });
  };
  fill(typeSel, Array.from(types));
  fill(locSel, Array.from(locs));
}

function debounce(fn, ms){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}
