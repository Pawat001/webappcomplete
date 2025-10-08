# 🎓 Novel Similarity Analyzer - Hands-On Tutorial
## คู่มือการใช้งานแบบลงมือปฏิบัติ

---

## 🎯 **เป้าหมายการเรียนรู้**

หลังจากจบ tutorial นี้ คุณจะสามารถ:
- ✅ เริ่มระบบและใช้งานเว็บแอปได้เอง
- ✅ อัปโหลดไฟล์และตั้งค่าพารามิเตอร์ได้ถูกต้อง  
- ✅ อ่านและแปลผลลัพธ์ทุกส่วนได้อย่างถูกต้อง
- ✅ แก้ไขปัญหาเบื้องต้นที่อาจเกิดขึ้น

---

## 📚 **บทที่ 1: การเตรียมตัวและการเริ่มต้น**

### **ขั้นตอนที่ 1.1: ตรวจสอบไฟล์ในระบบ**

เปิด File Explorer ไปที่โฟลเดอร์โปรเจค และตรวจสอบไฟล์สำคัญ:

```
webapp/
├── 🟢 WORKING_SEQUENTIAL_COMMANDS.bat  ← ไฟล์เริ่มระบบ
├── 🔴 STOP_ALL_SERVICES.bat           ← ไฟล์หยุดระบบ  
├── backend/                           ← โฟลเดอร์ Backend
├── frontend/                          ← โฟลเดอร์ Frontend
├── 📖 OFFICIAL_PRESENTATION_GUIDE.md  ← คู่มือพรีเซนต์
└── 📖 HANDS_ON_TUTORIAL.md           ← ไฟล์นี้
```

### **ขั้นตอนที่ 1.2: การเริ่มระบบ (Practice 1)**

**🎬 Action: เริ่มระบบครั้งแรก**

1. **Double-click** ที่ `WORKING_SEQUENTIAL_COMMANDS.bat`
2. **รอดู** Command Prompt 2 หน้าต่างเปิดขึ้น:
   
   **หน้าต่างที่ 1 - Backend:**
   ```
   Novel Analyzer Backend
   INFO:     Uvicorn running on http://0.0.0.0:8000
   INFO:     Application startup complete.
   ```
   
   **หน้าต่างที่ 2 - Frontend:**  
   ```
   Novel Analyzer Frontend
   ⛅️ wrangler 4.35.0
   [wrangler:info] Ready on http://0.0.0.0:3000
   ```

3. **ตรวจสอบ** browser เปิด `http://localhost:3000` อัตโนมัติ
4. **มองหา** สัญลักษณ์ "Ready" สีเขียวที่มุมขวาบน

**✅ Expected Result:** หน้าเว็บแสดงชื่อ "Novel Similarity Analyzer" พร้อมฟอร์มอัปโหลดไฟล์

### **ขั้นตอนที่ 1.3: การทดสอบการทำงาน (Health Check)**

**🎬 Action: ทดสอบ Backend**

1. เปิด tab ใหม่ใน browser
2. ไปที่ `http://localhost:8000`
3. **ควรเห็น:** JSON response แบบนี้
   ```json
   {
     "message": "Novel Similarity Analyzer API",
     "status": "running", 
     "thai_support": false
   }
   ```

**🎬 Action: ทดสอบ Frontend**
1. กลับไปที่ tab `http://localhost:3000`
2. **มองหา** elements สำคัญ:
   - ✅ ปุ่ม "เลือกไฟล์" และ "เลือกโฟลเดอร์"
   - ✅ พื้นที่ drag & drop สีเทา
   - ✅ ช่อง "ตั้งชื่อนิยาย/เอกสาร"
   - ✅ ปุ่ม "เริ่มวิเคราะห์" สีน้ำเงิน

---

## 📁 **บทที่ 2: การเตรียมไฟล์ตัวอย่าง**

### **ขั้นตอนที่ 2.1: สร้างไฟล์ทดสอบ (Practice 2)**

**🎬 Action: สร้าง Input Files**

สร้างไฟล์ทดสอบในโฟลเดอร์ `webapp/demo_files/`:

1. **สร้างโฟลเดอร์** `demo_files`
2. **สร้างไฟล์** `story1.txt`:
   ```
   เรื่องเล่าจากโรงเรียนเวทมนตร์
   
   ในโรงเรียนแห่งหนึ่ง มีนักเรียนชื่อ แฮร์รี่ ที่มีพลังวิเศษพิเศษ 
   เขาสามารถใช้เวทมนตร์ได้ดีกว่าเพื่อนๆ และมักจะต้องเผชิญกับ
   อันตรายจากเหล่าร้าย ในการผจญภัยครั้งนี้ แฮร์รี่ต้องหาวิธี
   ปกป้องโรงเรียนจากศัตรูที่มาโจมตี
   ```

3. **สร้างไฟล์** `story2.txt`:
   ```
   บทความเรื่องเทคโนโลยี
   
   ปัญญาประดิษฐ์หรือ AI เป็นเทคโนโลยีที่กำลังเปลี่ยนโลก
   ในปัจจุบัน การประมวลผลภาษาธรรมชาติช่วยให้เครื่องจักร
   เข้าใจภาษามนุษย์ได้ดีขึ้น การใช้ machine learning และ 
   deep learning ทำให้ระบบต่างๆ ฉลาดขึ้น
   ```

4. **สร้างไฟล์** `story3.txt`:
   ```
   เรื่องราวของพ่อมดเด็ก
   
   ในโรงเรียนวิเศษแห่งหนึ่ง มีเด็กชายชื่อ แฮร์รี่ ที่สามารถ
   ควบคุมเวทมนตร์ได้อย่างยอดเยี่ยม เขาเรียนรู้คาถาต่างๆ
   และต่อสู้กับพ่อมดมืดที่คุกคามโรงเรียน ด้วยความกล้าหาญ
   และเพื่อนๆ ที่ช่วยเหลือ
   ```

### **ขั้นตอนที่ 2.2: สร้าง Database File (Practice 3)**

**🎬 Action: สร้าง Reference Database**

1. **สร้างโฟลเดอร์** `database_example/`
2. **สร้างโฟลเดอร์ย่อย:**
   ```
   database_example/
   ├── fantasy/
   ├── technology/  
   └── romance/
   ```

3. **ในโฟลเดอร์ fantasy/** สร้าง `harry_potter.txt`:
   ```
   Harry Potter and the Magic School
   
   Harry Potter is a young wizard who attends Hogwarts School 
   of Witchcraft and Wizardry. He has magical powers and fights 
   against dark wizards. With his friends Ron and Hermione, 
   he faces many dangerous adventures in the magical world.
   ```

4. **ในโฟลเดอร์ technology/** สร้าง `ai_article.txt`:
   ```
   Artificial Intelligence Revolution
   
   Machine learning and deep learning are transforming our world.
   Natural language processing helps computers understand human 
   language better. AI systems are becoming smarter through 
   advanced algorithms and neural networks.
   ```

5. **ในโฟลเดอร์ romance/** สร้าง `love_story.txt`:
   ```
   A Beautiful Love Story
   
   Sarah and John met at university during their first year.
   Their love grew slowly through shared study sessions and 
   long conversations. Despite challenges and distance, their 
   relationship became stronger over time.
   ```

6. **สร้าง ZIP file:**
   - เลือกโฟลเดอร์ `database_example` 
   - คลิกขวา → "Send to" → "Compressed (zipped) folder"
   - ตั้งชื่อ `reference_database.zip`

---

## 🧪 **บทที่ 3: การทดสอบการทำงานจริง**

### **ขั้นตอนที่ 3.1: การอัปโหลดไฟล์ (Practice 4)**

**🎬 Action: ทดสอบ Single File Upload**

1. **เปิดเว็บแอป** `http://localhost:3000`
2. **คลิก** "เลือกไฟล์"
3. **เลือกไฟล์** `story1.txt`, `story2.txt`, `story3.txt` (ใช้ Ctrl+Click)
4. **ตรวจสอบ** รายการไฟล์แสดงใต้พื้นที่อัปโหลด:
   ```
   ✅ story1.txt (245 bytes)
   ✅ story2.txt (187 bytes)  
   ✅ story3.txt (203 bytes)
   ```

**🎬 Action: ทดสอบ Database Upload**

1. **ลากไฟล์** `reference_database.zip` มาวางในพื้นที่ "ไฟล์ฐานข้อมูล"
2. **ตรวจสอบ** ข้อความแสดง:
   ```
   📁 reference_database.zip (1.2 KB)
   ✅ ไฟล์ฐานข้อมูลพร้อมใช้งาน
   ```

### **ขั้นตอนที่ 3.2: การตั้งค่าพารามิเตอร์ (Practice 5)**

**🎬 Action: ปรับ Analysis Parameters**

1. **ตั้งค่าดังนี้:**
   - **K-Neighbors**: `3` (ค่าเริ่มต้น)
   - **Duplicate Threshold**: `0.85` (เข้มงวดกว่าเดิม)
   - **Similar Threshold**: `0.50` (ลดลงเล็กน้อย)

2. **ใส่ชื่อไฟล์** ใน "ตั้งชื่อนิยาย/เอกสาร":
   ```
   เรื่องเวทมนตร์, บทความ AI, เรื่องพ่อมด
   ```

### **ขั้นตอนที่ 3.3: การรันวิเคราะห์ครั้งแรก (Practice 6)**

**🎬 Action: เริ่มการวิเคราะห์**

1. **คลิก** "เริ่มวิเคราะห์"
2. **สังเกต** Progress Bar เคลื่อนไหว:
   ```
   กำลังประมวลผล... ████████░░ 80%
   กำลังวิเคราะห์ความคล้ายคลึง...
   ```

3. **รอผลลัพธ์** (ประมาณ 30-60 วินาที)

**✅ Expected Results:**
```
📊 Analysis Information:
- Detected Language: other
- Thai Support Available: false  
- Database Documents: 3 เอกสาร
- Input Files: 3 ไฟล์
- Genres: [fantasy, technology, romance]
```

---

## 📊 **บทที่ 4: การอ่านและแปลผลลัพธ์**

### **ขั้นตอนที่ 4.1: การอ่าน Summary Cards (Practice 7)**

**🎬 Action: วิเคราะห์ Top 3 Rankings**

หาและอ่าน Summary Cards ส่วนบน:

**ผลลัพธ์ที่คาดหวัง:**
```
🥇 Fantasy Genre
   ความคล้ายสูงสุด: 89%
   ค่าเฉลี่ย: 67%

🥈 Technology Genre  
   ความคล้ายสูงสุด: 78%
   ค่าเฉลี่ย: 45%

🥉 Romance Genre
   ความคล้ายสูงสุด: 23%
   ค่าเฉลี่ย: 18%
```

**📖 การแปลผล:**
- **story1.txt (เรื่องเวทมนตร์)** และ **story3.txt (เรื่องพ่อมด)** คล้ายกับ **fantasy genre** มาก
- **story2.txt (บทความ AI)** คล้ายกับ **technology genre** ปานกลาง
- ไม่มีไฟล์ใดคล้าย **romance genre** เลย

### **ขั้นตอนที่ 4.2: การอ่าน Detailed Table (Practice 8)**

**🎬 Action: ค้นหา Top 10 Table**

scroll ลงมาหาตารางที่มีหัวข้อ "🏆 Top 10 เอกสารที่คล้ายที่สุด"

**ผลลัพธ์ตัวอย่าง:**
| อันดับ | ชื่อเอกสาร | หมวดหมู่ | ความคล้าย |
|--------|------------|---------|------------|
| 🥇 | harry_potter.txt | fantasy | 89% |
| 🥈 | ai_article.txt | technology | 78% |  
| 🥉 | love_story.txt | romance | 23% |

**📖 การแปลผล:**
- **story1.txt** และ **story3.txt** คล้ายกับ **harry_potter.txt** มากที่สุด (89%)
- **story2.txt** คล้ายกับ **ai_article.txt** ค่อนข้างสูง (78%)

### **ขั้นตอนที่ 4.3: การอ่าน Network Graph (Practice 9)**

**🎬 Action: วิเคราะห์ Network Visualization**

1. **หา** ส่วน "แผนภูมิเครือข่าย" 
2. **สังเกต** รูปแบบ:
   - **สี่เหลี่ยม** (ซ้าย) = ไฟล์อินพุต
   - **วงกลม** (ขวา) = เอกสารฐานข้อมูล
   - **เส้นเชื่อม** = ความคล้ายคลึง

**📖 การแปลผล:**
- **เส้นหนา** = ความคล้ายสูง
- **เส้นบาง** = ความคล้ายต่ำ  
- **ไม่มีเส้น** = ไม่คล้ายเลย

### **ขั้นตอนที่ 4.4: การอ่าน Heatmap (Practice 10)**

**🎬 Action: วิเคราะห์ Similarity Heatmap**

1. **หา** ส่วน "แผนที่ความร้อนความคล้ายคลึง"
2. **อ่านสี:**
   - 🔴 **แดง**: ความคล้ายสูง (70%+)
   - 🟡 **เหลือง**: ความคล้ายปานกลาง (40-70%)
   - 🔵 **น้ำเงิน**: ความแตกต่าง (0-40%)

**📖 การแปลผล:**
- จุดแดงเข้ม = ไฟล์เหล่านั้นคล้ายกันมาก
- จุดน้ำเงิน = ไฟล์เหล่านั้นแตกต่างกัน

---

## 🛠️ **บทที่ 5: การทดสอบฟีเจอร์ขั้นสูง**

### **ขั้นตอนที่ 5.1: ทดสอบ Folder Upload (Practice 11)**

**🎬 Action: สร้างโครงสร้างโฟลเดอร์**

1. **สร้างโฟลเดอร์** `test_folder_upload/`
2. **สร้างโครงสร้าง:**
   ```
   test_folder_upload/
   ├── novels/
   │   ├── fantasy_novel.txt
   │   └── sci_fi_novel.txt
   └── papers/
       ├── research_paper.txt
       └── technical_doc.txt
   ```

3. **สร้างเนื้อหาในแต่ละไฟล์** (แค่ข้อความสั้นๆ)

**🎬 Action: ทดสอบการอัปโหลดโฟลเดอร์**

1. **Refresh** หน้าเว็บ (F5)
2. **คลิก** "เลือกโฟลเดอร์"  
3. **เลือกโฟลเดอร์** `test_folder_upload`
4. **ตรวจสอบ** ว่าไฟล์แสดงพร้อมโครงสร้าง:
   ```
   📁 test_folder_upload (4 ไฟล์)
   ✅ novels/fantasy_novel.txt
   ✅ novels/sci_fi_novel.txt
   ✅ papers/research_paper.txt  
   ✅ papers/technical_doc.txt
   ```

### **ขั้นตอนที่ 5.2: การดาวน์โหลดผลลัพธ์ (Practice 12)**

**🎬 Action: ทดสอบ Export Functions**

หลังจากได้ผลลัพธ์แล้ว:

1. **หาปุ่ม** "ดาวน์โหลดผลลัพธ์" สีน้ำเงิน
2. **คลิกดาวน์โหลด** → ได้ไฟล์ ZIP  
3. **แตก ZIP** และตรวจสอบไฟล์:
   ```
   results_[session_id]/
   ├── comparison_table.csv      ← ตารางเปรียบเทียบ
   ├── similarity_matrix.csv     ← เมทริกซ์ความคล้าย
   ├── overall_ranking.json      ← การจัดอันดับ
   ├── similarity_heatmap.png    ← รูป Heatmap
   └── network_top_matches.png   ← รูป Network Graph
   ```

4. **เปิดไฟล์** `comparison_table.csv` ใน Excel/Google Sheets
5. **ตรวจสอบ** ข้อมูลความคล้ายในรูปแบบตาราง

---

## 🚨 **บทที่ 6: การแก้ไขปัญหาเบื้องต้น**

### **ปัญหาที่ 6.1: ระบบไม่เริ่มทำงาน**

**🔍 อาการ:** Double-click `.bat` แล้วไม่มีหน้าต่างเปิด

**🛠️ วิธีแก้:**
1. **คลิกขวา** ที่ `.bat` → "Run as administrator"
2. **ตรวจสอบ** ว่าอยู่ในโฟลเดอร์ `webapp` ถูกต้อง
3. **รัน** `STOP_ALL_SERVICES.bat` ก่อน แล้วลองใหม่

### **ปัญหาที่ 6.2: หน้าเว็บไม่เปิด**

**🔍 อาการ:** Browser แสดง "This site can't be reached"

**🛠️ วิธีแก้:**
1. **ตรวจสอบ** Command Prompt หน้าต่าง Frontend แสดง:
   ```
   [wrangler:info] Ready on http://0.0.0.0:3000
   ```
2. **ลอง URL อื่น:** `http://127.0.0.1:3000`
3. **ตรวจสอบ Firewall:** อนุญาต port 3000 และ 8000

### **ปัญหาที่ 6.3: อัปโหลดไฟล์ไม่ได้**

**🔍 อาการ:** ข้อความ error "ไม่สามารถประมวลผลไฟล์ได้"

**🛠️ วิธีแก้:**
1. **ตรวจสอบขนาดไฟล์:** ต้องไม่เกิน 10MB
2. **ตรวจสอบนามสกุล:** ต้องเป็น .txt, .docx, .pdf เท่านั้น
3. **ตรวจสอบชื่อไฟล์:** ไม่ควรมีอักขระพิเศษ

### **ปัญหาที่ 6.4: การวิเคราะห์ช้า**

**🔍 อาการ:** Progress Bar ค้างที่ 50% นานมาก

**🛠️ วิธีแก้:**
1. **ลดจำนวนไฟล์:** ลองแค่ 2-3 ไฟล์ก่อน
2. **ลดขนาดฐานข้อมูล:** ใช้ไฟล์น้อยลงใน ZIP
3. **รอให้อดทน:** ไฟล์ใหญ่อาจใช้เวลา 3-5 นาที

---

## 📝 **บทที่ 7: แบบฝึกหัดท้ายคู่มือ**

### **แบบฝึกหัดที่ 1: การสร้างกรณีทดสอบของตัวเอง**

**🎯 เป้าหมาย:** สร้างชุดไฟล์ทดสอบที่น่าสนใจ

**📋 งาน:**
1. เลือกหัวข้อที่สนใจ (เช่น บทกวี, เรื่องสั้น, บทความข่าว)
2. สร้างไฟล์อินพุต 3-5 ไฟล์ ที่มีความคล้ายคลึงระดับต่างๆ  
3. สร้างฐานข้อมูลอ้างอิง 10-15 เอกสาร แบ่งเป็น 3-4 หมวด
4. รันการวิเคราะห์และบันทึกผลลัพธ์
5. เขียนสรุป 1 หน้า อธิบายสิ่งที่ค้นพบ

### **แบบฝึกหัดที่ 2: การเปรียบเทียบพารามิเตอร์**

**🎯 เป้าหมาย:** เข้าใจผลกระทบของการปรับพารามิเตอร์

**📋 งาน:**
1. ใช้ชุดไฟล์เดียวกัน รันการวิเคราะห์ 3 ครั้ง:
   - ครั้งที่ 1: Threshold = 0.90, 0.60
   - ครั้งที่ 2: Threshold = 0.80, 0.50  
   - ครั้งที่ 3: Threshold = 0.95, 0.70
2. เปรียบเทียบผลลัพธ์ และอธิบายความแตกต่าง
3. แนะนำค่า threshold ที่เหมาะสมสำหรับงานแต่ละประเภท

### **แบบฝึกหัดที่ 3: การนำเสนอผลลัพธ์**

**🎯 เป้าหมาย:** สื่อสารผลการวิเคราะห์ให้คนอื่นเข้าใจ

**📋 งาน:**
1. เลือกผลลัพธ์ 1 ชุดที่น่าสนใจ
2. สร้างสไลด์ PowerPoint 5 หน้า อธิบาย:
   - หน้า 1: วัตถุประสงค์การวิเคราะห์
   - หน้า 2: ข้อมูลที่ใช้ (แสดงรูป screenshot)
   - หน้า 3: ผลลัพธ์หลัก (Top 3 + ตาราง)
   - หน้า 4: Network Graph + Heatmap พร้อมคำอธิบาย
   - หน้า 5: สรุปและข้อเสนอแนะ
3. นำเสนอต่อเพื่อนหรือเพื่อนร่วมงาน

---

## 🎖️ **Certificate of Completion**

หากคุณทำแบบฝึกหัดครบทั้งหมด คุณมีความรู้เพียงพอที่จะ:

✅ **ใช้งาน Novel Similarity Analyzer แบบมืออาชีพ**  
✅ **แก้ไขปัญหาเบื้องต้นได้เอง**  
✅ **อธิบายผลลัพธ์ให้คนอื่นฟังได้**  
✅ **ปรับแต่งพารามิเตอร์ตามความต้องการ**  
✅ **สอนคนอื่นใช้งานได้**

---

## 📞 **การติดต่อเมื่อต้องการความช่วยเหลือ**

### **คำถามที่พบบ่อย (FAQ)**

**Q: ระบบรองรับภาษาไทยหรือไม่?**  
A: รองรับการอ่านภาษาไทย แต่ยังไม่มี advanced Thai NLP features

**Q: สามารถใช้กับไฟล์ .docx ที่มีรูปภาพได้ไหม?**  
A: ได้ แต่ระบบจะแยกเฉพาะข้อความเท่านั้น ไม่วิเคราะห์รูปภาพ

**Q: จำนวนไฟล์สูงสุดที่รองรับคือเท่าไหร่?**  
A: อินพุต 5 ไฟล์, ฐานข้อมูลแนะนำไม่เกิน 100 เอกสาร

**Q: ผลลัพธ์จะถูกเก็บไว้หรือไม่?**  
A: ไม่ ผลลัพธ์จะหายหลังปิด browser ให้ดาวน์โหลดก่อนปิด

### **เอกสารเพิ่มเติม**
- 📖 `OFFICIAL_PRESENTATION_GUIDE.md` - สำหรับการพรีเซนต์
- 📖 `FINAL_FIXES_SUMMARY.md` - สรุปการแก้ไขล่าสุด
- 📖 `README.md` - ข้อมูลภาพรวมโครงการ

---

**🎉 ขอให้การเรียนรู้เป็นไปด้วยดี! สนุกกับการค้นพบความคล้ายคลึงของข้อความ 📚✨**