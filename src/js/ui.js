let currentSort = { column: null, direction: null };
let currentFeatures = [];

export function initTableSorting() {
  document.querySelectorAll('#data-table th.sortable').forEach(header => {
    header.addEventListener('click', () => handleSort(header.getAttribute('data-sort')));
  });
}

function handleSort(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : (currentSort.direction === 'desc' ? null : 'asc');
    if (!currentSort.direction) currentSort.column = null;
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }
  
  updateSortIndicators();
  renderTableRows(sortFeatures(currentFeatures, currentSort));
}

function updateSortIndicators() {
  document.querySelectorAll('#data-table th.sortable').forEach(header => {
    header.classList.remove('sort-asc', 'sort-desc');
    if (header.getAttribute('data-sort') === currentSort.column) {
      header.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
      const icon = header.querySelector('.sort-icon');
      if (icon) icon.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
    } else {
      const icon = header.querySelector('.sort-icon');
      if (icon) icon.textContent = '⇅';
    }
  });
}

function sortFeatures(features, sort) {
  if (!sort.column || !sort.direction) return features;
  
  return [...features].sort((a, b) => {
    let aVal = a.properties[sort.column];
    let bVal = b.properties[sort.column];
    
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    
    if (sort.column === 'cost') {
      aVal = Number(aVal);
      bVal = Number(bVal);
      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
}

export function renderTable(features){
  currentFeatures = features;
  const tbody = document.querySelector('#data-table tbody');
  const table = document.getElementById('data-table');
  const emptyState = document.getElementById('empty-state');
  
  tbody.innerHTML = '';
  
  if (features.length === 0) {
    table.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  table.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  
  renderTableRows(sortFeatures(features, currentSort));
}

function renderTableRows(features) {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  
  features.forEach((f, index) => {
    const p = f.properties;
    const tr = document.createElement('tr');
    tr.className = 'project-row';
    tr.dataset.projectIndex = index;
    
    const statusBadge = getStatusBadge(p.status);
    
    tr.innerHTML = `
      <td><strong>${escapeHtml(p.name||'Unnamed Project')}</strong></td>
      <td><span class="type-badge">${escapeHtml(p.type||'N/A')}</span></td>
      <td>${statusBadge}</td>
      <td>📍 ${escapeHtml(p.location||'N/A')}</td>
      <td class="num">${p.cost!=null?formatCurrency(Number(p.cost)):'-'}</td>
      <td class="no-print">
        <button class="btn btn-secondary btn-zoom" data-lng="${f.geometry.coordinates[0]}" data-lat="${f.geometry.coordinates[1]}" title="Zoom to project location">🔍 View</button>
        <button class="btn btn-secondary btn-details" data-index="${index}" title="View project details">📋 Details</button>
      </td>
    `;
    frag.appendChild(tr);
    
    // Create expandable details row
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'project-details hidden';
    detailsRow.innerHTML = `
      <td colspan="6">
        <div class="details-panel">
          <div class="details-grid">
            <div class="detail-item">
              <label>Start Date:</label>
              <span>${p.startDate ? formatDate(p.startDate) : 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>End Date:</label>
              <span>${p.endDate ? formatDate(p.endDate) : 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Contractor:</label>
              <span>${escapeHtml(p.contractor||'N/A')}</span>
            </div>
            <div class="detail-item full-width">
              <label>Description:</label>
              <span>${escapeHtml(p.description||'No description available')}</span>
            </div>
            <div class="detail-item full-width">
              <label>Documents:</label>
              <div class="documents-list">
                ${p.documents && p.documents.length > 0 ? 
                  p.documents.map(doc => `<span class="document-item">📄 ${escapeHtml(doc.name)}</span>`).join('') : 
                  '<span class="muted">No documents attached</span>'
                }
                <button class="btn btn-secondary btn-attach" data-index="${index}" title="Attach documents">� Attach Files</button>
              </div>
            </div>
          </div>
        </div>
      </td>
    `;
    frag.appendChild(detailsRow);
  });
  tbody.appendChild(frag);

  // Add event listeners for zoom buttons
  tbody.querySelectorAll('.btn-zoom').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = Number(btn.getAttribute('data-lat'));
      const lng = Number(btn.getAttribute('data-lng'));
      document.dispatchEvent(new CustomEvent('zoom-to', { detail: { lat, lng } }));
    });
  });
  
  // Add event listeners for details toggle buttons
  tbody.querySelectorAll('.btn-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = btn.getAttribute('data-index');
      const projectRow = tbody.querySelector(`tr[data-project-index="${index}"]`);
      const detailsRow = projectRow.nextElementSibling;
      
      if (detailsRow.classList.contains('hidden')) {
        detailsRow.classList.remove('hidden');
        btn.innerHTML = '📋 Hide';
        btn.title = 'Hide project details';
      } else {
        detailsRow.classList.add('hidden');
        btn.innerHTML = '📋 Details';
        btn.title = 'View project details';
      }
    });
  });
  
  // Add event listeners for attach buttons
  tbody.querySelectorAll('.btn-attach').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = btn.getAttribute('data-index');
      openFileAttachmentDialog(index);
    });
  });
}

function escapeHtml(s){
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, c => map[c]);
}

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  } catch {
    return '$' + n.toLocaleString();
  }
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status) {
  const statusLower = (status || '').toLowerCase();
  let badgeClass = 'status-badge';
  let icon = '⚪';
  
  if (statusLower.includes('complete') || statusLower.includes('finished')) {
    badgeClass += ' status-completed';
    icon = '✅';
  } else if (statusLower.includes('progress') || statusLower.includes('active') || statusLower.includes('ongoing')) {
    badgeClass += ' status-in-progress';
    icon = '🚧';
  } else if (statusLower.includes('plan') || statusLower.includes('design') || statusLower.includes('pending')) {
    badgeClass += ' status-planning';
    icon = '📋';
  } else if (statusLower.includes('hold') || statusLower.includes('pause') || statusLower.includes('delay')) {
    badgeClass += ' status-on-hold';
    icon = '⏸️';
  }
  
  return `<span class="${badgeClass}">${icon} ${escapeHtml(status || 'Unknown')}</span>`;
}

function openFileAttachmentDialog(projectIndex) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'attachment-modal';
  modal.innerHTML = `
    <div class="attachment-modal-content">
      <div class="attachment-modal-header">
        <h3>📎 Attach Documents</h3>
        <button class="modal-close" onclick="this.closest('.attachment-modal').remove()">✕</button>
      </div>
      <div class="attachment-modal-body">
        
        <!-- Attachment Method Selector -->
        <div class="attachment-methods">
          <h4>Choose Attachment Method:</h4>
          <div class="method-buttons">
            <button class="btn method-btn active" data-method="local">💾 Local Files</button>
            <button class="btn method-btn" data-method="url">🔗 Public URLs</button>
            <button class="btn method-btn" data-method="embed">📎 Embed Small Files</button>
            <button class="btn method-btn" data-method="cloud">☁️ Cloud Storage</button>
          </div>
        </div>

        <!-- Local Files Method -->
        <div class="attachment-method" id="method-local">
          <div class="file-drop-zone" id="file-drop-zone">
            <div class="drop-zone-content">
              <span class="drop-icon">📁</span>
              <p>Drop files here or <button class="btn btn-secondary" id="browse-files">Browse Files</button></p>
              <p class="file-types">Supports: PDF, Images (JPG, PNG), Documents (DOC, DOCX)</p>
              <p class="muted small">⚠️ Local files won't be accessible when sharing online</p>
            </div>
            <input type="file" id="attachment-file-input" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="display: none;">
          </div>
        </div>

        <!-- URL Method -->
        <div class="attachment-method hidden" id="method-url">
          <div class="url-input-section">
            <h5>Add Document by URL</h5>
            <p class="muted">Perfect for files hosted on Google Drive, Dropbox, or any public URL</p>
            <div class="url-input-group">
              <input type="text" id="document-url" placeholder="https://drive.google.com/file/d/..." style="width: 60%;">
              <input type="text" id="document-name" placeholder="Document name" style="width: 35%; margin-left: 5px;">
              <button class="btn btn-secondary" id="add-url-document">Add</button>
            </div>
            <div class="cloud-instructions">
              <details>
                <summary>How to get public URLs from cloud storage:</summary>
                <div class="instruction-list">
                  <p><strong>Google Drive:</strong></p>
                  <ol>
                    <li>Right-click file → Share</li>
                    <li>Change to "Anyone with the link can view"</li>
                    <li>Copy link and replace '/edit' with '/preview'</li>
                  </ol>
                  <p><strong>Dropbox:</strong></p>
                  <ol>
                    <li>Right-click file → Share</li>
                    <li>Create link and copy URL</li>
                    <li>Change 'dl=0' to 'dl=1' at the end</li>
                  </ol>
                </div>
              </details>
            </div>
          </div>
        </div>

        <!-- Embed Method -->
        <div class="attachment-method hidden" id="method-embed">
          <div class="embed-section">
            <h5>Embed Small Files (< 1MB)</h5>
            <p class="muted">Files will be embedded directly in the data - perfect for sharing!</p>
            <div class="file-drop-zone small" id="embed-drop-zone">
              <div class="drop-zone-content">
                <span class="drop-icon">📎</span>
                <p>Drop small files here or <button class="btn btn-secondary" id="browse-embed-files">Browse</button></p>
                <p class="file-types">Max 1MB per file. Embedded files work offline!</p>
              </div>
              <input type="file" id="embed-file-input" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt" style="display: none;">
            </div>
          </div>
        </div>

        <!-- Cloud Storage Method -->
        <div class="attachment-method hidden" id="method-cloud">
          <div class="cloud-section">
            <h5>Cloud Storage Integration</h5>
            <p class="muted">Connect to your cloud storage for seamless file management</p>
            <div class="cloud-options">
              <button class="btn btn-secondary" id="connect-google-drive">
                <span style="color: #4285f4;">📂</span> Google Drive
              </button>
              <button class="btn btn-secondary" id="connect-dropbox">
                <span style="color: #0061ff;">📦</span> Dropbox
              </button>
              <button class="btn btn-secondary" id="github-upload">
                <span style="color: #333;">🐱</span> GitHub Files
              </button>
            </div>
            <div class="cloud-status" id="cloud-status">
              <p class="muted">Select a cloud service to get started</p>
            </div>
          </div>
        </div>

        <div class="attached-files" id="attached-files">
          <h4>Current Attachments:</h4>
          <div id="current-attachments"></div>
        </div>
      </div>
      <div class="attachment-modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.attachment-modal').remove()">Cancel</button>
        <button class="btn" id="save-attachments">Save Attachments</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load current attachments
  loadCurrentAttachments(projectIndex);
  
  // Bind events
  bindAttachmentEvents(projectIndex, modal);
}

function bindAttachmentEvents(projectIndex, modal) {
  const saveBtn = modal.querySelector('#save-attachments');
  
  // Method switching
  modal.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      modal.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
      modal.querySelectorAll('.attachment-method').forEach(m => m.classList.add('hidden'));
      
      btn.classList.add('active');
      const method = btn.dataset.method;
      modal.querySelector(`#method-${method}`).classList.remove('hidden');
    });
  });

  // Local files
  const browseBtn = modal.querySelector('#browse-files');
  const fileInput = modal.querySelector('#attachment-file-input');
  const dropZone = modal.querySelector('#file-drop-zone');
  
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => handleFileSelection(e, modal));
  }
  
  // Drag and drop for local files
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFileSelection(e, modal);
    });
  }

  // URL method
  const addUrlBtn = modal.querySelector('#add-url-document');
  if (addUrlBtn) {
    addUrlBtn.addEventListener('click', () => {
      const urlInput = modal.querySelector('#document-url');
      const nameInput = modal.querySelector('#document-name');
      const url = urlInput.value.trim();
      const name = nameInput.value.trim();
      
      if (url && name) {
        addUrlDocument(url, name);
        urlInput.value = '';
        nameInput.value = '';
      } else {
        alert('Please enter both URL and document name');
      }
    });
  }

  // Embed method
  const browseEmbedBtn = modal.querySelector('#browse-embed-files');
  const embedFileInput = modal.querySelector('#embed-file-input');
  const embedDropZone = modal.querySelector('#embed-drop-zone');
  
  if (browseEmbedBtn) {
    browseEmbedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      embedFileInput.click();
    });
  }
  
  if (embedFileInput) {
    embedFileInput.addEventListener('change', (e) => handleEmbedFileSelection(e));
  }

  // Embed drag and drop
  if (embedDropZone) {
    embedDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      embedDropZone.classList.add('drag-over');
    });
    
    embedDropZone.addEventListener('dragleave', () => {
      embedDropZone.classList.remove('drag-over');
    });
    
    embedDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      embedDropZone.classList.remove('drag-over');
      handleEmbedFileSelection(e);
    });
  }

  // Cloud storage buttons
  const googleDriveBtn = modal.querySelector('#connect-google-drive');
  const dropboxBtn = modal.querySelector('#connect-dropbox');
  const githubBtn = modal.querySelector('#github-upload');
  
  if (googleDriveBtn) {
    googleDriveBtn.addEventListener('click', () => showCloudInstructions('google-drive'));
  }
  if (dropboxBtn) {
    dropboxBtn.addEventListener('click', () => showCloudInstructions('dropbox'));
  }
  if (githubBtn) {
    githubBtn.addEventListener('click', () => showGitHubUploadInstructions());
  }
  
  saveBtn.addEventListener('click', () => {
    saveAttachments(projectIndex);
    modal.remove();
  });
}

function handleFileSelection(e) {
  const files = e.target.files || e.dataTransfer.files;
  const attachedFiles = document.getElementById('attached-files');
  
  Array.from(files).forEach(file => {
    if (validateFile(file)) {
      addFileToAttachmentList(file);
    }
  });
}

function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (file.size > maxSize) {
    alert(`File ${file.name} is too large. Maximum size is 10MB.`);
    return false;
  }
  
  if (!allowedTypes.includes(file.type)) {
    alert(`File type ${file.type} is not supported.`);
    return false;
  }
  
  return true;
}

function addFileToAttachmentList(file) {
  const attachmentsList = document.getElementById('current-attachments');
  
  const fileItem = document.createElement('div');
  fileItem.className = 'attachment-file-item';
  fileItem.innerHTML = `
    <div class="file-info">
      <span class="file-icon">${getFileIcon(file.type)}</span>
      <div class="file-details">
        <span class="file-name">${escapeHtml(file.name)}</span>
        <span class="file-size">${formatFileSize(file.size)}</span>
      </div>
    </div>
    <button class="btn-remove-file" onclick="this.parentElement.remove()">🗑️</button>
  `;
  
  // Store file reference
  fileItem._fileData = file;
  
  attachmentsList.appendChild(fileItem);
}

function getFileIcon(mimeType) {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('word')) return '📝';
  return '📎';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function loadCurrentAttachments(projectIndex) {
  const currentFeature = currentFeatures[projectIndex];
  if (!currentFeature || !currentFeature.properties.documents) return;
  
  const attachmentsList = document.getElementById('current-attachments');
  const documents = currentFeature.properties.documents;
  
  documents.forEach(doc => {
    const fileItem = document.createElement('div');
    fileItem.className = 'attachment-file-item existing';
    fileItem.innerHTML = `
      <div class="file-info">
        <span class="file-icon">${getFileIcon(doc.type || 'application/octet-stream')}</span>
        <div class="file-details">
          <span class="file-name">${escapeHtml(doc.name)}</span>
          <span class="file-size">${doc.size ? formatFileSize(doc.size) : 'Unknown size'}</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="btn-view-file" onclick="viewDocument('${doc.url || '#'}')">👁️</button>
        <button class="btn-remove-file" onclick="this.closest('.attachment-file-item').remove()">🗑️</button>
      </div>
    `;
    
    attachmentsList.appendChild(fileItem);
  });
}

function saveAttachments(projectIndex) {
  const attachmentsList = document.getElementById('current-attachments');
  const fileItems = attachmentsList.querySelectorAll('.attachment-file-item');
  const documents = [];
  
  fileItems.forEach(item => {
    if (item.classList.contains('existing')) {
      // Keep existing document
      const fileName = item.querySelector('.file-name').textContent;
      documents.push({
        name: fileName,
        type: 'existing',
        url: '#' // Would be actual URL in real implementation
      });
    } else if (item._documentData) {
      // New document data (URL, embedded, etc.)
      documents.push(item._documentData);
    } else if (item._fileData) {
      // Legacy local file upload
      const file = item._fileData;
      documents.push({
        name: file.name,
        type: 'local',
        mimeType: file.type,
        size: file.size,
        url: URL.createObjectURL(file) // Temporary local URL
      });
    }
  });
  
  // Update the feature
  if (currentFeatures[projectIndex]) {
    currentFeatures[projectIndex].properties.documents = documents;
  }
  
  // Re-render the table to show updated document count
  renderTable(currentFeatures);
  
  // Show success message with sharing info
  if (documents.some(doc => doc.type === 'url' || doc.type === 'embedded')) {
    setTimeout(() => {
      alert('✅ Attachments saved! URL and embedded documents will work when sharing your data online.');
    }, 100);
  }
}

function viewDocument(url) {
  if (url === '#') {
    alert('Document preview not available');
    return;
  }
  
  window.open(url, '_blank');
}

// New attachment handling functions
function addUrlDocument(url, name) {
  const attachmentsList = document.getElementById('current-attachments');
  
  const fileItem = document.createElement('div');
  fileItem.className = 'attachment-file-item url-document';
  fileItem.innerHTML = `
    <div class="file-info">
      <span class="file-icon">🔗</span>
      <div class="file-details">
        <span class="file-name">${escapeHtml(name)}</span>
        <span class="file-size">Public URL</span>
      </div>
    </div>
    <div class="file-actions">
      <button class="btn-view-file" onclick="window.open('${encodeURIComponent(url)}', '_blank')">👁️</button>
      <button class="btn-remove-file" onclick="this.parentElement.parentElement.remove()">🗑️</button>
    </div>
  `;
  
  // Store document data
  fileItem._documentData = {
    name: name,
    url: url,
    type: 'url',
    size: null
  };
  
  attachmentsList.appendChild(fileItem);
}

function handleEmbedFileSelection(e) {
  const files = e.target.files || e.dataTransfer.files;
  const maxSize = 1024 * 1024; // 1MB limit for embedding
  
  Array.from(files).forEach(file => {
    if (file.size > maxSize) {
      alert(`File ${file.name} is too large for embedding. Maximum size is 1MB. Use URL method instead.`);
      return;
    }
    
    if (validateFile(file)) {
      // Read file as base64 for embedding
      const reader = new FileReader();
      reader.onload = function(e) {
        addEmbeddedDocument(file.name, file.type, e.target.result, file.size);
      };
      reader.readAsDataURL(file);
    }
  });
}

function addEmbeddedDocument(name, type, dataUrl, size) {
  const attachmentsList = document.getElementById('current-attachments');
  
  const fileItem = document.createElement('div');
  fileItem.className = 'attachment-file-item embedded-document';
  fileItem.innerHTML = `
    <div class="file-info">
      <span class="file-icon">📎</span>
      <div class="file-details">
        <span class="file-name">${escapeHtml(name)}</span>
        <span class="file-size">${formatFileSize(size)} (Embedded)</span>
      </div>
    </div>
    <div class="file-actions">
      <button class="btn-view-file" onclick="window.open('${dataUrl}', '_blank')">👁️</button>
      <button class="btn-remove-file" onclick="this.parentElement.parentElement.remove()">🗑️</button>
    </div>
  `;
  
  // Store document data
  fileItem._documentData = {
    name: name,
    type: 'embedded',
    mimeType: type,
    data: dataUrl,
    size: size
  };
  
  attachmentsList.appendChild(fileItem);
}

function showCloudInstructions(service) {
  const statusDiv = document.getElementById('cloud-status');
  
  if (service === 'google-drive') {
    statusDiv.innerHTML = `
      <div class="cloud-instructions">
        <h6>📂 Google Drive Integration</h6>
        <p><strong>Step 1:</strong> Upload your files to Google Drive</p>
        <p><strong>Step 2:</strong> Right-click file → Share → "Anyone with the link can view"</p>
        <p><strong>Step 3:</strong> Copy the sharing URL</p>
        <p><strong>Step 4:</strong> Switch to "Public URLs" method and paste the link</p>
        <div style="margin-top: 10px;">
          <button class="btn btn-secondary" onclick="document.querySelector('[data-method=url]').click()">
            Switch to URL Method
          </button>
        </div>
      </div>
    `;
  } else if (service === 'dropbox') {
    statusDiv.innerHTML = `
      <div class="cloud-instructions">
        <h6>📦 Dropbox Integration</h6>
        <p><strong>Step 1:</strong> Upload files to Dropbox</p>
        <p><strong>Step 2:</strong> Right-click file → Share → Create link</p>
        <p><strong>Step 3:</strong> Change 'dl=0' to 'dl=1' in the URL for direct access</p>
        <p><strong>Step 4:</strong> Use the "Public URLs" method to add the link</p>
        <div style="margin-top: 10px;">
          <button class="btn btn-secondary" onclick="document.querySelector('[data-method=url]').click()">
            Switch to URL Method
          </button>
        </div>
      </div>
    `;
  }
}

function showGitHubUploadInstructions() {
  const statusDiv = document.getElementById('cloud-status');
  statusDiv.innerHTML = `
    <div class="cloud-instructions">
      <h6>🐱 GitHub Files Integration</h6>
      <p><strong>For your deployed WebGIS:</strong></p>
      <ol>
        <li>Create a 'documents' folder in your GitHub repository</li>
        <li>Upload files via GitHub web interface or Git</li>
        <li>Use raw URLs: <code>https://raw.githubusercontent.com/USERNAME/REPO/main/documents/filename.pdf</code></li>
        <li>Add these URLs using the "Public URLs" method</li>
      </ol>
      <div style="margin-top: 10px;">
        <button class="btn btn-secondary" onclick="document.querySelector('[data-method=url]').click()">
          Switch to URL Method
        </button>
      </div>
    </div>
  `;
}
