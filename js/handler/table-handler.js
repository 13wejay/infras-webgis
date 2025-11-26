// ===========================
// Table Handler - Database view operations
// ===========================

let currentPage = 1;
const rowsPerPage = 20;
let currentSort = { column: 'projectName', direction: 'asc' };
let currentTableFilters = {};
let allProjects = [];
let filteredProjects = [];

/**
 * Initialize table view
 */
function initTableView() {
    allProjects = loadProjects();
    filteredProjects = [...allProjects];
    renderTable();
    setupTableControls();
}

/**
 * Render the data table
 */
function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    
    // Sort the data
    const sortedData = sortData(filteredProjects, currentSort.column, currentSort.direction);
    
    // Paginate the data
    const paginatedData = paginate(sortedData, currentPage, rowsPerPage);
    
    // Clear tbody
    tbody.innerHTML = '';
    
    // Render rows
    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem;">No projects found</td></tr>';
        renderPagination(0);
        return;
    }
    
    paginatedData.forEach(project => {
        const row = document.createElement('tr');
        row.setAttribute('data-project-id', project.id);
        row.innerHTML = `
            <td>${escapeHtml(project.projectName)}</td>
            <td>${escapeHtml(project.projectType)}</td>
            <td>${escapeHtml(project.location)}</td>
            <td>${project.latitude}</td>
            <td>${project.longitude}</td>
            <td><span class="status-badge ${getStatusClass(project.status)}">${escapeHtml(project.status)}</span></td>
            <td>${formatDate(project.startDate)}</td>
            <td>${formatDate(project.finishDate)}</td>
            <td>${escapeHtml(project.contractor)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" onclick="showProjectOnMap('${project.id}')" title="Show on Map">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                    <button class="action-btn" onclick="editProject('${project.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" onclick="confirmDeleteProject('${project.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Render pagination
    renderPagination(sortedData.length);
    
    // Update filter results count
    updateFilterResults();
}

/**
 * Sort data by column
 */
function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle dates
        if (column === 'startDate' || column === 'finishDate') {
            aVal = new Date(aVal || '9999-12-31').getTime();
            bVal = new Date(bVal || '9999-12-31').getTime();
        }
        
        // Handle numbers
        if (column === 'latitude' || column === 'longitude') {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }
        
        // Handle strings
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Paginate data
 */
function paginate(data, page, perPage) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
}

/**
 * Render pagination controls
 */
function renderPagination(totalItems) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i> Previous
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
        Next <i class="fas fa-chevron-right"></i>
    </button>`;
    
    pagination.innerHTML = html;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    currentPage = page;
    renderTable();
}

/**
 * Setup table controls
 */
function setupTableControls() {
    // Sort headers
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.getAttribute('data-sort');
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            
            // Update sort icons
            document.querySelectorAll('.data-table th[data-sort] i').forEach(i => {
                i.className = 'fas fa-sort';
            });
            th.querySelector('i').className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            
            renderTable();
        });
    });
    
    // Add project button
    const addBtn = document.getElementById('add-project-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => showProjectForm());
    }
    
    // Import button
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
        importBtn.addEventListener('click', showImportDialog);
    }
    
    // Export button
    const exportBtn = document.getElementById('export-btn');
    const exportMenu = document.getElementById('export-menu');
    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            exportMenu.classList.remove('active');
        });
        
        // Export format buttons
        exportMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = btn.getAttribute('data-format');
                exportData(format);
            });
        });
    }
    
    // Filter toggle
    const filterToggle = document.getElementById('filter-toggle');
    const filterContent = document.querySelector('.filter-content');
    if (filterToggle && filterContent) {
        filterToggle.addEventListener('click', () => {
            filterContent.style.display = filterContent.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    // Apply filters button
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Populate filter dropdowns with dynamic types
    populateFilterDropdowns();
}

/**
 * Populate filter dropdowns with existing project types
 */
function populateFilterDropdowns() {
    const types = getAllProjectTypes();
    const filterTypeSelect = document.getElementById('filter-type');
    
    if (filterTypeSelect) {
        filterTypeSelect.innerHTML = types.map(type => 
            `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`
        ).join('');
    }
}

/**
 * Show project form (add or edit)
 */
function showProjectForm(project = null) {
    const isEdit = project !== null;
    const title = isEdit ? 'Edit Project' : 'Add New Project';
    
    // Get all existing project types
    const existingTypes = getAllProjectTypes();
    
    const content = `
        <form id="project-form">
            <div class="form-group">
                <label>Project Name <span class="required">*</span></label>
                <input type="text" id="project-name" value="${project ? escapeHtml(project.projectName) : ''}" required>
                <div class="form-error" id="error-projectName"></div>
            </div>
            
            <div class="form-group">
                <label>Project Type <span class="required">*</span></label>
                <input type="text" id="project-type" list="project-types-list" value="${project ? escapeHtml(project.projectType) : ''}" placeholder="Enter or select project type..." required>
                <datalist id="project-types-list">
                    ${existingTypes.map(type => `<option value="${escapeHtml(type)}">`).join('')}
                </datalist>
                <small style="color: var(--text-light); font-size: 0.75rem;">Type a new category or select from existing ones</small>
                <div class="form-error" id="error-projectType"></div>
            </div>
            
            <div class="form-group">
                <label>Location <span class="required">*</span></label>
                <input type="text" id="project-location" value="${project ? escapeHtml(project.location) : ''}" required>
                <div class="form-error" id="error-location"></div>
            </div>
            
            <div class="form-group">
                <label>Latitude <span class="required">*</span></label>
                <input type="number" step="any" id="project-latitude" value="${project ? project.latitude : ''}" required>
                <div class="form-error" id="error-latitude"></div>
            </div>
            
            <div class="form-group">
                <label>Longitude <span class="required">*</span></label>
                <input type="number" step="any" id="project-longitude" value="${project ? project.longitude : ''}" required>
                <div class="form-error" id="error-longitude"></div>
            </div>
            
            <div class="form-group">
                <label>Status <span class="required">*</span></label>
                <select id="project-status" required>
                    <option value="">Select status...</option>
                    <option value="Planning" ${project?.status === 'Planning' ? 'selected' : ''}>Planning</option>
                    <option value="In Progress" ${project?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Completed" ${project?.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    <option value="On Hold" ${project?.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                    <option value="Cancelled" ${project?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <div class="form-error" id="error-status"></div>
            </div>
            
            <div class="form-group">
                <label>Start Date <span class="required">*</span></label>
                <input type="date" id="project-start-date" value="${project ? project.startDate : ''}" required>
                <div class="form-error" id="error-startDate"></div>
            </div>
            
            <div class="form-group">
                <label>Finish Date</label>
                <input type="date" id="project-finish-date" value="${project ? project.finishDate : ''}">
                <div class="form-error" id="error-finishDate"></div>
            </div>
            
            <div class="form-group">
                <label>Contractor/Vendor <span class="required">*</span></label>
                <input type="text" id="project-contractor" value="${project ? escapeHtml(project.contractor) : ''}" required>
                <div class="form-error" id="error-contractor"></div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Project</button>
            </div>
        </form>
    `;
    
    showModal(title, content);
    
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
        
        // Simulate async operation for better UX
        setTimeout(() => {
            let result;
            if (isEdit) {
                result = updateProject(project.id, projectData);
            } else {
                result = addProject(projectData);
            }
            
            setButtonLoading(submitBtn, false);
            
            if (result.success) {
                hideModal();
                refreshAllViews();
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
 * Edit project
 */
function editProject(projectId) {
    const project = getProjectById(projectId);
    if (project) {
        showProjectForm(project);
    }
}

/**
 * Confirm delete project
 */
function confirmDeleteProject(projectId) {
    const project = getProjectById(projectId);
    if (!project) return;
    
    showConfirmDialog(
        `Are you sure you want to delete "${project.projectName}"?`,
        () => {
            if (deleteProject(projectId)) {
                refreshAllViews();
            }
        }
    );
}

/**
 * Apply filters
 */
function applyFilters() {
    currentTableFilters = {
        types: Array.from(document.getElementById('filter-type').selectedOptions).map(o => o.value),
        statuses: Array.from(document.getElementById('filter-status').selectedOptions).map(o => o.value),
        location: document.getElementById('filter-location').value.toLowerCase(),
        contractor: document.getElementById('filter-contractor').value.toLowerCase(),
        startDateFrom: document.getElementById('filter-start-from').value,
        startDateTo: document.getElementById('filter-start-to').value,
        finishDateFrom: document.getElementById('filter-finish-from').value,
        finishDateTo: document.getElementById('filter-finish-to').value
    };
    
    filteredProjects = allProjects.filter(project => {
        // Type filter
        if (currentTableFilters.types.length > 0 && !currentTableFilters.types.includes(project.projectType)) {
            return false;
        }
        
        // Status filter
        if (currentTableFilters.statuses.length > 0 && !currentTableFilters.statuses.includes(project.status)) {
            return false;
        }
        
        // Location filter
        if (currentTableFilters.location && !project.location.toLowerCase().includes(currentTableFilters.location)) {
            return false;
        }
        
        // Contractor filter
        if (currentTableFilters.contractor && !project.contractor.toLowerCase().includes(currentTableFilters.contractor)) {
            return false;
        }
        
        // Start date filter
        if (currentTableFilters.startDateFrom && project.startDate < currentTableFilters.startDateFrom) {
            return false;
        }
        if (currentTableFilters.startDateTo && project.startDate > currentTableFilters.startDateTo) {
            return false;
        }
        
        // Finish date filter
        if (currentTableFilters.finishDateFrom && project.finishDate && project.finishDate < currentTableFilters.finishDateFrom) {
            return false;
        }
        if (currentTableFilters.finishDateTo && project.finishDate && project.finishDate > currentTableFilters.finishDateTo) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    renderTable();
}

/**
 * Clear filters
 */
function clearFilters() {
    document.getElementById('filter-type').selectedIndex = -1;
    document.getElementById('filter-status').selectedIndex = -1;
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-contractor').value = '';
    document.getElementById('filter-start-from').value = '';
    document.getElementById('filter-start-to').value = '';
    document.getElementById('filter-finish-from').value = '';
    document.getElementById('filter-finish-to').value = '';
    
    currentTableFilters = {};
    filteredProjects = [...allProjects];
    currentPage = 1;
    renderTable();
}

/**
 * Update filter results count
 */
function updateFilterResults() {
    const resultsEl = document.getElementById('filter-results');
    if (resultsEl) {
        resultsEl.textContent = `Showing ${filteredProjects.length} of ${allProjects.length} projects`;
    }
}

/**
 * Show import dialog
 */
function showImportDialog() {
    const content = `
        <div class="form-group">
            <label>Select File (CSV or Excel)</label>
            <input type="file" id="import-file" accept=".csv,.xlsx,.xls">
            <small style="color: var(--text-light); display: block; margin-top: 0.5rem;">
                <strong>CSV format:</strong> Use comma-separated values with headers<br>
                <strong>Excel format:</strong> First sheet will be imported<br>
                <strong>Note:</strong> Check browser console (F12) for detailed import logs
            </small>
        </div>
        <div id="import-preview" style="display: none; margin-top: 1rem;">
            <h4>Preview:</h4>
            <div id="import-preview-content"></div>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
            <button type="button" class="btn btn-primary" id="confirm-import-btn" disabled>Import Data</button>
        </div>
    `;
    
    showModal('Import Projects', content);
    
    const fileInput = document.getElementById('import-file');
    const confirmBtn = document.getElementById('confirm-import-btn');
    let parsedData = [];
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        try {
            if (file.name.endsWith('.csv')) {
                console.log('Processing CSV file...');
                const text = await file.text();
                console.log('File content loaded, length:', text.length);
                const { data } = parseCSV(text);
                parsedData = data;
                console.log('Parsed data:', parsedData.length, 'rows');
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                console.log('Processing Excel file...');
                if (typeof XLSX === 'undefined') {
                    throw new Error('Excel library (XLSX) not loaded. Please refresh the page.');
                }
                const arrayBuffer = await file.arrayBuffer();
                console.log('File loaded as ArrayBuffer, size:', arrayBuffer.byteLength);
                const workbook = XLSX.read(arrayBuffer);
                console.log('Workbook loaded, sheets:', workbook.SheetNames.join(', '));
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                parsedData = XLSX.utils.sheet_to_json(firstSheet);
                console.log('Parsed data:', parsedData.length, 'rows');
            }
            
            // Show preview
            if (parsedData.length > 0) {
                console.log('First row sample:', parsedData[0]);
                document.getElementById('import-preview').style.display = 'block';
                document.getElementById('import-preview-content').innerHTML = `
                    <p><strong>Found ${parsedData.length} rows</strong></p>
                    <p style="font-size: 0.875rem; color: var(--text-light); margin-top: 0.5rem;">
                        Expected columns: projectName, projectType, location, latitude, longitude, status, startDate, finishDate, contractor
                    </p>
                    <div style="margin-top: 1rem; padding: 0.75rem; background: var(--background); border-radius: 0.25rem; font-size: 0.75rem;">
                        <strong>First row columns:</strong> ${Object.keys(parsedData[0]).join(', ')}
                    </div>
                `;
                confirmBtn.disabled = false;
            } else {
                showToast('No data found in file', 'warning');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('Error reading file: ' + error.message, 'error');
        }
    });
    
    confirmBtn.addEventListener('click', () => {
        if (parsedData.length > 0) {
            importProjects(parsedData, true);
            hideModal();
            refreshAllViews();
        }
    });
}

/**
 * Export data
 */
function exportData(format) {
    const data = filteredProjects.length > 0 ? filteredProjects : allProjects;
    
    if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
        XLSX.writeFile(workbook, `projects_${Date.now()}.xlsx`);
        showToast('Exported to Excel', 'success');
    } else if (format === 'csv') {
        const headers = ['id', 'projectName', 'projectType', 'location', 'latitude', 'longitude', 'status', 'startDate', 'finishDate', 'contractor'];
        const csv = arrayToCSV(data, headers);
        downloadFile(csv, `projects_${Date.now()}.csv`, 'text/csv');
        showToast('Exported to CSV', 'success');
    } else if (format === 'geojson') {
        const geojson = projectsToGeoJSON(data);
        downloadFile(JSON.stringify(geojson, null, 2), `projects_${Date.now()}.geojson`, 'application/json');
        showToast('Exported to GeoJSON', 'success');
    }
}

/**
 * Refresh table view
 */
function refreshTableView() {
    allProjects = loadProjects();
    if (Object.keys(currentTableFilters).length === 0) {
        filteredProjects = [...allProjects];
    } else {
        applyFilters();
    }
    populateFilterDropdowns(); // Update filter dropdowns with new types
    renderTable();
}
