// ===========================
// Report Handler - Report management operations
// ===========================

let currentReportId = null;
let reportDraftTimeout = null;
let reportFilters = {
    search: '',
    project: '',
    dateFrom: '',
    dateTo: ''
};

/**
 * Initialize reports view
 */
function initReportsView() {
    renderReportsList();
    setupReportsControls();
    setupReportFilters();
}

/**
 * Setup report filters
 */
function setupReportFilters() {
    // Search filter
    const searchInput = document.getElementById('report-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            reportFilters.search = e.target.value.toLowerCase();
            renderReportsList();
        });
    }
    
    // Project filter
    const projectFilter = document.getElementById('report-project-filter');
    if (projectFilter) {
        populateProjectFilter();
        projectFilter.addEventListener('change', (e) => {
            reportFilters.project = e.target.value;
            renderReportsList();
        });
    }
    
    // Date from filter
    const dateFromInput = document.getElementById('report-date-from');
    if (dateFromInput) {
        dateFromInput.addEventListener('change', (e) => {
            reportFilters.dateFrom = e.target.value;
            renderReportsList();
        });
    }
    
    // Date to filter
    const dateToInput = document.getElementById('report-date-to');
    if (dateToInput) {
        dateToInput.addEventListener('change', (e) => {
            reportFilters.dateTo = e.target.value;
            renderReportsList();
        });
    }
}

/**
 * Populate project filter dropdown
 */
function populateProjectFilter() {
    const projectFilter = document.getElementById('report-project-filter');
    if (!projectFilter) return;
    
    const projects = loadProjects();
    const options = '<option value="">All Projects</option>' + 
        projects.map(p => `<option value="${p.id}">${escapeHtml(p.projectName)}</option>`).join('');
    
    projectFilter.innerHTML = options;
}

/**
 * Clear report filters
 */
function clearReportFilters() {
    reportFilters = {
        search: '',
        project: '',
        dateFrom: '',
        dateTo: ''
    };
    
    document.getElementById('report-search').value = '';
    document.getElementById('report-project-filter').value = '';
    document.getElementById('report-date-from').value = '';
    document.getElementById('report-date-to').value = '';
    
    renderReportsList();
}

/**
 * Filter reports based on current filters
 */
function filterReports(reports) {
    return reports.filter(report => {
        // Search filter
        if (reportFilters.search) {
            const searchLower = reportFilters.search.toLowerCase();
            const matchesTitle = report.title.toLowerCase().includes(searchLower);
            const matchesDescription = report.description.toLowerCase().includes(searchLower);
            const matchesAuthor = report.author.toLowerCase().includes(searchLower);
            
            if (!matchesTitle && !matchesDescription && !matchesAuthor) {
                return false;
            }
        }
        
        // Project filter
        if (reportFilters.project) {
            if (!report.relatedProjects || !report.relatedProjects.includes(reportFilters.project)) {
                return false;
            }
        }
        
        // Date from filter
        if (reportFilters.dateFrom) {
            if (report.date < reportFilters.dateFrom) {
                return false;
            }
        }
        
        // Date to filter
        if (reportFilters.dateTo) {
            if (report.date > reportFilters.dateTo) {
                return false;
            }
        }
        
        return true;
    });
}

/**
 * Render reports list in sidebar
 */
function renderReportsList() {
    const reportsList = document.getElementById('reports-list');
    if (!reportsList) return;
    
    const allReports = loadReports();
    const reports = filterReports(allReports);
    
    if (reports.length === 0) {
        const message = allReports.length === 0 ? 
            'No reports yet' : 
            'No reports match the current filters';
        reportsList.innerHTML = `<p style="padding: 1rem; text-align: center; color: var(--text-light);">${message}</p>`;
        return;
    }
    
    // Group reports by project
    const projects = loadProjects();
    const groupedReports = {};
    const ungroupedReports = [];
    
    reports.forEach(report => {
        if (report.relatedProjects && report.relatedProjects.length > 0) {
            // Get the first related project for grouping
            const projectId = report.relatedProjects[0];
            const project = projects.find(p => p.id === projectId);
            
            if (project) {
                if (!groupedReports[projectId]) {
                    groupedReports[projectId] = {
                        projectName: project.projectName,
                        reports: []
                    };
                }
                groupedReports[projectId].reports.push(report);
            } else {
                ungroupedReports.push(report);
            }
        } else {
            ungroupedReports.push(report);
        }
    });
    
    let html = '';
    
    // Render grouped reports
    Object.keys(groupedReports).forEach(projectId => {
        const group = groupedReports[projectId];
        html += `
            <div class="report-group">
                <div class="report-group-header" onclick="toggleReportGroup(this)">
                    <i class="fas fa-folder"></i>
                    <span>${escapeHtml(group.projectName)}</span>
                    <span class="report-count">${group.reports.length}</span>
                    <i class="fas fa-chevron-down group-toggle-icon"></i>
                </div>
                <div class="report-group-items">
                    ${group.reports.map(report => `
                        <div class="report-card ${report.id === currentReportId ? 'active' : ''}" 
                             data-report-id="${report.id}" 
                             onclick="viewReport('${report.id}')">
                            <div class="report-card-title">${escapeHtml(report.title)}</div>
                            <div class="report-card-meta">
                                <i class="fas fa-calendar"></i> ${formatDate(report.date)}
                            </div>
                            <div class="report-card-excerpt">${escapeHtml(report.description.substring(0, 60))}${report.description.length > 60 ? '...' : ''}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    // Render ungrouped reports
    if (ungroupedReports.length > 0) {
        html += `
            <div class="report-group">
                <div class="report-group-header" onclick="toggleReportGroup(this)">
                    <i class="fas fa-file-alt"></i>
                    <span>Other Reports</span>
                    <span class="report-count">${ungroupedReports.length}</span>
                    <i class="fas fa-chevron-down group-toggle-icon"></i>
                </div>
                <div class="report-group-items">
                    ${ungroupedReports.map(report => `
                        <div class="report-card ${report.id === currentReportId ? 'active' : ''}" 
                             data-report-id="${report.id}" 
                             onclick="viewReport('${report.id}')">
                            <div class="report-card-title">${escapeHtml(report.title)}</div>
                            <div class="report-card-meta">
                                <i class="fas fa-calendar"></i> ${formatDate(report.date)} | 
                                <i class="fas fa-user"></i> ${escapeHtml(report.author)}
                            </div>
                            <div class="report-card-excerpt">${escapeHtml(report.description.substring(0, 60))}${report.description.length > 60 ? '...' : ''}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    reportsList.innerHTML = html;
}

/**
 * Toggle report group expand/collapse
 */
function toggleReportGroup(headerElement) {
    const group = headerElement.parentElement;
    const items = group.querySelector('.report-group-items');
    const icon = headerElement.querySelector('.group-toggle-icon');
    
    if (items.style.display === 'none') {
        items.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
    } else {
        items.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
    }
}

/**
 * View report
 */
function viewReport(reportId) {
    const report = getReportById(reportId);
    if (!report) {
        showToast('Report not found', 'error');
        return;
    }
    
    currentReportId = reportId;
    
    // Update active state in sidebar
    document.querySelectorAll('.report-card').forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-report-id') === reportId);
    });
    
    // Hide empty state and show viewer
    document.getElementById('report-empty-state').style.display = 'none';
    document.getElementById('report-viewer').style.display = 'block';
    
    // Get related projects
    const projects = loadProjects();
    const relatedProjects = report.relatedProjects.map(id => projects.find(p => p.id === id)).filter(p => p);
    
    // Render report content
    const viewer = document.getElementById('report-viewer');
    viewer.innerHTML = `
        <div class="report-header">
            <h1 class="report-title">${escapeHtml(report.title)}</h1>
            <div class="report-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(report.date)}</span>
                <span><i class="fas fa-user"></i> ${escapeHtml(report.author)}</span>
                <span><i class="fas fa-clock"></i> Created ${formatDate(report.createdAt)}</span>
            </div>
            <div class="report-actions">
                <button class="btn btn-primary" onclick="editReport('${reportId}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-secondary" onclick="exportReportToPDF('${reportId}')">
                    <i class="fas fa-file-pdf"></i> Export PDF
                </button>
                <button class="btn btn-danger" onclick="confirmDeleteReport('${reportId}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
        
        <div class="report-description">
            ${report.description.replace(/\n/g, '<br>')}
        </div>
        
        ${relatedProjects.length > 0 ? `
            <div class="report-section">
                <h3><i class="fas fa-project-diagram"></i> Related Projects (${relatedProjects.length})</h3>
                <div class="related-projects-list">
                    ${relatedProjects.map(project => `
                        <div class="related-project-item">
                            <div>
                                <strong>${escapeHtml(project.projectName)}</strong><br>
                                <small>${escapeHtml(project.projectType)} - ${escapeHtml(project.location)}</small>
                            </div>
                            <span class="status-badge ${getStatusClass(project.status)}">${escapeHtml(project.status)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${report.attachments && report.attachments.length > 0 ? `
            <div class="report-section">
                <h3><i class="fas fa-paperclip"></i> Attachments (${report.attachments.length})</h3>
                <div class="attachments-grid">
                    ${report.attachments.map(attachment => `
                        <div class="attachment-item">
                            ${attachment.type.startsWith('image/') ? `
                                <img src="${attachment.data}" alt="${escapeHtml(attachment.name)}" class="attachment-preview" onclick="viewAttachment('${attachment.id}', '${reportId}')" style="cursor: pointer;" title="Click to view">
                            ` : `
                                <div class="attachment-icon" onclick="downloadAttachment('${attachment.id}', '${reportId}')" style="cursor: pointer;" title="Click to download">
                                    <i class="fas fa-file-pdf"></i>
                                </div>
                            `}
                            <div class="attachment-name" title="${escapeHtml(attachment.name)}">${escapeHtml(attachment.name)}</div>
                            <button class="btn btn-sm btn-secondary" onclick="downloadAttachment('${attachment.id}', '${reportId}')" style="margin-top: 0.5rem; font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Show report form (create or edit)
 */
function showReportForm(report = null) {
    const isEdit = report !== null;
    const title = isEdit ? 'Edit Report' : 'Create New Report';
    
    const projects = loadProjects();
    
    const content = `
        <form id="report-form">
            <div class="form-group">
                <label>Title <span class="required">*</span></label>
                <input type="text" id="report-title" value="${report ? escapeHtml(report.title) : ''}" required>
                <div class="form-error" id="error-title"></div>
            </div>
            
            <div class="form-group">
                <label>Date <span class="required">*</span></label>
                <input type="date" id="report-date" value="${report ? report.date : formatDateISO(new Date())}" required>
                <div class="form-error" id="error-date"></div>
            </div>
            
            <div class="form-group">
                <label>Author <span class="required">*</span></label>
                <input type="text" id="report-author" value="${report ? escapeHtml(report.author) : ''}" required>
                <div class="form-error" id="error-author"></div>
            </div>
            
            <div class="form-group">
                <label>Description <span class="required">*</span></label>
                <textarea id="report-description" rows="8" required>${report ? escapeHtml(report.description) : ''}</textarea>
                <div class="form-error" id="error-description"></div>
            </div>
            
            <div class="form-group">
                <label>Related Projects</label>
                <select id="report-projects" multiple style="height: 150px;">
                    ${projects.map(p => `
                        <option value="${p.id}" ${report?.relatedProjects?.includes(p.id) ? 'selected' : ''}>
                            ${escapeHtml(p.projectName)} (${escapeHtml(p.projectType)})
                        </option>
                    `).join('')}
                </select>
                <small style="color: var(--text-light);">Hold Ctrl/Cmd to select multiple</small>
            </div>
            
            ${isEdit ? `
                <div class="form-group">
                    <label>Attachments</label>
                    <div id="current-attachments">
                        ${report.attachments && report.attachments.length > 0 ? `
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                                ${report.attachments.map(att => `
                                    <div style="display: flex; align-items: center; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem;" data-attachment-id="${att.id}">
                                        <span style="font-size: 0.875rem;">${escapeHtml(att.name)}</span>
                                        <button type="button" class="btn btn-danger" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem;" onclick="removeAttachmentFromForm(this, '${att.id}')">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p style="font-size: 0.875rem; color: var(--text-light);">No attachments</p>'}
                    </div>
                </div>
            ` : ''}
            
            <div class="form-group">
                <label>Add Attachments</label>
                <div class="file-drop-zone" id="file-drop-zone">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--text-light);"></i>
                    <p>Drag & drop files here or click to browse</p>
                    <small style="color: var(--text-light);">Supported: PDF, JPG, PNG, GIF (Max 10MB each)</small>
                    <input type="file" id="attachment-files" multiple accept=".pdf,.jpg,.jpeg,.png,.gif" style="display: none;">
                </div>
                <div id="new-attachments-preview"></div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'} Report</button>
            </div>
        </form>
    `;
    
    showModal(title, content);
    
    // Clear previous state
    window.currentNewAttachments = [];
    window.removedAttachmentIds = [];
    
    // Setup file drop zone
    setupFileDropZone(report);
    
    // Handle form submission
    document.getElementById('report-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleReportFormSubmit(isEdit, report);
    });
    
    // Auto-save draft every 30 seconds
    if (!isEdit) {
        startAutoSave();
    }
}

/**
 * Setup file drop zone
 */
function setupFileDropZone(report) {
    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('attachment-files');
    const preview = document.getElementById('new-attachments-preview');
    
    let newAttachments = [];
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
    });
    
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        await processFiles(files);
    });
    
    async function processFiles(files) {
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                showToast(`${file.name} exceeds 10MB limit`, 'error');
                continue;
            }
            
            try {
                const data = await fileToBase64(file);
                newAttachments.push({
                    id: generateUUID(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: data
                });
            } catch (error) {
                showToast(`Error reading ${file.name}`, 'error');
            }
        }
        
        // Update preview
        preview.innerHTML = newAttachments.map((att, index) => `
            <div style="display: flex; align-items: center; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem; margin-top: 0.5rem;">
                <i class="fas ${att.type.startsWith('image/') ? 'fa-image' : 'fa-file-pdf'}" style="margin-right: 0.5rem;"></i>
                <span style="font-size: 0.875rem; flex: 1;">${escapeHtml(att.name)} (${formatFileSize(att.size)})</span>
                <button type="button" class="btn btn-danger" style="padding: 0.25rem 0.5rem;" onclick="removeNewAttachment(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    // Store attachments in a global variable accessible to form submission
    window.currentNewAttachments = newAttachments;
    
    // Make remove function available globally
    window.removeNewAttachment = function(index) {
        newAttachments.splice(index, 1);
        window.currentNewAttachments = newAttachments;
        
        // Update preview
        preview.innerHTML = newAttachments.map((att, idx) => `
            <div style="display: flex; align-items: center; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem; margin-top: 0.5rem;">
                <i class="fas ${att.type.startsWith('image/') ? 'fa-image' : 'fa-file-pdf'}" style="margin-right: 0.5rem;"></i>
                <span style="font-size: 0.875rem; flex: 1;">${escapeHtml(att.name)} (${formatFileSize(att.size)})</span>
                <button type="button" class="btn btn-danger" style="padding: 0.25rem 0.5rem;" onclick="removeNewAttachment(${idx})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    };
}

/**
 * Remove attachment from existing report (in edit form)
 */
function removeAttachmentFromForm(buttonElement, attachmentId) {
    console.log('Removing attachment:', attachmentId);
    
    // This will be handled when form is submitted
    // For now, just hide it visually and mark for removal
    const attachmentDiv = buttonElement.closest('div[data-attachment-id]');
    if (attachmentDiv) {
        attachmentDiv.style.display = 'none';
        
        // Store removed attachment IDs
        if (!window.removedAttachmentIds) {
            window.removedAttachmentIds = [];
        }
        window.removedAttachmentIds.push(attachmentId);
        
        console.log('Removed attachment IDs:', window.removedAttachmentIds);
        showToast('Attachment will be removed when you save', 'info');
    }
}

/**
 * Handle report form submission
 */
async function handleReportFormSubmit(isEdit, report) {
    const reportData = {
        title: document.getElementById('report-title').value,
        date: document.getElementById('report-date').value,
        author: document.getElementById('report-author').value,
        description: document.getElementById('report-description').value,
        relatedProjects: Array.from(document.getElementById('report-projects').selectedOptions).map(o => o.value)
    };
    
    // Clear previous errors
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    
    // Handle attachments
    let finalAttachments = [];
    
    if (isEdit && report?.attachments) {
        // Filter out removed attachments
        const removedIds = window.removedAttachmentIds || [];
        console.log('Original attachments:', report.attachments.length);
        console.log('Removed IDs:', removedIds);
        finalAttachments = report.attachments.filter(att => !removedIds.includes(att.id));
        console.log('After filtering removed:', finalAttachments.length);
    }
    
    // Add new attachments
    if (window.currentNewAttachments && window.currentNewAttachments.length > 0) {
        console.log('Adding new attachments:', window.currentNewAttachments.length);
        finalAttachments = [...finalAttachments, ...window.currentNewAttachments];
    }
    
    console.log('Final attachments count:', finalAttachments.length);
    reportData.attachments = finalAttachments;
    
    let result;
    if (isEdit) {
        result = updateReport(report.id, reportData);
    } else {
        result = addReport(reportData);
    }
    
    if (result.success) {
        hideModal();
        window.currentNewAttachments = [];
        window.removedAttachmentIds = [];
        clearAutoSave();
        refreshReportsView();
        if (result.report) {
            viewReport(result.report.id);
        }
    } else if (result.errors) {
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
}

/**
 * Edit report
 */
function editReport(reportId) {
    const report = getReportById(reportId);
    if (report) {
        showReportForm(report);
    }
}

/**
 * Confirm delete report
 */
function confirmDeleteReport(reportId) {
    const report = getReportById(reportId);
    if (!report) return;
    
    showConfirmDialog(
        `Are you sure you want to delete the report "${report.title}"?`,
        () => {
            if (deleteReport(reportId)) {
                currentReportId = null;
                document.getElementById('report-viewer').style.display = 'none';
                document.getElementById('report-empty-state').style.display = 'flex';
                refreshReportsView();
            }
        }
    );
}

/**
 * Export report to PDF
 */
function exportReportToPDF(reportId) {
    const report = getReportById(reportId);
    if (!report) {
        showToast('Report not found', 'error');
        return;
    }
    
    showLoading('Generating PDF report...');
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
    
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    // Helper to add new page if needed
    const checkPageBreak = (height) => {
        if (yPos + height > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            return true;
        }
        return false;
    };
    
    // Helper to get image format for jsPDF
    const getImageFormat = (mimeType) => {
        if (mimeType.includes('png')) return 'PNG';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'JPEG';
        if (mimeType.includes('gif')) return 'GIF';
        return 'JPEG'; // Default
    };
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(report.title, margin, yPos);
    yPos += 10;
    
    // Metadata
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Date: ${formatDate(report.date)}`, margin, yPos);
    yPos += 6;
    doc.text(`Author: ${report.author}`, margin, yPos);
    yPos += 6;
    doc.text(`Created: ${formatDate(report.createdAt)}`, margin, yPos);
    yPos += 12;
    
    // Description
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    checkPageBreak(10);
    doc.text('Description', margin, yPos);
    yPos += 8;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const descriptionLines = doc.splitTextToSize(report.description, maxWidth);
    descriptionLines.forEach(line => {
        checkPageBreak(6);
        doc.text(line, margin, yPos);
        yPos += 6;
    });
    yPos += 6;
    
    // Related Projects
    if (report.relatedProjects && report.relatedProjects.length > 0) {
        const projects = loadProjects();
        const relatedProjects = report.relatedProjects.map(id => projects.find(p => p.id === id)).filter(p => p);
        
        if (relatedProjects.length > 0) {
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Related Projects', margin, yPos);
            yPos += 8;
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            
            relatedProjects.forEach(project => {
                checkPageBreak(20);
                doc.text(`• ${project.projectName}`, margin + 5, yPos);
                yPos += 5;
                doc.setTextColor(100);
                doc.text(`  Type: ${project.projectType} | Status: ${project.status}`, margin + 5, yPos);
                yPos += 5;
                doc.text(`  Location: ${project.location}`, margin + 5, yPos);
                yPos += 5;
                doc.text(`  Contractor: ${project.contractor}`, margin + 5, yPos);
                yPos += 8;
                doc.setTextColor(0);
            });
        }
    }
    
    // Attachments
    if (report.attachments && report.attachments.length > 0) {
        checkPageBreak(20);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text('Attachments', margin, yPos);
        yPos += 10;
        
        // Process each attachment
        for (const attachment of report.attachments) {
            const isImage = attachment.type.startsWith('image/');
            
            if (isImage) {
                // Add image to PDF
                try {
                    checkPageBreak(80); // Reserve space for image
                    
                    // Add image caption
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'italic');
                    doc.setTextColor(100);
                    doc.text(attachment.name, margin, yPos);
                    yPos += 5;
                    
                    // Calculate image dimensions to fit width
                    const imgWidth = maxWidth;
                    const imgHeight = 80; // Increased for better visibility
                    
                    // Determine image format
                    const imgFormat = getImageFormat(attachment.type);
                    
                    // Add image
                    doc.addImage(attachment.data, imgFormat, margin, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 10;
                    
                    doc.setTextColor(0);
                    console.log(`Successfully embedded image: ${attachment.name} (${imgFormat})`);
                } catch (error) {
                    console.error('Error adding image to PDF:', error);
                    // Fallback to showing filename
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    doc.text(`• ${attachment.name} (Image - could not embed)`, margin + 5, yPos);
                    yPos += 6;
                }
            } else {
                // For PDF and other files, just show the filename
                checkPageBreak(10);
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0);
                
                // Add file icon representation and name
                doc.text(`• ${attachment.name}`, margin + 5, yPos);
                yPos += 5;
                
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(`  Type: ${attachment.type} | Size: ${formatFileSize(attachment.size)}`, margin + 5, yPos);
                yPos += 8;
                doc.setTextColor(0);
            }
        }
    }
    
    // Footer with page numbers (after all content is added)
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Generated on ${new Date().toLocaleString()}`, margin, pageHeight - 10);
    }
    
    // Save PDF
    doc.save(`${report.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`);
    
    hideLoading();
    showToast('PDF exported successfully', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            hideLoading();
            showToast('Error generating PDF', 'error');
        }
    }, 100);
}

/**
 * View attachment in modal
 */
function viewAttachment(attachmentId, reportId) {
    console.log('Viewing attachment:', attachmentId, 'from report:', reportId);
    const report = getReportById(reportId);
    
    if (!report || !report.attachments) {
        console.error('Report or attachments not found');
        showToast('Report not found', 'error');
        return;
    }
    
    console.log('Report attachments:', report.attachments);
    const attachment = report.attachments.find(a => a.id === attachmentId);
    
    if (!attachment) {
        console.error('Attachment not found:', attachmentId);
        showToast('Attachment not found', 'error');
        return;
    }
    
    if (attachment.type.startsWith('image/')) {
        showModal(attachment.name, `<img src="${attachment.data}" style="max-width: 100%; height: auto;">`);
    } else {
        // For non-image files, offer to download
        showModal(attachment.name, `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-file-pdf" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
                <p>${escapeHtml(attachment.name)}</p>
                <p style="color: var(--text-light); font-size: 0.875rem;">Type: ${attachment.type}</p>
                <button class="btn btn-primary" onclick="downloadAttachment('${attachmentId}', '${reportId}'); hideModal();" style="margin-top: 1rem;">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `);
    }
}

/**
 * Download attachment
 */
function downloadAttachment(attachmentId, reportId) {
    console.log('Downloading attachment:', attachmentId);
    const report = getReportById(reportId);
    
    if (!report || !report.attachments) {
        console.error('Report or attachments not found');
        showToast('Report not found', 'error');
        return;
    }
    
    const attachment = report.attachments.find(a => a.id === attachmentId);
    
    if (!attachment) {
        console.error('Attachment not found for download:', attachmentId);
        showToast('Attachment not found', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    link.click();
    showToast(`Downloading ${attachment.name}`, 'success');
}

/**
 * Setup reports controls
 */
function setupReportsControls() {
    const newReportBtn = document.getElementById('new-report-btn');
    if (newReportBtn) {
        newReportBtn.addEventListener('click', () => showReportForm());
    }
}

/**
 * Auto-save draft
 */
function startAutoSave() {
    clearAutoSave();
    reportDraftTimeout = setInterval(() => {
        const title = document.getElementById('report-title')?.value;
        const description = document.getElementById('report-description')?.value;
        if (title || description) {
            localStorage.setItem('report_draft', JSON.stringify({ title, description }));
        }
    }, 30000);
}

/**
 * Clear auto-save
 */
function clearAutoSave() {
    if (reportDraftTimeout) {
        clearInterval(reportDraftTimeout);
        reportDraftTimeout = null;
    }
    localStorage.removeItem('report_draft');
}

/**
 * Refresh reports view
 */
function refreshReportsView() {
    populateProjectFilter();
    renderReportsList();
}
