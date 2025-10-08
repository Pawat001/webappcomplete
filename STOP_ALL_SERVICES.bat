@echo off
chcp 65001 >nul
echo ====================================
echo   Stopping Novel Analyzer Services
echo ====================================
echo.

echo 🛑 Stopping all Python processes...
taskkill /F /IM python.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Python processes stopped
) else (
    echo ℹ️  No Python processes running
)

echo 🛑 Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Node.js processes stopped
) else (
    echo ℹ️  No Node.js processes running
)

echo 🛑 Stopping all Wrangler processes...
taskkill /F /IM wrangler.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Wrangler processes stopped
) else (
    echo ℹ️  No Wrangler processes running
)

echo.
echo 🔍 Checking port availability...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3000 still in use
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a 2>nul
) else (
    echo ✅ Port 3000 is free
)

netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 8000 still in use
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /F /PID %%a 2>nul
) else (
    echo ✅ Port 8000 is free
)

echo.
echo ✅ All services stopped successfully!
echo.
pause