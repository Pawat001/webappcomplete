/**
 * Novel Similarity Analyzer - Frontend JavaScript
 * Handles file uploads, API communication, and results display
 */

class NovelSimilarityAnalyzer {
  constructor() {
    this.apiBaseUrl = 'http://localhost:8000'; // Change to your FastAPI backend URL
    this.currentSessionId = null;
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

    // File input change handlers
    const inputFiles = document.getElementById('inputFiles');
    if (inputFiles) {
      inputFiles.addEventListener('change', (e) => this.handleInputFilesChange(e));
    }

    const databaseFile = document.getElementById('databaseFile');
    if (databaseFile) {
      databaseFile.addEventListener('change', (e) => this.handleDatabaseFileChange(e));
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
    const container = document.getElementById('inputFilesList');
    
    if (!container) return;

    container.innerHTML = '';

    if (files.length === 0) return;

    if (files.length > this.maxInputFiles) {
      this.showAlert(`สามารถอัปโหลดได้สูงสุด ${this.maxInputFiles} ไฟล์`, 'error');
      return;
    }

    files.forEach((file, index) => {
      const fileItem = this.createFileItem(file, index);
      container.appendChild(fileItem);
    });
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
    
    const sizeText = this.formatFileSize(file.size);
    const typeIcon = this.getFileTypeIcon(file.name);
    
    div.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="${typeIcon} text-blue-600"></i>
        <div>
          <p class="font-medium text-gray-900">${file.name}</p>
          <p class="text-sm text-gray-600">${sizeText}</p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-green-600 text-sm">
          <i class="fas fa-check-circle"></i> Ready
        </span>
        <button type="button" class="text-red-600 hover:text-red-800" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    return div;
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
      
      // Add input files
      const inputFiles = document.getElementById('inputFiles').files;
      for (let i = 0; i < inputFiles.length; i++) {
        formData.append('input_files', inputFiles[i]);
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
      
      // Add parameters
      formData.append('k_neighbors', document.getElementById('kNeighbors').value);
      formData.append('dup_threshold', document.getElementById('dupThreshold').value);
      formData.append('similar_threshold', document.getElementById('similarThreshold').value);
      
      // Send request
      this.updateLoadingStatus('กำลังส่งข้อมูลไปยังเซิร์ฟเวอร์...');
      
      const response = await axios.post(`${this.apiBaseUrl}/api/analyze`, formData, {
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
      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showAlert(errorMessage, 'error');
    }
  }

  validateForm() {
    const inputFiles = document.getElementById('inputFiles').files;
    const databaseFile = document.getElementById('databaseFile').files[0];
    const textInput = document.getElementById('textInput').value.trim();
    
    if (inputFiles.length === 0 && !textInput) {
      this.showAlert('กรุณาเลือกไฟล์สำหรับวิเคราะห์ หรือใส่ข้อความโดยตรง', 'error');
      return false;
    }
    
    if (!databaseFile) {
      this.showAlert('กรุณาเลือกไฟล์ฐานข้อมูล (.zip)', 'error');
      return false;
    }
    
    if (!databaseFile.name.endsWith('.zip')) {
      this.showAlert('ไฟล์ฐานข้อมูลต้องเป็นไฟล์ .zip', 'error');
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
        ${reportData.url ? `<a href="${reportData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลดรายงาน</a>` : ''}
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
        ${tableData.url ? `<a href="${tableData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด CSV</a>` : ''}
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
        ${matrixData.url ? `<a href="${matrixData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด CSV</a>` : ''}
      </div>
    `;
  }

  generateOverallRankingCard(rankingData) {
    if (!rankingData) return '';
    
    const content = rankingData.content ? JSON.stringify(JSON.parse(rankingData.content), null, 2) : 'ไม่มีข้อมูลการจัดอันดับ';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-trophy"></i>การจัดอันดับโดยรวม</h3>
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg">
          <pre class="json-viewer custom-scrollbar">${content}</pre>
        </div>
        ${rankingData.url ? `<a href="${rankingData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลด JSON</a>` : ''}
      </div>
    `;
  }

  generateHeatmapCard(heatmapData) {
    if (!heatmapData) return '';
    
    const imgSrc = heatmapData.base64 || heatmapData.url;
    if (!imgSrc) return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-fire"></i>แผนที่ความร้อนความคล้ายคลึง</h3>
        <div class="text-center">
          <img src="${imgSrc}" alt="Similarity Heatmap" class="result-image mx-auto" onclick="analyzer.openImageModal(this)" style="cursor: pointer;" />
        </div>
        ${heatmapData.url ? `<a href="${heatmapData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลดรูปภาพ</a>` : ''}
      </div>
    `;
  }

  generateNetworkCard(networkData) {
    if (!networkData) return '';
    
    const imgSrc = networkData.base64 || networkData.url;
    if (!imgSrc) return '';
    
    return `
      <div class="result-card">
        <h3><i class="fas fa-project-diagram"></i>แผนภูมิเครือข่าย</h3>
        <div class="text-center">
          <img src="${imgSrc}" alt="Network Diagram" class="result-image mx-auto" onclick="analyzer.openImageModal(this)" style="cursor: pointer;" />
        </div>
        ${networkData.url ? `<a href="${networkData.url}" download class="download-btn mt-4"><i class="fas fa-download"></i>ดาวน์โหลดรูปภาพ</a>` : ''}
      </div>
    `;
  }

  initializeResultInteractions() {
    // Load CSV data for tables (if needed)
    // This would be implemented based on your CSV parsing needs
  }

  async downloadResults() {
    if (!this.currentSessionId) {
      this.showAlert('ไม่มีผลลัพธ์สำหรับดาวน์โหลด', 'error');
      return;
    }
    
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/download/${this.currentSessionId}`, {
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

// Health check on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await axios.get('http://localhost:8000/api/health');
    console.log('Backend health:', response.data);
  } catch (error) {
    console.warn('Backend not available:', error.message);
  }
});