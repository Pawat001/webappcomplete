# 🧪 Testing Guide for Novel Similarity Analyzer

## Quick Start Testing

### Test with Sample Data (Ready to Use!)

#### Method 1: Via Web Interface
1. Go to: https://3000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev
2. Upload these files:
   - **Input**: Use the text box and paste: "สำหรับการทดสอบระบบวิเคราะห์ความคล้ายคลึงของนิยาย นี่คือตัวอย่างนิยายรัก เล่าเรื่องราวของคนรักที่ต้องพรากจากกัน"
   - **Database**: Upload `sample_data/database_sample.zip`
3. Click "เริ่มวิเคราะห์"

#### Method 2: Via API Command
```bash
curl -X POST "https://8000-ivd3x36i7pr883a1sfjhh-6532622b.e2b.dev/api/analyze" \
  -F "database_file=@sample_data/database_sample.zip" \
  -F "k_neighbors=3" \
  -F "dup_threshold=0.90" \
  -F "similar_threshold=0.60" \
  -F "text_input=สำหรับการทดสอบระบบวิเคราะห์ความคล้ายคลึงของนิยาย นี่คือตัวอย่างนิยายรัก เล่าเรื่องราวของคนรักที่ต้องพรากจากกัน แต่ความรักที่แท้จริงนั้นไม่มีสิ่งใดมาขวางกั้นได้"
```

### Expected Results
- **Most Similar Genre**: `romance` (นิยายรัก)
- **Similarity Score**: > 0.3 (คล้ายคลึงปานกลาง)
- **Language Detected**: Thai
- **Files Generated**: 6 files (CSV, JSON, PNG, TXT)

## Sample Data Structure

```
sample_data/
├── input/
│   └── test_novel.txt        # Thai romance novel sample
├── database/
│   ├── romance/
│   │   └── romance1.txt      # Romance genre sample
│   ├── fantasy/
│   │   └── fantasy1.txt      # Fantasy genre sample
│   └── scifi/
│       └── scifi1.txt        # Sci-fi genre sample
└── database_sample.zip       # Pre-built database ZIP
```

## Creating Your Own Test Data

### Input Files
Create `.txt` files with your content:
```bash
echo "Your text content here..." > my_input.txt
```

### Database Structure
1. Create genre folders:
```bash
mkdir -p my_database/{genre1,genre2,genre3}
```

2. Add `.txt` files to each genre folder:
```bash
echo "Genre 1 content..." > my_database/genre1/doc1.txt
echo "Genre 2 content..." > my_database/genre2/doc1.txt
echo "Genre 3 content..." > my_database/genre3/doc1.txt
```

3. Create ZIP file:
```bash
cd my_database && zip -r ../my_database.zip . && cd ..
```

## Troubleshooting

### Network Error
If you get "Network Error":
1. Check URLs are accessible
2. Backend might be restarting (wait 30 seconds)
3. Try refreshing the page

### API Error Messages
- **400 Bad Request**: Check file formats and parameters
- **500 Internal Server Error**: Server-side processing error
- **422 Validation Error**: Invalid input parameters

### File Format Issues
- **Supported Input**: `.txt`, `.docx`, `.pdf`
- **Database**: Must be `.zip` file
- **Max Files**: 5 input files per analysis
- **Text Input**: Alternative to file upload

## Performance Notes
- **Small files** (< 1MB): ~1-2 seconds
- **Medium files** (1-10MB): ~3-10 seconds  
- **Large files** (> 10MB): ~10+ seconds
- **Multiple files**: Processing time scales linearly

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API health check |
| GET | `/api/health` | Detailed health status |
| POST | `/api/analyze` | Main analysis endpoint |
| GET | `/api/download/{session_id}` | Download results ZIP |
| DELETE | `/api/cleanup/{session_id}` | Clean up session |
| GET | `/docs` | Interactive API documentation |

## Success Criteria
✅ **Backend Health**: `{"status": "healthy"}`  
✅ **Frontend Load**: HTTP 200 response  
✅ **Analysis Success**: `{"status": "success"}`  
✅ **Results Generated**: 6 files created  
✅ **Download Works**: ZIP file received  