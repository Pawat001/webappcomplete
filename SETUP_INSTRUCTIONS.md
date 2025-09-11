# 🚀 Novel Similarity Analyzer - Setup Instructions

คำแนะนำการติดตั้งและใช้งาน Novel Similarity Analyzer แบบ step-by-step

## 📋 Prerequisites

### System Requirements
- **Python**: 3.8+ (สำหรับ backend)
- **Node.js**: 18+ (สำหรับ frontend)
- **RAM**: อย่างน้อย 4GB
- **Storage**: อย่างน้อย 2GB ว่าง

### Required Tools
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Check Node.js version  
node --version     # Should be 18+

# Install PM2 globally (if not already installed)
npm install -g pm2
```

## 📁 Project Structure

```
webapp/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main API server
│   ├── enhanced_pipeline.py # Enhanced analysis pipeline  
│   ├── novel_similarity_pipeline.py # Original pipeline
│   ├── requirements.txt     # Python dependencies
│   └── start.sh            # Backend startup script
├── frontend/               # Hono frontend
│   ├── src/index.tsx       # Main frontend app
│   ├── public/static/      # Static assets
│   ├── package.json        # Node.js dependencies
│   ├── ecosystem.config.cjs # PM2 configuration
│   └── start.sh           # Frontend startup script
└── README.md              # Main documentation
```

## 🔧 Installation Steps

### Step 1: Clone/Download Project

```bash
# If you have the project files
cd /path/to/webapp

# Or download from repository
git clone <repository-url>
cd webapp
```

### Step 2: Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Method 1: Use automated script (Recommended)
./start.sh

# Method 2: Manual setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download Thai language data
python -c "import pythainlp; pythainlp.corpus.download('thai2fit_wv')"

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Frontend Setup (Hono)

```bash
# Open new terminal and navigate to frontend
cd frontend

# Method 1: Use automated script (Recommended)  
./start.sh

# Method 2: Manual setup
npm install
npm run build
pm2 start ecosystem.config.cjs
```

### Step 4: Verify Installation

```bash
# Test backend
curl http://localhost:8000/api/health

# Test frontend
curl http://localhost:3000

# Check PM2 status
pm2 list
```

## 🌐 Access URLs

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000  
- **API Documentation**: http://localhost:8000/docs
- **Redoc Documentation**: http://localhost:8000/redoc

## 📊 Usage Guide

### 1. Prepare Your Data

#### Input Files (ไฟล์ที่ต้องการวิเคราะห์)
- Format: `.txt`, `.docx`, `.pdf`
- Amount: 1-5 ไฟล์
- Size: แนะนำไม่เกิน 10MB ต่อไฟล์

#### Database Files (ฐานข้อมูลสำหรับเปรียบเทียบ)
สร้างไฟล์ `.zip` ที่มีโครงสร้างดังนี้:

```
database.zip
├── นิยายรัก/
│   ├── นิยายรัก1.txt
│   ├── นิยายรัก2.txt
│   └── นิยายรัก3.txt
├── นิยายแฟนตาซี/
│   ├── แฟนตาซี1.txt
│   └── แฟนตาซี2.txt
└── วิทยาศาสตร์/
    ├── sci1.txt
    └── sci2.txt
```

### 2. Using the Web Interface

1. **เปิด Browser** ไปที่ http://localhost:3000

2. **อัปโหลดไฟล์ Input**:
   - ลากไฟล์มาวางใน dropzone หรือ
   - คลิกเพื่อเลือกไฟล์ หรือ
   - ใส่ข้อความโดยตรงใน textarea

3. **อัปโหลดไฟล์ Database**:
   - ลากไฟล์ `.zip` มาวางใน database dropzone

4. **ตั้งค่าพารามิเตอร์**:
   - **K-Neighbors**: จำนวนเอกสารที่คล้ายที่จะแสดง (แนะนำ 3-5)
   - **Duplicate Threshold**: เกณฑ์การซ้ำซ้อน (แนะนำ 0.90)
   - **Similar Threshold**: เกณฑ์ความคล้าย (แนะนำ 0.60)

5. **เริ่มวิเคราะห์**: กดปุ่ม "เริ่มวิเคราะห์"

6. **ดูผลลัพธ์**: รอผลลัพธ์แล้วดาวน์โหลดไฟล์

### 3. API Usage Example

```bash
# Health check
curl http://localhost:8000/api/health

# Analysis request
curl -X POST "http://localhost:8000/api/analyze" \
  -F "input_files=@sample1.txt" \
  -F "input_files=@sample2.txt" \
  -F "database_file=@database.zip" \
  -F "k_neighbors=3" \
  -F "dup_threshold=0.90" \
  -F "similar_threshold=0.60"

# Download results
curl "http://localhost:8000/api/download/{session_id}" -o results.zip
```

## 📈 Understanding Results

### Output Files (ผลลัพธ์ที่ได้)
1. **comparison_table.csv**: ตารางเปรียบเทียบรายละเอียด
2. **similarity_matrix.csv**: เมทริกซ์ค่าความคล้าย
3. **overall_ranking.json**: การจัดอันดับโดยรวม
4. **similarity_heatmap.png**: แผนที่ความร้อน
5. **network_top_matches.png**: กราฟเครือข่าย
6. **report.txt**: รายงานสรุป

### Similarity Scores
- **0.90-1.00**: ซ้ำซ้อน/เหมือนกันมาก
- **0.60-0.90**: คล้ายคลึงกันมาก  
- **0.30-0.60**: คล้ายคลึงปานกลาง
- **0.00-0.30**: แตกต่างกัน

## 🔧 Troubleshooting

### Common Issues

#### Backend Issues

**1. Port 8000 already in use**
```bash
# Kill process on port 8000
fuser -k 8000/tcp
# or
lsof -ti:8000 | xargs kill
```

**2. Python dependencies error**
```bash
# Upgrade pip
python3 -m pip install --upgrade pip

# Install with specific Python version
python3.8 -m pip install -r requirements.txt
```

**3. pythainlp installation issues**
```bash
# Manual installation
pip install pythainlp==4.0.2
python -c "import pythainlp; pythainlp.corpus.download('thai2fit_wv')"
```

#### Frontend Issues

**1. Port 3000 already in use**
```bash
# Kill process on port 3000
fuser -k 3000/tcp
pkill -f "wrangler pages dev"

# Or use PM2
pm2 delete all
```

**2. Node.js version issues**
```bash
# Use Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**3. Build failures**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Performance Issues

**1. Slow analysis**
- ลดขนาดไฟล์ input
- ลดจำนวนไฟล์ใน database
- ปรับพารามิเตอร์ `max_files_per_genre`

**2. Memory issues**
- เพิ่ม RAM หรือใช้ swap
- ประมวลผลทีละส่วน
- ลด `max_features` ใน vectorizer

## 🛠️ Development Mode

### For Developers

```bash
# Backend development
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend development  
cd frontend
npm run dev  # Vite dev server

# Watch logs
pm2 logs novel-analyzer-frontend --lines 50
```

### Environment Variables

Backend (`.env` file):
```bash
# Optional configurations
MAX_FILE_SIZE=50MB
SESSION_TIMEOUT=3600
TEMP_DIR=./temp
```

## 📞 Support & Help

### Log Files
```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend logs (PM2)
pm2 logs novel-analyzer-frontend

# System logs
journalctl -u novel-analyzer -f
```

### Getting Help
1. Check logs for error messages
2. Verify all dependencies are installed
3. Ensure ports are not blocked by firewall
4. Try restarting both services

### Contact Information
- 📧 **Email**: [support-email]
- 🐛 **Bug Reports**: [GitHub Issues]
- 📚 **Documentation**: http://localhost:8000/docs

---

**Happy Analyzing! 🎉**