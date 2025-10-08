@echo off
echo กำลังติดตั้ง Novel Similarity Analyzer สำหรับ Windows...
echo.

REM สำรองไฟล์เดิม
echo สำรองไฟล์เดิม...
if exist package.json (
    copy package.json package-backup.json
)
if exist vite.config.ts (
    copy vite.config.ts vite-backup.config.ts  
)

REM ใช้ไฟล์ Windows version
echo ใช้การตั้งค่าสำหรับ Windows...
copy package-windows.json package.json
copy vite-windows.config.ts vite.config.ts

REM ลบ node_modules และ package-lock.json
echo ลบไฟล์เก่า...
if exist node_modules (
    rmdir /s /q node_modules
)
if exist package-lock.json (
    del package-lock.json
)
if exist dist (
    rmdir /s /q dist
)

REM ติดตั้ง dependencies ใหม่
echo ติดตั้ง dependencies...
npm install

echo.
echo ติดตั้งเสร็จสิ้น!
echo.
echo คำสั่งที่ใช้ได้:
echo   npm run dev     - เริ่ม development server
echo   npm run build   - build สำหรับ production  
echo   npm run preview - preview build
echo.
pause