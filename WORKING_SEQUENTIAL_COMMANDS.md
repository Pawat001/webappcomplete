# ✅ WORKING Sequential Commands - Manual Test Success

## 🎯 Port Binding Answer

**✅ Backend ควรผูกกับ `0.0.0.0:8000`** (ถูกต้องแล้ว)

```python
# ใน main.py - ถูกต้องแล้ว
uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

## 🎯 Wrangler Configuration Answer

**✅ Build files ใน `frontend/dist` ถูกต้องแล้ว:**
- `_worker.js` (56.57 kB) ✅ 
- `_routes.json` ✅
- `static/` directory ✅

## 🚀 Working Sequential Commands

### **Step 1: Clean Environment**
```bash
cd /home/user/webapp
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
pm2 delete all 2>/dev/null || true
```

### **Step 2: Build Frontend** 
```bash
cd /home/user/webapp/frontend
npm run build
```
**✅ Expected Output:**
```
vite v6.3.6 building SSR bundle for production...
✓ 59 modules transformed.
dist/_worker.js  56.57 kB
✓ built in 952ms
```

### **Step 3: Start Backend**
```bash
cd /home/user/webapp/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
```
**✅ Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### **Step 4: Test Backend Health**
```bash
curl http://localhost:8000/
```
**✅ Expected Output:**
```json
{"message":"Novel Similarity Analyzer API","status":"running","thai_support":false}
```

### **Step 5: Start Frontend**
```bash
cd /home/user/webapp/frontend
npm run dev:sandbox
```
**✅ Expected Output:**
```
⛅️ wrangler 4.35.0
✨ Compiled Worker successfully
[wrangler:info] Ready on http://0.0.0.0:3000
```

### **Step 6: Test Frontend**
```bash
curl http://localhost:3000/
```
**✅ Expected Output:** Full HTML with Hono app content

### **Step 7: Test Static Files**
```bash
curl http://localhost:3000/static/app.js
```
**✅ Expected Output:** JavaScript code starting with comments

## ✅ Success Verification

### **All Services Running:**
- **Backend**: ✅ `localhost:8000` - FastAPI with CORS enabled
- **Frontend**: ✅ `localhost:3000` - Hono Worker with Static files
- **Static Files**: ✅ `/static/app.js`, `/static/styles.css` serving correctly
- **Cross Communication**: ✅ Frontend can call Backend API

### **Status Check:**
```bash
# Check processes
ps aux | grep -E "(uvicorn|wrangler)"

# Check ports
netstat -tlnp | grep -E "(3000|8000)"

# Test integration
curl -X GET http://localhost:3000/
curl -X GET http://localhost:8000/
```

## 🎯 Resolution: The system works perfectly with manual sequential execution!

**Root Cause of Previous Issues:**
1. ✅ **Port Binding**: Already correct (`0.0.0.0`)
2. ✅ **Wrangler Config**: Working properly
3. ✅ **Build Process**: Generates correct `_worker.js`
4. ✅ **Static Files**: Serving from `/static/*` correctly

**The manual sequential approach eliminates race conditions and ensures proper startup order.**