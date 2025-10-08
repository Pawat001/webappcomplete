@echo off
title Novel Similarity Analyzer - Troubleshoot
color 0e

echo.
echo ████████████████████████████████████████████
echo █                                          █
echo █         Troubleshoot & Repair            █
echo █    Novel Similarity Analyzer            █
echo █                                          █
echo ████████████████████████████████████████████
echo.

echo 🔧 เลือกการแก้ไข:
echo.
echo [1] ตรวจสอบ System Requirements
echo [2] ล้างและติดตั้ง Frontend ใหม่
echo [3] ล้างและติดตั้ง Backend ใหม่ 
echo [4] รีเซ็ททั้งระบบ
echo [5] ตรวจสอบ Port ที่ใช้งาน
echo [6] ทดสอบการเชื่อมต่อ
echo [7] ออกจากโปรแกรม
echo.

set /p choice="เลือก (1-7): "

if "%choice%"=="1" (
    echo.
    echo 🔍 ตรวจสอบ System Requirements...
    echo.
    echo == Node.js ==
    node --version 2>nul || echo ❌ Node.js ไม่พบ - ติดตั้งจาก https://nodejs.org/
    echo.
    echo == Python ==  
    python --version 2>nul || echo ❌ Python ไม่พบ - ติดตั้งจาก https://www.python.org/
    echo.
    echo == NPM ==
    npm --version 2>nul || echo ❌ NPM ไม่พบ
    echo.
    echo == PIP ==
    pip --version 2>nul || echo ❌ PIP ไม่พบ

) else if "%choice%"=="2" (
    echo.
    echo 🧹 ล้างและติดตั้ง Frontend ใหม่...
    cd frontend
    if exist node_modules rmdir /s /q node_modules
    if exist package-lock.json del package-lock.json  
    if exist dist rmdir /s /q dist
    call setup-windows.bat

) else if "%choice%"=="3" (
    echo.
    echo 🧹 ล้างและติดตั้ง Backend ใหม่...
    cd backend
    if exist venv rmdir /s /q venv
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install --upgrade pip
    pip install -r requirements-windows.txt

) else if "%choice%"=="4" (
    echo.
    echo ⚠️  รีเซ็ททั้งระบบ - จะลบไฟล์ทั้งหมดและติดตั้งใหม่
    set /p confirm="ยืนยัน (y/N): "
    if /i "%confirm%"=="y" (
        echo กำลังลบ Frontend...
        cd frontend  
        if exist node_modules rmdir /s /q node_modules
        if exist package-lock.json del package-lock.json
        if exist dist rmdir /s /q dist
        cd..
        echo กำลังลบ Backend...
        cd backend
        if exist venv rmdir /s /q venv  
        if exist temp rmdir /s /q temp
        cd..
        echo กำลังติดตั้งใหม่...
        call start-all-windows.bat
    )

) else if "%choice%"=="5" (
    echo.
    echo 🌐 ตรวจสอบ Port ที่ใช้งาน...
    echo.
    echo == Port 3000 (Frontend) ==
    netstat -an | find "3000" || echo ✅ Port 3000 ว่าง
    echo.
    echo == Port 8000 (Backend) == 
    netstat -an | find "8000" || echo ✅ Port 8000 ว่าง

) else if "%choice%"=="6" (
    echo.
    echo 📡 ทดสอบการเชื่อมต่อ...
    echo.
    echo ทดสอบ Backend (http://localhost:8000)...
    curl -s http://localhost:8000/api/health 2>nul && echo ✅ Backend ทำงาน || echo ❌ Backend ไม่ตอบสนง
    echo.
    echo ทดสอบ Frontend (http://localhost:3000)...
    curl -s http://localhost:3000 2>nul && echo ✅ Frontend ทำงาน || echo ❌ Frontend ไม่ตอบสนอง

) else if "%choice%"=="7" (
    echo.
    echo 👋 ขอบคุณที่ใช้งาน!
    timeout /t 2 /nobreak >nul
    exit
) else (
    echo.
    echo ❌ ตัวเลือกไม่ถูกต้อง กรุณาลองใหม่
    timeout /t 2 /nobreak >nul
    goto :eof
)

echo.
pause
goto :eof