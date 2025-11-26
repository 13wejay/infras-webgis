/**
 * Analytics Handler
 * Handles analytics dashboard and charts
 */

let analyticsFilters = {
    types: [],
    locations: [],
    startDateFrom: '',
    startDateTo: '',
    finishDateFrom: '',
    finishDateTo: '',
    excludeHGU: true
};

/**
 * Initialize analytics view
 */
function initAnalytics() {
    setupAnalyticsFilters();
    refreshAnalytics();
}

/**
 * Setup analytics filter controls
 */
function setupAnalyticsFilters() {
    populateAnalyticsFilterDropdowns();
    
    // Filter toggle
    const filterToggle = document.getElementById('analytics-filter-toggle');
    const filterContent = document.querySelector('#analytics-filter-panel .filter-content');
    if (filterToggle && filterContent) {
        filterToggle.addEventListener('click', () => {
            filterContent.style.display = filterContent.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('analytics-apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyAnalyticsFilters);
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('analytics-clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAnalyticsFilters);
    }
}

/**
 * Populate analytics filter dropdowns
 */
function populateAnalyticsFilterDropdowns() {
    const projects = loadProjects();
    
    // Populate project types
    const types = [...new Set(projects.map(p => p.projectType))].sort();
    const typeFilter = document.getElementById('analytics-type-filter');
    if (typeFilter) {
        typeFilter.innerHTML = types.map(type => 
            `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`
        ).join('');
    }
    
    // Populate locations
    const locations = [...new Set(projects.map(p => p.location))].sort();
    const locationFilter = document.getElementById('analytics-location-filter');
    if (locationFilter) {
        locationFilter.innerHTML = locations.map(location => 
            `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`
        ).join('');
    }
}

/**
 * Apply analytics filters
 */
function applyAnalyticsFilters() {
    const typeFilter = document.getElementById('analytics-type-filter');
    const locationFilter = document.getElementById('analytics-location-filter');
    
    analyticsFilters = {
        types: typeFilter ? Array.from(typeFilter.selectedOptions).map(o => o.value) : [],
        locations: locationFilter ? Array.from(locationFilter.selectedOptions).map(o => o.value) : [],
        startDateFrom: document.getElementById('analytics-start-from')?.value || '',
        startDateTo: document.getElementById('analytics-start-to')?.value || '',
        finishDateFrom: document.getElementById('analytics-finish-from')?.value || '',
        finishDateTo: document.getElementById('analytics-finish-to')?.value || '',
        excludeHGU: document.getElementById('analytics-exclude-hgu')?.checked || false
    };
    
    refreshAnalytics();
}

/**
 * Clear analytics filters
 */
function clearAnalyticsFilters() {
    analyticsFilters = {
        types: [],
        locations: [],
        startDateFrom: '',
        startDateTo: '',
        finishDateFrom: '',
        finishDateTo: '',
        excludeHGU: false
    };
    
    // Clear form inputs
    const typeFilter = document.getElementById('analytics-type-filter');
    const locationFilter = document.getElementById('analytics-location-filter');
    if (typeFilter) typeFilter.selectedIndex = -1;
    if (locationFilter) locationFilter.selectedIndex = -1;
    
    document.getElementById('analytics-start-from').value = '';
    document.getElementById('analytics-start-to').value = '';
    document.getElementById('analytics-finish-from').value = '';
    document.getElementById('analytics-finish-to').value = '';
    document.getElementById('analytics-exclude-hgu').checked = false;
    
    refreshAnalytics();
}

/**
 * Filter projects based on analytics filters
 */
function filterProjectsForAnalytics(projects) {
    return projects.filter(project => {
        // Filter by project type
        if (analyticsFilters.types.length > 0 && !analyticsFilters.types.includes(project.projectType)) {
            return false;
        }
        
        // Filter by location
        if (analyticsFilters.locations.length > 0 && !analyticsFilters.locations.includes(project.location)) {
            return false;
        }
        
        // Filter by start date from
        if (analyticsFilters.startDateFrom && project.startDate < analyticsFilters.startDateFrom) {
            return false;
        }
        
        // Filter by start date to
        if (analyticsFilters.startDateTo && project.startDate > analyticsFilters.startDateTo) {
            return false;
        }
        
        // Filter by finish date from
        if (analyticsFilters.finishDateFrom && project.finishDate < analyticsFilters.finishDateFrom) {
            return false;
        }
        
        // Filter by finish date to
        if (analyticsFilters.finishDateTo && project.finishDate > analyticsFilters.finishDateTo) {
            return false;
        }
        
        // Exclude HGU projects
        if (analyticsFilters.excludeHGU && project.projectType.toUpperCase().includes('HGU')) {
            return false;
        }
        
        return true;
    });
}

/**
 * Refresh analytics data
 */
function refreshAnalytics() {
    showProgress();
    updateProgress(10);
    
    populateAnalyticsFilterDropdowns();
    updateProgress(30);
    
    const allProjects = loadProjects();
    const projects = filterProjectsForAnalytics(allProjects);
    updateProgress(50);
    
    // Update filter results display
    const resultsElement = document.getElementById('analytics-filter-results');
    if (resultsElement) {
        resultsElement.textContent = `Showing ${projects.length} of ${allProjects.length} projects`;
    }
    
    // Update summary cards
    updateSummaryCards(projects);
    updateProgress(65);
    
    // Update charts
    updateStatusChart(projects);
    updateProgress(75);
    updateTypeChart(projects);
    updateProgress(85);
    updateLocationChart(projects);
    updateProgress(95);
    updateContractorChart(projects);
    updateProgress(100);
    
    setTimeout(hideProgress, 500);
}

/**
 * Update summary cards
 */
function updateSummaryCards(projects) {
    const totalProjects = projects.length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const inProgress = projects.filter(p => p.status === 'In Progress').length;
    const delayed = projects.filter(p => p.status === 'Delayed' || p.status === 'On Hold').length;
    
    document.getElementById('total-projects').textContent = totalProjects;
    document.getElementById('completed-projects').textContent = completed;
    document.getElementById('inprogress-projects').textContent = inProgress;
    document.getElementById('delayed-projects').textContent = delayed;
}

/**
 * Update status chart
 */
function updateStatusChart(projects) {
    const statusCounts = {};
    projects.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    
    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        label: status,
        value: count,
        percentage: ((count / projects.length) * 100).toFixed(1),
        color: getStatusColor(status)
    }));
    
    renderBarChart('status-chart', chartData, 'Projects');
}

/**
 * Update type chart
 */
function updateTypeChart(projects) {
    const typeCounts = {};
    projects.forEach(p => {
        typeCounts[p.projectType] = (typeCounts[p.projectType] || 0) + 1;
    });
    
    const chartData = Object.entries(typeCounts)
        .map(([type, count]) => ({
            label: type,
            value: count,
            percentage: ((count / projects.length) * 100).toFixed(1),
            color: getRandomColor()
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10
    
    renderBarChart('type-chart', chartData, 'Projects');
}

/**
 * Update location chart
 */
function updateLocationChart(projects) {
    const locationCounts = {};
    projects.forEach(p => {
        locationCounts[p.location] = (locationCounts[p.location] || 0) + 1;
    });
    
    const chartData = Object.entries(locationCounts)
        .map(([location, count]) => ({
            label: location,
            value: count,
            percentage: ((count / projects.length) * 100).toFixed(1),
            color: getRandomColor()
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10
    
    renderBarChart('location-chart', chartData, 'Projects');
}

/**
 * Update contractor chart
 */
function updateContractorChart(projects) {
    const contractorCounts = {};
    projects.forEach(p => {
        contractorCounts[p.contractor] = (contractorCounts[p.contractor] || 0) + 1;
    });
    
    const chartData = Object.entries(contractorCounts)
        .map(([contractor, count]) => ({
            label: contractor,
            value: count,
            percentage: ((count / projects.length) * 100).toFixed(1),
            color: getRandomColor()
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5
    
    renderBarChart('contractor-chart', chartData, 'Projects');
}

/**
 * Render bar chart
 */
function renderBarChart(containerId, data, valueLabel) {
    const container = document.getElementById(containerId);
    
    if (data.length === 0) {
        container.innerHTML = '<div class="empty-chart">No data available</div>';
        return;
    }
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    const html = `
        <div class="chart-bars">
            ${data.map(item => `
                <div class="chart-bar-item">
                    <div class="chart-bar-label">${escapeHtml(item.label)}</div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="width: ${(item.value / maxValue) * 100}%; background: ${item.color};">
                            <span class="chart-bar-value">${item.value}</span>
                        </div>
                    </div>
                    <div class="chart-bar-percentage">${item.percentage}%</div>
                </div>
            `).join('')}
        </div>
        <div class="chart-footer">
            <small>Total: ${data.reduce((sum, d) => sum + d.value, 0)} ${valueLabel}</small>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Get status color
 */
function getStatusColor(status) {
    const colors = {
        'Planning': '#3b82f6',
        'In Progress': '#f59e0b',
        'Completed': '#10b981',
        'On Hold': '#6b7280',
        'Delayed': '#ef4444',
        'Cancelled': '#dc2626'
    };
    return colors[status] || '#6b7280';
}

/**
 * Get random color for charts
 */
let colorIndex = 0;
const chartColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#06b6d4', '#a855f7', '#eab308', '#22c55e', '#f43f5e'
];

function getRandomColor() {
    const color = chartColors[colorIndex % chartColors.length];
    colorIndex++;
    return color;
}

// Reset color index when refreshing
window.addEventListener('load', () => {
    colorIndex = 0;
});
