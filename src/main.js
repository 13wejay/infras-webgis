import { initMap, updateMarkers, fitToMarkers, getMapBounds } from './js/map.js';
import { initFilters, getActiveFilters, bindFilterEvents, resetFilters, rebuildFilterOptions } from './js/filters.js';
import { parseFile, autoMapColumns, mappedRowToFeature, exportCSV, exportGeoJSON } from './js/utils.js';
import { renderTable, initTableSorting } from './js/ui.js';
import { initCharts, updateCharts } from './js/charts.js';
import { initLayers, updateProjectsCount } from './js/layers.js';
import { initMeasurements } from './js/measurements.js';


let rawRows = [];
let schema = null; // {lat, lon, name, type, location, cost}
let features = [];
let filtered = [];

// URL parameter handling for data sharing
const urlParams = new URLSearchParams(window.location.search);
const dataParam = urlParams.get('data');

function applyFilteringAndRender() {
  const f = getActiveFilters();
  const bounds = f.extent ? getMapBounds() : null;
  
  // First apply standard filters
  let filtered = features.filter(ft => {
    // extent filter
    if (bounds) {
      const [lng, lat] = ft.geometry.coordinates;
      if (!bounds.contains([lat, lng])) return false;
    }
    const p = ft.properties;

    // text search on name/location
    if (f.q) {
      const hay = `${p.name||''} ${p.location||''}`.toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    // type
    if (f.types.length && !f.types.includes(p.type)) return false;
    // location
    if (f.locations.length && !f.locations.includes(p.location)) return false;
    // cost
    if (f.costMin != null && p.cost != null && p.cost < f.costMin) return false;
    if (f.costMax != null && p.cost != null && p.cost > f.costMax) return false;
    return true;
  });
  


  updateMarkers(filtered);
  renderTable(filtered);
  updateCharts(filtered);
  
  const countEl = document.getElementById('result-count');
  if (filtered.length === features.length) {
    countEl.textContent = `${features.length} projects loaded`;
  } else {
    countEl.textContent = `${filtered.length} of ${features.length} shown`;
  }
}

async function onFileSelected(file) {
  const rows = await parseFile(file);
  rawRows = rows;
  schema = autoMapColumns(rows);
  // show mapping UI
  const mappingAuto = document.getElementById('mapping-auto');
  const mappingSection = document.getElementById('mapping-section');
  const fieldsDiv = document.getElementById('mapping-fields');
  mappingAuto.classList.add('hidden');
  mappingSection.classList.remove('hidden');
  fieldsDiv.innerHTML = '';

  const columns = Object.keys(rows[0] || {});
  const keys = ['name','type','location','cost','status','startDate','endDate','contractor','description','lat','lon'];
  const labels = {
    name:'Project Name', type:'Project Type', location:'Location', cost:'Cost', 
    status:'Status', startDate:'Start Date', endDate:'End Date', contractor:'Contractor', 
    description:'Description', lat:'Latitude', lon:'Longitude'
  };
  keys.forEach(k => {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labels[k];
    const select = document.createElement('select');
    const optNone = document.createElement('option');
    optNone.value = ''; optNone.textContent = '—';
    select.appendChild(optNone);
    columns.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      if (schema[k] === c) opt.selected = true;
      select.appendChild(opt);
    });
    select.dataset.key = k;
    wrap.appendChild(label);
    wrap.appendChild(select);
    fieldsDiv.appendChild(wrap);
  });

  document.getElementById('apply-mapping-btn').onclick = () => {
    const selects = fieldsDiv.querySelectorAll('select');
    schema = {...schema};
    selects.forEach(sel => { schema[sel.dataset.key] = sel.value || null; });
    ingestRows(rawRows, schema);
  };

  ingestRows(rows, schema);
}

function ingestRows(rows, schema) {
  // build features
  features = rows.map(r => mappedRowToFeature(r, schema)).filter(Boolean);
  rebuildFilterOptions(features);

  updateMarkers(features);
  fitToMarkers();
  renderTable(features);
  updateCharts(features);
  updateProjectsCount(features.length);
  document.getElementById('result-count').textContent = `${features.length} projects loaded`;
}

function preparePrintView() {
  // Expand all project details for printing
  const detailsElements = document.querySelectorAll('.project-details.hidden');
  detailsElements.forEach(details => {
    details.classList.remove('hidden');
    details.dataset.wasHidden = 'true'; // Mark for restoration
  });
  
  // Ensure table is not collapsed
  const tablePanel = document.querySelector('.table-panel');
  if (tablePanel && tablePanel.classList.contains('collapsed')) {
    tablePanel.classList.remove('collapsed');
    tablePanel.dataset.wasCollapsed = 'true';
  }
  
  console.log('Print view prepared - expanded details for', detailsElements.length, 'projects');
}

function restorePrintView() {
  // Restore original collapsed state
  const detailsElements = document.querySelectorAll('.project-details[data-was-hidden="true"]');
  detailsElements.forEach(details => {
    details.classList.add('hidden');
    details.removeAttribute('data-was-hidden');
  });
  
  // Restore table panel state
  const tablePanel = document.querySelector('.table-panel[data-was-collapsed="true"]');
  if (tablePanel) {
    tablePanel.classList.add('collapsed');
    tablePanel.removeAttribute('data-was-collapsed');
  }
  
  console.log('Print view restored');
}

function loadSample() {
  // Enhanced sample CSV with new project management fields
  const csv = `name,type,location,cost,status,startDate,endDate,contractor,description,lat,lon
Bridge Replacement A,Bridge,Lake County,2000000,In Progress,2024-03-15,2024-12-30,ABC Construction,Complete replacement of aging bridge over Miller Creek with new steel structure,41.6005,-93.6091
Highway Extension B,Road,King County,3500000,Planning,2024-06-01,2025-08-15,Metro Infrastructure,New 2.5 mile highway extension to connect downtown district with residential areas,47.6062,-122.3321
Regional Medical Center,Health,King County,15000000,Completed,2023-01-10,2024-02-28,HealthBuild Corp,State-of-the-art 150-bed medical facility with emergency and specialty care departments,47.2529,-122.4443
Elementary School Renovation,Education,Orange County,800000,On Hold,2024-05-01,2024-11-30,EduBuild LLC,Comprehensive renovation of 50-year-old elementary school including HVAC and technology upgrades,33.7175,-117.8311
Water Treatment Facility,Water,Lake County,5600000,In Progress,2024-02-01,2025-01-15,AquaTech Solutions,Advanced water treatment plant serving 25000 residents with modern filtration systems,41.0912,-81.5190`;
  const rows = XLSX.utils.sheet_to_json(XLSX.read(csv, {type:'string'}).Sheets.Sheet1);
  onFileSelected(new File([csv], 'sample.csv', {type:'text/csv'}));
}

// URL data loading functionality
async function loadDataFromUrl(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const contentType = response.headers.get('content-type') || '';
    let data;
    
    if (contentType.includes('application/json')) {
      data = await response.json();
      // Assume it's GeoJSON format
      if (data.type === 'FeatureCollection') {
        features = data.features.map(f => ({
          ...f,
          properties: {
            name: f.properties.name || 'Unnamed Project',
            type: f.properties.type || 'Unknown',
            location: f.properties.location || 'Unknown Location',
            cost: f.properties.cost || null,
            ...f.properties
          }
        }));
        rebuildFilterOptions(features);
        updateMarkers(features);
        fitToMarkers();
        renderTable(features);
        updateCharts(features);
        updateProjectsCount(features.length);
        document.getElementById('result-count').textContent = `${features.length} projects loaded from URL`;
        return;
      }
    }
    
    // Assume CSV format
    const csvText = await response.text();
    const rows = XLSX.utils.sheet_to_json(XLSX.read(csvText, {type:'string'}).Sheets.Sheet1);
    await onFileSelected(new File([csvText], 'remote.csv', {type:'text/csv'}));
    
  } catch (error) {
    console.error('Error loading data from URL:', error);
    alert(`Failed to load data from URL: ${error.message}`);
  }
}

// Share current data functionality
function shareCurrentData() {
  if (!features.length) {
    alert('No data to share. Please load some data first.');
    return;
  }

  const currentData = filtered.length ? filtered : features;
  const geojson = {
    type: 'FeatureCollection',
    features: currentData
  };
  
  // Create a data URL
  const dataStr = JSON.stringify(geojson);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const dataUrl = URL.createObjectURL(dataBlob);
  
  // Create shareable URL (this would be your actual domain)
  const baseUrl = window.location.href.split('?')[0];
  const shareUrl = `${baseUrl}?data=sample`; // In production, you'd upload to a service
  
  // Show modal with sharing options
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Share Your Data</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Option 1: Share Sample Data Link</strong></p>
        <input type="text" value="${shareUrl}" readonly style="width: 100%; margin-bottom: 15px;">
        
        <p><strong>Option 2: Download and Host Data File</strong></p>
        <p>1. Download the GeoJSON file using the button below</p>
        <p>2. Upload it to a public URL (Google Drive, Dropbox, etc.)</p>
        <p>3. Share: ${baseUrl}?data=YOUR_PUBLIC_URL</p>
        
        <button id="download-share-data" class="btn">📥 Download GeoJSON</button>
        
        <p style="margin-top: 15px; font-size: 12px; color: #666;">
          <strong>Note:</strong> For live data sharing, consider using Google Sheets with public CSV export URL.
        </p>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Modal event handlers
  modal.querySelector('.modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
    URL.revokeObjectURL(dataUrl);
  });
  
  modal.querySelector('#download-share-data').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'shared_infrastructure_data.geojson';
    a.click();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      URL.revokeObjectURL(dataUrl);
    }
  });
}

// Google Sheets integration
function showGoogleSheetsDialog() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Connect to Google Sheets</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Step 1: Prepare your Google Sheet</strong></p>
        <ol>
          <li>Create or open a Google Sheet with your infrastructure data</li>
          <li>Include columns: name, type, location, cost, lat, lon (minimum required)</li>
          <li>Go to File → Share → Share with others</li>
          <li>Change permissions to "Anyone with the link can view"</li>
          <li>Copy the sharing URL</li>
        </ol>
        
        <p><strong>Step 2: Convert to CSV URL</strong></p>
        <p>Replace the end of your Google Sheets URL:</p>
        <p style="font-family: monospace; font-size: 12px; background: var(--bg-secondary); padding: 8px; border-radius: 4px;">
          From: .../edit#gid=0<br>
          To: .../export?format=csv&gid=0
        </p>
        
        <p><strong>Step 3: Enter CSV URL</strong></p>
        <input type="text" id="sheets-url" placeholder="Paste your Google Sheets CSV export URL here..." style="width: 100%; margin-bottom: 15px;">
        
        <div style="display: flex; gap: 10px;">
          <button id="load-sheets-data" class="btn">📊 Load Data</button>
          <button id="test-sample-sheets" class="btn btn-secondary">🧪 Test Sample</button>
        </div>
        
        <div style="margin-top: 15px; padding: 12px; background: var(--accent-light); border-radius: 6px; font-size: 14px;">
          <strong>💡 Pro Tip:</strong> Once connected, your app will always use the latest data from your Google Sheet. Perfect for live project updates!
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Modal event handlers
  modal.querySelector('.modal-close').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  modal.querySelector('#load-sheets-data').addEventListener('click', () => {
    const url = modal.querySelector('#sheets-url').value.trim();
    if (url) {
      if (url.includes('/spreadsheets/d/') && url.includes('export?format=csv')) {
        loadDataFromUrl(url);
        document.body.removeChild(modal);
      } else {
        alert('Please enter a valid Google Sheets CSV export URL');
      }
    } else {
      alert('Please enter a Google Sheets URL');
    }
  });
  
  modal.querySelector('#test-sample-sheets').addEventListener('click', () => {
    // Use a sample public Google Sheets CSV URL (you'd replace this with an actual one)
    const sampleUrl = './data/sample-infrastructure.geojson'; // Fallback to local data
    loadDataFromUrl(sampleUrl);
    document.body.removeChild(modal);
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Auto-load data from URL parameter
if (dataParam) {
  window.addEventListener('load', () => {
    if (dataParam === 'sample') {
      loadSample();
    } else if (dataParam.startsWith('http')) {
      loadDataFromUrl(dataParam);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const mapInstance = initMap(applyFilteringAndRender);
  initFilters(applyFilteringAndRender);
  bindFilterEvents(applyFilteringAndRender);
  initTableSorting();
  initCharts();
  initLayers(mapInstance);
  initMeasurements(mapInstance);


  // Initialize collapsible Column Mapping panel
  const mappingHeader = document.getElementById('mapping-header');
  if (mappingHeader) {
    const mappingPanel = mappingHeader.closest('.panel-collapsible');
    mappingHeader.addEventListener('click', () => {
      mappingPanel.classList.toggle('collapsed');
    });
  }

  // Initialize collapsible Table panel
  const tableHeader = document.getElementById('table-panel-header');
  if (tableHeader) {
    const tablePanel = tableHeader.closest('.table-panel');
    tableHeader.addEventListener('click', () => {
      tablePanel.classList.toggle('collapsed');
    });
  }

  // Initialize collapsible Layers panel
  const layersHeader = document.getElementById('layers-header');
  if (layersHeader) {
    const layersPanel = layersHeader.closest('.panel-collapsible');
    layersHeader.addEventListener('click', (e) => {
      layersPanel.classList.toggle('collapsed');
    });
  }

  // Initialize collapsible Charts panel
  const chartsHeader = document.getElementById('charts-header');
  if (chartsHeader) {
    const chartsPanel = chartsHeader.closest('.panel-collapsible');
    chartsHeader.addEventListener('click', (e) => {
      chartPanel.classList.toggle('collapsed');
    });
  }

  document.getElementById('file-input').addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) onFileSelected(f);
  });
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    resetFilters();
    applyFilteringAndRender();
  });
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    exportCSV(filtered.length ? filtered : features);
  });
  document.getElementById('export-geojson-btn').addEventListener('click', () => {
    exportGeoJSON(filtered.length ? filtered : features);
  });
  document.getElementById('load-sample-btn').addEventListener('click', loadSample);
  document.getElementById('google-sheets-btn').addEventListener('click', showGoogleSheetsDialog);
  
  // Add share data functionality
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-secondary';
  shareBtn.innerHTML = '🔗 Share Data';
  shareBtn.title = 'Generate shareable link with current data';
  shareBtn.addEventListener('click', shareCurrentData);
  
  const exportActions = document.querySelector('.form-actions');
  if (exportActions) {
    exportActions.appendChild(shareBtn);
  }
  document.getElementById('print-btn').addEventListener('click', () => {
    // Prepare page for printing
    preparePrintView();
    
    // Trigger print dialog
    window.print();
    
    // Restore view after printing (delay to allow print dialog to appear)
    setTimeout(restorePrintView, 100);
  });
  

});
