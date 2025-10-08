@echo off
echo เริ่มต้น Novel Similarity Analyzer Backend...
echo.

REM ตรวจสอบ Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: ไม่พบ Python กรุณาติดตั้ง Python 3.8+ ก่อน
    echo ดาวน์โหลดได้จาก: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python version:
python --version

REM ตรวจสอบและสร้าง virtual environment
if not exist "venv" (
    echo สร้าง virtual environment...
    python -m venv venv
)

REM เปิดใช้งาน virtual environment
echo เปิดใช้งาน virtual environment...
call venv\Scripts\activate.bat

REM ติดตั้ง dependencies
echo ติดตั้ง Python packages...
pip install -r requirements-windows.txt

REM สร้างโฟลเดอร์ temp
if not exist "temp" (
    mkdir temp
    mkdir temp\input
    mkdir temp\db
    mkdir temp\output
)

echo.
echo Backend เริ่มต้นที่ http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo กด Ctrl+C เพื่อหยุดการทำงาน
echo.

REM เริ่มต้น FastAPI server
python main.py