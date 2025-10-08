# Novel Similarity Analyzer

🔍 **เครื่องมือวิเคราะห์ความคล้ายคลึงของนิยายและเอกสาร**

Full-stack web application สำหรับวิเคราะห์ความคล้ายคลึงระหว่างนิยาย เอกสาร หรือข้อความต่าง ๆ โดยใช้เทคนิค TF-IDF และ Cosine Similarity พร้อมด้วยการรองรับภาษาไทยผ่าน pythainlp

## 🌟 Features ที่ทำงานแล้ว

### 📊 Core Analysis Features
- **วิเคราะห์ความคล้ายคลึง**: ใช้ TF-IDF Vectorization และ Cosine Similarity
- **รองรับหลายไฟล์**: อัปโหลดได้สูงสุด 5 ไฟล์พร้อมกัน
- **รองรับหลาย format**: `.txt`, `.docx`, `.pdf`
- **✅ Folder Upload**: รองรับการอัปโหลดโฟลเดอร์พร้อมการเก็บโครงสร้างไฟล์
- **Direct text input**: สามารถ copy-paste ข้อความเข้ามาได้โดยตรง
- **Database comparison**: เปรียบเทียบกับฐานข้อมูลเอกสารที่จัดเก็บตาม genre

### 🇹🇭 Thai Language Support
- **Auto language detection**: ตรวจจับภาษาอัตโนมัติ
- **Thai text preprocessing**: ใช้ pythainlp สำหรับตัดคำและกรอง stopwords
- **Enhanced tokenization**: รองรับ n-gram สำหรับภาษาไทย

### 📈 Analysis Results
- **Comparison Table**: ตารางเปรียบเทียบแสดงผลลัพธ์การวิเคราะห์
- **Similarity Matrix**: เมทริกซ์แสดงค่าความคล้ายคลึงระหว่างเอกสาร
- **Overall Ranking**: การจัดอันดับเอกสารและ genre โดยรวม
- **Heatmap Visualization**: แผนที่ความร้อนแสดงความคล้ายคลึง
- **Network Graph**: กราฟเครือข่ายแสดงความสัมพันธ์
- **Detailed Report**: รายงานสรุปผลการวิเคราะห์

## 🏗️ Architecture

### Backend (FastAPI)
- **API Server**: FastAPI พร้อม automatic documentation
- **File Processing**: แปลงไฟล์ `.docx`, `.pdf` เป็น `.txt`
- **Analysis Engine**: Enhanced pipeline ที่รองรับภาษาไทย
- **Session Management**: จัดการไฟล์ชั่วคราวแยกตาม session
- **Result Export**: ดาวน์โหลดผลลัพธ์เป็น ZIP file

### Frontend (Hono + Cloudflare Pages)
- **Modern UI**: ใช้ TailwindCSS และ FontAwesome
- **Drag & Drop**: อัปโหลดไฟล์แบบลากวาง
- **Real-time Progress**: แสดงความคืบหน้าการวิเคราะห์
- **Interactive Results**: แสดงผลลัพธ์แบบโต้ตอบได้
- **Responsive Design**: รองรับอุปกรณ์ทุกขนาด

## 📋 API Endpoints

### Currently Functional URIs

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/` | API health check | - |
| `GET` | `/api/health` | Extended health check | - |
| `POST` | `/api/analyze` | Main analysis endpoint | `input_files`, `database_file`, `k_neighbors`, `dup_threshold`, `similar_threshold`, `text_input` |
| `GET` | `/api/download/{session_id}` | Download results as ZIP | `session_id` |
| `DELETE` | `/api/cleanup/{session_id}` | Clean up session files | `session_id` |
| `GET` | `/files/**` | Static file serving | File path |

### API Request Example
```bash
curl -X POST "http://localhost:8000/api/analyze" \
  -F "input_files=@document1.txt" \
  -F "input_files=@document2.txt" \
  -F "database_file=@database.zip" \
  -F "k_neighbors=3" \
  -F "dup_threshold=0.90" \
  -F "similar_threshold=0.60" \
  -F "text_input=Sample text for analysis"
```

## 🗄️ Data Architecture

### Data Models
- **Input Documents**: ไฟล์ที่ผู้ใช้ต้องการวิเคราะห์
- **Database Documents**: ฐานข้อมูลเอกสารจัดเก็บตาม genre
- **Similarity Scores**: ค่าความคล้ายคลึงระหว่าง 0.0-1.0
- **Analysis Results**: ผลลัพธ์รวม 6 ไฟล์

### Storage Services
- **Local File System**: เก็บไฟล์ชั่วคราวใน `temp/` directory
- **Session-based Storage**: แยกไฟล์ตาม session ID
- **CSV/JSON Export**: ส่งออกผลลัพธ์ในรูปแบบมาตรฐาน

### Data Flow
1. **Upload** → รับไฟล์จาก frontend
2. **Convert** → แปลงเป็น `.txt` format
3. **Preprocess** → ทำความสะอาดข้อความ (รองรับภาษาไทย)
4. **Vectorize** → สร้าง TF-IDF vectors
5. **Analyze** → คำนวณ cosine similarity
6. **Export** → สร้างผลลัพธ์ 6 ไฟล์

## 📦 Installation & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd webapp
```

### 2. Backend Setup (FastAPI)
```bash
cd backend

# Option 1: Use startup script (Recommended)
./start.sh

# Option 2: Manual setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup (Hono)
```bash
cd frontend

# Option 1: Use startup script (Recommended)
./start.sh

# Option 2: Manual setup
npm install
npm run build
pm2 start ecosystem.config.cjs
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🎯 User Guide

### 1. เตรียมข้อมูล
- **Input Files**: ไฟล์ที่ต้องการวิเคราะห์ (`.txt`, `.docx`, `.pdf`)
- **Database**: ไฟล์ `.zip` ที่มีโครงสร้าง:
  ```
  database.zip
  ├── genre1/
  │   ├── document1.txt
  │   └── document2.txt
  └── genre2/
      ├── document3.txt
      └── document4.txt
  ```

### 2. การใช้งาน
1. เปิด http://localhost:3000
2. อัปโหลดไฟล์ input (หรือใส่ข้อความโดยตรง)
3. อัปโหลดไฟล์ database (.zip)
4. ตั้งค่าพารามิเตอร์ (K-neighbors, thresholds)
5. กดปุ่ม "เริ่มวิเคราะห์"
6. รอผลลัพธ์และดาวน์โหลดไฟล์

### 3. เข้าใจผลลัพธ์
- **Similarity Score 0.9-1.0**: เอกสารซ้ำซ้อน/เหมือนกันมาก
- **Similarity Score 0.6-0.9**: เอกสารมีความคล้ายคลึงสูง
- **Similarity Score 0.0-0.6**: เอกสารแตกต่างกัน

## 🚀 Deployment Status

### Current Status: ✅ Development Ready
- **Platform**: Local Development Environment
- **Backend**: Running on port 8000
- **Frontend**: Running on port 3000
- **Tech Stack**: FastAPI + Hono + TailwindCSS + pythainlp

### Production Deployment Options
1. **Backend**: Deploy to cloud services (AWS, GCP, Azure)
2. **Frontend**: Deploy to Cloudflare Pages
3. **Database**: Use cloud storage for document database

## 🔧 Features ยังไม่ได้ Implement

### Future Enhancements
- [ ] **Advanced ML Models**: Sentence-BERT embeddings
- [ ] **User Authentication**: Login/register system  
- [ ] **Document Management**: เก็บเอกสารถาวร
- [ ] **Batch Processing**: วิเคราะห์เอกสารจำนวนมาก
- [ ] **Real-time Analysis**: WebSocket สำหรับ real-time updates
- [ ] **Export Options**: PDF reports, Excel exports
- [ ] **Language Models**: GPT integration สำหรับ semantic analysis
- [ ] **Collaboration**: แชร์ผลลัพธ์ระหว่างผู้ใช้

### Technical Improvements
- [ ] **Caching**: Redis สำหรับ cache results
- [ ] **Database**: PostgreSQL สำหรับ persistent storage
- [ ] **Message Queue**: Celery สำหรับ background tasks
- [ ] **Monitoring**: Logging และ monitoring system
- [ ] **Testing**: Unit tests และ integration tests

## 💡 Recommended Next Steps

### For Development
1. **Add Unit Tests**: สร้าง test cases สำหรับ core functions
2. **Implement Caching**: เพิ่ม Redis เพื่อเร่งความเร็ว
3. **Error Handling**: ปรับปรุง error handling ให้ comprehensive
4. **Performance Optimization**: ปรับปรุง algorithm สำหรับเอกสารขนาดใหญ่

### For Production
1. **Docker Containers**: สร้าง Docker images
2. **CI/CD Pipeline**: GitHub Actions สำหรับ automatic deployment
3. **Security**: เพิ่ม authentication และ rate limiting
4. **Monitoring**: Setup monitoring และ alerting

### For Users
1. **Documentation**: สร้าง user manual และ video tutorials
2. **Examples**: เตรียมตัวอย่างไฟล์สำหรับทดสอบ
3. **FAQ**: รวบรวมคำถามที่พบบ่อย

## 📊 Project Statistics

- **Total Files**: 15+ source files
- **Lines of Code**: 1000+ lines
- **Languages**: Python, TypeScript, CSS
- **Dependencies**: 15+ packages
- **Features**: 20+ implemented features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

สำหรับการสนับสนุนและคำถาม:
- 📧 Email: [your-email]
- 🐛 Issues: GitHub Issues
- 📚 Documentation: `/docs` endpoint

---

**Created with ❤️ using FastAPI, Hono, and pythainlp**

*Last Updated: September 11, 2024*