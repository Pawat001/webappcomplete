# Sample Data for Testing

## 📁 Files Included

### Input Files (`input/`)
- `test_novel.txt`: ตัวอย่างนิยายภาษาไทยสำหรับทดสอบ

### Database Files (`database/`)
- `romance/romance1.txt`: นิยายรักตัวอย่าง  
- `fantasy/fantasy1.txt`: นิยายแฟนตาซีตัวอย่าง
- `scifi/scifi1.txt`: นิยายวิทยาศาสตร์ตัวอย่าง

### Pre-built ZIP
- `database_sample.zip`: ไฟล์ ZIP ที่พร้อมใช้งาน

## 🧪 How to Use for Testing

1. **Upload Input**: ใช้ `input/test_novel.txt` 
2. **Upload Database**: ใช้ `database_sample.zip`
3. **Run Analysis**: กดปุ่มเริ่มวิเคราะห์

## 🎯 Expected Results

เนื่องจาก `test_novel.txt` เป็นเนื้อหาเกี่ยวกับนิยายรัก ผลลัพธ์ควรแสดงว่า:
- **Most Similar**: `romance1.txt` จาก genre `romance`
- **Similarity Score**: ค่อนข้างสูง (> 0.3)
- **Genre Ranking**: `romance` ควรได้อันดับที่ 1