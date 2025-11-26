// ===========================
// Scheduling Handler - Gantt Chart
// ===========================

let ganttChart = null;
let currentViewMode = 'Week';
let schedulingFilters = {
    types: [],
    statuses: [],
    contractor: '',
    dateFrom: '',
    dateTo: ''
};

/**
 * Initialize Scheduling View
 */
function initSchedulingView() {
    console.log('Initializing Scheduling View...');
    
    // Populate filter dropdowns
    populateSchedulingFilters();
    
    // Setup event listeners
    setupSchedulingEventListeners();
    
    // Initialize Gantt chart
    initGanttChart();
    
    console.log('Scheduling View initialized');
}

/**
 * Populate filter options
 */
function populateSchedulingFilters() {
    // Populate project types
    const typeFilter = document.getElementById('scheduling-type-filter');
    if (typeFilter) {
        const types = getAllProjectTypes();
        typeFilter.innerHTML = types.map(type => 
            `<option value="${type}">${type}</option>`
        ).join('');
    }
}

/**
 * Setup event listeners
 */
function setupSchedulingEventListeners() {
    // Filter toggle
    const filterToggle = document.getElementById('scheduling-filter-toggle');
    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            const filterContent = filterToggle.nextElementSibling;
            const isVisible = filterContent.style.display !== 'none';
            filterContent.style.display = isVisible ? 'none' : 'block';
            filterToggle.classList.toggle('active', !isVisible);
        });
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('scheduling-apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applySchedulingFilters);
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('scheduling-clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearSchedulingFilters);
    }
    
    // View mode buttons
    document.querySelectorAll('.gantt-controls-right .btn[data-view-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewMode = btn.getAttribute('data-view-mode');
            changeGanttViewMode(viewMode);
            
            // Update active button
            document.querySelectorAll('.gantt-controls-right .btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

/**
 * Initialize Gantt Chart
 */
function initGanttChart() {
    const ganttContainer = document.getElementById('gantt-chart');
    if (!ganttContainer) {
        console.error('Gantt container not found');
        return;
    }
    
    // Get project data and convert to Gantt tasks
    const tasks = getGanttTasks();
    
    if (tasks.length === 0) {
        ganttContainer.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No projects to display</p><p class="empty-state-hint">Add projects in the Database view to see them here</p></div>';
        updateProjectCount(0);
        return;
    }
    
    // Clear container
    ganttContainer.innerHTML = '';
    
    // Create Gantt chart
    try {
        ganttChart = new Gantt(ganttContainer, tasks, {
            view_mode: currentViewMode,
            bar_height: 30,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            date_format: 'YYYY-MM-DD',
            language: 'en',
            custom_popup_html: function(task) {
                const project = getProjectById(task.id);
                if (!project) return '';
                
                return `
                    <div class="gantt-popup">
                        <h4>${task.name}</h4>
                        <p><strong>Type:</strong> ${project.projectType}</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span></p>
                        <p><strong>Location:</strong> ${project.location}</p>
                        <p><strong>Contractor:</strong> ${project.contractor}</p>
                        <p><strong>Start:</strong> ${formatDate(task.start)}</p>
                        <p><strong>End:</strong> ${formatDate(task.end)}</p>
                        <p><strong>Progress:</strong> ${task.progress}%</p>
                        <p class="gantt-popup-hint">Click to view details</p>
                    </div>
                `;
            },
            on_click: function(task) {
                // Open project detail modal
                const project = getProjectById(task.id);
                if (project) {
                    showProjectDetailModal(project);
                }
            },
            on_date_change: function(task, start, end) {
                // Handle date changes if needed (would update project dates)
                console.log('Date changed:', task, start, end);
            },
            on_progress_change: function(task, progress) {
                // Handle progress changes if needed
                console.log('Progress changed:', task, progress);
            }
        });
        
        // Apply custom colors to bars based on status
        applyGanttBarColors();
        
        // Adjust label positions to left
        adjustBarLabelPositions();
        
        // Update project count
        updateProjectCount(tasks.length);
        
    } catch (error) {
        console.error('Error initializing Gantt chart:', error);
        ganttContainer.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading Gantt chart</p></div>';
    }
}

/**
 * Get Gantt tasks from projects
 */
function getGanttTasks() {
    const projects = loadProjects();
    const filteredProjects = applyFiltersToProjects(projects);
    
    // Convert projects to Gantt tasks
    const tasks = filteredProjects.map(project => {
        // Calculate progress based on status
        let progress = 0;
        switch (project.status) {
            case 'Completed':
                progress = 100;
                break;
            case 'In Progress':
                progress = 50;
                break;
            case 'Planning':
                progress = 0;
                break;
            case 'On Hold':
                progress = 10;
                break;
            case 'Cancelled':
                progress = 0;
                break;
            default:
                progress = 0;
        }
        
        // Ensure dates are valid
        let startDate = project.startDate || new Date().toISOString().split('T')[0];
        let endDate = project.finishDate || calculateEndDate(startDate);
        
        // If end date is before start date, adjust it
        if (new Date(endDate) < new Date(startDate)) {
            endDate = calculateEndDate(startDate);
        }
        
        return {
            id: project.id,
            name: project.projectName,
            start: startDate,
            end: endDate,
            progress: progress,
            custom_class: `status-${project.status.toLowerCase().replace(' ', '-')}`,
            dependencies: '' // Can be extended for project dependencies
        };
    });
    
    return tasks;
}

/**
 * Calculate end date if not provided (default 30 days)
 */
function calculateEndDate(startDate) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
}

/**
 * Apply filters to projects
 */
function applyFiltersToProjects(projects) {
    return projects.filter(project => {
        // Filter by project type
        if (schedulingFilters.types.length > 0) {
            if (!schedulingFilters.types.includes(project.projectType)) {
                return false;
            }
        }
        
        // Filter by status
        if (schedulingFilters.statuses.length > 0) {
            if (!schedulingFilters.statuses.includes(project.status)) {
                return false;
            }
        }
        
        // Filter by contractor
        if (schedulingFilters.contractor) {
            if (!project.contractor.toLowerCase().includes(schedulingFilters.contractor.toLowerCase())) {
                return false;
            }
        }
        
        // Filter by date range
        if (schedulingFilters.dateFrom) {
            const projectStart = new Date(project.startDate);
            const filterStart = new Date(schedulingFilters.dateFrom);
            if (projectStart < filterStart) {
                return false;
            }
        }
        
        if (schedulingFilters.dateTo) {
            const projectEnd = new Date(project.finishDate || project.startDate);
            const filterEnd = new Date(schedulingFilters.dateTo);
            if (projectEnd > filterEnd) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * Apply scheduling filters
 */
function applySchedulingFilters() {
    // Get selected types
    const typeFilter = document.getElementById('scheduling-type-filter');
    schedulingFilters.types = Array.from(typeFilter.selectedOptions).map(opt => opt.value);
    
    // Get selected statuses
    const statusFilter = document.getElementById('scheduling-status-filter');
    schedulingFilters.statuses = Array.from(statusFilter.selectedOptions).map(opt => opt.value);
    
    // Get contractor
    const contractorFilter = document.getElementById('scheduling-contractor-filter');
    schedulingFilters.contractor = contractorFilter.value.trim();
    
    // Get date range
    const dateFromFilter = document.getElementById('scheduling-date-from');
    schedulingFilters.dateFrom = dateFromFilter.value;
    
    const dateToFilter = document.getElementById('scheduling-date-to');
    schedulingFilters.dateTo = dateToFilter.value;
    
    // Update filter results text
    const filterResults = document.getElementById('scheduling-filter-results');
    const activeFilterCount = 
        schedulingFilters.types.length +
        schedulingFilters.statuses.length +
        (schedulingFilters.contractor ? 1 : 0) +
        (schedulingFilters.dateFrom ? 1 : 0) +
        (schedulingFilters.dateTo ? 1 : 0);
    
    if (activeFilterCount > 0) {
        filterResults.textContent = `${activeFilterCount} filter(s) active`;
        filterResults.style.display = 'inline';
    } else {
        filterResults.style.display = 'none';
    }
    
    // Refresh Gantt chart with filters
    initGanttChart();
    
    showToast('Filters applied', 'success');
}

/**
 * Clear scheduling filters
 */
function clearSchedulingFilters() {
    schedulingFilters = {
        types: [],
        statuses: [],
        contractor: '',
        dateFrom: '',
        dateTo: ''
    };
    
    // Clear form fields
    document.getElementById('scheduling-type-filter').selectedIndex = -1;
    document.getElementById('scheduling-status-filter').selectedIndex = -1;
    document.getElementById('scheduling-contractor-filter').value = '';
    document.getElementById('scheduling-date-from').value = '';
    document.getElementById('scheduling-date-to').value = '';
    
    // Clear filter results text
    const filterResults = document.getElementById('scheduling-filter-results');
    filterResults.style.display = 'none';
    
    // Refresh Gantt chart
    initGanttChart();
    
    showToast('Filters cleared', 'info');
}

/**
 * Change Gantt view mode
 */
function changeGanttViewMode(viewMode) {
    currentViewMode = viewMode;
    if (ganttChart) {
        ganttChart.change_view_mode(viewMode);
        // Reapply colors and adjust labels after view change
        setTimeout(() => {
            applyGanttBarColors();
            adjustBarLabelPositions();
        }, 100);
    }
}

/**
 * Apply custom colors to Gantt bars based on project status
 */
function applyGanttBarColors() {
    const statusColors = {
        'completed': '#10b981',      // green
        'in-progress': '#2563eb',     // blue
        'planning': '#f59e0b',        // yellow
        'on-hold': '#ef4444',         // red
        'cancelled': '#6b7280'        // gray
    };
    
    // Apply colors to bars
    document.querySelectorAll('.bar-wrapper').forEach(barWrapper => {
        const bar = barWrapper.querySelector('.bar');
        if (bar) {
            // Get status class from custom_class
            const classes = bar.classList;
            for (const className of classes) {
                if (className.startsWith('status-')) {
                    const status = className.replace('status-', '');
                    if (statusColors[status]) {
                        bar.style.fill = statusColors[status];
                    }
                }
            }
        }
    });
    
    // Apply colors to progress bars
    document.querySelectorAll('.bar-progress').forEach(progress => {
        const bar = progress.closest('.bar');
        if (bar) {
            const classes = bar.classList;
            for (const className of classes) {
                if (className.startsWith('status-')) {
                    const status = className.replace('status-', '');
                    if (statusColors[status]) {
                        // Make progress bar slightly darker
                        const color = statusColors[status];
                        progress.style.fill = shadeColor(color, -20);
                    }
                }
            }
        }
    });
}

/**
 * Adjust bar label positions to the left
 */
function adjustBarLabelPositions() {
    document.querySelectorAll('.bar-label').forEach(label => {
        const barWrapper = label.closest('.bar-wrapper');
        if (barWrapper) {
            const bar = barWrapper.querySelector('.bar');
            if (bar) {
                // Get bar position
                const barX = parseFloat(bar.getAttribute('x')) || 0;
                const barY = parseFloat(bar.getAttribute('y')) || 0;
                const barHeight = parseFloat(bar.getAttribute('height')) || 30;
                
                // Position label at left edge of bar with padding
                label.setAttribute('x', barX + 8); // 8px padding from left
                label.setAttribute('y', barY + (barHeight / 2)); // Vertically centered
                label.setAttribute('text-anchor', 'start'); // Left align
                label.setAttribute('dominant-baseline', 'middle'); // Vertically centered
            }
        }
    });
}

/**
 * Shade color helper (darken or lighten)
 */
function shadeColor(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
        (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
        .toString(16).slice(1);
}

/**
 * Update project count display
 */
function updateProjectCount(count) {
    const countElement = document.getElementById('gantt-project-count');
    if (countElement) {
        countElement.textContent = `${count} project${count !== 1 ? 's' : ''}`;
    }
}

/**
 * Refresh scheduling view
 */
function refreshScheduling() {
    showLoading('Refreshing timeline...');
    populateSchedulingFilters();
    initGanttChart();
    hideLoading();
    showToast('Timeline refreshed', 'success');
}

/**
 * Format date for display
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Show project detail modal (reuse existing modal system)
 */
function showProjectDetailModal(project) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.innerHTML = `<i class="fas fa-info-circle"></i> ${project.projectName}`;
    
    modalBody.innerHTML = `
        <div class="project-detail">
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Project Type</label>
                        <span>${project.projectType}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status</label>
                        <span class="status-badge status-${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span>
                    </div>
                    <div class="detail-item">
                        <label>Location</label>
                        <span>${project.location}</span>
                    </div>
                    <div class="detail-item">
                        <label>Contractor</label>
                        <span>${project.contractor}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-calendar"></i> Timeline</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Start Date</label>
                        <span>${formatDate(project.startDate)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Finish Date</label>
                        <span>${formatDate(project.finishDate)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Coordinates</label>
                        <span>${project.latitude}, ${project.longitude}</span>
                    </div>
                </div>
            </div>
            
            ${project.description ? `
            <div class="detail-section">
                <h3><i class="fas fa-file-alt"></i> Description</h3>
                <p>${project.description}</p>
            </div>
            ` : ''}
            
            <div class="detail-actions">
                <button class="btn btn-primary" onclick="editProjectFromScheduling('${project.id}')">
                    <i class="fas fa-edit"></i> Edit Project
                </button>
                <button class="btn btn-secondary" onclick="viewOnMap('${project.id}')">
                    <i class="fas fa-map"></i> View on Map
                </button>
            </div>
        </div>
    `;
    
    showModal();
}

/**
 * Edit project from scheduling view
 */
function editProjectFromScheduling(projectId) {
    hideModal();
    switchView('database');
    
    // Wait for view to load, then trigger edit
    setTimeout(() => {
        const editBtn = document.querySelector(`button[onclick="editProject('${projectId}')"]`);
        if (editBtn) {
            editBtn.click();
        }
    }, 300);
}

/**
 * View project on map
 */
function viewOnMap(projectId) {
    hideModal();
    switchView('map');
    
    // Wait for map to load, then center on project
    setTimeout(() => {
        const project = getProjectById(projectId);
        if (project && map) {
            map.setView([project.latitude, project.longitude], 15);
            
            // Find and open the marker popup
            markers.eachLayer(marker => {
                if (marker.projectId === projectId) {
                    marker.openPopup();
                }
            });
        }
    }, 500);
}

// Initialize on first load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Will be initialized when view is switched
    });
}
