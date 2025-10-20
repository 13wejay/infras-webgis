let map;
let currentTool = null;
let measurementLayer;
let drawingPath = [];
let measurements = [];
let isDrawing = false;

export function initMeasurements(mapInstance) {
  map = mapInstance;
  measurementLayer = L.layerGroup().addTo(map);
  initMeasurementControls();
  bindMeasurementEvents();
  
  // Expose for testing
  window.testClearMeasurements = clearAllMeasurements;
  window.measurements = measurements;
  window.testAddMeasurement = () => {
    // Add a test measurement for debugging
    const testMeasurement = {
      id: 'test_' + Date.now(),
      type: 'distance',
      path: [
        {lat: -6.2, lng: 106.8},
        {lat: -6.25, lng: 106.85}
      ],
      value: 1000,
      timestamp: new Date()
    };
    measurements.push(testMeasurement);
    console.log('Test measurement added. Total measurements:', measurements.length);
    return testMeasurement;
  };
}

function initMeasurementControls() {
  // Toggle panel visibility
  const toggleBtn = document.getElementById('toggle-measurements');
  const measurementContent = document.getElementById('measurement-content');
  
  toggleBtn.addEventListener('click', () => {
    measurementContent.classList.toggle('hidden');
    toggleBtn.innerHTML = measurementContent.classList.contains('hidden') ? '🛠️' : '✕';
  });
}

function bindMeasurementEvents() {
  // Tool selection buttons
  document.getElementById('measure-distance').addEventListener('click', () => activateTool('distance'));
  document.getElementById('measure-area').addEventListener('click', () => activateTool('area'));
  
  const clearBtn = document.getElementById('clear-measurements');
  console.log('Clear button found:', clearBtn);
  console.log('Clear button innerHTML:', clearBtn ? clearBtn.innerHTML : 'button not found');
  
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      console.log('Clear button clicked - event fired');
      e.preventDefault();
      e.stopPropagation();
      clearAllMeasurements();
    });
    console.log('Event listener attached to clear button');
  } else {
    console.error('Clear button not found!');
  }
  
  document.getElementById('export-measurements').addEventListener('click', exportMeasurements);
  
  // Units change
  document.getElementById('measurement-units').addEventListener('change', updateMeasurementDisplay);
  
  // Map events for drawing
  map.on('click', handleMapClick);
  map.on('mousemove', handleMouseMove);
  map.on('dblclick', finishMeasurement);
}

function activateTool(tool) {
  // Deactivate current tool
  if (currentTool) {
    deactivateTool(currentTool);
  }
  
  currentTool = tool;
  drawingPath = [];
  isDrawing = false;
  
  // Update UI
  document.querySelectorAll('.measure-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[data-tool="${tool}"]`);
  activeBtn.classList.add('active');
  
  // Change cursor
  map.getContainer().style.cursor = 'crosshair';
  
  console.log(`Activated ${tool} measurement tool`);
}

function deactivateTool() {
  currentTool = null;
  drawingPath = [];
  isDrawing = false;
  
  // Reset UI
  document.querySelectorAll('.measure-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Reset cursor
  map.getContainer().style.cursor = '';
  
  // Remove temporary drawing elements
  removeTemporaryElements();
}

function handleMapClick(e) {
  if (!currentTool) return;
  
  const { lat, lng } = e.latlng;
  
  if (!isDrawing) {
    // Start new measurement
    isDrawing = true;
    drawingPath = [e.latlng];
    
    if (currentTool === 'distance') {
      createTemporaryLine();
    } else if (currentTool === 'area') {
      createTemporaryPolygon();
    }
  } else {
    // Add point to current measurement
    drawingPath.push(e.latlng);
    updateTemporaryElement();
  }
  
  // Update display
  updateLiveMeasurement();
}

function handleMouseMove(e) {
  if (!isDrawing || !currentTool) return;
  
  // Update temporary line/polygon to cursor position
  const tempPath = [...drawingPath, e.latlng];
  updateTemporaryElement(tempPath);
  updateLiveMeasurement(tempPath);
}

function finishMeasurement(e) {
  if (!isDrawing || !currentTool || drawingPath.length < 2) return;
  
  // Prevent map zoom on double click
  e.originalEvent.preventDefault();
  
  let measurement;
  
  if (currentTool === 'distance') {
    measurement = createDistanceMeasurement(drawingPath);
  } else if (currentTool === 'area') {
    if (drawingPath.length < 3) {
      alert('Area measurement requires at least 3 points');
      return;
    }
    measurement = createAreaMeasurement(drawingPath);
  }
  
  if (measurement) {
    measurements.push(measurement);
    console.log('Measurement added, total measurements:', measurements.length);
    addMeasurementToMap(measurement);
  }
  
  // Reset for next measurement
  isDrawing = false;
  drawingPath = [];
  removeTemporaryElements();
  updateMeasurementDisplay();
}

function createTemporaryLine() {
  removeTemporaryElements();
  
  if (drawingPath.length >= 1) {
    window.tempMeasurementElement = L.polyline(drawingPath, {
      color: '#ff6b6b',
      weight: 3,
      opacity: 0.8,
      dashArray: '5, 5'
    }).addTo(measurementLayer);
  }
}

function createTemporaryPolygon() {
  removeTemporaryElements();
  
  if (drawingPath.length >= 2) {
    window.tempMeasurementElement = L.polygon(drawingPath, {
      color: '#4ecdc4',
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.2,
      dashArray: '5, 5'
    }).addTo(measurementLayer);
  }
}

function updateTemporaryElement(path = drawingPath) {
  if (!window.tempMeasurementElement) return;
  
  if (currentTool === 'distance') {
    window.tempMeasurementElement.setLatLngs(path);
  } else if (currentTool === 'area') {
    window.tempMeasurementElement.setLatLngs(path);
  }
}

function removeTemporaryElements() {
  if (window.tempMeasurementElement) {
    measurementLayer.removeLayer(window.tempMeasurementElement);
    window.tempMeasurementElement = null;
  }
}

function createDistanceMeasurement(path) {
  const distance = calculateDistance(path);
  const id = generateId();
  
  return {
    id,
    type: 'distance',
    path: [...path],
    value: distance,
    timestamp: new Date()
  };
}

function createAreaMeasurement(path) {
  const area = calculateArea(path);
  const id = generateId();
  
  return {
    id,
    type: 'area',
    path: [...path],
    value: area,
    timestamp: new Date()
  };
}

function addMeasurementToMap(measurement) {
  let layer;
  const { path, type, value } = measurement;
  
  if (type === 'distance') {
    layer = L.polyline(path, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.8
    });
    
    // Add distance labels along the line
    const totalDistance = formatDistance(value);
    const midPoint = path[Math.floor(path.length / 2)];
    
    L.marker(midPoint, {
      icon: createTextIcon(totalDistance)
    }).addTo(measurementLayer);
    
  } else if (type === 'area') {
    layer = L.polygon(path, {
      color: '#10b981',
      weight: 3,
      opacity: 0.8,
      fillOpacity: 0.3
    });
    
    // Add area label at centroid
    const centroid = calculateCentroid(path);
    const formattedArea = formatArea(value);
    
    L.marker(centroid, {
      icon: createTextIcon(formattedArea)
    }).addTo(measurementLayer);
  }
  
  layer.addTo(measurementLayer);
  
  // Store reference to layer for removal
  measurement.layer = layer;
  
  // Add click handler for removal
  layer.on('click', () => {
    if (confirm('Remove this measurement?')) {
      removeMeasurement(measurement.id);
    }
  });
}

function calculateDistance(path) {
  let totalDistance = 0;
  
  for (let i = 1; i < path.length; i++) {
    totalDistance += path[i - 1].distanceTo(path[i]);
  }
  
  return totalDistance; // in meters
}

function calculateArea(path) {
  if (path.length < 3) return 0;
  
  // Calculate area using shoelace formula for geographic coordinates
  let area = 0;
  const R = 6371000; // Earth's radius in meters
  
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length;
    const lat1 = path[i].lat * Math.PI / 180;
    const lat2 = path[j].lat * Math.PI / 180;
    const lng1 = path[i].lng * Math.PI / 180;
    const lng2 = path[j].lng * Math.PI / 180;
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  return Math.abs(area * R * R / 2);
}

function calculateCentroid(path) {
  let lat = 0, lng = 0;
  
  path.forEach(point => {
    lat += point.lat;
    lng += point.lng;
  });
  
  return L.latLng(lat / path.length, lng / path.length);
}

function updateLiveMeasurement(path = drawingPath) {
  if (!isDrawing || path.length < 2) return;
  
  if (currentTool === 'distance') {
    const distance = calculateDistance(path);
    const distanceResult = document.getElementById('distance-result');
    const distanceValue = document.getElementById('distance-value');
    
    distanceResult.classList.remove('hidden');
    distanceValue.textContent = formatDistance(distance);
    
  } else if (currentTool === 'area' && path.length >= 3) {
    const area = calculateArea(path);
    const areaResult = document.getElementById('area-result');
    const areaValue = document.getElementById('area-value');
    
    areaResult.classList.remove('hidden');
    areaValue.textContent = formatArea(area);
  }
}

function updateMeasurementDisplay() {
  // Update all measurement displays based on current units
  measurements.forEach(measurement => {
    const { type, value } = measurement;
    
    if (type === 'distance') {
      const distanceResult = document.getElementById('distance-result');
      const distanceValue = document.getElementById('distance-value');
      
      if (measurements.some(m => m.type === 'distance')) {
        distanceResult.classList.remove('hidden');
        distanceValue.textContent = formatDistance(value);
      }
    } else if (type === 'area') {
      const areaResult = document.getElementById('area-result');
      const areaValue = document.getElementById('area-value');
      
      if (measurements.some(m => m.type === 'area')) {
        areaResult.classList.remove('hidden');
        areaValue.textContent = formatArea(value);
      }
    }
  });
}

function formatDistance(meters) {
  const units = document.getElementById('measurement-units').value;
  
  if (units === 'metric') {
    if (meters < 1000) {
      return `${Math.round(meters * 10) / 10} m`;
    } else {
      return `${Math.round(meters / 100) / 10} km`;
    }
  } else {
    const feet = meters * 3.28084;
    if (feet < 5280) {
      return `${Math.round(feet * 10) / 10} ft`;
    } else {
      const miles = feet / 5280;
      return `${Math.round(miles * 100) / 100} mi`;
    }
  }
}

function formatArea(squareMeters) {
  const units = document.getElementById('measurement-units').value;
  
  if (units === 'metric') {
    if (squareMeters < 10000) {
      return `${Math.round(squareMeters * 10) / 10} m²`;
    } else {
      const hectares = squareMeters / 10000;
      return `${Math.round(hectares * 100) / 100} ha`;
    }
  } else {
    const squareFeet = squareMeters * 10.7639;
    if (squareFeet < 43560) {
      return `${Math.round(squareFeet)} ft²`;
    } else {
      const acres = squareFeet / 43560;
      return `${Math.round(acres * 100) / 100} acres`;
    }
  }
}

function createTextIcon(text) {
  return L.divIcon({
    className: 'measurement-label',
    html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; border: 1px solid #ccc; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${text}</div>`,
    iconSize: [null, null],
    iconAnchor: [null, null]
  });
}

function clearAllMeasurements() {
  console.log('clearAllMeasurements called - measurements:', measurements.length, 'isDrawing:', isDrawing);
  
  // Ask for confirmation only if there are measurements
  if (measurements.length > 0) {
    if (!confirm(`Clear all measurements (${measurements.length} measurements)?`)) {
      console.log('User cancelled clear operation');
      return;
    }
  }
  
  // Clear all layers
  measurementLayer.clearLayers();
  measurements = [];
  
  // Reset drawing state
  isDrawing = false;
  drawingPath = [];
  removeTemporaryElements();
  
  // Hide result displays
  const distanceResult = document.getElementById('distance-result');
  const areaResult = document.getElementById('area-result');
  if (distanceResult) distanceResult.classList.add('hidden');
  if (areaResult) areaResult.classList.add('hidden');
  
  // Deactivate current tool
  deactivateTool();
  
  console.log('All measurements cleared');
}

function removeMeasurement(id) {
  const index = measurements.findIndex(m => m.id === id);
  if (index === -1) return;
  
  const measurement = measurements[index];
  
  // Remove from map
  if (measurement.layer) {
    measurementLayer.removeLayer(measurement.layer);
  }
  
  // Remove from array
  measurements.splice(index, 1);
  
  // Update display
  updateMeasurementDisplay();
  
  // Hide results if no measurements of that type remain
  if (!measurements.some(m => m.type === 'distance')) {
    document.getElementById('distance-result').classList.add('hidden');
  }
  if (!measurements.some(m => m.type === 'area')) {
    document.getElementById('area-result').classList.add('hidden');
  }
}

function exportMeasurements() {
  if (measurements.length === 0) {
    alert('No measurements to export');
    return;
  }
  
  const data = measurements.map(m => ({
    id: m.id,
    type: m.type,
    value: m.value,
    formatted: m.type === 'distance' ? formatDistance(m.value) : formatArea(m.value),
    coordinates: m.path.map(p => [p.lat, p.lng]),
    timestamp: m.timestamp.toISOString()
  }));
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `measurements_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

function generateId() {
  return 'measurement_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && currentTool) {
    deactivateTool();
  }
});