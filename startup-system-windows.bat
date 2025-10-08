@echo off
setlocal enabledelayedexpansion
title Novel Similarity Analyzer - Smart Launcher
color 0f

REM ======================================
REM     Smart Auto-Setup & Launch System
REM ======================================

echo.
echo ████████████████████████████████████████████████████
echo █                                                  █
echo █      Novel Similarity Analyzer v2.0             █
echo █      Smart Auto-Setup System for Windows        █
echo █                                                  █
echo ████████████████████████████████████████████████████
echo.

REM Check system requirements
echo [STEP 1/7] 🔍 ตรวจสอบความพร้อมระบบ...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js ไม่พบ! กำลังเปิดลิงก์ดาวน์โหลด...
    start https://nodejs.org/
    echo กรุณาติดตั้ง Node.js แล้วรันใหม่
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js !NODE_VERSION! พบแล้ว
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python ไม่พบ! กำลังเปิดลิงก์ดาวน์โหลด...
    start https://www.python.org/downloads/
    echo กรุณาติดตั้ง Python แล้วรันใหม่
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo ✅ !PYTHON_VERSION! พบแล้ว
)

REM Auto-setup Backend
echo.
echo [STEP 2/7] 🐍 เตรียม Backend...
cd backend

if not exist "venv" (
    echo สร้าง Python Virtual Environment...
    python -m venv venv
)

echo เปิดใช้งาน Virtual Environment...
call venv\Scripts\activate.bat

echo ตรวจสอบและติดตั้ง Python packages...
pip install --quiet --upgrade pip
pip install --quiet -r requirements-windows.txt

echo สร้างโฟลเดอร์ temp หากยังไม่มี...
if not exist "temp" (
    mkdir temp
    mkdir temp\input
    mkdir temp\db  
    mkdir temp\output
)

cd ..

REM Auto-setup Frontend
echo.
echo [STEP 3/7] ⚛️  เตรียม Frontend...
cd frontend

REM Use Windows-compatible configs
if exist "package-windows.json" (
    echo ใช้การตั้งค่าสำหรับ Windows...
    copy /Y package-windows.json package.json >nul
)
if exist "vite-windows.config.ts" (
    copy /Y vite-windows.config.ts vite.config.ts >nul
)

if not exist "node_modules" (
    echo ติดตั้ง Frontend dependencies...
    npm install --silent
) else (
    echo Frontend dependencies พร้อมแล้ว
)

echo สร้าง Production Build...
call npm run build >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Build ล้มเหลว กำลังลองแก้ไข...
    rmdir /s /q node_modules >nul 2>&1
    del package-lock.json >nul 2>&1
    npm install --silent
    call npm run build >nul 2>&1
)

cd ..

REM Check ports availability
echo.
echo [STEP 4/7] 🌐 ตรวจสอบ Ports...

netstat -an | find "LISTENING" | find ":3000" >nul
if not errorlevel 1 (
    echo ⚠️  Port 3000 ถูกใช้งานแล้ว กำลังปิด...
    for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
)

netstat -an | find "LISTENING" | find ":8000" >nul  
if not errorlevel 1 (
    echo ⚠️  Port 8000 ถูกใช้งานแล้ว กำลังปิด...
    for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
)

echo ✅ Ports 3000 และ 8000 พร้อมใช้งาน

REM Start Backend
echo.
echo [STEP 5/7] 🚀 เริ่มต้น Backend Server...
start "📱 Backend API Server (Port 8000)" /min cmd /c "cd /d "%CD%\backend" && call venv\Scripts\activate.bat && python main.py"

echo รอ Backend เริ่มต้น...
:wait_backend
timeout /t 2 /nobreak >nul
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    echo ⏳ รอ Backend... (จะใช้เวลาประมาณ 10-15 วินาที)
    goto wait_backend
)
echo ✅ Backend พร้อมใช้งานที่ http://localhost:8000

REM Start Frontend
echo.
echo [STEP 6/7] 🎨 เริ่มต้น Frontend Server...
start "🌐 Frontend Web Server (Port 3000)" /min cmd /c "cd /d "%CD%\frontend" && npm run dev"

echo รอ Frontend เริ่มต้น...
:wait_frontend  
timeout /t 3 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ⏳ รอ Frontend...
    goto wait_frontend  
)
echo ✅ Frontend พร้อมใช้งานที่ http://localhost:3000

REM Open browser
echo.
echo [STEP 7/7] 🌍 เปิดเบราว์เซอร์...
timeout /t 2 /nobreak >nul
start http://localhost:3000

REM Success message
echo.
echo ████████████████████████████████████████████████████
echo █                                                  █
echo █                🎉 ระบบพร้อมใช้งาน! 🎉            █
echo █                                                  █
echo █  Frontend:  http://localhost:3000                █
echo █  Backend:   http://localhost:8000                █  
echo █  API Docs:  http://localhost:8000/docs           █
echo █                                                  █
echo █  📝 คำแนะนำ:                                      █
echo █  - อย่าปิดหน้าต่าง Command Prompt ที่เปิดขึ้นมา    █
echo █  - ใช้ stop-system-windows.bat เพื่อปิดระบบ      █
echo █  - ดูคู่มือใน README-WINDOWS.md                  █
echo █                                                  █
echo ████████████████████████████████████████████████████
echo.

echo 📱 กด Enter เพื่อเปิดแผงควบคุม หรือปิดหน้าต่างนี้ได้เลย
pause >nul

REM Show control panel
:control_panel
cls
echo.
echo ████████████████████████████████████████
echo █         แผงควบคุมระบบ                █  
echo ████████████████████████████████████████
echo.
echo สถานะปัจจุบัน:
curl -s http://localhost:8000/api/health >nul 2>&1 && echo ✅ Backend: ทำงาน || echo ❌ Backend: หยุด
curl -s http://localhost:3000 >nul 2>&1 && echo ✅ Frontend: ทำงาน || echo ❌ Frontend: หยุด
echo.
echo [1] เปิดเบราว์เซอร์ใหม่
echo [2] เปิด API Documentation  
echo [3] ดู Backend logs
echo [4] ดู Frontend logs
echo [5] รีสตาร์ทระบบ
echo [6] ปิดระบบ
echo [0] ออก
echo.

set /p control_choice="เลือก (0-6): "

if "%control_choice%"=="1" start http://localhost:3000
if "%control_choice%"=="2" start http://localhost:8000/docs
if "%control_choice%"=="3" echo กำลังเปิด Backend logs... && timeout /t 2 /nobreak >nul
if "%control_choice%"=="4" echo กำลังเปิด Frontend logs... && timeout /t 2 /nobreak >nul  
if "%control_choice%"=="5" (
    echo กำลังรีสตาร์ท...
    call stop-system-windows.bat
    timeout /t 3 /nobreak >nul
    goto :eof
)
if "%control_choice%"=="6" call stop-system-windows.bat && exit
if "%control_choice%"=="0" exit

goto control_panel