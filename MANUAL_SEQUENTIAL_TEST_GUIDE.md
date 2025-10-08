# Manual Sequential Test Guide - คู่มือทดสอบแบบรันทีละส่วน

## 🎯 คำตอบสำหรับคำถามของคุณ

### 1. การผูกพอร์ต (Port Binding)

**✅ คำตอบ**: Backend ควรผูกกับ `0.0.0.0:8000`

```python
# ✅ ถูกต้องแล้วใน main.py
uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### 2. ความสมบูรณ์ของ Wrangler และ Worker Script

**✅ คำตอบ**: Build files ที่ต้องมีใน `frontend/dist`:
- `_worker.js` (Hono Worker Script) ✅ มีแล้ว
- `_routes.json` (Routing Configuration) ✅ มีแล้ว  
- `static/` (Static Assets) ✅ มีแล้ว

## 🔧 Manual Sequential Test Commands

### Step 1: เตรียม Environment
```bash
# Kill existing processes
cd /home/user/webapp
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
pm2 delete all 2>/dev/null || true
```

### Step 2: Build Frontend
```bash
cd /home/user/webapp/frontend
npm run build
```
**Expected Output**:
```
vite v6.3.5 building SSR bundle for production...
✓ built in X.XXs
```

### Step 3: Start Backend (Terminal 1)
```bash
cd /home/user/webapp/backend
python main.py
```
**Expected Output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXXX] using StatReload
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 4: Test Backend Health
```bash
curl http://localhost:8000/
```
**Expected Output**: JSON response with status

### Step 5: Start Frontend (Terminal 2)
```bash
cd /home/user/webapp/frontend
npm run dev:sandbox
```
**Expected Output**:
```
 ⛅️ wrangler X.X.X
Using vars defined in .dev.vars
Your worker has access to the following bindings:
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:3000
```

### Step 6: Test Frontend
```bash
curl http://localhost:3000/
```
**Expected Output**: HTML content with Hono app

## 🚨 Troubleshooting Common Issues

### Issue 1: Vite Build Warning
```
Could not auto-determine entry point from rollupOptions or html files
```
**Solution**: This is normal for Hono projects - ignore this warning

### Issue 2: Frontend 404 Errors
**Root Cause**: Hono Router or Static File issues

**Test 1 - Isolate Hono Router**:
```typescript
// Temporarily edit src/index.tsx line 18
app.get('/', (c) => {
  return c.text('TEST OK')  // Simple text test
})
```

**Test 2 - Check Build Files**:
```bash
ls -la /home/user/webapp/frontend/dist/
# Should show: _worker.js, _routes.json, static/
```

### Issue 3: Static Files 404
**Check**: Static files should be in `public/static/` not `public/`
```bash
ls -la /home/user/webapp/frontend/public/static/
# Should show: app.js, styles.css
```

## ⚡ Quick Fix Commands

### Reset and Restart Everything:
```bash
cd /home/user/webapp/frontend
fuser -k 3000/tcp 2>/dev/null || true
npm run build
npm run dev:sandbox
```

### Check Processes:
```bash
ps aux | grep -E "(uvicorn|wrangler)"
netstat -tlnp | grep -E "(3000|8000)"
```

## 🎯 Expected Final State

### Successful Setup Indicators:
1. **Backend**: `curl http://localhost:8000/` returns JSON
2. **Frontend**: `curl http://localhost:3000/` returns HTML
3. **Static Files**: `curl http://localhost:3000/static/app.js` returns JS
4. **CORS**: Frontend can call Backend API

### Success Test:
```bash
# Test full pipeline
curl -X POST http://localhost:3000/api/test
# Should proxy to backend at localhost:8000
```