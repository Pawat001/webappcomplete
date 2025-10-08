# Novel Similarity Analyzer - Windows Setup (PowerShell)

Write-Host "🚀 กำลังติดตั้ง Novel Similarity Analyzer สำหรับ Windows..." -ForegroundColor Green
Write-Host ""

# ตรวจสอบ Node.js
Write-Host "🔍 ตรวจสอบ Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ไม่พบ Node.js กรุณาติดตั้งก่อน: https://nodejs.org/" -ForegroundColor Red
    Read-Host "กด Enter เพื่อออก"
    exit 1
}

# สำรองไฟล์เดิม
Write-Host "💾 สำรองไฟล์เดิม..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Copy-Item "package.json" "package-backup.json" -Force
}
if (Test-Path "vite.config.ts") {
    Copy-Item "vite.config.ts" "vite-backup.config.ts" -Force
}

# ใช้ไฟล์ Windows version
Write-Host "🔄 ใช้การตั้งค่าสำหรับ Windows..." -ForegroundColor Yellow
Copy-Item "package-windows.json" "package.json" -Force
Copy-Item "vite-windows.config.ts" "vite.config.ts" -Force

# ลบไฟล์เก่า
Write-Host "🧹 ลบไฟล์เก่า..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -Force }
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }

# ติดตั้ง dependencies
Write-Host "📦 ติดตั้ง dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "✅ ติดตั้งเสร็จสิ้น!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 คำสั่งที่ใช้ได้:" -ForegroundColor Cyan
Write-Host "  npm run dev     - เริ่ม development server" -ForegroundColor White
Write-Host "  npm run build   - build สำหรับ production" -ForegroundColor White  
Write-Host "  npm run preview - preview build" -ForegroundColor White
Write-Host ""
Read-Host "กด Enter เพื่อออก"