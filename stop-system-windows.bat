@echo off
title Novel Similarity Analyzer - System Shutdown
color 0c

echo.
echo ████████████████████████████████████████████
echo █                                          █
echo █           System Shutdown                █
echo █     Novel Similarity Analyzer           █
echo █                                          █
echo ████████████████████████████████████████████
echo.

echo 🛑 กำลังปิดระบบ...
echo.

REM Kill Frontend processes (Node.js/Vite)
echo [1/4] ปิด Frontend Server (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| find ":3000" ^| find "LISTENING"') do (
    echo ✅ ปิด Frontend PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM Kill Backend processes (Python/FastAPI)  
echo [2/4] ปิด Backend Server (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| find ":8000" ^| find "LISTENING"') do (
    echo ✅ ปิด Backend PID: %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM Kill remaining Node.js processes (if any)
echo [3/4] ปิด Node.js processes ที่เหลือ...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1

REM Kill remaining Python processes related to our project
echo [4/4] ปิด Python processes ที่เหลือ...
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq python.exe" 2^>nul ^| find "python.exe"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ████████████████████████████████████████████
echo █                                          █
echo █            ระบบปิดเรียบร้อย             █
echo █                                          █  
echo █  ✅ Frontend Server หยุดแล้ว            █
echo █  ✅ Backend Server หยุดแล้ว             █
echo █  ✅ ทุก Processes ปิดแล้ว              █
echo █                                          █
echo █  💡 รันใหม่ด้วย:                        █
echo █     startup-system-windows.bat          █
echo █                                          █
echo ████████████████████████████████████████████
echo.

REM Verify ports are free
timeout /t 2 /nobreak >nul
netstat -an | find "LISTENING" | find ":3000" >nul
if not errorlevel 1 (
    echo ⚠️  Port 3000 ยังถูกใช้งานอยู่
) else (
    echo ✅ Port 3000 ว่างแล้ว
)

netstat -an | find "LISTENING" | find ":8000" >nul
if not errorlevel 1 (
    echo ⚠️  Port 8000 ยังถูกใช้งานอยู่  
) else (
    echo ✅ Port 8000 ว่างแล้ว
)

echo.
echo 👋 ขอบคุณที่ใช้งาน Novel Similarity Analyzer
timeout /t 3 /nobreak
exit