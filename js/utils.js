// ===========================
// Utility Functions
// ===========================

/**
 * Generate a unique UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateISO(date) {
    if (!date) return '';
    if (typeof date === 'string') return date;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Validate coordinates
 */
function validateCoordinates(lat, lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
        return { valid: false, message: 'Coordinates must be numbers' };
    }
    
    if (latitude < -90 || latitude > 90) {
        return { valid: false, message: 'Latitude must be between -90 and 90' };
    }
    
    if (longitude < -180 || longitude > 180) {
        return { valid: false, message: 'Longitude must be between -180 and 180' };
    }
    
    return { valid: true, latitude, longitude };
}

/**
 * Validate project data
 */
function validateProjectData(data) {
    const errors = {};
    
    // Project Name
    if (!data.projectName || data.projectName.trim().length < 3) {
        errors.projectName = 'Project name must be at least 3 characters';
    } else if (data.projectName.length > 100) {
        errors.projectName = 'Project name must be less than 100 characters';
    }
    
    // Project Type - now accepts any non-empty string
    if (!data.projectType || data.projectType.trim().length === 0) {
        errors.projectType = 'Project type is required';
    } else if (data.projectType.length > 50) {
        errors.projectType = 'Project type must be less than 50 characters';
    }
    
    // Location
    if (!data.location || data.location.trim().length < 5) {
        errors.location = 'Location must be at least 5 characters';
    } else if (data.location.length > 200) {
        errors.location = 'Location must be less than 200 characters';
    }
    
    // Coordinates
    const coordValidation = validateCoordinates(data.latitude, data.longitude);
    if (!coordValidation.valid) {
        errors.coordinates = coordValidation.message;
    }
    
    // Status
    const validStatuses = ['Planning', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];
    if (!data.status || !validStatuses.includes(data.status)) {
        errors.status = 'Please select a valid status';
    }
    
    // Start Date
    if (!data.startDate) {
        errors.startDate = 'Start date is required';
    }
    
    // Finish Date (optional but must be after start date)
    if (data.finishDate && data.startDate) {
        if (new Date(data.finishDate) < new Date(data.startDate)) {
            errors.finishDate = 'Finish date must be after start date';
        }
    }
    
    // Contractor
    if (!data.contractor || data.contractor.trim().length < 2) {
        errors.contractor = 'Contractor name must be at least 2 characters';
    } else if (data.contractor.length > 100) {
        errors.contractor = 'Contractor name must be less than 100 characters';
    }
    
    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Validate report data
 */
function validateReportData(data) {
    const errors = {};
    
    if (!data.title || data.title.trim().length < 3) {
        errors.title = 'Title must be at least 3 characters';
    }
    
    if (!data.date) {
        errors.date = 'Date is required';
    }
    
    if (!data.author || data.author.trim().length < 2) {
        errors.author = 'Author name must be at least 2 characters';
    }
    
    if (!data.description || data.description.trim().length < 10) {
        errors.description = 'Description must be at least 10 characters';
    }
    
    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Debounce function
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Convert file to Base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get status class for styling
 */
function getStatusClass(status) {
    const statusMap = {
        'Completed': 'status-completed',
        'In Progress': 'status-in-progress',
        'Planning': 'status-planning',
        'On Hold': 'status-on-hold',
        'Cancelled': 'status-cancelled'
    };
    return statusMap[status] || 'status-planning';
}

/**
 * Get marker color based on status
 */
function getMarkerColor(status) {
    const colorMap = {
        'Completed': '#10b981',
        'In Progress': '#2563eb',
        'Planning': '#f59e0b',
        'On Hold': '#ef4444',
        'Cancelled': '#051533ff'
    };
    return colorMap[status] || '#f59e0b';
}

/**
 * Get project type icon
 */
function getProjectTypeIcon(type) {
    const iconMap = {
        'Road': 'fa-road',
        'Bridge': 'fa-bridge',
        'Building': 'fa-building',
        'Water': 'fa-water',
        'Power': 'fa-bolt',
        'Telecommunications': 'fa-broadcast-tower',
        'Other': 'fa-project-diagram'
    };
    return iconMap[type] || 'fa-project-diagram';
}

/**
 * Download file
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Parse CSV content (handles quoted values)
 */
function parseCSV(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return { headers: [], data: [] };
    
    // Parse CSV line handling quoted values
    function parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    
    const headers = parseLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    console.log('CSV parsed:', { headers, rowCount: data.length });
    return { headers, data };
}

/**
 * Convert array to CSV
 */
function arrayToCSV(data, headers) {
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') ? `"${escaped}"` : escaped;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

/**
 * Convert projects to GeoJSON
 */
function projectsToGeoJSON(projects) {
    const features = projects.map(project => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [parseFloat(project.longitude), parseFloat(project.latitude)]
        },
        properties: {
            id: project.id,
            projectName: project.projectName,
            projectType: project.projectType,
            location: project.location,
            status: project.status,
            startDate: project.startDate,
            finishDate: project.finishDate,
            contractor: project.contractor
        }
    }));
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <div class="toast-message">${escapeHtml(message)}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Show modal
 */
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.classList.add('active');
}

/**
 * Hide modal
 */
function hideModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    
    // Clean up temp project marker if exists
    if (typeof tempProjectMarker !== 'undefined' && tempProjectMarker && typeof map !== 'undefined' && map) {
        map.removeLayer(tempProjectMarker);
        tempProjectMarker = null;
    }
}

/**
 * Show confirmation dialog
 */
function showConfirmDialog(message, onConfirm) {
    const content = `
        <p>${escapeHtml(message)}</p>
        <div class="form-actions">
            <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button class="btn btn-danger" id="confirm-btn">Confirm</button>
        </div>
    `;
    
    showModal('Confirm Action', content);
    
    document.getElementById('confirm-btn').addEventListener('click', () => {
        hideModal();
        onConfirm();
    });
    
    document.getElementById('cancel-btn').addEventListener('click', hideModal);
}

/* ===========================
   Loading Indicators
   =========================== */

/**
 * Show loading overlay
 */
function showLoading(text = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = text;
    if (overlay) overlay.classList.add('active');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Show progress bar
 */
function showProgress() {
    const container = document.getElementById('progress-bar-container');
    if (container) container.classList.add('active');
}

/**
 * Update progress bar
 */
function updateProgress(percent) {
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

/**
 * Hide progress bar
 */
function hideProgress() {
    const container = document.getElementById('progress-bar-container');
    const bar = document.getElementById('progress-bar');
    if (container) container.classList.remove('active');
    if (bar) bar.style.width = '0%';
}

/**
 * Add loading state to button
 */
function setButtonLoading(button, loading = true) {
    if (!button) return;
    
    if (loading) {
        button.disabled = true;
        button.classList.add('btn-loading');
        button.setAttribute('data-original-text', button.innerHTML);
        button.innerHTML = '<span style="opacity: 0;">Loading...</span>';
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
            button.removeAttribute('data-original-text');
        }
    }
}

/**
 * Simulate async operation with loading
 */
async function withLoading(asyncFunc, loadingText = 'Processing...') {
    showLoading(loadingText);
    try {
        const result = await asyncFunc();
        return result;
    } finally {
        hideLoading();
    }
}

/**
 * Simulate async operation with progress
 */
async function withProgress(asyncFunc, steps = []) {
    showProgress();
    try {
        const result = await asyncFunc((step) => {
            const index = steps.indexOf(step);
            if (index !== -1) {
                updateProgress((index + 1) / steps.length * 100);
            }
        });
        updateProgress(100);
        setTimeout(hideProgress, 500);
        return result;
    } catch (error) {
        hideProgress();
        throw error;
    }
}

