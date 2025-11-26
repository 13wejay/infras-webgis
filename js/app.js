// ===========================
// Main Application Controller
// ===========================

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('WebGIS Application Starting...');
    
    // Show initial loading
    showLoading('Initializing application...');
    
    // Initialize all modules with a slight delay for smooth loading
    setTimeout(() => {
        initializeApp();
        
        // Setup global event listeners
        setupGlobalListeners();
        
        hideLoading();
        console.log('WebGIS Application Ready!');
        
        // Show welcome message
        showToast('Welcome to Infrastructure WebGIS', 'info');
    }, 500);
});

/**
 * Initialize application
 */
function initializeApp() {
    // Initialize map (lazy - only when map view is active)
    // Map will be initialized on first view switch
    
    // Initialize table view
    initTableView();
    
    // Initialize reports view
    initReportsView();
    
    // Set initial view (map view)
    switchView('map');
}

/**
 * Global event listeners
 */
function setupGlobalListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Map controls toggle
    const mapControlsToggle = document.getElementById('map-controls-toggle');
    if (mapControlsToggle) {
        mapControlsToggle.addEventListener('click', () => {
            const mapControls = document.querySelector('.map-controls');
            mapControls.classList.toggle('collapsed');
        });
    }
    
    // Modal close button
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', hideModal);
    }
    
    // Modal backdrop click to close
    const modalBackdrop = document.querySelector('.modal-backdrop');
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', hideModal);
    }
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modal');
            if (modal && modal.classList.contains('active')) {
                hideModal();
            }
        }
    });
    
    // Prevent form submissions from reloading page
    document.addEventListener('submit', (e) => {
        if (e.target.tagName === 'FORM') {
            e.preventDefault();
        }
    });
}

/**
 * Switch between main views
 */
function switchView(viewName) {
    showProgress();
    updateProgress(20);
    
    // Hide all views
    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.remove('active');
    });
    updateProgress(40);
    
    // Show selected view
    const selectedView = document.getElementById(`${viewName}-view`);
    if (selectedView) {
        selectedView.classList.add('active');
    }
    updateProgress(60);
    
    // Update navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-view') === viewName);
    });
    updateProgress(70);
    
    // Initialize map if switching to map view for the first time
    if (viewName === 'map' && !map) {
        setTimeout(() => initMap(), 150); // Small delay to ensure DOM is ready
    }
    updateProgress(85);
    
    // Refresh view data
    if (viewName === 'database') {
        refreshTableView();
    } else if (viewName === 'reports') {
        refreshReportsView();
    } else if (viewName === 'analytics') {
        if (typeof initAnalytics === 'function') {
            initAnalytics();
        }
    } else if (viewName === 'scheduling') {
        if (typeof initSchedulingView === 'function') {
            initSchedulingView();
        }
    }
    
    updateProgress(100);
    setTimeout(hideProgress, 300);
}

/**
 * Refresh all views after data change
 */
function refreshAllViews() {
    // Refresh map markers
    if (map) {
        populateLayerControls();
        refreshMapMarkers();
    }
    
    // Refresh table
    refreshTableView();
    
    // Refresh reports
    refreshReportsView();
    
    // Refresh analytics
    if (typeof refreshAnalytics === 'function') {
        refreshAnalytics();
    }
    
    // Refresh scheduling
    if (typeof refreshScheduling === 'function') {
        refreshScheduling();
    }
}

/**
 * Handle window resize
 */
window.addEventListener('resize', debounce(() => {
    if (map) {
        map.invalidateSize();
    }
}, 250));

/**
 * Handle online/offline events
 */
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showToast('You are offline. Changes will be saved locally.', 'warning');
});

/**
 * Warn user before leaving if there are unsaved changes
 */
let hasUnsavedChanges = false;

window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

/**
 * Check localStorage usage
 */
function checkStorageUsage() {
    if (typeof navigator.storage !== 'undefined' && navigator.storage.estimate) {
        navigator.storage.estimate().then(estimate => {
            const percentUsed = (estimate.usage / estimate.quota * 100).toFixed(2);
            console.log(`Storage used: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB of ${(estimate.quota / 1024 / 1024).toFixed(2)} MB (${percentUsed}%)`);
            
            if (percentUsed > 80) {
                showToast('Storage is almost full. Consider deleting old data or attachments.', 'warning');
            }
        });
    }
}

// Check storage usage on load
setTimeout(checkStorageUsage, 2000);

/**
 * Global error handler
 */
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('An unexpected error occurred. Please refresh the page.', 'error');
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('An error occurred processing your request.', 'error');
});

/**
 * Export app state for backup
 */
function exportAppData() {
    const data = {
        projects: loadProjects(),
        reports: loadReports(),
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `webgis_backup_${Date.now()}.json`, 'application/json');
    showToast('App data exported successfully', 'success');
}

/**
 * Import app state from backup
 */
function importAppData() {
    const content = `
        <div class="form-group">
            <label>Select Backup File (JSON)</label>
            <input type="file" id="backup-file" accept=".json">
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
            <button type="button" class="btn btn-primary" id="import-backup-btn" disabled>Import</button>
        </div>
    `;
    
    showModal('Import App Data', content);
    
    const fileInput = document.getElementById('backup-file');
    const importBtn = document.getElementById('import-backup-btn');
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.projects && data.reports) {
                importBtn.disabled = false;
                importBtn.onclick = () => {
                    if (confirm('This will replace all current data. Are you sure?')) {
                        localStorage.setItem('webgis_projects', JSON.stringify(data.projects));
                        localStorage.setItem('webgis_reports', JSON.stringify(data.reports));
                        hideModal();
                        showToast('Data imported successfully. Refreshing...', 'success');
                        setTimeout(() => location.reload(), 1500);
                    }
                };
            } else {
                showToast('Invalid backup file format', 'error');
            }
        } catch (error) {
            showToast('Error reading backup file: ' + error.message, 'error');
        }
    });
}

/**
 * Clear all app data
 */
function clearAllData() {
    showConfirmDialog(
        'Are you sure you want to delete ALL projects and reports? This action cannot be undone!',
        () => {
            localStorage.removeItem('webgis_projects');
            localStorage.removeItem('webgis_reports');
            showToast('All data cleared. Refreshing...', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    );
}

/**
 * Show app info
 */
function showAppInfo() {
    const projects = loadProjects();
    const reports = loadReports();
    
    const content = `
        <div style="padding: 1rem;">
            <h3 style="margin-bottom: 1rem;">WebGIS - Infrastructure Project Management</h3>
            <p style="margin-bottom: 1rem;">A comprehensive web-based GIS application for managing infrastructure projects.</p>
            
            <div style="background: var(--background); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <h4 style="margin-bottom: 0.5rem;">Statistics</h4>
                <p><strong>Total Projects:</strong> ${projects.length}</p>
                <p><strong>Total Reports:</strong> ${reports.length}</p>
                <p><strong>Version:</strong> 1.0</p>
            </div>
            
            <div style="background: var(--background); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <h4 style="margin-bottom: 0.5rem;">Features</h4>
                <ul style="padding-left: 1.5rem;">
                    <li>Interactive map with project markers</li>
                    <li>Database management with filtering</li>
                    <li>Import/Export (CSV, Excel, GeoJSON)</li>
                    <li>Report management with attachments</li>
                    <li>PDF export for reports</li>
                    <li>Offline support with localStorage</li>
                </ul>
            </div>
            
            <div style="background: var(--background); padding: 1rem; border-radius: 0.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Data Management</h4>
                <button class="btn btn-secondary" onclick="exportAppData(); hideModal();" style="margin-right: 0.5rem;">
                    <i class="fas fa-download"></i> Backup Data
                </button>
                <button class="btn btn-secondary" onclick="hideModal(); setTimeout(() => importAppData(), 100);">
                    <i class="fas fa-upload"></i> Restore Data
                </button>
            </div>
        </div>
    `;
    
    showModal('About WebGIS', content);
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: New project (when in database view)
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        const activeView = document.querySelector('.view-container.active');
        if (activeView && activeView.id === 'database-view') {
            e.preventDefault();
            showProjectForm();
        }
    }
    
    // Ctrl/Cmd + I: Show app info
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        showAppInfo();
    }
});

// Log welcome message
console.log('%c WebGIS Application ', 'background: #2563eb; color: white; font-size: 16px; padding: 5px 10px; border-radius: 3px;');
console.log('Version: 1.3.1');
console.log('Keyboard Shortcuts:');
console.log('  Ctrl/Cmd + N : New Project (in Database view)');
console.log('  Ctrl/Cmd + I : App Info');
console.log('  Escape       : Close Modal');
