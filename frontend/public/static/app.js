/**
 * Novel Similarity Analyzer - Frontend JavaScript
 * Handles file uploads, API communication, and results display
 *
 * (เวอร์ชันสมบูรณ์ - แก้ไข TypeError, input_similarities, และการจัดรูปแบบตาราง Matrix)
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

  /* Plotly container styles */
  .plot-container {
    width: 100%;
    min-height: 500px; /* Ensure space for the plot */
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
    if (typeof window !== 'undefined' && window.apiBaseUrl !== undefined && window.apiBaseUrl !== '') { // Added check for empty string
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
      
      console.log('📄 File: ' + file.name + ', Path: ' + (file.webkitRelativePath || 'N/A') + ', Supported: ' + isSupported);
      
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
      event.target.value = ''; // Clear the input
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
      <div class="flex items-center space-x-3 overflow-hidden">
        <i class="${typeIcon} text-blue-600 flex-shrink-0"></i>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-900 truncate" title="${displayName}">${displayName}</p>
          <p class="text-sm text-gray-600">${sizeText}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2 flex-shrink-0">
        <span class="text-green-600 text-sm">
          <i class="fas fa-check-circle"></i> Ready
        </span>
        <button type="button" class="text-red-600 hover:text-red-800" onclick="analyzer.removeFileItem(${index}, '${type}')">
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

  removeFileItem(index, type) {
     if (type === 'database') {
        const container = document.getElementById('databaseFileInfo');
        if (container) container.innerHTML = '';
        const input = document.getElementById('databaseFile');
        if (input) input.value = ''; // Clear the file input
     } else {
        // Remove from display
        const fileItem = document.querySelector(`#inputFilesList [data-file-index="${index}"]`);
        if (fileItem) {
          fileItem.remove();
        }

        // Update the stored file list
        if (this.currentFiles) {
            this.currentFiles = this.currentFiles.filter((_, i) => i !== index);
            // Re-index remaining displayed items
            const remainingItems = document.querySelectorAll('#inputFilesList .file-item');
            remainingItems.forEach((item, newIndex) => {
                item.dataset.fileIndex = newIndex;
                const button = item.querySelector('button');
                if (button) {
                    button.setAttribute('onclick', `analyzer.removeFileItem(${newIndex}, '${type}')`);
                }
            });
            // Update the file input element itself
            this.updateFileInput(this.currentFiles);
        }
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
        preview.innerHTML = `<strong>ชื่อที่จะใช้:</strong> ${names.map((name, i) => `<span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1">${i + 1}. ${name}</span>`).join('')}`;
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
      
      // Check if we have stored files (from folder selection or updated list)
      if (this.currentFiles && this.currentFiles.length > 0) {
        filesToUpload = this.currentFiles;
        console.log('⬆️ Using currentFiles list:', filesToUpload.length);
      } else {
        // Use regular file input as fallback
        const inputFilesElement = document.getElementById('inputFiles');
        filesToUpload = inputFilesElement ? Array.from(inputFilesElement.files) : [];
        console.log('📄 Using file input element files:', filesToUpload.length);
      }
      
      if (filesToUpload.length === 0 && !document.getElementById('textInput').value.trim()) {
         this.showAlert('กรุณาเลือกไฟล์สำหรับวิเคราะห์ หรือใส่ข้อความโดยตรง', 'error');
         this.showLoading(false);
         return;
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
      } else {
         this.showAlert('กรุณาเลือกไฟล์ฐานข้อมูล (.zip)', 'error');
         this.showLoading(false);
         return;
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
          } else {
            // Indeterminate progress if total size is unknown
            this.updateProgress(50, 'กำลังอัปโหลดไฟล์ (ไม่ทราบขนาด)...');
          }
        }
      });
      
      if (response.data.status === 'success') {
        this.currentSessionId = response.data.session_id;
        this.updateLoadingStatus('การวิเคราะห์เสร็จสิ้น กำลังแสดงผลลัพธ์...');
        this.updateProgress(100, 'เสร็จสิ้น');
        
        // Hide loading and show results
        // Use finally block ensures loading is hidden even if displayResults throws error
        // this.showLoading(false); // Moved to finally
        this.displayResults(response.data);
      } else {
        throw new Error(response.data.message || 'การวิเคราะห์ล้มเหลว');
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      // Ensure loading spinner is hidden on error
      // this.showLoading(false); // Moved to finally block
      
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
          errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง (' + (error.response.data?.detail || 'No details') + ')';
        } else if (status === 503 || status === 504) { // Service Unavailable or Gateway Timeout
          errorMessage = 'เซิร์ฟเวอร์กำลังประมวลผลหนัก อาจใช้เวลานานกว่าปกติ กรุณาลองใหม่ภายหลัง';
        } else if (status >= 500) {
          errorMessage = 'เซิร์ฟเวอร์ไม่สามารถให้บริการได้ในขณะนี้ (' + status + ')';
        } else {
          errorMessage = error.response.data?.detail || `เกิดข้อผิดพลาด (${status})`;
        }
      } else if (error.request) {
        // Request was made but no response received (e.g., server down, CORS, network error)
         if (error.message.includes('Network Error')) {
             errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้ กรุณาตรวจสอบว่า Backend ทำงานอยู่หรือไม่';
         } else {
            errorMessage = 'ไม่ได้รับการตอบสนองจากเซิร์ฟเวอร์';
         }
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในการส่งคำขอ';
      }
      
      this.showAlert(errorMessage, 'error');
    } finally {
        // --- ADDED ---
        // Ensure loading indicator is always hidden after attempt
        this.showLoading(false);
        // --- END ADDED ---
    }
  }

  validateForm() {
    // Use this.currentFiles if available (handles folder uploads)
    const filesToValidate = this.currentFiles || (document.getElementById('inputFiles') ? document.getElementById('inputFiles').files : []);
    const textInput = document.getElementById('textInput').value.trim();
    const databaseFile = document.getElementById('databaseFile').files[0];
    
    // Check input requirements
    if (filesToValidate.length === 0 && !textInput) {
      this.showAlert('กรุณาเลือกไฟล์สำหรับวิเคราะห์ หรือใส่ข้อความโดยตรง', 'error');
      document.getElementById('inputFilesDropzone').scrollIntoView({ behavior: 'smooth' });
      return false;
    }
    
    // Check file count limit
    if (filesToValidate.length > this.maxInputFiles) {
      this.showAlert(`สามารถอัปโหลดได้สูงสุด ${this.maxInputFiles} ไฟล์เท่านั้น`, 'error');
      return false;
    }
    
    // Validate file types
    for (let file of filesToValidate) {
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
    for (let file of filesToValidate) {
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
    const analyzeBtn = document.getElementById('analyzeBtn'); // Get the button
    
    if (show) {
      if(loadingSection) loadingSection.classList.remove('hidden');
      if(resultsSection) resultsSection.classList.add('hidden'); // Hide results only if loading starts
      if (analyzeBtn) analyzeBtn.disabled = true; // Disable button while loading
      this.updateProgress(10, 'เริ่มต้นการวิเคราะห์...');
    } else {
      if (loadingSection) loadingSection.classList.add('hidden');
      if (analyzeBtn) analyzeBtn.disabled = false; // Re-enable button
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

    // Clear previous results before adding new ones
    resultsSection.innerHTML = ''; 

    try {
      resultsSection.innerHTML = this.generateResultsHTML(data);
      resultsSection.classList.remove('hidden');
      
      // Scroll to results
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Scroll to top of results
      
      // Initialize result interactions (like loading CSVs, rendering plots)
      this.initializeResultInteractions();

    } catch (error) {
        console.error("Error generating results HTML:", error);
        resultsSection.innerHTML = '<div class="result-card"><p class="text-red-600">เกิดข้อผิดพลาดในการแสดงผลลัพธ์: ' + error.message + '</p></div>';
        resultsSection.classList.remove('hidden');
    }
  }

  generateResultsHTML(data) {
    const results = data.results || {};
    console.log('Results data:', results); // Debug log
    
    // Extract visualization data
    const heatmapData = results.similarity_heatmap || results.heatmap || {};
    const networkData = results.network_top_matches || results.network || {};
    
    // Clear pending plots before generating new HTML
    this.pendingHeatmap = null;
    this.pendingNetwork = null;

    return `
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        ${this.generateAnalyzedWorksHeader(data)}
        
        <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
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
    // Check if rankingData or its content is missing
    if (!rankingData || !rankingData.content) {
       console.warn("Analysis by input card skipped: No rankingData or content.");
       return ''; // Return empty string if data is missing
    }
    
    try {
      const data = rankingData.content; // Use the object directly
      console.log('Parsed analysis data:', data);

      if (!data || !data.analysis_by_input || !Array.isArray(data.analysis_by_input)) {
        console.warn("Analysis by input card skipped: Invalid data structure.", data);
        return `
          <div class="result-card">
            <h3><i class="fas fa-file-alt"></i> ผลการวิเคราะห์แยกตามไฟล์</h3>
            <p class="text-red-500">ไม่พบข้อมูลการวิเคราะห์ หรือข้อมูลมีรูปแบบไม่ถูกต้อง</p>
          </div>`;
      }
      
      const inputAnalysisHtml = data.analysis_by_input.map(input => {
        // Ensure similarities is an array, default to empty array if not
        const similarities = Array.isArray(input.similarities) ? input.similarities : [];
        const topMatches = similarities.slice(0, 10); // Safe slicing

        if (topMatches.length === 0) {
            return `<div class="mb-4 text-gray-500">ไม่มีผลลัพธ์ความคล้ายคลึงสำหรับไฟล์: ${input.input_title}</div>`;
        }
        
        const similarityRows = topMatches.map((sim, index) => {
          // Use enhanced metadata for better display
          let displayTitle = '';
          let displaySubtitle = '';
          let displayDetail = '';
          
          if (sim.folder_name && sim.folder_name !== 'N/A') {
            displayTitle = `📚 ${sim.folder_name}`;
            displaySubtitle = `${sim.genre || 'N/A'} › Chapter: ${sim.chapter_name || 'N/A'}`;
            displayDetail = `File: ${sim.database_file || 'N/A'}`;
          } else {
            displayTitle = `📄 ${sim.chapter_name || sim.database_file || 'N/A'}`; // Fallback chain
            displaySubtitle = `หมวดหมู่: ${sim.genre || 'N/A'}`;
            displayDetail = `File: ${sim.database_file || 'N/A'}`;
          }
          
          const rankIcon = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
          const rowClass = index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50';
          const similarityScore = typeof sim.similarity === 'number' ? sim.similarity : 0; // Default to 0 if missing/invalid
          
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
                  ${sim.genre || 'N/A'}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-semibold text-xl ${similarityScore >= 70 ? 'text-green-600' : similarityScore >= 50 ? 'text-yellow-600' : 'text-gray-600'}">
                  ${similarityScore.toFixed(1)}% 
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
                ไฟล์วิเคราะห์: ${input.input_title || 'Unknown Input'}
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
      console.error('Error generating analysis by input card:', error);
      // Return an error message within the card structure
      return `
         <div class="result-card">
           <h3><i class="fas fa-chart-bar"></i>📊 การวิเคราะห์ตามไฟล์อินพุต</h3>
           <p class="text-red-600">เกิดข้อผิดพลาดในการแสดงผลข้อมูล: ${error.message}</p>
         </div>
      `;
    }
  }

  generateReportCard(reportData) {
    if (!reportData || !reportData.content) {
         console.warn("Report card skipped: No reportData or content.");
         return ''; // Skip if no content
     }
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-file-alt"></i>รายงานสรุป</h3>
        <div class="bg-gray-50 rounded-lg p-4">
          <pre class="whitespace-pre-wrap text-sm text-gray-800 custom-scrollbar" style="max-height: 400px; overflow-y: auto;">${reportData.content}</pre>
        </div>
        ${reportData.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + reportData.url : reportData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลดรายงาน</a>` : ''}
      </div>
    `;
  }

  generateComparisonTableCard(tableData) {
    // Check if tableData or its URL is missing
     if (!tableData || !tableData.url) {
        console.warn("Comparison table card skipped: No tableData or URL.");
        return ''; // Skip rendering if no URL to load from
    }
    
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
        <div class="overflow-x-auto border border-gray-200 rounded-lg">
          <div id="comparisonTableContainer" class="bg-gray-50 p-4 min-h-[100px]"> 
            <p class="text-gray-600">กำลังโหลดข้อมูลตาราง...</p>
          </div>
        </div>
        <a href="${this.apiBaseUrl ? this.apiBaseUrl + tableData.url : tableData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด CSV</a>
      </div>
    `;
  }

  generateSimilarityMatrixCard(matrixData) {
     if (!matrixData || !matrixData.url) {
        console.warn("Similarity matrix card skipped: No matrixData or URL.");
        return '';
    }
    
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
        <div class="overflow-x-auto border border-gray-200 rounded-lg">
          <div id="similarityMatrixContainer" class="bg-gray-50 p-4 min-h-[100px]">
            <p class="text-gray-600">กำลังโหลดข้อมูลเมทริกซ์...</p>
          </div>
        </div>
        <a href="${this.apiBaseUrl ? this.apiBaseUrl + matrixData.url : matrixData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด CSV</a>
      </div>
    `;
  }

  generateOverallRankingCard(rankingData) {
     if (!rankingData || !rankingData.content) {
         console.warn("Overall ranking card skipped: No rankingData or content.");
         return '';
     }
    
    try {
      const data = rankingData.content; // Use object directly
      if (!data) {
          console.warn("Overall ranking card skipped: Content is null or invalid.");
          return '';
      }
      
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
           const maxScore = typeof genre.max === 'number' ? Math.round(genre.max * 100) : 'N/A';
           const meanScore = typeof genre.mean === 'number' ? Math.round(genre.mean * 100) : 'N/A';
          
          return `
            <div class="border-2 ${colors[index]} rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-2xl mr-2">${medals[index]}</span>
                  <span class="font-bold text-lg">${genre.genre || 'Unknown'}</span>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold">${maxScore}%</div>
                  <div class="text-sm opacity-75">ความคล้ายสูงสุด</div>
                </div>
              </div>
              <div class="mt-2 text-sm">
                ค่าเฉลี่ย: ${meanScore}%
              </div>
            </div>
          `;
        }).join('');
      } else {
          summaryCards = '<p class="text-gray-500 col-span-1 md:col-span-3">ไม่มีข้อมูลการจัดอันดับตามหมวดหมู่</p>';
      }
      
      // Generate detailed table with improved novel title display
      let detailTable = '';
      if (dbRank.length > 0) {
          const tableRows = dbRank.slice(0, 10).map((doc, index) => {
          let primaryDisplay = '';
          let secondaryDisplay = '';

          const novelTitle = doc.novel_title || doc.title || doc.folder_name || 'N/A';
          const chapterName = doc.chapter_name || doc.file_name || doc.db_doc || '';

          if (novelTitle && novelTitle !== 'N/A' && novelTitle !== doc.genre) { // Avoid showing genre as title
            primaryDisplay = `📚 ${novelTitle}`;
            secondaryDisplay = `${doc.genre || ''} › ${chapterName}`;
          } else {
            primaryDisplay = `📄 ${chapterName || doc.db_doc}`; // Ensure something is displayed
            secondaryDisplay = `หมวดหมู่: ${doc.genre || ''}`;
          }
          const bestSim = typeof doc.best_similarity === 'number' ? doc.best_similarity : 0;

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
                <i class="fas fa-file mr-1"></i>File: ${doc.db_doc || 'N/A'}
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-3 py-1 text-sm rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 font-medium">
                <i class="fas fa-folder mr-1"></i>${doc.genre || 'N/A'}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="text-2xl font-bold ${bestSim >= 0.7 ? 'text-green-600' : bestSim >= 0.5 ? 'text-yellow-600' : 'text-gray-600'}">
                ${Math.round(bestSim * 100)}%
              </div>
              <div class="text-xs text-gray-500">
                ${(bestSim * 100).toFixed(2)}% exact
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
            <div class="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table class="w-full">
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
      } else {
           detailTable = '<p class="text-gray-500 mt-6">ไม่มีข้อมูลการจัดอันดับเอกสารโดยรวม</p>';
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
      console.error('Error generating/parsing ranking data:', error);
      return `
        <div class="result-card">
          <h3><i class="fas fa-trophy"></i>การจัดอันดับโดยรวม</h3>
          <p class="text-red-600">เกิดข้อผิดพลาดในการแสดงผลข้อมูลการจัดอันดับ: ${error.message}</p>
        </div>
      `;
    }
  }

  generateHeatmapCard(heatmapData) {
    // Check if heatmapData or its data attribute is missing
    if (!heatmapData || !heatmapData.data) {
        console.warn('Heatmap card skipped: No heatmapData or heatmapData.data found.');
        return ''; // Return empty string if no data to render
    }

    // Generate unique ID for the plot container
    var plotId = 'heatmap-plot-' + Date.now();

    // Store data and plotId for rendering later
    this.pendingHeatmap = {
        data: heatmapData.data,
        plotId: plotId
    };

    // Always render the container div for Plotly
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
          '<div class="w-full bg-white rounded-lg border p-4 overflow-hidden">' + // Added overflow-hidden
            '<div id="' + plotId + '" class="w-full h-[600px] plot-container"></div>' + // Plotly container
          '</div>' +
          (heatmapData.url ? ('<div class="mt-4 text-right">' + // Provide PNG download if URL exists
            '<a href="' + (this.apiBaseUrl ? this.apiBaseUrl + heatmapData.url : heatmapData.url) + '" ' +
               'download="similarity_heatmap.png" class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">' +
              '<i class="fas fa-download mr-2"></i>ดาวน์โหลดรูปภาพ (PNG)' +
            '</a>' +
          '</div>') : '') +
        '</div>'
    );
  }

  initializeCharts() {
    this.chartsInitialized = true;
    console.log('Charts initialized');
  }

  generateAnalysisVisualizationCards(results) {
    // This function seems unused now as charts are within specific cards
    // Kept for potential future use or reference
    const cards = [];
    // ... (rest of the function, potentially removed or refactored) ...
    return cards.join('');
  }

  createCharts(data) {
     // This function seems unused now as charts are within specific cards
    // Kept for potential future use or reference
    // ... (rest of the function, potentially removed or refactored) ...
  }

  generateVisualizationCard(type, imgSrc, data) {
    // This function seems unused now as Plotly rendering is separate
    // Kept for potential future use or reference (e.g., fallback PNG display)
    // ... (rest of the function, potentially removed or refactored) ...
  }

  generateNetworkCard(networkData) {
    // Check if networkData or its data attribute is missing
     if (!networkData || !networkData.data) {
        console.warn('Network graph card skipped: No networkData or networkData.data found.');
        return ''; // Return empty string if no data to render
    }
    
    // Generate unique ID for the plot container
    const plotId = 'network-plot-' + Date.now();
    
    // Store data and plotId for rendering later
    this.pendingNetwork = {
        data: networkData.data,
        plotId: plotId
    };
    
    // Always render the container div for Plotly
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
        <div class="w-full bg-white rounded-lg border p-4 overflow-hidden"> 
          <div id="${plotId}" class="w-full h-[600px] plot-container"></div> 
        </div>
        ${networkData.url ? ` 
          <div class="mt-4 text-right">
            <a href="${this.apiBaseUrl ? this.apiBaseUrl + networkData.url : networkData.url}" 
               download="network_top_matches.png" class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <i class="fas fa-download mr-2"></i>ดาวน์โหลดรูปภาพ (PNG)
            </a>
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

    // Render visualizations if Plotly is ready and data is pending
    if (this.plotlyLoaded) {
      if (this.pendingHeatmap) {
        this.renderHeatmap(this.pendingHeatmap.plotId, this.pendingHeatmap.data);
      }
      if (this.pendingNetwork) {
        this.renderNetwork(this.pendingNetwork.plotId, this.pendingNetwork.data);
      }
    } else {
        console.log("Plotly not yet loaded, deferring visualization rendering.");
    }
  }

  renderHeatmap(plotId, data) {
    if (!window.Plotly || !data) {
      console.log('Deferring heatmap render - Plotly not ready or no data');
      this.pendingHeatmap = { plotId: plotId, data: data }; // Keep pending if Plotly not loaded
      return;
    }
    this.pendingHeatmap = null; // Clear pending data

    var plotElement = document.getElementById(plotId);
     if (!plotElement) {
       console.error('Heatmap container element not found:', plotId);
       return; // Exit if container doesn't exist in DOM yet
     }

    var x_labels = data.x_labels || [];
    var y_labels = data.y_labels || [];
    var values = data.values || [];
    if (x_labels.length === 0 || y_labels.length === 0 || values.length === 0) {
        console.warn("Cannot render heatmap: Missing x_labels, y_labels, or values.");
        plotElement.innerHTML = '<p class="text-red-500">ข้อมูลสำหรับ Heatmap ไม่สมบูรณ์</p>';
        return;
    }

    const heatmapTrace = {
      x: x_labels,
      y: y_labels,
      z: values,
      type: 'heatmap',
      colorscale: [
        [0, 'rgb(68,1,84)'], // Dark purple (low)
        [0.25, 'rgb(59,82,139)'], // Blue
        [0.5, 'rgb(33,145,140)'], // Teal
        [0.75, 'rgb(94,201,98)'], // Green
        [1, 'rgb(253,231,37)'] // Yellow (high) - Viridis scale
      ],
      hoverongaps: false,
      hovertemplate: 
        '<b>Input:</b> %{y}<br>' +
        '<b>Database:</b> %{x}<br>' +
        '<b>ความคล้าย:</b> %{z:.1%}<br>' + // Display as percentage
        '<extra></extra>' // Hide extra hover info
    };

    const layout = {
      // title: 'แผนที่ความร้อนแสดงความคล้ายคลึง', // Title is already in the card
      xaxis: {
        // title: 'เอกสารในฐานข้อมูล', // Keep axis titles concise
        tickangle: -45,
        automargin: true,
        tickfont: { size: 9 } // Smaller font for axis labels
      },
      yaxis: {
        // title: 'ไฟล์อินพุต',
        automargin: true,
        tickfont: { size: 9 }
      },
      margin: { // Adjust margins for labels
        l: 150, // Increase left margin for potentially long input names
        r: 30,
        b: 150, // Increase bottom margin for rotated db names
        t: 30,
        pad: 4
      },
      autosize: true // Let Plotly manage size within container
    };

    const config = {
      responsive: true,
      displayModeBar: true, // Show Plotly tools (zoom, pan, download)
      modeBarButtonsToRemove: ['select2d', 'lasso2d'], // Remove selection tools
      displaylogo: false,
      locale: 'th' // Use Thai locale if needed for tooltips/buttons
    };

    try {
      console.log('Rendering heatmap in element:', plotId);
      Plotly.newPlot(plotId, [heatmapTrace], layout, config).then(function() {
        console.log('Heatmap rendered successfully');
        // Add event listener for window resize to relayout
        window.addEventListener('resize', function() { 
            if(document.getElementById(plotId)) { // Check if element still exists
                Plotly.Plots.resize(plotElement); 
            }
        });
      }).catch(function(err) {
        console.error('Failed to render heatmap with Plotly:', err);
        plotElement.innerHTML = '<p class="text-red-500">เกิดข้อผิดพลาดในการสร้าง Heatmap</p>';
      });
    } catch (error) {
      console.error('Error during Plotly.newPlot for heatmap:', error);
       plotElement.innerHTML = '<p class="text-red-500">เกิดข้อผิดพลาดในการสร้าง Heatmap</p>';
    }
  }

  renderNetwork(plotId, data) {
    if (!window.Plotly || !data) {
      console.log('Deferring network render - Plotly not ready or no data');
      this.pendingNetwork = { plotId: plotId, data: data }; // Keep pending
      return;
    }
     this.pendingNetwork = null; // Clear pending data

     var plotElement = document.getElementById(plotId);
     if (!plotElement) {
       console.error('Network graph container element not found:', plotId);
       return;
     }

    var nodes = data.nodes || [];
    var edges = data.edges || [];
    if (nodes.length === 0) { // Edges might be empty if K=0 or no matches
        console.warn("Cannot render network graph: No nodes found in data.");
        plotElement.innerHTML = '<p class="text-red-500">ข้อมูลสำหรับ Network Graph ไม่สมบูรณ์ (ไม่พบโหนด)</p>';
        return;
    }

    // Separate input and database nodes
    const inputNodes = nodes.filter(node => node.is_input);
    const dbNodes = nodes.filter(node => !node.is_input);

    // Create x-coordinates (inputs on left, db on right)
    const xCoords = {};
    const yCoords = {};
    const nodeLookup = {}; // For quick access by ID

    // Position Input Nodes
    const inputYStep = inputNodes.length > 1 ? 4 / (inputNodes.length - 1) : 0; // Spread Y from -2 to 2
    inputNodes.forEach((node, i) => {
      const yPos = inputNodes.length === 1 ? 0 : -2 + i * inputYStep;
      xCoords[node.id] = -5;  // Left side
      yCoords[node.id] = yPos;
      nodeLookup[node.id] = node;
    });

    // Position DB Nodes
    const dbYStep = dbNodes.length > 1 ? 4 / (dbNodes.length - 1) : 0; // Spread Y from -2 to 2
    dbNodes.forEach((node, i) => {
       const yPos = dbNodes.length === 1 ? 0 : -2 + i * dbYStep;
      xCoords[node.id] = 5;   // Right side
      yCoords[node.id] = yPos;
      nodeLookup[node.id] = node;
    });


    // --- START FIX FOR MISSING LINES ---
    // Create ONE trace for ALL lines
    const edgeX = [];
    const edgeY = [];
    const edgeHoverText = [];
    edges.forEach(edge => {
        const sourceNode = nodeLookup[edge.source]; // Get full node object
        const targetNode = nodeLookup[edge.target]; // Get full node object
        
        if (sourceNode && targetNode) {
            edgeX.push(sourceNode.x, targetNode.x, null); // Add null to break the line
            edgeY.push(sourceNode.y, targetNode.y, null);
            edgeHoverText.push(
                '', // No text for start point
                 // Combine info for line tooltip
                `<b>${sourceNode.label}</b><br>↔️ <b>${targetNode.label}</b><br>ความคล้าย: ${(edge.weight * 100).toFixed(1)}%`,
                ''  // No text for null break
            );
        }
    });

    const edgeTrace = {
        type: 'scatter',
        mode: 'lines',
        x: edgeX,
        y: edgeY,
        line: {
            color: 'rgb(180,180,180)',
            width: 1 // Keep lines thin
        },
        hoverinfo: 'text', // Show hover text defined below
        text: edgeHoverText, // Use calculated hover text
        hoverlabel: { bgcolor: 'rgba(0,0,0,0.7)', font: { color: 'white' } } // Darker tooltip for lines
    };
    // --- END FIX FOR MISSING LINES ---


    // Create node trace (single trace for all nodes)
    var nodeTrace = {
      x: nodes.map(node => xCoords[node.id]),
      y: nodes.map(node => yCoords[node.id]),
      mode: 'markers+text', // Show markers and labels beside them
      type: 'scatter',
      name: 'Nodes',
      text: nodes.map(node => node.label), // Text to display next to marker
      textposition: nodes.map(node => 
        node.is_input ? 'middle left' : 'middle right' // Position text relative to marker
      ),
      textfont: {
          size: 10 // Smaller font for node labels on plot
      },
      marker: {
        size: 15, // Slightly smaller markers
        color: nodes.map(node => 
          node.is_input ? 'rgb(66, 135, 245)' : 'rgb(245, 171, 66)' // Blue for input, Orange for DB
        ),
        symbol: nodes.map(node => 
          node.is_input ? 'square' : 'circle'
        )
      },
      hoverinfo: 'text', // Use hovertext defined below
      hovertext: nodes.map(node => node.label), // Tooltip text is the full label
      hoverlabel: { bgcolor: 'rgba(0,0,0,0.8)', font: { color: 'white' } } // Darker tooltip for nodes
    };


    const layout = {
      showlegend: false,
      hovermode: 'closest', // Show tooltip for the nearest item
      // title: 'กราฟเครือข่ายความสัมพันธ์', // Title already in card
      xaxis: {
        visible: false, // Hide axis lines and ticks
        // --- START FIX FOR LABELS CUT OFF ---
        range: [-8, 8] // ขยายขอบเขตแกน X
        // --- END FIX ---
      },
      yaxis: {
        visible: false,
        // Adjust Y range based on max nodes, add padding
        range: [
            Math.min(0, ...Object.values(yCoords).filter(y => !isNaN(y))) - 0.5, // Ensure 0 is included, filter NaNs
            Math.max(0, ...Object.values(yCoords).filter(y => !isNaN(y))) + 0.5
        ]
      },
      margin: { l: 20, r: 20, b: 20, t: 40 }, // Minimal margins
      autosize: true
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['select2d', 'lasso2d'],
      displaylogo: false,
      locale: 'th'
    };

    try {
      console.log('Rendering network graph in element:', plotId);
      // --- FIX: Plot edgeTrace (object) not edgeTraces (array) ---
      Plotly.newPlot(plotId, [edgeTrace, nodeTrace], layout, config).then(function() {
      // --- END FIX ---
        console.log('Network graph rendered successfully');
         window.addEventListener('resize', function() {
              if(document.getElementById(plotId)) { // Check if element still exists
                Plotly.Plots.resize(plotElement); 
              }
         });
      }).catch(function(err) {
        console.error('Failed to render network graph with Plotly:', err);
         plotElement.innerHTML = '<p class="text-red-500">เกิดข้อผิดพลาดในการสร้าง Network Graph</p>';
      });
    } catch (error) {
      console.error('Error during Plotly.newPlot for network graph:', error);
       plotElement.innerHTML = '<p class="text-red-500">เกิดข้อผิดพลาดในการสร้าง Network Graph</p>';
    }
  }

  // --- START: ADDED FUNCTIONS (loadComparisonTable, loadSimilarityMatrix, getCSVUrl, parseCSVToTable, formatCellValue) ---
  
  async loadComparisonTable() {
    const container = document.getElementById('comparisonTableContainer');
    if (!container) {
        console.warn('loadComparisonTable: Container not found');
        return;
    }

    try {
      const csvUrl = this.getCSVUrl('comparison_table');
      if (csvUrl) {
        console.log('Loading Comparison Table from:', csvUrl);
        // Use axios if available
        if (window.axios) {
            const response = await axios.get(csvUrl);
            const csvData = response.data;
            const tableHTML = this.parseCSVToTable(csvData);
            container.innerHTML = tableHTML;
        } else {
             // Fallback to fetch
            console.log('Axios not found, using fetch for Comparison Table');
            const response = await fetch(csvUrl);
            if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
            const csvData = await response.text();
            const tableHTML = this.parseCSVToTable(csvData);
            container.innerHTML = tableHTML;
        }
      } else {
        console.warn('No CSV URL found for comparison_table');
        container.innerHTML = '<p class="text-gray-600">ไม่พบข้อมูลตารางเปรียบเทียบ (No URL)</p>';
      }
    } catch (error) {
      console.error('Error loading comparison table:', error);
      container.innerHTML = `<p class="text-red-600">เกิดข้อผิดพลาดในการโหลดตารางเปรียบเทียบ: ${error.message}</p>`;
    }
  }

  async loadSimilarityMatrix() {
    const container = document.getElementById('similarityMatrixContainer');
    if (!container) {
         console.warn('loadSimilarityMatrix: Container not found');
         return;
    }

    try {
      const csvUrl = this.getCSVUrl('similarity_matrix');
      if (csvUrl) {
         console.log('Loading Similarity Matrix from:', csvUrl);
         if (window.axios) {
            const response = await axios.get(csvUrl);
            const csvData = response.data;
            const tableHTML = this.parseCSVToTable(csvData);
            container.innerHTML = tableHTML;
         } else {
             console.log('Axios not found, using fetch for Similarity Matrix');
             const response = await fetch(csvUrl);
             if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
             const csvData = await response.text();
             const tableHTML = this.parseCSVToTable(csvData);
             container.innerHTML = tableHTML;
         }
      } else {
        console.warn('No CSV URL found for similarity_matrix');
        container.innerHTML = '<p class="text-gray-600">ไม่พบข้อมูลเมทริกซ์ความคล้ายคลึง (No URL)</p>';
      }
    } catch (error) {
      console.error('Error loading similarity matrix:', error);
      container.innerHTML = `<p class="text-red-600">เกิดข้อผิดพลาดในการโหลดเมทริกซ์: ${error.message}</p>`;
    }
  }

  getCSVUrl(fileKey) {
    // Get CSV URL from stored results data
    if (this.currentResults && this.currentResults.results && this.currentResults.results[fileKey] && this.currentResults.results[fileKey].url) {
      // Ensure the URL is absolute
      let url = this.currentResults.results[fileKey].url;
       if (url.startsWith('/')) { // If it's a relative path
           return this.apiBaseUrl ? `${this.apiBaseUrl}${url}` : url;
       }
       return url; // Assume it's already absolute if it doesn't start with / (less likely)
    }
    console.warn(`getCSVUrl: No URL found for key '${fileKey}' in currentResults.`);
    return null;
  }

  parseCSVToTable(csvData) {
    if (!csvData || typeof csvData !== 'string' || csvData.trim().length === 0) {
       return '<p class="text-gray-600">ไม่มีข้อมูลในไฟล์ CSV</p>';
    }
    
    const lines = csvData.trim().split('\n');
    if (lines.length === 0) return '<p class="text-gray-600">ไม่มีข้อมูล</p>';

    // Use a sticky container for horizontal scroll + sticky header
    let html = '<div class="overflow-x-auto relative border border-gray-200 rounded-lg" style="max-height: 500px; overflow-y: auto;">';
    html += '<table class="min-w-full bg-white divide-y divide-gray-200">';
    
    let headers = []; // Store header names
    if (lines.length > 0) {
      headers = this.parseCSVLine(lines[0].trim()); // Get headers from the first line, trim it
    }

    lines.forEach((line, index) => {
      // Skip empty lines
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const cells = this.parseCSVLine(trimmedLine);
      
      // Ensure cell count matches header count if not header row
      if (index > 0 && cells.length !== headers.length) {
          console.warn(`Skipping malformed CSV line ${index + 1}: expected ${headers.length} cells, got ${cells.length}. Line: ${trimmedLine}`);
          return; // Skip row
      }

      const tagName = index === 0 ? 'th' : 'td';
      const rowClass = index === 0 ? 'bg-gradient-to-r from-gray-50 to-blue-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100');
      
      html += `<tr class="${rowClass}">`;
      cells.forEach((cell, cellIndex) => {
        const headerName = headers[cellIndex] ? headers[cellIndex].trim() : ''; // Get header
        
        // --- START: FIX for Table Overlap ---
        let cellClass = '';
        if (index === 0) { // Header Row (th)
          cellClass = 'px-4 py-3 border border-gray-200 text-sm font-medium text-gray-600 text-left sticky top-0 z-10 whitespace-nowrap min-w-[200px]'; // <-- ADDED whitespace-nowrap & min-w
        } else { // Data Row (td)
          cellClass = 'px-4 py-2 border border-gray-200 text-sm text-gray-800';
        }
        
        // Pass headers to formatCellValue
        const displayValue = this.formatCellValue(cell, cellIndex, index, headers); 
        
        // Align text in cells
        let alignClass = ' align-middle'; // Default
        if (headerName.toLowerCase() === 'input_similarities' || headerName.toLowerCase() === 'genre_top3_summary') {
            alignClass = ' align-top'; // Align lists to the top
        } else if (cellIndex > 0 && index > 0) { // If it's a data cell (not row header)
            alignClass = ' align-middle text-center'; // <-- ADDED text-center
        }
        // --- END: FIX for Table Overlap ---

        html += `<${tagName} class="${cellClass}${alignClass}">${displayValue}</${tagName}>`;
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
    
    // Handle potential carriage returns in the line
    line = line.replace(/\r$/, '');

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Handle escaped quotes ("")
        if (inQuotes && line[i+1] === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes; // Toggle quote state
        }
      } else if (char === ',' && !inQuotes) {
        // End of a cell
        result.push(current.trim());
        current = '';
      } else {
        // Regular character
        current += char;
      }
    }
    
    // Add the last cell
    result.push(current.trim());
    return result;
  }

  formatCellValue(value, columnIndex, rowIndex, headers = []) {
    // Remove BOM if present (usually only on first cell)
    const cleanValue = (columnIndex === 0 && rowIndex === 0) ? value.replace(/^\ufeff/, '') : value;
    
    const headerName = headers[columnIndex] ? headers[columnIndex].trim() : ''; // Get the header name, trim whitespace

    // --- Special formatting for input_similarities column ---
    if (headerName.toLowerCase() === 'input_similarities' && rowIndex > 0) {
      try {
        // Replace single quotes used by Python dicts/lists with double quotes for valid JSON
        let validJsonString = cleanValue;
        if ((validJsonString.startsWith("'") && validJsonString.endsWith("'")) || (validJsonString.startsWith('"') && validJsonString.endsWith('"'))) {
             validJsonString = validJsonString.substring(1, validJsonString.length - 1); // Remove outer quotes
        }
        validJsonString = validJsonString.replace(/'/g, '"'); // Replace all internal single quotes
        validJsonString = validJsonString.replace(/None/g, 'null'); // Replace Python None with JSON null

        const similarities = JSON.parse(validJsonString);

        if (Array.isArray(similarities)) {
          // ---
          // --- **แสดง "จำนวนไฟล์" (ตามคำขอล่าสุด)** ---
          // ---
          return `<span class="text-sm font-medium text-gray-700">${similarities.length} matches</span>`;
        }
      } catch (e) {
        console.warn("Failed to parse input_similarities:", cleanValue, e);
        return `<span class="text-xs text-red-500" title="Error parsing: ${cleanValue}">[Parse Error]</span>`;
      }
    }
    // --- End special formatting ---

    // --- START: FIX for Similarity Matrix formatting ---
    if (rowIndex > 0 && /^\d*\.?\d+$/.test(cleanValue)) {
      const numValue = parseFloat(cleanValue);
      
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 1.01) {
          // Check if it's a "top_similarity" column (format as Percentage)
          if (headerName.toLowerCase().includes('similarity')) {
            const percentage = (numValue * 100).toFixed(1);
            let colorClass = 'text-gray-600';
            if (numValue >= 0.8) colorClass = 'text-red-600 font-bold';
            else if (numValue >= 0.6) colorClass = 'text-orange-600 font-medium';
            else if (numValue >= 0.3) colorClass = 'text-yellow-600';
            else if (numValue > 0) colorClass = 'text-blue-600';
            return `<span class="${colorClass}">${percentage}%</span>`;
          }
          // Check if it's in the Similarity Matrix (columnIndex > 0 and not 'top_similarity')
          else if (columnIndex > 0) { 
            const decimalValue = numValue.toFixed(2); // Format to 2 decimal places
            let colorClass = 'text-gray-600';
            if (numValue >= 0.8) colorClass = 'text-red-600 font-bold';
            else if (numValue >= 0.6) colorClass = 'text-orange-600 font-medium';
            else if (numValue >= 0.3) colorClass = 'text-yellow-600';
            else if (numValue > 0) colorClass = 'text-blue-600';
            return `<span class="${colorClass}">${decimalValue}</span>`;
          }
      }
    }
    // --- END: FIX for Similarity Matrix formatting ---
    
    // Format relation status
    if (cleanValue.toLowerCase() === 'duplicate' || cleanValue.toLowerCase() === 'duplicate/near-duplicate') {
       return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">ซ้ำซ้อน</span>';
    }
    if (cleanValue.toLowerCase() === 'similar') {
       return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">คล้ายคลึง</span>';
    }
    if (cleanValue.toLowerCase() === 'different') {
       return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">แตกต่าง</span>';
    }
    
    // Default: return truncated value if too long, else return as is
    if (cleanValue.length > 100 && rowIndex > 0) { // Don't truncate headers
        return `<span title="${cleanValue}">${cleanValue.substring(0, 100)}...</span>`;
    }
    return cleanValue;
  }
  
  // --- END: ADDED FUNCTIONS ---


  generateFileNamesDisplay(data) {
    if (!data.file_name_mapping || Object.keys(data.file_name_mapping).length === 0) {
      return '';
    }

    const mappings = Object.entries(data.file_name_mapping)
      .map(([originalName, customName]) => `<span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1 mb-1" title="${originalName}">${customName}</span>`) // Added title attribute
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
        console.warn("Analyzed works header skipped: No file_name_mapping.");
        return ''; // Don't render if no mapping provided
    }

    const works = Object.entries(data.file_name_mapping)
      .map(([originalName, customName]) => `
        <div class="flex items-center bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 mb-3 gap-3">
          <div class="flex-shrink-0">
            <i class="fas fa-book text-2xl text-purple-600"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-purple-900 truncate" title="${customName}">${customName}</h3>
            <p class="text-sm text-purple-700 truncate" title="ไฟล์ต้นฉบับ: ${originalName}">ไฟล์ต้นฉบับ: ${originalName}</p>
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
        responseType: 'blob' // Important for file downloads
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from Content-Disposition header if available, otherwise use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `similarity_analysis_results_${this.currentSessionId}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.remove();
      window.URL.revokeObjectURL(url);
      
      this.showAlert('ดาวน์โหลดผลลัพธ์สำเร็จ', 'success');
      
    } catch (error) {
      console.error('Download failed:', error);
       let errorMsg = 'เกิดข้อผิดพลาดในการดาวน์โหลด';
        if (error.response && error.response.status === 404) {
            errorMsg = 'ไม่พบไฟล์ผลลัพธ์บนเซิร์ฟเวอร์ (404)';
        } else if (error.message.includes('Network Error')) {
            errorMsg = 'ไม่สามารถเชื่อมต่อเพื่อดาวน์โหลดไฟล์';
        }
       this.showAlert(errorMsg, 'error');
    }
  }

  startNewAnalysis() {
    // Reset form elements
    const form = document.getElementById('analysisForm');
    if (form) form.reset();
    
    // Clear file lists
    const inputList = document.getElementById('inputFilesList');
    if (inputList) inputList.innerHTML = '';
    const dbInfo = document.getElementById('databaseFileInfo');
    if (dbInfo) dbInfo.innerHTML = '';
    const namesPreview = document.getElementById('novelNamesPreview');
    if (namesPreview) namesPreview.innerHTML = '';

    // Clear stored files state
    this.currentFiles = null;
    this.folderFiles = null;
    
    // Hide results and loading sections
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) resultsSection.classList.add('hidden');
    const loadingSection = document.getElementById('loadingSection');
    if(loadingSection) loadingSection.classList.add('hidden'); // Ensure loading is hidden too
    
    // Re-enable button
    const analyzeBtn = document.getElementById('analyzeBtn');
    if(analyzeBtn) analyzeBtn.disabled = false;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Clear session ID
    this.currentSessionId = null;
    this.currentResults = null; // Also clear results data
  }

  openImageModal(img) {
    // Create modal elements
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
    modalOverlay.style.cursor = 'zoom-out'; // Indicate click to close

    const modalContent = document.createElement('div');
    modalContent.className = 'relative max-w-full max-h-full';

    const modalImage = document.createElement('img');
    modalImage.src = img.src;
    modalImage.alt = img.alt;
    modalImage.className = 'block max-w-full max-h-[90vh] object-contain'; // Limit height

    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-2 right-2 text-white text-3xl bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.style.cursor = 'pointer';

    // Append elements
    modalContent.appendChild(modalImage);
    modalContent.appendChild(closeButton);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Close modal function
    const closeModal = () => {
        if (modalOverlay.parentElement) {
            modalOverlay.remove();
        }
    };

    // Event listeners for closing
    modalOverlay.addEventListener('click', (e) => {
        // Close if clicking the overlay itself, not the image/button
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    closeButton.addEventListener('click', closeModal);
}

  showAlert(message, type = 'info') {
    // Remove existing alerts first
    document.querySelectorAll('.analysis-alert').forEach(alert => alert.remove());

    // Create alert element
    const alert = document.createElement('div');
    // Add a specific class for easy removal
    alert.className = `analysis-alert fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${this.getAlertClasses(type)}`;
    alert.innerHTML = `
      <div class="flex items-start">
        <i class="${this.getAlertIcon(type)} mr-2 mt-0.5 flex-shrink-0"></i>
        <div class="flex-1">
          <p class="font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 flex-shrink-0">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 7 seconds (longer for errors)
    const duration = type === 'error' ? 10000 : 7000;
    setTimeout(() => {
      // Check if the alert still exists before removing
      if (alert.parentElement) {
        alert.remove();
      }
    }, duration);
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
  if (!window.analyzer) { // Prevent multiple initializations
      window.analyzer = new NovelSimilarityAnalyzer();
  }
});

// Health check on page load - using auto-detected URL
document.addEventListener('DOMContentLoaded', async () => {
  // Check if health check already ran (simple flag)
  if (window.healthChecked) return;
  window.healthChecked = true;

  try {
    // Get the analyzer instance to use its apiBaseUrl or create temp one
    // Ensure analyzer is created if it wasn't
    if (!window.analyzer) {
         window.analyzer = new NovelSimilarityAnalyzer();
    }
    const analyzerInstance = window.analyzer;
    const _healthBase = analyzerInstance.apiBaseUrl; // Use the resolved URL
    const healthUrl = `${_healthBase}/api/health`;
    
    // Set a short timeout for health check
    const response = await axios.get(healthUrl, { timeout: 5000 });
    console.log('Backend health:', response.data);
    // Optionally show a small status indicator on the page
     const statusIndicator = document.getElementById('backendStatus');
     if(statusIndicator) {
         statusIndicator.innerHTML = '<i class="fas fa-circle text-green-500 mr-1"></i> Backend Connected';
         statusIndicator.className = 'text-xs text-green-600';
     }

  } catch (error) {
    console.warn('Backend health check failed:', error.message);
    const statusIndicator = document.getElementById('backendStatus');
     if(statusIndicator) {
         statusIndicator.innerHTML = '<i class="fas fa-circle text-red-500 mr-1"></i> Backend Disconnected';
         statusIndicator.className = 'text-xs text-red-600';
     }
     // Show a non-intrusive warning to the user
     // if (window.analyzer) { // Check if analyzer exists before calling showAlert
     //    window.analyzer.showAlert('ไม่สามารถเชื่อมต่อ Backend ได้ โปรดตรวจสอบ', 'warning');
     // }
  }
});