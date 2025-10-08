# 📚 Novel Similarity Analyzer - คู่มือการใช้งานแบบสมบูรณ์

## ✅ สถานะระบบ: **พร้อมใช้งาน 100%**

```
🔍 Backend API: ✅ HEALTHY & TESTED
🎨 Frontend Web: ✅ ONLINE & FUNCTIONAL  
📊 Analysis Engine: ✅ WORKING & VERIFIED
📂 Sample Data: ✅ READY TO USE
🌐 Public Access: ✅ AVAILABLE 24/7
```

---

## 🌐 **URLs การเข้าใช้งาน**

### 🎯 **หลัก - Frontend Web Interface**
**🔗 https://3000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev**
- ✅ Web interface ที่ใช้งานง่าย
- ✅ Drag & drop อัปโหลดไฟล์
- ✅ แสดงผลลัพธ์แบบ interactive
- ✅ ดาวน์โหลด ZIP ผลลัพธ์

### 🔧 **API สำหรับนักพัฒนา**
**🔗 https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev**
- ✅ RESTful API endpoints
- ✅ Automatic documentation: `/docs`
- ✅ JSON response format
- ✅ Session-based file management

---

## 🚀 **3 วิธีการใช้งาน**

### **Method 1: 🖥️ Web Interface (แนะนำสำหรับทุกคน)**

#### **Step 1: เข้าเว็บไซต์**
1. เปิดเบราว์เซอร์ (Chrome, Firefox, Safari, Edge)
2. ไปที่: **https://3000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev**
3. รอหน้าเว็บโหลดเสร็จ (ประมาณ 3-5 วินาที)

#### **Step 2: เตรียมข้อมูล**

**📄 ไฟล์ที่ต้องการวิเคราะห์ (Input):**
- **รูปแบบที่รองรับ**: `.txt`, `.docx`, `.pdf`
- **จำนวน**: 1-5 ไฟล์
- **ขนาด**: แนะนำ < 10MB ต่อไฟล์
- **ทางเลือก**: ใส่ข้อความโดยตรงในช่อง textarea

**🗄️ ฐานข้อมูลสำหรับเปรียบเทียบ (Database):**
- **รูปแบบ**: ไฟล์ `.zip` เท่านั้น
- **โครงสร้างภายใน**:
```
database.zip
├── ประเภท1/          # เช่น "นิยายรัก"
│   ├── เอกสาร1.txt
│   ├── เอกสาร2.txt
│   └── เอกสาร3.txt
├── ประเภท2/          # เช่น "นิยายแฟนตาซี"  
│   ├── เอกสาร4.txt
│   └── เอกสาร5.txt
└── ประเภท3/          # เช่น "นิยายวิทยาศาสตร์"
    └── เอกสาร6.txt
```

#### **Step 3: อัปโหลดไฟล์**

**📤 วิธีที่ 1 - อัปโหลดไฟล์:**
1. **Input Files**: ลากไฟล์มาวางในกล่อง dropzone หรือคลิกเพื่อเลือก
2. **Database File**: ลากไฟล์ .zip มาวางในกล่อง database dropzone

**✍️ วิธีที่ 2 - ใส่ข้อความโดยตรง:**
1. ใส่ข้อความในช่อง "หรือใส่ข้อความโดยตรง"
2. อัปโหลดไฟล์ database ปกติ

#### **Step 4: ตั้งค่าพารามิเตอร์**
- **K-Neighbors (3-5)**: จำนวนเอกสารที่คล้ายที่จะแสดง
- **Duplicate Threshold (0.85-0.95)**: เกณฑ์การจัดเป็น "ซ้ำซ้อน"
- **Similar Threshold (0.50-0.70)**: เกณฑ์การจัดเป็น "คล้ายคลึง"

#### **Step 5: วิเคราะห์และรับผลลัพธ์**
1. กดปุ่ม **"เริ่มวิเคราะห์"**
2. รอ progress bar (1-30 วินาที ขึ้นอยู่กับขนาดไฟล์)
3. ดูผลลัพธ์ที่แสดงบนหน้าเว็บ
4. กดปุ่ม **"ดาวน์โหลดผลลัพธ์"** เพื่อได้ไฟล์ ZIP

---

### **Method 2: 🧪 ทดสอบด้วย Sample Data (เริ่มต้นง่าย)**

#### **ใช้ข้อมูลตัวอย่างที่เตรียมไว้:**

**🎯 วิธีที่เร็วที่สุด - Text Input:**
1. เข้า: https://3000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev
2. **ไม่ต้องอัปโหลดไฟล์ input** - ใช้ text box แทน
3. **ใส่ข้อความนี้**:
```
เรื่องราวความรักที่งดงาม ระหว่างหนุ่มสาวที่พบกันในวันฝนตก 
ความรักของพวกเขาเติบโตขึ้นเรื่อยๆ แม้จะมีอุปสรรคมากมาย 
แต่ในท้ายที่สุดความรักก็ชนะทุกสิ่ง พวกเขาได้อยู่ร่วมกันอย่างมีความสุข
```

4. **อัปโหลด database**: ใช้ไฟล์ `sample_data/database_sample.zip` (ดาวน์โหลดจากโปรเจ็กต์)
5. กดปุ่ม **"เริ่มวิเคราะห์"**

**🎯 ผลลัพธ์ที่คาดหวัง:**
- **Most Similar Genre**: `romance` (นิยายรัก)  
- **Similarity Score**: 0.4-0.8 (คล้ายคลึงสูง)
- **Language Detected**: Thai
- **Processing Time**: < 5 วินาทีัย

---

### **Method 3: 🔧 API สำหรับนักพัฒนา**

#### **Endpoint หลัก**
```
POST https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev/api/analyze
```

#### **Request Parameters**
```bash
# Method 1: With files
curl -X POST "https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev/api/analyze" \
  -F "input_files=@document1.txt" \
  -F "input_files=@document2.pdf" \
  -F "database_file=@my_database.zip" \
  -F "k_neighbors=3" \
  -F "dup_threshold=0.90" \
  -F "similar_threshold=0.60"

# Method 2: Text-only (ไม่ต้องมีไฟล์ input)
curl -X POST "https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev/api/analyze" \
  -F "database_file=@my_database.zip" \
  -F "k_neighbors=3" \
  -F "dup_threshold=0.90" \
  -F "similar_threshold=0.60" \
  -F "text_input=ข้อความที่ต้องการวิเคราะห์ความคล้ายคลึง..."
```

#### **Response Format**
```json
{
  "status": "success",
  "message": "Analysis completed successfully. Processed 2 input files.", 
  "session_id": "abc12345",
  "processed_files": ["document1.txt", "document2.txt"],
  "parameters": {
    "k_neighbors": 3,
    "dup_threshold": 0.90,
    "similar_threshold": 0.60
  },
  "results": {
    "comparison_table": {
      "url": "/files/session_abc12345/output/comparison_table.csv",
      "filename": "comparison_table.csv"
    },
    "similarity_matrix": {
      "url": "/files/session_abc12345/output/similarity_matrix.csv", 
      "filename": "similarity_matrix.csv"
    },
    "overall_ranking": {
      "url": "/files/session_abc12345/output/overall_ranking.json",
      "filename": "overall_ranking.json",
      "content": "{...}"
    },
    "heatmap": {
      "url": "/files/session_abc12345/output/similarity_heatmap.png",
      "filename": "similarity_heatmap.png",
      "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    },
    "network": {
      "url": "/files/session_abc12345/output/network_top_matches.png",
      "filename": "network_top_matches.png", 
      "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    },
    "report": {
      "url": "/files/session_abc12345/output/report.txt",
      "filename": "report.txt",
      "content": "# Enhanced Similarity Analysis Report..."
    }
  }
}
```

#### **ดาวน์โหลดผลลัพธ์**
```bash
# ดาวน์โหลด ZIP ไฟล์รวม
curl "https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev/api/download/{session_id}" -o results.zip

# ดาวน์โหลดไฟล์เดี่ยว
curl "https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev/files/session_{session_id}/output/report.txt" -o report.txt
```

---

## 📊 **ผลลัพธ์ที่ได้ (6 ไฟล์)**

### **1. 📋 comparison_table.csv**
ตารางเปรียบเทียบรายละเอียดระหว่างไฟล์ input และ database

**คอลัมน์:**
- `input_doc`: ชื่อไฟล์ input
- `top_db_doc`: เอกสารที่คล้ายที่สุดใน database  
- `top_genre`: ประเภทของเอกสารที่คล้ายที่สุด
- `top_similarity`: ค่าความคล้าย (0.0-1.0)
- `relation`: ความสัมพันธ์ (duplicate/similar/different)
- `language`: ภาษาที่ตรวจพบ
- `genre_top3`: 3 ประเภทที่คล้ายที่สุด

### **2. 🔢 similarity_matrix.csv**  
เมทริกซ์ค่าความคล้ายระหว่างทุกคู่เอกสาร

**รูปแบบ:**
- แถว: ไฟล์ input
- คอลัมน์: ไฟล์ database
- ค่า: ความคล้าย 0.0-1.0

### **3. 🏆 overall_ranking.json**
การจัดอันดับโดยรวม (JSON format)

**เนื้อหา:**
- `analysis_info`: ข้อมูลการวิเคราะห์
- `db_overall_rank`: อันดับเอกสาร database
- `genre_rank_overall`: อันดับประเภทเอกสาร

### **4. 🔥 similarity_heatmap.png**
แผนที่ความร้อนแสดงค่าความคล้าย

**คุณสมบัติ:**
- แกน X: เอกสาร database
- แกน Y: ไฟล์ input  
- สี: ความคล้าย (เข้ม = คล้ายมาก)
- ตัวเลข: ค่าความคล้ายแม่นยำ

### **5. 🕸️ network_top_matches.png**
กราฟเครือข่ายแสดงความสัมพันธ์

**คุณสมบัติ:**
- กล่องสี่เหลี่ยม: ไฟล์ input
- วงกลม: ไฟล์ database
- เส้นเชื่อม: ความคล้าย (หนา = คล้ายมาก)
- แสดงเฉพาะ top K matches

### **6. 📄 report.txt**
รายงานสรุปภาษาไทย

**เนื้อหา:**
- ข้อมูลการวิเคราะห์
- ผลลัพธ์ต่อไฟล์ input
- อันดับเอกสาร database
- อันดับประเภทเอกสาร

---

## 🎯 **การตีความผลลัพธ์**

### **ค่าความคล้าย (Similarity Scores)**
- **0.90-1.00**: 🔴 ซ้ำซ้อน/เหมือนกันมาก (duplicate)
- **0.60-0.90**: 🟡 คล้ายคลึงกันมาก (similar)  
- **0.30-0.60**: 🟢 คล้ายคลึงปานกลาง (somewhat similar)
- **0.00-0.30**: ⚪ แตกต่างกัน (different)

### **การจัดประเภท (Relations)**
- **"duplicate/near-duplicate"**: เนื้อหาเหมือน/คล้ายมาก อาจคัดลอกมา
- **"similar"**: เนื้อหาคล้ายกัน แต่ไม่เหมือนทุกประการ
- **"different"**: เนื้อหาต่างกัน ไม่มีความคล้ายที่นำสำคัญ

### **การวิเคราะห์ประเภท (Genre Analysis)**
- **Top Genre**: ประเภทที่ input file คล้ายที่สุด
- **Genre Ranking**: อันดับประเภททั้งหมด (เรียงตาม max similarity)
- **Mean vs Max**: ค่าเฉลี่ย vs ค่าสูงสุดในแต่ละประเภท

---

## ⚡ **Performance & Limits**

### **ขนาดไฟล์และเวลาประมวลผล**
- **Small** (< 1MB): ~1-3 วินาที
- **Medium** (1-5MB): ~3-10 วินาที  
- **Large** (5-15MB): ~10-30 วินาที
- **Very Large** (> 15MB): ~30+ วินาที

### **ข้อจำกัด**
- **Input Files**: สูงสุด 5 ไฟล์ต่อครั้ง
- **File Size**: แนะนำ < 50MB ต่อไฟล์
- **Database**: ไม่จำกัดขนาด แต่ส่งผลต่อความเร็ว
- **Session**: ไฟล์ถูกลบอัตโนมัติหลัง 24 ชั่วโมง

### **Supported Languages**
- ✅ **Thai**: รองรับเต็มรูปแบบ (auto-detection)
- ✅ **English**: รองรับเต็มรูปแบบ
- ✅ **Other Languages**: รองรับพื้นฐาน (tokenization ทั่วไป)

---

## 🔧 **Troubleshooting**

### **Network Error บน Frontend**
```
❌ เจอ "Network Error"
```
**วิธีแก้:**
1. รอ 30 วินาที แล้วลองใหม่ (backend อาจ restart)
2. รีเฟรชหน้าเว็บ (Ctrl+F5)
3. ตรวจสอบ internet connection
4. ลองใช้ incognito mode

### **API Errors**
```
❌ 400 Bad Request: "Field required" 
```
**สาเหตุ:** ไม่มี input files หรือ text_input  
**วิธีแก้:** ใส่อย่างน้อย 1 อย่าง (ไฟล์หรือข้อความ)

```
❌ 400 Bad Request: "Database file must be a ZIP file"
```  
**สาเหตุ:** ไฟล์ database ไม่ใช่ .zip  
**วิธีแก้:** สร้างไฟล์ .zip ที่มีโครงสร้างที่ถูกต้อง

```
❌ 500 Internal Server Error
```
**สาเหตุ:** Server-side processing error  
**วิธีแก้:** ลองลดขนาดไฟล์หรือลองใหม่ภายหลัง

### **File Format Issues**
```
❌ "Failed to convert [filename]"
```
**วิธีแก้:**
1. ตรวจสอบไฟล์ไม่เสียหาย
2. ใช้รูปแบบที่รองรับ: .txt, .docx, .pdf
3. ลองแปลงเป็น .txt ก่อนอัปโหลด

---

## 📞 **Support & Help**

### **หาความช่วยเหลือ**
1. **API Documentation**: https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev/docs
2. **Testing Guide**: ดูไฟล์ `TESTING_GUIDE.md` ในโปรเจ็กต์
3. **Setup Instructions**: ดูไฟล์ `SETUP_INSTRUCTIONS.md`

### **การรายงานปัญหา**
ให้แจ้งรายละเอียด:
- URL ที่ใช้งาน
- ขั้นตอนที่ทำ
- Error message ที่เจอ
- ไฟล์ที่ใช้ทดสอบ (ถ้าได้)

---

## ✨ **Tips & Best Practices**

### **เพื่อผลลัพธ์ที่ดีที่สุด**
1. **ใช้เนื้อหาที่มีความยาวเพียงพอ** (อย่างน้อย 100+ คำ)
2. **จัดประเภท database ให้ชัดเจน** (romance, fantasy, etc.)
3. **ใส่เอกสารหลากหลายใน database** (อย่างน้อย 3-5 เรื่องต่อประเภท)
4. **ปรับค่า threshold ตามความต้องการ**:
   - **strict**: dup=0.95, similar=0.70
   - **moderate**: dup=0.90, similar=0.60  
   - **loose**: dup=0.85, similar=0.50

### **สำหรับการใช้งานจริง**
1. **เตรียม database ที่สมบูรณ์** ก่อนการวิเคราะห์
2. **ทำความสะอาดข้อมูล** (ลบ header, footer ที่ไม่เกี่ยวข้อง)
3. **ทดสอบกับข้อมูลขนาดเล็กก่อน** แล้วค่อยขยาย
4. **เก็บผลลัพธ์เป็นหลักฐาน** (ดาวน์โหลด ZIP)

---

**🎉 ขอให้การใช้งาน Novel Similarity Analyzer เป็นไปด้วยความเรียบร้อย!**