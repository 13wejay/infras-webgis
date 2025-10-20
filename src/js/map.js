let map, cluster;
const projectTypeIcons = createProjectTypeIcons();
const overlayLayers = new Map();

/**
 * Create custom icons for different project types
 */
function createProjectTypeIcons() {
  const types = {
    'road': '#FF6B6B',
    'bridge': '#4ECDC4',
    'building': '#45B7D1',
    'water': '#96CEB4',
    'power': '#FFEAA7',
    'telecom': '#DDA15E',
    'railway': '#A29BFE',
    'airport': '#FD79A8',
    'port': '#74B9FF',
    'default': '#6C757D'
  };

  const icons = {};
  Object.entries(types).forEach(([type, color]) => {
    icons[type] = L.divIcon({
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  });

  return icons;
}

export function initMap(onMoveEnd){
  map = L.map('map', { 
    zoomControl: true, 
    preferCanvas: true 
  }).setView([20, 0], 2);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  cluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 50
  });
  map.addLayer(cluster);
  
  // Add scale control
  L.control.scale().addTo(map);
  
  if (onMoveEnd) map.on('moveend', () => onMoveEnd());

  // listen to zoom-to requests from table
  document.addEventListener('zoom-to', (e) => {
    if (!map || !e.detail) return;
    const {lat, lng} = e.detail;
    map.setView([lat, lng], Math.max(map.getZoom(), 12));
  });
  
  // listen to toggle-projects requests from layers panel
  document.addEventListener('toggle-projects', (e) => {
    if (!map || !cluster) return;
    const { visible } = e.detail;
    if (visible) {
      map.addLayer(cluster);
    } else {
      map.removeLayer(cluster);
    }
  });
  
  // listen to highlight-project requests
  document.addEventListener('highlight-project', (e) => {
    if (!map || !e.detail) return;
    const { lat, lng } = e.detail;
    map.setView([lat, lng], 15);
  });
  
  return map;
}

/**
 * Get icon for project based on type
 */
function getIconForProject(type) {
  const normalizedType = type ? type.toLowerCase() : 'default';
  return projectTypeIcons[normalizedType] || projectTypeIcons['default'];
}

/**
 * Create enhanced popup content for a project
 */
function createPopupContent(properties) {
  const p = properties;
  return `
    <div class="popup-content" style="min-width: 200px;">
      <h3 style="margin: 0 0 8px 0; color: var(--accent);">${p.name || '(unnamed)'}</h3>
      <div class="popup-details" style="font-size: 13px;">
        ${p.type ? `<p style="margin: 4px 0;"><strong>Type:</strong> ${p.type}</p>` : ''}
        ${p.status ? `<p style="margin: 4px 0;"><strong>Status:</strong> ${p.status}</p>` : ''}
        ${p.location ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${p.location}</p>` : ''}
        ${p.cost != null ? `<p style="margin: 4px 0;"><strong>Cost:</strong> ${formatCurrency(p.cost)}</p>` : ''}
        ${p.startDate ? `<p style="margin: 4px 0;"><strong>Start:</strong> ${p.startDate}</p>` : ''}
        ${p.endDate ? `<p style="margin: 4px 0;"><strong>End:</strong> ${p.endDate}</p>` : ''}
        ${p.description ? `<p style="margin: 8px 0 4px 0;"><strong>Description:</strong><br/>${p.description}</p>` : ''}
      </div>
    </div>
  `;
}

export function updateMarkers(features){
  cluster.clearLayers();
  const markers = [];
  features.forEach(f => {
    const [lng, lat] = f.geometry.coordinates;
    const icon = getIconForProject(f.properties.type);
    const m = L.marker([lat, lng], { icon });
    const popup = createPopupContent(f.properties);
    m.bindPopup(popup, { maxWidth: 300 });
    markers.push(m);
  });
  cluster.addLayers(markers);
}

export function fitToMarkers(){
  try{
    const group = L.featureGroup(cluster.getLayers());
    if (group.getLayers().length) {
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }catch(e){/* no-op */}
}

export function getMapBounds(){
  return map.getBounds();
}

/**
 * Add GeoJSON overlay layer to the map
 * @param {Object} geojson - GeoJSON data
 * @param {string} name - Layer name
 * @returns {string} Layer ID
 */
export function addGeoJSONLayer(geojson, name) {
  const layer = L.geoJSON(geojson, {
    style: {
      color: '#3388ff',
      weight: 2,
      opacity: 0.65,
      fillOpacity: 0.2
    },
    onEachFeature: (feature, layer) => {
      if (feature.properties) {
        const popupContent = createGeoJSONPopup(feature.properties);
        layer.bindPopup(popupContent, { maxWidth: 300 });
      }
    }
  }).addTo(map);

  const layerId = Date.now().toString();
  overlayLayers.set(layerId, { layer, name });
  
  // Dispatch event to update UI
  document.dispatchEvent(new CustomEvent('layer-added', { 
    detail: { id: layerId, name, type: 'geojson' } 
  }));

  return layerId;
}

/**
 * Create popup content for GeoJSON features
 */
function createGeoJSONPopup(properties) {
  let content = '<div class="popup-content" style="min-width: 200px;"><h3 style="margin: 0 0 8px 0; color: var(--accent);">Feature Properties</h3><div class="popup-details" style="font-size: 13px;">';
  Object.entries(properties).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      content += `<p style="margin: 4px 0;"><strong>${key}:</strong> ${value}</p>`;
    }
  });
  content += '</div></div>';
  return content;
}

/**
 * Remove overlay layer from the map
 * @param {string} layerId - Layer ID to remove
 */
export function removeLayer(layerId) {
  const layerData = overlayLayers.get(layerId);
  if (layerData) {
    map.removeLayer(layerData.layer);
    overlayLayers.delete(layerId);
    
    // Dispatch event to update UI
    document.dispatchEvent(new CustomEvent('layer-removed', { 
      detail: { id: layerId } 
    }));
  }
}

/**
 * Get all overlay layers
 * @returns {Array} Array of layer info objects
 */
export function getOverlayLayers() {
  return Array.from(overlayLayers.entries()).map(([id, data]) => ({
    id,
    name: data.name
  }));
}

/**
 * Highlight a specific project on the map
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
export function highlightProject(lat, lng) {
  if (!map) return;
  map.setView([lat, lng], 15);
  
  // Flash animation could be added here
}

function formatCurrency(n){
  try{
    return new Intl.NumberFormat(undefined, {style:'currency', currency:'USD', maximumFractionDigits:0}).format(Number(n));
  }catch(e){
    return Number(n).toLocaleString();
  }
}
