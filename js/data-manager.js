// ===========================
// Data Manager - localStorage operations
// ===========================

// Storage keys
const STORAGE_KEYS = {
    PROJECTS: 'webgis_projects',
    REPORTS: 'webgis_reports',
    TEMPORARY_LAYERS: 'webgis_temporary_layers'
};

// ===========================
// Project Data Functions
// ===========================

/**
 * Initialize data - load from localStorage
 */
function initializeData() {
    const existingReports = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (!existingReports) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
    }
}

/**
 * Load all projects from localStorage
 */
function loadProjects() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading projects:', error);
        showToast('Error loading projects', 'error');
        return [];
    }
}

/**
 * Save projects to localStorage
 */
function saveProjects(projects) {
    try {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        return true;
    } catch (error) {
        console.error('Error saving projects:', error);
        if (error.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded. Please delete some data.', 'error');
        } else {
            showToast('Error saving projects', 'error');
        }
        return false;
    }
}

/**
 * Get project by ID
 */
function getProjectById(id) {
    const projects = loadProjects();
    return projects.find(p => p.id === id);
}

/**
 * Get all unique project types from existing projects
 */
function getAllProjectTypes() {
    const projects = loadProjects();
    const types = [...new Set(projects.map(p => p.projectType))].filter(t => t);
    return types.sort();
}

/**
 * Add new project
 */
function addProject(projectData) {
    const validation = validateProjectData(projectData);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }
    
    const projects = loadProjects();
    const newProject = {
        id: generateUUID(),
        ...projectData,
        latitude: parseFloat(projectData.latitude),
        longitude: parseFloat(projectData.longitude)
    };
    
    projects.push(newProject);
    const saved = saveProjects(projects);
    
    if (saved) {
        showToast('Project added successfully', 'success');
        return { success: true, project: newProject };
    }
    
    return { success: false, errors: { general: 'Failed to save project' } };
}

/**
 * Update existing project
 */
function updateProject(id, projectData) {
    const validation = validateProjectData(projectData);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }
    
    const projects = loadProjects();
    const index = projects.findIndex(p => p.id === id);
    
    if (index === -1) {
        return { success: false, errors: { general: 'Project not found' } };
    }
    
    projects[index] = {
        ...projects[index],
        ...projectData,
        latitude: parseFloat(projectData.latitude),
        longitude: parseFloat(projectData.longitude)
    };
    
    const saved = saveProjects(projects);
    
    if (saved) {
        showToast('Project updated successfully', 'success');
        return { success: true, project: projects[index] };
    }
    
    return { success: false, errors: { general: 'Failed to update project' } };
}

/**
 * Delete project
 */
function deleteProject(id) {
    const projects = loadProjects();
    const filteredProjects = projects.filter(p => p.id !== id);
    
    if (filteredProjects.length === projects.length) {
        showToast('Project not found', 'error');
        return false;
    }
    
    const saved = saveProjects(filteredProjects);
    
    if (saved) {
        showToast('Project deleted successfully', 'success');
        return true;
    }
    
    return false;
}

/**
 * Import projects from array
 */
function importProjects(projectsArray, append = false) {
    showLoading('Importing projects...');
    
    let existingProjects = append ? loadProjects() : [];
    let importedCount = 0;
    let errors = [];
    
    projectsArray.forEach((projectData, index) => {
        const validation = validateProjectData(projectData);
        if (validation.valid) {
            const newProject = {
                id: generateUUID(),
                ...projectData,
                latitude: parseFloat(projectData.latitude),
                longitude: parseFloat(projectData.longitude)
            };
            existingProjects.push(newProject);
            importedCount++;
        } else {
            errors.push({ row: index + 1, errors: validation.errors });
        }
    });
    
    hideLoading();
    
    if (importedCount > 0) {
        saveProjects(existingProjects);
        showToast(`${importedCount} projects imported successfully`, 'success');
    }
    
    if (errors.length > 0) {
        console.warn('Import errors:', errors);
        showToast(`${errors.length} projects had errors`, 'warning');
    }
    
    return { importedCount, errors };
}

// ===========================
// Report Data Functions
// ===========================

/**
 * Load all reports from localStorage
 */
function loadReports() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
        const reports = data ? JSON.parse(data) : [];
        
        // Migrate old reports: ensure all attachments have IDs
        let needsSave = false;
        reports.forEach(report => {
            if (report.attachments && report.attachments.length > 0) {
                report.attachments.forEach(attachment => {
                    if (!attachment.id) {
                        attachment.id = generateUUID();
                        needsSave = true;
                    }
                });
            }
        });
        
        // Save migrated data
        if (needsSave) {
            console.log('Migrating reports: adding IDs to attachments');
            localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
        }
        
        return reports;
    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Error loading reports', 'error');
        return [];
    }
}

/**
 * Save reports to localStorage
 */
function saveReports(reports) {
    try {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
        return true;
    } catch (error) {
        console.error('Error saving reports:', error);
        if (error.name === 'QuotaExceededError') {
            showToast('Storage quota exceeded. Please delete some attachments.', 'error');
        } else {
            showToast('Error saving reports', 'error');
        }
        return false;
    }
}

/**
 * Get report by ID
 */
function getReportById(id) {
    const reports = loadReports();
    return reports.find(r => r.id === id);
}

/**
 * Add new report
 */
function addReport(reportData) {
    const validation = validateReportData(reportData);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }
    
    const reports = loadReports();
    const newReport = {
        id: generateUUID(),
        ...reportData,
        relatedProjects: reportData.relatedProjects || [],
        attachments: reportData.attachments || [],
        createdAt: new Date().toISOString()
    };
    
    reports.push(newReport);
    const saved = saveReports(reports);
    
    if (saved) {
        showToast('Report created successfully', 'success');
        return { success: true, report: newReport };
    }
    
    return { success: false, errors: { general: 'Failed to save report' } };
}

/**
 * Update existing report
 */
function updateReport(id, reportData) {
    const validation = validateReportData(reportData);
    if (!validation.valid) {
        return { success: false, errors: validation.errors };
    }
    
    const reports = loadReports();
    const index = reports.findIndex(r => r.id === id);
    
    if (index === -1) {
        return { success: false, errors: { general: 'Report not found' } };
    }
    
    reports[index] = {
        ...reports[index],
        ...reportData,
        relatedProjects: reportData.relatedProjects || [],
        attachments: reportData.attachments !== undefined ? reportData.attachments : (reports[index].attachments || [])
    };
    
    const saved = saveReports(reports);
    
    if (saved) {
        showToast('Report updated successfully', 'success');
        return { success: true, report: reports[index] };
    }
    
    return { success: false, errors: { general: 'Failed to update report' } };
}

/**
 * Delete report
 */
function deleteReport(id) {
    const reports = loadReports();
    const filteredReports = reports.filter(r => r.id !== id);
    
    if (filteredReports.length === reports.length) {
        showToast('Report not found', 'error');
        return false;
    }
    
    const saved = saveReports(filteredReports);
    
    if (saved) {
        showToast('Report deleted successfully', 'success');
        return true;
    }
    
    return false;
}

/**
 * Add attachment to report
 */
function addAttachmentToReport(reportId, attachment) {
    const reports = loadReports();
    const report = reports.find(r => r.id === reportId);
    
    if (!report) {
        showToast('Report not found', 'error');
        return false;
    }
    
    if (!report.attachments) {
        report.attachments = [];
    }
    
    report.attachments.push({
        id: generateUUID(),
        ...attachment
    });
    
    const saved = saveReports(reports);
    
    if (saved) {
        showToast('Attachment added successfully', 'success');
        return true;
    }
    
    return false;
}

/**
 * Delete attachment from report
 */
function deleteAttachmentFromReport(reportId, attachmentId) {
    const reports = loadReports();
    const report = reports.find(r => r.id === reportId);
    
    if (!report) {
        showToast('Report not found', 'error');
        return false;
    }
    
    report.attachments = report.attachments.filter(a => a.id !== attachmentId);
    
    const saved = saveReports(reports);
    
    if (saved) {
        showToast('Attachment deleted successfully', 'success');
        return true;
    }
    
    return false;
}

// Initialize data on load
initializeData();
