/**
 * Novel Similarity Analyzer - Frontend JavaScript
 * Handles file uploads, API communication, and results display
 */

class NovelSimilarityAnalyzer {
  constructor() {
    // Auto-detect backend URL based on current environment
    const currentHost = window.location.hostname;
    if (currentHost.includes('e2b.dev')) {
      // E2B sandbox environment - use public URL
      this.apiBaseUrl = `https://${currentHost.replace('3000-', '8000-')}`;
    } else if (currentHost === 'localhost') {
      // Local development
      this.apiBaseUrl = 'http://localhost:8000';
    } else {
      // Production - use relative path without /api prefix
      this.apiBaseUrl = '';
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
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // File input dropzones
    this.setupDropzone('inputFilesDropzone', 'inputFiles', true);
    this.setupDropzone('databaseDropzone', 'databaseFile', false);

    // File selection buttons
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    if (selectFilesBtn) {
      selectFilesBtn.addEventListener('click', () => {
        document.getElementById('inputFiles').click();
      });
    }

    const selectFolderBtn = document.getElementById('selectFolderBtn');
    if (selectFolderBtn) {
      selectFolderBtn.addEventListener('click', () => {
        document.getElementById('inputFolder').click();
      });
    }

    // File input change handlers
    const inputFiles = document.getElementById('inputFiles');
    if (inputFiles) {
      inputFiles.addEventListener('change', (e) => this.handleInputFilesChange(e));
    }

    const inputFolder = document.getElementById('inputFolder');
    if (inputFolder) {
      inputFolder.addEventListener('change', (e) => this.handleFolderChange(e));
    }

    const databaseFile = document.getElementById('databaseFile');
    if (databaseFile) {
      databaseFile.addEventListener('change', (e) => this.handleDatabaseFileChange(e));
    }

    // Novel names input
    const novelNames = document.getElementById('novelNames');
    if (novelNames) {
      novelNames.addEventListener('input', (e) => this.handleNovelNamesChange(e));
    }
  }

  setupDropzone(dropzoneId, inputId, multiple = false) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);

    if (!dropzone || !input) return;

    // Click to select files
    dropzone.addEventListener('click', () => input.click());

    // Drag and drop events
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dropzone-active');
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dropzone-active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dropzone-active');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        if (multiple && files.length > this.maxInputFiles) {
          this.showAlert(`สามารถอัปโหลดได้สูงสุด ${this.maxInputFiles} ไฟล์`, 'error');
          return;
        }
        
        // Update file input
        input.files = files;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
      }
    });
  }

  handleInputFilesChange(event) {
    const files = Array.from(event.target.files);
    this.displaySelectedFiles(files, 'files');
  }

  handleFolderChange(event) {
    const files = Array.from(event.target.files);
    
    console.log('📁 Folder files detected:', files.length);
    
    // Filter only supported file types and log details
    const supportedFiles = files.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop();
      const isSupported = ['txt', 'docx', 'pdf'].includes(ext);
      
      console.log(`📄 File: ${file.name}, Path: ${file.webkitRelativePath}, Supported: ${isSupported}`);
      
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
      this.showAlert(`สามารถอัปโหลดได้สูงสุด ${this.maxInputFiles} ไฟล์ (พบ ${files.length} ไฟล์) - จะใช้ ${this.maxInputFiles} ไฟล์แรก`, 'warning');
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
            <span class="font-medium text-green-800">📁 ${folderName}</span>
          </div>
          <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            ${files.length} ไฟล์
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
      this.showAlert(`✅ เลือกไฟล์จากโฟลเดอร์สำเร็จ: ${files.length} ไฟล์`, 'success');
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
        displayName = `📁 ${pathParts.slice(0, -1).join('/')} / ${pathParts[pathParts.length - 1]}`;
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
      
      const apiUrl = this.apiBaseUrl ? `${this.apiBaseUrl}/api/analyze` : '/api/analyze';
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
        
        setTimeout(() => {
          this.showLoading(false);
          this.displayResults(response.data);
        }, 1000);
      } else {
        throw new Error(response.data.message || 'การวิเคราะห์ล้มเหลว');
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      this.showLoading(false);
      
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

      ${this.generateReportCard(results.report)}
      ${this.generateComparisonTableCard(results.comparison_table)}
      ${this.generateSimilarityMatrixCard(results.similarity_matrix)}
      ${this.generateOverallRankingCard(results.overall_ranking)}
      ${this.generateHeatmapCard(results.heatmap)}
      ${this.generateNetworkCard(results.network)}
    `;
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
        <h3><i class="fas fa-table"></i>ตารางเปรียบเทียบ</h3>
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
        <h3><i class="fas fa-th"></i>เมทริกซ์ความคล้ายคลึง</h3>
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
      const data = rankingData.content ? JSON.parse(rankingData.content) : null;
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
      
      // Generate detailed table
      let detailTable = '';
      if (dbRank.length > 0) {
        const tableRows = dbRank.slice(0, 10).map((doc, index) => {
          // Extract folder and chapter info if available
          const folderName = doc.folder_name || 'N/A';
          const chapterName = doc.chapter_name || doc.db_doc_short || doc.db_doc;
          
          return `
          <tr class="${index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}">
            <td class="px-4 py-3 text-center">
              ${index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
            </td>
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">${chapterName}</div>
              ${folderName !== 'N/A' && folderName !== chapterName ? `
                <div class="text-sm text-gray-500 mt-1">
                  <i class="fas fa-folder-open mr-1"></i>${folderName}
                </div>
              ` : ''}
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                ${doc.genre}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <span class="font-bold text-lg ${doc.best_similarity >= 0.7 ? 'text-green-600' : doc.best_similarity >= 0.5 ? 'text-yellow-600' : 'text-gray-600'}">
                ${Math.round(doc.best_similarity * 100)}%
              </span>
            </td>
          </tr>
        `}).join('');
        
        detailTable = `
          <div class="mt-6">
            <h4 class="font-semibold text-gray-800 mb-3">🏆 Top 10 เอกสารที่คล้ายที่สุด</h4>
            <div class="overflow-x-auto">
              <table class="w-full border border-gray-200 rounded-lg">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">อันดับ</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อเรื่อง / โฟลเดอร์</th>
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
          <h3><i class="fas fa-trophy"></i>การจัดอันดับโดยรวม</h3>
          
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            ${summaryCards}
          </div>
          
          <!-- Analysis Info -->
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
    if (!heatmapData) return '';
    
    const imgSrc = heatmapData.base64 || (heatmapData.url ? (this.apiBaseUrl ? `${this.apiBaseUrl}${heatmapData.url}` : heatmapData.url) : null);
    if (!imgSrc) return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-fire"></i>แผนที่ความร้อนความคล้ายคลึง</h3>
        <div class="text-center">
          <img src="${imgSrc}" alt="Similarity Heatmap" class="result-image mx-auto" onclick="analyzer.openImageModal(this)" style="cursor: pointer;" />
        </div>
        ${heatmapData.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + heatmapData.url : heatmapData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลดรูปภาพ</a>` : ''}
      </div>
    `;
  }

  generateNetworkCard(networkData) {
    if (!networkData) return '';
    
    const imgSrc = networkData.base64 || (networkData.url ? (this.apiBaseUrl ? `${this.apiBaseUrl}${networkData.url}` : networkData.url) : null);
    if (!imgSrc) return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-project-diagram"></i>แผนภูมิเครือข่าย</h3>
        <div class="text-center">
          <img src="${imgSrc}" alt="Network Diagram" class="result-image mx-auto" onclick="analyzer.openImageModal(this)" style="cursor: pointer;" />
        </div>
        ${networkData.url ? `<a href="${this.apiBaseUrl ? this.apiBaseUrl + networkData.url : networkData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลดรูปภาพ</a>` : ''}
      </div>
    `;
  }

  initializeResultInteractions() {
    // Load CSV data for comparison table
    this.loadComparisonTable();
    // Load CSV data for similarity matrix
    this.loadSimilarityMatrix();
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
    const healthUrl = analyzerInstance.apiBaseUrl ? `${analyzerInstance.apiBaseUrl}/api/health` : '/api/health';
    const response = await axios.get(healthUrl);
    console.log('Backend health:', response.data);
  } catch (error) {
    console.warn('Backend not available:', error.message);
  }
});