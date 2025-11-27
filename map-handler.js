// ===========================
// Map Handler - Leaflet map operations
// ===========================

let map = null;
let markerClusterGroup = null;
let markers = {};
let geoJSONLayers = {}; // Store GeoJSON layers (polygons, lines, etc.)
let temporaryLayers = {}; // Store temporary layers (not saved to database)
let temporaryLayerCounter = 0; // Counter for naming temporary layers
let currentFilters = {
    types: [],
    searchText: ''
};
let baseLayers = {}; // Store basemap layers
let currentBaseLayer = null;
let measurementLayer = null; // Layer for measurements
let isMeasuring = false;
let measurementMarkers = [];
let isAddingProject = false; // Flag for adding project mode
let tempProjectMarker = null; // Temporary marker when adding project

/**
 * Initialize the map
 */
function initMap() {
    if (map) return; 
    
    // Create map centered on South Borneo, Indonesia
    map = L.map('map', {
        layers: []
    }).setView([-3.620, 114.868], 9);
    
    // Define basemap layers
    baseLayers = {
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }),
        'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18
        }),
        'Topography': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
            maxZoom: 18
        })
    };
    
    // Add default basemap (OpenStreetMap)
    currentBaseLayer = baseLayers['OpenStreetMap'];
    currentBaseLayer.addTo(map);
    
    // Initialize marker cluster group
    markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });
    
    map.addLayer(markerClusterGroup);
    
    // Initialize measurement layer
    measurementLayer = L.layerGroup();
    map.addLayer(measurementLayer);
    
    // Populate layer controls with existing types
    populateLayerControls();
    
    // Load all projects and add markers
    refreshMapMarkers();
    
    // Restore temporary layers from localStorage
    restoreTemporaryLayers();
    
    // Setup event listeners
    setupMapControls();
    
    // Initialize map tools
    initializeMapTools();
}

/**
 * Populate layer controls with existing project types
 */
function populateLayerControls() {
    const types = getAllProjectTypes();
    const layerControlsContainer = document.querySelector('.layer-controls');
    
    if (!layerControlsContainer) return;
    
    // Keep the heading
    const heading = layerControlsContainer.querySelector('h3');
    layerControlsContainer.innerHTML = '';
    if (heading) layerControlsContainer.appendChild(heading);
    
    // Add checkboxes for each type
    types.forEach(type => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="layer-toggle" value="${escapeHtml(type)}" checked> ${escapeHtml(type)}`;
        layerControlsContainer.appendChild(label);
    });
    
    // Initialize currentFilters with all types
    currentFilters.types = types;
}

/**
 * Create a custom marker icon
 */
function createCustomIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 25px;
            height: 25px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });
}

/**
 * Create marker for a project
 */
function createMarker(project) {
    const color = getMarkerColor(project.status);
    
    // Create popup content
    const popupContent = `
        <div class="map-popup">
            <h3><i class="fas fa-map-marker-alt"></i>${escapeHtml(project.projectName)}</h3>
            <div class="popup-properties">
                <div class="popup-property">
                    <strong>Type</strong>
                    <span>${escapeHtml(project.projectType)}</span>
                </div>
                <div class="popup-property">
                    <strong>Location</strong>
                    <span>${escapeHtml(project.location)}</span>
                </div>
                <div class="popup-property">
                    <strong>Status</strong>
                    <span class="status-badge ${getStatusClass(project.status)}">${escapeHtml(project.status)}</span>
                </div>
                <div class="popup-property">
                    <strong>Contractor</strong>
                    <span>${escapeHtml(project.contractor)}</span>
                </div>
                <div class="popup-property">
                    <strong>Start Date</strong>
                    <span>${formatDate(project.startDate)}</span>
                </div>
                <div class="popup-property">
                    <strong>Finish Date</strong>
                    <span>${formatDate(project.finishDate)}</span>
                </div>
            </div>
            <div class="popup-actions">
                <button class="popup-btn popup-btn-primary" onclick="editProjectFromMap('${project.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="popup-btn popup-btn-secondary" onclick="viewProjectInTable('${project.id}')">
                    <i class="fas fa-table"></i> View
                </button>
            </div>
        </div>
    `;
    
    // If project has geometry data (from GeoJSON import), use it
    if (project.geometry) {
        const geoJsonLayer = L.geoJSON(project.geometry, {
            style: {
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 3
            },
            pointToLayer: (feature, latlng) => {
                const icon = createCustomIcon(color);
                return L.marker(latlng, { icon: icon });
            }
        });
        
        geoJsonLayer.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });
        
        return geoJsonLayer;
    } else {
        // Regular point marker
        const icon = createCustomIcon(color);
        const marker = L.marker([project.latitude, project.longitude], { icon: icon });
        
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });
        
        return marker;
    }
}

/**
 * Add markers to map
 */
function addMarkersToMap(projects) {
    // Clear existing markers and layers
    markerClusterGroup.clearLayers();
    
    // Clear existing GeoJSON layers
    Object.values(geoJSONLayers).forEach(layer => {
        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    });
    markers = {};
    geoJSONLayers = {};
    
    // Filter projects based on current filters
    const filteredProjects = projects.filter(project => {
        // Filter by type
        if (!currentFilters.types.includes(project.projectType)) {
            return false;
        }
        
        // Filter by search text
        if (currentFilters.searchText) {
            const searchLower = currentFilters.searchText.toLowerCase();
            return project.projectName.toLowerCase().includes(searchLower) ||
                   project.location.toLowerCase().includes(searchLower) ||
                   project.contractor.toLowerCase().includes(searchLower);
        }
        
        return true;
    });
    
    // Add filtered markers or layers
    filteredProjects.forEach(project => {
        const layer = createMarker(project);
        
        // If it's a GeoJSON layer (polygon/line), add directly to map
        if (project.geometry && project.geometry.type !== 'Point') {
            layer.addTo(map);
            geoJSONLayers[project.id] = layer;
        } else {
            // If it's a point marker, add to cluster group
            markerClusterGroup.addLayer(layer);
            markers[project.id] = layer;
        }
    });
}

/**
 * Refresh map markers
 */
function refreshMapMarkers() {
    const projects = loadProjects();
    addMarkersToMap(projects);
}

/**
 * Show project on map
 */
function showProjectOnMap(projectId) {
    const project = getProjectById(projectId);
    if (!project) {
        showToast('Project not found', 'error');
        return;
    }
    
    // Switch to map view
    switchView('map');
    
    // Center map on project
    map.setView([project.latitude, project.longitude], 15);
    
    // Open popup - check both markers and GeoJSON layers
    if (markers[projectId]) {
        markers[projectId].openPopup();
    } else if (geoJSONLayers[projectId]) {
        geoJSONLayers[projectId].openPopup();
    }
}

/**
 * Reset map view
 */
function resetMapView() {
    if (map) {
        map.setView([-3.620, 114.868], 9);
    }
}

/**
 * Change basemap
 */
function changeBasemap(basemapName) {
    if (!map || !baseLayers[basemapName]) return;
    
    // Remove current basemap
    if (currentBaseLayer) {
        map.removeLayer(currentBaseLayer);
    }
    
    // Add new basemap
    currentBaseLayer = baseLayers[basemapName];
    currentBaseLayer.addTo(map);
    
    showToast(`Basemap changed to ${basemapName}`, 'success');
}

/**
 * Filter map by project types
 */
function filterMapByTypes(types) {
    currentFilters.types = types;
    refreshMapMarkers();
}

/**
 * Search projects on map
 */
const searchProjectsOnMap = debounce((searchText) => {
    currentFilters.searchText = searchText;
    refreshMapMarkers();
}, 300);

/**
 * Setup map controls event listeners
 */
function setupMapControls() {
    // Basemap selector
    const basemapRadios = document.querySelectorAll('input[name="basemap"]');
    basemapRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            changeBasemap(e.target.value);
        });
    });
    
    // Layer toggle checkboxes
    document.querySelectorAll('.layer-toggle').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selectedTypes = Array.from(document.querySelectorAll('.layer-toggle:checked'))
                .map(cb => cb.value);
            filterMapByTypes(selectedTypes);
        });
    });
    
    // Search box
    const searchBox = document.getElementById('map-search');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            searchProjectsOnMap(e.target.value);
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('reset-map');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetMapView);
    }
    
    // Add Project on Map button
    const addProjectBtn = document.getElementById('add-project-on-map-btn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', startAddProjectOnMap);
    }
}

/**
 * Edit project from map popup
 */
function editProjectFromMap(projectId) {
    const project = getProjectById(projectId);
    if (!project) {
        showToast('Project not found', 'error');
        return;
    }
    
    showProjectForm(project);
}

/**
 * View project in table from map popup
 */
function viewProjectInTable(projectId) {
    switchView('database');
    // Highlight the row in table
    setTimeout(() => {
        const row = document.querySelector(`tr[data-project-id="${projectId}"]`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.backgroundColor = '#fef3c7';
            setTimeout(() => {
                row.style.backgroundColor = '';
            }, 2000);
        }
    }, 100);
}

/**
 * Update single marker (after edit)
 */
function updateMapMarker(projectId) {
    const project = getProjectById(projectId);
    if (!project) return;
    
    // Remove old marker or layer
    if (markers[projectId]) {
        markerClusterGroup.removeLayer(markers[projectId]);
        delete markers[projectId];
    }
    if (geoJSONLayers[projectId]) {
        map.removeLayer(geoJSONLayers[projectId]);
        delete geoJSONLayers[projectId];
    }
    
    // Add new marker or layer
    const layer = createMarker(project);
    if (project.geometry && project.geometry.type !== 'Point') {
        layer.addTo(map);
        geoJSONLayers[projectId] = layer;
    } else {
        markerClusterGroup.addLayer(layer);
        markers[projectId] = layer;
    }
}

/**
 * Remove marker from map
 */
function removeMapMarker(projectId) {
    if (markers[projectId]) {
        markerClusterGroup.removeLayer(markers[projectId]);
        delete markers[projectId];
    }
    if (geoJSONLayers[projectId]) {
        map.removeLayer(geoJSONLayers[projectId]);
        delete geoJSONLayers[projectId];
    }
}

/**
 * Import map data (GeoJSON or Shapefile)
 */
function importMapData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.geojson,.json,.shp,.zip';
    input.multiple = false;
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const fileName = file.name.toLowerCase();
        
        try {
            if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
                await importGeoJSON(file);
            } else if (fileName.endsWith('.shp') || fileName.endsWith('.zip')) {
                await importShapefile(file);
            } else {
                showToast('Unsupported file format. Please use GeoJSON (.geojson, .json) or Shapefile (.shp, .zip)', 'error');
            }
        } catch (error) {
            console.error('Error importing file:', error);
            showToast('Error importing file: ' + error.message, 'error');
        }
    };
    
    input.click();
}

/**
 * Import GeoJSON file
 */
async function importGeoJSON(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                processGeoJSONData(geojson);
                resolve();
            } catch (error) {
                reject(new Error('Invalid GeoJSON format'));
            }
        };
        
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

/**
 * Import Shapefile
 */
async function importShapefile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                // Use shpjs library to convert shapefile to GeoJSON
                const geojson = await shp(e.target.result);
                processGeoJSONData(geojson);
                resolve();
            } catch (error) {
                reject(new Error('Error parsing shapefile: ' + error.message));
            }
        };
        
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Process GeoJSON data and create projects
 */
function processGeoJSONData(geojson) {
    let features = [];
    
    // Handle different GeoJSON structures
    if (geojson.type === 'FeatureCollection') {
        features = geojson.features;
    } else if (geojson.type === 'Feature') {
        features = [geojson];
    } else if (Array.isArray(geojson)) {
        // Handle array of FeatureCollections
        geojson.forEach(fc => {
            if (fc.type === 'FeatureCollection') {
                features.push(...fc.features);
            }
        });
    } else {
        showToast('Unsupported GeoJSON structure', 'error');
        return;
    }
    
    let importedCount = 0;
    let errors = [];
    const existingProjects = loadProjects();
    
    features.forEach((feature, index) => {
        try {
            const props = feature.properties || {};
            const geometry = feature.geometry;
            
            // Calculate centroid for non-point geometries
            let coordinates;
            let centroid;
            
            if (geometry.type === 'Point') {
                coordinates = geometry.coordinates;
                centroid = coordinates;
            } else if (geometry.type === 'Polygon') {
                coordinates = geometry.coordinates;
                centroid = calculatePolygonCentroid(geometry.coordinates[0]);
            } else if (geometry.type === 'MultiPolygon') {
                coordinates = geometry.coordinates;
                centroid = calculatePolygonCentroid(geometry.coordinates[0][0]);
            } else if (geometry.type === 'LineString') {
                coordinates = geometry.coordinates;
                centroid = geometry.coordinates[Math.floor(geometry.coordinates.length / 2)];
            } else if (geometry.type === 'MultiLineString') {
                coordinates = geometry.coordinates;
                centroid = geometry.coordinates[0][Math.floor(geometry.coordinates[0].length / 2)];
            } else {
                throw new Error('Unsupported geometry type: ' + geometry.type);
            }
            
            const [longitude, latitude] = centroid;
            
            // Create project object with geometry data
            const projectData = {
                projectName: props.name || props.projectName || props.NAME || props.Project || `Imported Project ${index + 1}`,
                projectType: props.type || props.projectType || props.TYPE || props.category || 'Infrastructure',
                location: props.location || props.LOCATION || props.address || 'Unknown Location',
                latitude: latitude,
                longitude: longitude,
                status: props.status || props.STATUS || 'Planning',
                startDate: props.startDate || props.start_date || props.START_DATE || new Date().toISOString().split('T')[0],
                finishDate: props.finishDate || props.finish_date || props.FINISH_DATE || new Date().toISOString().split('T')[0],
                contractor: props.contractor || props.CONTRACTOR || props.company || 'Unknown Contractor',
                budget: props.budget || props.BUDGET || 0,
                description: props.description || props.DESCRIPTION || props.notes || '',
                geometry: geometry // Store original geometry
            };
            
            // Validate coordinates
            if (!isValidCoordinate(latitude, longitude)) {
                throw new Error('Invalid coordinates');
            }
            
            // Add project
            const newProject = {
                id: generateUUID(),
                ...projectData
            };
            existingProjects.push(newProject);
            
            importedCount++;
        } catch (error) {
            errors.push(`Feature ${index + 1}: ${error.message}`);
        }
    });
    
    if (importedCount > 0) {
        saveProjects(existingProjects);
        refreshAllViews();
        showToast(`Successfully imported ${importedCount} project(s)`, 'success');
    }
    
    if (errors.length > 0) {
        console.warn('Import errors:', errors);
        showToast(`${errors.length} feature(s) had errors`, 'warning');
    }
    
    if (importedCount === 0 && errors.length === 0) {
        showToast('No valid features found in file', 'warning');
    }
}

/**
 * Calculate polygon centroid
 */
function calculatePolygonCentroid(coordinates) {
    let totalX = 0;
    let totalY = 0;
    let count = coordinates.length;
    
    coordinates.forEach(coord => {
        totalX += coord[0];
        totalY += coord[1];
    });
    
    return [totalX / count, totalY / count];
}

/**
 * Export map data to GeoJSON
 */
function exportMapData() {
    const projects = loadProjects();
    
    if (projects.length === 0) {
        showToast('No projects to export', 'warning');
        return;
    }
    
    // Create GeoJSON FeatureCollection
    const geojson = {
        type: 'FeatureCollection',
        features: projects.map(project => ({
            type: 'Feature',
            // Use original geometry if available, otherwise create Point
            geometry: project.geometry || {
                type: 'Point',
                coordinates: [project.longitude, project.latitude]
            },
            properties: {
                id: project.id,
                projectName: project.projectName,
                projectType: project.projectType,
                location: project.location,
                status: project.status,
                startDate: project.startDate,
                finishDate: project.finishDate,
                contractor: project.contractor,
                budget: project.budget,
                description: project.description
            }
        }))
    };
    
    // Create download
    const dataStr = JSON.stringify(geojson, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projects_${Date.now()}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${projects.length} project(s) to GeoJSON`, 'success');
}

/**
 * Validate coordinate
 */
function isValidCoordinate(lat, lon) {
    return !isNaN(lat) && !isNaN(lon) && 
           lat >= -90 && lat <= 90 && 
           lon >= -180 && lon <= 180;
}

/* ===========================
   Temporary Layer Functions (No Database Import)
   =========================== */

/**
 * Create a styled GeoJSON layer for temporary layers
 */
function createStyledGeoJSONLayer(feature, style) {
    return L.geoJSON(feature, {
        style: {
            color: style.color || '#8b5cf6',
            fillColor: style.fillColor || style.color || '#8b5cf6',
            fillOpacity: style.fillOpacity || 0.2,
            weight: style.weight || 2,
            opacity: style.opacity || 1,
            dashArray: '5, 5' // Dashed line to indicate temporary
        },
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: style.fillColor || style.color || '#8b5cf6',
                color: '#ffffff',
                weight: 2,
                opacity: style.opacity || 1,
                fillOpacity: (style.fillOpacity || 0.2) * 3 // Slightly more opaque for points
            });
        },
        onEachFeature: (feature, layer) => {
            // Create popup with feature properties
            const props = feature.properties || {};
            let popupContent = `<div class="map-popup">
                <h3 style="color: ${style.color || '#8b5cf6'};"><i class="fas fa-layer-group"></i>Temporary Layer Feature</h3>`;
            
            // Display all properties
            if (Object.keys(props).length > 0) {
                popupContent += `<div class="popup-properties popup-scroll-content">`;
                Object.keys(props).forEach(key => {
                    if (props[key] !== null && props[key] !== undefined) {
                        popupContent += `<div class="popup-property">
                            <strong>${escapeHtml(key)}</strong>
                            <span>${escapeHtml(String(props[key]))}</span>
                        </div>`;
                    }
                });
                popupContent += `</div>`;
            } else {
                popupContent += `<p style="color: #9ca3af; font-size: 0.875rem; margin: 1rem 0;">No properties available</p>`;
            }
            
            popupContent += `<div class="popup-footer">
                <i class="fas fa-info-circle"></i> This is a temporary layer (not in database)
            </div></div>`;
            
            layer.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            });
        }
    });
}

/**
 * Save temporary layers metadata to localStorage
 */
function saveTemporaryLayersToStorage() {
    try {
        const layersData = Object.keys(temporaryLayers).map(layerId => {
            const layer = temporaryLayers[layerId];
            return {
                id: layer.id,
                name: layer.name,
                fileName: layer.fileName,
                featureCount: layer.featureCount,
                visible: layer.visible,
                addedDate: layer.addedDate,
                geojson: layer.geojson, // Store the original GeoJSON data
                style: layer.style || {
                    color: '#8b5cf6',
                    fillColor: '#8b5cf6',
                    fillOpacity: 0.2,
                    weight: 2,
                    opacity: 1
                }
            };
        });
        
        localStorage.setItem(STORAGE_KEYS.TEMPORARY_LAYERS, JSON.stringify(layersData));
        return true;
    } catch (error) {
        console.error('Error saving temporary layers:', error);
        if (error.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded. Cannot save temporary layers.', 'error');
        }
        return false;
    }
}

/**
 * Load temporary layers from localStorage
 */
function loadTemporaryLayersFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.TEMPORARY_LAYERS);
        if (!data) return [];
        
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading temporary layers:', error);
        return [];
    }
}

/**
 * Restore temporary layers when map initializes
 */
function restoreTemporaryLayers() {
    const savedLayers = loadTemporaryLayersFromStorage();
    
    if (savedLayers.length === 0) return;
    
    savedLayers.forEach(layerData => {
        try {
            // Restore the layer from saved GeoJSON
            addTemporaryLayerFromData(layerData);
        } catch (error) {
            console.error(`Error restoring layer ${layerData.name}:`, error);
        }
    });
    
    console.log(`Restored ${savedLayers.length} temporary layer(s) from storage`);
}

/**
 * Load temporary layer without saving to database
 */
function loadTemporaryLayer() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.geojson,.json,.shp,.zip';
    input.multiple = false;
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const fileName = file.name.toLowerCase();
        
        showLoading('Loading temporary layer...');
        
        try {
            let geojson;
            
            if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
                geojson = await loadGeoJSONFile(file);
            } else if (fileName.endsWith('.shp') || fileName.endsWith('.zip')) {
                geojson = await loadShapefileFile(file);
            } else {
                hideLoading();
                showToast('Unsupported file format. Please use GeoJSON (.geojson, .json) or Shapefile (.shp, .zip)', 'error');
                return;
            }
            
            // Add as temporary layer
            addTemporaryLayer(geojson, file.name);
            
            hideLoading();
            showToast(`Temporary layer "${file.name}" loaded successfully`, 'success');
        } catch (error) {
            console.error('Error loading temporary layer:', error);
            hideLoading();
            showToast('Error loading temporary layer: ' + error.message, 'error');
        }
    };
    
    input.click();
}

/**
 * Load GeoJSON file and return parsed data
 */
function loadGeoJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const geojson = JSON.parse(e.target.result);
                resolve(geojson);
            } catch (error) {
                reject(new Error('Invalid GeoJSON format'));
            }
        };
        
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

/**
 * Load Shapefile and convert to GeoJSON
 */
function loadShapefileFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                // Use shpjs library to convert shapefile to GeoJSON
                const geojson = await shp(e.target.result);
                resolve(geojson);
            } catch (error) {
                reject(new Error('Error parsing shapefile: ' + error.message));
            }
        };
        
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Add temporary layer to map
 */
function addTemporaryLayer(geojson, fileName) {
    temporaryLayerCounter++;
    const layerId = `temp_layer_${temporaryLayerCounter}`;
    const layerName = fileName.replace(/\.(geojson|json|shp|zip)$/i, '');
    
    // Normalize GeoJSON to FeatureCollection
    let normalizedGeoJSON;
    if (geojson.type === 'FeatureCollection') {
        normalizedGeoJSON = geojson;
    } else if (geojson.type === 'Feature') {
        normalizedGeoJSON = {
            type: 'FeatureCollection',
            features: [geojson]
        };
    } else if (Array.isArray(geojson)) {
        normalizedGeoJSON = {
            type: 'FeatureCollection',
            features: []
        };
        geojson.forEach(fc => {
            if (fc.type === 'FeatureCollection') {
                normalizedGeoJSON.features.push(...fc.features);
            }
        });
    } else {
        normalizedGeoJSON = {
            type: 'FeatureCollection',
            features: []
        };
    }
    
    // Create layer group for this temporary layer
    const layerGroup = L.layerGroup();
    
    let featureCount = 0;
    const defaultStyle = {
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.2,
        weight: 2,
        opacity: 1
    };
    
    // Add each feature to the layer group
    normalizedGeoJSON.features.forEach((feature, index) => {
        try {
            const geoJsonLayer = createStyledGeoJSONLayer(feature, defaultStyle);
            geoJsonLayer.addTo(layerGroup);
            featureCount++;
        } catch (error) {
            console.warn(`Error adding feature ${index}:`, error);
        }
    });
    
    // Add layer group to map
    layerGroup.addTo(map);
    
    // Store layer info with GeoJSON data
    temporaryLayers[layerId] = {
        id: layerId,
        name: layerName,
        fileName: fileName,
        layer: layerGroup,
        featureCount: featureCount,
        visible: true,
        addedDate: new Date().toISOString(),
        geojson: normalizedGeoJSON, // Store for persistence
        style: {
            color: '#8b5cf6',
            fillColor: '#8b5cf6',
            fillOpacity: 0.2,
            weight: 2,
            opacity: 1
        }
    };
    
    // Save to localStorage
    saveTemporaryLayersToStorage();
    
    // Fit map to layer bounds
    try {
        const bounds = layerGroup.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } catch (error) {
        console.warn('Could not fit bounds:', error);
    }
    
    // Update UI
    updateTemporaryLayersUI();
    
    console.log(`Temporary layer "${layerName}" added with ${featureCount} features`);
}

/**
 * Add temporary layer from stored data (for restoration)
 */
function addTemporaryLayerFromData(layerData) {
    const layerId = layerData.id;
    const layerName = layerData.name;
    
    // Create layer group for this temporary layer
    const layerGroup = L.layerGroup();
    
    let featureCount = 0;
    const layerStyle = layerData.style || {
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.2,
        weight: 2,
        opacity: 1
    };
    
    // Add each feature to the layer group
    if (layerData.geojson && layerData.geojson.features) {
        layerData.geojson.features.forEach((feature, index) => {
            try {
                const geoJsonLayer = createStyledGeoJSONLayer(feature, layerStyle);
                geoJsonLayer.addTo(layerGroup);
                featureCount++;
            } catch (error) {
                console.warn(`Error adding feature ${index}:`, error);
            }
        });
    }
    
    // Add layer group to map (only if visible)
    if (layerData.visible) {
        layerGroup.addTo(map);
    }
    
    // Store layer info
    temporaryLayers[layerId] = {
        id: layerId,
        name: layerName,
        fileName: layerData.fileName,
        layer: layerGroup,
        featureCount: featureCount,
        visible: layerData.visible,
        addedDate: layerData.addedDate,
        geojson: layerData.geojson,
        style: layerStyle
    };
    
    // Update counter to avoid ID conflicts
    const counterMatch = layerId.match(/temp_layer_(\d+)/);
    if (counterMatch) {
        const counter = parseInt(counterMatch[1]);
        if (counter >= temporaryLayerCounter) {
            temporaryLayerCounter = counter;
        }
    }
    
    // Update UI
    updateTemporaryLayersUI();
}

/**
 * Update temporary layers UI
 */
function updateTemporaryLayersUI() {
    const container = document.getElementById('temporary-layers-list');
    
    if (!container) return;
    
    const layerIds = Object.keys(temporaryLayers);
    
    if (layerIds.length === 0) {
        container.innerHTML = '<p style="font-size: 0.85em; color: #6b7280; margin: 0;">No temporary layers loaded</p>';
        return;
    }
    
    container.innerHTML = layerIds.map(layerId => {
        const layer = temporaryLayers[layerId];
        const visibleIcon = layer.visible ? 'fa-eye' : 'fa-eye-slash';
        const currentColor = layer.style?.color || '#8b5cf6';
        const currentOpacity = layer.style?.opacity || 1;
        const transparencyPercent = Math.round((1 - currentOpacity) * 100);
        
        return `
            <div class="temporary-layer-item" style="padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 8px; background: #f9fafb;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 0.9em; color: ${currentColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(layer.name)}">
                            ${escapeHtml(layer.name)}
                        </div>
                        <div style="font-size: 0.75em; color: #6b7280;">
                            ${layer.featureCount} feature(s)
                        </div>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button onclick="toggleTemporaryLayer('${layerId}')" 
                                class="icon-btn" 
                                title="${layer.visible ? 'Hide' : 'Show'} layer"
                                style="padding: 4px 8px; border: none; background: #e5e7eb; border-radius: 3px; cursor: pointer;">
                            <i class="fas ${visibleIcon}"></i>
                        </button>
                        <button onclick="removeTemporaryLayer('${layerId}')" 
                                class="icon-btn" 
                                title="Remove layer"
                                style="padding: 4px 8px; border: none; background: #fee2e2; color: #dc2626; border-radius: 3px; cursor: pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 6px;">
                        <label style="font-size: 0.8em; color: #6b7280; min-width: 40px;">Color:</label>
                        <input type="color" value="${currentColor}" 
                               onchange="updateTemporaryLayerColor('${layerId}', this.value)"
                               style="width: 30px; height: 20px; border: none; border-radius: 3px; cursor: pointer;">
                        <span style="font-size: 0.75em; color: #9ca3af;">${currentColor}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 3px;">
                        <label style="font-size: 0.8em; color: #6b7280; min-width: 40px;">Transp:</label>
                        <input type="range" min="0" max="90" value="${transparencyPercent}" 
                               onchange="updateTemporaryLayerTransparency('${layerId}', this.value)"
                               oninput="this.nextElementSibling.textContent = this.value + '%'"
                               style="flex: 1; height: 4px;">
                        <span style="font-size: 0.75em; color: #9ca3af; min-width: 30px;">${transparencyPercent}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Toggle temporary layer visibility
 */
function toggleTemporaryLayer(layerId) {
    const layer = temporaryLayers[layerId];
    
    if (!layer) return;
    
    if (layer.visible) {
        map.removeLayer(layer.layer);
        layer.visible = false;
    } else {
        layer.layer.addTo(map);
        layer.visible = true;
    }
    
    // Save to localStorage
    saveTemporaryLayersToStorage();
    
    updateTemporaryLayersUI();
}

/**
 * Remove temporary layer
 */
function removeTemporaryLayer(layerId) {
    const layer = temporaryLayers[layerId];
    
    if (!layer) return;
    
    // Remove from map
    if (map.hasLayer(layer.layer)) {
        map.removeLayer(layer.layer);
    }
    
    // Remove from storage
    delete temporaryLayers[layerId];
    
    // Save to localStorage
    saveTemporaryLayersToStorage();
    
    // Update UI
    updateTemporaryLayersUI();
    
    showToast(`Temporary layer "${layer.name}" removed`, 'success');
}

/**
 * Clear all temporary layers
 */
function clearAllTemporaryLayers() {
    Object.keys(temporaryLayers).forEach(layerId => {
        const layer = temporaryLayers[layerId];
        if (map.hasLayer(layer.layer)) {
            map.removeLayer(layer.layer);
        }
    });
    
    temporaryLayers = {};
    
    // Clear from localStorage
    saveTemporaryLayersToStorage();
    
    updateTemporaryLayersUI();
    
    showToast('All temporary layers removed', 'success');
}

/**
 * Update temporary layer color
 */
function updateTemporaryLayerColor(layerId, color) {
    const layer = temporaryLayers[layerId];
    
    if (!layer) return;
    
    // Update stored style
    layer.style.color = color;
    layer.style.fillColor = color;
    
    // Recreate the layer with new style
    recreateTemporaryLayer(layerId);
    
    // Save to localStorage
    saveTemporaryLayersToStorage();
    
    // Update UI to reflect changes
    updateTemporaryLayersUI();
}

/**
 * Update temporary layer transparency
 */
function updateTemporaryLayerTransparency(layerId, transparency) {
    const layer = temporaryLayers[layerId];
    
    if (!layer) return;
    
    // Convert transparency percentage to opacity (0-90% transparency -> 1.0-0.1 opacity)
    const opacity = Math.max(0.1, (100 - transparency) / 100);
    const fillOpacity = Math.max(0.05, opacity * 0.4); // Adjusted for better visibility
    
    // Update stored style
    layer.style.opacity = opacity;
    layer.style.fillOpacity = fillOpacity;
    
    // Recreate the layer with new style
    recreateTemporaryLayer(layerId);
    
    // Save to localStorage
    saveTemporaryLayersToStorage();
    
    // Update UI to reflect changes
    updateTemporaryLayersUI();
}

/**
 * Recreate a temporary layer with updated style
 */
function recreateTemporaryLayer(layerId) {
    const layer = temporaryLayers[layerId];
    
    if (!layer) return;
    
    const wasVisible = layer.visible;
    
    // Remove current layer from map
    if (map.hasLayer(layer.layer)) {
        map.removeLayer(layer.layer);
    }
    
    // Create new layer group
    const newLayerGroup = L.layerGroup();
    
    // Recreate features with new style
    if (layer.geojson && layer.geojson.features) {
        layer.geojson.features.forEach((feature, index) => {
            try {
                const geoJsonLayer = createStyledGeoJSONLayer(feature, layer.style);
                geoJsonLayer.addTo(newLayerGroup);
            } catch (error) {
                console.warn(`Error recreating feature ${index}:`, error);
            }
        });
    }
    
    // Update layer reference
    layer.layer = newLayerGroup;
    
    // Add back to map if it was visible
    if (wasVisible) {
        newLayerGroup.addTo(map);
    }
}

/* ===========================
   Map Tools - Drawing, Measuring, Export
   =========================== */

/**
 * Initialize map tools
 */
function initializeMapTools() {
    // Measure distance button
    document.getElementById('measure-distance-btn')?.addEventListener('click', startMeasureDistance);
    
    // Export map image button
    document.getElementById('export-map-image-btn')?.addEventListener('click', exportMapAsImage);
    
    // Clear drawings button
    document.getElementById('clear-drawings-btn')?.addEventListener('click', clearAllDrawings);
    
    // Geocoding
    document.getElementById('geocoding-btn')?.addEventListener('click', searchGeocode);
    document.getElementById('geocoding-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchGeocode();
    });
}

/**
 * Start measure distance
 */
function startMeasureDistance() {
    if (isMeasuring) {
        stopMeasurement();
        return;
    }
    
    isMeasuring = true;
    measurementMarkers = [];
    
    showToast('Click on map to measure distance. Click first point again to finish.', 'info');
    
    const btn = document.getElementById('measure-distance-btn');
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
    
    map.on('click', onMeasureDistanceClick);
}

/**
 * Handle distance measurement clicks
 */
function onMeasureDistanceClick(e) {
    measurementMarkers.push(e.latlng);
    
    // Add marker
    const marker = L.circleMarker(e.latlng, {
        radius: 5,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 1
    }).addTo(measurementLayer);
    
    if (measurementMarkers.length > 1) {
        // Draw line
        const line = L.polyline(measurementMarkers, {
            color: '#ef4444',
            weight: 3,
            dashArray: '5, 10'
        }).addTo(measurementLayer);
        
        // Calculate total distance
        let totalDistance = 0;
        for (let i = 1; i < measurementMarkers.length; i++) {
            totalDistance += measurementMarkers[i-1].distanceTo(measurementMarkers[i]);
        }
        
        // Format distance
        const distance = totalDistance > 1000 
            ? `${(totalDistance / 1000).toFixed(2)} km` 
            : `${totalDistance.toFixed(2)} m`;
        
        // Add label
        const midPoint = measurementMarkers[measurementMarkers.length - 1];
        L.marker(midPoint, {
            icon: L.divIcon({
                className: 'distance-label',
                html: `<div style="background: white;padding: 4px 60px 4px 12px;border-radius: 6px;border: 2px solid #ef4444;font-weight: bold;font-size: 12px;white-space: nowrap;margin-top: -36px;">${distance}</div>`,
                iconAnchor: [0, 0]
            })
        }).addTo(measurementLayer);
    }
}

/**
 * Stop measurement
 */
function stopMeasurement() {
    isMeasuring = false;
    measurementMarkers = [];
    
    map.off('click', onMeasureDistanceClick);
    
    // Reset button styles
    document.getElementById('measure-distance-btn')?.classList.remove('btn-primary');
    document.getElementById('measure-distance-btn')?.classList.add('btn-secondary');
}

/**
 * Export map as image
 */
async function exportMapAsImage() {
    showLoading('Exporting map image...');
    
    try {
        const mapElement = document.getElementById('map');
        
        // Use dom-to-image to capture the map
        const dataUrl = await domtoimage.toPng(mapElement, {
            width: mapElement.offsetWidth,
            height: mapElement.offsetHeight,
            style: {
                transform: 'scale(1)',
                transformOrigin: 'top left'
            }
        });
        
        // Create download link
        const link = document.createElement('a');
        link.download = `map_export_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        
        hideLoading();
        showToast('Map exported as image', 'success');
    } catch (error) {
        console.error('Export error:', error);
        hideLoading();
        showToast('Failed to export map image', 'error');
    }
}

/**
 * Clear all drawings and measurements
 */
function clearAllDrawings() {
    if (measurementLayer) {
        measurementLayer.clearLayers();
    }
    stopMeasurement();
    showToast('All measurements cleared', 'success');
}

/**
 * Search geocode (address search)
 */
async function searchGeocode() {
    const input = document.getElementById('geocoding-input');
    const query = input.value.trim();
    
    if (!query) {
        showToast('Please enter an address or place name', 'warning');
        return;
    }
    
    showLoading('Searching...');
    
    try {
        // Using Nominatim (OpenStreetMap) geocoding service
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        
        if (!response.ok) throw new Error('Geocoding failed');
        
        const results = await response.json();
        hideLoading();
        
        if (results.length === 0) {
            showToast('No results found', 'warning');
            return;
        }
        
        // Display results
        displayGeocodeResults(results);
    } catch (error) {
        console.error('Geocoding error:', error);
        hideLoading();
        showToast('Failed to search location', 'error');
    }
}

/**
 * Display geocoding results
 */
function displayGeocodeResults(results) {
    const resultsContainer = document.getElementById('geocoding-results');
    
    resultsContainer.innerHTML = results.map((result, index) => `
        <div class="geocoding-result-item" onclick="selectGeocodeResult(${index})">
            <div class="geocoding-result-name">${escapeHtml(result.display_name.split(',')[0])}</div>
            <div class="geocoding-result-address">${escapeHtml(result.display_name)}</div>
        </div>
    `).join('');
    
    resultsContainer.classList.add('active');
    
    // Store results temporarily
    window.geocodeResults = results;
    
    // Close results when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeGeocodeResults);
    }, 100);
}

/**
 * Select geocode result
 */
function selectGeocodeResult(index) {
    const result = window.geocodeResults[index];
    
    // Zoom to location
    map.setView([parseFloat(result.lat), parseFloat(result.lon)], 15);
    
    // Add temporary marker
    const marker = L.marker([parseFloat(result.lat), parseFloat(result.lon)], {
        icon: L.divIcon({
            className: 'geocode-marker',
            html: '<div style="background: #ef4444; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map);
    
    marker.bindPopup(`
        <div class="map-popup">
            <h3><i class="fas fa-map-pin"></i>Search Result</h3>
            <div class="popup-properties">
                <div class="popup-property">
                    <strong>Location</strong>
                    <span>${escapeHtml(result.display_name)}</span>
                </div>
            </div>
            <div class="popup-footer">
                <i class="fas fa-clock"></i> This marker will disappear in 10 seconds
            </div>
        </div>
    `).openPopup();
    
    // Remove marker after 10 seconds
    setTimeout(() => marker.remove(), 10000);
    
    closeGeocodeResults();
    showToast('Location found', 'success');
}

/**
 * Close geocode results
 */
function closeGeocodeResults() {
    const resultsContainer = document.getElementById('geocoding-results');
    resultsContainer.classList.remove('active');
    document.removeEventListener('click', closeGeocodeResults);
}


// ===========================
// Add Project Directly on Map
// ===========================

/**
 * Start add project on map mode
 */
function startAddProjectOnMap() {
    if (!map) {
        showToast('Map not initialized', 'error');
        return;
    }
    
    // Cancel if already in adding mode
    if (isAddingProject) {
        cancelAddProjectOnMap();
        return;
    }
    
    isAddingProject = true;
    
    // Update button state
    const btn = document.getElementById('add-project-on-map-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-times"></i> Cancel Adding';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-warning');
    }
    
    // Change cursor
    document.getElementById('map').style.cursor = 'crosshair';
    
    // Show instructions
    showToast('Click on the map to place a new project', 'info', 5000);
    
    // Add click listener
    map.on('click', onAddProjectMapClick);
}

/**
 * Handle map click when adding project
 */
function onAddProjectMapClick(e) {
    if (!isAddingProject) return;
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Remove previous temp marker if exists
    if (tempProjectMarker) {
        map.removeLayer(tempProjectMarker);
    }
    
    // Add temporary marker
    tempProjectMarker = L.marker([lat, lng], {
        icon: createCustomIcon('#3b82f6'),
        draggable: false
    }).addTo(map);
    
    // Cancel adding mode
    cancelAddProjectOnMap();
    
    // Show project form with pre-filled coordinates
    showAddProjectFormWithCoordinates(lat, lng);
}

/**
 * Cancel add project on map mode
 */
function cancelAddProjectOnMap() {
    isAddingProject = false;
    
    // Reset button
    const btn = document.getElementById('add-project-on-map-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Add Project on Map';
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-primary');
    }
    
    // Reset cursor
    document.getElementById('map').style.cursor = '';
    
    // Remove click listener
    map.off('click', onAddProjectMapClick);
}

/**
 * Show add project form with pre-filled coordinates
 */
function showAddProjectFormWithCoordinates(lat, lng) {
    const existingTypes = getAllProjectTypes();
    
    const content = `
        <form id="project-form">
            <div class="form-group">
                <label>Project Name <span class="required">*</span></label>
                <input type="text" id="project-name" required autofocus>
                <div class="form-error" id="error-projectName"></div>
            </div>
            
            <div class="form-group">
                <label>Project Type <span class="required">*</span></label>
                <input type="text" id="project-type" list="project-types-list" placeholder="Enter or select project type..." required>
                <datalist id="project-types-list">
                    ${existingTypes.map(type => `<option value="${escapeHtml(type)}">`).join('')}
                </datalist>
                <small style="color: var(--text-light); font-size: 0.75rem;">Type a new category or select from existing ones</small>
                <div class="form-error" id="error-projectType"></div>
            </div>
            
            <div class="form-group">
                <label>Location <span class="required">*</span></label>
                <input type="text" id="project-location" required>
                <div class="form-error" id="error-location"></div>
            </div>
            
            <div class="form-group">
                <label>Coordinates <span class="required">*</span></label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div>
                        <label style="font-size: 0.75rem; color: var(--text-light);">Latitude</label>
                        <input type="number" step="any" id="project-latitude" value="${lat.toFixed(6)}" required>
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; color: var(--text-light);">Longitude</label>
                        <input type="number" step="any" id="project-longitude" value="${lng.toFixed(6)}" required>
                    </div>
                </div>
                <small style="color: #3b82f6; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem;">
                    <i class="fas fa-map-marker-alt"></i> Location set from map click
                </small>
                <div class="form-error" id="error-latitude"></div>
                <div class="form-error" id="error-longitude"></div>
            </div>
            
            <div class="form-group">
                <label>Status <span class="required">*</span></label>
                <select id="project-status" required>
                    <option value="">Select status...</option>
                    <option value="Planning" selected>Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
                <div class="form-error" id="error-status"></div>
            </div>
            
            <div class="form-group">
                <label>Start Date <span class="required">*</span></label>
                <input type="date" id="project-start-date" required>
                <div class="form-error" id="error-startDate"></div>
            </div>
            
            <div class="form-group">
                <label>Finish Date</label>
                <input type="date" id="project-finish-date">
                <div class="form-error" id="error-finishDate"></div>
            </div>
            
            <div class="form-group">
                <label>Contractor/Vendor <span class="required">*</span></label>
                <input type="text" id="project-contractor" required>
                <div class="form-error" id="error-contractor"></div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="cancelAddProjectForm()">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Project</button>
            </div>
        </form>
    `;
    
    showModal('Add New Project', content);
    
    // Focus on project name
    setTimeout(() => {
        document.getElementById('project-name')?.focus();
    }, 100);
    
    // Handle form submission
    document.getElementById('project-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true);
        
        const projectData = {
            projectName: document.getElementById('project-name').value,
            projectType: document.getElementById('project-type').value,
            location: document.getElementById('project-location').value,
            latitude: document.getElementById('project-latitude').value,
            longitude: document.getElementById('project-longitude').value,
            status: document.getElementById('project-status').value,
            startDate: document.getElementById('project-start-date').value,
            finishDate: document.getElementById('project-finish-date').value,
            contractor: document.getElementById('project-contractor').value
        };
        
        // Clear previous errors
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        
        setTimeout(() => {
            const result = addProject(projectData);
            
            setButtonLoading(submitBtn, false);
            
            if (result.success) {
                // Remove temp marker
                if (tempProjectMarker) {
                    map.removeLayer(tempProjectMarker);
                    tempProjectMarker = null;
                }
                
                hideModal();
                refreshAllViews();
                
                // Show success and pan to new marker
                showToast('Project added successfully!', 'success');
                
                // Pan to the new project
                setTimeout(() => {
                    map.setView([parseFloat(projectData.latitude), parseFloat(projectData.longitude)], 13);
                }, 500);
            } else if (result.errors) {
                // Show errors
                Object.keys(result.errors).forEach(field => {
                    const errorEl = document.getElementById(`error-${field}`);
                    if (errorEl) {
                        errorEl.textContent = result.errors[field];
                    }
                });
                if (result.errors.general) {
                    showToast(result.errors.general, 'error');
                }
            }
        }, 300);
    });
}

/**
 * Cancel add project form and clean up
 */
function cancelAddProjectForm() {
    // Remove temp marker
    if (tempProjectMarker) {
        map.removeLayer(tempProjectMarker);
        tempProjectMarker = null;
    }
    
    hideModal();
}
