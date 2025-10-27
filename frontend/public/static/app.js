/**
 * Novel Similarity Analyzer - Frontend JavaScript
 * Handles file uploads, API communication, and results display
 */

// Add CSS styles for visualizations
var style = document.createElement('style');
style.textContent = `
  .heatmap-container img,
  .network-container img {
    transition: transform 0.2s ease-out;
    will-change: transform;
    transform-origin: center;
  }
  
  .tooltip {
    pointer-events: none;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    max-width: 300px;
    white-space: pre-wrap;
    word-break: break-word;
    background-color: rgba(0, 0, 0, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.4;
    z-index: 50;
  }
`;
document.head.appendChild(style);

class NovelSimilarityAnalyzer {
  constructor() {
    // Load Plotly.js for interactive visualizations
    if (!window.Plotly) {
      var self = this;
      var script = document.createElement('script');
      script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
      script.onload = function() {
        console.log('Plotly.js loaded successfully');
        self.plotlyLoaded = true;
        // Re-render any pending visualizations after Plotly loads
        if (self.pendingHeatmap) {
          self.renderHeatmap(self.pendingHeatmap.plotId, self.pendingHeatmap.data);
        }
        if (self.pendingNetwork) {
          self.renderNetwork(self.pendingNetwork.plotId, self.pendingNetwork.data);
        }
      };
      document.head.appendChild(script);
    } else {
      this.plotlyLoaded = true;
    }

    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'fixed hidden z-40 bg-black bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm max-w-xs';
    document.body.appendChild(this.tooltip);
    
    // Load Chart.js if not already loaded
    if (!window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      var self = this;
      script.onload = function() {
        console.log('Chart.js loaded successfully');
        self.initializeCharts();
      };
      document.head.appendChild(script);
    }

    // Auto-detect backend URL based on current environment
    const currentHost = window.location.hostname;
    if (currentHost.includes('e2b.dev')) {
      // E2B sandbox environment - use public URL
      this.apiBaseUrl = 'https://' + currentHost.replace('3000-', '8000-');
    } else if (currentHost === 'localhost') {
      // Local development - use backend URL directly
      this.apiBaseUrl = 'http://localhost:8000';
    } else {
      // Production - use relative path without /api prefix
      this.apiBaseUrl = '';
    }
    // If a runtime API base URL was injected (dev), prefer it
    if (typeof window !== 'undefined' && window.apiBaseUrl !== undefined) {
      this.apiBaseUrl = window.apiBaseUrl;
    }

    this.currentSessionId = null;
    this.currentResults = null;
    this.currentFiles = null;
    this.folderFiles = null;
    this.maxInputFiles = 5;
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Form submission
    const form = document.getElementById('analysisForm');
    if (form) {
      var self = this;
      form.addEventListener('submit', function(e) { self.handleFormSubmit(e); });
    }

    // File input dropzones
    this.setupDropzone('inputFilesDropzone', 'inputFiles', true);
    this.setupDropzone('databaseDropzone', 'databaseFile', false);

    // File selection buttons
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    if (selectFilesBtn) {
      selectFilesBtn.addEventListener('click', function() {
        document.getElementById('inputFiles').click();
      });
    }

    const selectFolderBtn = document.getElementById('selectFolderBtn');
    if (selectFolderBtn) {
      selectFolderBtn.addEventListener('click', function() {
        document.getElementById('inputFolder').click();
      });
    }

    // File input change handlers
    const inputFiles = document.getElementById('inputFiles');
    if (inputFiles) {
      var self = this;
      inputFiles.addEventListener('change', function(e) { self.handleInputFilesChange(e); });
    }

    const inputFolder = document.getElementById('inputFolder');
    if (inputFolder) {
      var self = this;
      inputFolder.addEventListener('change', function(e) { self.handleFolderChange(e); });
    }

    const databaseFile = document.getElementById('databaseFile');
    if (databaseFile) {
      var self = this;
      databaseFile.addEventListener('change', function(e) { self.handleDatabaseFileChange(e); });
    }

    // Novel names input
    const novelNames = document.getElementById('novelNames');
    if (novelNames) {
      var self = this;
      novelNames.addEventListener('input', function(e) { self.handleNovelNamesChange(e); });
    }
  }

  setupDropzone(dropzoneId, inputId, multiple = false) {
    var dropzone = document.getElementById(dropzoneId);
    var input = document.getElementById(inputId);
    var self = this;

    if (!dropzone || !input) return;

    // Click to select files
    dropzone.addEventListener('click', function() { input.click(); });

    // Drag and drop events
    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropzone.classList.add('dropzone-active');
    });

    dropzone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dropzone-active');
    });

    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dropzone-active');
      
      var files = e.dataTransfer.files;
      if (files.length > 0) {
        if (multiple && files.length > self.maxInputFiles) {
          self.showAlert('สามารถอัปโหลดได้สูงสุด ' + self.maxInputFiles + ' ไฟล์', 'error');
          return;
        }
        
        // Update file input
        input.files = files;
        
        // Trigger change event
        var event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    });
  }

  handleInputFilesChange(event) {
    var files = [].slice.call(event.target.files);
    this.displaySelectedFiles(files, 'files');
  }

  handleFolderChange(event) {
    var files = [].slice.call(event.target.files);
    
    console.log('📁 Folder files detected:', files.length);
    
    // Filter only supported file types and log details
    const supportedFiles = files.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop();
      const isSupported = ['txt', 'docx', 'pdf'].includes(ext);
      
      console.log('📄 File: ' + file.name + ', Path: ' + file.webkitRelativePath + ', Supported: ' + isSupported);
      
      return isSupported;
    });
    
    console.log('✅ Supported files:', supportedFiles.length);
    
    if (supportedFiles.length === 0) {
      this.showAlert('ไม่พบไฟล์ที่รองรับในโฟลเดอร์ (.txt, .docx, .pdf)', 'warning');
      return;
    }
    
    // Store original files with webkitRelativePath for backend
    this.folderFiles = supportedFiles;
    
    this.displaySelectedFiles(supportedFiles, 'folder');
  }

  displaySelectedFiles(files, source) {
    const container = document.getElementById('inputFilesList');
    
    if (!container) return;

    container.innerHTML = '';

    if (files.length === 0) {
      if (source === 'folder') {
        container.innerHTML = `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
              <p class="text-yellow-800">ไม่พบไฟล์ที่รองรับในโฟลเดอร์ที่เลือก</p>
            </div>
            <p class="text-sm text-yellow-700 mt-1">รองรับเฉพาะไฟล์: .txt, .docx, .pdf</p>
          </div>
        `;
      }
      return;
    }

    if (files.length > this.maxInputFiles) {
      this.showAlert('สามารถอัปโหลดได้สูงสุด ' + this.maxInputFiles + ' ไฟล์ (พบ ' + files.length + ' ไฟล์) - จะใช้ ' + this.maxInputFiles + ' ไฟล์แรก', 'warning');
      // Take only first maxInputFiles
      files = files.slice(0, this.maxInputFiles);
    }

    // Add source indicator with detailed info
    if (source === 'folder' && files.length > 0) {
      const sourceInfo = document.createElement('div');
      sourceInfo.className = 'bg-green-50 border border-green-200 rounded-lg p-3 mb-3';
      
      // Get folder name from first file
      const firstFile = files[0];
      const folderName = firstFile.webkitRelativePath ? 
        firstFile.webkitRelativePath.split('/')[0] : 'โฟลเดอร์';
      
      sourceInfo.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="fas fa-folder text-green-600 mr-2"></i>
            <span class="font-medium text-green-800">📁 ' + folderName + '</span>
          </div>
          <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            ' + files.length + ' ไฟล์
          </span>
        </div>
        <p class="text-sm text-green-700 mt-1">ไฟล์จากโฟลเดอร์ - โครงสร้างจะถูกเก็บไว้</p>
      `;
      container.appendChild(sourceInfo);
    }

    files.forEach((file, index) => {
      const fileItem = this.createFileItem(file, index, source);
      container.appendChild(fileItem);
    });

    // Update the actual input with selected files
    this.updateFileInput(files);
    
    // Show success message for folder uploads
    if (source === 'folder') {
      this.showAlert('✅ เลือกไฟล์จากโฟลเดอร์สำเร็จ: ' + files.length + ' ไฟล์', 'success');
    }
  }

  handleDatabaseFileChange(event) {
    const file = event.target.files[0];
    const container = document.getElementById('databaseFileInfo');
    
    if (!container) return;

    container.innerHTML = '';

    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      this.showAlert('ไฟล์ฐานข้อมูลต้องเป็นไฟล์ .zip เท่านั้น', 'error');
      return;
    }

    const fileItem = this.createFileItem(file, 0, 'database');
    container.appendChild(fileItem);
  }

  createFileItem(file, index, type = 'input') {
    const div = document.createElement('div');
    div.className = 'file-item success';
    div.dataset.fileIndex = index;
    
    const sizeText = this.formatFileSize(file.size);
    const typeIcon = this.getFileTypeIcon(file.name);
    
    // Show relative path for folder uploads with better formatting
    let displayName = file.name;
    if (type === 'folder' && file.webkitRelativePath) {
      displayName = file.webkitRelativePath;
      // Highlight folder structure
      const pathParts = displayName.split('/');
      if (pathParts.length > 1) {
        displayName = '📁 ' + pathParts.slice(0, -1).join('/') + ' / ' + pathParts[pathParts.length - 1];
      }
    }
    
    div.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="${typeIcon} text-blue-600"></i>
        <div>
          <p class="font-medium text-gray-900">${displayName}</p>
          <p class="text-sm text-gray-600">${sizeText}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-green-600 text-sm">
          <i class="fas fa-check-circle"></i> Ready
        </span>
        <button type="button" class="text-red-600 hover:text-red-800" onclick="analyzer.removeFileItem(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    return div;
  }

  updateFileInput(files) {
    // Store files for form submission (preserve webkitRelativePath)
    this.currentFiles = files;
    
    // Also try to update the input element for compatibility
    try {
      const dataTransfer = new DataTransfer();
      files.forEach(file => dataTransfer.items.add(file));
      
      const inputFiles = document.getElementById('inputFiles');
      if (inputFiles) {
        inputFiles.files = dataTransfer.files;
      }
    } catch (error) {
      console.log('📝 DataTransfer not supported, using stored files');
    }
  }

  removeFileItem(index) {
    // Remove from display
    const fileItem = document.querySelector(`[data-file-index="${index}"]`);
    if (fileItem) {
      fileItem.remove();
    }

    // Update the file input by collecting remaining files
    const inputFiles = document.getElementById('inputFiles');
    if (inputFiles && inputFiles.files) {
      const remainingFiles = Array.from(inputFiles.files).filter((_, i) => i !== index);
      this.updateFileInput(remainingFiles);
    }
  }

  getFileTypeIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'txt': return 'fas fa-file-alt';
      case 'pdf': return 'fas fa-file-pdf';
      case 'docx': return 'fas fa-file-word';
      case 'zip': return 'fas fa-file-archive';
      default: return 'fas fa-file';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  handleNovelNamesChange(event) {
    const value = event.target.value.trim();
    const preview = document.getElementById('novelNamesPreview');
    
    if (!preview) return;

    if (value) {
      const names = value.split(',').map(name => name.trim()).filter(name => name.length > 0);
      if (names.length > 0) {
        preview.innerHTML = `<strong>ชื่อที่จะใช้:</strong> ${names.map((name, i) => `<span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1">${i + 1}. ${name}</span>`).join('')}`;
      } else {
        preview.innerHTML = '';
      }
    } else {
      preview.innerHTML = '';
    }
  }

  async handleFormSubmit(event) {
    event.preventDefault();
    
    try {
      // Validate form
      if (!this.validateForm()) {
        return;
      }

      // Show loading section
      this.showLoading(true);
      
      // Prepare form data
      const formData = new FormData();
      
      // Add input files (handle both regular files and folder files)
      let filesToUpload = [];
      
      // Check if we have stored files (from folder selection)
      if (this.currentFiles && this.currentFiles.length > 0) {
        filesToUpload = this.currentFiles;
        console.log('📁 Using stored folder files:', filesToUpload.length);
      } else {
        // Use regular file input
        const inputFiles = document.getElementById('inputFiles').files;
        filesToUpload = Array.from(inputFiles);
        console.log('📄 Using regular files:', filesToUpload.length);
      }
      
      // Append files to FormData with additional metadata
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        formData.append('input_files', file);
        
        // Log file info for debugging
        console.log(`📎 Adding file ${i + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
          webkitRelativePath: file.webkitRelativePath || 'N/A'
        });
      }
      
      // Add database file
      const databaseFile = document.getElementById('databaseFile').files[0];
      if (databaseFile) {
        formData.append('database_file', databaseFile);
      }
      
      // Add text input if provided
      const textInput = document.getElementById('textInput').value.trim();
      if (textInput) {
        formData.append('text_input', textInput);
      }
      
      // Add novel names if provided
      const novelNames = document.getElementById('novelNames').value.trim();
      if (novelNames) {
        formData.append('novel_names', novelNames);
      }
      
      // Add parameters
      formData.append('k_neighbors', document.getElementById('kNeighbors').value);
      formData.append('dup_threshold', document.getElementById('dupThreshold').value);
      formData.append('similar_threshold', document.getElementById('similarThreshold').value);
      
      // Send request
      this.updateLoadingStatus('กำลังส่งข้อมูลไปยังเซิร์ฟเวอร์...');
      
  // Resolve absolute backend base URL: prefer instance value, then injected window.apiBaseUrl, then default
  const _apiBase = this.apiBaseUrl || (typeof window !== 'undefined' && window.apiBaseUrl) || 'http://localhost:8000';
  const apiUrl = `${_apiBase}/api/analyze`;
      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            this.updateProgress(percentCompleted, 'กำลังอัปโหลดไฟล์...');
          }
        }
      });
      
      if (response.data.status === 'success') {
        this.currentSessionId = response.data.session_id;
        this.updateLoadingStatus('การวิเคราะห์เสร็จสิ้น กำลังแสดงผลลัพธ์...');
        this.updateProgress(100, 'เสร็จสิ้น');
        
        // Hide loading and show results
        this.showLoading(false);
        this.displayResults(response.data);
      } else {
        throw new Error(response.data.message || 'การวิเคราะห์ล้มเหลว');
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      // Ensure loading spinner is hidden on error
      try { this.showLoading(false); } catch (e) {}
      
      let errorMessage = 'เกิดข้อผิดพลาดในการวิเคราะห์';
      
      // Handle different types of errors

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'การวิเคราะห์ใช้เวลานานเกินไป กรุณาลองใหม่หรือลดขนาดไฟล์';
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        if (status === 400) {
          errorMessage = error.response.data?.detail || 'ข้อมูลที่ส่งมาไม่ถูกต้อง';
        } else if (status === 413) {
          errorMessage = 'ไฟล์มีขนาดใหญ่เกินไป กรุณาลดขนาดไฟล์';
        } else if (status === 500) {
          errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง';
        } else if (status >= 500) {
          errorMessage = 'เซิร์ฟเวอร์ไม่สามารถให้บริการได้ในขณะนี้';
        } else {
          errorMessage = error.response.data?.detail || `เกิดข้อผิดพลาด (${status})`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else {
        errorMessage = error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      }
      
      this.showAlert(errorMessage, 'error');
    }
  }

  validateForm() {
    const inputFiles = document.getElementById('inputFiles').files;
    const textInput = document.getElementById('textInput').value.trim();
    const databaseFile = document.getElementById('databaseFile').files[0];
    
    // Check input requirements
    if (inputFiles.length === 0 && !textInput) {
      this.showAlert('กรุณาเลือกไฟล์สำหรับวิเคราะห์ หรือใส่ข้อความโดยตรง', 'error');
      document.getElementById('inputFilesDropzone').scrollIntoView({ behavior: 'smooth' });
      return false;
    }
    
    // Check file count limit
    if (inputFiles.length > this.maxInputFiles) {
      this.showAlert(`สามารถอัปโหลดได้สูงสุด ${this.maxInputFiles} ไฟล์เท่านั้น`, 'error');
      return false;
    }
    
    // Validate file types
    for (let file of inputFiles) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (!['txt', 'docx', 'pdf'].includes(ext)) {
        this.showAlert(`ไฟล์ ${file.name} ไม่ได้รับการสนับสนุน (รองรับเฉพาะ .txt, .docx, .pdf)`, 'error');
        return false;
      }
    }
    
    // Check database file
    if (!databaseFile) {
      this.showAlert('กรุณาเลือกไฟล์ฐานข้อมูล (.zip)', 'error');
      document.getElementById('databaseDropzone').scrollIntoView({ behavior: 'smooth' });
      return false;
    }
    
    if (!databaseFile.name.toLowerCase().endsWith('.zip')) {
      this.showAlert('ไฟล์ฐานข้อมูลต้องเป็นไฟล์ .zip เท่านั้น', 'error');
      return false;
    }
    
    // Check file sizes
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (let file of inputFiles) {
      if (file.size > maxFileSize) {
        this.showAlert(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 10MB)`, 'error');
        return false;
      }
    }
    
    if (databaseFile.size > 50 * 1024 * 1024) { // 50MB for database
      this.showAlert('ไฟล์ฐานข้อมูลมีขนาดใหญ่เกินไป (สูงสุด 50MB)', 'error');
      return false;
    }
    
    return true;
  }

  showLoading(show) {
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    
    if (show) {
      loadingSection.classList.remove('hidden');
      resultsSection.classList.add('hidden');
      this.updateProgress(10, 'เริ่มต้นการวิเคราะห์...');
    } else {
      loadingSection.classList.add('hidden');
    }
  }

  updateProgress(percent, status) {
    const progressBar = document.getElementById('progressBar');
    const loadingStatus = document.getElementById('loadingStatus');
    
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
    
    if (loadingStatus && status) {
      loadingStatus.textContent = status;
    }
  }

  updateLoadingStatus(status) {
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
      loadingStatus.textContent = status;
    }
  }

  displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    
    if (!resultsSection) return;

    // Store current results for later use
    this.currentResults = data;

    resultsSection.innerHTML = this.generateResultsHTML(data);
    resultsSection.classList.remove('hidden');
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    // Initialize result interactions
    this.initializeResultInteractions();
  }

  generateResultsHTML(data) {
    const results = data.results || {};
    console.log('Results data:', results); // Debug log
    
    // Extract visualization data
    const heatmapData = results.similarity_heatmap || results.heatmap || {};
    const networkData = results.network_top_matches || results.network || {};
    
    return `
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        ${this.generateAnalyzedWorksHeader(data)}
        
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-semibold text-gray-900">
            <i class="fas fa-chart-line mr-2 text-blue-600"></i>
            ผลการวิเคราะห์
          </h2>
          <div class="flex space-x-3">
            <button onclick="analyzer.downloadResults()" class="download-btn">
              <i class="fas fa-download"></i>
              ดาวน์โหลดผลลัพธ์
            </button>
            <button onclick="analyzer.startNewAnalysis()" class="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg">
              <i class="fas fa-plus mr-2"></i>
              วิเคราะห์ใหม่
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="bg-blue-50 rounded-lg p-4">
            <h3 class="font-medium text-blue-900 mb-2">สรุปการวิเคราะห์</h3>
            <p class="text-blue-800">จำนวนไฟล์ที่วิเคราะห์: ${data.processed_files ? data.processed_files.length : 0} ไฟล์</p>
            <p class="text-blue-800">Session ID: ${data.session_id || 'N/A'}</p>
            ${this.generateFileNamesDisplay(data)}
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <h3 class="font-medium text-green-900 mb-2">ค่าพารามิเตอร์</h3>
            <p class="text-green-800">K-Neighbors: ${data.parameters?.k_neighbors || 3}</p>
            <p class="text-green-800">ค่าเกณฑ์ซ้ำซ้อน: ${data.parameters?.dup_threshold || 0.9}</p>
            <p class="text-green-800">ค่าเกณฑ์คล้ายคลึง: ${data.parameters?.similar_threshold || 0.6}</p>
          </div>
        </div>
      </div>

      ${this.generateAnalysisByInputCard(results.overall_ranking)}
      ${this.generateReportCard(results.report)}
      ${this.generateComparisonTableCard(results.comparison_table)}
      ${this.generateSimilarityMatrixCard(results.similarity_matrix)}
      ${this.generateOverallRankingCard(results.overall_ranking)}
      ${this.generateHeatmapCard(heatmapData)}
      ${this.generateNetworkCard(networkData)}
    `;
  }

  generateAnalysisByInputCard(rankingData) {
    if (!rankingData || !rankingData.content) return '';
    
    try {
      // --- FIXED ---
      const data = rankingData.content;
      // --- END FIX ---
      console.log('Parsed analysis data:', data);

      if (!data.analysis_by_input || !Array.isArray(data.analysis_by_input)) {
        return `
          <div class="result-card">
            <h3><i class="fas fa-file-alt"></i> ผลการวิเคราะห์แยกตามไฟล์</h3>
            <p class="text-red-500">ไม่พบข้อมูลการวิเคราะห์</p>
          </div>`;
      }
      
      const inputAnalysisHtml = data.analysis_by_input.map(input => {
        // Show top matches first (top 10)
        const topMatches = input.similarities.slice(0, 10);
        
        const similarityRows = topMatches.map((sim, index) => {
          // Use enhanced metadata for better display
          let displayTitle = '';
          let displaySubtitle = '';
          let displayDetail = '';
          
          if (sim.folder_name && sim.folder_name !== 'N/A') {
            // 3-level structure: Show novel title prominently
            displayTitle = `📚 ${sim.folder_name}`;
            displaySubtitle = `${sim.genre} › Chapter: ${sim.chapter_name}`;
            displayDetail = `File: ${sim.database_file}`;
          } else {
            // 2-level structure: Show filename prominently
            displayTitle = `📄 ${sim.chapter_name}`;
            displaySubtitle = `หมวดหมู่: ${sim.genre}`;
            displayDetail = `File: ${sim.database_file}`;
          }
          
          const rankIcon = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
          const rowClass = index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50';
          
          return `
            <tr class="${rowClass}">
              <td class="px-2 py-3 text-center font-bold">
                ${rankIcon}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                <div class="font-semibold text-base text-blue-900">${displayTitle}</div>
                <div class="text-xs text-gray-600 mt-1">
                  <i class="fas fa-tag mr-1"></i>${displaySubtitle}
                </div>
                <div class="text-xs text-gray-400 mt-1">
                  <i class="fas fa-file mr-1"></i>${displayDetail}
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ${sim.genre}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-semibold text-xl ${sim.similarity >= 70 ? 'text-green-600' : sim.similarity >= 50 ? 'text-yellow-600' : 'text-gray-600'}">
                  ${sim.similarity}%
                </span>
              </td>
            </tr>
          `;
        }).join('');
        
        return `
          <div class="mb-8">
            <div class="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-4 mb-4">
              <h4 class="text-xl font-bold text-blue-900 mb-2">
                <i class="fas fa-file-alt text-blue-600 mr-2"></i>
                ไฟล์วิเคราะห์: ${input.input_title}
              </h4>
              <p class="text-blue-700 text-sm">
                <i class="fas fa-info-circle mr-1"></i>
                แสดง Top 10 เอกสารที่มีความคล้ายคลึงสูงสุด โดยเรียงลำดับจากมากไปน้อย
              </p>
            </div>
            
            <div class="bg-white rounded-lg border overflow-hidden shadow-sm">
              <table class="w-full">
                <thead class="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th class="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">อันดับ</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อเรื่อง / เอกสาร</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ความคล้าย</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  ${similarityRows}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="result-card">
          <h3><i class="fas fa-chart-bar"></i>📊 การวิเคราะห์ตามไฟล์อินพุต (Analysis by Input File)</h3>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p class="text-blue-800 text-sm">
              <i class="fas fa-lightbulb mr-2"></i>
              <strong>คำอธิบาย:</strong> ตารางนี้แสดงผลการเปรียบเทียบความคล้ายคลึงของแต่ละไฟล์อินพุตกับเอกสารในฐานข้อมูล 
              โดยจัดอันดับจากความคล้ายคลึงสูงสุดไปต่ำสุด และแสดงชื่อนิยาย (สำหรับโครงสร้าง 3 ระดับ) หรือชื่อไฟล์ (สำหรับโครงสร้าง 2 ระดับ)
            </p>
          </div>
          <div class="space-y-6">
            ${inputAnalysisHtml}
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error('Error parsing analysis by input data:', error);
      return '';
    }
  }

  generateReportCard(reportData) {
    if (!reportData) return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-file-alt"></i>รายงานสรุป</h3>
        <div class="bg-gray-50 rounded-lg p-4">
          <pre class="whitespace-pre-wrap text-sm text-gray-800 custom-scrollbar" style="max-height: 400px; overflow-y: auto;">${reportData.content || 'ไม่มีข้อมูลรายงาน'}</pre>
        </div>
        ${reportData.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + reportData.url : reportData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลดรายงาน</a>` : ''}
      </div>
    `;
  }

  generateComparisonTableCard(tableData) {
    if (!tableData) return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-table"></i>📋 ตารางเปรียบเทียบ (Comparison Table)</h3>
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <p class="text-purple-800 text-sm">
            <i class="fas fa-info-circle mr-2"></i>
            <strong>คำอธิบาย:</strong> ตารางนี้แสดงผลการเปรียบเทียบโดยละเอียดของแต่ละไฟล์อินพุต รวมถึงเอกสารที่คล้ายคลึงที่สุด (top_db_doc) 
            คะแนนความคล้าย (top_similarity) และการจัดประเภทความสัมพันธ์ (relation: duplicate/similar/different)
          </p>
        </div>
        <div class="overflow-x-auto">
          <div id="comparisonTableContainer" class="bg-gray-50 rounded-lg p-4">
            <p class="text-gray-600">กำลังโหลดข้อมูลตาราง...</p>
          </div>
        </div>
        ${tableData.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + tableData.url : tableData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด CSV</a>` : ''}
      </div>
    `;
  }

  generateSimilarityMatrixCard(matrixData) {
    if (!matrixData) return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-th"></i>📊 เมทริกซ์ความคล้ายคลึง (Similarity Matrix)</h3>
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <p class="text-orange-800 text-sm">
            <i class="fas fa-info-circle mr-2"></i>
            <strong>คำอธิบาย:</strong> เมทริกซ์นี้แสดงคะแนนความคล้ายคลึง (Cosine Similarity) ระหว่างไฟล์อินพุตกับเอกสารทุกตัวในฐานข้อมูล 
            ค่าใกล้ 1 = คล้ายคลึงมาก, ค่าใกล้ 0 = แตกต่างมาก
          </p>
        </div>
        <div class="overflow-x-auto">
          <div id="similarityMatrixContainer" class="bg-gray-50 rounded-lg p-4">
            <p class="text-gray-600">กำลังโหลดข้อมูลเมทริกซ์...</p>
          </div>
        </div>
        ${matrixData.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + matrixData.url : matrixData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด CSV</a>` : ''}
      </div>
    `;
  }

  generateOverallRankingCard(rankingData) {
    if (!rankingData) return '';
    
    try {
      // --- FIXED ---
      const data = rankingData.content ? rankingData.content : null;
      // --- END FIX ---
      if (!data) return '';
      
      // Generate top 3 summary cards
      const genreRank = data.genre_rank_overall || [];
      const dbRank = data.db_overall_rank || [];
      
      let summaryCards = '';
      if (genreRank.length > 0) {
        summaryCards = genreRank.slice(0, 3).map((genre, index) => {
          const medals = ['🥇', '🥈', '🥉'];
          const colors = ['bg-yellow-50 border-yellow-300 text-yellow-800', 
                         'bg-gray-50 border-gray-300 text-gray-800', 
                         'bg-orange-50 border-orange-300 text-orange-800'];
          
          return `
            <div class="border-2 ${colors[index]} rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-2xl mr-2">${medals[index]}</span>
                  <span class="font-bold text-lg">${genre.genre}</span>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold">${Math.round(genre.max * 100)}%</div>
                  <div class="text-sm opacity-75">ความคล้ายสูงสุด</div>
                </div>
              </div>
              <div class="mt-2 text-sm">
                ค่าเฉลี่ย: ${Math.round(genre.mean * 100)}%
              </div>
            </div>
          `;
        }).join('');
      }
      
      // Generate detailed table with improved novel title display
      let detailTable = '';
      if (dbRank.length > 0) {
          const tableRows = dbRank.slice(0, 10).map((doc, index) => {
          // Prefer novel_title (backend augmented), then folder_name, then chapter_name
          let primaryDisplay = '';
          let secondaryDisplay = '';

          const novelTitle = doc.novel_title || doc.title || doc.folder_name || 'N/A';
          const chapterName = doc.chapter_name || doc.file_name || doc.db_doc || '';

          if (novelTitle && novelTitle !== 'N/A') {
            primaryDisplay = `📚 ${novelTitle}`;
            secondaryDisplay = `${doc.genre || ''} › ${chapterName}`;
          } else {
            primaryDisplay = `📄 ${chapterName}`;
            secondaryDisplay = `หมวดหมู่: ${doc.genre || ''}`;
          }
          return `
          <tr class="${index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}">
            <td class="px-4 py-3 text-center">
              ${index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
            </td>
            <td class="px-4 py-3">
              <div class="font-semibold text-lg text-blue-900">${primaryDisplay}</div>
              <div class="text-sm text-gray-600 mt-1">
                <i class="fas fa-tag mr-1"></i>${secondaryDisplay}
              </div>
              <div class="text-xs text-gray-400 mt-1">
                <i class="fas fa-file mr-1"></i>File: ${doc.db_doc}
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-3 py-1 text-sm rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 font-medium">
                <i class="fas fa-folder mr-1"></i>${doc.genre}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="text-2xl font-bold ${doc.best_similarity >= 0.7 ? 'text-green-600' : doc.best_similarity >= 0.5 ? 'text-yellow-600' : 'text-gray-600'}">
                ${Math.round(doc.best_similarity * 100)}%
              </div>
              <div class="text-xs text-gray-500">
                ${(doc.best_similarity * 100).toFixed(2)}% exact
              </div>
            </td>
          </tr>
        `}).join('');
        
        detailTable = `
          <div class="mt-6">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-green-800 mb-2">
                <i class="fas fa-trophy mr-2"></i>🏆 Top 10 เอกสารที่คล้ายคลึงที่สุด
              </h4>
              <p class="text-green-700 text-sm">
                <i class="fas fa-info-circle mr-1"></i>
                ตารางแสดงเอกสารในฐานข้อมูลที่มีความคล้ายคลึงสูงสุดกับไฟล์อินพุตทั้งหมด โดยเรียงลำดับจากคะแนนความคล้ายคลึงสูงสุด
                <br>• <strong>📚 ชื่อนิยาย:</strong> สำหรับโครงสร้าง 3 ระดับ (Genre/Novel Title/File)
                <br>• <strong>📄 ชื่อไฟล์:</strong> สำหรับโครงสร้าง 2 ระดับ (Genre/File)
              </p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full border border-gray-200 rounded-lg shadow-sm">
                <thead class="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">อันดับ</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อเรื่อง / เอกสาร</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ความคล้าย</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      return `
        <div class="result-card">
          <h3><i class="fas fa-trophy"></i>🏆 การจัดอันดับโดยรวม (Overall Ranking)</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            ${summaryCards}
          </div>
          
          ${data.analysis_info ? `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 class="font-semibold text-blue-800 mb-2">📊 ข้อมูลการวิเคราะห์</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div><span class="font-medium">ภาษาที่ตรวจพบ:</span> ${data.analysis_info.detected_language || 'อื่นๆ'}</div>
                <div><span class="font-medium">รองรับภาษาไทย:</span> ${data.analysis_info.thai_support_available ? 'ใช่' : 'ไม่'}</div>
                <div><span class="font-medium">เอกสารในฐานข้อมูล:</span> ${data.analysis_info.total_db_documents || 0} เอกสาร</div>
                <div><span class="font-medium">ไฟล์ที่วิเคราะห์:</span> ${data.analysis_info.total_input_files || 0} ไฟล์</div>
              </div>
            </div>
          ` : ''}
          
          ${detailTable}
          
          ${rankingData.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + rankingData.url : rankingData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด JSON แบบเต็ม</a>` : ''}
        </div>
      `;
      
    } catch (error) {
      console.error('Error parsing ranking data:', error);
      return `
        <div class="result-card">
          <h3><i class="fas fa-trophy"></i>การจัดอันดับโดยรวม</h3>
          <p class="text-red-600">เกิดข้อผิดพลาดในการแสดงผลข้อมูลการจัดอันดับ</p>
        </div>
      `;
    }
  }

  generateHeatmapCard(heatmapData) {
    if (!heatmapData || !heatmapData.data) {
      console.log('No heatmap data available');
      return '';
    }

    // Generate unique ID for the plot container
    var plotId = 'heatmap-plot-' + Date.now();

    // Store data and plotId for rendering
    this.pendingHeatmap = {
      data: heatmapData.data,
      plotId: plotId
    };

    // If a URL is provided, render a container for the plot and a download link
    if (heatmapData.url) {
      return (
        '<div class="result-card">' +
          '<h3><i class="fas fa-fire"></i>🔥 แผนที่ความร้อนความคล้ายคลึง (Similarity Heatmap)</h3>' +
          '<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">' +
            '<p class="text-red-800 text-sm">' +
              '<i class="fas fa-info-circle mr-2"></i>' +
              '<strong>คำอธิบาย:</strong> แผนที่ความร้อนแสดงค่าความคล้ายคลึง (Cosine Similarity) ระหว่างไฟล์อินพุตกับเอกสารในฐานข้อมูล' +
              '<br>• <strong>สีแดงเข้ม:</strong> ค่าความคล้ายสูง (ใกล้ 1.0) - เนื้อหาคล้ายคลึงมาก' +
              '<br>• <strong>สีเหลือง:</strong> ค่าความคล้ายปานกลาง (0.5-0.7) - มีความคล้ายบางส่วน' +
              '<br>• <strong>สีน้ำเงิน:</strong> ค่าความคล้ายต่ำ (ใกล้ 0.0) - เนื้อหาแตกต่างกัน' +
              '<br>• <i class="fas fa-mouse-pointer"></i> เลื่อนเมาส์เหนือเซลล์เพื่อดูรายละเอียด' +
            '</p>' +
          '</div>' +
          '<div class="w-full bg-white rounded-lg border p-4">' +
            '<div id="' + plotId + '" class="w-full h-[600px]"></div>' +
          '</div>' +
          (heatmapData.url ? ('<div class="mt-4 text-right">' +
            '<a href="' + (this.apiBaseUrl ? this.apiBaseUrl + heatmapData.url : heatmapData.url) + '" ' +
               'download class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">' +
              '<i class="fas fa-download mr-2"></i>ดาวน์โหลดรูปภาพ' +
            '</a>' +
          '</div>') : '') +
        '</div>'
      );
    }

    // Fallback to base64 image data
    if (heatmapData.base64) {
      console.log('Using heatmap base64 data');
      return this.generateVisualizationCard('heatmap', heatmapData.base64, heatmapData);
    }

    console.log('No image source found for heatmap');
    return '';
  }

  initializeCharts() {
    this.chartsInitialized = true;
    console.log('Charts initialized');
  }

  generateAnalysisVisualizationCards(results) {
    // สร้าง visualization cards สำหรับการวิเคราะห์
    const cards = [];

    if (results.comparison_table) {
      try {
        const data = results.comparison_table.content ? JSON.parse(results.comparison_table.content) : null;
        if (data) {
          cards.push(`
            <div class="result-card">
              <h3><i class="fas fa-chart-bar"></i>📊 การวิเคราะห์เชิงภาพ</h3>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                  <h4 class="font-medium text-blue-900 mb-2">กราฟแสดงความคล้ายคลึง</h4>
                  <canvas id="similarityChart" class="w-full h-64"></canvas>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                  <h4 class="font-medium text-green-900 mb-2">การกระจายตัวของประเภท</h4>
                  <canvas id="genreChart" class="w-full h-64"></canvas>
                </div>
              </div>
            </div>
          `);

          // กำหนดให้สร้างกราฟหลังจาก DOM ถูกสร้าง
          setTimeout(() => this.createCharts(data), 100);
        }
      } catch (error) {
        console.error('Error parsing comparison table data:', error);
      }
    }

    return cards.join('');
  }

  createCharts(data) {
    if (!window.Chart) {
      console.error('Chart.js not loaded');
      return;
    }

    // สร้างกราฟความคล้ายคลึง
    const similarityCtx = document.getElementById('similarityChart');
    if (similarityCtx) {
      // จัดเรียงข้อมูลตามค่าความคล้ายคลึง
      const sortedData = [...data].sort((a, b) => b.top_similarity - a.top_similarity);
      const top5Data = sortedData.slice(0, 5);

      new Chart(similarityCtx, {
        type: 'bar',
        data: {
          labels: top5Data.map(item => item.input_doc.split('.')[0]),
          datasets: [{
            label: 'ความคล้ายคลึง (%)',
            data: top5Data.map(item => item.top_similarity),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    }

    // สร้างกราฟการกระจายตัวของประเภท
    const genreCtx = document.getElementById('genreChart');
    if (genreCtx) {
      // นับจำนวนแต่ละประเภท
      const genreCounts = data.reduce((acc, item) => {
        const genre = item.top_genre || 'ไม่ระบุ';
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
      }, {});

      new Chart(genreCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(genreCounts),
          datasets: [{
            data: Object.values(genreCounts),
            backgroundColor: [
              'rgba(59, 130, 246, 0.5)',
              'rgba(16, 185, 129, 0.5)',
              'rgba(245, 158, 11, 0.5)',
              'rgba(239, 68, 68, 0.5)',
              'rgba(139, 92, 246, 0.5)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
    }
  }

  generateVisualizationCard(type, imgSrc, data) {
    const titles = {
      heatmap: '🔥 แผนที่ความร้อนความคล้ายคลึง (Similarity Heatmap)',
      network: '🕸️ กราฟเครือข่ายความสัมพันธ์ (Network Graph)'
    };

    const descriptions = {
      heatmap: `
        <strong>คำอธิบาย:</strong> แผนที่ความร้อนแสดงค่าความคล้ายคลึง (Cosine Similarity) ระหว่างไฟล์อินพุตกับเอกสารในฐานข้อมูลทุกตัว 
        <br>• <strong>สีแดงเข้ม:</strong> ค่าความคล้ายสูง (ใกล้ 1.0) - เนื้อหาคล้ายคลึงมาก
        <br>• <strong>สีเหลือง:</strong> ค่าความคล้ายปานกลาง (0.5-0.7) - มีความคล้ายบางส่วน  
        <br>• <strong>สีน้ำเงิน:</strong> ค่าความคล้ายต่ำ (ใกล้ 0.0) - เนื้อหาแตกต่างกัน
      `,
      network: `
        <strong>คำอธิบาย:</strong> กราฟแสดงความสัมพันธ์ระหว่างไฟล์อินพุต (ซ้าย) กับไฟล์ในฐานข้อมูลที่คล้ายที่สุด (ขวา)
        <br>• <strong>สี่เหลี่ยม:</strong> ไฟล์ที่นำมาวิเคราะห์
        <br>• <strong>วงกลม:</strong> ไฟล์ในฐานข้อมูลที่คล้ายคลึง
        <br>• <strong>เส้นเชื่อม:</strong> ความหนาแสดงระดับความคล้ายคลึง
      `
    };

    const bgColors = {
      heatmap: 'bg-red-50 border-red-200 text-red-800',
      network: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    return `
      <div class="result-card">
        <h3><i class="fas fa-${type === 'heatmap' ? 'fire' : 'project-diagram'}"></i>${titles[type]}</h3>
        <div class="${bgColors[type]} border rounded-lg p-4 mb-4">
          <p class="text-sm">
            <i class="fas fa-info-circle mr-2"></i>
            ${descriptions[type]}
          </p>
        </div>
        <div class="text-center">
          <img src="${imgSrc}" alt="${titles[type]}" 
               class="max-w-full h-auto mx-auto border-2 border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow" 
               onclick="analyzer.openImageModal(this)" 
               style="cursor: pointer;" />
        </div>
        ${data.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + data.url : data.url}" 
                      download="${type === 'heatmap' ? 'similarity_heatmap.png' : 'network_top_matches.png'}" 
                      class="download-btn mt-4">
                      <i class="fas fa-download"></i>ดาวน์โหลดรูปภาพ
                   </a>` : ''}
      </div>
    `;
  }

  generateNetworkCard(networkData) {
    if (!networkData || !networkData.data) {
      console.log('No network data available');
      return '';
    }
    
    // Generate unique ID for the plot container
    const plotId = 'network-plot-' + Date.now();
    
    // Store data and plotId for rendering
    this.pendingNetwork = {
      data: networkData.data,
      plotId: plotId
    };
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-project-diagram"></i>🕸️ กราฟเครือข่ายความสัมพันธ์ (Network Graph)</h3>
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <p class="text-indigo-800 text-sm">
            <i class="fas fa-info-circle mr-2"></i>
            <strong>คำอธิบาย:</strong> กราฟแสดงความสัมพันธ์ระหว่างไฟล์อินพุตและเอกสารในฐานข้อมูล
            <br>• <strong>🟦 ฝั่งซ้าย:</strong> ไฟล์อินพุตที่นำมาวิเคราะห์
            <br>• <strong>🟠 ฝั่งขวา:</strong> เอกสารในฐานข้อมูลที่มีความคล้ายคลึงสูง
            <br>• <strong>เส้นเชื่อม:</strong> ความหนาของเส้นแสดงระดับความคล้าย
            <br>• <i class="fas fa-mouse-pointer"></i> เลื่อนเมาส์เหนือโหนดหรือเส้นเชื่อมเพื่อดูรายละเอียด
          </p>
        </div>
        <div class="w-full bg-white rounded-lg border p-4">
          <div id="${plotId}" class="w-full h-[600px]"></div>
        </div>
        ${networkData.url ? `
          <div class="mt-4 text-right">
            <a href="${this.apiBaseUrl ? this.apiBaseUrl + networkData.url : networkData.url}" 
               download class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <i class="fas fa-download mr-2"></i>ดาวน์โหลดรูปภาพ
            </a>
          </div>
        ` : ''}
      </div>
    `;
    
    // Store network data for tooltip use
    this.networkData = networkData.data;
    
    // Prepare nodes and edges information
    const nodes = networkData.data?.nodes || [];
    const edges = networkData.data?.edges || [];
    console.log('Network data:', networkData);
    
    // Use URL if available
    const imgUrl = networkData.url;
    if (imgUrl) {
      const fullUrl = this.apiBaseUrl ? `${this.apiBaseUrl}${imgUrl}` : imgUrl;
      console.log('Using network URL:', fullUrl);
      return this.generateVisualizationCard('network', fullUrl, networkData);
    }
    
    // Fallback to base64
    if (networkData.base64) {
      console.log('Using network base64 data');
      return this.generateVisualizationCard('network', networkData.base64, networkData);
    }
    
    console.log('No image source found for network graph');
    return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-project-diagram"></i>🔗 แผนภูมิเครือข่าย (Network Graph)</h3>
        <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <p class="text-indigo-800 text-sm">
            <i class="fas fa-info-circle mr-2"></i>
            <strong>คำอธิบาย:</strong> แผนภูมิเครือข่ายแสดงความสัมพันธ์ระหว่างไฟล์อินพุต (ฝั่งซ้าย) กับเอกสารที่คล้ายคลึงที่สุด Top-K ตัว (ฝั่งขวา)
            <br>• <strong>🟦 สี่เหลี่ยม:</strong> ไฟล์อินพุตที่นำมาวิเคราะห์
            <br>• <strong>🔵 วงกลม:</strong> เอกสารในฐานข้อมูลที่มีความคล้ายคลึงสูง
            <br>• <strong>เส้นเชื่อม:</strong> ความหนาของเส้นแสดงระดับความคล้าย (หนา = คล้ายมาก)
            <br>• คลิกที่รูปภาพเพื่อดูขนาดเต็ม
          </p>
        </div>
        <div class="text-center relative group">
          <div class="network-container relative overflow-auto max-h-[600px] rounded-lg border-2 border-gray-300">
            <img 
              src="${imgSrc}" 
              alt="Network Diagram" 
              class="result-image mx-auto hover:shadow-lg transition-shadow cursor-pointer"
              onclick="analyzer.openImageModal(this)"
              onmousemove="analyzer.showNetworkTooltip(event)"
              onmouseleave="analyzer.hideTooltip()"
              data-tooltip="true"
            />
            <div class="absolute top-2 right-2 z-10 space-x-2">
              <button class="bg-white p-2 rounded-full shadow hover:shadow-lg transition-shadow text-gray-600 hover:text-gray-800" onclick="analyzer.zoomInNetwork()">
                <i class="fas fa-search-plus"></i>
              </button>
              <button class="bg-white p-2 rounded-full shadow hover:shadow-lg transition-shadow text-gray-600 hover:text-gray-800" onclick="analyzer.zoomOutNetwork()">
                <i class="fas fa-search-minus"></i>
              </button>
              <button class="bg-white p-2 rounded-full shadow hover:shadow-lg transition-shadow text-gray-600 hover:text-gray-800" onclick="analyzer.resetNetworkZoom()">
                <i class="fas fa-undo"></i>
              </button>
            </div>
          </div>
        </div>
        ${networkData.url ? `
          <div class="flex justify-between items-center mt-4">
            <a href="${this.apiBaseUrl ? this.apiBaseUrl + networkData.url : networkData.url}" download class="download-btn">
              <i class="fas fa-download"></i>ดาวน์โหลดรูปภาพ
            </a>
            <span class="text-sm text-gray-500">
              <i class="fas fa-info-circle mr-1"></i>เลื่อนเมาส์ไปที่โหนดเพื่อดูรายละเอียด
            </span>
          </div>
        ` : ''}
      </div>
    `;
  }

  initializeResultInteractions() {
    // Load CSV data for comparison table
    this.loadComparisonTable();
    // Load CSV data for similarity matrix
    this.loadSimilarityMatrix();

    // Render any pending visualizations
    if (this.pendingHeatmap) {
      this.renderHeatmap(this.pendingHeatmap.plotId, this.pendingHeatmap.data);
    }
    if (this.pendingNetwork) {
      this.renderNetwork(this.pendingNetwork.plotId, this.pendingNetwork.data);
    }
  }

  renderHeatmap(plotId, data) {
    if (!window.Plotly || !data) {
      console.log('Deferring heatmap render - Plotly not ready or no data');
      this.pendingHeatmap = { plotId: plotId, data: data };
      return;
    }

    var x_labels = data.x_labels || [];
    var y_labels = data.y_labels || [];
    var values = data.values || [];
    if (x_labels.length === 0 || y_labels.length === 0 || values.length === 0) return;

    const heatmapTrace = {
      x: x_labels,
      y: y_labels,
      z: values,
      type: 'heatmap',
      colorscale: [
        [0, 'rgb(0,0,255)'],      // Blue for low values
        [0.5, 'rgb(255,255,0)'],  // Yellow for medium values
        [1, 'rgb(255,0,0)']       // Red for high values
      ],
      hoverongaps: false,
      hovertemplate: 
        '<b>Input:</b> %{y}<br>' +
        '<b>Database:</b> %{x}<br>' +
        '<b>ความคล้าย:</b> %{z:.1%}<br>' +
        '<extra></extra>'
    };

    const layout = {
      title: 'แผนที่ความร้อนแสดงความคล้ายคลึง',
      xaxis: {
        title: 'เอกสารในฐานข้อมูล',
        tickangle: -45,
        automargin: true
      },
      yaxis: {
        title: 'ไฟล์อินพุต',
        automargin: true
      },
      margin: {
        l: 150,
        r: 50,
        b: 150,
        t: 50,
        pad: 4
      }
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtons: [[
        'zoom2d',
        'pan2d',
        'resetScale2d',
        'toImage'
      ]],
      displaylogo: false,
      locale: 'th'
    };

    try {
      var plotElement = document.getElementById(plotId);
      if (!plotElement) {
        console.error('Heatmap container not found:', plotId);
        return;
      }
      console.log('Rendering heatmap in element:', plotId);
      Plotly.newPlot(plotId, [heatmapTrace], layout, config).then(function() {
        console.log('Heatmap rendered successfully');
      }).catch(function(err) {
        console.error('Failed to render heatmap:', err);
      });
    } catch (error) {
      console.error('Error rendering heatmap:', error);
    }
  }

  renderNetwork(plotId, data) {
    if (!window.Plotly || !data) {
      console.log('Deferring network render - Plotly not ready or no data');
      this.pendingNetwork = { plotId: plotId, data: data };
      return;
    }

    var nodes = data.nodes || [];
    var edges = data.edges || [];
    if (nodes.length === 0 || edges.length === 0) return;

    // Separate input and database nodes
    const inputNodes = nodes.filter(node => node.is_input);
    const dbNodes = nodes.filter(node => !node.is_input);

    // Create x-coordinates (inputs on left, db on right)
    const xCoords = {};
    inputNodes.forEach((node, i) => {
      xCoords[node.id] = -5;  // Left side
    });
    dbNodes.forEach((node, i) => {
      xCoords[node.id] = 5;   // Right side
    });

    // Create y-coordinates evenly spaced
    const yCoords = {};
    inputNodes.forEach((node, i) => {
      yCoords[node.id] = (i - (inputNodes.length - 1) / 2) * 2;
    });
    dbNodes.forEach((node, i) => {
      yCoords[node.id] = (i - (dbNodes.length - 1) / 2) * 2;
    });

    // Create node trace with improved styling
    var nodeTrace = {
      x: nodes.map(node => xCoords[node.id]),
      y: nodes.map(node => yCoords[node.id]),
      mode: 'markers+text',
      type: 'scatter',
      name: 'Nodes',
      text: nodes.map(node => node.label),
      textposition: nodes.map(node => 
        node.is_input ? 'middle left' : 'middle right'
      ),
      marker: {
        size: 20,
        color: nodes.map(node => 
          node.is_input ? 'rgb(66, 135, 245)' : 'rgb(245, 171, 66)'
        ),
        symbol: nodes.map(node => 
          node.is_input ? 'square' : 'circle'
        )
      },
      hovertemplate:
        '<b>%{text}</b><br>' +
        '<extra></extra>'
    };

    // Create edge traces
    const edgeTraces = edges.map(edge => ({
      type: 'scatter',
      x: [xCoords[edge.source], xCoords[edge.target]],
      y: [yCoords[edge.source], yCoords[edge.target]],
      mode: 'lines',
      line: {
        color: 'rgb(180,180,180)',
        width: edge.weight * 5  // Line width based on similarity
      },
      hovertemplate:
        `<b>ความคล้าย:</b> ${(edge.weight * 100).toFixed(1)}%<br>` +
        '<extra></extra>'
    }));

    const layout = {
      showlegend: false,
      hovermode: 'closest',
      title: 'กราฟเครือข่ายความสัมพันธ์',
      xaxis: {
        visible: false,
        range: [-6, 6]
      },
      yaxis: {
        visible: false,
        range: [-6, 6]
      },
      margin: {
        l: 20,
        r: 20,
        b: 20,
        t: 40
      }
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtons: [[
        'zoom2d',
        'pan2d',
        'resetScale2d',
        'toImage'
      ]],
      displaylogo: false,
      locale: 'th'
    };

    try {
      var plotElement = document.getElementById(plotId);
      if (!plotElement) {
        console.error('Network graph container not found:', plotId);
        return;
      }
      console.log('Rendering network graph in element:', plotId);
      Plotly.newPlot(plotId, [nodeTrace, ...edgeTraces], layout, config).then(function() {
        console.log('Network graph rendered successfully');
      }).catch(function(err) {
        console.error('Failed to render network graph:', err);
      });
    } catch (error) {
      console.error('Error rendering network graph:', error);
    }
  }

  // Tooltip handling
  showTooltip(event) {
    if (!event.target.dataset.tooltip) return;
    
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Get filename based on coordinates
    const fullName = this.getFileNameFromCoordinates(x, y, rect);
    if (!fullName) return;
    
    this.tooltip.innerHTML = fullName;
    this.tooltip.style.left = `${event.pageX + 10}px`;
    this.tooltip.style.top = `${event.pageY + 10}px`;
    this.tooltip.classList.remove('hidden');
  }

  hideTooltip() {
    this.tooltip.classList.add('hidden');
  }

  getFileNameFromCoordinates(x, y, rect) {
    if (!this.heatmapData) return null;
    
    const { x_labels, y_labels, values } = this.heatmapData;
    if (!x_labels || !y_labels || !values) return null;
    
    // Calculate relative position (0-1)
    const relX = x / rect.width;
    const relY = y / rect.height;
    
    // Get label index based on position
    const xIndex = Math.floor(relX * x_labels.length);
    const yIndex = Math.floor(relY * y_labels.length);
    
    // Get labels
    const xLabel = x_labels[xIndex];
    const yLabel = y_labels[yIndex];
    
    // Get similarity value
    const similarity = values[yIndex]?.[xIndex];
    
    if (!xLabel || !yLabel) return null;
    
    return `
      <div class="font-medium">${yLabel}</div>
      <div class="text-xs text-gray-300">กับ</div>
      <div class="font-medium">${xLabel}</div>
      ${similarity !== undefined ? 
        `<div class="text-xs mt-1">
          <span class="font-medium ${similarity >= 0.7 ? 'text-green-400' : similarity >= 0.5 ? 'text-yellow-400' : 'text-blue-400'}">
            ความคล้าย: ${(similarity * 100).toFixed(1)}%
          </span>
        </div>` : ''
      }
    `;
  }

  // Zoom handling
  zoomIn() {
    this.currentZoom = Math.min(this.currentZoom * 1.2, 3);
    this.applyZoom();
  }

  zoomOut() {
    this.currentZoom = Math.max(this.currentZoom / 1.2, 0.5);
    this.applyZoom();
  }

  resetZoom() {
    this.currentZoom = 1;
    this.applyZoom();
  }

  applyZoom() {
    const container = document.querySelector('.heatmap-container');
    if (!container) return;
    
    const img = container.querySelector('img');
    if (!img) return;
    
    img.style.transform = `scale(${this.currentZoom})`;
    img.style.transformOrigin = 'center';
    container.style.height = Math.min(600, img.naturalHeight * this.currentZoom) + 'px';
  }

  // Network-specific tooltip
  showNetworkTooltip(event) {
    if (!event.target.dataset.tooltip) return;
    
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Get node info based on coordinates
    const nodeInfo = this.getNodeInfoFromCoordinates(x, y, rect);
    if (!nodeInfo) return;
    
    this.tooltip.innerHTML = `
      <div class="font-medium">${nodeInfo.title}</div>
      ${nodeInfo.details ? `
        <div class="text-xs mt-1 text-gray-300">
          ${nodeInfo.details}
        </div>
      ` : ''}
    `;
    
    this.tooltip.style.left = `${event.pageX + 10}px`;
    this.tooltip.style.top = `${event.pageY + 10}px`;
    this.tooltip.classList.remove('hidden');
  }

  getNodeInfoFromCoordinates(x, y, rect) {
    if (!this.networkData || !this.networkData.nodes) return null;
    
    // Calculate relative position (0-1)
    const relX = x / rect.width;
    const relY = y / rect.height;
    
    // Determine which side the click is on (left = input, right = database)
    const isLeftSide = relX < 0.5;
    
    // Filter nodes based on side
    const relevantNodes = this.networkData.nodes.filter(node => 
      isLeftSide ? node.is_input : !node.is_input
    );
    
    // Find the nearest node based on Y position
    const nodeIndex = Math.floor(relY * relevantNodes.length);
    const node = relevantNodes[nodeIndex];
    
    if (!node) return null;
    
    // Get edges for this node
    const edges = this.networkData.edges.filter(edge => 
      isLeftSide ? edge.source === node.id : edge.target === node.id
    );
    
    // Format edge information
    const edgeInfo = edges.map(edge => {
      const connectedNodeId = isLeftSide ? edge.target : edge.source;
      const connectedNode = this.networkData.nodes.find(n => n.id === connectedNodeId);
      return `${connectedNode?.label || connectedNodeId}: ${(edge.weight * 100).toFixed(1)}% คล้าย`;
    }).join('<br>');
    
    return {
      title: node.label,
      details: edges.length > 0 ? `การเชื่อมโยง:<br>${edgeInfo}` : 'ไม่มีการเชื่อมโยง'
    };
  }

  // Network zoom handling
  zoomInNetwork() {
    this.networkZoom = (this.networkZoom || 1) * 1.2;
    this.applyNetworkZoom();
  }

  zoomOutNetwork() {
    this.networkZoom = (this.networkZoom || 1) / 1.2;
    this.applyNetworkZoom();
  }

  resetNetworkZoom() {
    this.networkZoom = 1;
    this.applyNetworkZoom();
  }

  applyNetworkZoom() {
    const container = document.querySelector('.network-container');
    if (!container) return;
    
    const img = container.querySelector('img');
    if (!img) return;
    
    img.style.transform = `scale(${this.networkZoom})`;
    img.style.transformOrigin = 'center';
    container.style.height = Math.min(600, img.naturalHeight * this.networkZoom) + 'px';
  }

  async loadComparisonTable() {
    const container = document.getElementById('comparisonTableContainer');
    if (!container) return;

    try {
      // Find comparison table data from results
      const tableElement = document.querySelector('[data-csv-url]');
      if (!tableElement) {
        // Try to get from stored results data
        const csvUrl = this.getCSVUrl('comparison_table');
        if (csvUrl) {
          const response = await axios.get(csvUrl);
          const csvData = response.data;
          const tableHTML = this.parseCSVToTable(csvData);
          container.innerHTML = tableHTML;
        } else {
          container.innerHTML = '<p class="text-gray-600">ไม่พบข้อมูลตารางเปรียบเทียบ</p>';
        }
      }
    } catch (error) {
      console.error('Error loading comparison table:', error);
      container.innerHTML = '<p class="text-red-600">เกิดข้อผิดพลาดในการโหลดตารางเปรียบเทียบ</p>';
    }
  }

  async loadSimilarityMatrix() {
    const container = document.getElementById('similarityMatrixContainer');
    if (!container) return;

    try {
      const csvUrl = this.getCSVUrl('similarity_matrix');
      if (csvUrl) {
        const response = await axios.get(csvUrl);
        const csvData = response.data;
        const tableHTML = this.parseCSVToTable(csvData);
        container.innerHTML = tableHTML;
      } else {
        container.innerHTML = '<p class="text-gray-600">ไม่พบข้อมูลเมทริกซ์ความคล้ายคลึง</p>';
      }
    } catch (error) {
      console.error('Error loading similarity matrix:', error);
      container.innerHTML = '<p class="text-red-600">เกิดข้อผิดพลาดในการโหลดเมทริกซ์ความคล้ายคลึง</p>';
    }
  }

  getCSVUrl(fileKey) {
    // Get CSV URL from stored results data
    if (this.currentResults && this.currentResults.results && this.currentResults.results[fileKey]) {
      return this.apiBaseUrl ? `${this.apiBaseUrl}${this.currentResults.results[fileKey].url}` : this.currentResults.results[fileKey].url;
    }
    return null;
  }

  parseCSVToTable(csvData) {
    const lines = csvData.trim().split('\n');
    if (lines.length === 0) return '<p class="text-gray-600">ไม่มีข้อมูล</p>';

    let html = '<div class="overflow-x-auto"><table class="min-w-full bg-white border border-gray-200 rounded-lg">';
    
    lines.forEach((line, index) => {
      // Handle CSV parsing with proper quote handling
      const cells = this.parseCSVLine(line);
      const tagName = index === 0 ? 'th' : 'td';
      const rowClass = index === 0 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 font-semibold text-blue-900' : 'hover:bg-gray-50';
      
      html += `<tr class="${rowClass}">`;
      cells.forEach((cell, cellIndex) => {
        const cellClass = index === 0 ? 
          'px-4 py-3 border border-gray-200 text-sm font-medium text-center' : 
          'px-4 py-2 border border-gray-200 text-sm';
        
        // Special formatting for similarity values
        const displayValue = this.formatCellValue(cell, cellIndex, index);
        html += `<${tagName} class="${cellClass}">${displayValue}</${tagName}>`;
      });
      html += '</tr>';
    });
    
    html += '</table></div>';
    return html;
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
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

  formatCellValue(value, columnIndex, rowIndex) {
    // Remove BOM if present
    const cleanValue = value.replace(/^\ufeff/, '');
    
    // Format similarity scores (numeric values between 0 and 1)
    if (rowIndex > 0 && /^\d*\.\d+$/.test(cleanValue)) {
      const numValue = parseFloat(cleanValue);
      if (numValue >= 0 && numValue <= 1) {
        const percentage = (numValue * 100).toFixed(1);
        let colorClass = 'text-gray-600';
        
        if (numValue >= 0.8) colorClass = 'text-red-600 font-bold';
        else if (numValue >= 0.6) colorClass = 'text-orange-600 font-medium';
        else if (numValue >= 0.3) colorClass = 'text-yellow-600';
        else if (numValue > 0) colorClass = 'text-green-600';
        
        return `<span class="${colorClass}">${percentage}%</span>`;
      }
    }
    
    // Format relation status
    if (cleanValue === 'duplicate') return '<span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">ซ้ำกัน</span>';
    if (cleanValue === 'similar') return '<span class="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">คล้ายคลึง</span>';
    if (cleanValue === 'different') return '<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">แตกต่าง</span>';
    
    return cleanValue;
  }

  generateFileNamesDisplay(data) {
    if (!data.file_name_mapping || Object.keys(data.file_name_mapping).length === 0) {
      return '';
    }

    const mappings = Object.entries(data.file_name_mapping)
      .map(([originalName, customName]) => `<span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1">${customName}</span>`)
      .join('');

    return `
      <div class="mt-2">
        <p class="text-blue-900 text-sm font-medium">ชื่อไฟล์ที่กำหนด:</p>
        <div class="mt-1">${mappings}</div>
      </div>
    `;
  }

  generateAnalyzedWorksHeader(data) {
    if (!data.file_name_mapping || Object.keys(data.file_name_mapping).length === 0) {
      return '';
    }

    const works = Object.entries(data.file_name_mapping)
      .map(([originalName, customName]) => `
        <div class="flex items-center bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 mb-3">
          <div class="flex-shrink-0">
            <i class="fas fa-book text-2xl text-purple-600 mr-3"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-purple-900">${customName}</h3>
            <p class="text-sm text-purple-700">ไฟล์ต้นฉบบ: ${originalName}</p>
          </div>
          <div class="flex-shrink-0">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
              <i class="fas fa-check-circle mr-1"></i>
              วิเคราะห์เสร็จสิ้น
            </span>
          </div>
        </div>
      `).join('');

    return `
      <div class="mb-6">
        <div class="flex items-center mb-4">
          <i class="fas fa-bookmark text-xl text-purple-600 mr-2"></i>
          <h2 class="text-xl font-bold text-gray-800">งานที่นำมาวิเคราะห์</h2>
        </div>
        ${works}
      </div>
    `;
  }

  async downloadResults() {
    if (!this.currentSessionId) {
      this.showAlert('ไม่มีผลลัพธ์สำหรับดาวน์โหลด', 'error');
      return;
    }
    
    try {
      const downloadUrl = this.apiBaseUrl ? `${this.apiBaseUrl}/api/download/${this.currentSessionId}` : `/api/download/${this.currentSessionId}`;
      const response = await axios.get(downloadUrl, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `similarity_analysis_results_${this.currentSessionId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      this.showAlert('ดาวน์โหลดผลลัพธ์สำเร็จ', 'success');
      
    } catch (error) {
      console.error('Download failed:', error);
      this.showAlert('เกิดข้อผิดพลาดในการดาวน์โหลด', 'error');
    }
  }

  startNewAnalysis() {
    // Reset form
    document.getElementById('analysisForm').reset();
    document.getElementById('inputFilesList').innerHTML = '';
    document.getElementById('databaseFileInfo').innerHTML = '';
    
    // Hide results
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.add('hidden');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Clear session
    this.currentSessionId = null;
  }

  openImageModal(img) {
    // Simple image modal (you can enhance this)
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="max-w-full max-h-full p-4">
        <img src="${img.src}" alt="${img.alt}" class="max-w-full max-h-full" />
        <button onclick="this.parentElement.parentElement.remove()" class="absolute top-4 right-4 text-white text-2xl">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    document.body.appendChild(modal);
  }

  showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${this.getAlertClasses(type)}`;
    alert.innerHTML = `
      <div class="flex items-start">
        <i class="${this.getAlertIcon(type)} mr-2 mt-0.5"></i>
        <div class="flex-1">
          <p class="font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 5000);
  }

  getAlertClasses(type) {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  }

  getAlertIcon(type) {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      default: return 'fas fa-info-circle';
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.analyzer = new NovelSimilarityAnalyzer();
});

// Health check on page load - using auto-detected URL
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get the analyzer instance to use its apiBaseUrl
    const analyzerInstance = window.analyzer || new NovelSimilarityAnalyzer();
  const _healthBase = analyzerInstance.apiBaseUrl || (typeof window !== 'undefined' && window.apiBaseUrl) || 'http://localhost:8000';
  const healthUrl = `${_healthBase}/api/health`;
    const response = await axios.get(healthUrl);
    console.log('Backend health:', response.data);
  } catch (error) {
    console.warn('Backend not available:', error.message);
  }
});