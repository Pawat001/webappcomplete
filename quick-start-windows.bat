@echo off
title Novel Similarity Analyzer - Quick Start
color 0a

REM Simple one-click launcher for end users
echo.
echo ██████████████████████████████████████████████
echo █                                            █
echo █      Novel Similarity Analyzer            █
echo █         Quick Start Launcher              █
echo █                                            █
echo ██████████████████████████████████████████████
echo.

echo 🚀 กำลังเริ่มระบบ...
echo.

REM Quick system check
echo ⏳ ตรวจสอบความพร้อมระบบ...
node --version >nul 2>&1 || (
    echo ❌ ต้องติดตั้ง Node.js ก่อน
    echo 🌐 กำลังเปิดหน้าดาวน์โหลด...
    start https://nodejs.org/
    pause
    exit /b 1
)

python --version >nul 2>&1 || (
    echo ❌ ต้องติดตั้ง Python ก่อน  
    echo 🌐 กำลังเปิดหน้าดาวน์โหลด...
    start https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ ระบบพร้อม
echo.
echo 📋 กำลังเรียกระบบหลัก...
call startup-system-windows.bat

REM If startup fails, show troubleshooting
if errorlevel 1 (
    echo.
    echo ❌ เกิดปัญหาในการเริ่มระบบ
    echo.
    echo 🔧 ลองแก้ไขปัญหา:
    echo [1] รัน troubleshoot-windows.bat
    echo [2] อ่าน README-WINDOWS.md
    echo [3] ติดต่อผู้พัฒนา
    echo.
    pause
)