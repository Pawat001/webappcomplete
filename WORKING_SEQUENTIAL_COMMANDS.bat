@echo off
chcp 65001 >nul
echo ====================================
echo   Novel Similarity Analyzer Startup
echo ====================================
echo.

REM Check if directories exist
if not exist "frontend" (
    echo ❌ Error: frontend directory not found!
    echo Please run this script from the webapp root directory.
    pause
    exit /b 1
)

if not exist "backend" (
    echo ❌ Error: backend directory not found!
    echo Please run this script from the webapp root directory.
    pause
    exit /b 1
)

REM Step 1: Clean Environment
echo 🧹 Step 1: Cleaning environment...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
taskkill /F /IM wrangler.exe 2>nul
timeout /t 2 >nul

REM Step 2: Build Frontend
echo 🔨 Step 2: Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    cd ..
    pause
    exit /b 1
)
echo ✅ Frontend build completed
cd ..

REM Step 3: Start Backend in new window
echo 🚀 Step 3: Starting backend...
start "Novel Analyzer Backend" /D "%CD%\backend" cmd /k "python main.py"
timeout /t 5 >nul

REM Step 4: Test Backend Health
echo 🔍 Step 4: Testing backend connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/' -TimeoutSec 5; Write-Host '✅ Backend is running' } catch { Write-Host '❌ Backend not responding'; exit 1 }"
if %errorlevel% neq 0 (
    echo ❌ Backend failed to start properly!
    pause
    exit /b 1
)

REM Step 5: Start Frontend in new window
echo 🌐 Step 5: Starting frontend...
start "Novel Analyzer Frontend" /D "%CD%\frontend" cmd /k "npm run dev:sandbox"
timeout /t 8 >nul

REM Step 6: Test Frontend Health
echo 🔍 Step 6: Testing frontend connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000/' -TimeoutSec 10; Write-Host '✅ Frontend is running' } catch { Write-Host '❌ Frontend not responding' }"

echo.
echo 🎉 ==========================================
echo    Novel Analyzer is now running!
echo    Backend:  http://localhost:8000
echo    Frontend: http://localhost:3000
echo ==========================================
echo.
echo Press any key to open the application in your browser...
pause >nul

REM Open in default browser
start http://localhost:3000

echo.
echo ℹ️  Instructions:
echo - Keep both command windows open
echo - Close them when you're done to stop the services
echo.
pause