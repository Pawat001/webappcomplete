import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

const app = new Hono()

// Enable CORS for API communication
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// Use JSX renderer
app.use(renderer)

// Main application page
app.get('/', (c) => {
  return c.render(
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Novel Similarity Analyzer - เครื่องมือวิเคราะห์ความคล้ายคลึงของนิยาย</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="/static/styles.css" rel="stylesheet" />
      </head>
      <body class="bg-gray-50 min-h-screen">
        {/* Header */}
        <header class="bg-white shadow-sm border-b">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="bg-blue-600 rounded-lg p-2">
                  <i class="fas fa-book-open text-white text-xl"></i>
                </div>
                <div>
                  <h1 class="text-2xl font-bold text-gray-900">Novel Similarity Analyzer</h1>
                  <p class="text-sm text-gray-600">เครื่องมือวิเคราะห์ความคล้ายคลึงของนิยายและเอกสาร</p>
                </div>
              </div>
              <div class="text-right">
                <div class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  <i class="fas fa-circle text-green-500 mr-1"></i>
                  Ready
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div id="app">
            {/* Upload Section */}
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">
                <i class="fas fa-upload mr-2 text-blue-600"></i>
                อัปโหลดไฟล์สำหรับวิเคราะห์
              </h2>
              
              <form id="analysisForm" enctype="multipart/form-data">
                {/* Input Files Section */}
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    ไฟล์ที่ต้องการวิเคราะห์ (สูงสุด 5 ไฟล์)
                  </label>
                  <div id="inputFilesDropzone" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                    <p class="text-gray-600 mb-2">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                    <p class="text-sm text-gray-500">รองรับ .txt, .docx, .pdf (สูงสุด 5 ไฟล์)</p>
                    <input type="file" id="inputFiles" name="input_files" multiple accept=".txt,.docx,.pdf" class="hidden" />
                  </div>
                  <div id="inputFilesList" class="mt-3"></div>
                </div>

                {/* Direct Text Input */}
                <div class="mb-6">
                  <label for="textInput" class="block text-sm font-medium text-gray-700 mb-2">
                    หรือใส่ข้อความโดยตรง
                  </label>
                  <textarea 
                    id="textInput" 
                    name="text_input" 
                    rows="4" 
                    placeholder="คัดลอกและวางข้อความที่ต้องการวิเคราะห์ที่นี่..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>

                {/* Database File Section */}
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    ไฟล์ฐานข้อมูล (.zip)
                  </label>
                  <div id="databaseDropzone" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors cursor-pointer">
                    <i class="fas fa-database text-4xl text-gray-400 mb-2"></i>
                    <p class="text-gray-600 mb-2">ลากไฟล์ .zip ที่มีเอกสารฐานข้อมูลมาวางที่นี่</p>
                    <p class="text-sm text-gray-500">โครงสร้าง: database.zip/ประเภท/*.txt</p>
                    <input type="file" id="databaseFile" name="database_file" accept=".zip" class="hidden" />
                  </div>
                  <div id="databaseFileInfo" class="mt-3"></div>
                </div>

                {/* Parameters Section */}
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label for="kNeighbors" class="block text-sm font-medium text-gray-700 mb-1">
                      จำนวนเอกสารที่คล้าย (K-Neighbors)
                    </label>
                    <input 
                      type="number" 
                      id="kNeighbors" 
                      name="k_neighbors" 
                      min="1" 
                      max="10" 
                      value="3"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label for="dupThreshold" class="block text-sm font-medium text-gray-700 mb-1">
                      ค่าเกณฑ์ซ้ำซ้อน (0.0-1.0)
                    </label>
                    <input 
                      type="number" 
                      id="dupThreshold" 
                      name="dup_threshold" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value="0.90"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label for="similarThreshold" class="block text-sm font-medium text-gray-700 mb-1">
                      ค่าเกณฑ์คล้ายคลึง (0.0-1.0)
                    </label>
                    <input 
                      type="number" 
                      id="similarThreshold" 
                      name="similar_threshold" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value="0.60"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div class="text-center">
                  <button 
                    type="submit" 
                    id="analyzeBtn"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors inline-flex items-center"
                  >
                    <i class="fas fa-chart-line mr-2"></i>
                    เริ่มวิเคราะห์
                  </button>
                </div>
              </form>
            </div>

            {/* Loading Section */}
            <div id="loadingSection" class="bg-white rounded-lg shadow-md p-6 mb-8 hidden">
              <div class="text-center">
                <div class="inline-flex items-center">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                  <span class="text-lg">กำลังประมวลผล...</span>
                </div>
                <div class="mt-4 bg-gray-200 rounded-full h-2">
                  <div id="progressBar" class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
                <p id="loadingStatus" class="text-sm text-gray-600 mt-2">กำลังเตรียมไฟล์...</p>
              </div>
            </div>

            {/* Results Section */}
            <div id="resultsSection" class="hidden">
              {/* Results content will be dynamically generated here */}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer class="bg-white border-t mt-12">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="text-center text-gray-600">
              <p>&copy; 2024 Novel Similarity Analyzer. สร้างด้วย FastAPI + Hono + Cloudflare Pages</p>
            </div>
          </div>
        </footer>

        {/* Scripts */}
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})

// API proxy endpoints (if needed for CORS)
app.get('/api/health', async (c) => {
  try {
    // In production, this would proxy to your FastAPI backend
    const backendUrl = 'http://localhost:8000' // Change to your backend URL
    const response = await fetch(`${backendUrl}/api/health`)
    const data = await response.json()
    return c.json(data)
  } catch (error) {
    return c.json({ status: 'backend_unavailable', message: 'Backend service is not available' }, 503)
  }
})

export default app