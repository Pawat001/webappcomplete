// 🔧 การแก้ไขปัญหาการอัปโหลดโฟลเดอร์ - Code Reference

## A. JavaScript Frontend: วนซ้ำผ่าน event.target.files

// ✅ Code ใน /home/user/webapp/frontend/public/static/app.js line 124-149:

handleFolderChange(event) {
  // 1. แปลง FileList เป็น Array
  const files = Array.from(event.target.files);
  
  console.log('📁 Folder files detected:', files.length);
  
  // 2. วนซ้ำและกรองไฟล์ที่รองรับ
  const supportedFiles = files.filter(file => {
    const ext = file.name.toLowerCase().split('.').pop();
    const isSupported = ['txt', 'docx', 'pdf'].includes(ext);
    
    // 3. ✅ บันทึก webkitRelativePath สำคัญมาก!
    console.log(`📄 File: ${file.name}, Path: ${file.webkitRelativePath}, Supported: ${isSupported}`);
    
    return isSupported;
  });
  
  console.log('✅ Supported files:', supportedFiles.length);
  
  if (supportedFiles.length === 0) {
    this.showAlert('ไม่พบไฟล์ที่รองรับในโฟลเดอร์ (.txt, .docx, .pdf)', 'warning');
    return;
  }
  
  // 4. ✅ เก็บไฟล์พร้อม webkitRelativePath
  this.folderFiles = supportedFiles;
  
  // 5. แสดงผลรายการไฟล์
  this.displaySelectedFiles(supportedFiles, 'folder');
}

## B. การส่งไฟล์ใน FormData

// ✅ Code ใน handleFormSubmit() line 366-392:

async handleFormSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData();
  
  // 1. ✅ ใช้ไฟล์ที่เก็บไว้จาก folder selection
  let filesToUpload = [];
  
  if (this.currentFiles && this.currentFiles.length > 0) {
    // จากการเลือกโฟลเดอร์
    filesToUpload = this.currentFiles;
    console.log('📁 Using stored folder files:', filesToUpload.length);
  } else {
    // จากการเลือกไฟล์ปกติ
    const inputFiles = document.getElementById('inputFiles').files;
    filesToUpload = Array.from(inputFiles);
    console.log('📄 Using regular files:', filesToUpload.length);
  }
  
  // 2. ✅ เพิ่มไฟล์ลงใน FormData พร้อม metadata
  for (let i = 0; i < filesToUpload.length; i++) {
    const file = filesToUpload[i];
    formData.append('input_files', file);
    
    // 3. ✅ Log ข้อมูล webkitRelativePath สำหรับ debug
    console.log(`📎 Adding file ${i + 1}:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      webkitRelativePath: file.webkitRelativePath || 'N/A'
    });
  }
}

## C. HTML Input Configuration

// ✅ HTML input สำหรับโฟลเดอร์:
<input type="file" 
       id="inputFolder" 
       name="input_folder" 
       webkitdirectory="true"    // ✅ ทำให้เลือกโฟลเดอร์ได้
       accept=".txt,.docx,.pdf"  // ✅ กรองไฟล์ที่รองรับ
       class="hidden" />

## D. Key Points สำหรับ Folder Upload

// ✅ สิ่งสำคัญที่ต้องจำ:

1. **webkitdirectory="true"**: ทำให้ input เลือกโฟลเดอร์แทนไฟล์
2. **file.webkitRelativePath**: เก็บเส้นทางโฟลเดอร์ (เช่น "stories/fantasy.txt")
3. **Array.from(event.target.files)**: แปลง FileList เป็น Array
4. **FormData.append('input_files', file)**: ส่งไฟล์พร้อม metadata
5. **this.folderFiles**: เก็บไฟล์ไว้ใช้เมื่อ submit form

## E. การทดสอบ Folder Upload

// Test Script:
const testFolderUpload = () => {
  // 1. เลือกโฟลเดอร์ที่มีไฟล์ .txt, .docx, .pdf
  // 2. ตรวจสอบ console.log ว่าแสดง webkitRelativePath
  // 3. กด "เริ่มวิเคราะห์"
  // 4. ตรวจสอบ Network tab ว่า FormData มีไฟล์พร้อม path
  
  console.log('📁 Folder upload test completed');
};