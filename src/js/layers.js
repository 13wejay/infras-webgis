let map;
let spatialLayers = new Map();
let activeLayerId = null;

export function initLayers(mapInstance) {
  map = mapInstance;
  initLayerControls();
  bindLayerEvents();
}

function initLayerControls() {
  // Update projects count
  updateProjectsCount(0);
}

function bindLayerEvents() {
  // Projects layer toggle
  const projectsLayer = document.getElementById('projects-layer');
  projectsLayer.addEventListener('change', (e) => {
    toggleProjectsVisibility(e.target.checked);
  });
  
  // Layer file import
  const layerFileInput = document.getElementById('layer-file-input');
  layerFileInput.addEventListener('change', handleLayerFileImport);
  
  // Style controls
  const opacitySlider = document.getElementById('layer-opacity');
  const colorPicker = document.getElementById('layer-color');
  
  opacitySlider.addEventListener('input', updateActiveLayerStyle);
  colorPicker.addEventListener('change', updateActiveLayerStyle);
}

function toggleProjectsVisibility(visible) {
  // This will integrate with the existing map markers
  const event = new CustomEvent('toggle-projects', { detail: { visible } });
  document.dispatchEvent(event);
}

async function handleLayerFileImport(event) {
  const files = Array.from(event.target.files);
  
  for (const file of files) {
    try {
      let geoData;
      
      if (file.name.toLowerCase().endsWith('.geojson') || file.name.toLowerCase().endsWith('.json')) {
        geoData = await parseGeoJSON(file);
      } else if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.shp')) {
        // For shapefile support, we'd need a library like shpjs
        alert('Shapefile support requires additional libraries. Please use GeoJSON format for now.');
        continue;
      } else {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }
      
      if (geoData) {
        console.log('Importing GeoJSON file:', file.name);
        addSpatialLayer(file.name, geoData);
      }
    } catch (error) {
      console.error('Error importing layer:', error);
      alert(`Error importing ${file.name}: ${error.message}`);
    }
  }
  
  // Clear the input
  event.target.value = '';
}

async function parseGeoJSON(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  // Validate GeoJSON structure
  if (data.type !== 'FeatureCollection' && data.type !== 'Feature') {
    throw new Error('Invalid GeoJSON format');
  }
  
  // Validate and analyze coordinates
  const coordInfo = analyzeCoordinates(data);
  console.log('GeoJSON coordinate analysis:', coordInfo);
  
  // Handle coordinate system issues
  if (coordInfo.needsScaling) {
    console.warn(`Coordinates appear to be in ${coordInfo.coordinateSystemType} format`);
    const scaleMessage = `The imported coordinates appear to be in a projected coordinate system (${coordInfo.coordinateSystemType}). 
    Max coordinate value: ${coordInfo.maxAbsValue.toLocaleString()}
    
    Would you like to try scaling them to geographic coordinates?`;
    
    if (confirm(scaleMessage)) {
      scaleCoordinates(data, coordInfo.scaleFactor);
      console.log(`Applied scale factor: ${coordInfo.scaleFactor}`);
    }
  } else if (coordInfo.needsSwapping) {
    console.warn('Coordinates may need lat/lng swapping');
    if (confirm('The imported coordinates appear to be in lat,lng format instead of lng,lat. Would you like to swap them?')) {
      swapCoordinates(data);
    }
  }
  
  return data;
}

function analyzeCoordinates(geoData) {
  let coordSamples = [];
  let featureCount = 0;
  
  function extractCoords(geometry) {
    if (geometry.type === 'Point') {
      coordSamples.push(geometry.coordinates);
    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
      coordSamples.push(...geometry.coordinates.slice(0, 5)); // Sample first 5 coords
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      if (geometry.coordinates[0]) {
        coordSamples.push(...geometry.coordinates[0].slice(0, 5));
      }
    } else if (geometry.type === 'MultiPolygon') {
      if (geometry.coordinates[0] && geometry.coordinates[0][0]) {
        coordSamples.push(...geometry.coordinates[0][0].slice(0, 5));
      }
    }
  }
  
  if (geoData.type === 'FeatureCollection') {
    geoData.features.forEach(feature => {
      if (feature.geometry) {
        extractCoords(feature.geometry);
        featureCount++;
      }
    });
  } else if (geoData.type === 'Feature' && geoData.geometry) {
    extractCoords(geoData.geometry);
    featureCount = 1;
  }
  
  // Analyze coordinate patterns
  let lngOutOfRange = 0;
  let latOutOfRange = 0;
  let possibleSwapped = 0;
  let largeValues = 0;
  let veryLargeValues = 0;
  let maxAbsValue = 0;
  
  coordSamples.slice(0, 20).forEach(coord => { // Analyze up to 20 sample coordinates
    const [first, second] = coord;
    const absFirst = Math.abs(first);
    const absSecond = Math.abs(second);
    maxAbsValue = Math.max(maxAbsValue, absFirst, absSecond);
    
    // Check if coordinates are in valid lng/lat ranges
    if (first < -180 || first > 180) lngOutOfRange++;
    if (second < -90 || second > 90) latOutOfRange++;
    
    // Check for large coordinate values (indicating projected coordinate system)
    if (absFirst > 1000 || absSecond > 1000) largeValues++;
    if (absFirst > 100000 || absSecond > 100000) veryLargeValues++;
    
    // Check if swapping would make more sense
    if (Math.abs(first) <= 90 && Math.abs(second) <= 180 && Math.abs(first) > Math.abs(second)) {
      possibleSwapped++;
    }
  });
  
  const bounds = calculateBounds(coordSamples);
  
  // Determine coordinate system type
  let coordinateSystemType = 'geographic'; // decimal degrees
  let scaleFactor = 1;
  
  if (veryLargeValues > 0) {
    coordinateSystemType = 'projected_meters';
    // Estimate scale factor based on coordinate magnitude
    if (maxAbsValue > 1000000) {
      scaleFactor = 0.00001; // Very large values, likely in cm or mm
    } else if (maxAbsValue > 100000) {
      scaleFactor = 0.000001; // Large values, likely in meters but wrong projection
    }
  } else if (largeValues > coordSamples.length * 0.5) {
    coordinateSystemType = 'projected_unknown';
    scaleFactor = 0.01; // Medium values, might need scaling
  }
  
  return {
    featureCount,
    sampleCount: coordSamples.length,
    lngOutOfRange,
    latOutOfRange,
    possibleSwapped,
    largeValues,
    veryLargeValues,
    maxAbsValue,
    coordinateSystemType,
    scaleFactor,
    needsSwapping: possibleSwapped > coordSamples.length * 0.5,
    needsScaling: coordinateSystemType !== 'geographic',
    bounds,
    farFromCurrentView: bounds ? isFarFromCurrentView(bounds) : false
  };
}

function calculateBounds(coords) {
  if (coords.length === 0) return null;
  
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  return { minLng, maxLng, minLat, maxLat };
}

function isFarFromCurrentView(bounds) {
  if (!bounds || !map) return false;
  
  const mapBounds = map.getBounds();
  const mapCenter = map.getCenter();
  const dataCenter = {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2
  };
  
  // Check if data center is more than 1000km from map center
  const distance = map.distance([mapCenter.lat, mapCenter.lng], [dataCenter.lat, dataCenter.lng]);
  return distance > 1000000; // 1000km in meters
}

function scaleCoordinates(geoData, scaleFactor) {
  function scaleGeometryCoords(geometry) {
    if (geometry.type === 'Point') {
      geometry.coordinates = [
        geometry.coordinates[0] * scaleFactor,
        geometry.coordinates[1] * scaleFactor
      ];
    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
      geometry.coordinates = geometry.coordinates.map(coord => [
        coord[0] * scaleFactor,
        coord[1] * scaleFactor
      ]);
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      geometry.coordinates = geometry.coordinates.map(ring => 
        ring.map(coord => [
          coord[0] * scaleFactor,
          coord[1] * scaleFactor
        ])
      );
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates = geometry.coordinates.map(polygon =>
        polygon.map(ring => 
          ring.map(coord => [
            coord[0] * scaleFactor,
            coord[1] * scaleFactor
          ])
        )
      );
    }
  }
  
  if (geoData.type === 'FeatureCollection') {
    geoData.features.forEach(feature => {
      if (feature.geometry) {
        scaleGeometryCoords(feature.geometry);
      }
    });
  } else if (geoData.type === 'Feature' && geoData.geometry) {
    scaleGeometryCoords(geoData.geometry);
  }
}

function swapCoordinates(geoData) {
  function swapGeometryCoords(geometry) {
    if (geometry.type === 'Point') {
      geometry.coordinates = [geometry.coordinates[1], geometry.coordinates[0]];
    } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
      geometry.coordinates = geometry.coordinates.map(coord => [coord[1], coord[0]]);
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      geometry.coordinates = geometry.coordinates.map(ring => 
        ring.map(coord => [coord[1], coord[0]])
      );
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates = geometry.coordinates.map(polygon =>
        polygon.map(ring => 
          ring.map(coord => [coord[1], coord[0]])
        )
      );
    }
  }
  
  if (geoData.type === 'FeatureCollection') {
    geoData.features.forEach(feature => {
      if (feature.geometry) {
        swapGeometryCoords(feature.geometry);
      }
    });
  } else if (geoData.type === 'Feature' && geoData.geometry) {
    swapGeometryCoords(geoData.geometry);
  }
}

function addSpatialLayer(name, geoData) {
  const layerId = generateLayerId(name);
  
  // Create Leaflet layer
  const leafletLayer = L.geoJSON(geoData, {
    style: {
      color: document.getElementById('layer-color').value,
      opacity: parseFloat(document.getElementById('layer-opacity').value),
      fillOpacity: parseFloat(document.getElementById('layer-opacity').value) * 0.5,
      weight: 2
    },
    onEachFeature: (feature, layer) => {
      // Add popup with feature properties
      if (feature.properties) {
        const props = Object.entries(feature.properties)
          .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
          .join('<br>');
        layer.bindPopup(props);
      }
    }
  });
  
  // Add to map
  leafletLayer.addTo(map);
  
  // Fit map to layer bounds if it's far from current view
  try {
    const layerBounds = leafletLayer.getBounds();
    if (layerBounds.isValid()) {
      const currentBounds = map.getBounds();
      const layerCenter = layerBounds.getCenter();
      const currentCenter = currentBounds.getCenter();
      
      // If layer is far from current view, fit to it
      const distance = map.distance([currentCenter.lat, currentCenter.lng], [layerCenter.lat, layerCenter.lng]);
      if (distance > 100000) { // More than 100km away
        console.log('Layer is far from current view, fitting map to layer');
        map.fitBounds(layerBounds, { padding: [20, 20] });
      }
    }
  } catch (error) {
    console.warn('Could not fit bounds to layer:', error);
  }
  
  // Store layer data
  spatialLayers.set(layerId, {
    name,
    data: geoData,
    leafletLayer,
    visible: true,
    style: {
      color: document.getElementById('layer-color').value,
      opacity: parseFloat(document.getElementById('layer-opacity').value)
    }
  });
  
  // Update UI
  addLayerToUI(layerId, name, true);
  setActiveLayer(layerId);
  
  // Debug layer information
  const layerInfo = {
    name,
    featureCount: leafletLayer.getLayers().length,
    bounds: leafletLayer.getBounds(),
    sampleCoordinates: []
  };
  
  // Get sample coordinates for debugging
  leafletLayer.eachLayer(layer => {
    if (layer.getLatLng) {
      // Point
      layerInfo.sampleCoordinates.push([layer.getLatLng().lng, layer.getLatLng().lat]);
    } else if (layer.getLatLngs) {
      // Line/Polygon
      const latlngs = layer.getLatLngs();
      if (Array.isArray(latlngs) && latlngs.length > 0) {
        if (latlngs[0].lat !== undefined) {
          // LineString
          layerInfo.sampleCoordinates.push([latlngs[0].lng, latlngs[0].lat]);
        } else if (Array.isArray(latlngs[0]) && latlngs[0].length > 0) {
          // Polygon
          layerInfo.sampleCoordinates.push([latlngs[0][0].lng, latlngs[0][0].lat]);
        }
      }
    }
    if (layerInfo.sampleCoordinates.length >= 3) return; // Limit samples
  });
  
  console.log(`Added spatial layer: ${name}`, layerInfo);
  
  // Show alert with layer info for troubleshooting
  const message = `Layer "${name}" imported successfully!
  
Features: ${layerInfo.featureCount}
Sample coordinates: ${layerInfo.sampleCoordinates.map(c => `[${c[0].toFixed(6)}, ${c[1].toFixed(6)}]`).join(', ')}
Bounds: ${layerInfo.bounds.isValid() ? `SW: [${layerInfo.bounds.getSouthWest().lng.toFixed(6)}, ${layerInfo.bounds.getSouthWest().lat.toFixed(6)}], NE: [${layerInfo.bounds.getNorthEast().lng.toFixed(6)}, ${layerInfo.bounds.getNorthEast().lat.toFixed(6)}]` : 'Invalid'}

Map has been fitted to layer bounds.`;
  
  alert(message);
}

function addLayerToUI(layerId, name, visible) {
  const spatialLayersContainer = document.getElementById('spatial-layers');
  
  // Remove "no layers" message if it exists
  const noLayersMsg = spatialLayersContainer.querySelector('.muted');
  if (noLayersMsg) {
    noLayersMsg.remove();
  }
  
  const layerItem = document.createElement('label');
  layerItem.className = 'layer-item';
  layerItem.dataset.layerId = layerId;
  
  layerItem.innerHTML = `
    <input type="checkbox" ${visible ? 'checked' : ''}>
    <span>${escapeHtml(name)}</span>
    <button class="btn-scale-layer" title="Scale coordinates (fix projection mismatch)" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px; font-size: 10px;">📏</button>
    <button class="btn-swap-coords" title="Swap lat/lng coordinates" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px; font-size: 10px;">⇄</button>
    <button class="btn-fit-layer" title="Fit map to layer" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px; font-size: 10px;">📍</button>
    <button class="btn-remove-layer" title="Remove layer" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;">✕</button>
  `;
  
  // Add event listeners
  const checkbox = layerItem.querySelector('input');
  checkbox.addEventListener('change', (e) => {
    toggleLayerVisibility(layerId, e.target.checked);
  });
  
  const scaleBtn = layerItem.querySelector('.btn-scale-layer');
  const swapBtn = layerItem.querySelector('.btn-swap-coords');
  const fitBtn = layerItem.querySelector('.btn-fit-layer');
  const removeBtn = layerItem.querySelector('.btn-remove-layer');
  
  scaleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    promptScaleLayer(layerId);
  });
  
  swapBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    swapLayerCoordinates(layerId);
  });
  
  fitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fitMapToLayer(layerId);
  });
  
  removeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeSpatialLayer(layerId);
  });
  
  layerItem.addEventListener('click', (e) => {
    if (!e.target.classList.contains('btn-scale-layer') &&
        !e.target.classList.contains('btn-swap-coords') && 
        !e.target.classList.contains('btn-fit-layer') &&
        !e.target.classList.contains('btn-remove-layer') && 
        e.target !== checkbox) {
      setActiveLayer(layerId);
    }
  });
  
  spatialLayersContainer.appendChild(layerItem);
}

function toggleLayerVisibility(layerId, visible) {
  const layer = spatialLayers.get(layerId);
  if (!layer) return;
  
  if (visible) {
    layer.leafletLayer.addTo(map);
  } else {
    map.removeLayer(layer.leafletLayer);
  }
  
  layer.visible = visible;
}

function removeSpatialLayer(layerId) {
  const layer = spatialLayers.get(layerId);
  if (!layer) return;
  
  // Remove from map
  map.removeLayer(layer.leafletLayer);
  
  // Remove from storage
  spatialLayers.delete(layerId);
  
  // Remove from UI
  const layerItem = document.querySelector(`[data-layer-id="${layerId}"]`);
  if (layerItem) {
    layerItem.remove();
  }
  
  // Clear active layer if this was it
  if (activeLayerId === layerId) {
    activeLayerId = null;
  }
  
  // Show "no layers" message if no layers remain
  const spatialLayersContainer = document.getElementById('spatial-layers');
  if (spatialLayers.size === 0) {
    spatialLayersContainer.innerHTML = '<div class="muted small">No additional layers imported</div>';
  }
}

function setActiveLayer(layerId) {
  activeLayerId = layerId;
  
  // Update UI to show active layer
  document.querySelectorAll('.layer-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeItem = document.querySelector(`[data-layer-id="${layerId}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
  
  // Update style controls to match active layer
  const layer = spatialLayers.get(layerId);
  if (layer) {
    document.getElementById('layer-opacity').value = layer.style.opacity;
    document.getElementById('layer-color').value = layer.style.color;
  }
}

function updateActiveLayerStyle() {
  if (!activeLayerId) return;
  
  const layer = spatialLayers.get(activeLayerId);
  if (!layer) return;
  
  const opacity = parseFloat(document.getElementById('layer-opacity').value);
  const color = document.getElementById('layer-color').value;
  
  // Update layer style
  layer.leafletLayer.setStyle({
    color: color,
    opacity: opacity,
    fillOpacity: opacity * 0.5
  });
  
  // Store new style
  layer.style = { color, opacity };
}

export function updateProjectsCount(count) {
  const projectsCount = document.getElementById('projects-count');
  if (projectsCount) {
    projectsCount.textContent = count;
  }
}

function generateLayerId(name) {
  return 'layer_' + name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
}

function promptScaleLayer(layerId) {
  const layer = spatialLayers.get(layerId);
  if (!layer) return;
  
  // Analyze current coordinates to suggest scale factors
  const coordInfo = analyzeCoordinates(layer.data);
  
  let suggestedScale = '0.000001';
  if (coordInfo.maxAbsValue > 10000000) {
    suggestedScale = '0.0000001';  // Very large values (cm/mm)
  } else if (coordInfo.maxAbsValue > 1000000) {
    suggestedScale = '0.000001';   // Large values (meters in wrong projection)
  } else if (coordInfo.maxAbsValue > 100000) {
    suggestedScale = '0.00001';    // Medium large values
  } else if (coordInfo.maxAbsValue > 1000) {
    suggestedScale = '0.01';       // Moderate values
  }
  
  const scalePrompt = `Enter scale factor for coordinate transformation:
  
Current max coordinate value: ${coordInfo.maxAbsValue.toLocaleString()}
Suggested scale factor: ${suggestedScale}

Common scale factors:
• 0.000001 - UTM meters to degrees (approximate)
• 0.00001 - Large projected coordinates
• 0.01 - Moderate coordinate scaling
• 1.0 - No scaling`;
  
  const scaleFactorStr = prompt(scalePrompt, suggestedScale);
  if (scaleFactorStr === null) return; // User cancelled
  
  const scaleFactor = parseFloat(scaleFactorStr);
  if (isNaN(scaleFactor) || scaleFactor <= 0) {
    alert('Invalid scale factor. Please enter a positive number.');
    return;
  }
  
  scaleLayerCoordinates(layerId, scaleFactor);
}

function scaleLayerCoordinates(layerId, scaleFactor) {
  const layer = spatialLayers.get(layerId);
  if (!layer) return;
  
  console.log('Scaling coordinates for layer:', layerId, 'by factor:', scaleFactor);
  
  // Scale coordinates in the data
  scaleCoordinates(layer.data, scaleFactor);
  
  // Remove old layer from map
  map.removeLayer(layer.leafletLayer);
  
  // Create new layer with scaled coordinates
  const newLeafletLayer = L.geoJSON(layer.data, {
    style: layer.style,
    onEachFeature: (feature, leafletLayer) => {
      if (feature.properties) {
        const props = Object.entries(feature.properties)
          .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
          .join('<br>');
        leafletLayer.bindPopup(props);
      }
    }
  });
  
  // Add new layer to map
  if (layer.visible) {
    newLeafletLayer.addTo(map);
  }
  
  // Update stored layer
  layer.leafletLayer = newLeafletLayer;
  
  // Try to fit to new bounds
  try {
    const bounds = newLeafletLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  } catch (error) {
    console.warn('Could not fit bounds after scaling:', error);
  }
  
  console.log('Coordinates scaled successfully');
}

function swapLayerCoordinates(layerId) {
  const layer = spatialLayers.get(layerId);
  if (!layer) return;
  
  console.log('Swapping coordinates for layer:', layerId);
  
  // Swap coordinates in the data
  swapCoordinates(layer.data);
  
  // Remove old layer from map
  map.removeLayer(layer.leafletLayer);
  
  // Create new layer with swapped coordinates
  const newLeafletLayer = L.geoJSON(layer.data, {
    style: layer.style,
    onEachFeature: (feature, leafletLayer) => {
      if (feature.properties) {
        const props = Object.entries(feature.properties)
          .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
          .join('<br>');
        leafletLayer.bindPopup(props);
      }
    }
  });
  
  // Add new layer to map
  if (layer.visible) {
    newLeafletLayer.addTo(map);
  }
  
  // Update stored layer
  layer.leafletLayer = newLeafletLayer;
  
  console.log('Coordinates swapped successfully');
}

function fitMapToLayer(layerId) {
  const layer = spatialLayers.get(layerId);
  if (!layer) return;
  
  try {
    const bounds = layer.leafletLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
      console.log('Fitted map to layer:', layerId);
    } else {
      alert('Cannot fit to layer - no valid bounds found');
    }
  } catch (error) {
    console.error('Error fitting to layer:', error);
    alert('Error fitting to layer bounds');
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}