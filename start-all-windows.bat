@echo off
title Novel Similarity Analyzer - Windows Launcher
color 0a

echo.
echo ████████████████████████████████████████████
echo █                                          █
echo █    Novel Similarity Analyzer v1.0       █
echo █    Windows Launch Manager                █
echo █                                          █
echo ████████████████████████████████████████████
echo.

echo 🚀 เลือกการดำเนินการ:
echo.
echo [1] เริ่มต้น Backend (FastAPI)
echo [2] เริ่ต้น Frontend (Hono + Vite) 
echo [3] เริ่มต้นทั้งคู่ (แนะนำ)
echo [4] ติดตั้ง/อัปเดต Dependencies
echo [5] ออกจากโปรแกรม
echo.

set /p choice="เลือก (1-5): "

if "%choice%"=="1" (
    echo.
    echo 🔧 เริ่มต้น Backend...
    cd backend
    call start-backend-windows.bat
) else if "%choice%"=="2" (
    echo.
    echo 🎨 เริ่มต้น Frontend...
    cd frontend  
    call start-windows.bat
) else if "%choice%"=="3" (
    echo.
    echo 🚀 เริ่มต้นทั้งระบบ...
    echo กำลังเปิด Backend ในหน้าต่างใหม่...
    start "Novel Analyzer Backend" cmd /k "cd backend && start-backend-windows.bat"
    
    echo รอ Backend เริ่มต้น...
    timeout /t 5 /nobreak >nul
    
    echo กำลังเปิด Frontend...
    cd frontend
    call start-windows.bat
) else if "%choice%"=="4" (
    echo.
    echo 📦 ติดตั้ง Dependencies...
    echo.
    echo Backend Dependencies...
    cd backend
    pip install -r requirements-windows.txt
    cd..
    echo.
    echo Frontend Dependencies...
    cd frontend
    call setup-windows.bat
) else if "%choice%"=="5" (
    echo.
    echo 👋 ขอบคุณที่ใช้งาน Novel Similarity Analyzer!
    timeout /t 2 /nobreak >nul
    exit
) else (
    echo.
    echo ❌ ตัวเลือกไม่ถูกต้อง กรุณาลองใหม่
    timeout /t 2 /nobreak >nul
    goto :eof
)

echo.
echo ✅ เสร็จสิ้น! 
echo 🌐 เปิดเบราว์เซอร์ไปที่: http://localhost:3000
echo.
pause