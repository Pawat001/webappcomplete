@echo off
echo เริ่มต้น Novel Similarity Analyzer...
echo.

REM ตรวจสอบว่า node_modules มีหรือไม่
if not exist node_modules (
    echo ไม่พบ node_modules กำลังติดตั้ง dependencies...
    npm install
    echo.
)

REM ตรวจสอบว่า dist มีหรือไม่
if not exist dist (
    echo สร้าง production build...  
    npm run build
    echo.
)

echo เริ่มต้น development server...
echo กำลังเปิดที่ http://localhost:3000
echo กด Ctrl+C เพื่อหยุดการทำงาน
echo.

npm run dev