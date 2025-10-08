# 🔧 FastAPI Backend: Folder Upload Signature Confirmation

## B. FastAPI Backend: ยืนยัน Signature

# ✅ คำตอบ: input_files: List[UploadFile] = File(...) **เพียงพอ** สำหรับรับไฟล์จากโฟลเดอร์

## Current Working Signature ใน /home/user/webapp/backend/main.py:

@app.post("/api/analyze")
async def analyze_similarity(
    input_files: List[UploadFile] = File(default=[], description="Input files to analyze (max 5 files)"),
    database_file: UploadFile = File(..., description="ZIP file containing database documents"),
    k_neighbors: int = Form(3, description="Number of top neighbors to find"),
    dup_threshold: float = Form(0.90, description="Threshold for duplicate classification"),
    similar_threshold: float = Form(0.60, description="Threshold for similar classification"),
    text_input: Optional[str] = Form(None, description="Optional direct text input"),
    novel_names: Optional[str] = Form(None, description="Optional comma-separated names for input files/text")
):

## ✅ Why This Signature Works for Folder Uploads:

1. **List[UploadFile]**: FastAPI automatically handles multiple files from FormData
2. **webkitRelativePath**: Preserved in `file.filename` automatically
3. **FormData compatibility**: Works with both single files and folder selections
4. **No additional parameters needed**: FastAPI parses multipart/form-data correctly

## ✅ Backend Processing of Folder Files:

# Code ใน main.py line 225-248:

# 1. ✅ รับ original filename พร้อม path
original_filename = file.filename  # เช่น "stories/fantasy_story.txt"
clean_filename = Path(original_filename).name  # เช่น "fantasy_story.txt"

# 2. ✅ ตรวจสอบว่ามาจากโฟลเดอร์หรือไม่
if original_filename != clean_filename:
    # This is from folder upload, preserve some path info
    txt_filename = f"{Path(original_filename).parent.name}_{Path(clean_filename).stem}.txt"
    # เช่น: "stories_fantasy_story.txt"
else:
    txt_filename = f"{Path(clean_filename).stem}.txt"
    # เช่น: "fantasy_story.txt"

## ✅ Test Result Confirmation:

# จากการทดสอบจริงแล้ว - Status 200 Success:
{
  "processed_files": [
    "stories_fantasy_story.txt",      # ✅ โฟลเดอร์ + ไฟล์
    "stories_romance_story.txt",      # ✅ โฟลเดอร์ + ไฟล์ 
    "documents_research_paper.txt",   # ✅ โฟลเดอร์ + ไฟล์
    "documents_technical_manual.txt"  # ✅ โฟลเดอร์ + ไฟล์
  ],
  "file_name_mapping": {
    "stories_fantasy_story.txt": "fantasy_story",
    "stories_romance_story.txt": "romance_story", 
    "documents_research_paper.txt": "research_paper",
    "documents_technical_manual.txt": "technical_manual"
  }
}

## ✅ Conclusion:

การใช้ `input_files: List[UploadFile] = File(...)` **เพียงพอแล้ว** สำหรับ:

1. ✅ รับไฟล์เดี่ยว (single file upload)
2. ✅ รับหลายไฟล์ (multiple file upload) 
3. ✅ รับไฟล์จากโฟลเดอร์ (folder upload with webkitRelativePath)
4. ✅ เก็บโครงสร้างโฟลเดอร์ใน filename
5. ✅ ประมวลผลและวิเคราะห์ได้สำเร็จ

**ไม่จำเป็นต้องเพิ่ม parameter หรือแก้ไข signature เพิ่มเติม!**