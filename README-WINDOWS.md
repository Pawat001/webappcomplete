# Novel Similarity Analyzer - Windows Installation Guide

## ระบบที่รองรับ
- Windows 10/11
- Node.js 18.12.0+ 
- Python 3.8+

## การติดตั้งอย่างรวดเร็ว

### 1. เตรียมระบบ

**ติดตั้ง Node.js:**
- ดาวน์โหลดจาก: https://nodejs.org/
- เลือก LTS version (แนะนำ v18.17.0+)

**ติดตั้ง Python:**
- ดาวน์โหลดจาก: https://www.python.org/downloads/
- เลือก Python 3.8+ 
- ☑️ เช็ค "Add Python to PATH" ขณะติดตั้ง

### 2. เริ่มต้น Backend

```cmd
cd backend
start-backend-windows.bat
```

Backend จะเริ่มที่: http://localhost:8000

### 3. เริ่มต้น Frontend

เปิด Command Prompt หรือ PowerShell ใหม่:

```cmd
cd frontend
setup-windows.bat
```

หลังติดตั้งเสร็จ:

```cmd
start-windows.bat
```

Frontend จะเริ่มที่: http://localhost:3000

## การใช้งาน

1. เปิด http://localhost:3000
2. อัปโหลดไฟล์หรือใส่ข้อความที่ต้องการวิเคราะห์
3. เลือกไฟล์ฐานข้อมูล (.zip)
4. ตั้งชื่อนิยายได้ (ไม่บังคับ)
5. กดวิเคราะห์

## ฟีเจอร์หลัก

✅ **วิเคราะห์ความคล้ายคลึงของข้อความ**
- รองรับ .txt, .docx, .pdf
- วิเคราะห์ได้หลายไฟล์พร้อมกัน
- รองรับการอัปโหลดโฟลเดอร์

✅ **ตั้งชื่อนิยาย/เอกสาร**
- ระบุชื่อเรื่องเพื่อให้ง่ายต่อการติดตาม
- แสดงชื่อโดดเด่นในผลลัพธ์

✅ **ผลลัพธ์ครอบคลุม**
- รายงานสรุป
- ตารางเปรียบเทียบ  
- แผนที่ความร้อน
- กราฟเครือข่าย
- ดาวน์โหลดไฟล์แต่ละไฟล์หรือรวมเป็น ZIP

✅ **การตั้งค่าขั้นสูง**
- จำนวนเอกสารที่คล้าย (K-Neighbors)
- เกณฑ์ความคล้าย/ซ้ำกัน
- การวิเคราะห์ตามประเภท

## แก้ไขปัญหา

**ปัญหา: npm WARN EBADENGINE**
- ใช้ `setup-windows.bat` แทน `npm install` โดยตรง

**ปัญหา: Python not found**
- ติดตั้ง Python จาก python.org
- เช็ค "Add to PATH" ขณะติดตั้ง
- รีสตาร์ท Command Prompt

**ปัญหา: Port ถูกใช้งาน**
- Frontend: เปลี่ยนพอร์ตใน `vite.config.ts`
- Backend: เปลี่ยนพอร์ตใน `main.py` (บรรทัดสุดท้าย)

**ปัญหา: การอัปโหลดไฟล์ใหญ่**
- ขนาดไฟล์สูงสุด: 10MB ต่อไฟล์
- ฐานข้อมูล: 50MB

## โครงสร้างโปรเจกต์

```
webapp/
├── backend/
│   ├── main.py                 # FastAPI server
│   ├── enhanced_pipeline.py    # ระบบวิเคราะห์
│   ├── requirements-windows.txt
│   └── start-backend-windows.bat
├── frontend/
│   ├── src/index.tsx          # Hono app
│   ├── public/static/app.js   # Frontend logic
│   ├── package-windows.json   # Dependencies
│   ├── vite-windows.config.ts # Vite config
│   ├── setup-windows.bat      # ติดตั้ง
│   └── start-windows.bat      # เริ่มต้น
└── sample_data/
    └── database_sample.zip    # ข้อมูลทดสอบ
```

## เทคโนโลยีที่ใช้

- **Backend**: FastAPI + Python
- **Frontend**: Hono + TypeScript
- **ML**: scikit-learn, TF-IDF
- **UI**: Tailwind CSS + Font Awesome

---

🎯 **พร้อมใช้งาน!** เพียงรัน 2 ไฟล์ .bat และระบบจะทำงานครบถ้วน